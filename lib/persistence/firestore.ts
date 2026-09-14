import {
  collection, doc, onSnapshot, runTransaction, serverTimestamp,
  type Firestore, type Unsubscribe
} from 'firebase/firestore';
import {
  validateCurrent, validateRecords,
  type Attempt, type Identified, type RecordMap, type StoredRecord
} from './core.ts';

export type CollectionName = 'roster' | 'cardapios';
export interface CloudPort<T extends Identified> {
  listen(next: (records: RecordMap<T>) => void, error: (error: unknown) => void): Unsubscribe;
  commit(attempt: Attempt<T>): Promise<RecordMap<T>>;
}
export function firestorePort<T extends Identified>(
  db: Firestore, name: CollectionName, validate: (value: unknown) => boolean
): CloudPort<T> {
  const ref = collection(db, 'aprov_workspaces', 'hgesm', name);
  function decode(id: string, raw: Record<string, unknown>): StoredRecord<T> {
    if (raw.schemaVersion !== 1 || !Number.isSafeInteger(raw.revision) ||
        (raw.revision as number) < 1 || typeof raw.mutationId !== 'string' ||
        typeof raw.deleted !== 'boolean') throw new Error('Versão de dados incompatível no servidor.');
    const data = validateRecords([raw.data as T], validate)[0];
    if (data.id !== id) throw new Error('Identificador inconsistente no servidor.');
    return { data, revision: raw.revision as number, mutationId: raw.mutationId, deleted: raw.deleted };
  }
  return {
    listen(next, error) {
      return onSnapshot(ref, { includeMetadataChanges: true }, snapshot => {
        // A cached empty result is never evidence that the remote collection is empty.
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
        try {
          const result: RecordMap<T> = {};
          snapshot.forEach(item => { result[item.id] = decode(item.id, item.data()); });
          next(result);
        } catch (cause) { error(cause); }
      }, error);
    },
    async commit(attempt) {
      if (attempt.changes.length > 200) throw new Error('Importe no máximo 200 registros por operação.');
      validateRecords(attempt.changes.map(change => change.data), validate);
      return runTransaction(db, async transaction => {
        const refs = attempt.changes.map(change => doc(ref, change.id));
        // All reads precede every write; a related roster update commits atomically.
        const snapshots = await Promise.all(refs.map(item => transaction.get(item)));
        const result: RecordMap<T> = {};
        for (let index = 0; index < attempt.changes.length; index++) {
          const change = attempt.changes[index], snapshot = snapshots[index];
          const current = snapshot.exists() ? decode(change.id, snapshot.data()) : undefined;
          if (validateCurrent(current, change, attempt.id) === 'applied') {
            result[change.id] = current!;
            continue;
          }
          const record: StoredRecord<T> = {
            data: change.data, revision: change.expectedRevision + 1,
            mutationId: attempt.id, deleted: change.deleted
          };
          transaction.set(refs[index], {
            ...record, schemaVersion: 1, updatedAt: serverTimestamp()
          });
          result[change.id] = record;
        }
        return result;
      });
    }
  };
}
