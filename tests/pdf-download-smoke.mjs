import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { sample } from './fixtures.ts';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' || process.env.GCLOUD_PROJECT !== 'demo-aprov') {
  throw new Error('PDF smoke test requires the local demo-aprov emulator.');
}

const { chromium } = await import(process.env.APROV_PLAYWRIGHT_MODULE);
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'development', NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' },
});
let serverLog = '';
server.stdout.on('data', chunk => { serverLog += chunk.toString(); });
server.stderr.on('data', chunk => { serverLog += chunk.toString(); });

let browser;
let page;
const pageErrors = [];
const consoleErrors = [];

async function verifyDownload(download, prefix, target) {
  const name = download.suggestedFilename();
  assert(name.startsWith(prefix), `Nome inesperado: ${name}`);
  assert(name.endsWith('.pdf'), `Arquivo não é PDF: ${name}`);
  await download.saveAs(target);
  const info = await stat(target);
  assert(info.size > 2500, `PDF muito pequeno: ${name} (${info.size} bytes)`);
  const bytes = await readFile(target);
  assert.equal(bytes.subarray(0, 5).toString('ascii'), '%PDF-', `Assinatura PDF ausente: ${name}`);
  return { name, bytes: info.size };
}

async function clickAndDownload(locator, prefix, target, timeout = 90000) {
  const pending = page.waitForEvent('download', { timeout });
  await locator.click();
  return verifyDownload(await pending, prefix, target);
}

try {
  let ready = false;
  for (let index = 0; index < 90; index++) {
    try {
      const response = await fetch('http://127.0.0.1:3000');
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert(ready, 'Next.js não iniciou: ' + serverLog.slice(-4000));

  await mkdir('test-results/pdf', { recursive: true });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  await context.addInitScript(cardapio => {
    const rosterDoc = {
      id: 'principal',
      militaryList: [
        { id: 'mil-1', rank: 'Cb', name: 'TESTE', fullName: 'MILITAR DE TESTE', matricula: '1', specialty: 'Cozinheiro de Dia', status: 'Ativo', type: 'Ambas', dutyCount: 2 },
        { id: 'mil-2', rank: 'Sd', name: 'AUXILIAR', fullName: 'AUXILIAR DE TESTE', matricula: '2', specialty: 'Copeiro de Dia', status: 'Afastado', type: 'EV', dutyCount: 1 },
      ],
      absences: [
        { id: 'abs-1', militaryId: 'mil-2', militaryName: 'AUXILIAR', rank: 'Sd', type: 'Férias', startDate: '2026-09-10', endDate: '2026-09-20', indefinite: false, notes: 'Teste de exportação', autoUpdate: true, status: 'ATIVO' },
      ],
      roster: {
        '19/09/2026': {
          'Cozinheiro de Dia': { militaryId: 'mil-1', militaryName: 'TESTE', rank: 'Cb', type: 'EP' },
          'Copeiro de Dia': null,
          'Ceia de Dia': null,
          'Auxiliar do Copeiro de Dia': null,
        },
      },
      changelogs: [{ time: '10:00', text: 'Registro de teste para exportação PDF.' }],
      customHolidays: [{ id: 'hol-1', date: '2026-09-19', name: 'Data de teste' }],
    };
    localStorage.setItem('gestao-aprov:firestore:v1:roster', JSON.stringify({ version: 1, base: {}, records: [rosterDoc], dirty: false, attempt: null }));
    localStorage.setItem('dr_cardapios', JSON.stringify([cardapio]));
    localStorage.setItem('dr_current_cardapio_id', cardapio.id);
  }, sample('cardapio-2026-09-14'));

  page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: 'Abrir exportações PDF' }).click();
  const scale = await clickAndDownload(page.locator('[data-pdf-export="scale"]'), 'Escala-de-Servico-HGeSM-', 'test-results/pdf/escala.pdf');
  const personnel = await clickAndDownload(page.locator('[data-pdf-export="personnel"]'), 'Efetivo-Militar-HGeSM-', 'test-results/pdf/efetivo.pdf');
  const absences = await clickAndDownload(page.locator('[data-pdf-export="absences"]'), 'Afastamentos-HGeSM-', 'test-results/pdf/afastamentos.pdf');
  const general = await clickAndDownload(page.locator('[data-pdf-export="general"]'), 'Relatorio-Geral-HGeSM-', 'test-results/pdf/relatorio-geral.pdf');

  await page.getByRole('button', { name: 'Cardápio Semanal', exact: true }).click();
  await page.getByRole('heading', { name: 'Cardápio Semanal de Aprovisionamento', level: 3 }).waitFor();
  const cardapio = await clickAndDownload(
    page.getByTitle('Baixar Cardápio Oficial em PDF (A4 Orientação Paisagem)'),
    'Cardapio-Semanal-HGeSM-',
    'test-results/pdf/cardapio.pdf',
  );
  await page.getByText('Download do PDF (A4 Paisagem) concluído com sucesso!', { exact: true }).waitFor({ timeout: 15000 });

  await page.getByRole('button', { name: /Saque de Carnes/ }).first().click();
  await page.getByRole('heading', { name: 'Mapa de Saque de Carnes da Câmara Fria' }).waitFor();
  const saque = await clickAndDownload(
    page.getByTitle('Baixar Mapa de Saque em PDF A4'),
    'Saque-de-Carnes-HGeSM-',
    'test-results/pdf/saque-carnes.pdf',
  );
  await page.getByText('Download do Saque de Carnes (PDF A4) concluído!', { exact: true }).waitFor({ timeout: 15000 });

  const html2canvasErrors = consoleErrors.filter(message => /oklab|oklch|unsupported color function/i.test(message));
  assert.deepEqual(html2canvasErrors, [], 'html2canvas ainda encontrou cores incompatíveis');
  assert.deepEqual(pageErrors, [], 'Erros de runtime no navegador');
  console.log(JSON.stringify({ scale, personnel, absences, general, cardapio, saque }, null, 2));
} catch (error) {
  await mkdir('test-results', { recursive: true });
  await page?.screenshot({ path: 'test-results/pdf-failure.png', fullPage: true }).catch(() => {});
  await writeFile('test-results/pdf-next-server.log', serverLog);
  console.error('PAGE ERRORS:', pageErrors);
  console.error('CONSOLE ERRORS:', consoleErrors);
  throw error;
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
