import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendCardapioClosureEvent,
  getCardapioClosureSummary,
  normalizeCardapioClosure,
} from '../lib/domain/cardapio-closure.ts';

test('fechamento registra conferência, aprovação e finalização com responsabilidade declarada', () => {
  let closure = normalizeCardapioClosure();
  closure = appendCardapioClosureEvent(closure, {
    id: 'evt-1', action: 'CONFERENCIA', at: '2026-09-16T10:00:00.000Z',
    fromStatus: 'EM_ELABORACAO', toStatus: 'CONFERIDO', version: 1,
    responsibleDeclared: 'Responsável A', roleDeclared: 'Chefe Fiscal',
  });
  closure = appendCardapioClosureEvent(closure, {
    id: 'evt-2', action: 'APROVACAO', at: '2026-09-16T11:00:00.000Z',
    fromStatus: 'CONFERIDO', toStatus: 'APROVADO', version: 1,
    responsibleDeclared: 'Responsável B', roleDeclared: 'Direção',
  });
  closure = appendCardapioClosureEvent(closure, {
    id: 'evt-3', action: 'FINALIZACAO', at: '2026-09-16T12:00:00.000Z',
    fromStatus: 'APROVADO', toStatus: 'FINALIZADO', version: 1,
    responsibleDeclared: 'Responsável C', roleDeclared: 'Chefia', note: 'Fechamento semanal',
  });

  const summary = getCardapioClosureSummary(closure, 'FINALIZADO');
  assert.equal(summary.isFinalized, true);
  assert.equal(summary.cycle, 1);
  assert.equal(summary.reopenCount, 0);
  assert.equal(summary.eventCount, 3);
  assert.equal(summary.lastFinalizedAt, '2026-09-16T12:00:00.000Z');
  assert.equal(closure.events[0].responsibleDeclared, 'Responsável C');
  assert.equal(closure.events[0].roleDeclared, 'Chefia');
});

test('reabertura inicia novo ciclo e preserva motivo e histórico anterior', () => {
  let closure = appendCardapioClosureEvent(undefined, {
    id: 'evt-final', action: 'FINALIZACAO', at: '2026-09-16T12:00:00.000Z',
    fromStatus: 'APROVADO', toStatus: 'FINALIZADO', version: 2,
  });
  closure = appendCardapioClosureEvent(closure, {
    id: 'evt-reopen', action: 'REABERTURA', at: '2026-09-17T08:30:00.000Z',
    fromStatus: 'FINALIZADO', toStatus: 'EM_ELABORACAO', version: 3,
    note: 'Correção solicitada após publicação',
  });

  const summary = getCardapioClosureSummary(closure, 'EM_ELABORACAO');
  assert.equal(summary.isFinalized, false);
  assert.equal(summary.cycle, 2);
  assert.equal(summary.reopenCount, 1);
  assert.equal(summary.lastReopenReason, 'Correção solicitada após publicação');
  assert.equal(summary.eventCount, 2);
  assert.equal(closure.events[1].action, 'FINALIZACAO');
});

test('metadados de fechamento não modelam autenticação de identidade', () => {
  const closure = appendCardapioClosureEvent(undefined, {
    id: 'evt', action: 'FINALIZACAO', at: '2026-09-16T12:00:00.000Z',
    fromStatus: 'APROVADO', toStatus: 'FINALIZADO', version: 1,
    responsibleDeclared: 'Nome informado', roleDeclared: 'Função informada',
  });
  const event = closure.events[0] as unknown as Record<string, unknown>;
  assert.equal('userId' in event, false);
  assert.equal('email' in event, false);
  assert.equal('authenticatedBy' in event, false);
});
