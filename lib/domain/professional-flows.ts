export type AuditModule =
  | 'Escalas'
  | 'Efetivo'
  | 'Afastamentos'
  | 'Cardápio'
  | 'Permutas'
  | 'Configurações'
  | 'Arquivamento'
  | 'Sistema';

export type AuditAction =
  | 'CRIACAO'
  | 'ALTERACAO'
  | 'EXCLUSAO'
  | 'ARQUIVAMENTO'
  | 'RESTAURACAO'
  | 'FINALIZACAO'
  | 'REABERTURA'
  | 'PERMUTA'
  | 'CANCELAMENTO';

export interface AuditEvent {
  id: string;
  createdAt: string;
  module: AuditModule;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  summary: string;
  previousValue?: string;
  newValue?: string;
  note?: string;
}

export interface SwapRecord {
  id: string;
  day: string;
  post: string;
  originalMilitaryId: string;
  originalMilitaryName: string;
  originalRank: string;
  replacementMilitaryId: string;
  replacementMilitaryName: string;
  replacementRank: string;
  status: 'CONFIRMADA' | 'CANCELADA';
  createdAt: string;
  cancelledAt?: string;
  note?: string;
}

export interface AdminSettings {
  rosterPosts: string[];
  absenceTypes: string[];
  specialties: string[];
  ranks: string[];
  historyRetentionLimit: number;
}

export const defaultAdminSettings: AdminSettings = {
  rosterPosts: [
    'Cozinheiro de Dia',
    'Copeiro de Dia',
    'Ceia de Dia',
    'Auxiliar do Copeiro de Dia'
  ],
  absenceTypes: [
    'Férias',
    'LTS',
    'Dispensa',
    'Baixado',
    'Missão',
    'Curso',
    'Outro'
  ],
  specialties: [
    'Cozinheiro de Dia',
    'Copeiro de Dia',
    'Auxiliar do Copeiro de Dia',
    'Ceia de Dia'
  ],
  ranks: ['Cb', 'Sd'],
  historyRetentionLimit: 1500
};

export function normalizeAdminSettings(value?: Partial<AdminSettings> | null): AdminSettings {
  const strings = (input: unknown, fallback: string[]) =>
    Array.isArray(input) && input.every(item => typeof item === 'string') && input.length
      ? Array.from(new Set(input.map(item => item.trim()).filter(Boolean)))
      : fallback;
  const limit = Number(value?.historyRetentionLimit);
  return {
    rosterPosts: strings(value?.rosterPosts, defaultAdminSettings.rosterPosts),
    absenceTypes: strings(value?.absenceTypes, defaultAdminSettings.absenceTypes),
    specialties: strings(value?.specialties, defaultAdminSettings.specialties),
    ranks: strings(value?.ranks, defaultAdminSettings.ranks),
    historyRetentionLimit: Number.isSafeInteger(limit) && limit >= 100 && limit <= 5000
      ? limit
      : defaultAdminSettings.historyRetentionLimit
  };
}

export function createAuditEvent(input: Omit<AuditEvent, 'id' | 'createdAt'> & Partial<Pick<AuditEvent, 'id' | 'createdAt'>>): AuditEvent {
  const now = input.createdAt || new Date().toISOString();
  return {
    ...input,
    id: input.id || `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now
  };
}

export function inferAuditFromLog(text: string): AuditEvent {
  const normalized = text.toLowerCase();
  let module: AuditModule = 'Sistema';
  if (/permuta/.test(normalized)) module = 'Permutas';
  else if (/afast|férias|ferias|lts|dispensa|retorno/.test(normalized)) module = 'Afastamentos';
  else if (/militar|cadastro|efetivo/.test(normalized)) module = 'Efetivo';
  else if (/escala|posto|feriado|designa|aloc/.test(normalized)) module = 'Escalas';

  let action: AuditAction = 'ALTERACAO';
  if (/adicion|cadastrad|registrad/.test(normalized)) action = 'CRIACAO';
  if (/exclu|removid/.test(normalized)) action = 'EXCLUSAO';
  if (/cancel/.test(normalized)) action = 'CANCELAMENTO';
  if (/permuta/.test(normalized)) action = 'PERMUTA';

  return createAuditEvent({
    module,
    action,
    entityType: module,
    summary: text
  });
}

export function trimAuditTrail(events: AuditEvent[], settings: AdminSettings): AuditEvent[] {
  return events.slice(0, settings.historyRetentionLimit);
}

export function splitLines(value: string): string[] {
  return Array.from(new Set(value
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean)));
}
