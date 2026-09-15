from pathlib import Path
import re

path = Path('app/page.tsx')
source = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    source = source.replace(old, new, 1)


def sub_once(pattern: str, replacement: str, label: str) -> None:
    global source
    source, count = re.subn(pattern, replacement, source, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')

# A única regra de seleção é o afastamento vigente na data, vindo da aba Afastamentos.
sub_once(
    r"    if \(milId !== 'empty'\) \{.*?\n    \}\n\n    const prevCell",
    "    if (milId !== 'empty' && isMilitaryAbsentOnDay(milId, day, absences)) {\n"
    "      showToast('Militar afastado nesta data. Finalize ou ajuste o afastamento na aba Afastamentos antes de escalá-lo.', 'info');\n"
    "      return;\n"
    "    }\n\n"
    "    const prevCell",
    'assignment guard',
)

replace_once(
    'Clique em qualquer célula de fim de semana ou feriado para designar militares, alterar tipo ou desmarcar.',
    'A designação é totalmente manual e não aplica rodízio, prioridade, especialidade, contagem de serviços ou regra entre dias. Apenas afastamentos cadastrados para a data impedem a seleção.',
    'manual notice',
)
replace_once(
    "{militaryList.filter(m => m.type !== 'EP').length} Militares Elegíveis",
    '{militaryList.length} Militares Cadastrados',
    'eligible badge',
)
replace_once(
    'Controle de efetivo, atribuição de funções e regras de rodízio para os plantões de fim de semana.',
    'Preenchimento manual sem rodízio ou prioridade automática. Somente afastamentos registrados na aba própria bloqueiam a seleção na respectiva data.',
    'section description',
)
replace_once('Efetivo da Escala Vermelha', 'Efetivo Cadastrado para Alocação Manual', 'personnel heading')
replace_once('Clique na função para alterar', 'Referência cadastral; não limita a seleção', 'personnel helper')
replace_once(
    "{militaryList.filter(m => m.type !== 'EP').map(m => (",
    '{militaryList.map(m => (',
    'personnel filter',
)
replace_once(
    'Dados acumulados de serviços cumpridos para orientar o operador a balancear os plantões de fim de semana manualmente.',
    'Dados acumulados exibidos apenas para consulta. Eles não alteram, ordenam nem priorizam a seleção manual dos militares.',
    'workload description',
)
replace_once('Ordem de Prioridade', 'Indicador Informativo', 'priority badge')

sub_once(
    r"\{\[\.\.\.militaryList\]\s*\.sort\(\(a, b\) => a\.dutyCount - b\.dutyCount\)\s*\.map\(mil => \{",
    '{militaryList.map(mil => {',
    'workload ordering',
)

# Na lista de designação, afastados somem; nenhum outro critério filtra ou ordena o efetivo.
needle = """                {militaryList
                  .filter(mil => {
                    if (!modalSearch) return true;
"""
replacement = """                {militaryList
                  .filter(mil => {
                    if (isMilitaryAbsentOnDay(mil.id, selectedCell.day, absences)) return false;
                    if (!modalSearch) return true;
"""
replace_once(needle, replacement, 'absence selection filter')

sub_once(
    r"\n                  \.sort\(\(a, b\) => \{\n                    // Match selected post specialty first\n.*?\n                  \}\)",
    '',
    'selection priority sort',
)

sub_once(
    r"\n                    const otherPostAssigned = Object\.keys\(roster\[selectedCell\.day\] \|\| \{\}\)\.find\(.*?\n                    const isSpecialist = mil\.specialty === selectedCell\.post \|\| mil\.specialtySecondary === selectedCell\.post;\n",
    '\n',
    'selection helper variables',
)

# Neutraliza o cartão: sem selo de especialista, contagem de serviços ou indicação de prioridade.
sub_once(
    r'''                        <div className="flex items-center gap-2\.5">\n                          <span className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center font-bold font-mono text-\[10px\] text-slate-600 shrink-0">\n                            \{mil\.dutyCount\}\n                          </span>\n                          <div>.*?\n                        </div>\n                        <div className="text-right shrink-0">.*?\n                        </div>''',
    '''                        <div className="flex items-center gap-2.5 min-w-0">\n                          <span className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600 shrink-0">\n                            {mil.name.slice(0, 2).toUpperCase()}\n                          </span>\n                          <div className="min-w-0">\n                            <p className="font-semibold text-slate-900 truncate">{mil.rank}. {mil.fullName}</p>\n                            <p className="text-[10px] text-slate-500 truncate">\n                              {mil.name} • {mil.specialty}{mil.specialtySecondary ? ` / ${mil.specialtySecondary}` : ''}\n                            </p>\n                          </div>\n                        </div>''',
    'neutral selection card',
)

replace_once(
    '              {/* Quick Search */}',
    '''              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 leading-relaxed">\n                Todos os militares sem afastamento vigente nesta data podem ser selecionados livremente. A lista não aplica prioridade ou bloqueio por função, contagem de serviços, tipo de escala, dia anterior ou dia seguinte.\n              </div>\n\n              {/* Quick Search */}''',
    'selection policy notice',
)

# Dispensa/LTS deve ser cadastrada na aba própria, não criada manualmente pela escala.
sub_once(
    r'''\n                  <button\n                    type="button"\n                    onClick=\{\(\) => setSelectedAssignType\('DISP'\)\}.*?\n                  </button>''',
    '',
    'manual dispensa button',
)

path.write_text(source, encoding='utf-8')
