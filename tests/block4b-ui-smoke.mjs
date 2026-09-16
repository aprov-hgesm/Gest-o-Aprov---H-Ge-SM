import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile('app/page.tsx', 'utf8');
const contextBar = await readFile('components/OperationalContextBar.tsx', 'utf8');
const cardapio = await readFile('components/CardapioSemanal.tsx', 'utf8');
const professional = await readFile('components/ProfessionalFlows.tsx', 'utf8');
const dashboard = await readFile('components/OperationalDashboard.tsx', 'utf8');

assert.match(page, /<OperationalContextBar/);
assert.match(page, /const openRosterForMilitary/);
assert.match(page, /const openMilitaryRecord/);
assert.match(page, /const openAbsenceForMilitary/);
assert.match(page, /searchQuery=\{cardapioSearch\}/);
assert.match(page, /initialSection=\{professionalSection\}/);
assert.match(page, /openProfessional\('configuracoes'\)/);

assert.match(contextBar, /Atalhos/);
assert.match(contextBar, /onOpenProfessional/);
assert.match(cardapio, /cardapioMatchesSearch/);
assert.match(cardapio, /matchingCardapios/);
assert.match(professional, /setSection\(initialSection\)/);
assert.match(dashboard, /onClick=\{\(\) => onNavigate\('efetivo'\)\}/);
assert.match(dashboard, /onClick=\{\(\) => onNavigate\('cardapio'\)\}/);

console.log('Block 4B UI smoke: OK');
