import {
  clean, equal, visible, changesFor, importMissing, validateRecords, SyncConflict,
  type Identified, type RecordMap, type Attempt, type StoredRecord
} from './core.ts';
import type { CloudPort } from './firestore.ts';

export interface SyncView<T extends Identified> {
  records: T[];
  status: 'loading' | 'ready' | 'saving' | 'pending' | 'error' | 'conflict' | 'local';
  message: string;
  pending: boolean;
  legacyCount: number;
  storageWarning: string;
}
interface Options<T extends Identified> {
  initial: T[];
  validate: (value: unknown) => boolean;
  legacy: () => T[] | null;
  storage: () => Storage;
  storageKey: string;
  legacyKeys?: string[];
  port: CloudPort<T>;
  delay?: number;
}
interface Cache<T extends Identified> {
  version: number;
  base: RecordMap<T>;
  records: T[];
  dirty: boolean;
  attempt: Attempt<T> | null;
}
function newest<T extends Identified>(...maps: RecordMap<T>[]): RecordMap<T> {
  const result: RecordMap<T> = {};
  for (const map of maps) {
    for (const [id, value] of Object.entries(map)) {
      if (!result[id] || result[id].revision <= value.revision) result[id] = value;
    }
  }
  return result;
}
export class SyncController<T extends Identified> {
  private view: SyncView<T>;
  private readonly serverView: SyncView<T>;
  private listeners = new Set<() => void>();
  private base: RecordMap<T> = {};
  private latest: RecordMap<T> = {};
  private legacy: T[] | null = null;
  private attempt: Attempt<T> | null = null;
  private dirty = false;
  private busy = false;
  private ready = false;
  private active = false;
  private hydrated = false;
  private cacheWritable = true;
  private generation = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private unsubscribe: (() => void) | undefined;
  private options: Options<T>;
  constructor(options: Options<T>) {
    this.options = options;
    this.view = {
      records: clean(options.initial), status: 'loading', message: 'Conectando ao banco de dados…',
      pending: false, legacyCount: 0, storageWarning: ''
    };
    this.serverView = this.view;
  }
  getSnapshot = () => this.view;
  getServerSnapshot = () => this.serverView;
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => { this.listeners.delete(callback); };
  };
  private emit(patch: Partial<SyncView<T>>) {
    this.view = { ...this.view, ...patch, pending: this.dirty || this.busy };
    for (const callback of this.listeners) callback();
  }
  private localCount() {
    return this.legacy?.filter(record => {
      const remote = this.latest[record.id];
      return !remote || remote.deleted || !equal(remote.data, record);
    }).length ?? 0;
  }
  private persist() {
    if (!this.cacheWritable) return;
    try {
      const cache: Cache<T> = {
        version: 1, base: this.base, records: this.view.records,
        dirty: this.dirty, attempt: this.attempt
      };
      this.options.storage().setItem(this.options.storageKey, JSON.stringify(cache));
      if (this.view.storageWarning) this.emit({ storageWarning: '' });
    } catch {
      this.emit({ storageWarning: 'Não foi possível guardar a cópia neste navegador. Exporte os dados antes de fechar a página.' });
    }
  }
  private hydrate() {
    this.hydrated = true;
    try {
      const legacy = this.options.legacy();
      if (legacy) this.legacy = validateRecords(legacy, this.options.validate);
    } catch {
      this.emit({ storageWarning: 'Os dados antigos deste navegador têm um formato inválido e foram preservados para recuperação.' });
    }
    try {
      const raw = this.options.storage().getItem(this.options.storageKey);
      if (raw) {
        const cache = JSON.parse(raw) as Cache<T>;
        if (cache.version !== 1 || typeof cache.dirty !== 'boolean' || !cache.base ||
            typeof cache.base !== 'object' || Array.isArray(cache.base)) throw new Error('cache');
        const records = validateRecords(cache.records, this.options.validate);
        for (const [id, entry] of Object.entries(cache.base)) {
          validateRecords([entry.data], this.options.validate);
          if (entry.data.id !== id || !Number.isSafeInteger(entry.revision) || entry.revision < 1 ||
              typeof entry.deleted !== 'boolean' || typeof entry.mutationId !== 'string') throw new Error('cache');
        }
        if (cache.attempt) {
          if (typeof cache.attempt.id !== 'string' || !Array.isArray(cache.attempt.changes)) throw new Error('cache');
          validateRecords(cache.attempt.changes.map(item => item.data), this.options.validate);
          for (const item of cache.attempt.changes) {
            if (item.id !== item.data.id || !Number.isSafeInteger(item.expectedRevision) ||
                item.expectedRevision < 0 || typeof item.deleted !== 'boolean') throw new Error('cache');
          }
        }
        this.base = cache.base;
        this.dirty = cache.dirty;
        this.attempt = cache.attempt;
        this.emit({ records });
      } else if (this.legacy) this.emit({ records: this.legacy });
    } catch {
      // Never overwrite an unreadable cache; its exact original bytes remain available.
      this.cacheWritable = false;
      this.emit({ storageWarning: 'A cópia local não pôde ser lida. Exporte a recuperação; a cópia original foi mantida.' });
      if (this.legacy) this.emit({ records: this.legacy });
    }
    this.emit({ legacyCount: this.localCount() });
  }
  start = () => {
    this.active = true;
    if (!this.hydrated) this.hydrate();
    this.connect();
  };
  stop = () => {
    this.active = false;
    this.generation++;
    this.unsubscribe?.();
    clearTimeout(this.timer);
    this.persist();
  };
  private connect() {
    const generation = ++this.generation;
    this.unsubscribe?.();
    this.ready = false;
    this.emit({ status: 'loading', message: 'Conectando ao banco de dados…' });
    this.unsubscribe = this.options.port.listen(remote => {
      if (!this.active || generation !== this.generation) return;
      this.latest = remote;
      this.ready = true;
      if (!this.dirty && !this.busy) {
        this.base = remote;
        const exists = Object.keys(remote).length > 0;
        this.emit({
          records: exists ? visible(remote) : (this.legacy ?? clean(this.options.initial)),
          status: exists ? 'ready' : 'local',
          message: exists ? 'Dados atualizados do servidor.' : 'Aguardando o primeiro envio ao servidor.',
          legacyCount: this.localCount()
        });
        this.persist();
      } else {
        this.emit({ legacyCount: this.localCount() });
        this.schedule();
      }
    }, error => {
      if (!this.active || generation !== this.generation) return;
      this.ready = false;
      this.fail(error);
    });
  }
  private fail(error: unknown) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    const message = code.includes('permission-denied') || code.includes('unauthenticated')
      ? 'O Firebase bloqueou o acesso. As regras publicadas precisam permitir esta sessão. Seus dados locais foram preservados.'
      : code.includes('unavailable') || code.includes('deadline-exceeded')
      ? 'Sem confirmação do servidor. As alterações continuam pendentes neste navegador.'
      : error instanceof Error ? error.message : 'Não foi possível sincronizar os dados.';
    this.emit({ status: error instanceof SyncConflict ? 'conflict' : 'error', message });
    this.persist();
  }
  update = (records: T[]): boolean => {
    try {
      const safe = validateRecords(records, this.options.validate);
      if (equal(safe, this.view.records)) return true;
      this.dirty = true;
      const blocked = this.view.status === 'conflict';
      this.emit({
        records: safe, status: blocked ? 'conflict' : 'pending',
        message: blocked ? this.view.message : 'Alterações aguardando confirmação do servidor.'
      });
      this.persist();
      if (!blocked) this.schedule();
      return true;
    } catch (error) { this.fail(error); return false; }
  };
  private schedule() {
    clearTimeout(this.timer);
    if (!this.active || !this.ready || this.busy || !this.dirty ||
        this.view.status === 'conflict' || this.view.status === 'error') return;
    this.timer = setTimeout(() => { void this.flush(); }, this.options.delay ?? 700);
  }
  private async flush() {
    if (this.busy || !this.active || !this.ready || !this.dirty) return;
    const changes = this.attempt?.changes ?? changesFor(this.base, this.view.records);
    if (!changes.length) {
      this.dirty = false;
      this.emit({ status: 'ready', message: 'Dados confirmados no servidor.' });
      this.persist();
      return;
    }
    this.attempt ??= {
      id: globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2),
      changes: clean(changes)
    };
    const attempt = this.attempt;
    const sentBase: RecordMap<T> = { ...this.base };
    for (const change of attempt.changes) {
      sentBase[change.id] = { data: change.data, revision: change.expectedRevision + 1,
        mutationId: attempt.id, deleted: change.deleted };
    }
    this.busy = true;
    this.emit({ status: 'saving', message: 'Salvando no servidor…' });
    this.persist(); // Persist the idempotency identifier before making the request.
    try {
      const written = await this.options.port.commit(attempt);
      const pendingChanges = changesFor(sentBase, this.view.records);
      const merged = newest(this.base, this.latest, written);
      const next = new Map(visible(merged).map(record => [record.id, record]));
      const nextBase = { ...merged };
      for (const change of pendingChanges) {
        // Keep the revision the user actually edited, never silently rebase conflicting edits.
        const previous = written[change.id] ?? this.base[change.id];
        if (previous) nextBase[change.id] = previous;
        else delete nextBase[change.id];
        if (change.deleted) next.delete(change.id);
        else next.set(change.id, change.data);
      }
      this.latest = merged;
      this.base = nextBase;
      this.dirty = pendingChanges.length > 0;
      this.attempt = null;
      this.busy = false;
      this.emit({
        records: [...next.values()].sort((a, b) => b.id.localeCompare(a.id)),
        status: this.dirty ? 'pending' : 'ready',
        message: this.dirty ? 'Há novas alterações aguardando envio.' : 'Alterações salvas no servidor.',
        legacyCount: this.localCount()
      });
      this.persist();
      this.schedule();
    } catch (error) {
      this.busy = false;
      this.fail(error);
    }
  }
  retry = () => {
    if (this.busy) return;
    this.connect();
  };
  importLegacy = () => {
    if (!this.ready || this.busy || this.dirty || !this.legacy) return;
    try {
      const records = importMissing(this.latest, this.legacy);
      this.base = this.latest;
      this.dirty = changesFor(this.base, records).length > 0;
      this.emit({ records, status: this.dirty ? 'pending' : 'ready',
        message: this.dirty ? 'Enviando os dados deste navegador…' : 'Os dados locais já estão no servidor.' });
      this.persist();
      this.schedule();
    } catch (error) { this.fail(error); }
  };
  checkpoint = (): boolean => {
    try {
      this.options.storage().setItem(this.options.storageKey + ':recovery:' + Date.now(), this.exportData());
      return true;
    } catch {
      this.emit({ storageWarning: 'Exporte uma cópia antes de redefinir os dados. Não foi possível criar a recuperação local.' });
      return false;
    }
  };
  useServer = (): boolean => {
    if (!this.ready || this.busy) return false;
    try {
      // Recovery backup is mandatory before discarding a draft or a conflicting local version.
      this.options.storage().setItem(
        this.options.storageKey + ':recovery:' + Date.now(), this.exportData()
      );
    } catch {
      this.emit({ storageWarning: 'Exporte a recuperação antes de substituir esta versão. Não foi possível criar a cópia local.' });
      return false;
    }
    this.dirty = false;
    this.attempt = null;
    this.base = this.latest;
    this.emit({ records: visible(this.latest), status: 'ready',
      message: 'Versão do servidor carregada. Uma cópia da versão anterior foi preservada.' });
    this.persist();
    return true;
  };
  exportData = (): string => {
    const legacyRaw: Record<string, string | null> = {};
    try { for (const key of this.options.legacyKeys ?? []) legacyRaw[key] = this.options.storage().getItem(key); } catch { /* unavailable */ }
    let rawLegacyCache: string | null = null;
    try { rawLegacyCache = this.options.storage().getItem(this.options.storageKey); } catch { /* unavailable */ }
    return JSON.stringify({
      version: 1, exportedAt: new Date().toISOString(), records: this.view.records,
      legacy: this.legacy, base: this.base, remote: this.latest, attempt: this.attempt, rawLegacyCache, legacyRaw
    }, null, 2);
  };
}
