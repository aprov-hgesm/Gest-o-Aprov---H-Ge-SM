import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, stat } from 'node:fs/promises';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' || process.env.GCLOUD_PROJECT !== 'demo-aprov') {
  throw new Error('PDF smoke requires the local demo-aprov emulator.');
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
const pageErrors = [];
const consoleErrors = [];

async function verifyPdf(download, expectedPrefix, targetPath) {
  const name = download.suggestedFilename();
  assert(name.startsWith(expectedPrefix), `Unexpected PDF filename: ${name}`);
  assert(name.endsWith('.pdf'), `Download is not a PDF: ${name}`);
  await download.saveAs(targetPath);
  const info = await stat(targetPath);
  assert(info.size > 5000, `PDF unexpectedly small: ${info.size} bytes`);
  const content = await readFile(targetPath);
  assert.equal(content.subarray(0, 5).toString('ascii'), '%PDF-', 'Missing PDF signature');
  return { status: 'downloaded', name, bytes: info.size };
}

async function attemptPdf(page, { button, failureText, successText, prefix, path }) {
  const downloadPromise = page.waitForEvent('download', { timeout: 90000 })
    .then(download => ({ kind: 'download', download }))
    .catch(error => ({ kind: 'download-timeout', error: error.message }));
  const failurePromise = page.getByText(failureText, { exact: true }).waitFor({ timeout: 90000 })
    .then(() => ({ kind: 'failure-toast' }))
    .catch(() => ({ kind: 'no-failure-toast' }));
  const successPromise = page.getByText(successText, { exact: true }).waitFor({ timeout: 90000 })
    .then(() => ({ kind: 'success-toast' }))
    .catch(() => ({ kind: 'no-success-toast' }));

  await button.click();
  const first = await Promise.race([downloadPromise, failurePromise, successPromise]);
  if (first.kind === 'download') return verifyPdf(first.download, prefix, path);
  if (first.kind === 'failure-toast') return { status: 'failure-toast' };
  if (first.kind === 'success-toast') {
    const downloadResult = await downloadPromise;
    if (downloadResult.kind === 'download') return verifyPdf(downloadResult.download, prefix, path);
    return { status: 'success-without-download', detail: downloadResult.error };
  }
  return { status: first.kind, detail: first.error || null };
}

try {
  let ready = false;
  for (let i = 0; i < 90; i++) {
    try {
      const response = await fetch('http://127.0.0.1:3000');
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert(ready, 'Next.js did not start: ' + serverLog.slice(-4000));

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Cardápio Semanal', exact: true }).click();
  await page.getByRole('heading', { name: 'Cardápio Semanal de Aprovisionamento', level: 3 }).waitFor();
  await mkdir('test-results/pdf', { recursive: true });

  const cardapio = await attemptPdf(page, {
    button: page.getByTitle('Baixar Cardápio Oficial em PDF (A4 Orientação Paisagem)'),
    failureText: 'Não foi possível gerar o PDF. Tente novamente.',
    successText: 'Download do PDF (A4 Paisagem) concluído com sucesso!',
    prefix: 'Cardapio-Semanal-HGeSM-',
    path: 'test-results/pdf/cardapio.pdf'
  });

  await page.getByRole('button', { name: /Saque de Carnes/ }).first().click();
  await page.getByRole('heading', { name: 'Mapa de Saque de Carnes da Câmara Fria' }).waitFor();
  const saque = await attemptPdf(page, {
    button: page.getByTitle('Baixar Mapa de Saque em PDF A4'),
    failureText: 'Não foi possível gerar o PDF do saque. Tente novamente.',
    successText: 'Download do Saque de Carnes (PDF A4) concluído!',
    prefix: 'Saque-de-Carnes-HGeSM-',
    path: 'test-results/pdf/saque-carnes.pdf'
  });

  console.log('PDF_DIAGNOSTIC=' + JSON.stringify({ cardapio, saque, pageErrors, consoleErrors }, null, 2));
  if (cardapio.status !== 'downloaded' || saque.status !== 'downloaded') process.exitCode = 2;
} catch (error) {
  console.error('SERVER LOG TAIL:\n' + serverLog.slice(-6000));
  console.error('PAGE ERRORS:', pageErrors);
  console.error('CONSOLE ERRORS:', consoleErrors);
  throw error;
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
