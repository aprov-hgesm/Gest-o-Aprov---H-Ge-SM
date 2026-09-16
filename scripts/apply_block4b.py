from pathlib import Path


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
    "import OperationalDashboard, { OperationalAlertsPanel, buildOperationalSnapshot, type OperationalTab } from '@/components/OperationalDashboard';\nimport ProfessionalFlows from '@/components/ProfessionalFlows';",
    "import OperationalDashboard, { OperationalAlertsPanel, buildOperationalSnapshot } from '@/components/OperationalDashboard';\nimport OperationalContextBar from '@/components/OperationalContextBar';\nimport ProfessionalFlows from '@/components/ProfessionalFlows';\nimport type { OperationalTab, ProfessionalSection } from '@/lib/domain/operational-navigation';",
    'page-imports',
)

text = replace_once(
    text,
    "  const [activeTab, setActiveTab] = useState<OperationalTab>('inicio');",
    "  const [activeTab, setActiveTab] = useState<OperationalTab>('inicio');\n  const [professionalSection, setProfessionalSection] = useState<ProfessionalSection>('historico');\n  const [cardapioSearch, setCardapioSearch] = useState('');",
    'page-navigation-state',
)

text = replace_once(
    text,
    "  const switchTab = (tab: OperationalTab) => {\n    setActiveTab(tab);\n    setIsAssigning(false);\n    setSelectedCell(null);\n    setEditingMil(null);\n    setSidebarOpen(false);\n  };",
    "  const switchTab = (tab: OperationalTab) => {\n    setActiveTab(tab);\n    setIsAssigning(false);\n    setSelectedCell(null);\n    setEditingMil(null);\n    setSidebarOpen(false);\n  };\n\n  const openProfessional = (section: ProfessionalSection) => {\n    setProfessionalSection(section);\n    switchTab('profissional');\n  };",
    'open-professional',
)

text = replace_once(
    text,
    "  const [alertsOpen, setAlertsOpen] = useState(false);\n  const [isHelpOpen, setIsHelpOpen] = useState(false);\n\n  // One versioned document keeps personnel, absences, assignments and professional history consistent.",
    "  const [alertsOpen, setAlertsOpen] = useState(false);\n  const [isHelpOpen, setIsHelpOpen] = useState(false);\n\n  const openRosterForMilitary = (militaryId: string, militaryName: string) => {\n    const mil = militaryList.find(item => item.id === militaryId);\n    setFilterMilitaryName(mil?.name || militaryName);\n    setFilterFunction('Todas as Funções');\n    setFilterScaleType('Todos');\n    setViewOption('Todos');\n    switchTab('dashboard');\n  };\n\n  const openMilitaryRecord = (militaryId: string, militaryName: string) => {\n    const mil = militaryList.find(item => item.id === militaryId);\n    setEfetivoSearch(mil?.name || militaryName);\n    setEfetivoFunctionFilter('Todas as Funções');\n    setEfetivoStatusFilter('Todos');\n    setEfetivoScaleFilter('Todas');\n    switchTab('efetivo');\n  };\n\n  const openAbsenceForMilitary = (mil: Military) => {\n    setAbsenceTypeFilter('Todos');\n    if (mil.status === 'Afastado') {\n      setAbsenceSearch(mil.name);\n      setAbsentMilId('');\n    } else {\n      setAbsenceSearch('');\n      setAbsentMilId(mil.id);\n      setAbsenceStart(localIsoDate());\n    }\n    switchTab('afastamentos');\n  };\n\n  // One versioned document keeps personnel, absences, assignments and professional history consistent.",
    'cross-module-helpers',
)

text = replace_once(
    text,
    "            {activeTab !== 'cardapio' && activeTab !== 'inicio' && activeTab !== 'profissional' && <div className=\"relative max-w-xs hidden md:block\">",
    "            {activeTab !== 'inicio' && activeTab !== 'profissional' && <div className=\"relative max-w-xs hidden md:block\">",
    'context-search-visible',
)

text = replace_once(
    text,
    "                  activeTab === 'dashboard' \n                    ? \"Filtrar militar na escala...\" \n                    : activeTab === 'efetivo' \n                    ? \"Buscar no efetivo militar...\" \n                    : \"Buscar afastamento ou militar...\"",
    "                  activeTab === 'dashboard' \n                    ? \"Filtrar militar na escala...\" \n                    : activeTab === 'efetivo' \n                    ? \"Buscar no efetivo militar...\" \n                    : activeTab === 'cardapio'\n                    ? \"Buscar semana, refeição, corte...\"\n                    : \"Buscar afastamento ou militar...\"",
    'context-search-placeholder',
)

text = replace_once(
    text,
    "                  activeTab === 'dashboard' \n                    ? filterMilitaryName \n                    : activeTab === 'efetivo' \n                    ? efetivoSearch \n                    : absenceSearch",
    "                  activeTab === 'dashboard' \n                    ? filterMilitaryName \n                    : activeTab === 'efetivo' \n                    ? efetivoSearch \n                    : activeTab === 'cardapio'\n                    ? cardapioSearch\n                    : absenceSearch",
    'context-search-value',
)

text = replace_once(
    text,
    "                  if (activeTab === 'dashboard') setFilterMilitaryName(val);\n                  else if (activeTab === 'efetivo') setEfetivoSearch(val);\n                  else setAbsenceSearch(val);",
    "                  if (activeTab === 'dashboard') setFilterMilitaryName(val);\n                  else if (activeTab === 'efetivo') setEfetivoSearch(val);\n                  else if (activeTab === 'cardapio') setCardapioSearch(val);\n                  else setAbsenceSearch(val);",
    'context-search-handler',
)

text = replace_once(
    text,
    "            <button onClick={() => switchTab('profissional')} className=\"p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors\" title=\"Configurações administrativas\">",
    "            <button onClick={() => openProfessional('configuracoes')} className=\"p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors\" title=\"Configurações administrativas\">",
    'settings-deeplink',
)

text = replace_once(
    text,
    "        {activeTab === 'inicio' && (\n          <SyncStatus title=\"Cardápios semanais\" state={cardapioCloud.state} controller={cardapioCloud.controller} />\n        )}\n\n        {/* Scrollable Main Area */}",
    "        {activeTab === 'inicio' && (\n          <SyncStatus title=\"Cardápios semanais\" state={cardapioCloud.state} controller={cardapioCloud.controller} />\n        )}\n        <OperationalContextBar\n          activeTab={activeTab}\n          onNavigate={switchTab}\n          onOpenProfessional={openProfessional}\n        />\n\n        {/* Scrollable Main Area */}",
    'context-bar',
)

text = replace_once(
    text,
    "                                  <div className=\"flex gap-2 justify-center\">\n                                <button\n                                  onClick={() => { setEditingMilOriginal(clean(mil)); setEditingMil(clean(mil)); }}",
    "                                  <div className=\"flex gap-1 justify-center\">\n                                <button\n                                  onClick={() => openRosterForMilitary(mil.id, mil.name)}\n                                  className=\"p-1.5 hover:bg-emerald-50 rounded text-slate-400 hover:text-emerald-800 transition-colors\"\n                                  title=\"Localizar militar na escala\"\n                                >\n                                  <Calendar className=\"w-3.5 h-3.5\" />\n                                </button>\n                                <button\n                                  onClick={() => openAbsenceForMilitary(mil)}\n                                  className=\"p-1.5 hover:bg-amber-50 rounded text-slate-400 hover:text-amber-700 transition-colors\"\n                                  title={mil.status === 'Afastado' ? 'Ver afastamento vigente' : 'Registrar afastamento'}\n                                >\n                                  <UserX className=\"w-3.5 h-3.5\" />\n                                </button>\n                                <button\n                                  onClick={() => { setEditingMilOriginal(clean(mil)); setEditingMil(clean(mil)); }}",
    'efetivo-actions',
)

text = replace_once(
    text,
    "                                  <td className=\"px-6 py-4 text-right\">\n                                    {['ATIVO', 'AGENDADO'].includes(resolveAbsenceStatus(abs)) && (",
    "                                  <td className=\"px-6 py-4 text-right\">\n                                    <button\n                                      onClick={() => openMilitaryRecord(abs.militaryId, abs.militaryName)}\n                                      className=\"p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-800 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-semibold\"\n                                      title=\"Abrir cadastro do militar\"\n                                    >\n                                      <UserCheck className=\"w-4 h-4\" />\n                                    </button>\n                                    <button\n                                      onClick={() => openRosterForMilitary(abs.militaryId, abs.militaryName)}\n                                      className=\"p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-700 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-semibold\"\n                                      title=\"Localizar militar na escala\"\n                                    >\n                                      <Calendar className=\"w-4 h-4\" />\n                                    </button>\n                                    {['ATIVO', 'AGENDADO'].includes(resolveAbsenceStatus(abs)) && (",
    'absence-actions',
)

text = replace_once(
    text,
    "            <CardapioSemanal onNotify={showToast} onAudit={recordCardapioAudit} />",
    "            <CardapioSemanal onNotify={showToast} onAudit={recordCardapioAudit} searchQuery={cardapioSearch} />",
    'cardapio-search-prop',
)

text = replace_once(
    text,
    "              onRestoreVersion={handleRestoreCardapioVersion}\n              onSaveSettings={handleSaveAdminSettings}\n            />",
    "              onRestoreVersion={handleRestoreCardapioVersion}\n              onSaveSettings={handleSaveAdminSettings}\n              initialSection={professionalSection}\n              onNavigate={switchTab}\n            />",
    'professional-props',
)

p.write_text(text)


# -----------------------------------------------------------------------------
# components/OperationalDashboard.tsx
# -----------------------------------------------------------------------------
p = Path('components/OperationalDashboard.tsx')
text = p.read_text()

text = replace_once(
    text,
    "import type { OperationalCalendarDay } from '@/lib/domain/operational-calendar';\n\nexport type OperationalTab = 'inicio' | 'dashboard' | 'efetivo' | 'afastamentos' | 'cardapio' | 'profissional';",
    "import type { OperationalCalendarDay } from '@/lib/domain/operational-calendar';\nimport type { OperationalTab } from '@/lib/domain/operational-navigation';\nexport type { OperationalTab } from '@/lib/domain/operational-navigation';",
    'dashboard-tab-type',
)

old_metrics = """        <MetricCard icon={UserCheck} label="Efetivo disponível" value={snapshot.availableMilitary} detail={`${snapshot.absentMilitary} afastado(s) hoje`} />
        <MetricCard icon={CircleAlert} label="Postos vagos" value={snapshot.vacantPostsNext7} detail="Próximos 7 dias de escala" attention={snapshot.vacantPostsNext7 > 0} />
        <MetricCard icon={Beef} label="Saque de carnes hoje" value={`${snapshot.meatKgToday.toLocaleString('pt-BR')} kg`} detail={`${snapshot.meatItemsToday} item(ns) para retirada`} />
        <MetricCard icon={UtensilsCrossed} label="Prontidão do cardápio" value={snapshot.cardapioReadiness === null ? '—' : `${snapshot.cardapioReadiness}%`} detail={statusLabel} attention={(snapshot.cardapioReadiness ?? 100) < 100} />"""
new_metrics = """        <MetricCard icon={UserCheck} label="Efetivo disponível" value={snapshot.availableMilitary} detail={`${snapshot.absentMilitary} afastado(s) hoje`} onClick={() => onNavigate('efetivo')} />
        <MetricCard icon={CircleAlert} label="Postos vagos" value={snapshot.vacantPostsNext7} detail="Próximos 7 dias de escala" attention={snapshot.vacantPostsNext7 > 0} onClick={() => onNavigate('dashboard')} />
        <MetricCard icon={Beef} label="Saque de carnes hoje" value={`${snapshot.meatKgToday.toLocaleString('pt-BR')} kg`} detail={`${snapshot.meatItemsToday} item(ns) para retirada`} onClick={() => onNavigate('cardapio')} />
        <MetricCard icon={UtensilsCrossed} label="Prontidão do cardápio" value={snapshot.cardapioReadiness === null ? '—' : `${snapshot.cardapioReadiness}%`} detail={statusLabel} attention={(snapshot.cardapioReadiness ?? 100) < 100} onClick={() => onNavigate('cardapio')} />"""
text = replace_once(text, old_metrics, new_metrics, 'dashboard-metrics')

text = replace_once(
    text,
    "  attention = false\n}: {\n  icon: React.ComponentType<{ className?: string }>;\n  label: string;\n  value: React.ReactNode;\n  detail: string;\n  attention?: boolean;\n}) {\n  return (\n    <div className={cn('rounded-2xl border bg-white p-4 shadow-sm', attention ? 'border-amber-200' : 'border-slate-200')}>",
    "  attention = false,\n  onClick,\n}: {\n  icon: React.ComponentType<{ className?: string }>;\n  label: string;\n  value: React.ReactNode;\n  detail: string;\n  attention?: boolean;\n  onClick?: () => void;\n}) {\n  return (\n    <button type=\"button\" onClick={onClick} className={cn('w-full text-left rounded-2xl border bg-white p-4 shadow-sm transition-all', onClick && 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer', attention ? 'border-amber-200' : 'border-slate-200')}>",
    'metric-button-open',
)
text = replace_once(text, "    </div>\n  );\n}", "    </button>\n  );\n}", 'metric-button-close')
p.write_text(text)


# -----------------------------------------------------------------------------
# components/ProfessionalFlows.tsx
# -----------------------------------------------------------------------------
p = Path('components/ProfessionalFlows.tsx')
text = p.read_text()

text = replace_once(
    text,
    "import { cn } from '@/lib/utils';\nimport type { WeeklyCardapioDoc, WorkflowStatus } from '@/components/CardapioSemanal';",
    "import { cn } from '@/lib/utils';\nimport type { WeeklyCardapioDoc, WorkflowStatus } from '@/components/CardapioSemanal';\nimport type { OperationalTab, ProfessionalSection } from '@/lib/domain/operational-navigation';",
    'professional-navigation-import',
)

text = replace_once(
    text,
    "  onRestoreVersion: (cardapioId: string, versionId: string, reason: string) => void;\n  onSaveSettings: (settings: AdminSettings) => void;\n}\n\ntype Section = 'historico' | 'permutas' | 'cardapios' | 'configuracoes';",
    "  onRestoreVersion: (cardapioId: string, versionId: string, reason: string) => void;\n  onSaveSettings: (settings: AdminSettings) => void;\n  initialSection?: ProfessionalSection;\n  onNavigate?: (tab: OperationalTab) => void;\n}",
    'professional-props-type',
)

text = replace_once(
    text,
    "  onRestoreVersion,\n  onSaveSettings,\n}: Props) {\n  const [section, setSection] = useState<Section>('historico');",
    "  onRestoreVersion,\n  onSaveSettings,\n  initialSection = 'historico',\n  onNavigate,\n}: Props) {\n  const [section, setSection] = useState<ProfessionalSection>(initialSection);",
    'professional-signature',
)

text = replace_once(
    text,
    "  useEffect(() => {\n    const normalized = normalizeAdminSettings(settings);",
    "  useEffect(() => {\n    setSection(initialSection);\n  }, [initialSection]);\n\n  useEffect(() => {\n    const normalized = normalizeAdminSettings(settings);",
    'professional-section-sync',
)

text = replace_once(
    text,
    "  const tabs: Array<{ id: Section; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }> = [",
    "  const tabs: Array<{ id: ProfessionalSection; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }> = [",
    'professional-tabs-type',
)

text = replace_once(
    text,
    "        <div className=\"grid grid-cols-3 gap-2 text-center shrink-0\">",
    "        <div className=\"flex items-center gap-2 shrink-0\">\n          {onNavigate && (\n            <button onClick={() => onNavigate('inicio')} className=\"px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50\">Central Operacional</button>\n          )}\n          <div className=\"grid grid-cols-3 gap-2 text-center\">",
    'professional-header-open',
)
text = replace_once(
    text,
    "          <div className=\"rounded-xl border border-slate-200 bg-white px-3 py-2\"><div className=\"text-lg font-bold text-slate-900\">{archivedCount}</div><div className=\"text-[10px] text-slate-500\">arquivados</div></div>\n        </div>\n      </div>",
    "          <div className=\"rounded-xl border border-slate-200 bg-white px-3 py-2\"><div className=\"text-lg font-bold text-slate-900\">{archivedCount}</div><div className=\"text-[10px] text-slate-500\">arquivados</div></div>\n          </div>\n        </div>\n      </div>",
    'professional-header-close',
)
p.write_text(text)


# -----------------------------------------------------------------------------
# components/CardapioSemanal.tsx
# -----------------------------------------------------------------------------
p = Path('components/CardapioSemanal.tsx')
text = p.read_text()

text = replace_once(
    text,
    "import type { AuditEvent } from '@/lib/domain/professional-flows';",
    "import type { AuditEvent } from '@/lib/domain/professional-flows';\nimport { cardapioMatchesSearch } from '@/lib/domain/operational-navigation';",
    'cardapio-search-import',
)

text = replace_once(
    text,
    "interface CardapioSemanalProps {\n  onNotify?: (msg: string, type?: 'success' | 'info') => void;\n  onAudit?: (event: Omit<AuditEvent, 'id' | 'createdAt'>) => void;\n}",
    "interface CardapioSemanalProps {\n  onNotify?: (msg: string, type?: 'success' | 'info') => void;\n  onAudit?: (event: Omit<AuditEvent, 'id' | 'createdAt'>) => void;\n  searchQuery?: string;\n}",
    'cardapio-props',
)

text = replace_once(
    text,
    "export default function CardapioSemanal({ onNotify, onAudit }: CardapioSemanalProps) {",
    "export default function CardapioSemanal({ onNotify, onAudit, searchQuery = '' }: CardapioSemanalProps) {",
    'cardapio-signature',
)

text = replace_once(
    text,
    "  const [selectedCardapioId, setSelectedCardapioId] = useState(initialWeeklyCardapio.id);\n  const [selectionLoaded, setSelectionLoaded] = useState(false);",
    "  const [selectedCardapioId, setSelectedCardapioId] = useState(initialWeeklyCardapio.id);\n  const matchingCardapios = cardapiosList.filter(item => cardapioMatchesSearch(item, searchQuery));\n  const selectedCardapioForSearch = cardapiosList.find(item => item.id === selectedCardapioId);\n  const cardapiosForSelector = selectedCardapioForSearch && !matchingCardapios.some(item => item.id === selectedCardapioId)\n    ? [selectedCardapioForSearch, ...matchingCardapios]\n    : matchingCardapios;\n  const [selectionLoaded, setSelectionLoaded] = useState(false);",
    'cardapio-matching',
)

text = replace_once(
    text,
    "              {cardapiosList.map(c => (",
    "              {cardapiosForSelector.map(c => (",
    'cardapio-selector-filter',
)

text = replace_once(
    text,
    "            </select>\n\n            <button\n              onClick={() => {",
    "            </select>\n            {searchQuery.trim() && (\n              <span className=\"shrink-0 px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500\">\n                {matchingCardapios.length} resultado(s)\n              </span>\n            )}\n\n            <button\n              onClick={() => {",
    'cardapio-search-count',
)
p.write_text(text)

print('Bloco 4B aplicado com sucesso.')
