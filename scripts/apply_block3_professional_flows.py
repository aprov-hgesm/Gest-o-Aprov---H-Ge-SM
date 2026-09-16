from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: esperado 1 ocorrência, encontrado {count}')
    return text.replace(old, new, 1)


def sub_once(text: str, pattern: str, repl: str, label: str, flags=0) -> str:
    result, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f'{label}: esperado 1 match, encontrado {count}')
    return result

# -----------------------------------------------------------------------------
# app/page.tsx
# -----------------------------------------------------------------------------
p = Path('app/page.tsx')
text = p.read_text()

text = replace_once(
    text,
    "import OperationalDashboard, { OperationalAlertsPanel, buildOperationalSnapshot, type OperationalTab } from '@/components/OperationalDashboard';\n",
    "import OperationalDashboard, { OperationalAlertsPanel, buildOperationalSnapshot, type OperationalTab } from '@/components/OperationalDashboard';\nimport ProfessionalFlows from '@/components/ProfessionalFlows';\n",
    'import ProfessionalFlows'
)
text = replace_once(
    text,
    "} from '@/lib/domain/roster-integrity';\n",
    "} from '@/lib/domain/roster-integrity';\nimport {\n  createAuditEvent, defaultAdminSettings, inferAuditFromLog, normalizeAdminSettings, trimAuditTrail,\n  type AdminSettings, type AuditEvent, type SwapRecord\n} from '@/lib/domain/professional-flows';\n",
    'import professional domain'
)

old_roster_doc = """interface RosterDocument {
  id: string;
  militaryList: Military[];
  absences: Absence[];
  roster: WeekRoster;
  changelogs: LogEntry[];
  customHolidays: HolidayDate[];
}
const initialRosterDocuments: RosterDocument[] = [{
  id: 'principal', militaryList: initialMilitary, absences: initialAbsences,
  roster: initialRoster, changelogs: initialLogs, customHolidays: initialHolidays
}];"""
new_roster_doc = """interface RosterDocument {
  id: string;
  militaryList: Military[];
  absences: Absence[];
  roster: WeekRoster;
  changelogs: LogEntry[];
  customHolidays: HolidayDate[];
  auditTrail?: AuditEvent[];
  swaps?: SwapRecord[];
  adminSettings?: AdminSettings;
}
const initialRosterDocuments: RosterDocument[] = [{
  id: 'principal', militaryList: initialMilitary, absences: initialAbsences,
  roster: initialRoster, changelogs: initialLogs, customHolidays: initialHolidays,
  auditTrail: [], swaps: [], adminSettings: defaultAdminSettings
}];"""
text = replace_once(text, old_roster_doc, new_roster_doc, 'RosterDocument')
text = replace_once(
    text,
    "    customHolidays: raw[4] === null ? initialHolidays : JSON.parse(raw[4])\n  }];",
    "    customHolidays: raw[4] === null ? initialHolidays : JSON.parse(raw[4]),\n    auditTrail: [], swaps: [], adminSettings: defaultAdminSettings\n  }];",
    'legacy professional fields'
)
text = replace_once(
    text,
    "  const { absences, roster, changelogs, customHolidays } = rosterDocument;\n  const militaryList = normalizeMilitaryStatuses(rosterDocument.militaryList, absences);",
    "  const { absences, roster, changelogs, customHolidays } = rosterDocument;\n  const auditTrail = rosterDocument.auditTrail || [];\n  const swaps = rosterDocument.swaps || [];\n  const adminSettings = normalizeAdminSettings(rosterDocument.adminSettings);\n  const militaryList = normalizeMilitaryStatuses(rosterDocument.militaryList, absences);",
    'destructure professional fields'
)

save_state_pattern = r"  // One versioned document keeps personnel, absences and assignments consistent\.\n  const saveState = \(.*?\n  \};\n\n  const showToast"
save_state_repl = """  // One versioned document keeps personnel, absences, assignments and professional history consistent.
  const saveState = (
    newMil: Military[],
    newAbs: Absence[],
    newRos: WeekRoster,
    newLogs: LogEntry[],
    newHolidays: HolidayDate[] = customHolidays,
    options?: { auditEvent?: AuditEvent; swaps?: SwapRecord[]; adminSettings?: AdminSettings }
  ) => {
    const normalizedAbsences = newAbs.map(absence => ({
      ...absence,
      status: resolveAbsenceStatus(absence)
    }));
    const normalizedMilitary = recalculateDutyCounts(
      normalizeMilitaryStatuses(newMil, normalizedAbsences),
      newRos
    );
    const nextSettings = normalizeAdminSettings(options?.adminSettings || adminSettings);
    const newestLog = newLogs[0];
    const previousNewestLog = changelogs[0];
    const hasNewLog = !!newestLog && (!previousNewestLog || newestLog.time !== previousNewestLog.time || newestLog.text !== previousNewestLog.text);
    const derivedAudit = options?.auditEvent || (hasNewLog ? inferAuditFromLog(newestLog.text) : undefined);
    const nextAuditTrail = derivedAudit
      ? trimAuditTrail([derivedAudit, ...auditTrail.filter(item => item.id !== derivedAudit.id)], nextSettings)
      : trimAuditTrail(auditTrail, nextSettings);
    return rosterCloud.controller.update([{
      id: 'principal', militaryList: normalizedMilitary, absences: normalizedAbsences,
      roster: newRos, changelogs: newLogs, customHolidays: newHolidays,
      auditTrail: nextAuditTrail,
      swaps: options?.swaps || swaps,
      adminSettings: nextSettings
    }]);
  };

  const showToast"""
text = sub_once(text, save_state_pattern, save_state_repl, 'saveState', re.S)

insert_marker = """  const addLog = (text: string, currentLogsList?: LogEntry[]) => {
    const newEntry: LogEntry = { time: formatTimeNow(), text };
    const updated = [newEntry, ...(currentLogsList || changelogs)];
    return updated;
  };

  // ==========================================
  // LOGIC & ALGORITHMS
"""
insert_value = """  const addLog = (text: string, currentLogsList?: LogEntry[]) => {
    const newEntry: LogEntry = { time: formatTimeNow(), text };
    const updated = [newEntry, ...(currentLogsList || changelogs)];
    return updated;
  };

  const recordCardapioAudit = (event: Omit<AuditEvent, 'id' | 'createdAt'>) => {
    const auditEvent = createAuditEvent(event);
    saveState(militaryList, absences, roster, changelogs, customHolidays, { auditEvent });
  };

  const handleCancelSwap = (id: string, note = '') => {
    const swap = swaps.find(item => item.id === id);
    if (!swap || swap.status !== 'CONFIRMADA') return;
    const updatedRoster = clean(roster);
    const cell = updatedRoster[swap.day]?.[swap.post];
    let restored = false;
    if (cell?.militaryId === swap.replacementMilitaryId && cell.type === 'PERM') {
      updatedRoster[swap.day][swap.post] = {
        militaryId: swap.originalMilitaryId,
        militaryName: swap.originalMilitaryName,
        rank: swap.originalRank,
        type: 'EV'
      };
      restored = true;
    }
    const nextSwaps = swaps.map(item => item.id === id ? {
      ...item, status: 'CANCELADA' as const, cancelledAt: new Date().toISOString(), note
    } : item);
    const logsList = addLog(`Permuta cancelada em ${swap.day} / ${swap.post}${restored ? '; militar original restaurado' : '; posto já havia sido alterado e foi preservado'}.`);
    const auditEvent = createAuditEvent({
      module: 'Permutas', action: 'CANCELAMENTO', entityType: 'Permuta', entityId: swap.id,
      summary: `Permuta cancelada: ${swap.originalRank} ${swap.originalMilitaryName} ↔ ${swap.replacementRank} ${swap.replacementMilitaryName}.`,
      previousValue: `${swap.replacementRank} ${swap.replacementMilitaryName} em ${swap.post}`,
      newValue: restored ? `${swap.originalRank} ${swap.originalMilitaryName} restaurado em ${swap.post}` : 'Posto preservado por alteração posterior',
      note
    });
    if (!saveState(militaryList, absences, updatedRoster, logsList, customHolidays, { swaps: nextSwaps, auditEvent })) return;
    showToast('Permuta cancelada e histórico preservado.');
  };

  const handleSaveAdminSettings = (settings: AdminSettings) => {
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
  };

  const handleArchiveCardapio = (id: string, reason: string) => {
    const current = cardapioCloud.state.records.find(item => item.id === id);
    if (!current || current.archivedAt) return;
    const updated = cardapioCloud.state.records.map(item => item.id === id ? {
      ...item, archivedAt: new Date().toISOString(), archiveReason: reason
    } : item);
    if (!cardapioCloud.controller.update(updated)) return;
    recordCardapioAudit({
      module: 'Arquivamento', action: 'ARQUIVAMENTO', entityType: 'Cardápio', entityId: id,
      summary: `Cardápio ${current.dataInicio} a ${current.dataFim} arquivado.`, note: reason
    });
    showToast('Cardápio arquivado sem exclusão de dados.');
  };

  const handleRestoreCardapio = (id: string) => {
    const current = cardapioCloud.state.records.find(item => item.id === id);
    if (!current?.archivedAt) return;
    const updated = cardapioCloud.state.records.map(item => item.id === id ? {
      ...item, archivedAt: undefined, archiveReason: undefined
    } : item);
    if (!cardapioCloud.controller.update(updated)) return;
    recordCardapioAudit({
      module: 'Arquivamento', action: 'RESTAURACAO', entityType: 'Cardápio', entityId: id,
      summary: `Cardápio ${current.dataInicio} a ${current.dataFim} restaurado do arquivo.`
    });
    showToast('Cardápio restaurado do arquivo.');
  };

  const handleRestoreCardapioVersion = (cardapioId: string, versionId: string, reason: string) => {
    const current = cardapioCloud.state.records.find(item => item.id === cardapioId);
    const version = current?.versions?.find(item => item.id === versionId);
    if (!current || !version) return;
    try {
      const restored = JSON.parse(version.snapshot) as WeeklyCardapioDoc;
      const currentVersion = current.version || 1;
      const beforeSnapshot = {
        id: `version-${current.id}-${currentVersion}-${Date.now()}`,
        version: currentVersion,
        createdAt: new Date().toISOString(),
        reason: 'Estado preservado antes da restauração',
        workflowStatus: current.workflow.status,
        snapshot: JSON.stringify({ ...current, versions: undefined })
      };
      const versions = [beforeSnapshot, ...(current.versions || [])]
        .filter((item, index, list) => list.findIndex(other => other.id === item.id) === index);
      const next: WeeklyCardapioDoc = {
        ...restored,
        id: current.id,
        version: currentVersion + 1,
        versions,
        archivedAt: undefined,
        archiveReason: undefined,
        lastChangeReason: reason,
        workflow: {
          ...restored.workflow,
          status: 'EM_ELABORACAO',
          conferido: { ...restored.workflow.conferido, status: 'PENDENTE', data: undefined },
          aprovado: { ...restored.workflow.aprovado, status: 'PENDENTE', data: undefined }
        }
      };
      const updated = cardapioCloud.state.records.map(item => item.id === cardapioId ? next : item);
      if (!cardapioCloud.controller.update(updated)) return;
      recordCardapioAudit({
        module: 'Cardápio', action: 'RESTAURACAO', entityType: 'Versão de cardápio', entityId: cardapioId,
        summary: `Versão ${version.version} restaurada como nova versão ${currentVersion + 1} de trabalho.`,
        previousValue: `Versão ${currentVersion}`, newValue: `Versão ${currentVersion + 1} baseada na v${version.version}`, note: reason
      });
      showToast(`Versão ${version.version} restaurada como nova versão de trabalho.`);
    } catch {
      showToast('A versão selecionada está corrompida e não pôde ser restaurada.', 'info');
    }
  };

  // ==========================================
  // LOGIC & ALGORITHMS
"""
text = replace_once(text, insert_marker, insert_value, 'professional callbacks')

assign_pattern = r"  // Assign specific military manually\n  const handleAssignMilitary = \(milId: string \| 'empty'\) => \{.*?\n  \};\n\n  const handleClearRoster"
assign_repl = """  // Assign specific military manually. A permuta exige ocupante original e gera registro estruturado.
  const handleAssignMilitary = (milId: string | 'empty') => {
    if (!selectedCell) return;
    const { day, post } = selectedCell;

    const updatedRoster = clean(roster);
    const updatedMilList = clean(militaryList);
    let logsList = [...changelogs];

    if (milId !== 'empty' && isMilitaryAbsentOnDay(milId, day, absences)) {
      showToast('Militar afastado nesta data. Finalize ou ajuste o afastamento na aba Afastamentos antes de escalá-lo.', 'info');
      return;
    }

    const prevCell = updatedRoster[day] ? updatedRoster[day][post] : null;
    if (selectedAssignType === 'PERM' && milId !== 'empty' && (!prevCell?.militaryId || prevCell.militaryId === milId)) {
      showToast('Para registrar uma permuta, o posto precisa estar ocupado por outro militar. Abra o posto já preenchido e selecione o substituto.', 'info');
      return;
    }

    let nextSwaps = swaps;
    let auditEvent: AuditEvent | undefined;

    if (prevCell && prevCell.militaryId) {
      const idx = updatedMilList.findIndex(m => m.id === prevCell.militaryId);
      if (idx !== -1) updatedMilList[idx].dutyCount = Math.max(0, updatedMilList[idx].dutyCount - 1);
    }

    if (milId === 'empty') {
      if (updatedRoster[day]) updatedRoster[day][post] = null;
      logsList = addLog(`Posto ${post} em ${day} foi desmarcado manualmente (posto vago).`, logsList);
      auditEvent = createAuditEvent({
        module: 'Escalas', action: 'ALTERACAO', entityType: 'Posto de escala', entityId: `${day}:${post}`,
        summary: `Posto ${post} em ${day} desmarcado manualmente.`,
        previousValue: prevCell ? `${prevCell.rank} ${prevCell.militaryName}` : 'Vago', newValue: 'Vago'
      });
    } else {
      const mil = updatedMilList.find(m => m.id === milId);
      if (mil) {
        const finalType = selectedAssignType === 'PERM' || selectedAssignType === 'DISP' ? selectedAssignType : 'EV';
        if (!updatedRoster[day]) updatedRoster[day] = {};
        updatedRoster[day][post] = { militaryId: mil.id, militaryName: mil.name.toUpperCase(), rank: mil.rank, type: finalType };
        if (finalType !== 'DISP') {
          const idx = updatedMilList.findIndex(m => m.id === milId);
          if (idx !== -1) updatedMilList[idx].dutyCount += 1;
        }

        if (finalType === 'PERM' && prevCell) {
          const swap: SwapRecord = {
            id: `swap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            day, post,
            originalMilitaryId: prevCell.militaryId,
            originalMilitaryName: prevCell.militaryName,
            originalRank: prevCell.rank,
            replacementMilitaryId: mil.id,
            replacementMilitaryName: mil.name.toUpperCase(),
            replacementRank: mil.rank,
            status: 'CONFIRMADA',
            createdAt: new Date().toISOString()
          };
          nextSwaps = [swap, ...swaps];
          logsList = addLog(`Permuta registrada em ${day} / ${post}: ${prevCell.rank}. ${prevCell.militaryName} por ${mil.rank}. ${mil.name}.`, logsList);
          auditEvent = createAuditEvent({
            module: 'Permutas', action: 'PERMUTA', entityType: 'Permuta', entityId: swap.id,
            summary: `Permuta registrada para ${post} em ${day}.`,
            previousValue: `${prevCell.rank} ${prevCell.militaryName}`,
            newValue: `${mil.rank} ${mil.name.toUpperCase()}`
          });
        } else {
          const typeLabel = finalType === 'EV' ? 'Escala Vermelha' : finalType === 'DISP' ? 'Dispensa (LTS)' : finalType;
          logsList = addLog(`${mil.rank}. ${mil.name} escalado manualmente (${typeLabel}) para ${post} em ${day}.`, logsList);
          auditEvent = createAuditEvent({
            module: 'Escalas', action: 'ALTERACAO', entityType: 'Posto de escala', entityId: `${day}:${post}`,
            summary: `${mil.rank} ${mil.name} designado para ${post} em ${day}.`,
            previousValue: prevCell ? `${prevCell.rank} ${prevCell.militaryName}` : 'Vago',
            newValue: `${mil.rank} ${mil.name.toUpperCase()}`
          });
        }
      }
    }
    if (!saveState(updatedMilList, absences, updatedRoster, logsList, customHolidays, { swaps: nextSwaps, auditEvent })) return;
    setIsAssigning(false);
    setSelectedCell(null);
    setModalSearch('');
    showToast(selectedAssignType === 'PERM' ? 'Permuta registrada e escala atualizada.' : 'Escala atualizada com sucesso!');
  };

  const handleClearRoster"""
text = sub_once(text, assign_pattern, assign_repl, 'handleAssignMilitary', re.S)

text = replace_once(
    text,
    "  const pendingSwaps = Object.values(roster)\n    .flatMap(dayObj => Object.values(dayObj))\n    .filter(cell => cell && cell.type === 'PERM').length;",
    "  const pendingSwaps = swaps.filter(item => item.status === 'CONFIRMADA').length;",
    'pending swaps metric'
)

text = replace_once(
    text,
    "  const operationalMeatItems = cardapioCloud.state.records.flatMap(item => gerarListaSaqueCarnes(item.dias));\n  const operationalCalendar = buildOperationalCalendar({\n    roster,\n    absences,\n    cardapios: cardapioCloud.state.records,",
    "  const operationalCardapios = cardapioCloud.state.records.filter(item => !item.archivedAt);\n  const operationalMeatItems = operationalCardapios.flatMap(item => gerarListaSaqueCarnes(item.dias));\n  const operationalCalendar = buildOperationalCalendar({\n    roster,\n    absences,\n    cardapios: operationalCardapios,",
    'active operational cardapios'
)
text = replace_once(text, "    cardapios: cardapioCloud.state.records,\n    rosterPending:", "    cardapios: operationalCardapios,\n    rosterPending:", 'snapshot active cardapios')

text = replace_once(
    text,
    "                      {['Cozinheiro de Dia', 'Copeiro de Dia', 'Auxiliar do Copeiro de Dia', 'Ceia de Dia'].map(post => {",
    "                      {adminSettings.rosterPosts.map(post => {",
    'dynamic roster posts'
)
text = replace_once(
    text,
    "                            <span className=\"text-lg font-bold\">4 Funções / Dia</span>",
    "                            <span className=\"text-lg font-bold\">{adminSettings.rosterPosts.length} Funções / Dia</span>",
    'dynamic posts count'
)

# Dynamic filter function choices
text = sub_once(
    text,
    r"(<select\s+value=\{filterFunction\}.*?>).*?(</select>)",
    r"\1\n                      <option>Todas as Funções</option>\n                      {adminSettings.rosterPosts.map(post => <option key={post} value={post}>{post}</option>)}\n                    \2",
    'filterFunction options', re.S
)
# Dynamic absence types, specialties and ranks where forms expose those selects.
text = sub_once(
    text,
    r"(<select\s+value=\{absenceType\}.*?>).*?(</select>)",
    r"\1\n                        {adminSettings.absenceTypes.map(item => <option key={item} value={item}>{item}</option>)}\n                      \2",
    'absenceType options', re.S
)
text = sub_once(
    text,
    r"(<select\s+value=\{newMilSpecialty\}.*?>).*?(</select>)",
    r"\1\n                        {adminSettings.specialties.map(item => <option key={item} value={item}>{item}</option>)}\n                      \2",
    'newMilSpecialty options', re.S
)
text = sub_once(
    text,
    r"(<select\s+value=\{newMilRank\}.*?>).*?(</select>)",
    r"\1\n                        {adminSettings.ranks.map(item => <option key={item} value={item}>{item}</option>)}\n                      \2",
    'newMilRank options', re.S
)
# Inline specialty selector in personnel table.
text = sub_once(
    text,
    r"(<select\s+value=\{m\.specialty\}.*?>).*?(</select>)",
    r"\1\n                                  {adminSettings.specialties.map(item => <option key={item} value={item}>{item}</option>)}\n                                \2",
    'inline specialty options', re.S
)

# Navigation and header.
cardapio_nav = """          <button 
            onClick={() => switchTab('cardapio')}
            className={cn(
              \"w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left\",
              activeTab === 'cardapio' ? \"bg-emerald-950/40 text-emerald-300 border-l-4 border-emerald-600 font-semibold bg-slate-900\" : \"text-slate-400 hover:bg-slate-900/40 hover:text-slate-200\"
            )}
          >
            <UtensilsCrossed className=\"w-4 h-4\" />
            <span>Cardápio Semanal</span>
          </button>"""
professional_nav = cardapio_nav + """

          <button
            onClick={() => switchTab('profissional')}
            className={cn(
              \"w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left\",
              activeTab === 'profissional' ? \"bg-emerald-950/40 text-emerald-300 border-l-4 border-emerald-600 font-semibold bg-slate-900\" : \"text-slate-400 hover:bg-slate-900/40 hover:text-slate-200\"
            )}
          >
            <History className=\"w-4 h-4\" />
            <span>Fluxos Profissionais</span>
          </button>"""
text = replace_once(text, cardapio_nav, professional_nav, 'professional nav')
text = replace_once(text, "              {activeTab === 'cardapio' && 'Cardápio Semanal de Aprovisionamento'}", "              {activeTab === 'cardapio' && 'Cardápio Semanal de Aprovisionamento'}\n              {activeTab === 'profissional' && 'Fluxos Profissionais e Histórico'}", 'header professional')
text = replace_once(text, "            {activeTab !== 'cardapio' && activeTab !== 'inicio' && <div", "            {activeTab !== 'cardapio' && activeTab !== 'inicio' && activeTab !== 'profissional' && <div", 'hide search professional')
text = replace_once(text, "            <button className=\"p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors\">\n              <Settings className=\"w-5 h-5\" />\n            </button>", "            <button onClick={() => switchTab('profissional')} className=\"p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors\" title=\"Configurações administrativas\">\n              <Settings className=\"w-5 h-5\" />\n            </button>", 'settings button')

cardapio_render = """          {/* TAB 4: CARDÁPIO SEMANAL (APROVISIONAMENTO HGeSM) */}
          {activeTab === 'cardapio' && (
            <CardapioSemanal onNotify={showToast} />
          )}
"""
professional_render = """          {/* TAB 4: CARDÁPIO SEMANAL (APROVISIONAMENTO HGeSM) */}
          {activeTab === 'cardapio' && (
            <CardapioSemanal onNotify={showToast} onAudit={recordCardapioAudit} />
          )}

          {/* BLOCO 3: FLUXOS PROFISSIONAIS */}
          {activeTab === 'profissional' && (
            <ProfessionalFlows
              auditTrail={auditTrail}
              swaps={swaps}
              settings={adminSettings}
              cardapios={cardapioCloud.state.records}
              onCancelSwap={handleCancelSwap}
              onArchiveCardapio={handleArchiveCardapio}
              onRestoreCardapio={handleRestoreCardapio}
              onRestoreVersion={handleRestoreCardapioVersion}
              onSaveSettings={handleSaveAdminSettings}
            />
          )}
"""
text = replace_once(text, cardapio_render, professional_render, 'professional render')

p.write_text(text)

# -----------------------------------------------------------------------------
# components/OperationalDashboard.tsx
# -----------------------------------------------------------------------------
p = Path('components/OperationalDashboard.tsx')
text = p.read_text()
text = replace_once(text, "export type OperationalTab = 'inicio' | 'dashboard' | 'efetivo' | 'afastamentos' | 'cardapio';", "export type OperationalTab = 'inicio' | 'dashboard' | 'efetivo' | 'afastamentos' | 'cardapio' | 'profissional';", 'OperationalTab')
text = replace_once(text, "  const sorted = [...cardapios].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));", "  const sorted = cardapios.filter(item => !item.archivedAt).sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));", 'ignore archived cardapio')
p.write_text(text)

# -----------------------------------------------------------------------------
# components/CardapioSemanal.tsx
# -----------------------------------------------------------------------------
p = Path('components/CardapioSemanal.tsx')
text = p.read_text()
text = replace_once(text, "import { getCardapioReadiness } from '@/lib/domain/cardapio-readiness';\n", "import { getCardapioReadiness } from '@/lib/domain/cardapio-readiness';\nimport type { AuditEvent } from '@/lib/domain/professional-flows';\n", 'cardapio audit import')

workflow_block = """export interface CardapioWorkflow {
  status: WorkflowStatus;
  conferido: {
    cargo: string;
    responsavel: string;
    data?: string;
    status: 'PENDENTE' | 'CONFERIDO';
  };
  aprovado: {
    cargo: string;
    responsavel: string;
    data?: string;
    status: 'PENDENTE' | 'APROVADO';
  };
}

export interface WeeklyCardapioDoc {"""
workflow_repl = """export interface CardapioWorkflow {
  status: WorkflowStatus;
  conferido: {
    cargo: string;
    responsavel: string;
    data?: string;
    status: 'PENDENTE' | 'CONFERIDO';
  };
  aprovado: {
    cargo: string;
    responsavel: string;
    data?: string;
    status: 'PENDENTE' | 'APROVADO';
  };
}

export interface CardapioVersionSnapshot {
  id: string;
  version: number;
  createdAt: string;
  reason: string;
  workflowStatus: WorkflowStatus;
  snapshot: string;
}

export interface WeeklyCardapioDoc {"""
text = replace_once(text, workflow_block, workflow_repl, 'cardapio version type')
text = replace_once(text, "  dias: DayCardapio[];\n}\n\n// =========================================================================\n// DATE HELPERS", "  dias: DayCardapio[];\n\n  version?: number;\n  versions?: CardapioVersionSnapshot[];\n  archivedAt?: string;\n  archiveReason?: string;\n  lastChangeReason?: string;\n}\n\nexport function createCardapioVersionSnapshot(doc: WeeklyCardapioDoc, reason: string): CardapioVersionSnapshot {\n  const version = doc.version || 1;\n  const cleanSnapshot = JSON.parse(JSON.stringify({ ...doc, versions: undefined })) as WeeklyCardapioDoc;\n  return {\n    id: `version-${doc.id}-${version}-${Date.now()}`,\n    version,\n    createdAt: new Date().toISOString(),\n    reason,\n    workflowStatus: doc.workflow.status,\n    snapshot: JSON.stringify(cleanSnapshot)\n  };\n}\n\n// =========================================================================\n// DATE HELPERS", 'cardapio version fields')

text = replace_once(text, "interface CardapioSemanalProps {\n  onNotify?: (msg: string, type?: 'success' | 'info') => void;\n}", "interface CardapioSemanalProps {\n  onNotify?: (msg: string, type?: 'success' | 'info') => void;\n  onAudit?: (event: Omit<AuditEvent, 'id' | 'createdAt'>) => void;\n}", 'cardapio props')
text = replace_once(text, "export default function CardapioSemanal({ onNotify }: CardapioSemanalProps) {", "export default function CardapioSemanal({ onNotify, onAudit }: CardapioSemanalProps) {", 'cardapio signature')

# Add initial version metadata to canonical seed after dias list closes via specific workflow area is unnecessary for backward compatibility.
# Update helper with archive protection + reviewed snapshot/version behavior.
update_pattern = r"  // Update current cardapio helper\n  const updateCurrentCardapio = \(updated: WeeklyCardapioDoc\) => \{.*?\n  \};\n\n  // Advance workflow state"
update_repl = """  // Update current cardapio helper with preservation of reviewed/finalized versions.
  const updateCurrentCardapio = (updated: WeeklyCardapioDoc) => {
    const persisted = cardapiosList.find(c => c.id === updated.id);
    if (persisted?.archivedAt) {
      showToast('Cardápio arquivado está em modo somente leitura. Restaure-o em Fluxos Profissionais antes de alterar.', 'info');
      return false;
    }
    if (persisted?.workflow.status === 'FINALIZADO' && updated.workflow.status !== 'EM_ELABORACAO') {
      showToast('Cardápio finalizado está bloqueado para edição. Reabra o documento antes de alterar.', 'info');
      return false;
    }

    let candidate = updated;
    const editedAfterReview = persisted &&
      (persisted.workflow.status === 'CONFERIDO' || persisted.workflow.status === 'APROVADO') &&
      updated.workflow.status === persisted.workflow.status;
    if (editedAfterReview && persisted) {
      candidate = JSON.parse(JSON.stringify(updated)) as WeeklyCardapioDoc;
      const snapshot = createCardapioVersionSnapshot({ ...persisted, version: persisted.version || 1 }, 'Estado preservado antes de alteração após conferência/aprovação');
      candidate.version = (persisted.version || 1) + 1;
      candidate.versions = [snapshot, ...(persisted.versions || [])];
      candidate.lastChangeReason = 'Alteração de conteúdo após conferência/aprovação';
      candidate.workflow.status = 'EM_ELABORACAO';
      candidate.workflow.conferido.status = 'PENDENTE';
      candidate.workflow.conferido.data = undefined;
      candidate.workflow.aprovado.status = 'PENDENTE';
      candidate.workflow.aprovado.data = undefined;
      showToast('Alteração no conteúdo criou nova versão e reabriu o cardápio para conferência.', 'info');
    }

    const updatedList = cardapiosList.some(c => c.id === candidate.id)
      ? cardapiosList.map(c => c.id === candidate.id ? candidate : c)
      : [candidate, ...cardapiosList];
    const saved = saveCardapios(updatedList, candidate.id);
    if (saved && editedAfterReview && persisted) {
      onAudit?.({
        module: 'Cardápio', action: 'REABERTURA', entityType: 'Cardápio', entityId: persisted.id,
        summary: `Cardápio ${persisted.dataInicio} a ${persisted.dataFim} reaberto automaticamente após alteração de conteúdo.`,
        previousValue: `Versão ${persisted.version || 1} / ${persisted.workflow.status}`,
        newValue: `Versão ${(persisted.version || 1) + 1} / EM_ELABORACAO`,
        note: 'Alteração de conteúdo após conferência/aprovação'
      });
    }
    return saved;
  };

  // Advance workflow state"""
text = sub_once(text, update_pattern, update_repl, 'updateCurrentCardapio', re.S)

# Add version snapshot + audit to advance workflow.
text = replace_once(
    text,
    "    } else if (currentStatus === 'APROVADO') {\n      nextStatus = 'FINALIZADO';\n      updated.workflow.status = nextStatus;\n      message = 'Cardápio FINALIZADO e pronto para publicação oficial.';\n    }\n\n    if (!updateCurrentCardapio(updated)) return;\n    if (message) showToast(message);",
    "    } else if (currentStatus === 'APROVADO') {\n      nextStatus = 'FINALIZADO';\n      updated.workflow.status = nextStatus;\n      updated.version = currentCardapio.version || 1;\n      const snapshot = createCardapioVersionSnapshot(updated, 'Finalização oficial do cardápio');\n      updated.versions = [snapshot, ...(currentCardapio.versions || []).filter(item => item.version !== snapshot.version)];\n      message = 'Cardápio FINALIZADO e versão oficial preservada.';\n    }\n\n    if (!updateCurrentCardapio(updated)) return;\n    if (currentStatus !== nextStatus) {\n      onAudit?.({\n        module: 'Cardápio',\n        action: nextStatus === 'FINALIZADO' ? 'FINALIZACAO' : 'ALTERACAO',\n        entityType: 'Cardápio', entityId: currentCardapio.id,\n        summary: `Fluxo do cardápio ${currentCardapio.dataInicio} a ${currentCardapio.dataFim}: ${currentStatus} → ${nextStatus}.`,\n        previousValue: currentStatus, newValue: nextStatus\n      });\n    }\n    if (message) showToast(message);",
    'workflow version snapshot'
)

reopen_pattern = r"  const handleReopenWorkflow = \(\) => \{.*?\n  \};\n\n  // Handle official PDF generation"
reopen_repl = """  const handleReopenWorkflow = () => {
    const reason = window.prompt('Informe o motivo da reabertura do cardápio:');
    if (!reason?.trim()) {
      showToast('A reabertura exige um motivo para preservar a rastreabilidade.', 'info');
      return;
    }
    const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
    const previousVersion = currentCardapio.version || 1;
    const snapshot = createCardapioVersionSnapshot({ ...currentCardapio, version: previousVersion }, `Estado preservado antes da reabertura: ${reason.trim()}`);
    updated.version = previousVersion + 1;
    updated.versions = [snapshot, ...(currentCardapio.versions || []).filter(item => item.id !== snapshot.id)];
    updated.lastChangeReason = reason.trim();
    updated.workflow.status = 'EM_ELABORACAO';
    updated.workflow.conferido.status = 'PENDENTE';
    updated.workflow.conferido.data = undefined;
    updated.workflow.aprovado.status = 'PENDENTE';
    updated.workflow.aprovado.data = undefined;
    if (!updateCurrentCardapio(updated)) return;
    onAudit?.({
      module: 'Cardápio', action: 'REABERTURA', entityType: 'Cardápio', entityId: currentCardapio.id,
      summary: `Cardápio reaberto como versão ${previousVersion + 1}.`,
      previousValue: `Versão ${previousVersion} / ${currentCardapio.workflow.status}`,
      newValue: `Versão ${previousVersion + 1} / EM_ELABORACAO`, note: reason.trim()
    });
    showToast(`Cardápio reaberto como versão ${previousVersion + 1}.`, 'info');
  };

  // Handle official PDF generation"""
text = sub_once(text, reopen_pattern, reopen_repl, 'handleReopenWorkflow', re.S)

# New and duplicated weeks start at v1 and are never archived.
text = replace_once(text, "      workflow: {\n        status: 'EM_ELABORACAO',", "      version: 1,\n      versions: [],\n      workflow: {\n        status: 'EM_ELABORACAO',", 'duplicate version init')
# second occurrence for create clean week
idx = text.find("      workflow: {\n        status: 'EM_ELABORACAO',", text.find("const handleCreateNewWeek"))
if idx == -1:
    raise RuntimeError('create week workflow not found')
text = text[:idx] + "      version: 1,\n      versions: [],\n" + text[idx:]

p.write_text(text)

# -----------------------------------------------------------------------------
# lib/persistence/validation.ts
# -----------------------------------------------------------------------------
p = Path('lib/persistence/validation.ts')
text = p.read_text()
insert = """const auditEvent = (value: unknown) => object(value) &&
  strings(value, ['id', 'createdAt', 'module', 'action', 'entityType', 'summary']) &&
  optional(value, 'entityId', 'string') && optional(value, 'previousValue', 'string') &&
  optional(value, 'newValue', 'string') && optional(value, 'note', 'string');
const swap = (value: unknown) => object(value) &&
  strings(value, ['id', 'day', 'post', 'originalMilitaryId', 'originalMilitaryName', 'originalRank',
    'replacementMilitaryId', 'replacementMilitaryName', 'replacementRank', 'status', 'createdAt']) &&
  ['CONFIRMADA', 'CANCELADA'].includes(String(value.status)) &&
  optional(value, 'cancelledAt', 'string') && optional(value, 'note', 'string');
const adminSettings = (value: unknown) => object(value) &&
  list(value.rosterPosts, item => typeof item === 'string') &&
  list(value.absenceTypes, item => typeof item === 'string') &&
  list(value.specialties, item => typeof item === 'string') &&
  list(value.ranks, item => typeof item === 'string') &&
  typeof value.historyRetentionLimit === 'number' && Number.isSafeInteger(value.historyRetentionLimit);
"""
text = replace_once(text, "const cell = (value: unknown) => value === null || (object(value) &&\n  strings(value, ['militaryId', 'militaryName', 'rank']) &&\n  ['EP', 'EV', 'PERM', 'DISP'].includes(String(value.type)));\n", "const cell = (value: unknown) => value === null || (object(value) &&\n  strings(value, ['militaryId', 'militaryName', 'rank']) &&\n  ['EP', 'EV', 'PERM', 'DISP'].includes(String(value.type)));\n" + insert, 'validation professional models')
text = replace_once(text, "      !list(value.customHolidays, item => object(item) && strings(item, ['id', 'date', 'name'])) ||\n      !object(value.roster)) return false;", "      !list(value.customHolidays, item => object(item) && strings(item, ['id', 'date', 'name'])) ||\n      (value.auditTrail !== undefined && !list(value.auditTrail, auditEvent)) ||\n      (value.swaps !== undefined && !list(value.swaps, swap)) ||\n      (value.adminSettings !== undefined && !adminSettings(value.adminSettings)) ||\n      !object(value.roster)) return false;", 'validate roster professional fields')
version_validator = """const cardapioVersion = (value: unknown) => object(value) &&
  strings(value, ['id', 'createdAt', 'reason', 'workflowStatus', 'snapshot']) &&
  typeof value.version === 'number' && Number.isSafeInteger(value.version) && value.version >= 1;
"""
text = replace_once(text, "export function validateCardapio(value: unknown): boolean {", version_validator + "export function validateCardapio(value: unknown): boolean {", 'version validator')
text = replace_once(text, "    !strings(value.responsavelTecnico, ['nome', 'postoGraduacao', 'funcao']) ||\n    !Array.isArray(value.dias)", "    !strings(value.responsavelTecnico, ['nome', 'postoGraduacao', 'funcao']) ||\n    (value.version !== undefined && (typeof value.version !== 'number' || !Number.isSafeInteger(value.version) || value.version < 1)) ||\n    (value.versions !== undefined && !list(value.versions, cardapioVersion)) ||\n    !optional(value, 'archivedAt', 'string') || !optional(value, 'archiveReason', 'string') || !optional(value, 'lastChangeReason', 'string') ||\n    !Array.isArray(value.dias)", 'validate cardapio professional fields')
p.write_text(text)

print('Bloco 3 integrado em app, cardápio, validação e dashboard')
