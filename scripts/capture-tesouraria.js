#!/usr/bin/env node
const { chromium } = require('playwright');
const path = require('path');

const BASE = 'https://v2.grupogolfinho.com';
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const OUT = path.resolve(__dirname, '..', 'docs', 'img');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();

  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /administrativo/i }).click();
  await page.waitForTimeout(300);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 20000 });

  // POS: search David, select student, check 1-2 debts → cobrança panel visible
  await page.goto(BASE + '/pos', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const search = page.locator('input[placeholder*="aluno" i], input[type="search"]').first();
  await search.fill('David');
  await page.waitForTimeout(2500);
  const candidate = page.locator('button, [role="option"], li, div[role="button"]').filter({ hasText: /david conga matombe/i }).first();
  if (await candidate.count() > 0) {
    await candidate.click({ timeout: 4000 }).catch(e => console.warn('select:', e.message.split('\n')[0]));
    await page.waitForTimeout(3000);
  }

  // Check the first 2 unchecked checkboxes (propinas)
  const checkboxes = page.locator('input[type="checkbox"]');
  const total = await checkboxes.count();
  console.log('Checkboxes total:', total);
  let checked = 0;
  for (let i = 0; i < total && checked < 2; i++) {
    const cb = checkboxes.nth(i);
    if (!(await cb.isChecked())) {
      try {
        await cb.check({ timeout: 2000 });
        checked++;
        await page.waitForTimeout(300);
      } catch (e) { /* skip if not interactable */ }
    }
  }
  console.log('Checked:', checked);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, '20-pos-cobrar.png'), fullPage: true });
  console.log('saved 20-pos-cobrar.png');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
