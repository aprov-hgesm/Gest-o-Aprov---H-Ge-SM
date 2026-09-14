import test from 'node:test';
import assert from 'node:assert/strict';
import { SyncController } from '../lib/persistence/controller.ts';
import { clean, equal, changesFor, importMissing, validateCurrent, validateRecords, SyncConflict,
  type Attempt, type RecordMap } from '../lib/persistence/core.ts';
import type { CloudPort } from '../lib/persistence/firestore.ts';
type Item = { id: string; value: string };
const validate = (value: unknown) => !!value && typeof value === 'object' &&
  'id' in value && 'value' in value && typeof value.id === 'string' && typeof value.value === 'string';
class MemoryStorage implements Storage {
  values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}
class FakePort implements CloudPort<Item> {
  map: RecordMap<Item> = {};
  next: ((map: RecordMap<Item>) => void) | undefined;
  commits = 0;
  fail = false;
  pause: (() => Promise<void>) | undefined;
  listen(next: (map: RecordMap<Item>) => void) {
    this.next = next;
    queueMicrotask(() => { if (this.next === next) next(clean(this.map)); });
    return () => { if (this.next === next) this.next = undefined; };
  }
  async commit(attempt: Attempt<Item>) {
    this.commits++;
    await this.pause?.();
    if (this.fail) throw Object.assign(new Error('offline'), { code: 'unavailable' });
    const result: RecordMap<Item> = {};
    // Validate the entire transaction before applying any change.
    for (const change of attempt.changes) validateCurrent(this.map[change.id], change, attempt.id);
    for (const change of attempt.changes) {
      if (validateCurrent(this.map[change.id], change, attempt.id) === 'applied') {
        result[change.id] = this.map[change.id];
      } else {
        result[change.id] = { data: change.data, deleted: change.deleted,
          revision: change.expectedRevision + 1, mutationId: attempt.id };
      }
    }
    Object.assign(this.map, result);
    this.next?.(clean(this.map));
    return clean(result);
  }
}
const tick = () => new Promise(resolve => setTimeout(resolve, 15));
async function until(check: () => boolean) {
  for (let index = 0; index < 100; index++) { if (check()) return; await tick(); }
  assert.fail('Timed out waiting for sync state');
}
function setup(port = new FakePort(), storage = new MemoryStorage(), legacy: Item[] | null = null) {
  const controller = new SyncController<Item>({
    initial: [{ id: 'a', value: 'template' }], validate, port,
    storage: () => storage, storageKey: 'test', legacy: () => legacy, delay: 0
  });
  controller.start();
  return { controller, port, storage };
}
test('serialization removes undefined and rejects invalid numbers and duplicate IDs', () => {
  assert.deepEqual(clean({ a: undefined, b: [{ c: 1, d: undefined }] }), { b: [{ c: 1 }] });
  assert.throws(() => clean({ value: NaN }));
  assert.throws(() => validateRecords([{ id: 'a', value: 'x' }, { id: 'a', value: 'y' }], validate));
  assert(equal({ a: 1, b: 2 }, { b: 2, a: 1 }));
});
test('diff changes only edited records and records deletion as a versioned tombstone', () => {
  const base = { a: { data: { id: 'a', value: 'old' }, revision: 2, mutationId: 'm', deleted: false } };
  assert.deepEqual(changesFor(base, [{ id: 'a', value: 'old' }]), []);
  assert.equal(changesFor(base, [])[0].deleted, true);
  assert.throws(() => validateCurrent(base.a, { id: 'a', data: base.a.data, expectedRevision: 1, deleted: false }, 'new'), SyncConflict);
});
test('legacy import never overwrites an existing or deleted remote record', () => {
  const remote = { a: { data: { id: 'a', value: 'remote' }, revision: 1, mutationId: 'm', deleted: false } };
  assert.throws(() => importMissing(remote, [{ id: 'a', value: 'local' }]), SyncConflict);
  assert.equal(importMissing(remote, [{ id: 'b', value: 'local' }]).length, 2);
  assert.throws(() => importMissing({ a: { ...remote.a, deleted: true } }, [remote.a.data]), SyncConflict);
});
test('opening an empty database never uploads templates or legacy automatically', async () => {
  const { controller, port } = setup(undefined, undefined, [{ id: 'a', value: 'legacy' }]);
  await tick();
  assert.equal(port.commits, 0);
  assert.equal(controller.getSnapshot().legacyCount, 1);
  controller.importLegacy();
  await until(() => port.map.a?.data.value === 'legacy' && !controller.getSnapshot().pending);
  assert.equal(port.map.a.revision, 1);
  controller.stop();
});
test('remote data wins on initial load while differing legacy data remains recoverable', async () => {
  const port = new FakePort();
  port.map.a = { data: { id: 'a', value: 'cloud' }, revision: 2, mutationId: 'remote', deleted: false };
  const { controller } = setup(port, undefined, [{ id: 'a', value: 'legacy' }]);
  await tick();
  assert.equal(controller.getSnapshot().records[0].value, 'cloud');
  assert.equal(controller.getSnapshot().legacyCount, 1);
  controller.importLegacy();
  assert.equal(controller.getSnapshot().status, 'conflict');
  assert(controller.exportData().includes('legacy'));
  assert.equal(port.commits, 0);
  controller.stop();
});
test('failed writes survive reload and retry; they never display a saved state', async () => {
  const first = setup();
  await tick();
  first.port.fail = true;
  first.controller.update([{ id: 'a', value: 'draft' }]);
  await until(() => first.controller.getSnapshot().status === 'error');
  assert.equal(first.controller.getSnapshot().pending, true);
  first.controller.stop();
  first.port.fail = false;
  const second = setup(first.port, first.storage);
  await until(() => first.port.map.a?.data.value === 'draft' && !second.controller.getSnapshot().pending);
  assert.equal(first.port.map.a.revision, 1);
  second.controller.stop();
});
test('edits made while a write is in flight are sent in a second transaction', async () => {
  const { controller, port } = setup();
  await tick();
  let release: () => void = () => {};
  port.pause = () => new Promise<void>(resolve => { release = resolve; });
  controller.update([{ id: 'a', value: 'first' }]);
  await until(() => controller.getSnapshot().status === 'saving');
  controller.update([{ id: 'a', value: 'second' }]);
  port.pause = undefined;
  release();
  await until(() => port.map.a?.data.value === 'second' && !controller.getSnapshot().pending);
  assert.equal(port.map.a.revision, 2);
  controller.stop();
});
test('concurrent edits produce a conflict and preserve both versions', async () => {
  const { controller, port, storage } = setup();
  await tick();
  port.map.a = { data: { id: 'a', value: 'remote' }, revision: 1, mutationId: 'other', deleted: false };
  controller.update([{ id: 'a', value: 'mine' }]);
  await until(() => controller.getSnapshot().status === 'conflict');
  assert.equal(port.map.a.data.value, 'remote');
  assert.equal(controller.getSnapshot().records[0].value, 'mine');
  port.next?.(clean(port.map));
  assert(controller.useServer());
  assert.equal(controller.getSnapshot().records[0].value, 'remote');
  assert([...storage.values.keys()].some(key => key.includes(':recovery:')));
  controller.stop();
});
test('lost commit acknowledgement is idempotent after reload', async () => {
  const port = new FakePort(), storage = new MemoryStorage();
  const data = { id: 'a', value: 'already saved' };
  const change = { id: 'a', data, deleted: false, expectedRevision: 0 };
  port.map.a = { data, deleted: false, revision: 1, mutationId: 'same-operation' };
  storage.setItem('test', JSON.stringify({ version: 1, base: {}, records: [data], dirty: true,
    attempt: { id: 'same-operation', changes: [change] } }));
  const { controller } = setup(port, storage);
  await until(() => !controller.getSnapshot().pending && controller.getSnapshot().status === 'ready');
  assert.equal(port.map.a.revision, 1);
  controller.stop();
});
test('corrupt local bytes are preserved and exportable', async () => {
  const storage = new MemoryStorage();
  storage.setItem('test', '{invalid json');
  const { controller } = setup(undefined, storage);
  await tick();
  controller.update([{ id: 'a', value: 'new' }]);
  await until(() => !controller.getSnapshot().pending);
  assert.equal(storage.getItem('test'), '{invalid json');
  assert(controller.exportData().includes('{invalid json'));
  controller.stop();
});
