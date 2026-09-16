import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { firestorePort } from '../lib/persistence/firestore.ts';
import { validateCardapio, validateSaqueOperational } from '../lib/persistence/validation.ts';
import { SyncConflict, type RecordMap } from '../lib/persistence/core.ts';

const host = process.env.FIRESTORE_EMULATOR_HOST;
const enabled = host === '127.0.0.1:8080' && process.env.GCLOUD_PROJECT === 'demo-aprov';
import { sample } from './fixtures.ts';

type MockToken = { sub: string; email: string; email_verified: boolean };
function client(name: string, token?: MockToken) {
  if (!enabled) throw new Error('Integration tests require the local demo-aprov emulator.');
  const app = initializeApp({ projectId: 'demo-aprov', apiKey: 'demo-key', appId: 'demo-app' }, name);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080, token ? { mockUserToken: token } : undefined);
  return { app, db };
}

test('real Firestore transactions, subscriptions, conflicts, idempotency and single-account security rules', { skip: !enabled, timeout: 45000 }, async () => {
  const authorized = { sub: 'aprov-user', email: 'aprov1hgesm@gmail.com', email_verified: true };
  const one = client('authorized-one', authorized), two = client('authorized-two', authorized);
  const anonymous = client('anonymous');
  const wrongAccount = client('wrong-account', {
    sub: 'wrong-user', email: 'outro.usuario@gmail.com', email_verified: true
  });
  const unverified = client('unverified-account', {
    sub: 'unverified-user', email: 'aprov1hgesm@gmail.com', email_verified: false
  });
  const portOne = firestorePort<ReturnType<typeof sample>>(one.db, 'cardapios', validateCardapio);
  const portTwo = firestorePort<ReturnType<typeof sample>>(two.db, 'cardapios', validateCardapio);
  const saquePort = firestorePort<any>(one.db, 'saques', validateSaqueOperational);
  const id = 'integration-' + Date.now(), data = sample(id);
  try {
    for (const denied of [anonymous, wrongAccount, unverified]) {
      await assert.rejects(getDocs(collection(denied.db, 'aprov_workspaces/hgesm/cardapios')),
        (error: unknown) => !!error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied');
      await assert.rejects(getDocs(collection(denied.db, 'aprov_workspaces/hgesm/saques')),
        (error: unknown) => !!error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied');
    }
    const attempt = { id: 'create-' + id, changes: [{ id, data, deleted: false, expectedRevision: 0 }] };
    const first = await portOne.commit(attempt);
    assert.equal(first[id].revision, 1);
    const saqueId = 'saque-integration-' + Date.now();
    const saqueData = {
      id: saqueId, cardapioId: id, saqueItemId: 'item-1', status: 'SEPARADO',
      updatedAt: new Date().toISOString(), history: [{ status: 'SEPARADO', at: new Date().toISOString() }]
    };
    const saqueCreated = await saquePort.commit({ id: 'create-' + saqueId, changes: [{ id: saqueId, data: saqueData, deleted: false, expectedRevision: 0 }] });
    assert.equal(saqueCreated[saqueId].revision, 1);
    const replay = await portTwo.commit(attempt);
    assert.equal(replay[id].revision, 1);
    const observed = await new Promise<RecordMap<ReturnType<typeof sample>>>((resolve, reject) => {
      const timeout = setTimeout(() => { unsubscribe(); reject(new Error('Snapshot timeout')); }, 10000);
      const unsubscribe = portTwo.listen(records => {
        if (records[id]) { clearTimeout(timeout); unsubscribe(); resolve(records); }
      }, error => { clearTimeout(timeout); unsubscribe(); reject(error); });
    });
    assert.equal(observed[id].data.dias.length, 7);
    const writes = await Promise.allSettled([
      portOne.commit({ id: 'edit-one', changes: [{ id, data: { ...data, cidade: 'Primeiro' }, deleted: false, expectedRevision: 1 }] }),
      portTwo.commit({ id: 'edit-two', changes: [{ id, data: { ...data, cidade: 'Segundo' }, deleted: false, expectedRevision: 1 }] })
    ]);
    const detail = JSON.stringify(writes.map(result => result.status === 'fulfilled' ? { status: result.status } :
      { status: result.status, name: result.reason?.name, message: result.reason?.message, code: result.reason?.code }));
    assert.equal(writes.filter(result => result.status === 'fulfilled').length, 1, detail);
    assert.equal(writes.filter(result => result.status === 'rejected' && result.reason instanceof SyncConflict).length, 1, detail);
    await assert.rejects(deleteDoc(doc(one.db, 'aprov_workspaces/hgesm/cardapios/' + id)));
    await assert.rejects(setDoc(doc(one.db, 'aprov_members/aprov-user'), { enabled: true, role: 'admin' }));
    await assert.rejects(setDoc(doc(one.db, 'aprov_workspaces/hgesm/cardapios/' + id),
      { data, revision: 999, schemaVersion: 1, deleted: false, mutationId: 'invalid', updatedAt: new Date() }));
  } finally {
    await Promise.all([
      deleteApp(one.app), deleteApp(two.app), deleteApp(anonymous.app),
      deleteApp(wrongAccount.app), deleteApp(unverified.app)
    ]);
  }
});
