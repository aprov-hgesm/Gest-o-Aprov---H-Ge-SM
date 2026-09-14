export function sample(id: string) {
  return {
    id, dataInicio: '2026-09-14', dataFim: '2026-09-20', dataEmissao: '2026-09-14',
    cidade: 'Santa Maria', uf: 'RS', regiaoMilitar: '3', organizacaoMilitar: 'Teste', divisao: 'Aprov',
    workflow: { status: 'EM_ELABORACAO', conferido: { cargo: '', responsavel: '', status: 'PENDENTE' },
      aprovado: { cargo: '', responsavel: '', status: 'PENDENTE' } },
    lancheTexto: '', ceiaPacienteTexto: '', observacaoGeral: '', basicoCopaInternados: '',
    responsavelTecnico: { nome: '', postoGraduacao: '', funcao: '' },
    dias: Array.from({ length: 7 }, (_, index) => ({
      date: '2026-09-' + (14 + index), diaSemana: 'Dia', diaSemanaLabel: 'DIA',
      cafeManhaCeia: '', colacaoPaciente: '', ceia: '',
      almoco: { geral: { arroz: '', feijao: '', proteina: '', guarnicao: '', salada: '', bebida: '', sobremesa: '' },
        pacienteProteina: '' }, jantarPaciente: { prato: '' }
    }))
  };
}
