from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'[{label}] trecho não encontrado')
    return text.replace(old, new, 1)

# app/page.tsx
p = Path('app/page.tsx')
t = p.read_text()
t = replace_once(t,
    "  Eraser,\n  UtensilsCrossed\n} from 'lucide-react';",
    "  Eraser,\n  UtensilsCrossed,\n  Beef\n} from 'lucide-react';",
    'page-icon')
t = replace_once(t,
    "import CardapioSemanal, { gerarListaSaqueCarnes, initialWeeklyCardapio, type WeeklyCardapioDoc } from '@/components/CardapioSemanal';\nimport OperationalDashboard, { OperationalAlertsPanel, buildOperationalSnapshot } from '@/components/OperationalDashboard';",
    "import CardapioSemanal, { gerarListaSaqueCarnes, initialWeeklyCardapio, type WeeklyCardapioDoc } from '@/components/CardapioSemanal';\nimport SaqueCarnesOperacional from '@/components/SaqueCarnesOperacional';\nimport OperationalDashboard, { OperationalAlertsPanel, buildOperationalSnapshot } from '@/components/OperationalDashboard';",
    'page-component-import')
t = replace_once(t,
    "import { validateCardapio, validateRoster } from '@/lib/persistence/validation';",
    "import { validateCardapio, validateRoster, validateSaqueOperational } from '@/lib/persistence/validation';",
    'page-validation-import')
t = replace_once(t,
    "import type { OperationalTab, ProfessionalSection } from '@/lib/domain/operational-navigation';",
    "import type { OperationalTab, ProfessionalSection } from '@/lib/domain/operational-navigation';\nimport type { SaqueOperationalRecord } from '@/lib/domain/saque-operacional';",
    'page-saque-type')
t = replace_once(t,
    "  const cardapioCloud = useCloudData<WeeklyCardapioDoc>({\n    name: 'cardapios', initial: [initialWeeklyCardapio],\n    validate: validateCardapio, legacy: readLegacyCardapiosForCentral\n  });",
    "  const cardapioCloud = useCloudData<WeeklyCardapioDoc>({\n    name: 'cardapios', initial: [initialWeeklyCardapio],\n    validate: validateCardapio, legacy: readLegacyCardapiosForCentral\n  });\n  const saqueCloud = useCloudData<SaqueOperationalRecord>({\n    name: 'saques', initial: [],\n    validate: validateSaqueOperational, legacy: () => null\n  });",
    'page-saque-cloud')
t = replace_once(t,
    "  const [professionalSection, setProfessionalSection] = useState<ProfessionalSection>('historico');\n  const [cardapioSearch, setCardapioSearch] = useState('');",
    "  const [professionalSection, setProfessionalSection] = useState<ProfessionalSection>('historico');\n  const [cardapioSearch, setCardapioSearch] = useState('');\n  const [cardapioFocusDate, setCardapioFocusDate] = useState('');",
    'page-focus-state')
t = replace_once(t,
    "  const openProfessional = (section: ProfessionalSection) => {\n    setProfessionalSection(section);\n    switchTab('profissional');\n  };",
    "  const openProfessional = (section: ProfessionalSection) => {\n    setProfessionalSection(section);\n    switchTab('profissional');\n  };\n\n  const openCardapioDay = (dateIso: string) => {\n    setCardapioFocusDate(dateIso);\n    setCardapioSearch(dateIso);\n    switchTab('cardapio');\n  };",
    'page-open-cardapio-day')
t = replace_once(t,
    "    rosterPending: rosterCloud.state.pending,\n    cardapioPending: cardapioCloud.state.pending\n  });",
    "    rosterPending: rosterCloud.state.pending,\n    cardapioPending: cardapioCloud.state.pending,\n    saquePending: saqueCloud.state.pending\n  });",
    'page-snapshot-saque-pending')
cardapio_button = '''          <button \n            onClick={() => switchTab('cardapio')}\n            className={cn(\n              \"w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left\",\n              activeTab === 'cardapio' ? \"bg-emerald-950/40 text-emerald-300 border-l-4 border-emerald-600 font-semibold bg-slate-900\" : \"text-slate-400 hover:bg-slate-900/40 hover:text-slate-200\"\n            )}\n          >\n            <UtensilsCrossed className=\"w-4 h-4\" />\n            <span>Cardápio Semanal</span>\n          </button>'''
saque_button = cardapio_button + '''\n\n          <button\n            onClick={() => switchTab('saque')}\n            className={cn(\n              \"w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all text-left\",\n              activeTab === 'saque' ? \"bg-emerald-950/40 text-emerald-300 border-l-4 border-emerald-600 font-semibold bg-slate-900\" : \"text-slate-400 hover:bg-slate-900/40 hover:text-slate-200\"\n            )}\n          >\n            <Beef className=\"w-4 h-4\" />\n            <span>Saque de Carnes</span>\n          </button>'''
t = replace_once(t, cardapio_button, saque_button, 'page-sidebar-saque')
t = replace_once(t,
    "              {activeTab === 'cardapio' && 'Cardápio Semanal de Aprovisionamento'}\n              {activeTab === 'profissional' && 'Fluxos Profissionais e Histórico'}",
    "              {activeTab === 'cardapio' && 'Cardápio Semanal de Aprovisionamento'}\n              {activeTab === 'saque' && 'Saque de Carnes'}\n              {activeTab === 'profissional' && 'Fluxos Profissionais e Histórico'}",
    'page-header-title')
t = replace_once(t,
    "            {activeTab !== 'inicio' && activeTab !== 'profissional' && <div className=\"relative max-w-xs hidden md:block\">",
    "            {activeTab !== 'inicio' && activeTab !== 'profissional' && activeTab !== 'saque' && <div className=\"relative max-w-xs hidden md:block\">",
    'page-search-exclude-saque')
t = replace_once(t,
    "        {activeTab === 'inicio' && (\n          <SyncStatus title=\"Cardápios semanais\" state={cardapioCloud.state} controller={cardapioCloud.controller} />\n        )}\n        <OperationalContextBar",
    "        {activeTab === 'inicio' && (\n          <SyncStatus title=\"Cardápios semanais\" state={cardapioCloud.state} controller={cardapioCloud.controller} />\n        )}\n        {(activeTab === 'inicio' || activeTab === 'saque') && (\n          <SyncStatus title=\"Operação do Saque de Carnes\" state={saqueCloud.state} controller={saqueCloud.controller} />\n        )}\n        <OperationalContextBar",
    'page-saque-sync')
t = replace_once(t,
    "            <CardapioSemanal onNotify={showToast} onAudit={recordCardapioAudit} searchQuery={cardapioSearch} />",
    "            <CardapioSemanal onNotify={showToast} onAudit={recordCardapioAudit} searchQuery={cardapioSearch} focusDate={cardapioFocusDate} />",
    'page-cardapio-focus')
t = replace_once(t,
    "          {/* BLOCO 3: FLUXOS PROFISSIONAIS */}\n          {activeTab === 'profissional' && (",
    "          {/* BLOCO 5: SAQUE DE CARNES OPERACIONAL */}\n          {activeTab === 'saque' && (\n            <SaqueCarnesOperacional\n              cardapios={cardapioCloud.state.records}\n              records={saqueCloud.state.records}\n              holidays={customHolidays}\n              onUpdateRecords={(records) => saqueCloud.controller.update(records)}\n              onOpenCardapioDay={openCardapioDay}\n              onNotify={showToast}\n            />\n          )}\n\n          {/* BLOCO 3: FLUXOS PROFISSIONAIS */}\n          {activeTab === 'profissional' && (",
    'page-saque-render')
t = replace_once(t,
    "<div className=\"rounded-xl border border-slate-200 p-4\"><strong className=\"text-slate-900\">Cardápio e Saque</strong><p className=\"text-slate-600 mt-1\">Use a prontidão antes de avançar o fluxo. Cardápios arquivados ficam somente para consulta até restauração.</p></div>",
    "<div className=\"rounded-xl border border-slate-200 p-4\"><strong className=\"text-slate-900\">Cardápio</strong><p className=\"text-slate-600 mt-1\">Use a prontidão antes de avançar o fluxo. Cardápios arquivados ficam somente para consulta até restauração.</p></div>\n              <div className=\"rounded-xl border border-slate-200 p-4\"><strong className=\"text-slate-900\">Saque de Carnes</strong><p className=\"text-slate-600 mt-1\">Acompanhe retirada, separação e conclusão dos itens sem alterar o Cardápio Semanal de origem.</p></div>",
    'page-help-saque')
p.write_text(t)

# components/CardapioSemanal.tsx
p = Path('components/CardapioSemanal.tsx')
t = p.read_text()
t = replace_once(t,
    "  onAudit?: (event: Omit<AuditEvent, 'id' | 'createdAt'>) => void;\n  searchQuery?: string;\n}",
    "  onAudit?: (event: Omit<AuditEvent, 'id' | 'createdAt'>) => void;\n  searchQuery?: string;\n  focusDate?: string;\n}",
    'cardapio-prop')
t = replace_once(t,
    "export default function CardapioSemanal({ onNotify, onAudit, searchQuery = '' }: CardapioSemanalProps) {",
    "export default function CardapioSemanal({ onNotify, onAudit, searchQuery = '', focusDate = '' }: CardapioSemanalProps) {",
    'cardapio-destructure')
t = replace_once(t,
    "  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);\n  const [editingFocusMeal, setEditingFocusMeal] = useState<'all' | 'cafe' | 'colacao' | 'almoco' | 'jantar' | 'ceia'>('all');\n  const [copySourceDayIndex, setCopySourceDayIndex] = useState<number | ''>('');",
    "  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);\n  const [editingFocusMeal, setEditingFocusMeal] = useState<'all' | 'cafe' | 'colacao' | 'almoco' | 'jantar' | 'ceia'>('all');\n  useEffect(() => {\n    if (!focusDate || cardapioCloud.state.status === 'loading') return;\n    const target = cardapiosList.find(item => item.dias.some(day => day.date === focusDate));\n    if (!target || target.archivedAt) return;\n    const dayIndex = target.dias.findIndex(day => day.date === focusDate);\n    if (dayIndex < 0) return;\n    setSelectedCardapioId(target.id);\n    setActiveSubView('EDITOR');\n    setEditingDayIndex(dayIndex);\n    setEditingFocusMeal('all');\n  }, [focusDate, cardapiosList, cardapioCloud.state.status]);\n  const [copySourceDayIndex, setCopySourceDayIndex] = useState<number | ''>('');",
    'cardapio-focus-effect')
p.write_text(t)

# components/OperationalDashboard.tsx
p = Path('components/OperationalDashboard.tsx')
t = p.read_text()
t = replace_once(t,
    "  rosterPending?: boolean;\n  cardapioPending?: boolean;\n  today?: string;",
    "  rosterPending?: boolean;\n  cardapioPending?: boolean;\n  saquePending?: boolean;\n  today?: string;",
    'dashboard-saque-pending-param')
t = t.replace("module: 'Saque',\n        actionTab: 'cardapio'", "module: 'Saque',\n        actionTab: 'saque'")
t = replace_once(t,
    "  if (params.rosterPending || params.cardapioPending) {",
    "  if (params.rosterPending || params.cardapioPending || params.saquePending) {",
    'dashboard-sync-pending')
t = replace_once(t,
    "<MetricCard icon={Beef} label=\"Saque de carnes hoje\" value={`${snapshot.meatKgToday.toLocaleString('pt-BR')} kg`} detail={`${snapshot.meatItemsToday} item(ns) para retirada`} onClick={() => onNavigate('cardapio')} />",
    "<MetricCard icon={Beef} label=\"Saque de carnes hoje\" value={`${snapshot.meatKgToday.toLocaleString('pt-BR')} kg`} detail={`${snapshot.meatItemsToday} item(ns) para retirada`} onClick={() => onNavigate('saque')} />",
    'dashboard-metric-link')
p.write_text(t)

# tests/firestore.browser.rules
p = Path('tests/firestore.browser.rules')
t = p.read_text().replace("group in ['roster', 'cardapios']", "group in ['roster', 'cardapios', 'saques']")
p.write_text(t)

# tests/firestore.integration.test.ts
p = Path('tests/firestore.integration.test.ts')
t = p.read_text()
t = replace_once(t,
    "import { validateCardapio } from '../lib/persistence/validation.ts';",
    "import { validateCardapio, validateSaqueOperational } from '../lib/persistence/validation.ts';",
    'firestore-test-import')
t = replace_once(t,
    "  const portOne = firestorePort<ReturnType<typeof sample>>(one.db, 'cardapios', validateCardapio);\n  const portTwo = firestorePort<ReturnType<typeof sample>>(two.db, 'cardapios', validateCardapio);",
    "  const portOne = firestorePort<ReturnType<typeof sample>>(one.db, 'cardapios', validateCardapio);\n  const portTwo = firestorePort<ReturnType<typeof sample>>(two.db, 'cardapios', validateCardapio);\n  const saquePort = firestorePort<any>(one.db, 'saques', validateSaqueOperational);",
    'firestore-test-port')
t = replace_once(t,
    "      await assert.rejects(getDocs(collection(denied.db, 'aprov_workspaces/hgesm/cardapios')),\n        (error: unknown) => !!error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied');",
    "      await assert.rejects(getDocs(collection(denied.db, 'aprov_workspaces/hgesm/cardapios')),\n        (error: unknown) => !!error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied');\n      await assert.rejects(getDocs(collection(denied.db, 'aprov_workspaces/hgesm/saques')),\n        (error: unknown) => !!error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied');",
    'firestore-test-denied-saque')
t = replace_once(t,
    "    assert.equal(first[id].revision, 1);",
    "    assert.equal(first[id].revision, 1);\n    const saqueId = 'saque-integration-' + Date.now();\n    const saqueData = {\n      id: saqueId, cardapioId: id, saqueItemId: 'item-1', status: 'SEPARADO',\n      updatedAt: new Date().toISOString(), history: [{ status: 'SEPARADO', at: new Date().toISOString() }]\n    };\n    const saqueCreated = await saquePort.commit({ id: 'create-' + saqueId, changes: [{ id: saqueId, data: saqueData, deleted: false, expectedRevision: 0 }] });\n    assert.equal(saqueCreated[saqueId].revision, 1);",
    'firestore-test-create-saque')
p.write_text(t)

# .github/workflows/validate.yml
p = Path('.github/workflows/validate.yml')
t = p.read_text()
t = replace_once(t,
    "      - name: Block 4B navigation and integration tests\n        run: |\n          node --test tests/block4b-navigation.test.ts\n          node tests/block4b-ui-smoke.mjs",
    "      - name: Block 4B navigation and integration tests\n        run: |\n          node --test tests/block4b-navigation.test.ts\n          node tests/block4b-ui-smoke.mjs\n      - name: Block 5 Saque de Carnes tests\n        run: |\n          node --test tests/block5-saque-operacional.test.ts\n          node tests/block5-ui-smoke.mjs",
    'workflow-block5-tests')
p.write_text(t)
