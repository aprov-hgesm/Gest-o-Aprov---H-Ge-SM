import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearRosterDays,
  reconcileRosterPosts,
  removeHolidayRosterDay,
  rosterCellDisplayName,
  selectRosterDays,
  type OperationalRoster,
} from '../lib/domain/roster-operations.ts';
import { resolveSwapOperationalStatus } from '../lib/domain/professional-flows.ts';

const roster: OperationalRoster = {
  '12/09/2026': {
    'Cozinheiro de Dia': { militaryId: 'm1', militaryName: 'SILVA', rank: 'Sd', type: 'EV' },
    'Posto antigo': null,
  },
  '13/09/2026': {
    'Cozinheiro de Dia': null,
    'Posto antigo': { militaryId: 'm2', militaryName: 'Sgt COSTA', rank: 'Sgt', type: 'DISP' },
  },
  '19/09/2026': {
    'Cozinheiro de Dia': { militaryId: 'm3', militaryName: 'LIMA', rank: 'Cb', type: 'PERM' },
    'Posto antigo': null,
  },
};

test('reconciliação remove apenas posto obsoleto vazio e preserva histórico preenchido', () => {
  const reconciled = reconcileRosterPosts(roster, ['Cozinheiro de Dia', 'Copeiro de Dia']);
  assert.equal('Posto antigo' in reconciled['12/09/2026'], false);
  assert.equal('Posto antigo' in reconciled['19/09/2026'], false);
  assert.ok(reconciled['13/09/2026']['Posto antigo']);
  assert.equal(reconciled['12/09/2026']['Copeiro de Dia'], null);
});

test('limpeza afeta somente as datas explicitamente selecionadas', () => {
  const cleared = clearRosterDays(roster, ['19/09/2026']);
  assert.equal(cleared['19/09/2026']['Cozinheiro de Dia'], null);
  assert.equal(cleared['12/09/2026']['Cozinheiro de Dia']?.militaryId, 'm1');
});

test('remoção de feriado não apaga coluna com histórico operacional', () => {
  const preserved = removeHolidayRosterDay(roster, '12/09/2026', false);
  assert.equal(preserved.preserved, true);
  assert.ok(preserved.roster['12/09/2026']);

  const emptyRoster: OperationalRoster = { '15/09/2026': { 'Cozinheiro de Dia': null } };
  const removed = removeHolidayRosterDay(emptyRoster, '15/09/2026', false);
  assert.equal(removed.preserved, false);
  assert.equal(removed.roster['15/09/2026'], undefined);
});

test('próximos 4 finais de semana partem da data de referência e ignoram datas históricas', () => {
  const days = [
    '05/09/2026', '06/09/2026', '12/09/2026', '13/09/2026', '19/09/2026', '20/09/2026',
    '26/09/2026', '27/09/2026', '03/10/2026', '04/10/2026', '12/10/2026'
  ];
  const selected = selectRosterDays({
    days,
    holidays: [{ date: '2026-10-12' }],
    filter: 'Todos',
    view: '4 Finais de Semana',
    startIso: '2026-09-01',
    endIso: '2026-12-31',
    todayIso: '2026-09-16',
  });
  assert.deepEqual(selected, [
    '19/09/2026', '20/09/2026', '26/09/2026', '27/09/2026',
    '03/10/2026', '04/10/2026'
  ]);
});

test('nome da célula não duplica a graduação em dispensas legadas', () => {
  assert.equal(rosterCellDisplayName({ militaryId: 'm2', militaryName: 'Sgt COSTA', rank: 'Sgt', type: 'DISP' }), 'Sgt. COSTA');
  assert.equal(rosterCellDisplayName({ militaryId: 'm2', militaryName: 'COSTA', rank: 'Sgt', type: 'EV' }), 'Sgt. COSTA');
});

test('permuta confirmada passada é concluída e não permanece ativa indefinidamente', () => {
  assert.equal(resolveSwapOperationalStatus({ day: '15/09/2026', status: 'CONFIRMADA' }, '2026-09-16'), 'CONCLUIDA');
  assert.equal(resolveSwapOperationalStatus({ day: '16/09/2026', status: 'CONFIRMADA' }, '2026-09-16'), 'ATIVA');
  assert.equal(resolveSwapOperationalStatus({ day: '20/09/2026', status: 'CANCELADA' }, '2026-09-16'), 'CANCELADA');
});
