// Screenshots every page at 390x844 and 1440x900 (full page). Usage: node scripts/shots.mjs [outDir] [baseUrl] [--only=a,b] [--light]
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.replace(/^--/, '').split('=')));
const pos = args.filter((a) => !a.startsWith('--'));
const out = pos[0] ?? 'docs/screenshots';
const base = pos[1] ?? 'http://127.0.0.1:4321';
const only = flags.only ? flags.only.split(',') : null;
const light = 'light' in flags;

const pages = [
  ['home', '/'],
  ['explore', '/explore'],
  ['explore-filtered', '/explore?origin=Japan&stream=games&sort=total&dir=desc'],
  ['franchise-pokemon', '/explore/pokemon'],
  ['franchise-mcu', '/explore/marvel-cinematic-universe-mcu'],
  ['compare', '/compare?f=pokemon,star-wars,marvel-cinematic-universe-mcu'],
  ['owners', '/owners'],
  ['read', '/read'],
  ['sources', '/sources'],
  ['changelog', '/changelog'],
  ['downloads', '/downloads'],
  ['not-found', '/nope'],
].filter(([n]) => !only || only.includes(n));

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1, isMobile: w < 500, hasTouch: w < 500, colorScheme: light ? 'light' : 'dark' });
  await ctx.addInitScript((l) => { try { localStorage.setItem('franchise-theme', l ? 'light' : 'dark'); } catch {} }, light);
  const page = await ctx.newPage();
  for (const [name, path] of pages) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${out}/${name}-${w}${light ? '-light' : ''}.png`, fullPage: true });
    console.log(name, w, light ? 'light' : 'dark');
  }
  await ctx.close();
}
await browser.close();
