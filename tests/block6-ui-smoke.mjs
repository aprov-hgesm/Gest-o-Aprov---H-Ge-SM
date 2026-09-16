import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cardapio = await readFile('components/CardapioSemanal.tsx', 'utf8');
const validation = await readFile('lib/persistence/validation.ts', 'utf8');

assert.match(cardapio, /Finalizar fechamento operacional/);
assert.match(cardapio, /Responsável declarado/);
assert.match(cardapio, /não autentica a identidade do aprovador/);
assert.match(cardapio, /appendCardapioClosureEvent/);
assert.match(cardapio, /dataHora/);
assert.match(cardapio, /Última reabertura/);
assert.match(validation, /operationalClosure/);
assert.match(validation, /FINALIZACAO/);
console.log('Block 6 operational closure UI smoke: OK');
