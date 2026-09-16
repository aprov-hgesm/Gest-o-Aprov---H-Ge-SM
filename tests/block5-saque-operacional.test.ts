import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createOrTransitionSaqueRecord,
  decorateSaqueItem,
  filterSaqueItems,
  groupSaqueItems,
  resolveSaqueUrgency,
  summarizeSaque,
  type SaqueSourceItem,
} from '../lib/domain/saque-operacional.ts';

const source: SaqueSourceItem = {
  id: 'saque-2026-09-18-almoco-geral',
  diaCardapioIso: '2026-09-18',
  diaSemanaCardapioLabel: '6ª FEIRA',
  preparacao: 'PATINHO AO MOLHO',
  origem: 'ALMOÇO GERAL',
  tipoCarne: 'PATINHO',
  quantidadeKg: 10,
  diasAntecedencia: 3,
  dataSaqueIso: '2026-09-15',
  dataSaqueFormatada: '15/09/2026',
  diaSemanaSaque: 'Terça-feira',
  ehFimDeSemana: false,
  diaIndex: 4,
};

test('urgência operacional distingue atrasado, hoje, próximo e concluído', () => {
  assert.equal(resolveSaqueUrgency('2026-09-14', 'PENDENTE', '2026-09-15'), 'ATRASADO');
  assert.equal(resolveSaqueUrgency('2026-09-15', 'PENDENTE', '2026-09-15'), 'HOJE');
  assert.equal(resolveSaqueUrgency('2026-09-17', 'SEPARADO', '2026-09-15'), 'PROXIMO');
  assert.equal(resolveSaqueUrgency('2026-09-25', 'PENDENTE', '2026-09-15'), 'FUTURO');
  assert.equal(resolveSaqueUrgency('2026-09-14', 'RETIRADO', '2026-09-15'), 'CONCLUIDO');
});

test('transições preservam histórico sem modificar o cardápio-fonte', () => {
  const separated = createOrTransitionSaqueRecord(undefined, {
    cardapioId: 'cardapio-2026-09-14', saqueItemId: source.id, status: 'SEPARADO', at: '2026-09-15T08:00:00.000Z',
  });
  const withdrawn = createOrTransitionSaqueRecord(separated, {
    cardapioId: 'cardapio-2026-09-14', saqueItemId: source.id, status: 'RETIRADO', at: '2026-09-15T10:00:00.000Z', note: 'Retirado no freezer 2',
  });
  assert.equal(withdrawn.history.length, 2);
  assert.deepEqual(withdrawn.history.map(item => item.status), ['SEPARADO', 'RETIRADO']);
  assert.equal(withdrawn.note, 'Retirado no freezer 2');
  assert.equal(source.quantidadeKg, 10);
});

test('decoração, filtros, agrupamento e resumo consolidam o saque sem duplicar kg', () => {
  const record = createOrTransitionSaqueRecord(undefined, {
    cardapioId: 'cardapio-2026-09-14', saqueItemId: source.id, status: 'SEPARADO', at: '2026-09-15T08:00:00.000Z',
  });
  const first = decorateSaqueItem(
    { id: 'cardapio-2026-09-14', dataInicio: '2026-09-14', dataFim: '2026-09-20' },
    source,
    record,
    new Set(['2026-09-15']),
    '2026-09-15',
  );
  const second = decorateSaqueItem(
    { id: 'cardapio-2026-09-14', dataInicio: '2026-09-14', dataFim: '2026-09-20' },
    { ...source, id: 'saque-2026-09-19-paciente', origem: 'ALMOÇO PACIENTE', tipoCarne: 'PEITO', quantidadeKg: 3, dataSaqueIso: '2026-09-17', diaCardapioIso: '2026-09-19' },
    undefined,
    new Set(),
    '2026-09-15',
  );
  assert.equal(first.isHoliday, true);
  assert.equal(first.status, 'SEPARADO');
  const filtered = filterSaqueItems([first, second], { startDate: '2026-09-15', endDate: '2026-09-17', origin: 'TODAS', status: 'TODOS', cut: 'TODOS' });
  assert.equal(filtered.length, 2);
  const byCut = groupSaqueItems(filtered, 'CORTE');
  assert.equal(byCut.length, 2);
  assert.equal(summarizeSaque(filtered).totalKg, 13);
});
