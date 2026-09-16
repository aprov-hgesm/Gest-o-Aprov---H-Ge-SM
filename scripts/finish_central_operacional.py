from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: esperado 1 trecho, encontrado {count}')
    return text.replace(old, new, 1)

# OperationalDashboard
p = Path('components/OperationalDashboard.tsx')
text = p.read_text()
text = replace_once(
    text,
    "import { gerarListaSaqueCarnes, type WeeklyCardapioDoc } from '@/components/CardapioSemanal';",
    "import { gerarListaSaqueCarnes, type WeeklyCardapioDoc } from '@/components/CardapioSemanal';\nimport OperationalCalendar from '@/components/OperationalCalendar';\nimport type { OperationalCalendarDay } from '@/lib/domain/operational-calendar';",
    'import calendário'
)
text = replace_once(
    text,
    "  return { cardapio: sorted.at(-1), upcoming: false };",
    "  return { cardapio: undefined, upcoming: false };",
    'não reutilizar cardápio vencido'
)
text = replace_once(
    text,
    "  const readiness = cardapio ? getCardapioReadiness(cardapio) : null;\n  const meatItems = cardapio ? gerarListaSaqueCarnes(cardapio.dias) : [];\n  const meatToday = meatItems.filter(item => item.dataSaqueIso === today && item.quantidadeKg > 0);\n  const meatKgToday = meatToday.reduce((sum, item) => sum + item.quantidadeKg, 0);\n  const zeroQuantityItems = meatItems.filter(item => item.tipoCarne && item.quantidadeKg <= 0);",
    "  const readiness = cardapio ? getCardapioReadiness(cardapio) : null;\n  const meatItems = params.cardapios.flatMap(item => gerarListaSaqueCarnes(item.dias));\n  const meatToday = meatItems.filter(item => item.dataSaqueIso === today && item.quantidadeKg > 0);\n  const meatKgToday = meatToday.reduce((sum, item) => sum + item.quantidadeKg, 0);\n  const meatHorizon = addDays(today, 13);\n  const zeroQuantityItems = meatItems.filter(item => item.tipoCarne && item.quantidadeKg <= 0 && item.diaCardapioIso >= today && item.diaCardapioIso <= meatHorizon);",
    'saque consolidado de todas as semanas'
)
text = replace_once(
    text,
    "export default function OperationalDashboard({\n  snapshot,\n  onNavigate\n}: {\n  snapshot: OperationalSnapshot;\n  onNavigate: (tab: OperationalTab) => void;\n}) {",
    "export default function OperationalDashboard({\n  snapshot,\n  calendarDays,\n  onNavigate\n}: {\n  snapshot: OperationalSnapshot;\n  calendarDays: OperationalCalendarDay[];\n  onNavigate: (tab: OperationalTab) => void;\n}) {",
    'prop calendário'
)
marker = "    </div>\n  );\n}\n"
idx = text.rfind(marker)
if idx < 0:
    raise SystemExit('fechamento do dashboard não encontrado')
text = text[:idx] + "      <OperationalCalendar days={calendarDays} onNavigate={onNavigate} />\n\n" + text[idx:]
p.write_text(text)

# app/page.tsx
p = Path('app/page.tsx')
text = p.read_text()
text = replace_once(
    text,
    "import CardapioSemanal, { initialWeeklyCardapio, type WeeklyCardapioDoc } from '@/components/CardapioSemanal';",
    "import CardapioSemanal, { gerarListaSaqueCarnes, initialWeeklyCardapio, type WeeklyCardapioDoc } from '@/components/CardapioSemanal';",
    'import saque'
)
text = replace_once(
    text,
    "import OperationalDashboard, { OperationalAlertsPanel, buildOperationalSnapshot, type OperationalTab } from '@/components/OperationalDashboard';",
    "import OperationalDashboard, { OperationalAlertsPanel, buildOperationalSnapshot, type OperationalTab } from '@/components/OperationalDashboard';\nimport { buildOperationalCalendar, mergeOperationalAlerts } from '@/lib/domain/operational-calendar';",
    'import domínio calendário'
)
old = """  const operationalSnapshot = buildOperationalSnapshot({
    militaryList,
    absences,
    roster,
    cardapios: cardapioCloud.state.records,
    rosterPending: rosterCloud.state.pending,
    cardapioPending: cardapioCloud.state.pending
  });"""
new = """  const operationalMeatItems = cardapioCloud.state.records.flatMap(item => gerarListaSaqueCarnes(item.dias));
  const operationalCalendar = buildOperationalCalendar({
    roster,
    absences,
    cardapios: cardapioCloud.state.records,
    meatItems: operationalMeatItems,
    horizonDays: 14,
  });
  const operationalSnapshotBase = buildOperationalSnapshot({
    militaryList,
    absences,
    roster,
    cardapios: cardapioCloud.state.records,
    rosterPending: rosterCloud.state.pending,
    cardapioPending: cardapioCloud.state.pending
  });
  const operationalSnapshot = {
    ...operationalSnapshotBase,
    alerts: mergeOperationalAlerts([
      ...operationalSnapshotBase.alerts,
      ...operationalCalendar.alerts,
    ]),
  };"""
text = replace_once(text, old, new, 'snapshot e calendário')
text = replace_once(
    text,
    "<OperationalDashboard snapshot={operationalSnapshot} onNavigate={switchTab} />",
    "<OperationalDashboard snapshot={operationalSnapshot} calendarDays={operationalCalendar.days} onNavigate={switchTab} />",
    'render calendário'
)
p.write_text(text)

# workflow validation
p = Path('.github/workflows/validate.yml')
text = p.read_text()
text = replace_once(
    text,
    "      - name: Functional integrity tests\n        run: node --test tests/integrity-functional.test.ts\n      - name: Manual roster selection rules",
    "      - name: Functional integrity tests\n        run: node --test tests/integrity-functional.test.ts\n      - name: Operational calendar tests\n        run: node --test tests/operational-calendar.test.ts\n      - name: Manual roster selection rules",
    'teste calendário no CI'
)
p.write_text(text)

print('Bloco 2 integrado: calendário, alertas cruzados e saque consolidado')
