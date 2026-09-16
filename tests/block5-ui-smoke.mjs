import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile('app/page.tsx', 'utf8');
const component = await readFile('components/SaqueCarnesOperacional.tsx', 'utf8');
const navigation = await readFile('lib/domain/operational-navigation.ts', 'utf8');
const firestore = await readFile('lib/persistence/firestore.ts', 'utf8');
const rules = await readFile('firestore.rules', 'utf8');

assert.match(page, /switchTab\('saque'\)/, 'A navegação principal deve abrir o módulo de saque');
assert.match(page, /<SaqueCarnesOperacional/, 'O app deve renderizar o módulo operacional de saque');
assert.match(page, /name: 'saques'/, 'O app deve sincronizar o estado operacional em coleção própria');
assert.match(component, /Por retirada/);
assert.match(component, /Por consumo/);
assert.match(component, /Por corte/);
assert.match(component, /PENDENTE/);
assert.match(component, /SEPARADO/);
assert.match(component, /RETIRADO/);
assert.match(component, /Conferência antes do PDF/);
assert.match(component, /onOpenCardapioDay/);
assert.match(navigation, /'saque'/);
assert.match(firestore, /'saques'/);
assert.match(rules, /group == 'saques'/);

console.log('Block 5 Saque de Carnes UI smoke: OK');
