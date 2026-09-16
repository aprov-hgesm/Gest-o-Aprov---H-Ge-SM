import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cardapioMatchesSearch,
  getOperationalNavigationContext,
  type OperationalTab,
} from '../lib/domain/operational-navigation.ts';

const tabs: OperationalTab[] = ['inicio', 'dashboard', 'efetivo', 'afastamentos', 'cardapio', 'profissional'];

test('cada módulo possui contexto e atalhos operacionais', () => {
  for (const tab of tabs) {
    const context = getOperationalNavigationContext(tab);
    assert.ok(context.label.length > 0);
    assert.ok(context.description.length > 0);
    assert.ok(context.actions.length >= 3);
    assert.equal(new Set(context.actions.map(item => item.id)).size, context.actions.length);
  }
});

test('módulos operacionais oferecem caminho rápido para a Central Operacional', () => {
  for (const tab of tabs.filter(item => item !== 'inicio')) {
    const context = getOperationalNavigationContext(tab);
    assert.ok(context.actions.some(item => item.tab === 'inicio'));
  }
});

test('busca de cardápio encontra período, status e conteúdo alimentar', () => {
  const cardapio = {
    id: 'cardapio-2026-09-21',
    dataInicio: '2026-09-21',
    dataFim: '2026-09-27',
    workflow: { status: 'EM_ELABORACAO' },
    dias: [{ diaSemana: 'Segunda', almoco: { geral: { proteina: 'Frango assado', tipoCarne: 'PEITO' } } }],
  };

  assert.equal(cardapioMatchesSearch(cardapio, '2026-09-21'), true);
  assert.equal(cardapioMatchesSearch(cardapio, 'elaboracao'), true);
  assert.equal(cardapioMatchesSearch(cardapio, 'frango'), true);
  assert.equal(cardapioMatchesSearch(cardapio, 'peito'), true);
  assert.equal(cardapioMatchesSearch(cardapio, 'tilápia'), false);
});

test('busca identifica cardápio arquivado e motivo do arquivamento', () => {
  const cardapio = {
    id: 'cardapio-antigo',
    dataInicio: '2026-08-03',
    dataFim: '2026-08-09',
    workflow: { status: 'FINALIZADO' },
    dias: [],
    archivedAt: '2026-09-01T10:00:00.000Z',
    archiveReason: 'Semana encerrada',
  };

  assert.equal(cardapioMatchesSearch(cardapio, 'arquivado'), true);
  assert.equal(cardapioMatchesSearch(cardapio, 'semana encerrada'), true);
});
