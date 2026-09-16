import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isMilitaryAbsentOnDate,
  normalizeMilitaryStatuses,
  recalculateDutyCounts,
  resolveAbsenceStatus,
  rosterCompliance,
} from '../lib/domain/roster-integrity.ts';
import { getCardapioReadiness } from '../lib/domain/cardapio-readiness.ts';

test('afastamento futuro permanece agendado e não afasta o militar hoje', () => {
  const absence = { militaryId: 'm1', startDate: '2026-10-10', endDate: '2026-10-20', indefinite: false, status: 'AGENDADO' as const };
  assert.equal(resolveAbsenceStatus(absence, '2026-09-15'), 'AGENDADO');
  assert.equal(isMilitaryAbsentOnDate([absence], 'm1', '2026-09-15'), false);
  assert.equal(isMilitaryAbsentOnDate([absence], 'm1', '2026-10-12'), true);
  const [military] = normalizeMilitaryStatuses([{ id: 'm1', status: 'Afastado' as const, dutyCount: 0 }], [absence], '2026-09-15');
  assert.equal(military.status, 'Ativo');
});

test('afastamento encerrado preserva o período histórico e libera datas posteriores', () => {
  const absence = { militaryId: 'm1', startDate: '2026-09-01', endDate: '2026-09-30', indefinite: false, status: 'ENCERRADO' as const, actualEndDate: '2026-09-10' };
  assert.equal(resolveAbsenceStatus(absence, '2026-09-15'), 'ENCERRADO');
  assert.equal(isMilitaryAbsentOnDate([absence], 'm1', '2026-09-05'), true);
  assert.equal(isMilitaryAbsentOnDate([absence], 'm1', '2026-09-15'), false);
});

test('afastamento cancelado nunca bloqueia a escala', () => {
  const absence = { militaryId: 'm1', startDate: '2026-09-10', endDate: '2026-09-20', indefinite: false, status: 'CANCELADO' as const };
  assert.equal(isMilitaryAbsentOnDate([absence], 'm1', '2026-09-15'), false);
});

test('contagem de serviços e conformidade ignoram DISP', () => {
  const roster = {
    '19/09/2026': {
      A: { militaryId: 'm1', type: 'EV' as const },
      B: { militaryId: 'm2', type: 'DISP' as const },
      C: null,
    },
  };
  const military = recalculateDutyCounts([
    { id: 'm1', status: 'Ativo' as const, dutyCount: 99 },
    { id: 'm2', status: 'Afastado' as const, dutyCount: 99 },
  ], roster);
  assert.deepEqual(military.map(item => item.dutyCount), [1, 0]);
  assert.deepEqual(rosterCompliance(roster), { total: 3, filled: 1, rate: 33 });
});

test('prontidão rejeita cardápio incompleto e proteínas sem corte ou quantidade', () => {
  const day = {
    diaSemanaLabel: '2ª FEIRA', cafeManhaCeia: 'Café', colacaoPaciente: 'Fruta', ceia: 'Chá',
    almoco: {
      geral: { arroz: 'Arroz', feijao: 'Feijão', proteina: 'Carne', tipoCarne: 'PATINHO', quantidadeKg: '', guarnicao: 'Purê', salada: 'Salada', bebida: 'Suco', sobremesa: 'Fruta' },
      pacienteProteina: 'Frango', pacienteTipoCarne: '', pacienteQuantidadeKg: '',
    },
    jantarPaciente: { prato: 'Sopa', proteina: '', tipoCarne: '', quantidadeKg: '' },
  };
  const cardapio = {
    organizacaoMilitar: 'HGeSM', divisao: 'Aprovisionamento', cidade: 'Santa Maria', uf: 'RS',
    responsavelTecnico: { nome: 'Resp', postoGraduacao: 'Ten', funcao: 'Nutricionista' },
    workflow: { conferido: { responsavel: 'Chefe' }, aprovado: { responsavel: 'Direção' } },
    dias: Array.from({ length: 7 }, (_, index) => ({ ...day, diaSemanaLabel: `D${index + 1}` })),
  };
  const result = getCardapioReadiness(cardapio);
  assert.equal(result.ok, false);
  assert(result.missing.some(item => item.includes('informe a quantidade em kg')));
  assert(result.missing.some(item => item.includes('proteína do jantar do paciente')));
});
