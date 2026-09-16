import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('app/page.tsx', 'utf8');
const cardapio = readFileSync('components/CardapioSemanal.tsx', 'utf8');
const professional = readFileSync('components/ProfessionalFlows.tsx', 'utf8');
const validation = readFileSync('lib/persistence/validation.ts', 'utf8');

for (const required of [
  "activeTab === 'profissional'",
  'auditTrail={auditTrail}',
  'swaps={swaps}',
  'onArchiveCardapio={handleArchiveCardapio}',
  'onRestoreVersion={handleRestoreCardapioVersion}',
  "selectedAssignType === 'PERM'",
  "status: 'CONFIRMADA'",
]) assert.ok(page.includes(required), `app/page.tsx deve conter: ${required}`);

for (const required of [
  'CardapioVersionSnapshot',
  'createCardapioVersionSnapshot',
  'archivedAt?: string',
  "action: 'REABERTURA'",
  'handleConfirmFinalization',
  "createCardapioVersionSnapshot(updated, 'Finalização oficial do cardápio')",
  "showToast('Cardápio FINALIZADO e fechamento operacional registrado.')",
]) assert.ok(cardapio.includes(required), `CardapioSemanal.tsx deve conter: ${required}`);

for (const required of [
  'Histórico completo de operações',
  'Registro estruturado de permutas',
  'Versões e Arquivo',
  'Configurações administrativas',
]) assert.ok(professional.includes(required), `ProfessionalFlows.tsx deve conter: ${required}`);

assert.ok(validation.includes('value.auditTrail'));
assert.ok(validation.includes('value.swaps'));
assert.ok(validation.includes('value.adminSettings'));
assert.ok(validation.includes('value.versions'));

console.log('Professional flows smoke: OK');
