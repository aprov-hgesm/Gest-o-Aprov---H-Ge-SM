import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

assert.ok(
  source.includes("if (milId !== 'empty' && isMilitaryAbsentOnDay(milId, day, absences))"),
  'A designação deve bloquear militar com afastamento vigente na data.'
);

assert.ok(
  source.includes('if (isMilitaryAbsentOnDay(mil.id, selectedCell.day, absences)) return false;'),
  'Militares afastados na data não devem aparecer na lista de seleção.'
);

assert.ok(
  source.includes('A lista não aplica prioridade ou bloqueio por função, contagem de serviços, tipo de escala, dia anterior ou dia seguinte.'),
  'A interface deve deixar explícita a operação manual sem regras de prioridade.'
);

const forbidden = [
  'Deseja transferi-lo para',
  'Deseja escalá-lo manualmente mesmo assim',
  '// Match selected post specialty first',
  'Militares Elegíveis',
  'Ordem de Prioridade',
  "setSelectedAssignType('DISP')",
  "militaryList.filter(m => m.type !== 'EP').map"
];

for (const fragment of forbidden) {
  assert.equal(source.includes(fragment), false, `Regra ou prioridade residual encontrada: ${fragment}`);
}

console.log('Manual roster selection smoke test passed.');
