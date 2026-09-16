from pathlib import Path

ROOT = Path('.')


def replace_once(path: str, old: str, new: str):
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Anchor not found in {path}: {old[:120]!r}')
    text = text.replace(old, new, 1)
    p.write_text(text, encoding='utf-8')

# -----------------------------------------------------------------------------
# Domain: fechamento operacional do cardápio
# -----------------------------------------------------------------------------
(ROOT / 'lib/domain/cardapio-closure.ts').write_text(r'''export type CardapioClosureAction = 'CONFERENCIA' | 'APROVACAO' | 'FINALIZACAO' | 'REABERTURA';

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
''', encoding='utf-8')

# -----------------------------------------------------------------------------
# Cardápio: tipos, estados, transições e UI de fechamento
# -----------------------------------------------------------------------------
replace_once(
    'components/CardapioSemanal.tsx',
    "import { getCardapioReadiness } from '@/lib/domain/cardapio-readiness';\n",
    "import { getCardapioReadiness } from '@/lib/domain/cardapio-readiness';\nimport { appendCardapioClosureEvent, getCardapioClosureSummary, type CardapioOperationalClosure } from '@/lib/domain/cardapio-closure';\n",
)

replace_once(
    'components/CardapioSemanal.tsx',
    """export interface CardapioWorkflow {\n  status: WorkflowStatus;\n  conferido: {\n    cargo: string;\n    responsavel: string;\n    data?: string;\n    status: 'PENDENTE' | 'CONFERIDO';\n  };\n  aprovado: {\n    cargo: string;\n    responsavel: string;\n    data?: string;\n    status: 'PENDENTE' | 'APROVADO';\n  };\n}\n""",
    """export interface CardapioWorkflow {\n  status: WorkflowStatus;\n  conferido: {\n    cargo: string;\n    responsavel: string;\n    data?: string;\n    dataHora?: string;\n    status: 'PENDENTE' | 'CONFERIDO';\n  };\n  aprovado: {\n    cargo: string;\n    responsavel: string;\n    data?: string;\n    dataHora?: string;\n    status: 'PENDENTE' | 'APROVADO';\n  };\n  finalizado?: {\n    cargo: string;\n    responsavel: string;\n    data?: string;\n    dataHora?: string;\n    observacao?: string;\n    status: 'PENDENTE' | 'FINALIZADO';\n  };\n}\n""",
)

replace_once(
    'components/CardapioSemanal.tsx',
    """  archivedAt?: string;\n  archiveReason?: string;\n  lastChangeReason?: string;\n}\n""",
    """  archivedAt?: string;\n  archiveReason?: string;\n  lastChangeReason?: string;\n  operationalClosure?: CardapioOperationalClosure;\n}\n""",
)

replace_once(
    'components/CardapioSemanal.tsx',
    """  // Institutional config modal\n  const [isInstitutionalModalOpen, setIsInstitutionalModalOpen] = useState(false);\n\n  // PDF Generation State\n""",
    """  // Institutional config modal\n  const [isInstitutionalModalOpen, setIsInstitutionalModalOpen] = useState(false);\n\n  // Operational closure modal (declared responsibility only; no identity authentication).\n  const [isFinalizationModalOpen, setIsFinalizationModalOpen] = useState(false);\n  const [finalizerName, setFinalizerName] = useState('');\n  const [finalizerRole, setFinalizerRole] = useState('');\n  const [finalizationNote, setFinalizationNote] = useState('');\n\n  // PDF Generation State\n""",
)

replace_once(
    'components/CardapioSemanal.tsx',
    """  const currentCardapio: WeeklyCardapioDoc = \n    cardapiosList.find(c => c.id === selectedCardapioId) || cardapiosList[0] || initialWeeklyCardapio;\n  const isArchivedCardapio = Boolean(currentCardapio.archivedAt);\n""",
    """  const currentCardapio: WeeklyCardapioDoc = \n    cardapiosList.find(c => c.id === selectedCardapioId) || cardapiosList[0] || initialWeeklyCardapio;\n  const isArchivedCardapio = Boolean(currentCardapio.archivedAt);\n  const closureSummary = getCardapioClosureSummary(currentCardapio.operationalClosure, currentCardapio.workflow.status);\n""",
)

# Automatic reopening after reviewed content edits also enters the structured closure timeline.
replace_once(
    'components/CardapioSemanal.tsx',
    """      candidate.workflow.conferido.status = 'PENDENTE';\n      candidate.workflow.conferido.data = undefined;\n      candidate.workflow.aprovado.status = 'PENDENTE';\n      candidate.workflow.aprovado.data = undefined;\n      showToast('Alteração no conteúdo criou nova versão e reabriu o cardápio para conferência.', 'info');\n""",
    """      candidate.workflow.conferido.status = 'PENDENTE';\n      candidate.workflow.conferido.data = undefined;\n      candidate.workflow.conferido.dataHora = undefined;\n      candidate.workflow.aprovado.status = 'PENDENTE';\n      candidate.workflow.aprovado.data = undefined;\n      candidate.workflow.aprovado.dataHora = undefined;\n      candidate.workflow.finalizado = undefined;\n      candidate.operationalClosure = appendCardapioClosureEvent(candidate.operationalClosure, {\n        action: 'REABERTURA',\n        fromStatus: persisted.workflow.status,\n        toStatus: 'EM_ELABORACAO',\n        version: candidate.version || 1,\n        note: 'Alteração de conteúdo após conferência/aprovação',\n      });\n      showToast('Alteração no conteúdo criou nova versão e reabriu o cardápio para conferência.', 'info');\n""",
)

start_marker = "  // Advance workflow state\n  const handleAdvanceWorkflow = () => {"
end_marker = "  // Handle official PDF generation and download in A4 Landscape\n"
p = ROOT / 'components/CardapioSemanal.tsx'
text = p.read_text(encoding='utf-8')
start = text.find(start_marker)
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit('Workflow handler markers not found in CardapioSemanal.tsx')
new_handlers = r'''  // Advance workflow state. Conference and approval use declared document responsibility,
  // not authenticated identity. Finalization opens a dedicated operational closure step.
  const handleAdvanceWorkflow = () => {
    const readiness = getCardapioReadiness(currentCardapio);
    if (!readiness.ok) {
      const preview = readiness.missing.slice(0, 3).join('; ');
      const extra = readiness.missing.length > 3 ? ` (+${readiness.missing.length - 3} pendência(s))` : '';
      showToast(`Cardápio com ${readiness.percent}% de prontidão. Corrija: ${preview}${extra}.`, 'info');
      return;
    }

    const currentStatus = currentCardapio.workflow.status;
    const now = new Date();
    const nowIso = now.toISOString();
    const nowStr = now.toLocaleDateString('pt-BR');

    if (currentStatus === 'APROVADO') {
      setFinalizerName(currentCardapio.workflow.finalizado?.responsavel || currentCardapio.workflow.aprovado.responsavel || '');
      setFinalizerRole(currentCardapio.workflow.finalizado?.cargo || currentCardapio.workflow.aprovado.cargo || '');
      setFinalizationNote(currentCardapio.workflow.finalizado?.observacao || '');
      setIsFinalizationModalOpen(true);
      return;
    }

    if (currentStatus !== 'EM_ELABORACAO' && currentStatus !== 'CONFERIDO') return;

    const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
    const version = updated.version || 1;
    let nextStatus: WorkflowStatus;
    let message: string;

    if (currentStatus === 'EM_ELABORACAO') {
      nextStatus = 'CONFERIDO';
      updated.workflow.status = nextStatus;
      updated.workflow.conferido.status = 'CONFERIDO';
      updated.workflow.conferido.data = nowStr;
      updated.workflow.conferido.dataHora = nowIso;
      updated.operationalClosure = appendCardapioClosureEvent(updated.operationalClosure, {
        action: 'CONFERENCIA', at: nowIso, fromStatus: currentStatus, toStatus: nextStatus, version,
        responsibleDeclared: updated.workflow.conferido.responsavel,
        roleDeclared: updated.workflow.conferido.cargo,
      });
      message = 'Cardápio marcado como CONFERIDO pelo responsável informado no documento.';
    } else {
      nextStatus = 'APROVADO';
      updated.workflow.status = nextStatus;
      updated.workflow.aprovado.status = 'APROVADO';
      updated.workflow.aprovado.data = nowStr;
      updated.workflow.aprovado.dataHora = nowIso;
      updated.operationalClosure = appendCardapioClosureEvent(updated.operationalClosure, {
        action: 'APROVACAO', at: nowIso, fromStatus: currentStatus, toStatus: nextStatus, version,
        responsibleDeclared: updated.workflow.aprovado.responsavel,
        roleDeclared: updated.workflow.aprovado.cargo,
      });
      message = 'Cardápio marcado como APROVADO pelo responsável informado no documento.';
    }

    if (!updateCurrentCardapio(updated)) return;
    onAudit?.({
      module: 'Cardápio', action: 'ALTERACAO', entityType: 'Cardápio', entityId: currentCardapio.id,
      summary: `Fluxo do cardápio ${currentCardapio.dataInicio} a ${currentCardapio.dataFim}: ${currentStatus} → ${nextStatus}.`,
      previousValue: currentStatus, newValue: nextStatus,
      note: nextStatus === 'CONFERIDO'
        ? `${updated.workflow.conferido.cargo}: ${updated.workflow.conferido.responsavel}`
        : `${updated.workflow.aprovado.cargo}: ${updated.workflow.aprovado.responsavel}`,
    });
    showToast(message);
  };

  const handleConfirmFinalization = () => {
    const name = finalizerName.trim();
    const role = finalizerRole.trim();
    if (!name || !role) {
      showToast('Informe o responsável declarado e a função/cargo para concluir o fechamento.', 'info');
      return;
    }
    if (currentCardapio.workflow.status !== 'APROVADO') {
      showToast('Somente um cardápio aprovado pode ser finalizado.', 'info');
      setIsFinalizationModalOpen(false);
      return;
    }
    const readiness = getCardapioReadiness(currentCardapio);
    if (!readiness.ok) {
      showToast(`O cardápio voltou a apresentar pendências (${readiness.percent}% de prontidão).`, 'info');
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const nowStr = now.toLocaleDateString('pt-BR');
    const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
    const version = updated.version || 1;
    updated.workflow.status = 'FINALIZADO';
    updated.workflow.finalizado = {
      cargo: role,
      responsavel: name,
      data: nowStr,
      dataHora: nowIso,
      observacao: finalizationNote.trim() || undefined,
      status: 'FINALIZADO',
    };
    updated.operationalClosure = appendCardapioClosureEvent(updated.operationalClosure, {
      action: 'FINALIZACAO', at: nowIso, fromStatus: 'APROVADO', toStatus: 'FINALIZADO', version,
      responsibleDeclared: name, roleDeclared: role, note: finalizationNote,
    });
    const snapshot = createCardapioVersionSnapshot(updated, 'Finalização oficial do cardápio');
    updated.versions = [snapshot, ...(currentCardapio.versions || []).filter(item => item.version !== snapshot.version)];

    if (!updateCurrentCardapio(updated)) return;
    onAudit?.({
      module: 'Cardápio', action: 'FINALIZACAO', entityType: 'Cardápio', entityId: currentCardapio.id,
      summary: `Cardápio ${currentCardapio.dataInicio} a ${currentCardapio.dataFim} finalizado operacionalmente.`,
      previousValue: 'APROVADO', newValue: 'FINALIZADO',
      note: `${role}: ${name}${finalizationNote.trim() ? ` — ${finalizationNote.trim()}` : ''}`,
    });
    setIsFinalizationModalOpen(false);
    showToast('Cardápio FINALIZADO e fechamento operacional registrado.');
  };

  const handleReopenWorkflow = () => {
    const reason = window.prompt('Informe o motivo da reabertura do cardápio:');
    if (!reason?.trim()) {
      showToast('A reabertura exige um motivo para preservar a rastreabilidade.', 'info');
      return;
    }
    const nowIso = new Date().toISOString();
    const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
    const previousVersion = currentCardapio.version || 1;
    const snapshot = createCardapioVersionSnapshot({ ...currentCardapio, version: previousVersion }, `Estado preservado antes da reabertura: ${reason.trim()}`);
    updated.version = previousVersion + 1;
    updated.versions = [snapshot, ...(currentCardapio.versions || []).filter(item => item.id !== snapshot.id)];
    updated.lastChangeReason = reason.trim();
    updated.workflow.status = 'EM_ELABORACAO';
    updated.workflow.conferido.status = 'PENDENTE';
    updated.workflow.conferido.data = undefined;
    updated.workflow.conferido.dataHora = undefined;
    updated.workflow.aprovado.status = 'PENDENTE';
    updated.workflow.aprovado.data = undefined;
    updated.workflow.aprovado.dataHora = undefined;
    updated.workflow.finalizado = undefined;
    updated.operationalClosure = appendCardapioClosureEvent(updated.operationalClosure, {
      action: 'REABERTURA', at: nowIso,
      fromStatus: currentCardapio.workflow.status, toStatus: 'EM_ELABORACAO',
      version: previousVersion + 1, note: reason.trim(),
    });
    if (!updateCurrentCardapio(updated)) return;
    onAudit?.({
      module: 'Cardápio', action: 'REABERTURA', entityType: 'Cardápio', entityId: currentCardapio.id,
      summary: `Cardápio reaberto como versão ${previousVersion + 1}.`,
      previousValue: `Versão ${previousVersion} / ${currentCardapio.workflow.status}`,
      newValue: `Versão ${previousVersion + 1} / EM_ELABORACAO`, note: reason.trim()
    });
    showToast(`Cardápio reaberto como versão ${previousVersion + 1}.`, 'info');
  };

'''
text = text[:start] + new_handlers + text[end:]
p.write_text(text, encoding='utf-8')

# Closure summary card in the normal screen UI.
replace_once(
    'components/CardapioSemanal.tsx',
    """        {/* Sub-bar: Week selector, view mode switcher, new week, zoom */}\n""",
    """        {/* Operational closure trace */}\n        <div className=\"grid lg:grid-cols-[1.2fr_1fr_1fr] gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs\">\n          <div>\n            <div className=\"flex items-center gap-2\"><ShieldCheck className=\"w-4 h-4 text-emerald-800\" /><span className=\"text-xs font-bold uppercase tracking-wider text-slate-700\">Fechamento operacional</span></div>\n            <div className=\"mt-1 text-xs text-slate-500\">Ciclo {closureSummary.cycle} · {closureSummary.eventCount} registro(s) · {closureSummary.reopenCount} reabertura(s)</div>\n            <div className=\"mt-1 text-[10px] text-slate-400\">Responsáveis são informados no documento; este fluxo não autentica a identidade do aprovador.</div>\n          </div>\n          <div className=\"text-xs\">\n            <div className=\"font-semibold text-slate-700\">Conferência / aprovação</div>\n            <div className=\"text-slate-500 mt-1\">{currentCardapio.workflow.conferido.responsavel || 'Não informado'} · {currentCardapio.workflow.conferido.dataHora ? new Date(currentCardapio.workflow.conferido.dataHora).toLocaleString('pt-BR') : currentCardapio.workflow.conferido.status}</div>\n            <div className=\"text-slate-500\">{currentCardapio.workflow.aprovado.responsavel || 'Não informado'} · {currentCardapio.workflow.aprovado.dataHora ? new Date(currentCardapio.workflow.aprovado.dataHora).toLocaleString('pt-BR') : currentCardapio.workflow.aprovado.status}</div>\n          </div>\n          <div className=\"text-xs\">\n            <div className=\"font-semibold text-slate-700\">Último fechamento</div>\n            <div className=\"text-slate-500 mt-1\">{closureSummary.lastFinalizedAt ? new Date(closureSummary.lastFinalizedAt).toLocaleString('pt-BR') : 'Ainda não finalizado'}</div>\n            {closureSummary.lastReopenReason && <div className=\"text-amber-700 mt-1\">Última reabertura: {closureSummary.lastReopenReason}</div>}\n          </div>\n        </div>\n\n        {/* Sub-bar: Week selector, view mode switcher, new week, zoom */}\n""",
)

# Dedicated finalization modal before existing edit modal.
replace_once(
    'components/CardapioSemanal.tsx',
    """      {/* ------------------------------------------------------------------- */}\n      {/* MODAL 1: EDIT SINGLE DAY MEALS (Structured form)                    */}\n""",
    """      {/* ------------------------------------------------------------------- */}\n      {/* OPERATIONAL CLOSURE: FINALIZATION                                   */}\n      {/* ------------------------------------------------------------------- */}\n      {isFinalizationModalOpen && (\n        <div className=\"fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[70] flex items-center justify-center p-4\">\n          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className=\"bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden\">\n            <div className=\"p-5 border-b border-slate-100 flex items-start justify-between\">\n              <div><h3 className=\"font-bold text-slate-900\">Finalizar fechamento operacional</h3><p className=\"text-xs text-slate-500 mt-1\">Registre quem consta como responsável pelo fechamento desta versão.</p></div>\n              <button onClick={() => setIsFinalizationModalOpen(false)} className=\"p-1.5 rounded-lg hover:bg-slate-100\"><X className=\"w-4 h-4\" /></button>\n            </div>\n            <div className=\"p-5 space-y-4\">\n              <div className=\"rounded-lg border border-blue-200 bg-blue-50 p-3 text-[11px] text-blue-900\"><strong>Registro declarado:</strong> os campos abaixo documentam a responsabilidade informada. Não há autenticação da identidade do aprovador neste fluxo.</div>\n              <label className=\"block\"><span className=\"text-xs font-bold text-slate-700\">Responsável declarado</span><input value={finalizerName} onChange={e => setFinalizerName(e.target.value)} className=\"mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm\" placeholder=\"Nome informado no documento\" /></label>\n              <label className=\"block\"><span className=\"text-xs font-bold text-slate-700\">Função / cargo</span><input value={finalizerRole} onChange={e => setFinalizerRole(e.target.value)} className=\"mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm\" placeholder=\"Ex.: Chefe da Seção\" /></label>\n              <label className=\"block\"><span className=\"text-xs font-bold text-slate-700\">Observação de fechamento (opcional)</span><textarea value={finalizationNote} onChange={e => setFinalizationNote(e.target.value)} rows={3} className=\"mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none\" placeholder=\"Observação administrativa, se necessária\" /></label>\n            </div>\n            <div className=\"p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2\">\n              <button onClick={() => setIsFinalizationModalOpen(false)} className=\"px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600\">Cancelar</button>\n              <button onClick={handleConfirmFinalization} className=\"px-4 py-2 rounded-lg bg-[#1e382b] text-white text-xs font-bold flex items-center gap-2\"><ShieldCheck className=\"w-4 h-4\" />Finalizar e preservar versão</button>\n            </div>\n          </motion.div>\n        </div>\n      )}\n\n      {/* ------------------------------------------------------------------- */}\n      {/* MODAL 1: EDIT SINGLE DAY MEALS (Structured form)                    */}\n""",
)

# -----------------------------------------------------------------------------
# Validation: backward-compatible optional closure metadata.
# -----------------------------------------------------------------------------
replace_once(
    'lib/persistence/validation.ts',
    """const cardapioVersion = (value: unknown) => object(value) &&\n  strings(value, ['id', 'createdAt', 'reason', 'workflowStatus', 'snapshot']) &&\n  typeof value.version === 'number' && Number.isSafeInteger(value.version) && value.version >= 1;\n""",
    """const cardapioVersion = (value: unknown) => object(value) &&\n  strings(value, ['id', 'createdAt', 'reason', 'workflowStatus', 'snapshot']) &&\n  typeof value.version === 'number' && Number.isSafeInteger(value.version) && value.version >= 1;\nconst closureEvent = (value: unknown) => object(value) &&\n  strings(value, ['id', 'action', 'at', 'fromStatus', 'toStatus']) &&\n  ['CONFERENCIA', 'APROVACAO', 'FINALIZACAO', 'REABERTURA'].includes(String(value.action)) &&\n  typeof value.version === 'number' && Number.isSafeInteger(value.version) && value.version >= 1 &&\n  optional(value, 'responsibleDeclared', 'string') && optional(value, 'roleDeclared', 'string') && optional(value, 'note', 'string');\nconst operationalClosure = (value: unknown) => object(value) &&\n  typeof value.cycle === 'number' && Number.isSafeInteger(value.cycle) && value.cycle >= 1 &&\n  typeof value.reopenCount === 'number' && Number.isSafeInteger(value.reopenCount) && value.reopenCount >= 0 &&\n  optional(value, 'lastFinalizedAt', 'string') &&\n  (value.lastFinalizedVersion === undefined || (typeof value.lastFinalizedVersion === 'number' && Number.isSafeInteger(value.lastFinalizedVersion))) &&\n  optional(value, 'lastReopenedAt', 'string') && optional(value, 'lastReopenReason', 'string') &&\n  list(value.events, closureEvent);\n""",
)

replace_once(
    'lib/persistence/validation.ts',
    """    (value.versions !== undefined && !list(value.versions, cardapioVersion)) ||\n    !optional(value, 'archivedAt', 'string') || !optional(value, 'archiveReason', 'string') || !optional(value, 'lastChangeReason', 'string') ||\n""",
    """    (value.versions !== undefined && !list(value.versions, cardapioVersion)) ||\n    (value.operationalClosure !== undefined && !operationalClosure(value.operationalClosure)) ||\n    !optional(value, 'archivedAt', 'string') || !optional(value, 'archiveReason', 'string') || !optional(value, 'lastChangeReason', 'string') ||\n""",
)

replace_once(
    'lib/persistence/validation.ts',
    """  return ['EM_ELABORACAO', 'CONFERIDO', 'APROVADO', 'FINALIZADO'].includes(String(workflow.status)) &&\n    object(workflow.conferido) && strings(workflow.conferido, ['cargo', 'responsavel', 'status']) &&\n    object(workflow.aprovado) && strings(workflow.aprovado, ['cargo', 'responsavel', 'status']);\n""",
    """  return ['EM_ELABORACAO', 'CONFERIDO', 'APROVADO', 'FINALIZADO'].includes(String(workflow.status)) &&\n    object(workflow.conferido) && strings(workflow.conferido, ['cargo', 'responsavel', 'status']) &&\n    optional(workflow.conferido, 'data', 'string') && optional(workflow.conferido, 'dataHora', 'string') &&\n    object(workflow.aprovado) && strings(workflow.aprovado, ['cargo', 'responsavel', 'status']) &&\n    optional(workflow.aprovado, 'data', 'string') && optional(workflow.aprovado, 'dataHora', 'string') &&\n    (workflow.finalizado === undefined || (object(workflow.finalizado) &&\n      strings(workflow.finalizado, ['cargo', 'responsavel', 'status']) &&\n      ['PENDENTE', 'FINALIZADO'].includes(String(workflow.finalizado.status)) &&\n      optional(workflow.finalizado, 'data', 'string') && optional(workflow.finalizado, 'dataHora', 'string') && optional(workflow.finalizado, 'observacao', 'string')));\n""",
)

# -----------------------------------------------------------------------------
# Tests
# -----------------------------------------------------------------------------
(ROOT / 'tests/block6-operational-closure.test.ts').write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendCardapioClosureEvent,
  getCardapioClosureSummary,
  normalizeCardapioClosure,
} from '../lib/domain/cardapio-closure.ts';

test('fechamento registra conferência, aprovação e finalização com responsabilidade declarada', () => {
  let closure = normalizeCardapioClosure();
  closure = appendCardapioClosureEvent(closure, {
    id: 'evt-1', action: 'CONFERENCIA', at: '2026-09-16T10:00:00.000Z',
    fromStatus: 'EM_ELABORACAO', toStatus: 'CONFERIDO', version: 1,
    responsibleDeclared: 'Responsável A', roleDeclared: 'Chefe Fiscal',
  });
  closure = appendCardapioClosureEvent(closure, {
    id: 'evt-2', action: 'APROVACAO', at: '2026-09-16T11:00:00.000Z',
    fromStatus: 'CONFERIDO', toStatus: 'APROVADO', version: 1,
    responsibleDeclared: 'Responsável B', roleDeclared: 'Direção',
  });
  closure = appendCardapioClosureEvent(closure, {
    id: 'evt-3', action: 'FINALIZACAO', at: '2026-09-16T12:00:00.000Z',
    fromStatus: 'APROVADO', toStatus: 'FINALIZADO', version: 1,
    responsibleDeclared: 'Responsável C', roleDeclared: 'Chefia', note: 'Fechamento semanal',
  });

  const summary = getCardapioClosureSummary(closure, 'FINALIZADO');
  assert.equal(summary.isFinalized, true);
  assert.equal(summary.cycle, 1);
  assert.equal(summary.reopenCount, 0);
  assert.equal(summary.eventCount, 3);
  assert.equal(summary.lastFinalizedAt, '2026-09-16T12:00:00.000Z');
  assert.equal(closure.events[0].responsibleDeclared, 'Responsável C');
  assert.equal(closure.events[0].roleDeclared, 'Chefia');
});

test('reabertura inicia novo ciclo e preserva motivo e histórico anterior', () => {
  let closure = appendCardapioClosureEvent(undefined, {
    id: 'evt-final', action: 'FINALIZACAO', at: '2026-09-16T12:00:00.000Z',
    fromStatus: 'APROVADO', toStatus: 'FINALIZADO', version: 2,
  });
  closure = appendCardapioClosureEvent(closure, {
    id: 'evt-reopen', action: 'REABERTURA', at: '2026-09-17T08:30:00.000Z',
    fromStatus: 'FINALIZADO', toStatus: 'EM_ELABORACAO', version: 3,
    note: 'Correção solicitada após publicação',
  });

  const summary = getCardapioClosureSummary(closure, 'EM_ELABORACAO');
  assert.equal(summary.isFinalized, false);
  assert.equal(summary.cycle, 2);
  assert.equal(summary.reopenCount, 1);
  assert.equal(summary.lastReopenReason, 'Correção solicitada após publicação');
  assert.equal(summary.eventCount, 2);
  assert.equal(closure.events[1].action, 'FINALIZACAO');
});

test('metadados de fechamento não modelam autenticação de identidade', () => {
  const closure = appendCardapioClosureEvent(undefined, {
    id: 'evt', action: 'FINALIZACAO', at: '2026-09-16T12:00:00.000Z',
    fromStatus: 'APROVADO', toStatus: 'FINALIZADO', version: 1,
    responsibleDeclared: 'Nome informado', roleDeclared: 'Função informada',
  });
  const event = closure.events[0] as unknown as Record<string, unknown>;
  assert.equal('userId' in event, false);
  assert.equal('email' in event, false);
  assert.equal('authenticatedBy' in event, false);
});
''', encoding='utf-8')

(ROOT / 'tests/block6-ui-smoke.mjs').write_text(r'''import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cardapio = await readFile('components/CardapioSemanal.tsx', 'utf8');
const validation = await readFile('lib/persistence/validation.ts', 'utf8');

assert.match(cardapio, /Finalizar fechamento operacional/);
assert.match(cardapio, /Responsável declarado/);
assert.match(cardapio, /não autentica a identidade do aprovador/);
assert.match(cardapio, /appendCardapioClosureEvent/);
assert.match(cardapio, /dataHora/);
assert.match(cardapio, /Última reabertura/);
assert.match(validation, /operationalClosure/);
assert.match(validation, /FINALIZACAO/);
console.log('Block 6 operational closure UI smoke: OK');
''', encoding='utf-8')

print('Block 6 patch applied')
