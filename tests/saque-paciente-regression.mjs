import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('components/CardapioSemanal.tsx', 'utf8');
const validation = fs.readFileSync('lib/persistence/validation.ts', 'utf8');
const required = [
  'pacienteTipoCarne?: string',
  'pacienteQuantidadeKg?: number | string',
  "origem: 'ALMOÇO GERAL' | 'ALMOÇO PACIENTE' | 'JANTAR PACIENTE'",
  "origem: 'ALMOÇO PACIENTE'",
  "origem: 'JANTAR PACIENTE'",
  'quantidadeKg: dia.almoco?.pacienteQuantidadeKg',
  'quantidadeKg: dia.jantarPaciente?.quantidadeKg',
  "value={currentCardapio.dias[editingDayIndex].almoco.pacienteTipoCarne || ''}",
  "value={currentCardapio.dias[editingDayIndex].almoco.pacienteQuantidadeKg ?? ''}",
  "value={currentCardapio.dias[editingDayIndex].jantarPaciente.tipoCarne || ''}",
  "value={currentCardapio.dias[editingDayIndex].jantarPaciente.quantidadeKg ?? ''}",
  '{item.origem}: {item.preparacao}'
];
for (const marker of required) assert.ok(source.includes(marker), `Missing marker: ${marker}`);
assert.ok(validation.includes("optional(value.almoco, 'pacienteTipoCarne', 'string')"));
assert.ok(validation.includes('quantity(value.almoco.pacienteQuantidadeKg)'));
assert.ok(validation.includes("optional(value.jantarPaciente, 'tipoCarne', 'string')"));
assert.ok(validation.includes('quantity(value.jantarPaciente.quantidadeKg)'));
console.log('Patient lunch and dinner meat requisition regression checks passed.');
