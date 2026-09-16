import fs from 'node:fs';
import assert from 'node:assert/strict';

const page = fs.readFileSync('app/page.tsx', 'utf8');
const cardapio = fs.readFileSync('components/CardapioSemanal.tsx', 'utf8');
const professional = fs.readFileSync('components/ProfessionalFlows.tsx', 'utf8');
const exportsSource = fs.readFileSync('components/DocumentExports.tsx', 'utf8');

assert.match(page, /setIsHelpOpen\(true\)/, 'Ajuda precisa abrir conteúdo funcional');
assert.match(page, /clearRosterDays\(roster, targetDays\)/, 'Limpeza precisa ser limitada ao período visível');
assert.match(page, /removeHolidayRosterDay\(clean\(roster\), dayKey, isWeekend\)/, 'Remoção de feriado precisa preservar histórico');
assert.match(page, /reconcileRosterPosts\(clean\(roster\), normalized\.rosterPosts\)/, 'Configurações devem reconciliar postos operacionais');
assert.match(page, /resolveSwapOperationalStatus\(item\) === 'ATIVA'/, 'Permutas ativas precisam usar status temporal');
assert.match(page, /rosterCellDisplayName\(cell\)/, 'Grade deve normalizar nome/graduação da célula');
assert.match(cardapio, /isArchivedCardapio/, 'Cardápio arquivado precisa ter estado explícito');
assert.match(cardapio, /disabled=\{isArchivedCardapio\}/, 'Edição do cardápio arquivado precisa ser bloqueada');
assert.match(cardapio, /archivedAt: undefined/, 'Duplicação deve limpar estado arquivado');
assert.match(professional, /CONCLUÍDA/, 'Permutas passadas precisam aparecer como concluídas');
assert.match(exportsSource, /rosterCellDisplayName\(cell\)/, 'PDF da escala deve normalizar nome/graduação');

console.log('Block 4A UI/source regression checks passed.');
