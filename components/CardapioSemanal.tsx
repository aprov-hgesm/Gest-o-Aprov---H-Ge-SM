'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Download, 
  Loader2,
  FileText, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  Plus, 
  Copy, 
  RotateCcw, 
  Archive,
  X, 
  Check, 
  UserCheck, 
  ShieldCheck, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  Info,
  CalendarDays,
  UtensilsCrossed,
  Trash2,
  Beef,
  Snowflake,
  Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import SyncStatus from '@/components/SyncStatus';
import { useCloudData } from '@/hooks/use-cloud-data';
import { validateCardapio } from '@/lib/persistence/validation';
import { getCardapioReadiness } from '@/lib/domain/cardapio-readiness';
import type { AuditEvent } from '@/lib/domain/professional-flows';
import { cardapioMatchesSearch } from '@/lib/domain/operational-navigation';

// Quick meal presets for fast editing
const PRESET_PROTEINAS = [
  'LOMBO A CALIFÓRNIA',
  'FRANGO ASSADO',
  'BIFE A ROLÊ',
  'PEIXE AO FORNO',
  'CARNE MOÍDA REFOGADA',
  'ALCATRA GRELHADA',
  'COXA E SOBRECOXA',
  'COSTELA ASSADA',
  'STROGONOFF DE CARNE'
];

const PRESET_GUARNICOES = [
  'purê de batatas',
  'polenta assada',
  'mandioca com bacon',
  'macarrão alho e óleo',
  'farofa rica de legumes',
  'legumes ao vapor',
  'batata doce assada'
];

const PRESET_SALADAS = [
  'saladas diversas',
  'mix de folhas verdes',
  'salada de maionese caseira',
  'salada russa',
  'tomate e pepino'
];

const PRESET_PACIENTE = [
  'PEITO FRANGO GRELHADO',
  'CARNE BOVINA MAGRA MOÍDA',
  'FILÉ DE PEIXE COZIDO',
  'ISCAS DE CARNE GRELHADA'
];

// Opções oficiais para tipo/corte da carne (detalhamento interno da refeição para Saque de Carnes)
export const TIPOS_CARNE_OPCOES = [
  'MAMINHA',
  'LAGARTO',
  'MIOLO DE ALCATRA',
  'FRALDINHA',
  'PATINHO',
  'COXÃO DURO',
  'COXÃO MOLE',
  'BISTECA',
  'PERNIL',
  'LOMBO',
  'PEITO',
  'SASSAMI',
  'CONTRA FILÉ',
  'PEIXE- TILÁPIA',
  'COXA E SOBRECOXA',
  'PEIXE - MERLUZA',
  'SALCICHÃO',
  'LINGUIÇA'
] as const;

export type TipoCarneOpcao = typeof TIPOS_CARNE_OPCOES[number];

// Regras regulamentares de antecedência para descongelamento sob refrigeração
export const REGRAS_DESCONGELAMENTO: Record<string, { diasAntecedencia: number; observacao?: string }> = {
  'MAMINHA': { diasAntecedencia: 2, observacao: 'Retirar com 2 dias de antecedência para descongelar' },
  'LAGARTO': { diasAntecedencia: 2, observacao: 'Retirar com 2 dias de antecedência para descongelar' },
  'MIOLO DE ALCATRA': { diasAntecedencia: 3, observacao: 'Retirar com 3 dias de antecedência para descongelar' },
  'FRALDINHA': { diasAntecedencia: 2, observacao: 'Retirar com 2 dias de antecedência para descongelar' },
  'PATINHO': { diasAntecedencia: 3, observacao: 'Retirar com 3 dias de antecedência para descongelar' },
  'COXÃO DURO': { diasAntecedencia: 3, observacao: 'Retirar com 3 dias de antecedência para descongelar' },
  'COXÃO MOLE': { diasAntecedencia: 3, observacao: 'Retirar com 3 dias de antecedência para descongelar' },
  'BISTECA': { diasAntecedencia: 2, observacao: 'Retirar com 2 dias de antecedência para descongelar' },
  'PERNIL': { diasAntecedencia: 3, observacao: 'Retirar com 3 dias de antecedência para descongelar' },
  'LOMBO': { diasAntecedencia: 2, observacao: 'Retirar com 2 dias de antecedência para descongelar' },
  'PEITO': { diasAntecedencia: 2, observacao: 'Retirar com 2 dias de antecedência para descongelar' },
  'SASSAMI': { diasAntecedencia: 2, observacao: 'Retirar com 2 dias de antecedência para descongelar' },
  'CONTRA FILÉ': { diasAntecedencia: 2, observacao: 'Retirar com 2 dias de antecedência para descongelar' },
  'PEIXE- TILÁPIA': { diasAntecedencia: 2, observacao: 'Retirar com 2 dias de antecedência para descongelar' },
  'COXA E SOBRECOXA': { diasAntecedencia: 2, observacao: 'Retirar com 2 dias de antecedência para descongelar' },
  'PEIXE - MERLUZA': { diasAntecedencia: 2, observacao: 'Retirar com 2 dias de antecedência para descongelar' },
  'SALCICHÃO': { diasAntecedencia: 2, observacao: 'Retirar com 2 dias de antecedência para descongelar' },
  'LINGUIÇA': { diasAntecedencia: 2, observacao: 'Retirar com 2 dias de antecedência para descongelar' }
};

// =========================================================================
// TYPES & DATA STRUCTURES (Structured model requested by the specification)
// =========================================================================

export interface CarneAdicional {
  tipoCarne: string;
  quantidadeKg: number | string;
  observacao?: string;
}

export interface MealAlmocoGeral {
  arroz: string;
  feijao: string;
  proteina: string; // Preparação exibida no cardápio impresso/A4 em negrito e maiúsculas
  tipoCarne?: string; // Tipo da carne (corte/matéria-prima) - apenas detalhamento interno, não consta na exibição do cardápio A4
  quantidadeKg?: number | string; // Quantidade em kg para o saque de carnes (detalhamento interno)
  carnesAdicionais?: CarneAdicional[]; // Carnes adicionais para preparações com múltiplos cortes (ex: Maminha e Linguiça)
  guarnicao: string;
  salada: string;
  bebida: string;
  sobremesa: string;
}

export interface DayCardapio {
  date: string; // ISO format 'YYYY-MM-DD'
  diaSemana: string; // 'Segunda', 'Terça', etc.
  diaSemanaLabel: string; // '2ª FEIRA', '3ª FEIRA', ..., 'SÁBADO', 'DOMINGO'
  evento?: string; // e.g. 'EVENTO'
  feriado?: boolean;
  feriadoNome?: string; // e.g. 'Feriado Farroupilha'
  destaqueManual?: boolean;

  cafeManhaCeia: string; // Linha 1
  colacaoPaciente: string; // Linha 2
  almoco: {
    geral: MealAlmocoGeral;
    pacienteProteina: string; // Preparação exibida no cardápio do paciente
    pacienteTipoCarne?: string; // Corte/matéria-prima para o Saque de Carnes
    pacienteQuantidadeKg?: number | string; // Quantidade em kg para o Saque de Carnes
  };
  jantarPaciente: {
    prato: string;
    proteina?: string;
    tipoCarne?: string; // Corte/matéria-prima para o Saque de Carnes
    quantidadeKg?: number | string; // Quantidade em kg para o Saque de Carnes
  };
  ceia: string; // Linha 7
}

export type WorkflowStatus = 'EM_ELABORACAO' | 'CONFERIDO' | 'APROVADO' | 'FINALIZADO';

export interface CardapioWorkflow {
  status: WorkflowStatus;
  conferido: {
    cargo: string;
    responsavel: string;
    data?: string;
    status: 'PENDENTE' | 'CONFERIDO';
  };
  aprovado: {
    cargo: string;
    responsavel: string;
    data?: string;
    status: 'PENDENTE' | 'APROVADO';
  };
}

export interface CardapioVersionSnapshot {
  id: string;
  version: number;
  createdAt: string;
  reason: string;
  workflowStatus: WorkflowStatus;
  snapshot: string;
}

export interface WeeklyCardapioDoc {
  id: string; // 'cardapio-2026-09-14'
  dataInicio: string; // '2026-09-14' (Monday)
  dataFim: string; // '2026-09-20' (Sunday)
  dataEmissao: string; // '2026-09-09'
  cidade: string; // 'Santa Maria'
  uf: string; // 'RS'

  regiaoMilitar: string; // '3ª REGIÃO MILITAR'
  organizacaoMilitar: string; // 'HOSPITAL GERAL DE SANTA MARIA'
  divisao: string; // 'APROVISIONAMENTO'

  workflow: CardapioWorkflow;

  lancheTexto: string; // 'OLHAR CARDÁPIO DE PACIENTES COPA'
  ceiaPacienteTexto: string; // 'OLHAR CARDÁPIO DE PACIENTES COPA'

  observacaoGeral: string;
  basicoCopaInternados: string;

  responsavelTecnico: {
    nome: string;
    postoGraduacao: string;
    funcao: string;
  };

  dias: DayCardapio[];

  version?: number;
  versions?: CardapioVersionSnapshot[];
  archivedAt?: string;
  archiveReason?: string;
  lastChangeReason?: string;
}

export function createCardapioVersionSnapshot(doc: WeeklyCardapioDoc, reason: string): CardapioVersionSnapshot {
  const version = doc.version || 1;
  const cleanSnapshot = JSON.parse(JSON.stringify({ ...doc, versions: undefined })) as WeeklyCardapioDoc;
  return {
    id: `version-${doc.id}-${version}-${Date.now()}`,
    version,
    createdAt: new Date().toISOString(),
    reason,
    workflowStatus: doc.workflow.status,
    snapshot: JSON.stringify(cleanSnapshot)
  };
}

// =========================================================================
// DATE HELPERS
// =========================================================================

const MONTH_NAMES_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

const DAY_LABELS = [
  '2ª FEIRA',
  '3ª FEIRA',
  '4ª FEIRA',
  '5ª FEIRA',
  '6ª FEIRA',
  'SÁBADO',
  'DOMINGO'
];

const DAY_NAMES = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo'
];

export const parseIsoDate = (isoStr: string): Date => {
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const formatIsoDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDdmmyyyy = (isoStr: string): string => {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
};

export interface ItemSaqueProcessado {
  id: string;
  diaCardapioIso: string;
  diaSemanaCardapioLabel: string;
  preparacao: string;
  origem: 'ALMOÇO GERAL' | 'ALMOÇO PACIENTE' | 'JANTAR PACIENTE';
  tipoCarne: string;
  quantidadeKg: number;
  diasAntecedencia: number;
  dataSaqueIso: string;
  dataSaqueFormatada: string;
  diaSemanaSaque: string;
  ehFimDeSemana: boolean;
  observacao?: string;
  diaIndex: number;
  isAdicional?: boolean;
}

export const calcularDataSaque = (dataCardapioIso: string, diasAntecedencia: number) => {
  if (!dataCardapioIso) {
    return {
      dataSaqueIso: '',
      dataSaqueFormatada: '',
      diaSemanaSaque: '',
      ehFimDeSemana: false
    };
  }
  const [y, m, d] = dataCardapioIso.split('-').map(Number);
  const data = new Date(y, m - 1, d);
  data.setDate(data.getDate() - diasAntecedencia);

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  const dataSaqueIso = `${ano}-${mes}-${dia}`;

  const diaSemanaIndex = data.getDay(); // 0 = Domingo, 6 = Sábado
  const diasSemanaExtenso = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
  ];

  return {
    dataSaqueIso,
    dataSaqueFormatada: `${dia}/${mes}/${ano}`,
    diaSemanaSaque: diasSemanaExtenso[diaSemanaIndex],
    ehFimDeSemana: diaSemanaIndex === 0 || diaSemanaIndex === 6
  };
};

export const gerarListaSaqueCarnes = (dias: DayCardapio[]): ItemSaqueProcessado[] => {
  const lista: ItemSaqueProcessado[] = [];

  const adicionarItem = (params: {
    id: string;
    dia: DayCardapio;
    dayIdx: number;
    preparacao: string;
    origem: ItemSaqueProcessado['origem'];
    tipoCarne?: string;
    quantidadeKg?: number | string;
    observacao?: string;
    isAdicional?: boolean;
  }) => {
    if (!params.tipoCarne) return;
    const regra = REGRAS_DESCONGELAMENTO[params.tipoCarne] || { diasAntecedencia: 2 };
    const calc = calcularDataSaque(params.dia.date, regra.diasAntecedencia);
    const qtd = Number(params.quantidadeKg) || 0;

    lista.push({
      id: params.id,
      diaCardapioIso: params.dia.date,
      diaSemanaCardapioLabel: params.dia.diaSemanaLabel,
      preparacao: params.preparacao,
      origem: params.origem,
      tipoCarne: params.tipoCarne,
      quantidadeKg: qtd,
      diasAntecedencia: regra.diasAntecedencia,
      dataSaqueIso: calc.dataSaqueIso,
      dataSaqueFormatada: calc.dataSaqueFormatada,
      diaSemanaSaque: calc.diaSemanaSaque,
      ehFimDeSemana: calc.ehFimDeSemana,
      observacao: params.observacao,
      diaIndex: params.dayIdx,
      isAdicional: params.isAdicional ?? false
    });
  };

  dias.forEach((dia, dayIdx) => {
    adicionarItem({
      id: `saque-${dia.date}-almoco-geral`,
      dia,
      dayIdx,
      preparacao: dia.almoco?.geral?.proteina || 'Proteína do almoço geral a definir',
      origem: 'ALMOÇO GERAL',
      tipoCarne: dia.almoco?.geral?.tipoCarne,
      quantidadeKg: dia.almoco?.geral?.quantidadeKg
    });

    dia.almoco?.geral?.carnesAdicionais?.forEach((adicional, adIdx) => {
      adicionarItem({
        id: `saque-${dia.date}-almoco-geral-adicional-${adIdx}`,
        dia,
        dayIdx,
        preparacao: `${dia.almoco.geral.proteina || 'Almoço geral'} (Corte Adicional)`,
        origem: 'ALMOÇO GERAL',
        tipoCarne: adicional.tipoCarne,
        quantidadeKg: adicional.quantidadeKg,
        observacao: adicional.observacao,
        isAdicional: true
      });
    });

    adicionarItem({
      id: `saque-${dia.date}-almoco-paciente`,
      dia,
      dayIdx,
      preparacao: dia.almoco?.pacienteProteina || 'Proteína do almoço do paciente a definir',
      origem: 'ALMOÇO PACIENTE',
      tipoCarne: dia.almoco?.pacienteTipoCarne,
      quantidadeKg: dia.almoco?.pacienteQuantidadeKg
    });

    adicionarItem({
      id: `saque-${dia.date}-jantar-paciente`,
      dia,
      dayIdx,
      preparacao: dia.jantarPaciente?.proteina || 'Proteína do jantar do paciente a definir',
      origem: 'JANTAR PACIENTE',
      tipoCarne: dia.jantarPaciente?.tipoCarne,
      quantidadeKg: dia.jantarPaciente?.quantidadeKg
    });
  });

  lista.sort((a, b) => {
    const byDate = a.dataSaqueIso.localeCompare(b.dataSaqueIso);
    if (byDate !== 0) return byDate;
    const byConsumptionDay = a.diaCardapioIso.localeCompare(b.diaCardapioIso);
    if (byConsumptionDay !== 0) return byConsumptionDay;
    return a.origem.localeCompare(b.origem);
  });

  return lista;
};

export const generateWeeklyDates = (mondayIso: string): DayCardapio[] => {
  const mon = parseIsoDate(mondayIso);
  const days: DayCardapio[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    const dateStr = formatIsoDate(d);

    days.push({
      date: dateStr,
      diaSemana: DAY_NAMES[i],
      diaSemanaLabel: DAY_LABELS[i],
      evento: i === 2 ? 'EVENTO' : undefined,
      feriado: i === 6,
      feriadoNome: i === 6 ? 'feriado' : undefined,
      cafeManhaCeia: 'Pão francês, margarina, café com leite, fruta',
      colacaoPaciente: 'Fruta da estação ou biscoito integral',
      almoco: {
        geral: {
          arroz: 'Arroz',
          feijao: 'Feijão',
          proteina: i === 0 ? 'LOMBO A CALIFÓRNIA' : i === 1 ? 'COXA E SOBRECOXA EMPANADA' : i === 2 ? 'MAMINHA E LINGUIÇA' : i === 3 ? 'BIFE A ROLE AO MOLHO' : i === 4 ? 'PEIXE AO FORNO COM BATATAS' : i === 5 ? 'FRANGO ASSADO COM ERVAS' : 'COSTELA BOVINA ASSADA',
          tipoCarne: i === 0 ? 'LOMBO' : i === 1 ? 'COXA E SOBRECOXA' : i === 2 ? 'MAMINHA' : i === 3 ? 'COXÃO MOLE' : i === 4 ? 'PEIXE- TILÁPIA' : i === 5 ? 'COXA E SOBRECOXA' : 'CONTRA FILÉ',
          quantidadeKg: i === 0 ? 45 : i === 1 ? 65 : i === 2 ? 40 : i === 3 ? 48 : i === 4 ? 40 : i === 5 ? 55 : 50,
          carnesAdicionais: i === 2 ? [{ tipoCarne: 'LINGUIÇA', quantidadeKg: 15, observacao: 'Embutido do evento/almoço especial' }] : undefined,
          guarnicao: i === 0 ? 'polenta assada' : i === 2 ? 'maionese de mandioca' : 'purê de batatas',
          salada: 'saladas diversas',
          bebida: 'suco',
          sobremesa: 'fruta ou sobremesa'
        },
        pacienteProteina: i === 2 ? 'ALCATRA GRELHADA EM TIRAS' : 'PEITO FRANGO GRELHADO',
        pacienteTipoCarne: '',
        pacienteQuantidadeKg: ''
      },
      jantarPaciente: {
        proteina: '',
        tipoCarne: '',
        quantidadeKg: '',
        prato: 'Arroz, feijão, ISCAS DE CARNE ACEBOLADA, legumes ao vapor, sopa de legumes, fruta'
      },
      ceia: 'Chá mate, pão francês com queijo, biscoito doce'
    });
  }

  return days;
};

export const formatCardapioTitle = (startIso: string, endIso: string): string => {
  if (!startIso || !endIso) return '';
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  const dayStart = start.getDate();
  const dayEnd = end.getDate();
  const monthName = MONTH_NAMES_PT[end.getMonth()];
  const year = end.getFullYear();

  return `Cardápio semanal de ${dayStart} a ${dayEnd} de ${monthName} de ${year}`;
};

export const formatExtensiveLocation = (dateIso: string, city: string, uf: string): string => {
  if (!dateIso) return `Quartel em ${city} – ${uf}`;
  const d = parseIsoDate(dateIso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTH_NAMES_PT[d.getMonth()];
  const year = d.getFullYear();
  return `Quartel em ${city} – ${uf}, ${day} de ${month} de ${year}.`;
};

// =========================================================================
// INITIAL REFERENCE TEMPLATE (HGeSM Default Week of Sep 14-20, 2026)
// =========================================================================

export const initialWeeklyCardapio: WeeklyCardapioDoc = {
  id: 'cardapio-2026-09-14',
  dataInicio: '2026-09-14',
  dataFim: '2026-09-20',
  dataEmissao: '2026-09-09',
  cidade: 'Santa Maria',
  uf: 'RS',

  regiaoMilitar: '3ª REGIÃO MILITAR',
  organizacaoMilitar: 'HOSPITAL GERAL DE SANTA MARIA',
  divisao: 'APROVISIONAMENTO',

  workflow: {
    status: 'EM_ELABORACAO',
    conferido: {
      cargo: 'Chefe Fiscal Adm.',
      responsavel: 'Cap. Aprovisionador Silva',
      data: '09/09/2026',
      status: 'PENDENTE'
    },
    aprovado: {
      cargo: 'Diretora HGeSM',
      responsavel: 'Cel. Diretora Médica',
      data: '10/09/2026',
      status: 'PENDENTE'
    }
  },

  lancheTexto: 'OLHAR CARDÁPIO DE PACIENTES COPA',
  ceiaPacienteTexto: 'OLHAR CARDÁPIO DE PACIENTES COPA',

  observacaoGeral: 'Obs.: Este cardápio poderá sofrer alterações tendo em vista o fornecimento de gêneros.',
  basicoCopaInternados: 'Básico para a copa dos internados: gelatina, fruta, água mineral, iogurte, doce, sopa, bolachas e suplementos nutricionais.',

  responsavelTecnico: {
    nome: 'ROBERTA ROGGIA FRIEDRICH CANZIAN',
    postoGraduacao: '1º Ten',
    funcao: 'NUTRICIONISTA'
  },

  dias: [
    {
      date: '2026-09-14',
      diaSemana: 'Segunda',
      diaSemanaLabel: '2ª FEIRA',
      cafeManhaCeia: 'Pão francês, margarina, café com leite, fruta (banana)',
      colacaoPaciente: 'Fruta (maçã) ou biscoito integral',
      almoco: {
        geral: {
          arroz: 'Arroz',
          feijao: 'Feijão',
          proteina: 'LOMBO A CALIFÓRNIA',
          tipoCarne: 'LOMBO',
          quantidadeKg: 45,
          guarnicao: 'polenta assada',
          salada: 'saladas diversas',
          bebida: 'suco',
          sobremesa: 'fruta ou sobremesa'
        },
        pacienteProteina: 'PEITO FRANGO GRELHADO'
      },
      jantarPaciente: {
        prato: 'Arroz, feijão, ISCAS DE CARNE ACEBOLADA, legumes ao vapor, sopa de legumes, fruta'
      },
      ceia: 'Chá mate, pão francês com queijo, biscoito doce'
    },
    {
      date: '2026-09-15',
      diaSemana: 'Terça',
      diaSemanaLabel: '3ª FEIRA',
      cafeManhaCeia: 'Pão francês, margarina, café com leite, maçã',
      colacaoPaciente: 'Fruta (mamão) ou iogurte natural',
      almoco: {
        geral: {
          arroz: 'Arroz',
          feijao: 'Feijão',
          proteina: 'COXA E SOBRECOXA EMPANADA',
          tipoCarne: 'COXA E SOBRECOXA',
          quantidadeKg: 65,
          guarnicao: 'purê de batatas',
          salada: 'mix de folhas verdes, beterraba cozida',
          bebida: 'suco de uva',
          sobremesa: 'melancia'
        },
        pacienteProteina: 'FILÉ DE FRANGO COZIDO COM ERVAS'
      },
      jantarPaciente: {
        prato: 'Canja de galinha com legumes, torrada integral, fruta'
      },
      ceia: 'Café com leite, pão francês com presunto, fruta'
    },
    {
      date: '2026-09-16',
      diaSemana: 'Quarta',
      diaSemanaLabel: '4ª FEIRA',
      evento: 'EVENTO',
      cafeManhaCeia: 'Pão doce, requeijão, café com leite, fruta da estação',
      colacaoPaciente: 'Suco natural e bolacha água e sal',
      almoco: {
        geral: {
          arroz: 'Arroz colorido',
          feijao: 'Feijão',
          proteina: 'MAMINHA E LINGUIÇA',
          tipoCarne: 'MAMINHA',
          quantidadeKg: 40,
          carnesAdicionais: [
            { tipoCarne: 'LINGUIÇA', quantidadeKg: 15, observacao: 'Embutido do almoço festivo/evento' }
          ],
          guarnicao: 'maionese de mandioca',
          salada: 'pão de alho, vinagrete, folhas verdes',
          bebida: 'refrigerante ou suco natural',
          sobremesa: 'fruta ou sobremesa'
        },
        pacienteProteina: 'ALCATRA GRELHADA EM TIRAS'
      },
      jantarPaciente: {
        prato: 'Arroz, feijão, CARNE MOÍDA COM LEGUMES, abobrinha refogada, sopa de aveia, fruta'
      },
      ceia: 'Chá de camomila, torrada, queijo branco'
    },
    {
      date: '2026-09-17',
      diaSemana: 'Quinta',
      diaSemanaLabel: '5ª FEIRA',
      cafeManhaCeia: 'Pão francês, margarina, café preto/com leite, banana',
      colacaoPaciente: 'Vitamina de frutas com aveia',
      almoco: {
        geral: {
          arroz: 'Arroz',
          feijao: 'Feijão',
          proteina: 'BIFE A ROLE AO MOLHO',
          tipoCarne: 'COXÃO MOLE',
          quantidadeKg: 48,
          guarnicao: 'macarrão ao alho e óleo',
          salada: 'repolho roxo, tomate, pepino',
          bebida: 'suco de laranja',
          sobremesa: 'gelatina colorida'
        },
        pacienteProteina: 'CARNE COZIDA MAGRA DESFIADA'
      },
      jantarPaciente: {
        prato: 'Sopa de feijão com macarrão, legumes cozidos, fruta'
      },
      ceia: 'Café com leite, pão com mortadela, biscoito'
    },
    {
      date: '2026-09-18',
      diaSemana: 'Sexta',
      diaSemanaLabel: '6ª FEIRA',
      cafeManhaCeia: 'Pão de centeio, margarina, café com leite, laranja',
      colacaoPaciente: 'Fruta (banana prata)',
      almoco: {
        geral: {
          arroz: 'Arroz',
          feijao: 'Feijão',
          proteina: 'PEIXE AO FORNO COM BATATAS',
          tipoCarne: 'PEIXE- TILÁPIA',
          quantidadeKg: 40,
          guarnicao: 'pirão de peixe',
          salada: 'salada tropical, alface americana',
          bebida: 'limonada',
          sobremesa: 'fruta da época'
        },
        pacienteProteina: 'FILÉ DE TILÁPIA GRELHADA'
      },
      jantarPaciente: {
        prato: 'Arroz, feijão, OMELETE DE FORNO COM LEGUMES, sopa de legumes, fruta'
      },
      ceia: 'Chá de erva-doce, pão caseiro com margarina, biscoito'
    },
    {
      date: '2026-09-19',
      diaSemana: 'Sábado',
      diaSemanaLabel: 'SÁBADO',
      cafeManhaCeia: 'Pão francês, queijo, café com leite, maçã',
      colacaoPaciente: 'Fruta ou gelatina diet',
      almoco: {
        geral: {
          arroz: 'Arroz',
          feijao: 'Feijão',
          proteina: 'FRANGO ASSADO COM ERVAS',
          tipoCarne: 'COXA E SOBRECOXA',
          quantidadeKg: 55,
          guarnicao: 'farofa rica de legumes',
          salada: 'salada russa, tomate',
          bebida: 'suco',
          sobremesa: 'doce caseiro ou fruta'
        },
        pacienteProteina: 'SOBRECOXA SEM PELE ENSOPADA'
      },
      jantarPaciente: {
        prato: 'Arroz, feijão, ISCAS DE FRANGO ACEBOLADO, sopa de canja, fruta'
      },
      ceia: 'Achocolatado ou café com leite, pão francês, biscoito doce'
    },
    {
      date: '2026-09-20',
      diaSemana: 'Domingo',
      diaSemanaLabel: 'DOMINGO',
      feriado: true,
      feriadoNome: 'feriado',
      cafeManhaCeia: 'Pão francês, queijo colonial, café com leite, fruta',
      colacaoPaciente: 'Fruta (maçã) e biscoito',
      almoco: {
        geral: {
          arroz: 'Arroz carreteiro tradicional',
          feijao: 'Feijão',
          proteina: 'COSTELA BOVINA ASSADA',
          tipoCarne: 'CONTRA FILÉ',
          quantidadeKg: 50,
          guarnicao: 'mandioca com bacon e manteiga',
          salada: 'salada de maionese caseira, alface e tomate',
          bebida: 'suco natural ou refrigerante',
          sobremesa: 'sagu com creme de baunilha'
        },
        pacienteProteina: 'CARNE BOVINA MAGRA ASSADA'
      },
      jantarPaciente: {
        prato: 'Arroz, feijão, CARNE DE PANELA COM CENOURA, sopa cremosa de legumes, fruta'
      },
      ceia: 'Chá mate, torrada especial, doce de leite em sachê'
    }
  ]
};

// =========================================================================
// MAIN COMPONENT
// =========================================================================

interface CardapioSemanalProps {
  onNotify?: (msg: string, type?: 'success' | 'info') => void;
  onAudit?: (event: Omit<AuditEvent, 'id' | 'createdAt'>) => void;
  searchQuery?: string;
  focusDate?: string;
}

const initialCardapioDocuments = [initialWeeklyCardapio];
function readLegacyCardapios(): WeeklyCardapioDoc[] | null {
  const raw = localStorage.getItem('dr_cardapios');
  return raw === null ? null : JSON.parse(raw);
}

export default function CardapioSemanal({ onNotify, onAudit, searchQuery = '', focusDate = '' }: CardapioSemanalProps) {
  const cardapioCloud = useCloudData({
    name: 'cardapios', initial: initialCardapioDocuments,
    validate: validateCardapio, legacy: readLegacyCardapios
  });
  const cardapiosList = cardapioCloud.state.records;
  const [selectedCardapioId, setSelectedCardapioId] = useState(initialWeeklyCardapio.id);
  const matchingCardapios = cardapiosList.filter(item => cardapioMatchesSearch(item, searchQuery));
  const selectedCardapioForSearch = cardapiosList.find(item => item.id === selectedCardapioId);
  const cardapiosForSelector = selectedCardapioForSearch && !matchingCardapios.some(item => item.id === selectedCardapioId)
    ? [selectedCardapioForSearch, ...matchingCardapios]
    : matchingCardapios;
  const [selectionLoaded, setSelectionLoaded] = useState(false);
  useEffect(() => {
    try {
      const savedId = localStorage.getItem('dr_current_cardapio_id');
      if (savedId) setSelectedCardapioId(savedId);
    } catch { /* Selection preference is optional. */ }
    setSelectionLoaded(true);
  }, []);
  useEffect(() => {
    if (!selectionLoaded) return;
    try { localStorage.setItem('dr_current_cardapio_id', selectedCardapioId); }
    catch { /* Selection preference is optional. */ }
  }, [selectedCardapioId, selectionLoaded]);

  useEffect(() => {
    if (!selectionLoaded || cardapioCloud.state.status === 'loading') return;
    if (cardapiosList.length && !cardapiosList.some(item => item.id === selectedCardapioId)) {
      setSelectedCardapioId(cardapiosList[0].id);
    }
  }, [cardapiosList, selectedCardapioId, selectionLoaded, cardapioCloud.state.status]);

  const [activeSubView, setActiveSubView] = useState<'A4' | 'EDITOR'>('A4');
  
  // Scale / Zoom of A4 sheet preview
  const [previewScale, setPreviewScale] = useState<number>(100);

  // Active day being edited in structured modal/drawer
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
  const [editingFocusMeal, setEditingFocusMeal] = useState<'all' | 'cafe' | 'colacao' | 'almoco' | 'jantar' | 'ceia'>('all');
  useEffect(() => {
    if (!focusDate || cardapioCloud.state.status === 'loading') return;
    const target = cardapiosList.find(item => item.dias.some(day => day.date === focusDate));
    if (!target || target.archivedAt) return;
    const dayIndex = target.dias.findIndex(day => day.date === focusDate);
    if (dayIndex < 0) return;
    setSelectedCardapioId(target.id);
    setActiveSubView('EDITOR');
    setEditingDayIndex(dayIndex);
    setEditingFocusMeal('all');
  }, [focusDate, cardapiosList, cardapioCloud.state.status]);
  const [copySourceDayIndex, setCopySourceDayIndex] = useState<number | ''>('');
  const [showMealSuggestions, setShowMealSuggestions] = useState(false);
  const [showMeatShortcuts, setShowMeatShortcuts] = useState(false);
  
  // Institutional config modal
  const [isInstitutionalModalOpen, setIsInstitutionalModalOpen] = useState(false);

  // PDF Generation State
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // New week creation modal
  const [isNewWeekModalOpen, setIsNewWeekModalOpen] = useState(false);
  const [newWeekMonday, setNewWeekMonday] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const distance = day === 1 ? 7 : (8 - day) % 7 || 7;
    now.setDate(now.getDate() + distance);
    return formatIsoDate(now);
  });

  // Saque de Carnes Modal & PDF Generation State
  const [isSaqueCarnesModalOpen, setIsSaqueCarnesModalOpen] = useState(false);
  const [isGeneratingSaquePdf, setIsGeneratingSaquePdf] = useState(false);

  // Quick helper to open edit modal focused on a meal
  const handleOpenEditMeal = (dayIdx: number, mealType: 'all' | 'cafe' | 'colacao' | 'almoco' | 'jantar' | 'ceia' = 'all') => {
    setEditingDayIndex(dayIdx);
    setEditingFocusMeal(mealType);
    setCopySourceDayIndex('');
    setShowMealSuggestions(false);
    setShowMeatShortcuts(false);
  };

  // Copy meals from another day to current editing day
  const handleCopyFromDay = (sourceIdx: number) => {
    if (editingDayIndex === null || sourceIdx === editingDayIndex) return;
    const sourceDay = currentCardapio.dias[sourceIdx];
    const targetDay = currentCardapio.dias[editingDayIndex];
    if (!sourceDay || !targetDay) return;

    const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
    updated.dias[editingDayIndex] = {
      ...targetDay,
      cafeManhaCeia: sourceDay.cafeManhaCeia,
      colacaoPaciente: sourceDay.colacaoPaciente,
      almoco: JSON.parse(JSON.stringify(sourceDay.almoco)),
      jantarPaciente: JSON.parse(JSON.stringify(sourceDay.jantarPaciente)),
      ceia: sourceDay.ceia,
    };
    if (!updateCurrentCardapio(updated)) return;
    showToast(`Cardápio copiado de ${sourceDay.diaSemanaLabel} com sucesso!`);
  };

  // Clear all meals of a specific day
  const handleClearDay = (dayIdx: number) => {
    const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
    updated.dias[dayIdx] = {
      ...updated.dias[dayIdx],
      cafeManhaCeia: '',
      colacaoPaciente: '',
      almoco: {
        geral: {
          arroz: 'Arroz',
          feijao: 'Feijão',
          proteina: '',
          tipoCarne: '',
          guarnicao: '',
          salada: '',
          bebida: '',
          sobremesa: ''
        },
        pacienteProteina: '',
        pacienteTipoCarne: '',
        pacienteQuantidadeKg: ''
      },
      jantarPaciente: {
        proteina: '',
        tipoCarne: '',
        quantidadeKg: '',
        prato: ''
      },
      ceia: ''
    };
    if (!updateCurrentCardapio(updated)) return;
    showToast(`Cardápio de ${updated.dias[dayIdx].diaSemanaLabel} limpo.`);
  };

  const saveCardapios = (list: WeeklyCardapioDoc[], currentId?: string) => {
    if (!cardapioCloud.controller.update(list)) return false;
    if (currentId) setSelectedCardapioId(currentId);
    return true;
  };

  const currentCardapio: WeeklyCardapioDoc = 
    cardapiosList.find(c => c.id === selectedCardapioId) || cardapiosList[0] || initialWeeklyCardapio;
  const isArchivedCardapio = Boolean(currentCardapio.archivedAt);
  useEffect(() => {
    if (isArchivedCardapio && activeSubView === 'EDITOR') setActiveSubView('A4');
  }, [isArchivedCardapio, activeSubView]);

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    if (onNotify) {
      const pending = cardapioCloud.controller.getSnapshot().pending;
      onNotify(type === 'success' && pending ? msg + ' — envio ao servidor pendente.' : msg, type);
    }
  };

  // Update current cardapio helper with preservation of reviewed/finalized versions.
  const updateCurrentCardapio = (updated: WeeklyCardapioDoc) => {
    const persisted = cardapiosList.find(c => c.id === updated.id);
    if (persisted?.archivedAt) {
      showToast('Cardápio arquivado está em modo somente leitura. Restaure-o em Fluxos Profissionais antes de alterar.', 'info');
      return false;
    }
    if (persisted?.workflow.status === 'FINALIZADO' && updated.workflow.status !== 'EM_ELABORACAO') {
      showToast('Cardápio finalizado está bloqueado para edição. Reabra o documento antes de alterar.', 'info');
      return false;
    }

    let candidate = updated;
    const editedAfterReview = persisted &&
      (persisted.workflow.status === 'CONFERIDO' || persisted.workflow.status === 'APROVADO') &&
      updated.workflow.status === persisted.workflow.status;
    if (editedAfterReview && persisted) {
      candidate = JSON.parse(JSON.stringify(updated)) as WeeklyCardapioDoc;
      const snapshot = createCardapioVersionSnapshot({ ...persisted, version: persisted.version || 1 }, 'Estado preservado antes de alteração após conferência/aprovação');
      candidate.version = (persisted.version || 1) + 1;
      candidate.versions = [snapshot, ...(persisted.versions || [])];
      candidate.lastChangeReason = 'Alteração de conteúdo após conferência/aprovação';
      candidate.workflow.status = 'EM_ELABORACAO';
      candidate.workflow.conferido.status = 'PENDENTE';
      candidate.workflow.conferido.data = undefined;
      candidate.workflow.aprovado.status = 'PENDENTE';
      candidate.workflow.aprovado.data = undefined;
      showToast('Alteração no conteúdo criou nova versão e reabriu o cardápio para conferência.', 'info');
    }

    const updatedList = cardapiosList.some(c => c.id === candidate.id)
      ? cardapiosList.map(c => c.id === candidate.id ? candidate : c)
      : [candidate, ...cardapiosList];
    const saved = saveCardapios(updatedList, candidate.id);
    if (saved && editedAfterReview && persisted) {
      onAudit?.({
        module: 'Cardápio', action: 'REABERTURA', entityType: 'Cardápio', entityId: persisted.id,
        summary: `Cardápio ${persisted.dataInicio} a ${persisted.dataFim} reaberto automaticamente após alteração de conteúdo.`,
        previousValue: `Versão ${persisted.version || 1} / ${persisted.workflow.status}`,
        newValue: `Versão ${(persisted.version || 1) + 1} / EM_ELABORACAO`,
        note: 'Alteração de conteúdo após conferência/aprovação'
      });
    }
    return saved;
  };

  // Advance workflow state
  const handleAdvanceWorkflow = () => {
    const readiness = getCardapioReadiness(currentCardapio);
    if (!readiness.ok) {
      const preview = readiness.missing.slice(0, 3).join('; ');
      const extra = readiness.missing.length > 3 ? ` (+${readiness.missing.length - 3} pendência(s))` : '';
      showToast(`Cardápio com ${readiness.percent}% de prontidão. Corrija: ${preview}${extra}.`, 'info');
      return;
    }
    const currentStatus = currentCardapio.workflow.status;
    let nextStatus: WorkflowStatus = currentStatus;
    let message = '';
    const nowStr = new Date().toLocaleDateString('pt-BR');

    const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;

    if (currentStatus === 'EM_ELABORACAO') {
      nextStatus = 'CONFERIDO';
      updated.workflow.status = nextStatus;
      updated.workflow.conferido.status = 'CONFERIDO';
      updated.workflow.conferido.data = nowStr;
      message = 'Cardápio marcado como CONFERIDO pelo Chefe Fiscal Adm.';
    } else if (currentStatus === 'CONFERIDO') {
      nextStatus = 'APROVADO';
      updated.workflow.status = nextStatus;
      updated.workflow.aprovado.status = 'APROVADO';
      updated.workflow.aprovado.data = nowStr;
      message = 'Cardápio APROVADO pela Diretora HGeSM.';
    } else if (currentStatus === 'APROVADO') {
      nextStatus = 'FINALIZADO';
      updated.workflow.status = nextStatus;
      updated.version = currentCardapio.version || 1;
      const snapshot = createCardapioVersionSnapshot(updated, 'Finalização oficial do cardápio');
      updated.versions = [snapshot, ...(currentCardapio.versions || []).filter(item => item.version !== snapshot.version)];
      message = 'Cardápio FINALIZADO e versão oficial preservada.';
    }

    if (!updateCurrentCardapio(updated)) return;
    if (currentStatus !== nextStatus) {
      onAudit?.({
        module: 'Cardápio',
        action: nextStatus === 'FINALIZADO' ? 'FINALIZACAO' : 'ALTERACAO',
        entityType: 'Cardápio', entityId: currentCardapio.id,
        summary: `Fluxo do cardápio ${currentCardapio.dataInicio} a ${currentCardapio.dataFim}: ${currentStatus} → ${nextStatus}.`,
        previousValue: currentStatus, newValue: nextStatus
      });
    }
    if (message) showToast(message);
  };

  const handleReopenWorkflow = () => {
    const reason = window.prompt('Informe o motivo da reabertura do cardápio:');
    if (!reason?.trim()) {
      showToast('A reabertura exige um motivo para preservar a rastreabilidade.', 'info');
      return;
    }
    const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
    const previousVersion = currentCardapio.version || 1;
    const snapshot = createCardapioVersionSnapshot({ ...currentCardapio, version: previousVersion }, `Estado preservado antes da reabertura: ${reason.trim()}`);
    updated.version = previousVersion + 1;
    updated.versions = [snapshot, ...(currentCardapio.versions || []).filter(item => item.id !== snapshot.id)];
    updated.lastChangeReason = reason.trim();
    updated.workflow.status = 'EM_ELABORACAO';
    updated.workflow.conferido.status = 'PENDENTE';
    updated.workflow.conferido.data = undefined;
    updated.workflow.aprovado.status = 'PENDENTE';
    updated.workflow.aprovado.data = undefined;
    if (!updateCurrentCardapio(updated)) return;
    onAudit?.({
      module: 'Cardápio', action: 'REABERTURA', entityType: 'Cardápio', entityId: currentCardapio.id,
      summary: `Cardápio reaberto como versão ${previousVersion + 1}.`,
      previousValue: `Versão ${previousVersion} / ${currentCardapio.workflow.status}`,
      newValue: `Versão ${previousVersion + 1} / EM_ELABORACAO`, note: reason.trim()
    });
    showToast(`Cardápio reaberto como versão ${previousVersion + 1}.`, 'info');
  };

  // Handle official PDF generation and download in A4 Landscape
  const handleDownloadPdf = async () => {
    // If currently in EDITOR view, switch to A4 view so the element is rendered in DOM
    const wasInEditor = activeSubView === 'EDITOR';
    if (wasInEditor) {
      setActiveSubView('A4');
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const sheetElement = document.getElementById('cardapio-print-sheet');
    if (!sheetElement) {
      showToast('Elemento do cardápio não encontrado.', 'info');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      showToast('Renderizando cardápio oficial em formato A4 Paisagem...', 'info');

      // Temporarily store original zoom & apply crisp capture styles
      const originalZoom = sheetElement.style.zoom;
      sheetElement.style.zoom = '1';
      sheetElement.classList.add('pdf-rendering-active');

      // Small delay for DOM reflow
      await new Promise(resolve => setTimeout(resolve, 150));

      const canvas = await html2canvas(sheetElement, {
        scale: 2.5, // High resolution (300dpi-equivalent for printing)
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        ignoreElements: (element) => {
          return (
            element.classList.contains('print:hidden') || 
            element.classList.contains('no-print') ||
            element.getAttribute('data-no-pdf') === 'true'
          );
        }
      });

      // Restore zoom & classes immediately
      sheetElement.style.zoom = originalZoom;
      sheetElement.classList.remove('pdf-rendering-active');

      // Initialize jsPDF in A4 Landscape (297mm x 210mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const imgData = canvas.toDataURL('image/png');

      const pageWidth = 297; // mm
      const pageHeight = 210; // mm
      const margin = 6; // 6mm margin around document
      const maxUsableWidth = pageWidth - (margin * 2); // 285mm
      const maxUsableHeight = pageHeight - (margin * 2); // 198mm

      const canvasAspectRatio = canvas.height / canvas.width;
      let renderWidth = maxUsableWidth;
      let renderHeight = maxUsableWidth * canvasAspectRatio;

      if (renderHeight > maxUsableHeight) {
        renderHeight = maxUsableHeight;
        renderWidth = maxUsableHeight / canvasAspectRatio;
      }

      // Center horizontally and vertically within printable A4 page
      const posX = margin + (maxUsableWidth - renderWidth) / 2;
      const posY = margin + (maxUsableHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'PNG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');

      // Filename formatted cleanly
      const safePeriodo = `${currentCardapio.dataInicio}-a-${currentCardapio.dataFim}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      
      const fileName = `Cardapio-Semanal-HGeSM-${safePeriodo}.pdf`;
      pdf.save(fileName);

      showToast('Download do PDF (A4 Paisagem) concluído com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      showToast('Não foi possível gerar o PDF. Tente novamente.', 'info');
    } finally {
      setIsGeneratingPdf(false);
      const sheet = document.getElementById('cardapio-print-sheet');
      if (sheet) {
        sheet.classList.remove('pdf-rendering-active');
      }
    }
  };

  // Download official Saque de Carnes PDF (A4 Portrait format)
  const handleDownloadSaquePdf = async () => {
    const sheetElement = document.getElementById('saque-carnes-print-sheet');
    if (!sheetElement) {
      showToast('Elemento do saque de carnes não encontrado.', 'info');
      return;
    }

    try {
      setIsGeneratingSaquePdf(true);
      showToast('Gerando documento oficial de Saque de Carnes em PDF (A4)...', 'info');

      // Small delay for clean DOM render
      await new Promise(resolve => setTimeout(resolve, 150));

      const canvas = await html2canvas(sheetElement, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        ignoreElements: (element) => {
          return (
            element.classList.contains('print:hidden') || 
            element.classList.contains('no-print') ||
            element.getAttribute('data-no-pdf') === 'true'
          );
        }
      });

      // A4 Portrait: 210mm x 297mm
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pageWidth = 210; // mm
      const pageHeight = 297; // mm
      const margin = 8; // 8mm margin
      const maxUsableWidth = pageWidth - (margin * 2);
      const maxUsableHeight = pageHeight - (margin * 2);

      const canvasAspectRatio = canvas.height / canvas.width;
      let renderWidth = maxUsableWidth;
      let renderHeight = maxUsableWidth * canvasAspectRatio;

      if (renderHeight > maxUsableHeight) {
        renderHeight = maxUsableHeight;
        renderWidth = maxUsableHeight / canvasAspectRatio;
      }

      const posX = margin + (maxUsableWidth - renderWidth) / 2;
      const posY = margin + (maxUsableHeight - renderHeight) / 2;

      pdf.addImage(imgData, 'PNG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');

      const safePeriodo = `${currentCardapio.dataInicio}-a-${currentCardapio.dataFim}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      
      const fileName = `Saque-de-Carnes-HGeSM-${safePeriodo}.pdf`;
      pdf.save(fileName);

      showToast('Download do Saque de Carnes (PDF A4) concluído!');
    } catch (err) {
      console.error('Erro ao gerar PDF do Saque:', err);
      showToast('Não foi possível gerar o PDF do saque. Tente novamente.', 'info');
    } finally {
      setIsGeneratingSaquePdf(false);
    }
  };

  // Copy Saque de Carnes summary as structured plain text
  const handleCopySaqueText = () => {
    const lista = gerarListaSaqueCarnes(currentCardapio.dias);
    if (lista.length === 0) {
      showToast('Nenhuma carne cadastrada nesta semana.', 'info');
      return;
    }

    const totalKg = lista.reduce((sum, item) => sum + item.quantidadeKg, 0);

    let text = `====================================================\n`;
    text += `MINISTÉRIO DA DEFESA - EXÉRCITO BRASILEIRO\n`;
    text += `HOSPITAL GERAL DE SANTA MARIA - APROVISIONAMENTO\n`;
    text += `MAPA SEMANAL DE SAQUE DE CARNES (CÂMARA FRIA)\n`;
    text += `Período: ${formatDdmmyyyy(currentCardapio.dataInicio)} a ${formatDdmmyyyy(currentCardapio.dataFim)}\n`;
    text += `====================================================\n\n`;
    text += `CRONOGRAMA DE RETIRADA PARA DESCONGELAMENTO:\n\n`;

    lista.forEach((item, idx) => {
      text += `${idx + 1}. DATA DO SAQUE: ${item.dataSaqueFormatada} (${item.diaSemanaSaque})\n`;
      text += `   • Corte/Tipo: ${item.tipoCarne}\n`;
      text += `   • Quantidade: ${item.quantidadeKg > 0 ? `${item.quantidadeKg.toFixed(1)} kg` : 'A definir'}\n`;
      text += `   • Consumo: ${item.origem} — ${item.diaSemanaCardapioLabel} (${formatDdmmyyyy(item.diaCardapioIso)}) - ${item.preparacao}\n`;
      text += `   • Descongelamento: ${item.diasAntecedencia} dias de antecedência sob refrigeração\n\n`;
    });

    text += `----------------------------------------------------\n`;
    text += `TOTAL GERAL DE CARNES DA SEMANA: ${totalKg.toFixed(1)} kg\n`;
    text += `====================================================\n`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('Resumo do Saque de Carnes copiado com sucesso!');
    }).catch(() => {
      showToast('Erro ao copiar resumo.', 'info');
    });
  };

  // Clone current week to next week (+7 days)
  const handleDuplicateToNextWeek = () => {
    const currentMon = parseIsoDate(currentCardapio.dataInicio);
    const nextMon = new Date(currentMon);
    nextMon.setDate(currentMon.getDate() + 7);
    const nextMonIso = formatIsoDate(nextMon);

    const nextSun = new Date(nextMon);
    nextSun.setDate(nextMon.getDate() + 6);
    const nextSunIso = formatIsoDate(nextSun);

    const newId = `cardapio-${nextMonIso}`;

    if (cardapiosList.some(c => c.id === newId)) {
      showToast('Já existe um cardápio para a próxima semana.', 'info');
      setSelectedCardapioId(newId);
      return;
    }

    const clonedDias: DayCardapio[] = currentCardapio.dias.map((d, index) => {
      const curDate = parseIsoDate(d.date);
      const newD = new Date(curDate);
      newD.setDate(curDate.getDate() + 7);
      return {
        ...d,
        date: formatIsoDate(newD),
        evento: undefined,
        feriado: false,
        feriadoNome: undefined
      };
    });

    const newDoc: WeeklyCardapioDoc = {
      ...JSON.parse(JSON.stringify(currentCardapio)),
      id: newId,
      dataInicio: nextMonIso,
      dataFim: nextSunIso,
      version: 1,
      versions: [],
      archivedAt: undefined,
      archiveReason: undefined,
      lastChangeReason: undefined,
      workflow: {
        status: 'EM_ELABORACAO',
        conferido: {
          cargo: 'Chefe Fiscal Adm.',
          responsavel: currentCardapio.workflow.conferido.responsavel,
          status: 'PENDENTE'
        },
        aprovado: {
          cargo: 'Diretora HGeSM',
          responsavel: currentCardapio.workflow.aprovado.responsavel,
          status: 'PENDENTE'
        }
      },
      dias: clonedDias
    };

    const newList = [newDoc, ...cardapiosList];
    if (!saveCardapios(newList, newDoc.id)) return;
    showToast(`Semana duplicada com sucesso para ${formatDdmmyyyy(nextMonIso)} a ${formatDdmmyyyy(nextSunIso)}!`);
  };

  // Create clean new week
  const handleCreateNewWeek = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeekMonday) return;

    const mon = parseIsoDate(newWeekMonday);
    const dayOfWeek = mon.getDay(); // 0 is Sunday, 1 is Monday
    if (dayOfWeek !== 1) {
      showToast('A data inicial deve ser uma segunda-feira.', 'info');
      return;
    }

    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const sunIso = formatIsoDate(sun);
    const newId = `cardapio-${newWeekMonday}`;

    if (cardapiosList.some(c => c.id === newId)) {
      showToast('Já existe um cardápio cadastrado para esta semana.', 'info');
      setSelectedCardapioId(newId);
      setIsNewWeekModalOpen(false);
      return;
    }

    const newDoc: WeeklyCardapioDoc = {
      id: newId,
      dataInicio: newWeekMonday,
      dataFim: sunIso,
      dataEmissao: newWeekMonday,
      cidade: currentCardapio.cidade || 'Santa Maria',
      uf: currentCardapio.uf || 'RS',
      regiaoMilitar: '3ª REGIÃO MILITAR',
      organizacaoMilitar: 'HOSPITAL GERAL DE SANTA MARIA',
      divisao: 'APROVISIONAMENTO',
      version: 1,
      versions: [],
      workflow: {
        status: 'EM_ELABORACAO',
        conferido: {
          cargo: 'Chefe Fiscal Adm.',
          responsavel: currentCardapio.workflow.conferido.responsavel,
          status: 'PENDENTE'
        },
        aprovado: {
          cargo: 'Diretora HGeSM',
          responsavel: currentCardapio.workflow.aprovado.responsavel,
          status: 'PENDENTE'
        }
      },
      lancheTexto: 'OLHAR CARDÁPIO DE PACIENTES COPA',
      ceiaPacienteTexto: 'OLHAR CARDÁPIO DE PACIENTES COPA',
      observacaoGeral: currentCardapio.observacaoGeral,
      basicoCopaInternados: currentCardapio.basicoCopaInternados,
      responsavelTecnico: { ...currentCardapio.responsavelTecnico },
      dias: generateWeeklyDates(newWeekMonday)
    };

    const newList = [newDoc, ...cardapiosList];
    if (!saveCardapios(newList, newDoc.id)) return;
    setIsNewWeekModalOpen(false);
    showToast(`Novo cardápio semanal criado para ${formatDdmmyyyy(newWeekMonday)} a ${formatDdmmyyyy(sunIso)}!`);
  };

  // Restore official mock template
  const handleResetToOfficialTemplate = () => {
    if (window.confirm('Deseja recarregar o cardápio modelo oficial da semana de 14 a 20 de setembro de 2026?')) {
      if (!cardapioCloud.controller.checkpoint()) return;
      const filtered = cardapiosList.filter(c => c.id !== initialWeeklyCardapio.id);
      const newList = [initialWeeklyCardapio, ...filtered];
      if (!saveCardapios(newList, initialWeeklyCardapio.id)) return;
      showToast('Modelo oficial HGeSM recarregado com sucesso!');
    }
  };

  // Copy raw text for sharing/reports
  const handleCopySummary = () => {
    const title = formatCardapioTitle(currentCardapio.dataInicio, currentCardapio.dataFim);
    let txt = `*** ${currentCardapio.organizacaoMilitar} — ${currentCardapio.divisao} ***\n`;
    txt += `${title.toUpperCase()}\n\n`;
    currentCardapio.dias.forEach(d => {
      txt += `[${d.diaSemanaLabel} - ${formatDdmmyyyy(d.date)}${d.evento ? ` (${d.evento})` : ''}${d.feriado ? ' (FERIADO)' : ''}]\n`;
      txt += `• Café/Ceia: ${d.cafeManhaCeia}\n`;
      txt += `• Colação Paciente: ${d.colacaoPaciente}\n`;
      txt += `• Almoço Geral: ${d.almoco.geral.arroz}, ${d.almoco.geral.feijao}, ${d.almoco.geral.proteina.toUpperCase()}, ${d.almoco.geral.guarnicao}, ${d.almoco.geral.salada}, ${d.almoco.geral.bebida}, ${d.almoco.geral.sobremesa}\n`;
      txt += `• Almoço Paciente: PACIENTE: ${d.almoco.pacienteProteina.toUpperCase()}\n`;
      txt += `• Lanche: ${currentCardapio.lancheTexto}\n`;
      txt += `• Jantar Paciente: ${d.jantarPaciente.proteina ? `${d.jantarPaciente.proteina.toUpperCase()}${d.jantarPaciente.prato ? ', ' : ''}` : ''}${d.jantarPaciente.prato}\n`;
      txt += `• Ceia Paciente: ${currentCardapio.ceiaPacienteTexto}\n`;
      txt += `• Ceia: ${d.ceia}\n\n`;
    });
    txt += `${currentCardapio.observacaoGeral} ${currentCardapio.basicoCopaInternados}\n`;
    txt += `${formatExtensiveLocation(currentCardapio.dataEmissao, currentCardapio.cidade, currentCardapio.uf)}\n`;
    txt += `Responsável: ${currentCardapio.responsavelTecnico.nome} - ${currentCardapio.responsavelTecnico.postoGraduacao} ${currentCardapio.responsavelTecnico.funcao}\n`;

    navigator.clipboard.writeText(txt);
    showToast('Cardápio semanal copiado para a área de transferência!');
  };

  // Format Almoco string with protein bold
  const renderAlmocoContent = (day: DayCardapio) => {
    const g = day.almoco.geral;
    return (
      <div className="text-[11px] leading-snug">
        <div className="text-slate-900">
          {g.arroz && <span>{g.arroz}, </span>}
          {g.feijao && <span>{g.feijao}, </span>}
          {g.proteina && (
            <span className="font-black tracking-tight text-black underline-offset-2">
              {g.proteina.toUpperCase()}
            </span>
          )}
          {g.guarnicao && <span>, {g.guarnicao}</span>}
          {g.salada && <span>, {g.salada}</span>}
          {g.bebida && <span>, {g.bebida}</span>}
          {g.sobremesa && <span>, {g.sobremesa}</span>}
          {!g.arroz && !g.feijao && !g.proteina && <span className="text-slate-400 italic">Almoço a definir</span>}
        </div>

        {day.almoco.pacienteProteina && (
          <div className="mt-1.5 pt-1 border-t border-slate-300/80 font-bold text-slate-950 text-[10.5px]">
            <span className="font-extrabold text-slate-800">PACIENTE:</span>{' '}
            <span className="uppercase tracking-tight text-black">{day.almoco.pacienteProteina.toUpperCase()}</span>
          </div>
        )}
      </div>
    );
  };

  // Format Jantar with an explicit protein field; legacy cardápios without the field remain unchanged.
  const renderJantarContent = (day: DayCardapio) => {
    const protein = day.jantarPaciente.proteina?.trim() || '';
    const text = day.jantarPaciente.prato || '';
    if (!protein && !text) return <span className="text-slate-400 italic">Jantar a definir</span>;

    const parts = text ? text.split(',') : [];
    return (
      <div className="text-[11px] leading-snug text-slate-900">
        {protein && (
          <span className="font-black text-black uppercase">{protein.toUpperCase()}</span>
        )}
        {protein && parts.length > 0 && ', '}
        {parts.map((part, pIdx) => {
          const trimmed = part.trim();
          const isUppercase = trimmed.length > 2 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
          return (
            <React.Fragment key={pIdx}>
              {pIdx > 0 && ', '}
              {isUppercase ? (
                <span className="font-black text-black uppercase">{trimmed}</span>
              ) : (
                <span>{trimmed}</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <SyncStatus title="Cardápios semanais" state={cardapioCloud.state} controller={cardapioCloud.controller} position="left" />
      
      {/* ------------------------------------------------------------------- */}
      {/* TOP CONTROL BAR (Screen Only - Hidden in Print)                     */}
      {/* ------------------------------------------------------------------- */}
      <div className="no-print space-y-4">
        
        {/* Title, Badge and Main Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#1e382b] flex items-center justify-center text-white shadow-xs">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Cardápio Semanal de Aprovisionamento</h3>
              
              {/* Status Badge */}
              <div className={cn(
                "px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border shadow-2xs",
                currentCardapio.workflow.status === 'EM_ELABORACAO' && "bg-amber-50 text-amber-800 border-amber-300",
                currentCardapio.workflow.status === 'CONFERIDO' && "bg-blue-50 text-blue-800 border-blue-300",
                currentCardapio.workflow.status === 'APROVADO' && "bg-purple-50 text-purple-800 border-purple-300",
                currentCardapio.workflow.status === 'FINALIZADO' && "bg-emerald-50 text-emerald-800 border-emerald-300"
              )}>
                {currentCardapio.workflow.status === 'EM_ELABORACAO' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                {currentCardapio.workflow.status === 'CONFERIDO' && <UserCheck className="w-3.5 h-3.5 text-blue-600" />}
                {currentCardapio.workflow.status === 'APROVADO' && <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />}
                {currentCardapio.workflow.status === 'FINALIZADO' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                <span>
                  {currentCardapio.workflow.status === 'EM_ELABORACAO' && 'Em Elaboração (Rascunho)'}
                  {currentCardapio.workflow.status === 'CONFERIDO' && 'Conferido — Chefe Fiscal'}
                  {currentCardapio.workflow.status === 'APROVADO' && 'Aprovado — Diretora HGeSM'}
                  {currentCardapio.workflow.status === 'FINALIZADO' && 'Finalizado / Oficial'}
                </span>
              </div>
              {isArchivedCardapio && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-100 text-slate-700 border-slate-300">Arquivado · somente leitura</span>
              )}
              {(() => {
                const readiness = getCardapioReadiness(currentCardapio);
                return (
                  <span className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-bold border',
                    readiness.ok ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                  )} title={readiness.ok ? 'Cardápio completo para avançar o fluxo' : readiness.missing.slice(0, 5).join(' • ')}>
                    Prontidão {readiness.percent}%
                  </span>
                );
              })()}
            </div>
            
            <p className="text-slate-500 text-xs mt-1">
              Template oficial semanal A4 em formato estruturado — Hospital Geral de Santa Maria (HGeSM)
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Advance status button */}
            {isArchivedCardapio ? (
              <button disabled className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 text-slate-500 rounded-lg font-bold text-xs border border-slate-200 cursor-not-allowed" title="Restaure o cardápio em Fluxos Profissionais para voltar a editá-lo">
                <Archive className="w-4 h-4" /><span>Arquivado · somente leitura</span>
              </button>
            ) : currentCardapio.workflow.status !== 'FINALIZADO' ? (
              <button
                onClick={handleAdvanceWorkflow}
                className="flex items-center gap-2 px-3.5 py-2 bg-[#1e382b] hover:bg-[#15271e] text-white rounded-lg font-bold text-xs transition-all shadow-xs"
                title="Avançar etapa de conferência e aprovação"
              >
                <Check className="w-4 h-4" />
                <span>
                  {currentCardapio.workflow.status === 'EM_ELABORACAO' && 'Conferir Cardápio'}
                  {currentCardapio.workflow.status === 'CONFERIDO' && 'Aprovar Cardápio'}
                  {currentCardapio.workflow.status === 'APROVADO' && 'Finalizar Cardápio'}
                </span>
              </button>
            ) : (
              <button
                onClick={handleReopenWorkflow}
                className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs transition-all"
                title="Reabrir para edição"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reabrir Edição</span>
              </button>
            )}

            {/* Download official PDF button (A4 Landscape) */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#1e382b] hover:bg-[#15271e] text-white rounded-lg font-bold text-xs transition-all shadow-xs disabled:opacity-60 disabled:cursor-wait"
              title="Baixar Cardápio Oficial em PDF (A4 Orientação Paisagem)"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Gerando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>Baixar PDF (A4 Paisagem)</span>
                </>
              )}
            </button>

            {/* Gerar Saque de Carnes (Câmara Fria & Descongelamento) */}
            <button
              onClick={() => setIsSaqueCarnesModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-lg font-bold text-xs transition-all shadow-xs"
              title="Gerar e Visualizar o Mapa Semanal de Saque de Carnes com cálculo de descongelamento"
            >
              <Beef className="w-4 h-4 text-amber-200" />
              <span>Saque de Carnes</span>
              {(() => {
                const lista = gerarListaSaqueCarnes(currentCardapio.dias);
                const totalKg = lista.reduce((acc, i) => acc + i.quantidadeKg, 0);
                return totalKg > 0 ? (
                  <span className="ml-1 px-1.5 py-0.5 bg-amber-950 text-amber-200 rounded text-[10px] font-black border border-amber-700/60">
                    {totalKg.toFixed(0)} kg
                  </span>
                ) : null;
              })()}
            </button>

            {/* Edit institutional settings */}
            <button
              onClick={() => setIsInstitutionalModalOpen(true)}
              disabled={isArchivedCardapio}
              className="flex items-center gap-2 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Editar cabeçalho, assinaturas e observações"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Dados &amp; Assinaturas</span>
            </button>

            {/* Copy raw text */}
            <button
              onClick={handleCopySummary}
              className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-xs transition-all"
              title="Copiar texto do cardápio para mensagem ou relatório"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-bar: Week selector, view mode switcher, new week, zoom */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          
          {/* Week Selector */}
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-800 shrink-0" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Semana:</span>
            <select
              value={selectedCardapioId}
              onChange={e => setSelectedCardapioId(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-emerald-800 outline-hidden"
            >
              {cardapiosForSelector.map(c => (
                <option key={c.id} value={c.id}>
                  {c.archivedAt ? '[ARQUIVADO] ' : ''}{formatCardapioTitle(c.dataInicio, c.dataFim)} ({c.workflow.status.replace('_', ' ')})
                </option>
              ))}
            </select>
            {searchQuery.trim() && (
              <span className="shrink-0 px-2 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500">
                {matchingCardapios.length} resultado(s)
              </span>
            )}

            <button
              onClick={() => {
                const latest = [...cardapiosList].sort((a, b) => b.dataInicio.localeCompare(a.dataInicio))[0];
                if (latest) {
                  const next = parseIsoDate(latest.dataInicio);
                  next.setDate(next.getDate() + 7);
                  setNewWeekMonday(formatIsoDate(next));
                }
                setIsNewWeekModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#1e382b] border border-emerald-200/80 rounded-lg text-xs font-bold transition-colors"
              title="Criar nova semana de cardápio"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Semana</span>
            </button>

            <button
              onClick={handleDuplicateToNextWeek}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
              title="Copiar refeições desta semana para a próxima (+7 dias)"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicar p/ Próxima</span>
            </button>
          </div>

          {/* Mode Switcher (A4 Preview vs Structured Editor) */}
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setActiveSubView('A4')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all",
                  activeSubView === 'A4' ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-800" />
                <span>Documento A4</span>
              </button>
              <button
                onClick={() => setActiveSubView('EDITOR')}
                disabled={isArchivedCardapio}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all",
                  activeSubView === 'EDITOR' ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900",
                  isArchivedCardapio && "opacity-50 cursor-not-allowed"
                )}
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-700" />
                <span>Editor por Dia</span>
              </button>
            </div>

            {/* Scale controls for A4 preview */}
            {activeSubView === 'A4' && (
              <div className="hidden sm:flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
                <button
                  onClick={() => setPreviewScale(p => Math.max(75, p - 10))}
                  className="p-1 text-slate-500 hover:text-slate-900 transition-colors"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold text-slate-600 w-10 text-center">{previewScale}%</span>
                <button
                  onClick={() => setPreviewScale(p => Math.min(130, p + 10))}
                  className="p-1 text-slate-500 hover:text-slate-900 transition-colors"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumo operacional de proteínas: conferência rápida antes do Saque de Carnes */}
      {(() => {
        const listaProteinasSemana = gerarListaSaqueCarnes(currentCardapio.dias);
        const totalKgProteinas = listaProteinasSemana.reduce((total, item) => total + item.quantidadeKg, 0);
        const itensSaqueProgramados = listaProteinasSemana.filter(item => item.tipoCarne && item.quantidadeKg > 0).length;

        return (
          <div className="no-print bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                  <Beef className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Proteínas da semana</h4>
                  <p className="text-[11px] text-slate-500">
                    Conferência operacional de preparação, corte, quantidade e data de retirada para degelo.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {itensSaqueProgramados} itens de carne programados
                </span>
                <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {totalKgProteinas.toFixed(1)} kg programados
                </span>
                <button
                  type="button"
                  onClick={() => setIsSaqueCarnesModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-800 hover:bg-amber-900 text-white transition-colors"
                >
                  Abrir Saque de Carnes
                </button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {currentCardapio.dias.map((dia, idx) => {
                const tipo = dia.almoco.geral.tipoCarne;
                const quantidade = Number(dia.almoco.geral.quantidadeKg) || 0;
                const regra = tipo ? (REGRAS_DESCONGELAMENTO[tipo] || { diasAntecedencia: 2 }) : null;
                const calc = regra ? calcularDataSaque(dia.date, regra.diasAntecedencia) : null;
                const adicionais = dia.almoco.geral.carnesAdicionais || [];
                const completo = Boolean(tipo && quantidade > 0);

                return (
                  <button
                    key={`protein-summary-${dia.date}`}
                    type="button"
                    onClick={() => handleOpenEditMeal(idx, 'almoco')}
                    className={cn(
                      "min-w-[170px] flex-1 text-left rounded-lg border p-2.5 transition-colors",
                      completo
                        ? "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30"
                        : "bg-amber-50/40 border-amber-200 hover:bg-amber-50"
                    )}
                    title={`Editar proteína e saque de ${dia.diaSemanaLabel}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-black text-slate-700">{dia.diaSemanaLabel}</span>
                      <span className="text-[9px] font-medium text-slate-400">{formatDdmmyyyy(dia.date)}</span>
                    </div>
                    <div className="text-[11px] font-black text-slate-950 uppercase leading-tight min-h-[28px] line-clamp-2">
                      {dia.almoco.geral.proteina || 'Proteína não definida'}
                    </div>
                    <div className={cn(
                      "mt-2 flex items-center gap-1 text-[10px] font-bold",
                      completo ? "text-amber-950" : "text-amber-800"
                    )}>
                      <Beef className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {tipo || 'Corte pendente'} {quantidade > 0 ? `• ${quantidade} kg` : '• quantidade pendente'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[9.5px] text-slate-500 font-semibold">
                      <Snowflake className="w-3 h-3 shrink-0 text-blue-600" />
                      <span>{calc ? `Retirar ${calc.dataSaqueFormatada} • ${regra?.diasAntecedencia}d antes` : 'Saque ainda não calculado'}</span>
                    </div>
                    {adicionais.length > 0 && (
                      <div className="mt-1.5 text-[9px] font-bold text-amber-800 truncate">
                        + {adicionais.map(item => `${item.tipoCarne} (${item.quantidadeKg} kg)`).join(' • ')}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ------------------------------------------------------------------- */}
      {/* VIEW 1: STRUCTURED EDITOR BY DAY                                    */}
      {/* ------------------------------------------------------------------- */}
      {activeSubView === 'EDITOR' && (
        <div className="no-print space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Editor Estruturado de Refeições</h4>
                <p className="text-xs text-slate-500">
                  Preencha os campos estruturados de cada dia. A formatação de destaque (proteína em negrito e maiúsculas) é aplicada automaticamente no documento oficial.
                </p>
              </div>
              <button
                onClick={() => setActiveSubView('A4')}
                className="px-3 py-1.5 bg-[#1e382b] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-[#15271e] transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Ver Documento A4</span>
              </button>
            </div>

            {/* Grid of days */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {currentCardapio.dias.map((dia, idx) => (
                <div 
                  key={dia.date}
                  className={cn(
                    "border rounded-xl p-4 transition-all relative",
                    dia.diaSemana === 'Sábado' || dia.diaSemana === 'Domingo'
                      ? "bg-slate-50/90 border-slate-300"
                      : "bg-white border-slate-200 hover:border-slate-400"
                  )}
                >
                  {/* Card header */}
                  <div className="flex justify-between items-start mb-3 pb-2 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900">{dia.diaSemanaLabel}</span>
                        {dia.evento && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase">
                            {dia.evento}
                          </span>
                        )}
                        {dia.feriado && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase">
                            FERIADO
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-medium">{formatDdmmyyyy(dia.date)}</span>
                    </div>

                    <button
                      onClick={() => handleOpenEditMeal(idx, 'all')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <Edit3 className="w-3 h-3 text-emerald-800" />
                      <span>Editar Dia</span>
                    </button>
                  </div>

                  {/* Refeições preview */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Almoço Geral</span>
                        {dia.almoco.geral.tipoCarne && (
                          <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-900 text-[9.5px] font-bold">
                              {dia.almoco.geral.tipoCarne}
                              {dia.almoco.geral.quantidadeKg ? ` (${dia.almoco.geral.quantidadeKg} kg)` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-slate-800 font-medium text-[11px] leading-snug">
                        {dia.almoco.geral.proteina ? (
                          <>
                            <strong className="text-black font-black uppercase">{dia.almoco.geral.proteina}</strong>, {dia.almoco.geral.guarnicao || 'guarnição'}, {dia.almoco.geral.salada || 'saladas'}
                          </>
                        ) : (
                          <span className="text-slate-400 italic">Não configurado</span>
                        )}
                      </p>

                      {/* Informações operacionais de Saque da carne do dia */}
                      {dia.almoco.geral.tipoCarne && (() => {
                        const regra = REGRAS_DESCONGELAMENTO[dia.almoco.geral.tipoCarne!] || { diasAntecedencia: 2 };
                        const calc = calcularDataSaque(dia.date, regra.diasAntecedencia);
                        return (
                          <div className="mt-1 flex flex-wrap items-center gap-1 text-[9px]">
                            <span className={cn(
                              "px-1.5 py-0.2 rounded font-bold border",
                              calc.ehFimDeSemana
                                ? "bg-rose-50 border-rose-200 text-rose-800"
                                : "bg-blue-50 border-blue-200 text-blue-800"
                            )}>
                              Saque: {calc.dataSaqueFormatada} ({calc.diaSemanaSaque.split('-')[0]}) • {regra.diasAntecedencia}d antes
                            </span>
                            {dia.almoco.geral.carnesAdicionais && dia.almoco.geral.carnesAdicionais.length > 0 && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-semibold border border-amber-200">
                                +{dia.almoco.geral.carnesAdicionais[0].tipoCarne} ({dia.almoco.geral.carnesAdicionais[0].quantidadeKg} kg)
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Almoço Paciente</span>
                      <p className="text-slate-800 font-bold text-[11px]">
                        PACIENTE: <span className="uppercase text-black">{dia.almoco.pacienteProteina || 'PADRÃO'}</span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-slate-400 font-bold block uppercase">Café / Ceia</span>
                        <span className="text-slate-700 line-clamp-1">{dia.cafeManhaCeia}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block uppercase">Jantar Paciente</span>
                        <span className="text-slate-700 line-clamp-1">{dia.jantarPaciente.proteina ? `${dia.jantarPaciente.proteina.toUpperCase()}${dia.jantarPaciente.prato ? ` • ${dia.jantarPaciente.prato}` : ''}` : dia.jantarPaciente.prato}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* VIEW 2: OFFICIAL A4 LANDSCAPE DOCUMENT (On Screen & Print Engine)   */}
      {/* ------------------------------------------------------------------- */}
      {(activeSubView === 'A4' || true) && (
        <div className={cn(
          "w-full transition-all flex justify-center",
          activeSubView !== 'A4' && "hidden print:flex"
        )}>
          {/* Outer frame on screen */}
          <div 
            className="w-full max-w-[1180px] bg-slate-200/50 p-3 sm:p-6 rounded-2xl border border-slate-300/80 overflow-x-auto print:p-0 print:m-0 print:border-none print:bg-white print:max-w-none"
          >
            {/* Sheet wrapper with exact zoom scale */}
            <div 
              id="cardapio-print-sheet"
              style={{ 
                zoom: `${previewScale}%`,
              }}
              className="bg-white text-black p-6 sm:p-8 shadow-xl rounded-sm border border-slate-400 mx-auto min-w-[980px] print:shadow-none print:border-none print:p-0 print:m-0 print:min-w-0 print:w-full print:rounded-none"
            >
              
              {/* ========================================================= */}
              {/* BLOCO 1 & 2: CABEÇALHO DE VALIDAÇÃO (3 COLUNAS)           */}
              {/* ========================================================= */}
              <div className="border-2 border-black grid grid-cols-12 text-center text-black mb-3">
                
                {/* Coluna Esquerda: CONFERIDO */}
                <div 
                  onClick={() => setIsInstitutionalModalOpen(true)}
                  className="col-span-3 border-r-2 border-black p-2.5 flex flex-col justify-between items-center min-h-[95px] cursor-pointer hover:bg-slate-50 transition-colors print:hover:bg-transparent group"
                  title="Clique para editar dados ou assinar conferência"
                >
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-xs tracking-wider uppercase">CONFERIDO</span>
                    <Edit3 className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity print:hidden" />
                  </div>
                  
                  <div className="w-full flex flex-col items-center my-1">
                    {currentCardapio.workflow.conferido.status === 'CONFERIDO' ? (
                      <div className="text-[10px] text-emerald-900 font-extrabold bg-emerald-50 border border-emerald-600 px-2 py-0.5 rounded uppercase tracking-wider mb-1">
                        ✓ Conferido {currentCardapio.workflow.conferido.data ? `em ${currentCardapio.workflow.conferido.data}` : ''}
                      </div>
                    ) : (
                      <div className="w-4/5 border-b border-black h-5 mb-1" />
                    )}
                    <span className="text-[11px] font-bold tracking-tight">
                      {currentCardapio.workflow.conferido.cargo}
                    </span>
                    {currentCardapio.workflow.conferido.responsavel && (
                      <span className="text-[9px] text-slate-600">
                        {currentCardapio.workflow.conferido.responsavel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Coluna Central: IDENTIFICAÇÃO INSTITUCIONAL */}
                <div 
                  onClick={() => setIsInstitutionalModalOpen(true)}
                  className="col-span-6 p-2 flex flex-col justify-center items-center text-center space-y-0.5 cursor-pointer hover:bg-slate-50 transition-colors print:hover:bg-transparent group"
                  title="Clique para editar cabeçalho institucional e período"
                >
                  <div className="flex items-center gap-1">
                    <h4 className="font-black text-xs uppercase tracking-wider text-black">
                      {currentCardapio.regiaoMilitar}
                    </h4>
                    <Edit3 className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity print:hidden" />
                  </div>
                  <h3 className="font-black text-sm uppercase tracking-wide text-black">
                    {currentCardapio.organizacaoMilitar}
                  </h3>
                  <h5 className="font-extrabold text-xs uppercase tracking-wider text-black">
                    {currentCardapio.divisao}
                  </h5>
                  <div className="pt-1">
                    <p className="font-extrabold text-xs text-black border-t border-black/40 px-3 inline-block">
                      {formatCardapioTitle(currentCardapio.dataInicio, currentCardapio.dataFim)}
                    </p>
                  </div>
                </div>

                {/* Coluna Direita: APROVADO */}
                <div 
                  onClick={() => setIsInstitutionalModalOpen(true)}
                  className="col-span-3 border-l-2 border-black p-2.5 flex flex-col justify-between items-center min-h-[95px] cursor-pointer hover:bg-slate-50 transition-colors print:hover:bg-transparent group"
                  title="Clique para editar dados ou assinar aprovação"
                >
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-xs tracking-wider uppercase">APROVADO</span>
                    <Edit3 className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity print:hidden" />
                  </div>
                  
                  <div className="w-full flex flex-col items-center my-1">
                    {currentCardapio.workflow.aprovado.status === 'APROVADO' ? (
                      <div className="text-[10px] text-purple-900 font-extrabold bg-purple-50 border border-purple-600 px-2 py-0.5 rounded uppercase tracking-wider mb-1">
                        ✓ Aprovado {currentCardapio.workflow.aprovado.data ? `em ${currentCardapio.workflow.aprovado.data}` : ''}
                      </div>
                    ) : (
                      <div className="w-4/5 border-b border-black h-5 mb-1" />
                    )}
                    <span className="text-[11px] font-bold tracking-tight">
                      {currentCardapio.workflow.aprovado.cargo}
                    </span>
                    {currentCardapio.workflow.aprovado.responsavel && (
                      <span className="text-[9px] text-slate-600">
                        {currentCardapio.workflow.aprovado.responsavel}
                      </span>
                    )}
                  </div>
                </div>

              </div>

              {/* ========================================================= */}
              {/* BLOCO 3: MATRIZ DO CARDÁPIO SEMANAL (8 COLUNAS)           */}
              {/* ========================================================= */}
              <div className="border-2 border-black overflow-hidden mb-3">
                <table className="w-full border-collapse text-left table-fixed">
                  <thead>
                    <tr className="border-b-2 border-black text-center text-black">
                      {/* Coluna 1: Refeições */}
                      <th className="w-[12%] p-1.5 border-r-2 border-black bg-slate-100 font-extrabold text-xs uppercase tracking-tight align-middle">
                        Refeições
                      </th>

                      {/* Colunas 2-8: Seg a Dom */}
                      {currentCardapio.dias.map((dia, idx) => {
                        const isWeekend = dia.diaSemana === 'Sábado' || dia.diaSemana === 'Domingo';
                        return (
                          <th 
                            key={dia.date}
                            onClick={() => handleOpenEditMeal(idx, 'all')}
                            className={cn(
                              "p-1.5 border-r border-black last:border-r-0 align-middle transition-colors cursor-pointer group",
                              isWeekend ? "bg-slate-300/90 font-black text-black" : "bg-slate-50 text-black",
                              "hover:bg-emerald-100/80 print:hover:bg-transparent"
                            )}
                            title="Clique para editar o cardápio deste dia"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <div className="text-[11px] font-black uppercase tracking-tight leading-tight">
                                {dia.diaSemanaLabel}
                              </div>
                              <Edit3 className="w-2.5 h-2.5 text-emerald-800 opacity-0 group-hover:opacity-100 transition-opacity print:hidden" />
                            </div>
                            <div className="text-[10.5px] font-bold text-slate-900 mt-0.5">
                              {formatDdmmyyyy(dia.date)}
                            </div>
                            {dia.evento && (
                              <div className="text-[9px] font-extrabold uppercase text-black bg-white/80 border border-black/40 px-1 mt-0.5 rounded-xs inline-block">
                                {dia.evento}
                              </div>
                            )}
                            {dia.feriado && (
                              <div className="text-[9px] font-extrabold uppercase text-black bg-white/80 border border-black/40 px-1 mt-0.5 rounded-xs inline-block">
                                {dia.feriadoNome || 'feriado'}
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody className="divide-y border-black text-[11px]">
                    
                    {/* LINHA 1: Café da manhã / Ceia */}
                    <tr className="border-b border-black">
                      <td className="p-2 border-r-2 border-black bg-slate-100 font-bold text-xs text-black align-middle leading-tight">
                        Café manhã / Ceia
                      </td>
                      {currentCardapio.dias.map((dia, idx) => (
                        <td 
                          key={dia.date} 
                          onClick={() => handleOpenEditMeal(idx, 'cafe')}
                          className={cn(
                            "p-2 border-r border-black last:border-r-0 align-top leading-snug cursor-pointer transition-colors hover:bg-emerald-50/80 print:hover:bg-transparent relative group",
                            (dia.diaSemana === 'Sábado' || dia.diaSemana === 'Domingo') && "bg-slate-200/60"
                          )}
                          title={`Clique para editar o Café da manhã de ${dia.diaSemanaLabel}`}
                        >
                          {dia.cafeManhaCeia || <span className="text-slate-400 italic print:hidden">Editar...</span>}
                          <Edit3 className="w-2.5 h-2.5 text-emerald-700 opacity-0 group-hover:opacity-100 absolute top-1 right-1 print:hidden" />
                        </td>
                      ))}
                    </tr>

                    {/* LINHA 2: Colação PACIENTE */}
                    <tr className="border-b border-black">
                      <td className="p-2 border-r-2 border-black bg-slate-100 font-bold text-xs text-black align-middle leading-tight">
                        Colação PACIENTE
                      </td>
                      {currentCardapio.dias.map((dia, idx) => (
                        <td 
                          key={dia.date} 
                          onClick={() => handleOpenEditMeal(idx, 'colacao')}
                          className={cn(
                            "p-2 border-r border-black last:border-r-0 align-top leading-snug cursor-pointer transition-colors hover:bg-emerald-50/80 print:hover:bg-transparent relative group",
                            (dia.diaSemana === 'Sábado' || dia.diaSemana === 'Domingo') && "bg-slate-200/60"
                          )}
                          title={`Clique para editar a Colação de ${dia.diaSemanaLabel}`}
                        >
                          {dia.colacaoPaciente || <span className="text-slate-400 italic print:hidden">Editar...</span>}
                          <Edit3 className="w-2.5 h-2.5 text-emerald-700 opacity-0 group-hover:opacity-100 absolute top-1 right-1 print:hidden" />
                        </td>
                      ))}
                    </tr>

                    {/* LINHA 3: Almoço (High content, bold protein, patient row) */}
                    <tr className="border-b-2 border-black">
                      <td className="p-2 border-r-2 border-black bg-slate-100 font-black text-xs text-black align-middle leading-tight">
                        Almoço
                      </td>
                      {currentCardapio.dias.map((dia, idx) => (
                        <td 
                          key={dia.date} 
                          onClick={() => handleOpenEditMeal(idx, 'almoco')}
                          className={cn(
                            "p-2 border-r border-black last:border-r-0 align-top cursor-pointer transition-colors hover:bg-emerald-50/80 print:hover:bg-transparent relative group",
                            (dia.diaSemana === 'Sábado' || dia.diaSemana === 'Domingo') && "bg-slate-200/70"
                          )}
                          title={`Clique para editar o Almoço (Proteína, Guarnição, Salada...) de ${dia.diaSemanaLabel}`}
                        >
                          {renderAlmocoContent(dia)}
                          <Edit3 className="w-2.5 h-2.5 text-emerald-700 opacity-0 group-hover:opacity-100 absolute top-1 right-1 print:hidden" />
                        </td>
                      ))}
                    </tr>

                    {/* LINHA 4: Lanche (Célula mesclada única cobrindo toda a semana) */}
                    <tr className="border-b border-black bg-slate-100/90 text-center font-extrabold text-[11px] tracking-wider uppercase text-black">
                      <td className="p-2 border-r-2 border-black bg-slate-200 font-bold text-xs text-black text-left align-middle">
                        Lanche
                      </td>
                      <td 
                        colSpan={7} 
                        onClick={() => setIsInstitutionalModalOpen(true)}
                        className="p-2 text-center align-middle font-black tracking-widest text-slate-900 bg-slate-200/40 cursor-pointer hover:bg-slate-300/70 print:hover:bg-transparent transition-colors group"
                        title="Clique para editar o texto padrão do Lanche dos 7 dias"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{currentCardapio.lancheTexto}</span>
                          <Edit3 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity print:hidden" />
                        </div>
                      </td>
                    </tr>

                    {/* LINHA 5: Jantar PACIENTE */}
                    <tr className="border-b border-black">
                      <td className="p-2 border-r-2 border-black bg-slate-100 font-bold text-xs text-black align-middle leading-tight">
                        Jantar PACIENTE
                      </td>
                      {currentCardapio.dias.map((dia, idx) => (
                        <td 
                          key={dia.date} 
                          onClick={() => handleOpenEditMeal(idx, 'jantar')}
                          className={cn(
                            "p-2 border-r border-black last:border-r-0 align-top leading-snug cursor-pointer transition-colors hover:bg-emerald-50/80 print:hover:bg-transparent relative group",
                            (dia.diaSemana === 'Sábado' || dia.diaSemana === 'Domingo') && "bg-slate-200/60"
                          )}
                          title={`Clique para editar o Jantar do Paciente de ${dia.diaSemanaLabel}`}
                        >
                          {renderJantarContent(dia)}
                          <Edit3 className="w-2.5 h-2.5 text-emerald-700 opacity-0 group-hover:opacity-100 absolute top-1 right-1 print:hidden" />
                        </td>
                      ))}
                    </tr>

                    {/* LINHA 6: CEIA PACIENTE (Célula mesclada única cobrindo toda a semana) */}
                    <tr className="border-b border-black bg-slate-100/90 text-center font-extrabold text-[11px] tracking-wider uppercase text-black">
                      <td className="p-2 border-r-2 border-black bg-slate-200 font-bold text-xs text-black text-left align-middle">
                        CEIA PACIENTE
                      </td>
                      <td 
                        colSpan={7} 
                        onClick={() => setIsInstitutionalModalOpen(true)}
                        className="p-2 text-center align-middle font-black tracking-widest text-slate-900 bg-slate-200/40 cursor-pointer hover:bg-slate-300/70 print:hover:bg-transparent transition-colors group"
                        title="Clique para editar o texto padrão da Ceia de Pacientes dos 7 dias"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{currentCardapio.ceiaPacienteTexto}</span>
                          <Edit3 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity print:hidden" />
                        </div>
                      </td>
                    </tr>

                    {/* LINHA 7: CEIA */}
                    <tr>
                      <td className="p-2 border-r-2 border-black bg-slate-100 font-bold text-xs text-black align-middle leading-tight">
                        CEIA
                      </td>
                      {currentCardapio.dias.map((dia, idx) => (
                        <td 
                          key={dia.date} 
                          onClick={() => handleOpenEditMeal(idx, 'ceia')}
                          className={cn(
                            "p-2 border-r border-black last:border-r-0 align-top leading-snug cursor-pointer transition-colors hover:bg-emerald-50/80 print:hover:bg-transparent relative group",
                            (dia.diaSemana === 'Sábado' || dia.diaSemana === 'Domingo') && "bg-slate-200/60"
                          )}
                          title={`Clique para editar a Ceia de ${dia.diaSemanaLabel}`}
                        >
                          {dia.ceia || <span className="text-slate-400 italic print:hidden">Editar...</span>}
                          <Edit3 className="w-2.5 h-2.5 text-emerald-700 opacity-0 group-hover:opacity-100 absolute top-1 right-1 print:hidden" />
                        </td>
                      ))}
                    </tr>

                  </tbody>
                </table>
              </div>

              {/* ========================================================= */}
              {/* BLOCO 4: OBSERVAÇÃO (Linha única em largura total)         */}
              {/* ========================================================= */}
              <div 
                onClick={() => setIsInstitutionalModalOpen(true)}
                className="border border-black p-2 text-[10.5px] leading-relaxed text-black mb-4 cursor-pointer hover:bg-emerald-50/40 print:hover:bg-transparent transition-colors group relative"
                title="Clique para editar as observações e o básico da copa"
              >
                <span className="font-extrabold uppercase">OBSERVAÇÃO: </span>
                <span className="font-normal">{currentCardapio.observacaoGeral} </span>
                <span className="font-normal">{currentCardapio.basicoCopaInternados}</span>
                <span className="ml-1.5 text-[10px] text-emerald-800 font-bold inline-flex items-center gap-0.5 print:hidden opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit3 className="w-3 h-3" /> (editar observações)
                </span>
              </div>

              {/* ========================================================= */}
              {/* BLOCO 5: RODAPÉ INSTITUCIONAL (Data & Responsável Técnico)  */}
              {/* ========================================================= */}
              <div 
                onClick={() => setIsInstitutionalModalOpen(true)}
                className="pt-2 flex flex-col items-center text-center space-y-4 text-black cursor-pointer hover:bg-emerald-50/30 print:hover:bg-transparent p-2 rounded-sm transition-colors group relative"
                title="Clique para editar data de emissão e assinaturas"
              >
                
                {/* Local e Data por extenso */}
                <div className="text-xs font-semibold flex items-center gap-1">
                  <span>{formatExtensiveLocation(currentCardapio.dataEmissao, currentCardapio.cidade, currentCardapio.uf)}</span>
                  <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity print:hidden" />
                </div>

                {/* Linha de assinatura do Responsável Técnico */}
                <div className="flex flex-col items-center pt-3">
                  <div className="w-64 border-b border-black mb-1.5" />
                  <p className="font-black text-xs uppercase tracking-wide text-black">
                    {currentCardapio.responsavelTecnico.nome}
                  </p>
                  <p className="font-extrabold text-[11px] uppercase tracking-wider text-black">
                    {currentCardapio.responsavelTecnico.postoGraduacao} {currentCardapio.responsavelTecnico.funcao}
                  </p>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 1: EDIT SINGLE DAY MEALS (Structured form)                    */}
      {/* ------------------------------------------------------------------- */}
      {editingDayIndex !== null && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <span>{currentCardapio.dias[editingDayIndex].diaSemanaLabel}</span>
                  <span className="text-slate-400 font-normal">•</span>
                  <span className="text-slate-600 font-medium text-sm">
                    {formatDdmmyyyy(currentCardapio.dias[editingDayIndex].date)}
                  </span>
                  {editingFocusMeal !== 'all' && (
                    <span className="ml-2 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md uppercase">
                      Foco: {editingFocusMeal}
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-500">
                  Preencha os campos estruturados. As proteínas principais recebem destaque automático em negrito e maiúsculas.
                </p>
              </div>
              <button 
                onClick={() => setEditingDayIndex(null)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Bar: Copiar de outro dia & Limpar */}
            <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600">Copiar cardápio de:</span>
                <select
                  value={copySourceDayIndex}
                  onChange={e => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setCopySourceDayIndex(val);
                    if (val !== '') {
                      handleCopyFromDay(Number(val));
                    }
                  }}
                  className="px-2.5 py-1 border border-slate-300 rounded-md text-xs bg-white font-medium text-slate-800"
                >
                  <option value="">Selecionar outro dia...</option>
                  {currentCardapio.dias.map((d, dIdx) => (
                    dIdx !== editingDayIndex ? (
                      <option key={d.date} value={dIdx}>
                        {d.diaSemanaLabel} ({formatDdmmyyyy(d.date)})
                      </option>
                    ) : null
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Tem certeza que deseja limpar as refeições de ${currentCardapio.dias[editingDayIndex].diaSemanaLabel}?`)) {
                    handleClearDay(editingDayIndex);
                  }
                }}
                className="px-2.5 py-1 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors"
                title="Limpar todos os campos de refeições deste dia"
              >
                <Trash2 className="w-3 h-3 text-rose-600" />
                <span>Limpar Dia</span>
              </button>
            </div>

            {/* Refeição em foco: reduz a densidade do formulário sem alterar os dados */}
            <div className="px-6 py-2.5 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-1 overflow-x-auto">
                {([
                  ['all', 'Visão geral'],
                  ['cafe', 'Café / Ceia'],
                  ['colacao', 'Colação'],
                  ['almoco', 'Almoço'],
                  ['jantar', 'Jantar paciente'],
                  ['ceia', 'Ceia']
                ] as const).map(([mealId, label]) => (
                  <button
                    key={mealId}
                    type="button"
                    onClick={() => setEditingFocusMeal(mealId)}
                    className={cn(
                      "whitespace-nowrap px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors",
                      editingFocusMeal === mealId
                        ? "bg-[#1e382b] text-white border-[#1e382b]"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Form Scrollable */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              
              {/* Event & Holiday flags */}
              <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200", editingFocusMeal !== 'all' && "hidden")}>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Evento Especial
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: EVENTO, FORMATURA, etc."
                    value={currentCardapio.dias[editingDayIndex].evento || ''}
                    onChange={e => {
                      const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                      updated.dias[editingDayIndex].evento = e.target.value || undefined;
                      updateCurrentCardapio(updated);
                    }}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Feriado (Fundo Cinza)
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="day-feriado-check"
                      checked={!!currentCardapio.dias[editingDayIndex].feriado}
                      onChange={e => {
                        const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                        updated.dias[editingDayIndex].feriado = e.target.checked;
                        if (!e.target.checked) updated.dias[editingDayIndex].feriadoNome = undefined;
                        else if (!updated.dias[editingDayIndex].feriadoNome) updated.dias[editingDayIndex].feriadoNome = 'feriado';
                        updateCurrentCardapio(updated);
                      }}
                      className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-800"
                    />
                    <input
                      type="text"
                      placeholder="Nome do feriado (ex: feriado)"
                      disabled={!currentCardapio.dias[editingDayIndex].feriado}
                      value={currentCardapio.dias[editingDayIndex].feriadoNome || ''}
                      onChange={e => {
                        const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                        updated.dias[editingDayIndex].feriadoNome = e.target.value;
                        updateCurrentCardapio(updated);
                      }}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Refeição 1: Café da Manhã / Ceia */}
              <div className={cn(
                "p-3 rounded-xl border transition-all space-y-1.5",
                editingFocusMeal === 'cafe' ? "bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-200" : "bg-white border-slate-200",
                editingFocusMeal !== 'all' && editingFocusMeal !== 'cafe' && "hidden"
              )}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 block">
                    Café da manhã / Ceia
                  </label>
                  {editingFocusMeal === 'cafe' && (
                    <span className="text-[10px] font-bold text-emerald-700">Campo focado</span>
                  )}
                </div>
                <input
                  type="text"
                  value={currentCardapio.dias[editingDayIndex].cafeManhaCeia}
                  onChange={e => {
                    const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                    updated.dias[editingDayIndex].cafeManhaCeia = e.target.value;
                    updateCurrentCardapio(updated);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  placeholder="Ex: Pão francês, margarina, café com leite, fruta"
                />
              </div>

              {/* Refeição 2: Colação PACIENTE */}
              <div className={cn(
                "p-3 rounded-xl border transition-all space-y-1.5",
                editingFocusMeal === 'colacao' ? "bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-200" : "bg-white border-slate-200",
                editingFocusMeal !== 'all' && editingFocusMeal !== 'colacao' && "hidden"
              )}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 block">
                    Colação PACIENTE
                  </label>
                  {editingFocusMeal === 'colacao' && (
                    <span className="text-[10px] font-bold text-emerald-700">Campo focado</span>
                  )}
                </div>
                <input
                  type="text"
                  value={currentCardapio.dias[editingDayIndex].colacaoPaciente}
                  onChange={e => {
                    const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                    updated.dias[editingDayIndex].colacaoPaciente = e.target.value;
                    updateCurrentCardapio(updated);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  placeholder="Ex: Fruta (maçã) ou biscoito integral"
                />
              </div>

              {/* Refeição 3: ALMOÇO (ESTRUTURADO) */}
              <div className={cn(
                "p-4 rounded-xl space-y-3.5 border transition-all",
                editingFocusMeal === 'almoco' ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-300" : "bg-emerald-50/40 border-emerald-200/80",
                editingFocusMeal !== 'all' && editingFocusMeal !== 'almoco' && "hidden"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-800" />
                    Almoço Geral e Pacientes (Estruturado)
                  </span>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                    Proteína em destaque automático
                  </span>
                </div>

                {/* Live A4 Preview Card */}
                <div className="bg-white border border-emerald-300/80 rounded-lg p-3 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1 mb-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Pré-visualização Oficial no A4:
                  </span>
                  <div className="text-xs text-slate-900 leading-snug">
                    {renderAlmocoContent(currentCardapio.dias[editingDayIndex])}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Arroz</label>
                    <input
                      type="text"
                      value={currentCardapio.dias[editingDayIndex].almoco.geral.arroz}
                      onChange={e => {
                        const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                        updated.dias[editingDayIndex].almoco.geral.arroz = e.target.value;
                        updateCurrentCardapio(updated);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      placeholder="Arroz branco / colorido"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Feijão</label>
                    <input
                      type="text"
                      value={currentCardapio.dias[editingDayIndex].almoco.geral.feijao}
                      onChange={e => {
                        const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                        updated.dias[editingDayIndex].almoco.geral.feijao = e.target.value;
                        updateCurrentCardapio(updated);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      placeholder="Feijão carioca / preto"
                    />
                  </div>
                </div>

                {/* Proteína Principal (Destaque) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-emerald-900 uppercase tracking-wide block">
                      Proteína 1 — Almoço Geral *
                    </label>
                    <span className="text-[9.5px] text-emerald-700 font-bold">
                      Impressa em negrito e maiúsculas no A4
                    </span>
                  </div>
                  <input
                    type="text"
                    value={currentCardapio.dias[editingDayIndex].almoco.geral.proteina}
                    onChange={e => {
                      const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                      updated.dias[editingDayIndex].almoco.geral.proteina = e.target.value;
                      updateCurrentCardapio(updated);
                    }}
                    className="w-full px-3 py-2 border-2 border-emerald-600 rounded-lg text-xs font-bold bg-white text-emerald-950 focus:ring-2 focus:ring-emerald-800"
                    placeholder="Ex: LOMBO A CALIFÓRNIA, COXA E SOBRECOXA, PEIXE..."
                  />
                  {/* Sugestões secundárias ficam recolhidas para manter o foco no cadastro */}
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => setShowMealSuggestions(value => !value)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-600 transition-colors"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-700" />
                      <span>Sugestões e preenchimento rápido</span>
                      <span className="text-slate-400">{showMealSuggestions ? 'Ocultar' : 'Mostrar'}</span>
                    </button>
                    {showMealSuggestions && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                        {PRESET_PROTEINAS.map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                              updated.dias[editingDayIndex].almoco.geral.proteina = p;
                              updateCurrentCardapio(updated);
                            }}
                            className="px-2 py-1 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-emerald-900 rounded-md text-[10px] font-bold transition-colors"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tipo da Carne e Quantidade em Kg (Logo abaixo da Proteína Principal - Apenas Detalhamento Interno) */}
                <div className="space-y-3 p-4 rounded-xl bg-amber-50/60 border border-amber-300">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-200/80 rounded-lg text-amber-900">
                        <Beef className="w-4 h-4" />
                      </div>
                      <div>
                        <label className="text-xs font-black text-amber-950 uppercase tracking-wide block">
                          Proteína / Saque de Carnes *
                        </label>
                        <p className="text-[10px] text-amber-800 font-medium">
                          Informe a matéria-prima e a quantidade que serão retiradas da câmara fria. <strong className="font-bold">Esses dados alimentam o Saque de Carnes e não aparecem no cardápio A4.</strong>
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[9px] font-bold text-amber-900 bg-amber-200/90 border border-amber-300 px-2 py-0.5 rounded-full uppercase">
                      Operacional
                    </span>
                  </div>

                  {/* Grid de Corte e Quantidade em Kg */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Seleção do Tipo / Corte */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-amber-900 uppercase">
                        Corte / Matéria-Prima Principal *
                      </label>
                      <select
                        value={currentCardapio.dias[editingDayIndex].almoco.geral.tipoCarne || ''}
                        onChange={e => {
                          const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                          updated.dias[editingDayIndex].almoco.geral.tipoCarne = e.target.value;
                          updateCurrentCardapio(updated);
                        }}
                        className="w-full px-3 py-2 border-2 border-amber-400 rounded-lg text-xs font-bold bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                      >
                        <option value="">-- Selecione o Tipo da Carne --</option>
                        {TIPOS_CARNE_OPCOES.map(opcao => (
                          <option key={opcao} value={opcao}>
                            {opcao} ({REGRAS_DESCONGELAMENTO[opcao]?.diasAntecedencia || 2}d de antecedência)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Campo para Quantidade em kg */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-amber-900 uppercase flex items-center justify-between">
                        <span>Quantidade (Kg) *</span>
                        <span className="text-[9px] text-amber-700 font-semibold">Câmara Fria</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={currentCardapio.dias[editingDayIndex].almoco.geral.quantidadeKg ?? ''}
                          onChange={e => {
                            const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                            updated.dias[editingDayIndex].almoco.geral.quantidadeKg = e.target.value === '' ? '' : parseFloat(e.target.value);
                            updateCurrentCardapio(updated);
                          }}
                          className="w-full pl-3 pr-8 py-2 border-2 border-amber-400 rounded-lg text-xs font-black bg-white text-amber-950 focus:ring-2 focus:ring-amber-500 outline-none"
                          placeholder="Ex: 45"
                        />
                        <span className="absolute right-2.5 top-2.5 text-xs font-black text-amber-800">
                          kg
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Atalhos secundários de corte e quantidade */}
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => setShowMeatShortcuts(value => !value)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-300 bg-white hover:bg-amber-100 text-[10px] font-bold text-amber-900 transition-colors"
                    >
                      <Scale className="w-3 h-3" />
                      <span>Atalhos de corte e quantidade</span>
                      <span className="text-amber-600">{showMeatShortcuts ? 'Ocultar' : 'Mostrar'}</span>
                    </button>

                    {showMeatShortcuts && (
                      <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-white/80 p-2.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[9.5px] font-bold text-amber-900 mr-1">Quantidade:</span>
                          {[25, 35, 40, 45, 50, 60, 70, 80].map(kg => (
                            <button
                              key={kg}
                              type="button"
                              onClick={() => {
                                const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                                updated.dias[editingDayIndex].almoco.geral.quantidadeKg = kg;
                                updateCurrentCardapio(updated);
                              }}
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold transition-all border",
                                Number(currentCardapio.dias[editingDayIndex].almoco.geral.quantidadeKg) === kg
                                  ? "bg-amber-800 text-white border-amber-900"
                                  : "bg-white text-amber-900 border-amber-300 hover:bg-amber-100"
                              )}
                            >
                              {kg} kg
                            </button>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {TIPOS_CARNE_OPCOES.map(opcao => {
                            const isSelected = currentCardapio.dias[editingDayIndex].almoco.geral.tipoCarne === opcao;
                            const regra = REGRAS_DESCONGELAMENTO[opcao];
                            return (
                              <button
                                key={opcao}
                                type="button"
                                onClick={() => {
                                  const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                                  updated.dias[editingDayIndex].almoco.geral.tipoCarne = opcao;
                                  updateCurrentCardapio(updated);
                                }}
                                className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-extrabold transition-all border",
                                  isSelected
                                    ? "bg-amber-800 text-white border-amber-900"
                                    : "bg-white border-amber-300 hover:bg-amber-100 text-amber-950"
                                )}
                              >
                                {opcao} {regra ? `(${regra.diasAntecedencia}d)` : ''} {isSelected && '✓'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Caixa de Cálculo do Saque e Descongelamento do Dia */}
                  {currentCardapio.dias[editingDayIndex].almoco.geral.tipoCarne && (() => {
                    const tipo = currentCardapio.dias[editingDayIndex].almoco.geral.tipoCarne!;
                    const regra = REGRAS_DESCONGELAMENTO[tipo] || { diasAntecedencia: 2 };
                    const calc = calcularDataSaque(currentCardapio.dias[editingDayIndex].date, regra.diasAntecedencia);
                    const qtd = currentCardapio.dias[editingDayIndex].almoco.geral.quantidadeKg;

                    return (
                      <div className="p-3 bg-white rounded-lg border border-amber-300/80 shadow-2xs space-y-1.5 mt-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Snowflake className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-[11px] font-bold text-slate-900">
                              Parâmetro de Descongelamento:
                            </span>
                            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-900 text-[10px] font-black rounded">
                              {regra.diasAntecedencia} dias de antecedência
                            </span>
                          </div>
                          {calc.ehFimDeSemana && (
                            <span className="text-[9.5px] font-black bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-300">
                              ⚠️ Saque no Fim de Semana ({calc.diaSemanaSaque})
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-semibold text-slate-500">Data Programada do Saque: </span>
                            <strong className="text-slate-950 font-black">{calc.dataSaqueFormatada}</strong> ({calc.diaSemanaSaque})
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500">Consumo no Cardápio: </span>
                            <strong className="text-slate-950 font-black">{formatDdmmyyyy(currentCardapio.dias[editingDayIndex].date)}</strong> ({currentCardapio.dias[editingDayIndex].diaSemanaLabel})
                          </div>
                          {qtd ? (
                            <div>
                              <span className="font-semibold text-slate-500">Qtd a Retirar: </span>
                              <strong className="text-emerald-900 font-black">{qtd} kg</strong>
                            </div>
                          ) : (
                            <div className="text-amber-800 font-bold text-[10.5px]">
                              Preencha a quantidade em kg acima
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Carnes Adicionais (para preparações combinadas, ex: Linguiça, Salcichão) */}
                  <div className="pt-2 border-t border-amber-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-900 uppercase">
                        Carnes Adicionais / Embutidos (Opcional)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                          if (!updated.dias[editingDayIndex].almoco.geral.carnesAdicionais) {
                            updated.dias[editingDayIndex].almoco.geral.carnesAdicionais = [];
                          }
                          updated.dias[editingDayIndex].almoco.geral.carnesAdicionais!.push({
                            tipoCarne: 'LINGUIÇA',
                            quantidadeKg: 10,
                            observacao: ''
                          });
                          updateCurrentCardapio(updated);
                        }}
                        className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Adicionar 2º Corte / Embutido</span>
                      </button>
                    </div>

                    {currentCardapio.dias[editingDayIndex].almoco.geral.carnesAdicionais?.map((adicional, adIdx) => (
                      <div key={adIdx} className="p-2.5 bg-white rounded-lg border border-amber-300 flex flex-wrap items-center gap-2">
                        <div className="flex-1 min-w-[150px]">
                          <select
                            value={adicional.tipoCarne}
                            onChange={e => {
                              const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                              updated.dias[editingDayIndex].almoco.geral.carnesAdicionais![adIdx].tipoCarne = e.target.value;
                              updateCurrentCardapio(updated);
                            }}
                            className="w-full px-2 py-1 border border-amber-300 rounded text-xs font-bold bg-white text-slate-900"
                          >
                            {TIPOS_CARNE_OPCOES.map(opcao => (
                              <option key={opcao} value={opcao}>
                                {opcao} ({REGRAS_DESCONGELAMENTO[opcao]?.diasAntecedencia || 2}d)
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={adicional.quantidadeKg}
                              onChange={e => {
                                const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                                updated.dias[editingDayIndex].almoco.geral.carnesAdicionais![adIdx].quantidadeKg = e.target.value === '' ? '' : parseFloat(e.target.value);
                                updateCurrentCardapio(updated);
                              }}
                              className="w-full pl-2 pr-6 py-1 border border-amber-300 rounded text-xs font-bold bg-white"
                              placeholder="Kg"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-500">kg</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                            updated.dias[editingDayIndex].almoco.geral.carnesAdicionais!.splice(adIdx, 1);
                            updateCurrentCardapio(updated);
                          }}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          title="Remover carne adicional"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Guarnição</label>
                    <input
                      type="text"
                      value={currentCardapio.dias[editingDayIndex].almoco.geral.guarnicao}
                      onChange={e => {
                        const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                        updated.dias[editingDayIndex].almoco.geral.guarnicao = e.target.value;
                        updateCurrentCardapio(updated);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      placeholder="Ex: polenta assada, purê..."
                    />
                    {/* Guarnições chips */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {PRESET_GUARNICOES.slice(0, 3).map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                            updated.dias[editingDayIndex].almoco.geral.guarnicao = g;
                            updateCurrentCardapio(updated);
                          }}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9.5px]"
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Saladas</label>
                    <input
                      type="text"
                      value={currentCardapio.dias[editingDayIndex].almoco.geral.salada}
                      onChange={e => {
                        const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                        updated.dias[editingDayIndex].almoco.geral.salada = e.target.value;
                        updateCurrentCardapio(updated);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      placeholder="Ex: saladas diversas"
                    />
                    {/* Saladas chips */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {PRESET_SALADAS.slice(0, 3).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                            updated.dias[editingDayIndex].almoco.geral.salada = s;
                            updateCurrentCardapio(updated);
                          }}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9.5px]"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Bebida</label>
                    <input
                      type="text"
                      value={currentCardapio.dias[editingDayIndex].almoco.geral.bebida}
                      onChange={e => {
                        const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                        updated.dias[editingDayIndex].almoco.geral.bebida = e.target.value;
                        updateCurrentCardapio(updated);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      placeholder="Ex: suco"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Sobremesa</label>
                    <input
                      type="text"
                      value={currentCardapio.dias[editingDayIndex].almoco.geral.sobremesa}
                      onChange={e => {
                        const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                        updated.dias[editingDayIndex].almoco.geral.sobremesa = e.target.value;
                        updateCurrentCardapio(updated);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      placeholder="Ex: fruta ou sobremesa"
                    />
                  </div>
                </div>

                {/* Opção do Paciente */}
                <div className="pt-2 border-t border-emerald-200">
                  <label className="text-[10px] font-black text-emerald-950 uppercase tracking-wide block">
                    Proteína 2 — Almoço do Paciente
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-slate-500 text-xs">PACIENTE:</span>
                    <input
                      type="text"
                      value={currentCardapio.dias[editingDayIndex].almoco.pacienteProteina}
                      onChange={e => {
                        const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                        updated.dias[editingDayIndex].almoco.pacienteProteina = e.target.value;
                        updateCurrentCardapio(updated);
                      }}
                      className="flex-1 px-3 py-1.5 border border-emerald-300 rounded-lg text-xs font-bold uppercase bg-white text-emerald-950"
                      placeholder="Ex: PEITO FRANGO GRELHADO"
                    />
                  </div>
                  {/* Preset chips for Paciente */}
                  <div className="flex flex-wrap items-center gap-1 pt-1.5">
                    <span className="text-[10px] font-bold text-slate-400 mr-1">Sugestões Paciente:</span>
                    {PRESET_PACIENTE.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                          updated.dias[editingDayIndex].almoco.pacienteProteina = p;
                          updateCurrentCardapio(updated);
                        }}
                        className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 rounded text-[9.5px] font-bold transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg bg-amber-50/70 border border-amber-300">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-amber-950 uppercase tracking-wide block">Corte / Matéria-Prima — Almoço Paciente</label>
                      <select
                        value={currentCardapio.dias[editingDayIndex].almoco.pacienteTipoCarne || ''}
                        onChange={e => {
                          const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                          updated.dias[editingDayIndex].almoco.pacienteTipoCarne = e.target.value;
                          updateCurrentCardapio(updated);
                        }}
                        className="w-full px-3 py-2 border-2 border-amber-400 rounded-lg text-xs font-bold bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                      >
                        <option value="">-- Selecione o Tipo da Carne --</option>
                        {TIPOS_CARNE_OPCOES.map(opcao => (
                          <option key={`paciente-almoco-${opcao}`} value={opcao}>{opcao} ({REGRAS_DESCONGELAMENTO[opcao]?.diasAntecedencia || 2}d de antecedência)</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-amber-950 uppercase tracking-wide block">Quantidade (Kg)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={currentCardapio.dias[editingDayIndex].almoco.pacienteQuantidadeKg ?? ''}
                          onChange={e => {
                            const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                            updated.dias[editingDayIndex].almoco.pacienteQuantidadeKg = e.target.value === '' ? '' : parseFloat(e.target.value);
                            updateCurrentCardapio(updated);
                          }}
                          className="w-full pl-3 pr-8 py-2 border-2 border-amber-400 rounded-lg text-xs font-black bg-white text-amber-950 focus:ring-2 focus:ring-amber-500 outline-none"
                          placeholder="Ex: 8"
                        />
                        <span className="absolute right-2.5 top-2.5 text-xs font-black text-amber-800">kg</span>
                      </div>
                    </div>
                    <p className="md:col-span-3 text-[10px] text-amber-800 font-medium">Estes dados entram automaticamente no Saque de Carnes como <strong>ALMOÇO PACIENTE</strong> e não alteram a descrição impressa no cardápio A4.</p>
                  </div>
                </div>
              </div>

              {/* Refeição 5: Jantar PACIENTE */}
              <div className={cn(
                "p-3 rounded-xl border transition-all space-y-3",
                editingFocusMeal === 'jantar' ? "bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-200" : "bg-white border-slate-200",
                editingFocusMeal !== 'all' && editingFocusMeal !== 'jantar' && "hidden"
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block">
                      Jantar PACIENTE
                    </label>
                    <p className="text-[10px] text-slate-500">
                      Cadastre a proteína separadamente dos acompanhamentos para facilitar a leitura do cardápio.
                    </p>
                  </div>
                  {editingFocusMeal === 'jantar' && (
                    <span className="text-[10px] font-bold text-emerald-700">Campo focado</span>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                  <label className="text-[10px] font-black text-emerald-950 uppercase tracking-wide block">
                    Proteína 3 — Jantar do Paciente
                  </label>
                  <input
                    type="text"
                    value={currentCardapio.dias[editingDayIndex].jantarPaciente.proteina || ''}
                    onChange={e => {
                      const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                      updated.dias[editingDayIndex].jantarPaciente.proteina = e.target.value;
                      updateCurrentCardapio(updated);
                    }}
                    className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-xs font-bold uppercase bg-white text-emerald-950"
                    placeholder="Ex: ISCAS DE CARNE ACEBOLADA"
                  />
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 mr-1">Sugestões:</span>
                    {PRESET_PACIENTE.map(p => (
                      <button
                        key={`jantar-${p}`}
                        type="button"
                        onClick={() => {
                          const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                          updated.dias[editingDayIndex].jantarPaciente.proteina = p;
                          updateCurrentCardapio(updated);
                        }}
                        className="px-2 py-0.5 bg-white hover:bg-emerald-100 border border-emerald-200 text-emerald-900 rounded text-[9.5px] font-bold transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg bg-amber-50/70 border border-amber-300">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-amber-950 uppercase tracking-wide block">Corte / Matéria-Prima — Jantar Paciente</label>
                      <select
                        value={currentCardapio.dias[editingDayIndex].jantarPaciente.tipoCarne || ''}
                        onChange={e => {
                          const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                          updated.dias[editingDayIndex].jantarPaciente.tipoCarne = e.target.value;
                          updateCurrentCardapio(updated);
                        }}
                        className="w-full px-3 py-2 border-2 border-amber-400 rounded-lg text-xs font-bold bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                      >
                        <option value="">-- Selecione o Tipo da Carne --</option>
                        {TIPOS_CARNE_OPCOES.map(opcao => (
                          <option key={`paciente-jantar-${opcao}`} value={opcao}>{opcao} ({REGRAS_DESCONGELAMENTO[opcao]?.diasAntecedencia || 2}d de antecedência)</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-amber-950 uppercase tracking-wide block">Quantidade (Kg)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={currentCardapio.dias[editingDayIndex].jantarPaciente.quantidadeKg ?? ''}
                          onChange={e => {
                            const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                            updated.dias[editingDayIndex].jantarPaciente.quantidadeKg = e.target.value === '' ? '' : parseFloat(e.target.value);
                            updateCurrentCardapio(updated);
                          }}
                          className="w-full pl-3 pr-8 py-2 border-2 border-amber-400 rounded-lg text-xs font-black bg-white text-amber-950 focus:ring-2 focus:ring-amber-500 outline-none"
                          placeholder="Ex: 10"
                        />
                        <span className="absolute right-2.5 top-2.5 text-xs font-black text-amber-800">kg</span>
                      </div>
                    </div>
                    <p className="md:col-span-3 text-[10px] text-amber-800 font-medium">Estes dados entram automaticamente no Saque de Carnes como <strong>JANTAR PACIENTE</strong> e não alteram a descrição impressa no cardápio A4.</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-600 uppercase block">
                    Demais componentes do jantar
                  </label>
                  <textarea
                    rows={2}
                    value={currentCardapio.dias[editingDayIndex].jantarPaciente.prato}
                    onChange={e => {
                      const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                      updated.dias[editingDayIndex].jantarPaciente.prato = e.target.value;
                      updateCurrentCardapio(updated);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                    placeholder="Ex: Arroz, feijão, legumes ao vapor, sopa de legumes, fruta"
                  />
                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 mr-1">Combinações rápidas:</span>
                    {[
                      { proteina: 'ISCAS DE CARNE ACEBOLADA', prato: 'Arroz, feijão, legumes ao vapor, sopa de legumes, fruta' },
                      { proteina: 'PEITO DE FRANGO GRELHADO', prato: 'Arroz, feijão, purê, sopa, fruta' },
                      { proteina: 'OMELETE DE FORNO COM LEGUMES', prato: 'Arroz, feijão, canja, fruta' }
                    ].map((j, jIdx) => (
                      <button
                        key={jIdx}
                        type="button"
                        onClick={() => {
                          const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                          updated.dias[editingDayIndex].jantarPaciente.proteina = j.proteina;
                          updated.dias[editingDayIndex].jantarPaciente.prato = j.prato;
                          updateCurrentCardapio(updated);
                        }}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9.5px] text-left"
                      >
                        {j.proteina}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Refeição 7: CEIA */}
              <div className={cn(
                "p-3 rounded-xl border transition-all space-y-1.5",
                editingFocusMeal === 'ceia' ? "bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-200" : "bg-white border-slate-200",
                editingFocusMeal !== 'all' && editingFocusMeal !== 'ceia' && "hidden"
              )}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 block">
                    CEIA
                  </label>
                  {editingFocusMeal === 'ceia' && (
                    <span className="text-[10px] font-bold text-emerald-700">Campo focado</span>
                  )}
                </div>
                <input
                  type="text"
                  value={currentCardapio.dias[editingDayIndex].ceia}
                  onChange={e => {
                    const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                    updated.dias[editingDayIndex].ceia = e.target.value;
                    updateCurrentCardapio(updated);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  placeholder="Ex: Chá mate, pão francês com queijo, biscoito doce"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={editingDayIndex <= 0}
                  onClick={() => setEditingDayIndex(i => i !== null ? Math.max(0, i - 1) : null)}
                  className="px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 disabled:opacity-40 flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Dia Anterior</span>
                </button>
                <button
                  type="button"
                  disabled={editingDayIndex >= 6}
                  onClick={() => setEditingDayIndex(i => i !== null ? Math.min(6, i + 1) : null)}
                  className="px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 disabled:opacity-40 flex items-center gap-1"
                >
                  <span>Próximo Dia</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingDayIndex(null);
                  showToast('Alterações do dia salvas com sucesso!');
                }}
                className="px-4 py-2 bg-[#1e382b] hover:bg-[#15271e] text-white rounded-lg font-bold text-xs transition-colors shadow-xs"
              >
                Concluir Edição
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 2: INSTITUTIONAL HEADERS, SIGNATURES & OBSERVATIONS           */}
      {/* ------------------------------------------------------------------- */}
      {isInstitutionalModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Dados Institucionais &amp; Assinaturas</h4>
                <p className="text-xs text-slate-500">Configuração dos campos institucionais do cabeçalho e rodapé oficial</p>
              </div>
              <button 
                onClick={() => setIsInstitutionalModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              
              {/* Institutional identification */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Identificação Institucional</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600">Região Militar</label>
                    <input
                      type="text"
                      value={currentCardapio.regiaoMilitar}
                      onChange={e => {
                        const updated = { ...currentCardapio, regiaoMilitar: e.target.value };
                        updateCurrentCardapio(updated);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600">Divisão / Seção</label>
                    <input
                      type="text"
                      value={currentCardapio.divisao}
                      onChange={e => {
                        const updated = { ...currentCardapio, divisao: e.target.value };
                        updateCurrentCardapio(updated);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Organização Militar</label>
                  <input
                    type="text"
                    value={currentCardapio.organizacaoMilitar}
                    onChange={e => {
                      const updated = { ...currentCardapio, organizacaoMilitar: e.target.value };
                      updateCurrentCardapio(updated);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>
              </div>

              {/* Validation signatories */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assinaturas de Validação</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 rounded-xl border border-slate-200 bg-slate-50/70">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wide text-slate-700">Fiscal ADM / Conferência</span>
                      <p className="text-[9.5px] text-slate-500">Dados exibidos no bloco CONFERIDO do cabeçalho oficial.</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600">Cargo / Função</label>
                      <input
                        type="text"
                        value={currentCardapio.workflow.conferido.cargo}
                        onChange={e => {
                          const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                          updated.workflow.conferido.cargo = e.target.value;
                          updateCurrentCardapio(updated);
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        placeholder="Ex: Chefe Fiscal Adm."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600">Nome do Fiscal ADM</label>
                      <input
                        type="text"
                        value={currentCardapio.workflow.conferido.responsavel}
                        onChange={e => {
                          const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                          updated.workflow.conferido.responsavel = e.target.value;
                          updateCurrentCardapio(updated);
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-semibold"
                        placeholder="Ex: Maj Fulano de Tal"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 p-3 rounded-xl border border-slate-200 bg-slate-50/70">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wide text-slate-700">Diretor(a) HGeSM / Aprovação</span>
                      <p className="text-[9.5px] text-slate-500">Dados exibidos no bloco de aprovação do cabeçalho oficial.</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600">Cargo / Função</label>
                      <input
                        type="text"
                        value={currentCardapio.workflow.aprovado.cargo}
                        onChange={e => {
                          const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                          updated.workflow.aprovado.cargo = e.target.value;
                          updateCurrentCardapio(updated);
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        placeholder="Ex: Diretor(a) HGeSM"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600">Nome do(a) Diretor(a) HGeSM</label>
                      <input
                        type="text"
                        value={currentCardapio.workflow.aprovado.responsavel}
                        onChange={e => {
                          const updated = JSON.parse(JSON.stringify(currentCardapio)) as WeeklyCardapioDoc;
                          updated.workflow.aprovado.responsavel = e.target.value;
                          updateCurrentCardapio(updated);
                        }}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-semibold"
                        placeholder="Ex: Cel Fulana de Tal"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Responsável Técnico */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Responsável Técnico (Nutricionista)</span>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Nome Completo</label>
                  <input
                    type="text"
                    value={currentCardapio.responsavelTecnico.nome}
                    onChange={e => {
                      const updated = {
                        ...currentCardapio,
                        responsavelTecnico: { ...currentCardapio.responsavelTecnico, nome: e.target.value }
                      };
                      updateCurrentCardapio(updated);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-bold uppercase"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600">Posto / Graduação</label>
                    <input
                      type="text"
                      value={currentCardapio.responsavelTecnico.postoGraduacao}
                      onChange={e => {
                        const updated = {
                          ...currentCardapio,
                          responsavelTecnico: { ...currentCardapio.responsavelTecnico, postoGraduacao: e.target.value }
                        };
                        updateCurrentCardapio(updated);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      placeholder="1º Ten"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600">Função</label>
                    <input
                      type="text"
                      value={currentCardapio.responsavelTecnico.funcao}
                      onChange={e => {
                        const updated = {
                          ...currentCardapio,
                          responsavelTecnico: { ...currentCardapio.responsavelTecnico, funcao: e.target.value }
                        };
                        updateCurrentCardapio(updated);
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      placeholder="NUTRICIONISTA"
                    />
                  </div>
                </div>
              </div>

              {/* Linhas Mescladas (Lanche & Ceia Pacientes) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Linhas Mescladas de Pacientes (Semana Completa)
                </span>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Texto do Lanche (Mesclado nos 7 dias)</label>
                  <input
                    type="text"
                    value={currentCardapio.lancheTexto}
                    onChange={e => {
                      const updated = { ...currentCardapio, lancheTexto: e.target.value };
                      updateCurrentCardapio(updated);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-bold"
                    placeholder="Ex: OLHAR CARDÁPIO DE PACIENTES COPA"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Texto da Ceia Paciente (Mesclado nos 7 dias)</label>
                  <input
                    type="text"
                    value={currentCardapio.ceiaPacienteTexto}
                    onChange={e => {
                      const updated = { ...currentCardapio, ceiaPacienteTexto: e.target.value };
                      updateCurrentCardapio(updated);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-bold"
                    placeholder="Ex: OLHAR CARDÁPIO DE PACIENTES COPA"
                  />
                </div>
              </div>

              {/* Observações & Local/Data */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Observações do Rodapé</span>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Observação Geral</label>
                  <textarea
                    rows={2}
                    value={currentCardapio.observacaoGeral}
                    onChange={e => {
                      const updated = { ...currentCardapio, observacaoGeral: e.target.value };
                      updateCurrentCardapio(updated);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Básico para a Copa dos Internados</label>
                  <textarea
                    rows={2}
                    value={currentCardapio.basicoCopaInternados}
                    onChange={e => {
                      const updated = { ...currentCardapio, basicoCopaInternados: e.target.value };
                      updateCurrentCardapio(updated);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>
              </div>

              {/* Emissão */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Data de Emissão (Oficial)</label>
                  <input
                    type="date"
                    value={currentCardapio.dataEmissao}
                    onChange={e => {
                      const updated = { ...currentCardapio, dataEmissao: e.target.value };
                      updateCurrentCardapio(updated);
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Cidade - UF</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={currentCardapio.cidade}
                      onChange={e => {
                        const updated = { ...currentCardapio, cidade: e.target.value };
                        updateCurrentCardapio(updated);
                      }}
                      className="w-2/3 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                    />
                    <input
                      type="text"
                      value={currentCardapio.uf}
                      onChange={e => {
                        const updated = { ...currentCardapio, uf: e.target.value };
                        updateCurrentCardapio(updated);
                      }}
                      className="w-1/3 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsInstitutionalModalOpen(false);
                  showToast('Dados institucionais atualizados com sucesso!');
                }}
                className="px-4 py-2 bg-[#1e382b] text-white rounded-lg font-bold text-xs hover:bg-[#15271e] transition-colors"
              >
                Salvar Configurações
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 4: SAQUE DE CARNES (CÂMARA FRIA & DESCONGELAMENTO)            */}
      {/* ------------------------------------------------------------------- */}
      {isSaqueCarnesModalOpen && (() => {
        const listaSaque = gerarListaSaqueCarnes(currentCardapio.dias);
        const totalKgSemana = listaSaque.reduce((acc, item) => acc + item.quantidadeKg, 0);
        const saquesFimDeSemana = listaSaque.filter(item => item.ehFimDeSemana);

        return (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden"
            >
              {/* Modal Top Bar */}
              <div className="px-6 py-4 bg-white border-b border-slate-200 flex flex-wrap justify-between items-center gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 text-amber-900 rounded-xl border border-amber-200">
                    <Beef className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 text-base">
                        Mapa de Saque de Carnes da Câmara Fria
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                        Documento Operacional Semanal
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Controle e cronograma de retirada com tempo hábil de descongelamento sob refrigeração ({formatDdmmyyyy(currentCardapio.dataInicio)} a {formatDdmmyyyy(currentCardapio.dataFim)})
                    </p>
                  </div>
                </div>

                {/* Top Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySaqueText}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-300"
                    title="Copiar resumo textual para WhatsApp/Despensa"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Texto</span>
                  </button>

                  <button
                    onClick={handleDownloadSaquePdf}
                    disabled={isGeneratingSaquePdf}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-60"
                    title="Baixar Mapa de Saque em PDF A4"
                  >
                    {isGeneratingSaquePdf ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Gerando PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-white" />
                        <span>Baixar PDF (A4)</span>
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => setIsSaqueCarnesModalOpen(false)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* KPI Bar & Instructions */}
              <div className="px-6 py-3 bg-amber-50/70 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-amber-900/70 uppercase block">Total Geral de Carnes</span>
                    <strong className="text-base font-black text-amber-950">{totalKgSemana.toFixed(1)} kg</strong>
                  </div>
                  <div className="h-6 w-px bg-amber-200" />
                  <div>
                    <span className="text-[10px] font-bold text-amber-900/70 uppercase block">Retiradas Programadas</span>
                    <strong className="text-base font-black text-slate-900">{listaSaque.length} saques</strong>
                  </div>
                  <div className="h-6 w-px bg-amber-200" />
                  <div>
                    <span className="text-[10px] font-bold text-amber-900/70 uppercase block">Regras EB Aplicadas</span>
                    <span className="text-xs font-extrabold text-blue-900">2 a 3 dias antecedência</span>
                  </div>
                </div>

                {saquesFimDeSemana.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-[11px] font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{saquesFimDeSemana.length} saque(s) caem em sábado/domingo (verificar chave e escala de plantão).</span>
                  </div>
                )}
              </div>

              {/* Scrollable Printable Document View */}
              <div className="p-6 overflow-y-auto flex-1 flex justify-center bg-slate-200/60">
                
                {/* Official Printable Sheet Container */}
                <div 
                  id="saque-carnes-print-sheet" 
                  className="bg-white w-[794px] min-h-[1050px] p-8 rounded-lg shadow-md border border-slate-300 text-black flex flex-col justify-between"
                  style={{ fontFamily: "'Liberation Sans', Arial, Helvetica, sans-serif" }}
                >
                  <div>
                    {/* Official Document Header */}
                    <div className="text-center pb-3 border-b-2 border-black">
                      <h4 className="text-[12px] font-black uppercase tracking-wider text-black">
                        MINISTÉRIO DA DEFESA
                      </h4>
                      <h5 className="text-[12px] font-black uppercase tracking-wider text-black">
                        EXÉRCITO BRASILEIRO
                      </h5>
                      <p className="text-[10px] font-bold uppercase text-slate-800 tracking-wide">
                        {currentCardapio.regiaoMilitar} • {currentCardapio.organizacaoMilitar}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-700">
                        {currentCardapio.divisao} — {currentCardapio.cidade}-{currentCardapio.uf}
                      </p>

                      <div className="mt-3 pt-2 border-t border-slate-300">
                        <h2 className="text-[15px] font-black tracking-tight uppercase text-black">
                          MAPA SEMANAL DE SAQUE DE CARNES (CÂMARA FRIA)
                        </h2>
                        <p className="text-[11px] font-bold text-slate-800">
                          CRONOGRAMA DE RETIRADA PARA DESCONGELAMENTO CONTROLADO SOB REFRIGERAÇÃO
                        </p>
                        <p className="text-[10px] font-medium text-slate-600 mt-0.5">
                          Período de Consumo no Cardápio: <strong className="font-black text-black">{formatDdmmyyyy(currentCardapio.dataInicio)} a {formatDdmmyyyy(currentCardapio.dataFim)}</strong> | Emissão: {new Date().toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    {/* Technical Directives Box */}
                    <div className="mt-3 p-2.5 bg-slate-50 border border-slate-300 rounded text-[9.5px] leading-relaxed text-slate-800">
                      <strong className="font-black text-black uppercase block text-[10px]">
                        Normas Técnicas de Segurança Alimentar &amp; Descongelamento (Portaria RDC 216 / Regulamento EB):
                      </strong>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5">
                        <li>
                          <strong className="font-bold">Temperatura Controlada:</strong> O descongelamento deve ser realizado exclusivamente em câmara ou refrigerador sob temperatura de <strong>0°C a +4°C</strong>.
                        </li>
                        <li>
                          <strong className="font-bold">Vedação Absoluta:</strong> É estritamente proibido o descongelamento em temperatura ambiente, água parada ou água quente.
                        </li>
                        <li>
                          <strong className="font-bold">Regra de 3 Dias:</strong> Peças grandes e fibrosas (MIOLO DE ALCATRA, PATINHO, COXÃO DURO, COXÃO MOLE, PERNIL) devem ser retiradas com <strong>3 dias de antecedência</strong>.
                        </li>
                        <li>
                          <strong className="font-bold">Regra de 2 Dias:</strong> Demais cortes (MAMINHA, LAGARTO, FRALDINHA, BISTECA, LOMBO, PEITO, SASSAMI, CONTRA FILÉ, TILÁPIA, MERLUZA, COXA/SOBRECOXA, LINGUIÇA, SALCICHÃO) devem ser retirados com <strong>2 dias de antecedência</strong>.
                        </li>
                      </ul>
                    </div>

                    {/* Main Schedule Table */}
                    <div className="mt-4">
                      <table className="w-full border-collapse border-2 border-black text-[10.5px]">
                        <thead>
                          <tr className="bg-slate-200 text-black border-b-2 border-black">
                            <th className="border border-black px-2 py-1.5 text-center font-black uppercase text-[10px] w-28">
                              RETIRAR EM
                            </th>
                            <th className="border border-black px-2 py-1.5 text-left font-black uppercase text-[10px]">
                              CARNE / CORTE
                            </th>
                            <th className="border border-black px-2 py-1.5 text-center font-black uppercase text-[10px] w-20">
                              QUANTIDADE
                            </th>
                            <th className="border border-black px-2 py-1.5 text-center font-black uppercase text-[10px] w-24">
                              Antecedência
                            </th>
                            <th className="border border-black px-2 py-1.5 text-left font-black uppercase text-[10px]">
                              Destino no Cardápio (Dia / Preparação)
                            </th>
                            <th className="border border-black px-2 py-1.5 text-center font-black uppercase text-[10px] w-24">
                              Visto Despensa
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {listaSaque.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="border border-black p-6 text-center text-slate-500 italic">
                                Nenhuma carne ou corte cadastrado para as refeições desta semana.
                              </td>
                            </tr>
                          ) : (
                            listaSaque.map((item, index) => {
                              return (
                                <tr 
                                  key={index} 
                                  className={cn(
                                    "border-b border-black",
                                    item.ehFimDeSemana ? "bg-amber-50/60" : index % 2 === 1 ? "bg-slate-50" : "bg-white"
                                  )}
                                >
                                  {/* Data do Saque */}
                                  <td className="border border-black px-2 py-1.5 text-center">
                                    <strong className="block text-black font-black text-[13px]">
                                      {item.dataSaqueFormatada}
                                    </strong>
                                    <span className={cn(
                                      "text-[9px] uppercase font-black px-1 py-0.2 rounded inline-block mt-0.5",
                                      item.ehFimDeSemana ? "bg-rose-100 text-rose-900 border border-rose-300" : "text-slate-600"
                                    )}>
                                      {item.diaSemanaSaque}
                                    </span>
                                  </td>

                                  {/* Corte */}
                                  <td className="border border-black px-2 py-1.5">
                                    <strong className="text-black font-black text-[13px] block">
                                      {item.tipoCarne}
                                    </strong>
                                    {item.observacao && (
                                      <span className="text-[9px] text-slate-600 block">
                                        Obs: {item.observacao}
                                      </span>
                                    )}
                                  </td>

                                  {/* Qtd em Kg */}
                                  <td className="border border-black px-2 py-1.5 text-center font-black text-black text-[13px]">
                                    {item.quantidadeKg > 0 ? (
                                      <span>{item.quantidadeKg.toFixed(1)} kg</span>
                                    ) : (
                                      <span className="text-slate-400 italic font-normal text-[9px]">A aferir</span>
                                    )}
                                  </td>

                                  {/* Antecedência */}
                                  <td className="border border-black px-2 py-1.5 text-center text-[10px]">
                                    <span className={cn(
                                      "font-black px-1.5 py-0.5 rounded border inline-block",
                                      item.diasAntecedencia === 3 
                                        ? "bg-purple-100 text-purple-950 border-purple-300" 
                                        : "bg-blue-100 text-blue-950 border-blue-300"
                                    )}>
                                      {item.diasAntecedencia} DIAS
                                    </span>
                                  </td>

                                  {/* Dia do Cardápio & Preparação */}
                                  <td className="border border-black px-2 py-1.5 text-[10px]">
                                    <div className="font-bold text-slate-900">
                                      {item.diaSemanaCardapioLabel} ({formatDdmmyyyy(item.diaCardapioIso)})
                                    </div>
                                    <div className="text-slate-700 uppercase font-semibold text-[9.5px]">
                                      {item.origem}: {item.preparacao}
                                    </div>
                                  </td>

                                  {/* Visto / Rubrica */}
                                  <td className="border border-black px-2 py-1.5 text-center">
                                    <div className="h-6 w-full border-b border-dotted border-slate-400 flex items-end justify-center">
                                      <span className="text-[8px] text-slate-400">rubrica</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-200 border-t-2 border-black font-black text-black">
                            <td colSpan={2} className="border border-black px-3 py-2 text-right uppercase text-[10.5px]">
                              TOTAL GERAL DE CARNES DA SEMANA:
                            </td>
                            <td className="border border-black px-2 py-2 text-center text-[12px] font-black">
                              {totalKgSemana.toFixed(1)} kg
                            </td>
                            <td colSpan={3} className="border border-black px-3 py-2 text-[10px] font-bold text-slate-700">
                              {listaSaque.length} cortes programados para a câmara fria
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
        {/* Document Footer */}
        <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[8.5px] text-slate-500">
          Documento oficial gerado pelo Sistema de Aprovisionamento do Hospital Geral de Santa Maria (HGeSM) • Uso interno de controle de estoque e segurança dos alimentos.
        </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 bg-white border-t border-slate-200 flex justify-between items-center text-xs shrink-0">
                <span className="text-slate-500">
                  Formato de impressão configurado: <strong className="text-slate-800">A4 Orientação Retrato (Portrait)</strong>
                </span>
                <button
                  onClick={() => setIsSaqueCarnesModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}
      {isNewWeekModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
          >
            <div className="px-6 py-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
              <h4 className="font-bold text-slate-900 text-sm">Criar Cardápio de Nova Semana</h4>
              <button 
                onClick={() => setIsNewWeekModalOpen(false)}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewWeek} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Segunda-feira de Início *
                </label>
                <input
                  type="date"
                  required
                  value={newWeekMonday}
                  onChange={e => setNewWeekMonday(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-semibold"
                />
                <p className="text-[11px] text-slate-500">
                  O sistema gerará automaticamente as datas de Segunda a Domingo e o título do documento.
                </p>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleResetToOfficialTemplate}
                  className="text-[11px] text-emerald-800 hover:underline font-semibold"
                >
                  Restaurar Template 14-20 Set
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1e382b] hover:bg-[#15271e] text-white rounded-lg font-bold text-xs transition-colors shadow-xs"
                >
                  Gerar Semana
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
