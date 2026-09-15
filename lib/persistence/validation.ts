type Obj = Record<string, unknown>;
const object = (value: unknown): value is Obj => !!value && typeof value === 'object' && !Array.isArray(value);
const strings = (value: Obj, keys: string[]) => keys.every(key => typeof value[key] === 'string');
const list = (value: unknown, validate: (item: unknown) => boolean) => Array.isArray(value) && value.every(validate);
const optional = (value: Obj, key: string, type: string) => value[key] === undefined || typeof value[key] === type;
const quantity = (value: unknown) => value === undefined || typeof value === 'string' ||
  (typeof value === 'number' && Number.isFinite(value));
const military = (value: unknown) => object(value) &&
  strings(value, ['id', 'rank', 'name', 'fullName', 'matricula', 'specialty']) &&
  ['Ativo', 'Afastado'].includes(String(value.status)) &&
  ['EP', 'EV', 'Ambas'].includes(String(value.type)) &&
  typeof value.dutyCount === 'number' && Number.isFinite(value.dutyCount);
const absence = (value: unknown) => object(value) &&
  strings(value, ['id', 'militaryId', 'militaryName', 'rank', 'type', 'startDate', 'endDate', 'notes']) &&
  typeof value.indefinite === 'boolean' && typeof value.autoUpdate === 'boolean' &&
  ['ATIVO', 'AGENDADO'].includes(String(value.status));
const cell = (value: unknown) => value === null || (object(value) &&
  strings(value, ['militaryId', 'militaryName', 'rank']) &&
  ['EP', 'EV', 'PERM', 'DISP'].includes(String(value.type)));
export function validateRoster(value: unknown): boolean {
  if (!object(value) || value.id !== 'principal' ||
      !list(value.militaryList, military) || !list(value.absences, absence) ||
      !list(value.changelogs, item => object(item) && strings(item, ['time', 'text'])) ||
      !list(value.customHolidays, item => object(item) && strings(item, ['id', 'date', 'name'])) ||
      !object(value.roster)) return false;
  return Object.values(value.roster).every(day => object(day) && Object.values(day).every(cell));
}
function day(value: unknown): boolean {
  if (!object(value) || !strings(value, ['date', 'diaSemana', 'diaSemanaLabel', 'cafeManhaCeia',
    'colacaoPaciente', 'ceia']) || !object(value.almoco) || !object(value.almoco.geral) ||
    typeof value.almoco.pacienteProteina !== 'string' ||
    !optional(value.almoco, 'pacienteTipoCarne', 'string') || !quantity(value.almoco.pacienteQuantidadeKg) ||
    !object(value.jantarPaciente) || typeof value.jantarPaciente.prato !== 'string' ||
    !optional(value.jantarPaciente, 'proteina', 'string') ||
    !optional(value.jantarPaciente, 'tipoCarne', 'string') || !quantity(value.jantarPaciente.quantidadeKg)) return false;
  const meal = value.almoco.geral;
  return strings(meal, ['arroz', 'feijao', 'proteina', 'guarnicao', 'salada', 'bebida', 'sobremesa']) &&
    quantity(meal.quantidadeKg) &&
    (meal.carnesAdicionais === undefined || list(meal.carnesAdicionais, item =>
      object(item) && typeof item.tipoCarne === 'string' && quantity(item.quantidadeKg))) &&
    optional(value, 'evento', 'string') && optional(value, 'feriado', 'boolean');
}
export function validateCardapio(value: unknown): boolean {
  if (!object(value) || !strings(value, ['id', 'dataInicio', 'dataFim', 'dataEmissao', 'cidade', 'uf',
    'regiaoMilitar', 'organizacaoMilitar', 'divisao', 'lancheTexto', 'ceiaPacienteTexto',
    'observacaoGeral', 'basicoCopaInternados']) || !object(value.workflow) ||
    !object(value.responsavelTecnico) ||
    !strings(value.responsavelTecnico, ['nome', 'postoGraduacao', 'funcao']) ||
    !Array.isArray(value.dias) || value.dias.length !== 7 || !value.dias.every(day)) return false;
  const workflow = value.workflow;
  return ['EM_ELABORACAO', 'CONFERIDO', 'APROVADO', 'FINALIZADO'].includes(String(workflow.status)) &&
    object(workflow.conferido) && strings(workflow.conferido, ['cargo', 'responsavel', 'status']) &&
    object(workflow.aprovado) && strings(workflow.aprovado, ['cargo', 'responsavel', 'status']);
}
