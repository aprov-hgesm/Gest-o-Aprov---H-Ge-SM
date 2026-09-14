export interface Identified { id: string }
export interface StoredRecord<T extends Identified> {
  data: T;
  revision: number;
  mutationId: string;
  deleted: boolean;
}
export type RecordMap<T extends Identified> = Record<string, StoredRecord<T>>;
export interface Change<T extends Identified> {
  id: string;
  expectedRevision: number;
  data: T;
  deleted: boolean;
}
export interface Attempt<T extends Identified> {
  id: string;
  changes: Change<T>[];
}
export class SyncConflict extends Error {
  readonly recordId: string;
  constructor(recordId: string) {
    super('Este registro foi alterado em outro dispositivo. Sua versão local foi preservada.');
    this.name = 'SyncConflict';
    this.recordId = recordId;
  }
}
export function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_key, item: unknown) => {
    if (typeof item === 'number' && !Number.isFinite(item)) {
      throw new Error('Há um número inválido nos dados. Revise os campos antes de salvar.');
    }
    return item;
  })) as T;
}
export function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length &&
      a.every((value, index) => equal(value, b[index]));
  }
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
  const keys = Object.keys(left).filter(key => left[key] !== undefined);
  return keys.length === Object.keys(right).filter(key => right[key] !== undefined).length &&
    keys.every(key => Object.hasOwn(right, key) && equal(left[key], right[key]));
}
export function validateRecords<T extends Identified>(
  records: T[], validate: (value: unknown) => boolean
): T[] {
  if (!Array.isArray(records)) throw new Error('Formato de dados inválido.');
  const ids = new Set<string>();
  const safe = clean(records);
  for (const record of safe) {
    if (!record || !validate(record) || typeof record.id !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,180}$/.test(record.id) || ids.has(record.id)) {
      throw new Error('Há um registro inválido ou um identificador duplicado.');
    }
    if (new TextEncoder().encode(JSON.stringify(record)).byteLength > 800_000) {
      throw new Error('Este registro excedeu o tamanho suportado. Exporte uma cópia antes de continuar.');
    }
    ids.add(record.id);
  }
  return safe;
}
export function visible<T extends Identified>(map: RecordMap<T>): T[] {
  return Object.values(map).filter(record => !record.deleted).map(record => record.data)
    .sort((a, b) => b.id.localeCompare(a.id));
}
export function changesFor<T extends Identified>(base: RecordMap<T>, records: T[]): Change<T>[] {
  const target = new Map(records.map(record => [record.id, record]));
  const result: Change<T>[] = [];
  for (const record of records) {
    const previous = base[record.id];
    if (!previous || previous.deleted || !equal(previous.data, record)) {
      result.push({ id: record.id, data: record, deleted: false, expectedRevision: previous?.revision ?? 0 });
    }
  }
  for (const [id, previous] of Object.entries(base)) {
    if (!previous.deleted && !target.has(id)) {
      result.push({ id, data: previous.data, deleted: true, expectedRevision: previous.revision });
    }
  }
  return result;
}
export function validateCurrent<T extends Identified>(
  current: StoredRecord<T> | undefined, change: Change<T>, mutationId: string
): 'applied' | 'write' {
  if (current?.mutationId === mutationId && current.deleted === change.deleted &&
      equal(current.data, change.data)) return 'applied';
  if ((current?.revision ?? 0) !== change.expectedRevision) throw new SyncConflict(change.id);
  return 'write';
}
export function importMissing<T extends Identified>(remote: RecordMap<T>, local: T[]): T[] {
  const merged = new Map(visible(remote).map(record => [record.id, record]));
  for (const record of local) {
    const existing = remote[record.id];
    if (existing && (existing.deleted || !equal(existing.data, record))) {
      throw new SyncConflict(record.id);
    }
    if (!existing) merged.set(record.id, record);
  }
  return [...merged.values()];
}
