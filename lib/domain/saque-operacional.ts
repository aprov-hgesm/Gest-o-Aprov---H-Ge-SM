export type SaqueOperationalStatus = 'PENDENTE' | 'SEPARADO' | 'RETIRADO';
export type SaqueUrgency = 'ATRASADO' | 'HOJE' | 'PROXIMO' | 'FUTURO' | 'CONCLUIDO';
export type SaqueViewMode = 'RETIRADA' | 'CONSUMO' | 'CORTE';

export interface SaqueStatusHistoryEntry {
  status: SaqueOperationalStatus;
  at: string;
  note?: string;
}

export interface SaqueOperationalRecord {
  id: string;
  cardapioId: string;
  saqueItemId: string;
  status: SaqueOperationalStatus;
  updatedAt: string;
  note?: string;
  history: SaqueStatusHistoryEntry[];
}

export interface SaqueSourceItem {
  id: string;
  diaCardapioIso: string;
  diaSemanaCardapioLabel: string;
  preparacao: string;
  origem: 'ALMOÇO GERAL' | 'ALMOÇO PACIENTE' | 'JANTAR PACIENTE';
  tipoCarne: string;
  quantidadeKg: number;
  diasAntecedencia: number;
  dataSaqueIso: string;
  dataSaqueFormatada: string;
  diaSemanaSaque: string;
  ehFimDeSemana: boolean;
  observacao?: string;
  diaIndex: number;
  isAdicional?: boolean;
}

export interface SaqueOperationalItem extends SaqueSourceItem {
  cardapioId: string;
  cardapioInicio: string;
  cardapioFim: string;
  recordId: string;
  status: SaqueOperationalStatus;
  statusUpdatedAt?: string;
  statusNote?: string;
  urgency: SaqueUrgency;
  isHoliday: boolean;
}

export interface SaqueFilters {
  startDate?: string;
  endDate?: string;
  cut?: string;
  origin?: string;
  status?: string;
  query?: string;
}

export function saqueRecordId(cardapioId: string, saqueItemId: string): string {
  return `${cardapioId}__${saqueItemId}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

export function resolveSaqueUrgency(
  dataSaqueIso: string,
  status: SaqueOperationalStatus,
  referenceIso: string,
): SaqueUrgency {
  if (status === 'RETIRADO') return 'CONCLUIDO';
  if (!dataSaqueIso) return 'FUTURO';
  if (dataSaqueIso < referenceIso) return 'ATRASADO';
  if (dataSaqueIso === referenceIso) return 'HOJE';
  const ref = new Date(`${referenceIso}T12:00:00`);
  const date = new Date(`${dataSaqueIso}T12:00:00`);
  const days = Math.round((date.getTime() - ref.getTime()) / 86400000);
  return days <= 3 ? 'PROXIMO' : 'FUTURO';
}

export function createOrTransitionSaqueRecord(
  existing: SaqueOperationalRecord | undefined,
  input: {
    cardapioId: string;
    saqueItemId: string;
    status: SaqueOperationalStatus;
    at?: string;
    note?: string;
  },
): SaqueOperationalRecord {
  const at = input.at || new Date().toISOString();
  const id = existing?.id || saqueRecordId(input.cardapioId, input.saqueItemId);
  const history = existing?.history ? [...existing.history] : [];
  if (!existing || existing.status !== input.status || (input.note || '') !== (existing.note || '')) {
    history.push({ status: input.status, at, note: input.note?.trim() || undefined });
  }
  return {
    id,
    cardapioId: input.cardapioId,
    saqueItemId: input.saqueItemId,
    status: input.status,
    updatedAt: at,
    note: input.note?.trim() || undefined,
    history,
  };
}

export function decorateSaqueItem(
  cardapio: { id: string; dataInicio: string; dataFim: string },
  item: SaqueSourceItem,
  record: SaqueOperationalRecord | undefined,
  holidayDates: Set<string>,
  referenceIso: string,
): SaqueOperationalItem {
  const status = record?.status || 'PENDENTE';
  return {
    ...item,
    cardapioId: cardapio.id,
    cardapioInicio: cardapio.dataInicio,
    cardapioFim: cardapio.dataFim,
    recordId: saqueRecordId(cardapio.id, item.id),
    status,
    statusUpdatedAt: record?.updatedAt,
    statusNote: record?.note,
    urgency: resolveSaqueUrgency(item.dataSaqueIso, status, referenceIso),
    isHoliday: holidayDates.has(item.dataSaqueIso),
  };
}

export function filterSaqueItems(items: SaqueOperationalItem[], filters: SaqueFilters): SaqueOperationalItem[] {
  const query = (filters.query || '').trim().toLocaleLowerCase('pt-BR');
  return items.filter(item => {
    if (filters.startDate && item.dataSaqueIso < filters.startDate) return false;
    if (filters.endDate && item.dataSaqueIso > filters.endDate) return false;
    if (filters.cut && filters.cut !== 'TODOS' && item.tipoCarne !== filters.cut) return false;
    if (filters.origin && filters.origin !== 'TODAS' && item.origem !== filters.origin) return false;
    if (filters.status && filters.status !== 'TODOS' && item.status !== filters.status) return false;
    if (!query) return true;
    const searchable = [
      item.preparacao, item.tipoCarne, item.origem, item.diaSemanaSaque,
      item.dataSaqueIso, item.diaCardapioIso, item.status, item.statusNote || '',
    ].join(' ').toLocaleLowerCase('pt-BR');
    return searchable.includes(query);
  });
}

export function groupSaqueItems(items: SaqueOperationalItem[], mode: SaqueViewMode) {
  const grouped = new Map<string, SaqueOperationalItem[]>();
  for (const item of items) {
    const key = mode === 'RETIRADA' ? item.dataSaqueIso : mode === 'CONSUMO' ? item.diaCardapioIso : item.tipoCarne;
    const current = grouped.get(key) || [];
    current.push(item);
    grouped.set(key, current);
  }
  return [...grouped.entries()]
    .map(([key, groupItems]) => ({
      key,
      items: groupItems,
      totalKg: groupItems.reduce((sum, item) => sum + (Number(item.quantidadeKg) || 0), 0),
    }))
    .sort((a, b) => a.key.localeCompare(b.key, 'pt-BR'));
}

export function summarizeSaque(items: SaqueOperationalItem[]) {
  return {
    totalItems: items.length,
    totalKg: items.reduce((sum, item) => sum + (Number(item.quantidadeKg) || 0), 0),
    pending: items.filter(item => item.status === 'PENDENTE').length,
    separated: items.filter(item => item.status === 'SEPARADO').length,
    withdrawn: items.filter(item => item.status === 'RETIRADO').length,
    overdue: items.filter(item => item.urgency === 'ATRASADO').length,
    today: items.filter(item => item.urgency === 'HOJE').length,
  };
}
