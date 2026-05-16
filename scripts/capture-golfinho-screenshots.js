#!/usr/bin/env node
/**
 * Captura screenshots para o GUIA_ADMIN_GOLFINHO.
 *
 * Uso:
 *   EMAIL=... PASSWORD=... node scripts/capture-golfinho-screenshots.js
 *
 * Output: docs/img/*.png
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE_URL || 'https://v2.grupogolfinho.com';
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const OUT = path.resolve(__dirname, '..', 'docs', 'img');

if (!EMAIL || !PASSWORD) {
  console.error('Missing EMAIL or PASSWORD env vars');
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  { name: '01-login',                 url: '/login',                 preLogin: true },
  { name: '02-dashboard',             url: '/dashboard' },
  { name: '03-configuracao-escola',   url: '/configuracao-escola' },
  { name: '04-configuracao-impressao',url: '/configuracao-impressao' },
  { name: '06-aluno-detalhe-1372',    url: '/alunos/1372' },
  { name: '07-utilizadores',          url: '/utilizadores' },
  { name: '08-permissoes',            url: '/permissoes' },
  { name: '09-caixa',                 url: '/caixa' },
  { name: '10-tesouraria',            url: '/tesouraria' },
  { name: '11-precario',              url: '/precario' },
  { name: '12-bolsas',                url: '/bolsas' },
  { name: '13-lembretes',             url: '/lembretes' },
  { name: '14-relatorio-financeiro',  url: '/relatorio-financeiro' },
  { name: '15-controlo-propinas',     url: '/controlo-propinas' },
];

async function login(page) {
  console.log('→ Login');
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  // Click "Administrativo" tab
  await page.getByRole('button', { name: /administrativo/i }).click();
  await page.waitForTimeout(300);
  // Email + password
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  // Wait for redirect off /login
  await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 20000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  console.log('  ✓ logged in, now at', page.url());
}

async function shoot(page, name, url, opts = {}) {
  const fullUrl = BASE + url;
  console.log(`→ ${name}  (${url})`);
  try {
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.warn(`  ! navigation slow, continuing: ${e.message.split('\n')[0]}`);
  }
  // Give SPA time to render
  await page.waitForTimeout(opts.delay || 1500);
  const out = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: out, fullPage: opts.fullPage !== false });
  console.log(`  ✓ saved ${out}`);
}

async function shootPosWithAluno(page) {
  console.log('→ 05-pos-modal-verificacao  (POS + aluno #1372)');
  // Reset verification flag first via API to ensure modal opens
  await page.goto(BASE + '/alunos/1372', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  // Try clicking the reset button if visible
  const resetBtn = page.getByRole('button', { name: /reset/i }).first();
  if (await resetBtn.count() > 0) {
    try {
      await resetBtn.click({ timeout: 3000 });
      // Confirm dialog if any
      page.once('dialog', d => d.accept().catch(() => {}));
      await page.waitForTimeout(1500);
      console.log('  ✓ reset verification flag');
    } catch (e) {
      console.warn('  ! could not click reset:', e.message.split('\n')[0]);
    }
  }
  // Now go to POS and select aluno
  await page.goto(BASE + '/pos', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  // Search for aluno #1372 — the search input
  const search = page.locator('input[placeholder*="aluno" i], input[placeholder*="pesquisar" i], input[type="search"]').first();
  if (await search.count() > 0) {
    await search.fill('David');
    await page.waitForTimeout(2000);
    // Click first result that mentions David / Conga / 1372
    const firstResult = page.locator('button, [role="option"], li').filter({ hasText: /david|conga|1372/i }).first();
    if (await firstResult.count() > 0) {
      await firstResult.click({ timeout: 5000 }).catch(e => console.warn('  ! click result failed:', e.message.split('\n')[0]));
      await page.waitForTimeout(3000);
    } else {
      console.warn('  ! no results for "David" — capturing search state anyway');
    }
  }
  const out = path.join(OUT, '05-pos-modal-verificacao.png');
  await page.screenshot({ path: out, fullPage: true });
  console.log(`  ✓ saved ${out}`);
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    // Capture login first (no auth)
    console.log('\n=== Pre-login ===');
    await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /administrativo/i }).click().catch(() => {});
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, '01-login.png'), fullPage: true });
    console.log('  ✓ saved 01-login.png');

    console.log('\n=== Login ===');
    await login(page);

    console.log('\n=== Captures ===');
    for (const shot of SHOTS) {
      if (shot.preLogin) continue; // already done
      try {
        await shoot(page, shot.name, shot.url);
      } catch (e) {
        console.error(`  ✗ ${shot.name} FAILED:`, e.message.split('\n')[0]);
      }
    }

    console.log('\n=== POS modal ===');
    try {
      await shootPosWithAluno(page);
    } catch (e) {
      console.error('  ✗ POS modal FAILED:', e.message.split('\n')[0]);
    }

    console.log('\n✓ Done. Screenshots in', OUT);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
