#!/usr/bin/env node
const { chromium } = require('playwright');
const path = require('path');

const BASE = 'https://v2.grupogolfinho.com';
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const OUT = path.resolve(__dirname, '..', 'docs', 'img');

const SHOTS = [
  { name: '40-prof-inicio',    url: '/professor' },
  { name: '41-prof-turmas',    url: '/professor/turmas' },
  { name: '42-prof-horario',   url: '/professor/horario' },
  { name: '43-prof-notas',     url: '/professor/notas' },
  { name: '44-prof-presencas', url: '/professor/presencas' },
  { name: '45-prof-aulas',     url: '/professor/aulas' },
  { name: '46-prof-conta',     url: '/professor/conta' },
];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();

  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /professor/i }).first().click();
  await page.waitForTimeout(300);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 20000 });
  console.log('logged in →', page.url());

  for (const s of SHOTS) {
    try {
      await page.goto(BASE + s.url, { waitUntil: 'networkidle', timeout: 25000 });
    } catch (e) { console.warn('nav slow:', s.url); }
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(OUT, `${s.name}.png`), fullPage: true });
    console.log('saved', s.name);
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
