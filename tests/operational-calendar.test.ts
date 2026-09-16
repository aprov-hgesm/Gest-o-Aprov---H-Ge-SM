import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOperationalCalendar, mergeOperationalAlerts } from '../lib/domain/operational-calendar.ts';

test('calendário consolida escala, afastamentos, saque e cobertura do cardápio', () => {
  const result = buildOperationalCalendar({
    today: '2026-09-18',
    horizonDays: 14,
    roster: {
      '19/09/2026': {
        'Cozinheiro de Dia': { militaryId: 'm1', militaryName: 'ALFA', rank: 'Sd', type: 'EV' },
        'Copeiro de Dia': null,
      },
    },
    absences: [{
      id: 'a1', militaryId: 'm1', militaryName: 'ALFA', rank: 'Sd', type: 'Férias',
      startDate: '2026-09-19', endDate: '2026-09-21', indefinite: false, status: 'AGENDADO',
    }],
    cardapios: [{
      id: 'c1', dataInicio: '2026-09-14', dataFim: '2026-09-20', workflow: { status: 'FINALIZADO' },
    }],
    meatItems: [{
      id: 's1', dataSaqueIso: '2026-09-19', diaCardapioIso: '2026-09-21', quantidadeKg: 30,
      tipoCarne: 'PATINHO', origem: 'ALMOÇO GERAL',
    }],
  });

  assert.equal(result.days.length, 14);
  const saturday = result.days.find(day => day.iso === '2026-09-19');
  assert(saturday);
  assert.equal(saturday.services.length, 1);
  assert.equal(saturday.vacancies.length, 1);
  assert.equal(saturday.absenceStarts.length, 1);
  assert.equal(saturday.meatKg, 30);
  assert(result.alerts.some(alert => alert.id.startsWith('roster-absence-conflict-')));
  assert(result.alerts.some(alert => alert.id === 'weekend-meat-2026-09-19'));
  assert(result.alerts.some(alert => alert.id === 'cardapio-coverage-next-7'));
});

test('merge de alertas remove duplicidades e prioriza criticidade', () => {
  const alerts = mergeOperationalAlerts([
    { id: 'same', severity: 'info', title: 'A', detail: 'A', module: 'Saque' },
    { id: 'critical', severity: 'critical', title: 'B', detail: 'B', module: 'Escalas' },
    { id: 'same', severity: 'warning', title: 'C', detail: 'C', module: 'Cardápio' },
  ]);
  assert.equal(alerts.length, 2);
  assert.equal(alerts[0].id, 'critical');
});
