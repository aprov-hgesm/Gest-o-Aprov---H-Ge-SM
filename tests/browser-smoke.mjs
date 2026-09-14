import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { sample } from './fixtures.ts';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' || process.env.GCLOUD_PROJECT !== 'demo-aprov') {
  throw new Error('Browser smoke test requires the local demo-aprov emulator.');
}
const { chromium } = await import(process.env.APROV_PLAYWRIGHT_MODULE);
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'development', NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }
});
let serverLog = '';
server.stdout.on('data', chunk => { serverLog += chunk.toString(); });
server.stderr.on('data', chunk => { serverLog += chunk.toString(); });
let browser;
const pages = [];
const errors = [];
async function confirmed(page, collection, id, revision) {
  await page.waitForFunction(({ collection, id, revision }) => {
    const cache = JSON.parse(localStorage.getItem('gestao-aprov:firestore:v1:' + collection) || 'null');
    return cache?.base?.[id]?.revision >= revision && cache.dirty === false && cache.attempt === null;
  }, { collection, id, revision });
}
try {
  let ready = false;
  for (let index = 0; index < 90; index++) {
    try { const response = await fetch('http://127.0.0.1:3000'); if (response.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert(ready, 'Next.js did not start: ' + serverLog.slice(-4000));
  browser = await chromium.launch({ headless: true });
  const first = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const second = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const legacy = {
    dr_military: [{ id: 'smoke-mil', rank: 'Sd', name: 'SMOKE', fullName: 'Militar de Teste',
      matricula: '1', specialty: 'Cozinheiro de Dia', status: 'Ativo', type: 'Ambas', dutyCount: 0 }],
    dr_absences: [], dr_roster: {}, dr_logs: [], dr_holidays: [],
    dr_cardapios: [sample('cardapio-2026-09-14')]
  };
  await first.addInitScript(values => {
    if (!localStorage.getItem('smoke-seeded')) {
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem('smoke-seeded', 'yes');
    }
  }, legacy);
  const pageOne = await first.newPage(), pageTwo = await second.newPage();
  pages.push(pageOne, pageTwo);
  pageOne.on('pageerror', error => errors.push(error.message));
  pageTwo.on('pageerror', error => errors.push(error.message));
  await pageOne.goto('http://127.0.0.1:3000');
  const rosterStatus = pageOne.locator('aside[aria-label="Sincronização: Escalas e efetivo"]');
  await rosterStatus.getByText('Aguardando o primeiro envio ao servidor.').waitFor();
  await rosterStatus.locator('button').first().click();
  await rosterStatus.getByRole('button', { name: 'Enviar dados locais' }).click();
  await confirmed(pageOne, 'roster', 'principal', 1);
  await rosterStatus.getByText(/Alterações salvas no servidor\.|Dados atualizados do servidor\./).waitFor();
  assert.equal(await pageOne.evaluate(() => JSON.parse(localStorage.getItem('dr_military'))[0].name), 'SMOKE');
  await pageTwo.goto('http://127.0.0.1:3000');
  await pageTwo.getByRole('button', { name: 'Gerenciar Efetivo', exact: true }).click();
  await pageTwo.getByText('SMOKE', { exact: true }).first().waitFor();

  // A form opened before a remote update must not overwrite the newer personnel record.
  await pageOne.getByRole('button', { name: 'Gerenciar Efetivo', exact: true }).click();
  await pageOne.getByTitle('Editar Militar', { exact: true }).click();
  const formOne = pageOne.locator('form').filter({ has: pageOne.getByRole('button', { name: 'Salvar Alterações', exact: true }) });
  await formOne.locator('input[type="text"]').first().fill('RASCUNHO');
  await pageTwo.getByTitle('Editar Militar', { exact: true }).click();
  const formTwo = pageTwo.locator('form').filter({ has: pageTwo.getByRole('button', { name: 'Salvar Alterações', exact: true }) });
  await formTwo.locator('input[type="text"]').first().fill('REMOTO');
  await formTwo.getByRole('button', { name: 'Salvar Alterações', exact: true }).click();
  await confirmed(pageOne, 'roster', 'principal', 2);
  await formOne.getByRole('button', { name: 'Salvar Alterações', exact: true }).click();
  await pageOne.getByText(/Este cadastro mudou em outro dispositivo\./).waitFor();
  assert.equal(await formOne.locator('input[type="text"]').first().inputValue(), 'RASCUNHO');
  assert.equal(await pageOne.evaluate(() => JSON.parse(localStorage.getItem('gestao-aprov:firestore:v1:roster')).dirty), false);
  await formOne.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await pageOne.getByText('REMOTO', { exact: true }).first().waitFor();
  await pageOne.getByRole('button', { name: 'Gestão de Escalas', exact: true }).click();
  await pageOne.locator('tr').filter({ hasText: 'Militar de Teste' }).getByRole('combobox').selectOption('Copeiro de Dia');
  await confirmed(pageTwo, 'roster', 'principal', 3);
  assert.equal(await pageTwo.evaluate(() => JSON.parse(localStorage.getItem('gestao-aprov:firestore:v1:roster'))
    .records[0].militaryList[0].specialty), 'Copeiro de Dia');

  await pageOne.getByRole('button', { name: 'Cardápio Semanal', exact: true }).click();
  const cardStatus = pageOne.locator('aside[aria-label="Sincronização: Cardápios semanais"]');
  await cardStatus.getByText('Aguardando o primeiro envio ao servidor.').waitFor();
  await cardStatus.locator('button').first().click();
  await cardStatus.getByRole('button', { name: 'Enviar dados locais' }).click();
  await confirmed(pageOne, 'cardapios', 'cardapio-2026-09-14', 1);
  await cardStatus.getByText(/Alterações salvas no servidor\.|Dados atualizados do servidor\./).waitFor();
  await pageTwo.getByRole('button', { name: 'Cardápio Semanal', exact: true }).click();
  await pageTwo.waitForFunction(() => {
    const cache = JSON.parse(localStorage.getItem('gestao-aprov:firestore:v1:cardapios') || 'null');
    return cache?.base?.['cardapio-2026-09-14']?.revision === 1;
  });
  await pageOne.getByRole('button', { name: 'Duplicar p/ Próxima', exact: true }).click();
  await pageTwo.waitForFunction(() => {
    const cache = JSON.parse(localStorage.getItem('gestao-aprov:firestore:v1:cardapios') || 'null');
    return cache?.records?.some(item => item.id === 'cardapio-2026-09-21');
  });
  // Change actual UI workflow state and verify it on the second independent client.
  await pageOne.getByRole('button', { name: 'Conferir Cardápio', exact: true }).click();
  // Navigate before the debounce expires: the hidden module must still complete its save.
  await pageOne.getByRole('button', { name: 'Gerenciar Efetivo', exact: true }).click();
  await pageTwo.waitForFunction(() => {
    const cache = JSON.parse(localStorage.getItem('gestao-aprov:firestore:v1:cardapios') || 'null');
    return cache?.records?.some(item => item.id === 'cardapio-2026-09-21' && item.workflow.status === 'CONFERIDO');
  });
  await pageOne.reload();
  await pageOne.getByRole('button', { name: 'Cardápio Semanal', exact: true }).click();
  await pageOne.getByRole('button', { name: 'Aprovar Cardápio', exact: true }).waitFor();
  await pageTwo.setViewportSize({ width: 390, height: 844 });
  await mkdir('test-results', { recursive: true });
  await pageTwo.screenshot({ path: 'test-results/firestore-mobile.png', fullPage: true });
  assert.deepEqual(errors, [], 'Browser runtime errors');
  console.log('Browser smoke passed: legacy import, two clients, stale-form protection, personnel specialty, weekly duplication, background saves, workflow changes, reload and mobile rendering.');
} catch (error) {
  await mkdir('test-results', { recursive: true });
  for (const [index, page] of pages.entries()) {
    const state = await page.evaluate(() => ({
      statuses: [...document.querySelectorAll('aside[aria-label^="Sincronização:"]')].map(item => item.textContent),
      cache: Object.fromEntries(['roster', 'cardapios'].map(name => {
        const value = JSON.parse(localStorage.getItem('gestao-aprov:firestore:v1:' + name) || 'null');
        return [name, value && { dirty: value.dirty, attempt: value.attempt?.id,
          revisions: Object.fromEntries(Object.entries(value.base).map(([id, record]) => [id, record.revision])) }];
      }))
    })).catch(() => null);
    console.error('Browser diagnostics', index, JSON.stringify(state));
    await page.screenshot({ path: `test-results/failure-${index}.png`, fullPage: true }).catch(() => {});
  }
  console.error('Browser errors', errors);
  await writeFile('test-results/next-server.log', serverLog);
  throw error;
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
