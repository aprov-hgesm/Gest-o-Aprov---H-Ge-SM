type MealLike = {
  arroz: string;
  feijao: string;
  proteina: string;
  tipoCarne?: string;
  quantidadeKg?: number | string;
  guarnicao: string;
  salada: string;
  bebida: string;
  sobremesa: string;
  carnesAdicionais?: Array<{ tipoCarne: string; quantidadeKg: number | string }>;
};

type DayLike = {
  diaSemanaLabel: string;
  cafeManhaCeia: string;
  colacaoPaciente: string;
  almoco: {
    geral: MealLike;
    pacienteProteina: string;
    pacienteTipoCarne?: string;
    pacienteQuantidadeKg?: number | string;
  };
  jantarPaciente: {
    prato: string;
    proteina?: string;
    tipoCarne?: string;
    quantidadeKg?: number | string;
  };
  ceia: string;
};

type CardapioLike = {
  organizacaoMilitar: string;
  divisao: string;
  cidade: string;
  uf: string;
  responsavelTecnico: { nome: string; postoGraduacao: string; funcao: string };
  workflow: {
    conferido: { responsavel: string };
    aprovado: { responsavel: string };
  };
  dias: DayLike[];
};

const blank = (value: unknown) => typeof value !== 'string' || value.trim().length === 0;
const positive = (value: unknown) => Number(value) > 0;

function checkMeatPair(missing: string[], label: string, cut: unknown, quantity: unknown) {
  const hasCut = !blank(cut);
  const hasQty = positive(quantity);
  if (hasCut && !hasQty) missing.push(`${label}: informe a quantidade em kg`);
  if (!hasCut && hasQty) missing.push(`${label}: selecione o corte/matéria-prima`);
}

export function getCardapioReadiness(cardapio: CardapioLike) {
  const missing: string[] = [];
  if (blank(cardapio.organizacaoMilitar)) missing.push('Organização militar');
  if (blank(cardapio.divisao)) missing.push('Divisão');
  if (blank(cardapio.cidade) || blank(cardapio.uf)) missing.push('Local de emissão');
  if (blank(cardapio.responsavelTecnico?.nome) || blank(cardapio.responsavelTecnico?.funcao)) missing.push('Responsável técnico');
  if (blank(cardapio.workflow?.conferido?.responsavel)) missing.push('Responsável pela conferência');
  if (blank(cardapio.workflow?.aprovado?.responsavel)) missing.push('Responsável pela aprovação');

  cardapio.dias.forEach(day => {
    const prefix = day.diaSemanaLabel || 'Dia';
    if (blank(day.cafeManhaCeia)) missing.push(`${prefix}: café da manhã/ceia`);
    if (blank(day.colacaoPaciente)) missing.push(`${prefix}: colação do paciente`);
    const general = day.almoco?.geral;
    if (!general || [general.arroz, general.feijao, general.proteina, general.guarnicao, general.salada, general.bebida, general.sobremesa].some(blank)) {
      missing.push(`${prefix}: almoço geral incompleto`);
    }
    if (blank(day.almoco?.pacienteProteina)) missing.push(`${prefix}: proteína do almoço do paciente`);
    if (blank(day.jantarPaciente?.prato) && blank(day.jantarPaciente?.proteina)) missing.push(`${prefix}: jantar do paciente`);
    if (blank(day.ceia)) missing.push(`${prefix}: ceia`);

    checkMeatPair(missing, `${prefix} / almoço geral`, general?.tipoCarne, general?.quantidadeKg);
    checkMeatPair(missing, `${prefix} / almoço paciente`, day.almoco?.pacienteTipoCarne, day.almoco?.pacienteQuantidadeKg);
    checkMeatPair(missing, `${prefix} / jantar paciente`, day.jantarPaciente?.tipoCarne, day.jantarPaciente?.quantidadeKg);
    general?.carnesAdicionais?.forEach((item, index) => {
      checkMeatPair(missing, `${prefix} / carne adicional ${index + 1}`, item.tipoCarne, item.quantidadeKg);
    });
  });

  const checks = 6 + cardapio.dias.length * 9;
  const passed = Math.max(0, checks - missing.length);
  return {
    ok: missing.length === 0,
    missing,
    passed,
    total: checks,
    percent: checks > 0 ? Math.round((passed / checks) * 100) : 100,
  };
}
