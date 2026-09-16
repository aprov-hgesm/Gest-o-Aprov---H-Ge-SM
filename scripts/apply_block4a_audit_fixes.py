from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'[{label}] trecho não encontrado')
    return text.replace(old, new, 1)


# -----------------------------------------------------------------------------
# app/page.tsx
# -----------------------------------------------------------------------------
p = Path('app/page.tsx')
text = p.read_text()

text = replace_once(
    text,
    "  createAuditEvent, defaultAdminSettings, inferAuditFromLog, normalizeAdminSettings, trimAuditTrail,\n  type AdminSettings, type AuditEvent, type SwapRecord\n} from '@/lib/domain/professional-flows';",
    "  createAuditEvent, defaultAdminSettings, inferAuditFromLog, normalizeAdminSettings, resolveSwapOperationalStatus, trimAuditTrail,\n  type AdminSettings, type AuditEvent, type SwapRecord\n} from '@/lib/domain/professional-flows';\nimport {\n  clearRosterDays, reconcileRosterPosts, removeHolidayRosterDay, rosterCellDisplayName, selectRosterDays\n} from '@/lib/domain/roster-operations';",
    'imports',
)

old_create = """const createEmptyRoster = (days?: string[]): WeekRoster => {
  const r: WeekRoster = {};
  const daysList = days && days.length > 0 ? days : generateWeekendAndHolidayDays(initialHolidays);
  daysList.forEach(day => {
    r[day] = {
      'Cozinheiro de Dia': null,
      'Copeiro de Dia': null,
      'Ceia de Dia': null,
      'Auxiliar do Copeiro de Dia': null
    };
  });
  return r;
};"""
new_create = """const createEmptyRoster = (days?: string[], posts: string[] = defaultAdminSettings.rosterPosts): WeekRoster => {
  const r: WeekRoster = {};
  const daysList = days && days.length > 0 ? days : generateWeekendAndHolidayDays(initialHolidays);
  daysList.forEach(day => {
    r[day] = Object.fromEntries(posts.map(post => [post, null]));
  });
  return r;
};"""
text = replace_once(text, old_create, new_create, 'createEmptyRoster')

text = replace_once(
    text,
    "  const [alertsOpen, setAlertsOpen] = useState(false);",
    "  const [alertsOpen, setAlertsOpen] = useState(false);\n  const [isHelpOpen, setIsHelpOpen] = useState(false);",
    'help-state',
)

old_settings = """  const handleSaveAdminSettings = (settings: AdminSettings) => {
    const normalized = normalizeAdminSettings(settings);
    const updatedRoster = clean(roster);
    Object.keys(updatedRoster).forEach(day => {
      normalized.rosterPosts.forEach(post => {
        if (!(post in updatedRoster[day])) updatedRoster[day][post] = null;
      });
    });
    const logsList = addLog('Configurações administrativas atualizadas. Postos históricos existentes foram preservados.');
    const auditEvent = createAuditEvent({
      module: 'Configurações', action: 'ALTERACAO', entityType: 'Configurações administrativas', entityId: 'principal',
      summary: 'Parâmetros administrativos atualizados.',
      previousValue: `${adminSettings.rosterPosts.length} postos; ${adminSettings.absenceTypes.length} tipos de afastamento; ${adminSettings.specialties.length} especialidades`,
      newValue: `${normalized.rosterPosts.length} postos; ${normalized.absenceTypes.length} tipos de afastamento; ${normalized.specialties.length} especialidades`
    });
    if (!saveState(militaryList, absences, updatedRoster, logsList, customHolidays, { adminSettings: normalized, auditEvent })) return;
    showToast('Configurações administrativas salvas.');
  };"""
new_settings = """  const handleSaveAdminSettings = (settings: AdminSettings) => {
    const normalized = normalizeAdminSettings(settings);
    const updatedRoster = reconcileRosterPosts(clean(roster), normalized.rosterPosts) as WeekRoster;
    const logsList = addLog('Configurações administrativas atualizadas. Postos históricos preenchidos foram preservados e postos obsoletos vazios foram removidos.');
    const auditEvent = createAuditEvent({
      module: 'Configurações', action: 'ALTERACAO', entityType: 'Configurações administrativas', entityId: 'principal',
      summary: 'Parâmetros administrativos atualizados.',
      previousValue: `${adminSettings.rosterPosts.length} postos; ${adminSettings.absenceTypes.length} tipos de afastamento; ${adminSettings.specialties.length} especialidades`,
      newValue: `${normalized.rosterPosts.length} postos; ${normalized.absenceTypes.length} tipos de afastamento; ${normalized.specialties.length} especialidades`
    });
    if (!saveState(militaryList, absences, updatedRoster, logsList, customHolidays, { adminSettings: normalized, auditEvent })) return;
    if (!normalized.absenceTypes.includes(absenceType)) setAbsenceType(normalized.absenceTypes[0]);
    if (!normalized.ranks.includes(newMilRank)) setNewMilRank(normalized.ranks[0]);
    if (!normalized.specialties.includes(newMilSpecialty)) setNewMilSpecialty(normalized.specialties[0]);
    if (newMilSpecialtySecondary !== 'Nenhuma' && !normalized.specialties.includes(newMilSpecialtySecondary)) setNewMilSpecialtySecondary('Nenhuma');
    if (filterFunction !== 'Todas as Funções' && !normalized.rosterPosts.includes(filterFunction)) setFilterFunction('Todas as Funções');
    if (efetivoFunctionFilter !== 'Todas as Funções' && !normalized.specialties.includes(efetivoFunctionFilter)) setEfetivoFunctionFilter('Todas as Funções');
    showToast('Configurações administrativas salvas.');
  };"""
text = replace_once(text, old_settings, new_settings, 'admin-settings')

# Close an active structured swap automatically if the same cell is edited again.
text = replace_once(
    text,
    "    let nextSwaps = swaps;\n    let auditEvent: AuditEvent | undefined;",
    "    let nextSwaps = swaps;\n    const activeSwapForCell = swaps.find(item =>\n      item.day === day && item.post === post && resolveSwapOperationalStatus(item) === 'ATIVA'\n    );\n    if (activeSwapForCell) {\n      const now = new Date().toISOString();\n      nextSwaps = swaps.map(item => item.id === activeSwapForCell.id ? {\n        ...item,\n        status: 'CANCELADA' as const,\n        cancelledAt: now,\n        note: item.note ? `${item.note} | Encerrada automaticamente por alteração posterior do posto.` : 'Encerrada automaticamente por alteração posterior do posto.'\n      } : item);\n    }\n    let auditEvent: AuditEvent | undefined;",
    'close-active-swap',
)
text = text.replace("          nextSwaps = [swap, ...swaps];", "          nextSwaps = [swap, ...nextSwaps];", 1)

old_clear = """  const handleClearRoster = () => {
    if (!window.confirm('Deseja realmente desmarcar todas as alocações da escala? Todos os postos ficarão vagos para alocação manual.')) {
      return;
    }
    const emptyRoster = Object.fromEntries(
      Object.entries(roster).map(([day, posts]) => [
        day,
        Object.fromEntries(Object.keys(posts).map(post => [post, null]))
      ])
    ) as WeekRoster;
    const resetMilList = militaryList.map(mil => ({ ...mil, dutyCount: 0 }));
    const resetLogs = addLog('Todas as designações da escala foram desmarcadas para operação manual.', changelogs);
    if (!saveState(resetMilList, absences, emptyRoster, resetLogs, customHolidays)) return;
    showToast('Escala limpa com sucesso! Pronta para alocação manual.', 'success');
  };"""
new_clear = """  const handleClearRoster = () => {
    const today = localIsoDate();
    const targetDays = daysToShow.filter(day => ddmmyyyyToIso(day) >= today);
    if (!targetDays.length) {
      showToast('Não há datas atuais ou futuras visíveis para limpar. O histórico passado foi preservado.', 'info');
      return;
    }
    if (!window.confirm(`Desmarcar as designações de ${targetDays.length} data(s) atual(is)/futura(s) atualmente visíveis? Datas passadas e períodos fora do filtro serão preservados.`)) return;
    const clearedRoster = clearRosterDays(roster, targetDays) as WeekRoster;
    const targetSet = new Set(targetDays);
    const now = new Date().toISOString();
    const nextSwaps = swaps.map(item =>
      targetSet.has(item.day) && resolveSwapOperationalStatus(item, today) === 'ATIVA'
        ? { ...item, status: 'CANCELADA' as const, cancelledAt: now, note: item.note ? `${item.note} | Encerrada pela limpeza do período visível.` : 'Encerrada pela limpeza do período visível.' }
        : item
    );
    const resetLogs = addLog(`Designações de ${targetDays.length} data(s) atual(is)/futura(s) visíveis foram desmarcadas; histórico anterior preservado.`, changelogs);
    const auditEvent = createAuditEvent({
      module: 'Escalas', action: 'ALTERACAO', entityType: 'Período da escala',
      summary: `Limpeza manual aplicada a ${targetDays.length} data(s) visível(is), sem alterar datas passadas ou fora do filtro.`,
      previousValue: 'Designações existentes no período selecionado', newValue: 'Postos vagos no período selecionado'
    });
    if (!saveState(militaryList, absences, clearedRoster, resetLogs, customHolidays, { swaps: nextSwaps, auditEvent })) return;
    showToast('Período visível da escala limpo; histórico anterior preservado.', 'success');
  };"""
text = replace_once(text, old_clear, new_clear, 'clear-roster')

text = replace_once(
    text,
    "    const hasRosterHistory = Object.values(roster).some(day =>\n      Object.values(day).some(cell => cell?.militaryId === id)\n    );\n    if (hasAbsenceHistory || hasRosterHistory) {",
    "    const hasRosterHistory = Object.values(roster).some(day =>\n      Object.values(day).some(cell => cell?.militaryId === id)\n    );\n    const hasSwapHistory = swaps.some(item => item.originalMilitaryId === id || item.replacementMilitaryId === id);\n    if (hasAbsenceHistory || hasRosterHistory || hasSwapHistory) {",
    'delete-swap-history',
)
text = text.replace(
    "possui histórico de escala ou afastamento e não pode ser excluído.",
    "possui histórico de escala, afastamento ou permuta e não pode ser excluído.",
    1,
)

old_reset = """  const handleResetDatabase = () => {
    if (window.confirm('Redefinir militares, escalas, afastamentos e feriados para o modelo inicial? A alteração será sincronizada com os demais dispositivos.')) {
      if (!rosterCloud.controller.checkpoint()) return;
      const freshRoster = createEmptyRoster();
      if (!saveState(initialMilitary, initialAbsences, freshRoster, initialLogs, initialHolidays)) return;
      showToast('Redefinição registrada.');
    }
  };"""
new_reset = """  const handleResetDatabase = () => {
    if (window.confirm('Redefinir militares, escalas, afastamentos e feriados para o modelo inicial? A alteração será sincronizada com os demais dispositivos. O histórico profissional será preservado.')) {
      if (!rosterCloud.controller.checkpoint()) return;
      const freshRoster = createEmptyRoster(undefined, adminSettings.rosterPosts);
      const now = new Date().toISOString();
      const resetSwaps = swaps.map(item => resolveSwapOperationalStatus(item) === 'ATIVA'
        ? { ...item, status: 'CANCELADA' as const, cancelledAt: now, note: item.note ? `${item.note} | Encerrada pela redefinição da base operacional.` : 'Encerrada pela redefinição da base operacional.' }
        : item
      );
      const auditEvent = createAuditEvent({
        module: 'Sistema', action: 'ALTERACAO', entityType: 'Base operacional', entityId: 'principal',
        summary: 'Base operacional redefinida para o modelo inicial com cópia de recuperação.',
        note: 'Histórico profissional e configurações administrativas preservados.'
      });
      if (!saveState(initialMilitary, initialAbsences, freshRoster, initialLogs, initialHolidays, { swaps: resetSwaps, auditEvent })) return;
      showToast('Redefinição registrada com histórico profissional preservado.');
    }
  };"""
text = replace_once(text, old_reset, new_reset, 'reset-db')

old_holiday_posts = """    if (!updatedRoster[dayKey]) {
      updatedRoster[dayKey] = {
        'Cozinheiro de Dia': null,
        'Copeiro de Dia': null,
        'Ceia de Dia': null,
        'Auxiliar do Copeiro de Dia': null
      };
    }"""
new_holiday_posts = """    if (!updatedRoster[dayKey]) {
      updatedRoster[dayKey] = Object.fromEntries(adminSettings.rosterPosts.map(post => [post, null]));
    } else {
      adminSettings.rosterPosts.forEach(post => {
        if (!(post in updatedRoster[dayKey])) updatedRoster[dayKey][post] = null;
      });
    }"""
text = replace_once(text, old_holiday_posts, new_holiday_posts, 'holiday-configured-posts')

old_remove_holiday = """      const updatedRoster = clean(roster);
      if (!isWeekend) {
        delete updatedRoster[dayKey];
      }
      const updatedLogs = addLog(`Feriado ${dayKey} (${target.name}) removido da escala.`);
      if (!saveState(militaryList, absences, updatedRoster, updatedLogs, updatedHolidays)) return;
      showToast(`Feriado ${dayKey} removido da escala.`);"""
new_remove_holiday = """      const removal = removeHolidayRosterDay(clean(roster), dayKey, isWeekend);
      const updatedRoster = removal.roster as WeekRoster;
      const retainedText = !isWeekend && removal.preserved ? ' A coluna da escala foi mantida porque possui histórico operacional.' : '';
      const updatedLogs = addLog(`Feriado ${dayKey} (${target.name}) removido.${retainedText}`);
      if (!saveState(militaryList, absences, updatedRoster, updatedLogs, updatedHolidays)) return;
      showToast(`Feriado ${dayKey} removido.${retainedText}`, removal.preserved && !isWeekend ? 'info' : 'success');"""
text = replace_once(text, old_remove_holiday, new_remove_holiday, 'remove-holiday-history')

# Avoid duplicated rank in legacy DISP cells.
text = replace_once(
    text,
    "                militaryName: `${mil.rank} ${mil.name.toUpperCase()}`,",
    "                militaryName: mil.name.toUpperCase(),",
    'absence-disp-name',
)

old_toggle = """  const handleToggleSpecialty = (milId: string, spec: string) => {
    const updatedMilList = clean(militaryList);
    const idx = updatedMilList.findIndex(m => m.id === milId);
    if (idx !== -1) {
      updatedMilList[idx].specialty = spec;
      if (!saveState(updatedMilList, absences, roster, changelogs)) return;
      showToast(`Especialidade atualizada para ${updatedMilList[idx].rank}. ${updatedMilList[idx].name}`);
    }
  };"""
new_toggle = """  const handleToggleSpecialty = (milId: string, spec: string) => {
    const updatedMilList = clean(militaryList);
    const idx = updatedMilList.findIndex(m => m.id === milId);
    if (idx !== -1) {
      const previous = updatedMilList[idx].specialty;
      if (previous === spec) return;
      updatedMilList[idx].specialty = spec;
      const logsList = addLog(`Especialidade de ${updatedMilList[idx].rank}. ${updatedMilList[idx].name} alterada de ${previous} para ${spec}.`);
      const auditEvent = createAuditEvent({
        module: 'Efetivo', action: 'ALTERACAO', entityType: 'Especialidade', entityId: milId,
        summary: `Especialidade de ${updatedMilList[idx].rank} ${updatedMilList[idx].name} atualizada.`,
        previousValue: previous, newValue: spec
      });
      if (!saveState(updatedMilList, absences, roster, logsList, customHolidays, { auditEvent })) return;
      showToast(`Especialidade atualizada para ${updatedMilList[idx].rank}. ${updatedMilList[idx].name}`);
    }
  };"""
text = replace_once(text, old_toggle, new_toggle, 'specialty-audit')

text = replace_once(
    text,
    "  const pendingSwaps = swaps.filter(item => item.status === 'CONFIRMADA').length;",
    "  const pendingSwaps = swaps.filter(item => resolveSwapOperationalStatus(item) === 'ATIVA').length;",
    'active-swaps-count',
)

# Add rank display options preserving historical values.
text = replace_once(
    text,
    "  const specialtiesForDisplay = Array.from(new Set([\n    ...adminSettings.specialties,\n    ...militaryList.flatMap(item => [item.specialty, item.specialtySecondary || '']).filter(Boolean)\n  ]));",
    "  const specialtiesForDisplay = Array.from(new Set([\n    ...adminSettings.specialties,\n    ...militaryList.flatMap(item => [item.specialty, item.specialtySecondary || '']).filter(Boolean)\n  ]));\n  const ranksForDisplay = Array.from(new Set([...adminSettings.ranks, ...militaryList.map(item => item.rank)]));",
    'ranks-display',
)

# Replace date filtering with a today-anchored helper.
pattern_days = re.compile(r"  // Filter roster for display on Dashboard \(Weekends & Custom Holidays\)\n  const daysToShow = Object\.keys\(roster\).*?\n    \}\);", re.S)
replacement_days = """  // Filter roster for display on Dashboard (Weekends & Custom Holidays).
  // The 4/8-weekend views are anchored to today, not to the oldest persisted date.
  const daysToShow = selectRosterDays({
    days: Object.keys(roster),
    holidays: customHolidays,
    filter: filterScaleType,
    view: viewOption,
    startIso: startDateFilter,
    endIso: endDateFilter,
    todayIso: localIsoDate(),
  });"""
text, count = pattern_days.subn(replacement_days, text, count=1)
if count != 1:
    raise SystemExit('[days-to-show] bloco não encontrado')

# Help button becomes functional.
text = replace_once(
    text,
    "          <button className=\"flex items-center gap-3 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors w-full rounded-lg hover:bg-slate-900/40\">\n            <HelpCircle",
    "          <button onClick={() => setIsHelpOpen(true)} className=\"flex items-center gap-3 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors w-full rounded-lg hover:bg-slate-900/40\">\n            <HelpCircle",
    'help-button',
)

# Clear roster tooltip reflects the non-destructive behavior.
text = text.replace(
    'title="Limpar todas as designações da escala para recomeçar alocação manual"',
    'title="Limpar somente as designações atuais/futuras do período visível; histórico passado é preservado"',
    1,
)

# Use configured/historical options in the edit modal.
text = replace_once(
    text,
    "                    <option value=\"Ten\">Tenente (Ten)</option>\n                    <option value=\"Sgt\">Sargento (Sgt)</option>\n                    <option value=\"Cb\">Cabo (Cb)</option>\n                    <option value=\"Sd\">Soldado (Sd)</option>",
    "                    {ranksForDisplay.map(item => <option key={item} value={item}>{item}</option>)}",
    'edit-ranks',
)
# Replace both edit specialty hard-coded blocks.
hard_specialties = """                    <option value="Cozinheiro de Dia">Cozinheiro de Dia</option>
                    <option value="Copeiro de Dia">Copeiro de Dia</option>
                    <option value="Auxiliar do Copeiro de Dia">Auxiliar do Copeiro de Dia</option>
                    <option value="Ceia de Dia">Ceia de Dia</option>"""
text = replace_once(text, hard_specialties, "                    {specialtiesForDisplay.map(item => <option key={item} value={item}>{item}</option>)}", 'edit-primary-specialty')
text = replace_once(text, hard_specialties, "                    {specialtiesForDisplay.map(item => <option key={item} value={item}>{item}</option>)}", 'edit-secondary-specialty')

# Remove duplicate rank when rendering cells and current assignment banner.
text = replace_once(
    text,
    "                                      <span className=\"truncate\">{cell.rank}. {cell.militaryName}</span>",
    "                                      <span className=\"truncate\">{rosterCellDisplayName(cell)}</span>",
    'grid-cell-name',
)
text = replace_once(
    text,
    "                      {roster[selectedCell.day][selectedCell.post]?.rank}. {roster[selectedCell.day][selectedCell.post]?.militaryName}",
    "                      {roster[selectedCell.day][selectedCell.post] ? rosterCellDisplayName(roster[selectedCell.day][selectedCell.post]!) : ''}",
    'modal-cell-name',
)

# Dynamic configured functions summary instead of hard-coded text that may become stale.
old_functions = """                        <div className="pt-3 border-t border-white/15">
                          <p className="text-[10px] font-bold text-emerald-200 uppercase mb-2">Funções Disponíveis</p>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-emerald-100">Cozinha / Ceia</span>
                            <span className="font-semibold text-white">Cozinheiro & Ceia de Dia</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-emerald-100">Copa / Apoio</span>
                            <span className="font-semibold text-white">Copeiro & Auxiliar</span>
                          </div>
                        </div>"""
new_functions = """                        <div className="pt-3 border-t border-white/15">
                          <p className="text-[10px] font-bold text-emerald-200 uppercase mb-2">Postos Configurados</p>
                          <p className="text-xs font-semibold text-white leading-relaxed">{adminSettings.rosterPosts.join(' • ')}</p>
                        </div>"""
text = replace_once(text, old_functions, new_functions, 'configured-functions-summary')

# Insert help modal before assignment modal.
anchor = """      </main>
      {isAssigning && selectedCell && ("""
help_modal = """      </main>

      {isHelpOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setIsHelpOpen(false)}>
          <div className="bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900">Ajuda & Informações</h4>
                <p className="text-xs text-slate-500 mt-0.5">Guia rápido da operação do Gestão de Aprov.</p>
              </div>
              <button onClick={() => setIsHelpOpen(false)} className="p-2 rounded-lg hover:bg-slate-200 text-slate-500" aria-label="Fechar ajuda"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 grid md:grid-cols-2 gap-4 text-xs leading-relaxed">
              <div className="rounded-xl border border-slate-200 p-4"><strong className="text-slate-900">Central Operacional</strong><p className="text-slate-600 mt-1">Concentra alertas, calendário, afastamentos, postos vagos, cardápio e retiradas de carnes.</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><strong className="text-slate-900">Escalas</strong><p className="text-slate-600 mt-1">A designação é manual. Afastamentos cadastrados são o único bloqueio automático de seleção por data.</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><strong className="text-slate-900">Cardápio e Saque</strong><p className="text-slate-600 mt-1">Use a prontidão antes de avançar o fluxo. Cardápios arquivados ficam somente para consulta até restauração.</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><strong className="text-slate-900">Fluxos Profissionais</strong><p className="text-slate-600 mt-1">Consulte histórico, permutas, versões, arquivamento e configurações administrativas.</p></div>
              <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><strong>Sincronização:</strong> quando houver alteração pendente, aguarde a confirmação do servidor antes de tratar relatórios ou PDFs como documentos oficiais.</div>
            </div>
          </div>
        </div>
      )}

      {isAssigning && selectedCell && ("""
text = replace_once(text, anchor, help_modal, 'help-modal')

p.write_text(text)


# -----------------------------------------------------------------------------
# components/CardapioSemanal.tsx
# -----------------------------------------------------------------------------
p = Path('components/CardapioSemanal.tsx')
text = p.read_text()

# Force archived documents into read-only A4 view.
anchor_current = """  const currentCardapio: WeeklyCardapioDoc = 
    cardapiosList.find(c => c.id === selectedCardapioId) || cardapiosList[0] || initialWeeklyCardapio;

  const showToast"""
replacement_current = """  const currentCardapio: WeeklyCardapioDoc = 
    cardapiosList.find(c => c.id === selectedCardapioId) || cardapiosList[0] || initialWeeklyCardapio;
  const isArchivedCardapio = Boolean(currentCardapio.archivedAt);
  useEffect(() => {
    if (isArchivedCardapio && activeSubView === 'EDITOR') setActiveSubView('A4');
  }, [isArchivedCardapio, activeSubView]);

  const showToast"""
text = replace_once(text, anchor_current, replacement_current, 'archived-readonly-state')

# Do not propagate archive metadata when cloning an archived historical week.
text = replace_once(
    text,
    "      version: 1,\n      versions: [],\n      workflow: {",
    "      version: 1,\n      versions: [],\n      archivedAt: undefined,\n      archiveReason: undefined,\n      lastChangeReason: undefined,\n      workflow: {",
    'duplicate-clear-archive',
)

# Archived badge beside status.
status_anchor = """              {(() => {
                const readiness = getCardapioReadiness(currentCardapio);"""
status_insert = """              {isArchivedCardapio && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-100 text-slate-700 border-slate-300">Arquivado · somente leitura</span>
              )}
              {(() => {
                const readiness = getCardapioReadiness(currentCardapio);"""
text = replace_once(text, status_anchor, status_insert, 'archived-badge')

# Workflow button: archived docs get a disabled state instead of actionable controls that will fail later.
old_workflow_start = """            {currentCardapio.workflow.status !== 'FINALIZADO' ? (
              <button
                onClick={handleAdvanceWorkflow}"""
new_workflow_start = """            {isArchivedCardapio ? (
              <button disabled className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 text-slate-500 rounded-lg font-bold text-xs border border-slate-200 cursor-not-allowed" title="Restaure o cardápio em Fluxos Profissionais para voltar a editá-lo">
                <Archive className="w-4 h-4" /><span>Arquivado · somente leitura</span>
              </button>
            ) : currentCardapio.workflow.status !== 'FINALIZADO' ? (
              <button
                onClick={handleAdvanceWorkflow}"""
text = replace_once(text, old_workflow_start, new_workflow_start, 'archived-workflow-button')

# Institutional edit button disabled on archived documents.
text = replace_once(
    text,
    "              onClick={() => setIsInstitutionalModalOpen(true)}\n              className=\"flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium text-xs transition-all\"",
    "              onClick={() => setIsInstitutionalModalOpen(true)}\n              disabled={isArchivedCardapio}\n              className=\"flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed\"",
    'archived-institutional-button',
)

# Week selector identifies archived records clearly.
text = replace_once(
    text,
    "                  {formatCardapioTitle(c.dataInicio, c.dataFim)} ({c.workflow.status.replace('_', ' ')})",
    "                  {c.archivedAt ? '[ARQUIVADO] ' : ''}{formatCardapioTitle(c.dataInicio, c.dataFim)} ({c.workflow.status.replace('_', ' ')})",
    'archived-selector-label',
)

# Structured editor cannot be entered while archived.
text = replace_once(
    text,
    "                onClick={() => setActiveSubView('EDITOR')}\n                className={cn(",
    "                onClick={() => setActiveSubView('EDITOR')}\n                disabled={isArchivedCardapio}\n                className={cn(",
    'archived-editor-disabled',
)
text = text.replace(
    "                  activeSubView === 'EDITOR' ? \"bg-white text-slate-900 shadow-xs\" : \"text-slate-600 hover:text-slate-900\"",
    "                  activeSubView === 'EDITOR' ? \"bg-white text-slate-900 shadow-xs\" : \"text-slate-600 hover:text-slate-900\",\n                  isArchivedCardapio && \"opacity-50 cursor-not-allowed\"",
    1,
)

p.write_text(text)


# -----------------------------------------------------------------------------
# components/ProfessionalFlows.tsx
# -----------------------------------------------------------------------------
p = Path('components/ProfessionalFlows.tsx')
text = p.read_text()
text = replace_once(
    text,
    "  normalizeAdminSettings,\n  splitLines,",
    "  normalizeAdminSettings,\n  resolveSwapOperationalStatus,\n  splitLines,",
    'professional-import-status',
)
text = replace_once(
    text,
    "  const activeSwaps = swaps.filter(item => item.status === 'CONFIRMADA').length;",
    "  const activeSwaps = swaps.filter(item => resolveSwapOperationalStatus(item) === 'ATIVA').length;",
    'professional-active-count',
)
old_map = """{swaps.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-slate-500">Nenhuma permuta estruturada registrada.</td></tr> : swaps.map(item => <tr key={item.id}><td className="p-3"><div className="font-bold text-slate-800">{item.day}</div><div className="text-slate-500">{item.post}</div></td><td className="p-3">{item.originalRank} {item.originalMilitaryName}</td><td className="p-3 font-semibold">{item.replacementRank} {item.replacementMilitaryName}</td><td className="p-3 text-slate-500">{formatDateTime(item.createdAt)}</td><td className="p-3"><span className={cn('px-2 py-1 rounded-full font-bold text-[10px]', item.status === 'CONFIRMADA' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600')}>{item.status}</span>{item.note && <div className="text-[10px] text-slate-500 mt-1 max-w-56">{item.note}</div>}</td><td className="p-3 text-right">{item.status === 'CONFIRMADA' && <button onClick={() => { const note = window.prompt('Motivo/observação do cancelamento da permuta:') || ''; if (window.confirm('Cancelar esta permuta? O sistema tentará restaurar o militar original se o posto ainda estiver com o substituto.')) onCancelSwap(item.id, note); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-rose-200 text-rose-700 rounded-lg hover:bg-rose-50"><XCircle className="w-3.5 h-3.5" />Cancelar</button>}</td></tr>)}</tbody>"""
new_map = """{swaps.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-slate-500">Nenhuma permuta estruturada registrada.</td></tr> : swaps.map(item => {
                const operationalStatus = resolveSwapOperationalStatus(item);
                return <tr key={item.id}><td className="p-3"><div className="font-bold text-slate-800">{item.day}</div><div className="text-slate-500">{item.post}</div></td><td className="p-3">{item.originalRank} {item.originalMilitaryName}</td><td className="p-3 font-semibold">{item.replacementRank} {item.replacementMilitaryName}</td><td className="p-3 text-slate-500">{formatDateTime(item.createdAt)}</td><td className="p-3"><span className={cn('px-2 py-1 rounded-full font-bold text-[10px]', operationalStatus === 'ATIVA' ? 'bg-emerald-100 text-emerald-800' : operationalStatus === 'CONCLUIDA' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600')}>{operationalStatus === 'ATIVA' ? 'ATIVA' : operationalStatus === 'CONCLUIDA' ? 'CONCLUÍDA' : 'CANCELADA'}</span>{item.note && <div className="text-[10px] text-slate-500 mt-1 max-w-56">{item.note}</div>}</td><td className="p-3 text-right">{operationalStatus === 'ATIVA' && <button onClick={() => { const note = window.prompt('Motivo/observação do cancelamento da permuta:') || ''; if (window.confirm('Cancelar esta permuta? O sistema tentará restaurar o militar original se o posto ainda estiver com o substituto.')) onCancelSwap(item.id, note); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-rose-200 text-rose-700 rounded-lg hover:bg-rose-50"><XCircle className="w-3.5 h-3.5" />Cancelar</button>}</td></tr>;
              })}</tbody>"""
text = replace_once(text, old_map, new_map, 'professional-swap-map')
p.write_text(text)


# -----------------------------------------------------------------------------
# components/DocumentExports.tsx
# -----------------------------------------------------------------------------
p = Path('components/DocumentExports.tsx')
text = p.read_text()
text = replace_once(
    text,
    "import { normalizeMilitaryStatuses, resolveAbsenceStatus, rosterCompliance } from '@/lib/domain/roster-integrity';",
    "import { normalizeMilitaryStatuses, resolveAbsenceStatus, rosterCompliance } from '@/lib/domain/roster-integrity';\nimport { rosterCellDisplayName } from '@/lib/domain/roster-operations';",
    'document-export-import',
)
text = replace_once(
    text,
    "      const military = cell ? `${cell.rank}. ${cell.militaryName}` : 'VAGO';",
    "      const military = cell ? rosterCellDisplayName(cell) : 'VAGO';",
    'document-export-cell-name',
)
p.write_text(text)


# -----------------------------------------------------------------------------
# tests/professional-flows.test.ts
# -----------------------------------------------------------------------------
p = Path('tests/professional-flows.test.ts')
text = p.read_text()
text = replace_once(
    text,
    "  normalizeAdminSettings,\n  trimAuditTrail,",
    "  normalizeAdminSettings,\n  resolveSwapOperationalStatus,\n  trimAuditTrail,",
    'test-import-swap-status',
)
text += """

test('permuta passada não permanece ativa na visão operacional', () => {
  assert.equal(resolveSwapOperationalStatus({ day: '15/09/2026', status: 'CONFIRMADA' }, '2026-09-16'), 'CONCLUIDA');
  assert.equal(resolveSwapOperationalStatus({ day: '16/09/2026', status: 'CONFIRMADA' }, '2026-09-16'), 'ATIVA');
  assert.equal(resolveSwapOperationalStatus({ day: '20/09/2026', status: 'CANCELADA' }, '2026-09-16'), 'CANCELADA');
});
"""
p.write_text(text)


# -----------------------------------------------------------------------------
# .github/workflows/validate.yml
# -----------------------------------------------------------------------------
p = Path('.github/workflows/validate.yml')
text = p.read_text()
anchor_test = """      - name: Professional flows tests
        run: bun test tests/professional-flows.test.ts && node tests/professional-flows-smoke.mjs
"""
replacement_test = anchor_test + """      - name: Block 4A functional audit tests
        run: bun test tests/block4a-functional-audit.test.ts
"""
text = replace_once(text, anchor_test, replacement_test, 'workflow-block4a-test')
p.write_text(text)

print('Bloco 4A aplicado com sucesso.')
