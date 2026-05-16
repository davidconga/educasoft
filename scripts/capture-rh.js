#!/usr/bin/env node
const { chromium } = require('playwright');
const path = require('path');

const BASE = 'https://v2.grupogolfinho.com';
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const OUT = path.resolve(__dirname, '..', 'docs', 'img');

const SHOTS = [
  { name: '30-rh-dashboard',    url: '/rh' },
  { name: '31-rh-funcionarios', url: '/rh/funcionarios' },
  { name: '32-rh-folhas',       url: '/rh/folhas' },
  { name: '33-rh-presencas',    url: '/rh/presencas' },
];

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
  console.log('logged in');

  for (const s of SHOTS) {
    try {
      await page.goto(BASE + s.url, { waitUntil: 'networkidle', timeout: 25000 });
    } catch (e) { console.warn('nav slow:', s.url); }
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(OUT, `${s.name}.png`), fullPage: true });
    console.log('saved', s.name);
  }

  // Folha detalhe (first folha if any)
  await page.goto(BASE + '/rh/folhas', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const firstLink = page.locator('a[href^="/rh/folhas/"]').filter({ hasNot: page.locator('text=/^\\/rh\\/folhas$/') }).first();
  if (await firstLink.count() > 0) {
    try {
      await firstLink.click({ timeout: 4000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(OUT, '34-rh-folha-detalhe.png'), fullPage: true });
      console.log('saved 34-rh-folha-detalhe');
    } catch (e) { console.warn('folha detalhe:', e.message.split('\n')[0]); }
  } else {
    console.log('no folha to open');
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
