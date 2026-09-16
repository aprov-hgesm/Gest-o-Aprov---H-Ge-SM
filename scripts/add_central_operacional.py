from pathlib import Path

p = Path('app/page.tsx')
text = p.read_text()

def replace_once(old: str, new: str, label: str):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 trecho, encontrado {count}')
    text = text.replace(old, new, 1)

replace_once(
"import CardapioSemanal from '@/components/CardapioSemanal';\nimport SyncStatus from '@/components/SyncStatus';\nimport { useCloudData } from '@/hooks/use-cloud-data';\nimport { clean, equal } from '@/lib/persistence/core';\nimport { validateRoster } from '@/lib/persistence/validation';",
"import CardapioSemanal, { initialWeeklyCardapio, type WeeklyCardapioDoc } from '@/components/CardapioSemanal';\nimport OperationalDashboard, { OperationalAlertsPanel, buildOperationalSnapshot, type OperationalTab } from '@/components/OperationalDashboard';\nimport SyncStatus from '@/components/SyncStatus';\nimport { useCloudData } from '@/hooks/use-cloud-data';\nimport { clean, equal } from '@/lib/persistence/core';\nimport { validateCardapio, validateRoster } from '@/lib/persistence/validation';",
'importações da central'
)

replace_once(
"  }];\n}\n\nexport default function RosterApp() {\n  const rosterCloud = useCloudData({\n    name: 'roster', initial: initialRosterDocuments,\n    validate: validateRoster, legacy: readLegacyRoster\n  });",
"  }];\n}\n\nfunction readLegacyCardapiosForCentral(): WeeklyCardapioDoc[] | null {\n  const raw = localStorage.getItem('dr_cardapios');\n  return raw === null ? null : JSON.parse(raw);\n}\n\nexport default function RosterApp() {\n  const rosterCloud = useCloudData({\n    name: 'roster', initial: initialRosterDocuments,\n    validate: validateRoster, legacy: readLegacyRoster\n  });\n  const cardapioCloud = useCloudData<WeeklyCardapioDoc>({\n    name: 'cardapios', initial: [initialWeeklyCardapio],\n    validate: validateCardapio, legacy: readLegacyCardapiosForCentral\n  });",
'controller de cardápios'
)

replace_once(
"  const [activeTab, setActiveTab] = useState<'dashboard' | 'efetivo' | 'afastamentos' | 'cardapio'>('dashboard');",
"  const [activeTab, setActiveTab] = useState<OperationalTab>('inicio');",
'aba inicial'
)

replace_once(
"  const switchTab = (tab: 'dashboard' | 'efetivo' | 'afastamentos' | 'cardapio') => {",
"  const switchTab = (tab: OperationalTab) => {",
'union do switchTab'
)

replace_once(
"  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'info' }>({ show: false, msg: '', type: 'success' });",
"  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'info' }>({ show: false, msg: '', type: 'success' });\n  const [alertsOpen, setAlertsOpen] = useState(false);",
'estado de alertas'
)

replace_once(
"  const { rate: complianceRate } = rosterCompliance(roster);",
"  const { rate: complianceRate } = rosterCompliance(roster);\n\n  const operationalSnapshot = buildOperationalSnapshot({\n    militaryList,\n    absences,\n    roster,\n    cardapios: cardapioCloud.state.records,\n    rosterPending: rosterCloud.state.pending,\n    cardapioPending: cardapioCloud.state.pending\n  });",
'snapshot operacional'
)

replace_once(
"        <nav className=\"flex-1 px-3 py-4 space-y-1\">\n          <button \n            onClick={() => switchTab('dashboard')}",
"        <nav className=\"flex-1 px-3 py-4 space-y-1\">\n          <button\n            onClick={() => switchTab('inicio')}\n            className={cn(\n              \"w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left\",\n              activeTab === 'inicio' ? \"bg-emerald-950/40 text-emerald-300 border-l-4 border-emerald-600 font-semibold bg-slate-900\" : \"text-slate-400 hover:bg-slate-900/40 hover:text-slate-200\"\n            )}\n          >\n            <ShieldAlert className=\"w-4 h-4\" />\n            <span>Central Operacional</span>\n          </button>\n\n          <button \n            onClick={() => switchTab('dashboard')}",
'item de navegação central'
)

replace_once(
"              {activeTab === 'dashboard' && 'Gestão de Escalas'}",
"              {activeTab === 'inicio' && 'Central Operacional'}\n              {activeTab === 'dashboard' && 'Gestão de Escalas'}",
'título do cabeçalho'
)

replace_once(
"            {activeTab !== 'cardapio' && <div className=\"relative max-w-xs hidden md:block\">",
"            {activeTab !== 'cardapio' && activeTab !== 'inicio' && <div className=\"relative max-w-xs hidden md:block\">",
'busca contextual'
)

replace_once(
"            <button className=\"p-2 text-slate-400 hover:bg-slate-100 rounded-full relative transition-colors\">\n              <Bell className=\"w-5 h-5\" />\n              <span className=\"absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white\" />\n            </button>",
"            <div className=\"relative\">\n              <button\n                onClick={() => setAlertsOpen(value => !value)}\n                className=\"p-2 text-slate-400 hover:bg-slate-100 rounded-full relative transition-colors\"\n                aria-label=\"Abrir Central de Alertas\"\n                aria-expanded={alertsOpen}\n              >\n                <Bell className=\"w-5 h-5\" />\n                {operationalSnapshot.alerts.length > 0 && (\n                  <span className=\"absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full border-2 border-white flex items-center justify-center\">\n                    {Math.min(99, operationalSnapshot.alerts.length)}\n                  </span>\n                )}\n              </button>\n              {alertsOpen && (\n                <OperationalAlertsPanel\n                  alerts={operationalSnapshot.alerts}\n                  onNavigate={switchTab}\n                  onClose={() => setAlertsOpen(false)}\n                />\n              )}\n            </div>",
'central de alertas no sino'
)

replace_once(
"        <SyncStatus title=\"Escalas e efetivo\" state={rosterCloud.state} controller={rosterCloud.controller} />\n\n        {/* Scrollable Main Area */}",
"        <SyncStatus title=\"Escalas e efetivo\" state={rosterCloud.state} controller={rosterCloud.controller} />\n        {activeTab === 'inicio' && (\n          <SyncStatus title=\"Cardápios semanais\" state={cardapioCloud.state} controller={cardapioCloud.controller} />\n        )}\n\n        {/* Scrollable Main Area */}",
'status de sincronização da central'
)

replace_once(
"          {/* TAB 1: DASHBOARD / GESTÃO DE ESCALAS */}\n          {activeTab === 'dashboard' && (",
"          {/* CENTRAL OPERACIONAL */}\n          {activeTab === 'inicio' && (\n            <OperationalDashboard snapshot={operationalSnapshot} onNavigate={switchTab} />\n          )}\n\n          {/* TAB 1: DASHBOARD / GESTÃO DE ESCALAS */}\n          {activeTab === 'dashboard' && (",
'renderização da central'
)

p.write_text(text)
print('Central Operacional integrada em app/page.tsx')
