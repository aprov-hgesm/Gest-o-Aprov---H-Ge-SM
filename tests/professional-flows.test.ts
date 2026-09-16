import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAuditEvent,
  defaultAdminSettings,
  inferAuditFromLog,
  normalizeAdminSettings,
  resolveSwapOperationalStatus,
  trimAuditTrail,
} from '../lib/domain/professional-flows.ts';

test('normaliza configurações administrativas sem aceitar listas vazias', () => {
  const value = normalizeAdminSettings({
    rosterPosts: ['Cozinheiro de Dia', 'Cozinheiro de Dia', ' Novo Posto '],
    absenceTypes: [],
    specialties: ['Cozinheiro'],
    ranks: ['Cb', 'Sd'],
    historyRetentionLimit: 900,
  });
  assert.deepEqual(value.rosterPosts, ['Cozinheiro de Dia', 'Novo Posto']);
  assert.deepEqual(value.absenceTypes, defaultAdminSettings.absenceTypes);
  assert.equal(value.historyRetentionLimit, 900);
});

test('histórico estruturado infere módulo e ação a partir do log legado', () => {
  const event = inferAuditFromLog('Permuta registrada em 20/09/2026 / Copeiro de Dia.');
  assert.equal(event.module, 'Permutas');
  assert.equal(event.action, 'PERMUTA');
  assert.ok(event.id.startsWith('audit-'));
  assert.match(event.createdAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('limite de retenção do histórico é respeitado', () => {
  const settings = normalizeAdminSettings({ ...defaultAdminSettings, historyRetentionLimit: 100 });
  const events = Array.from({ length: 130 }, (_, index) => createAuditEvent({
    id: `event-${index}`,
    createdAt: new Date(2026, 8, 1, 0, index % 60).toISOString(),
    module: 'Sistema',
    action: 'ALTERACAO',
    entityType: 'Teste',
    summary: `Evento ${index}`,
  }));
  assert.equal(trimAuditTrail(events, settings).length, 100);
});


test('permuta passada não permanece ativa na visão operacional', () => {
  assert.equal(resolveSwapOperationalStatus({ day: '15/09/2026', status: 'CONFIRMADA' }, '2026-09-16'), 'CONCLUIDA');
  assert.equal(resolveSwapOperationalStatus({ day: '16/09/2026', status: 'CONFIRMADA' }, '2026-09-16'), 'ATIVA');
  assert.equal(resolveSwapOperationalStatus({ day: '20/09/2026', status: 'CANCELADA' }, '2026-09-16'), 'CANCELADA');
});
