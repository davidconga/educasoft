#!/usr/bin/env node
const { chromium } = require('playwright');
const path = require('path');

const BASE = 'https://v2.grupogolfinho.com';
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const OUT = path.resolve(__dirname, '..', 'docs', 'img');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Login
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /administrativo/i }).click();
  await page.waitForTimeout(300);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 20000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  console.log('logged in');

  // Reset verification flag for #1372 first
  await page.goto(BASE + '/alunos/1372', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const resetBtn = page.getByRole('button', { name: /reset/i }).first();
  if (await resetBtn.count() > 0) {
    page.once('dialog', d => d.accept().catch(() => {}));
    await resetBtn.click({ timeout: 3000 }).catch(e => console.warn('reset click:', e.message.split('\n')[0]));
    await page.waitForTimeout(1500);
    console.log('reset attempted');
  } else {
    console.log('no reset button visible (already null?)');
  }

  // POS
  await page.goto(BASE + '/pos', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const search = page.locator('input[placeholder*="aluno" i], input[placeholder*="pesquisar" i], input[type="search"]').first();
  await search.fill('David');
  await page.waitForTimeout(2500);

  // Get textual context of results
  const resultsText = await page.locator('body').innerText().catch(() => '');
  console.log('--- search results snippet ---');
  console.log(resultsText.substring(resultsText.indexOf('Procurar'), resultsText.indexOf('Procurar') + 800));

  // Try clicking first plausible result
  const candidates = [
    page.locator('button, [role="option"], li, div[role="button"]').filter({ hasText: /david.*conga|conga.*david/i }).first(),
    page.locator('button, [role="option"], li, div[role="button"]').filter({ hasText: /1372/ }).first(),
    page.locator('[class*="result"], [class*="suggest"], [class*="option"]').first(),
  ];
  let clicked = false;
  for (const c of candidates) {
    if (await c.count() > 0) {
      try {
        await c.click({ timeout: 3000 });
        console.log('clicked a candidate');
        clicked = true;
        break;
      } catch (e) {
        console.warn('candidate click fail:', e.message.split('\n')[0]);
      }
    }
  }
  if (!clicked) console.warn('no candidate clicked');

  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(OUT, '05-pos-modal-verificacao.png'), fullPage: true });
  console.log('saved');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
