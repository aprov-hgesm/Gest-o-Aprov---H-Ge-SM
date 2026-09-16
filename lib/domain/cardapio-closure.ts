export type CardapioClosureAction = 'CONFERENCIA' | 'APROVACAO' | 'FINALIZACAO' | 'REABERTURA';

export interface CardapioClosureEvent {
  id: string;
  action: CardapioClosureAction;
  at: string;
  fromStatus: string;
  toStatus: string;
  version: number;
  responsibleDeclared?: string;
  roleDeclared?: string;
  note?: string;
}

export interface CardapioOperationalClosure {
  cycle: number;
  reopenCount: number;
  lastFinalizedAt?: string;
  lastFinalizedVersion?: number;
  lastReopenedAt?: string;
  lastReopenReason?: string;
  events: CardapioClosureEvent[];
}

export interface AppendClosureEventInput {
  action: CardapioClosureAction;
  at?: string;
  fromStatus: string;
  toStatus: string;
  version: number;
  responsibleDeclared?: string;
  roleDeclared?: string;
  note?: string;
  id?: string;
}

export function normalizeCardapioClosure(value?: CardapioOperationalClosure): CardapioOperationalClosure {
  return {
    cycle: Math.max(1, Number(value?.cycle) || 1),
    reopenCount: Math.max(0, Number(value?.reopenCount) || 0),
    lastFinalizedAt: value?.lastFinalizedAt,
    lastFinalizedVersion: value?.lastFinalizedVersion,
    lastReopenedAt: value?.lastReopenedAt,
    lastReopenReason: value?.lastReopenReason,
    events: Array.isArray(value?.events) ? [...value!.events] : [],
  };
}

export function appendCardapioClosureEvent(
  closure: CardapioOperationalClosure | undefined,
  input: AppendClosureEventInput,
): CardapioOperationalClosure {
  const base = normalizeCardapioClosure(closure);
  const at = input.at || new Date().toISOString();
  const event: CardapioClosureEvent = {
    id: input.id || `closure-${input.action.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action: input.action,
    at,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    version: input.version,
    responsibleDeclared: input.responsibleDeclared?.trim() || undefined,
    roleDeclared: input.roleDeclared?.trim() || undefined,
    note: input.note?.trim() || undefined,
  };

  const next: CardapioOperationalClosure = {
    ...base,
    events: [event, ...base.events],
  };

  if (input.action === 'REABERTURA') {
    next.cycle = base.cycle + 1;
    next.reopenCount = base.reopenCount + 1;
    next.lastReopenedAt = at;
    next.lastReopenReason = event.note;
  }

  if (input.action === 'FINALIZACAO') {
    next.lastFinalizedAt = at;
    next.lastFinalizedVersion = input.version;
  }

  return next;
}

export function getCardapioClosureSummary(
  closure: CardapioOperationalClosure | undefined,
  workflowStatus: string,
) {
  const normalized = normalizeCardapioClosure(closure);
  const lastEvent = normalized.events[0];
  return {
    cycle: normalized.cycle,
    reopenCount: normalized.reopenCount,
    isFinalized: workflowStatus === 'FINALIZADO',
    lastFinalizedAt: normalized.lastFinalizedAt,
    lastFinalizedVersion: normalized.lastFinalizedVersion,
    lastReopenedAt: normalized.lastReopenedAt,
    lastReopenReason: normalized.lastReopenReason,
    lastEvent,
    eventCount: normalized.events.length,
  };
}
