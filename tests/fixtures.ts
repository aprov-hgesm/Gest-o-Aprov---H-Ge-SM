export function sample(id: string) {
  return {
    id, dataInicio: '2026-09-14', dataFim: '2026-09-20', dataEmissao: '2026-09-14',
    cidade: 'Santa Maria', uf: 'RS', regiaoMilitar: '3ª REGIÃO MILITAR', organizacaoMilitar: 'HGeSM', divisao: 'Aprovisionamento',
    workflow: { status: 'EM_ELABORACAO', conferido: { cargo: 'Chefe Fiscal Adm.', responsavel: 'CONFERENTE TESTE', status: 'PENDENTE' },
      aprovado: { cargo: 'Diretora HGeSM', responsavel: 'APROVADOR TESTE', status: 'PENDENTE' } },
    lancheTexto: 'Lanche conforme planejamento', ceiaPacienteTexto: 'Ceia conforme planejamento',
    observacaoGeral: 'Cardápio de teste.', basicoCopaInternados: 'Básico de teste.',
    responsavelTecnico: { nome: 'RESPONSÁVEL TESTE', postoGraduacao: '1º Ten', funcao: 'Nutricionista' },
    dias: Array.from({ length: 7 }, (_, index) => ({
      date: `2026-09-${String(14 + index).padStart(2, '0')}`,
      diaSemana: 'Dia', diaSemanaLabel: `DIA ${index + 1}`,
      cafeManhaCeia: 'Pão, café com leite e fruta',
      colacaoPaciente: 'Fruta',
      ceia: 'Chá e pão',
      almoco: {
        geral: {
          arroz: 'Arroz', feijao: 'Feijão', proteina: 'CARNE DE TESTE',
          tipoCarne: 'PATINHO', quantidadeKg: 10,
          guarnicao: 'Purê', salada: 'Salada', bebida: 'Suco', sobremesa: 'Fruta'
        },
        pacienteProteina: 'FRANGO GRELHADO', pacienteTipoCarne: 'PEITO', pacienteQuantidadeKg: 3
      },
      jantarPaciente: {
        prato: 'Arroz, feijão, legumes e sopa', proteina: 'FRANGO COZIDO',
        tipoCarne: 'PEITO', quantidadeKg: 2
      }
    }))
  };
}
