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
  console.log('logged in');

  // 1. Financiadores
  await page.goto(BASE + '/financiadores', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, '17-financiadores.png'), fullPage: true });
  console.log('saved 17-financiadores.png');

  // 2. Modal Nova Bolsa
  await page.goto(BASE + '/bolsas', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const novaBtn = page.getByRole('button', { name: /nova bolsa/i }).first();
  if (await novaBtn.count() > 0) {
    await novaBtn.click({ timeout: 4000 }).catch(e => console.warn('nova bolsa:', e.message.split('\n')[0]));
    await page.waitForTimeout(2500);
  }
  // Disable backdrop-filter (causes white screenshots on headless chromium)
  await page.evaluate(() => {
    document.querySelectorAll('.backdrop-blur-sm,.backdrop-blur').forEach(el => {
      el.style.backdropFilter = 'none';
      el.style.background = 'rgba(15,23,42,0.55)';
    });
  });
  await page.waitForTimeout(400);
  // Screenshot the modal element directly
  const modal = page.locator('.bg-white.rounded-2xl.shadow-xl').first();
  if (await modal.count() > 0) {
    await modal.screenshot({ path: path.join(OUT, '18-bolsa-form.png') });
  } else {
    await page.screenshot({ path: path.join(OUT, '18-bolsa-form.png'), fullPage: false });
  }
  console.log('saved 18-bolsa-form.png');

  // 3. Carteira do Aluno (David Conga)
  await page.goto(BASE + '/carteira-aluno', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const search = page.locator('input[placeholder*="Nome" i], input[placeholder*="aluno" i]').first();
  if (await search.count() > 0) {
    await search.fill('David Conga');
    await page.waitForTimeout(2000);
    const candidate = page.locator('button').filter({ hasText: /david conga matombe/i }).first();
    if (await candidate.count() > 0) {
      await candidate.click({ timeout: 3000 }).catch(e => console.warn('select aluno:', e.message.split('\n')[0]));
      await page.waitForTimeout(3000);
    }
  }
  await page.screenshot({ path: path.join(OUT, '19-carteira-aluno.png'), fullPage: true });
  console.log('saved 19-carteira-aluno.png');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
