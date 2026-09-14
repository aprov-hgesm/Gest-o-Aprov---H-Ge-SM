import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
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
  const errors = [];
  pageOne.on('pageerror', error => errors.push(error.message));
  pageTwo.on('pageerror', error => errors.push(error.message));
  await pageOne.goto('http://127.0.0.1:3000');
  const rosterStatus = pageOne.locator('aside[aria-label="Sincronização: Escalas e efetivo"]');
  await rosterStatus.getByText('Aguardando o primeiro envio ao servidor.').waitFor();
  await rosterStatus.locator('button').first().click();
  await rosterStatus.getByRole('button', { name: 'Enviar dados locais' }).click();
  await rosterStatus.getByText('Alterações salvas no servidor.').waitFor();
  assert.equal(await pageOne.evaluate(() => JSON.parse(localStorage.getItem('dr_military'))[0].name), 'SMOKE');
  await pageTwo.goto('http://127.0.0.1:3000');
  await pageTwo.getByRole('button', { name: 'Gerenciar Efetivo', exact: true }).click();
  await pageTwo.getByText('SMOKE', { exact: true }).first().waitFor();

  await pageOne.getByRole('button', { name: 'Cardápio Semanal', exact: true }).click();
  const cardStatus = pageOne.locator('aside[aria-label="Sincronização: Cardápios semanais"]');
  await cardStatus.getByText('Aguardando o primeiro envio ao servidor.').waitFor();
  await cardStatus.locator('button').first().click();
  await cardStatus.getByRole('button', { name: 'Enviar dados locais' }).click();
  await cardStatus.getByText('Alterações salvas no servidor.').waitFor();
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
  console.log('Browser smoke passed: legacy import, two clients, weekly duplication, workflow changes, reload and mobile rendering.');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
