export type OperationalTab = 'inicio' | 'dashboard' | 'efetivo' | 'afastamentos' | 'cardapio' | 'saque' | 'profissional';
export type ProfessionalSection = 'historico' | 'permutas' | 'cardapios' | 'configuracoes';

export interface OperationalNavigationAction {
  id: string;
  label: string;
  tab?: OperationalTab;
  professionalSection?: ProfessionalSection;
}

export interface OperationalNavigationContext {
  label: string;
  description: string;
  actions: OperationalNavigationAction[];
}

const contexts: Record<OperationalTab, OperationalNavigationContext> = {
  inicio: {
    label: 'Central Operacional',
    description: 'Visão consolidada da operação, alertas e pendências dos módulos.',
    actions: [
      { id: 'escalas', label: 'Escalas', tab: 'dashboard' },
      { id: 'efetivo', label: 'Efetivo', tab: 'efetivo' },
      { id: 'afastamentos', label: 'Afastamentos', tab: 'afastamentos' },
      { id: 'cardapio', label: 'Cardápio', tab: 'cardapio' },
      { id: 'saque', label: 'Saque de Carnes', tab: 'saque' },
    ],
  },
  dashboard: {
    label: 'Gestão de Escalas',
    description: 'Designação manual, feriados, vagas e acompanhamento da escala.',
    actions: [
      { id: 'central', label: 'Central Operacional', tab: 'inicio' },
      { id: 'efetivo', label: 'Efetivo', tab: 'efetivo' },
      { id: 'afastamentos', label: 'Afastamentos', tab: 'afastamentos' },
      { id: 'permutas', label: 'Histórico de Permutas', professionalSection: 'permutas' },
    ],
  },
  efetivo: {
    label: 'Gerenciar Efetivo',
    description: 'Cadastro do militar, funções, situação operacional e carga informativa.',
    actions: [
      { id: 'central', label: 'Central Operacional', tab: 'inicio' },
      { id: 'escalas', label: 'Escalas', tab: 'dashboard' },
      { id: 'afastamentos', label: 'Afastamentos', tab: 'afastamentos' },
      { id: 'config', label: 'Configurações', professionalSection: 'configuracoes' },
    ],
  },
  afastamentos: {
    label: 'Afastamentos',
    description: 'Registro, vigência, retorno e histórico dos afastamentos do efetivo.',
    actions: [
      { id: 'central', label: 'Central Operacional', tab: 'inicio' },
      { id: 'efetivo', label: 'Efetivo', tab: 'efetivo' },
      { id: 'escalas', label: 'Escalas', tab: 'dashboard' },
      { id: 'historico', label: 'Histórico Operacional', professionalSection: 'historico' },
    ],
  },
  cardapio: {
    label: 'Cardápio Semanal',
    description: 'Edição semanal, prontidão e fluxo documental do cardápio.',
    actions: [
      { id: 'central', label: 'Central Operacional', tab: 'inicio' },
      { id: 'saque', label: 'Saque de Carnes', tab: 'saque' },
      { id: 'versoes', label: 'Versões e Arquivo', professionalSection: 'cardapios' },
      { id: 'historico', label: 'Histórico', professionalSection: 'historico' },
    ],
  },
  saque: {
    label: 'Saque de Carnes',
    description: 'Retirada, separação, descongelamento e rastreabilidade operacional das carnes.',
    actions: [
      { id: 'central', label: 'Central Operacional', tab: 'inicio' },
      { id: 'cardapio', label: 'Cardápio Semanal', tab: 'cardapio' },
      { id: 'historico', label: 'Histórico Operacional', professionalSection: 'historico' },
      { id: 'config', label: 'Configurações', professionalSection: 'configuracoes' },
    ],
  },
  profissional: {
    label: 'Fluxos Profissionais',
    description: 'Auditoria, permutas, versões, arquivo e parâmetros administrativos.',
    actions: [
      { id: 'central', label: 'Central Operacional', tab: 'inicio' },
      { id: 'escalas', label: 'Escalas', tab: 'dashboard' },
      { id: 'cardapio', label: 'Cardápio', tab: 'cardapio' },
      { id: 'saque', label: 'Saque de Carnes', tab: 'saque' },
      { id: 'efetivo', label: 'Efetivo', tab: 'efetivo' },
    ],
  },
};

export function getOperationalNavigationContext(tab: OperationalTab): OperationalNavigationContext {
  return contexts[tab];
}

export function cardapioMatchesSearch(
  cardapio: {
    id: string;
    dataInicio: string;
    dataFim: string;
    workflow: { status: string };
    dias?: unknown[];
    archivedAt?: string;
    archiveReason?: string;
  },
  query: string,
): boolean {
  const normalized = query.trim().toLocaleLowerCase('pt-BR');
  if (!normalized) return true;
  const searchable = [
    cardapio.id,
    cardapio.dataInicio,
    cardapio.dataFim,
    cardapio.workflow.status,
    cardapio.archivedAt ? 'arquivado' : 'ativo',
    cardapio.archiveReason || '',
    JSON.stringify(cardapio.dias || []),
  ].join(' ').toLocaleLowerCase('pt-BR');
  return searchable.includes(normalized);
}
