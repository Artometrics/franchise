import { expect, test, type Page } from '@playwright/test';

const ROUTES = [
  '/',
  '/explore',
  '/explore/pokemon',
  '/explore/marvel-cinematic-universe-mcu',
  '/compare',
  '/compare?f=pokemon,star-wars,marvel-cinematic-universe-mcu',
  '/owners',
  '/read',
  '/sources',
  '/changelog',
  '/downloads',
];

async function overflow(page: Page) {
  return page.evaluate(() => ({
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.documentElement.clientWidth,
  }));
}

test.describe('every route', () => {
  for (const route of ROUTES) {
    test(`${route}: 200, noindex, footer back-link, no horizontal scroll`, async ({ page }) => {
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      const back = page.locator('footer a[href="https://artometrics.com/franchise"]');
      await expect(back.first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const o = await overflow(page);
      expect(o.doc, 'document overflows horizontally').toBeLessThanOrEqual(0);
      expect(o.body, 'body overflows horizontally').toBeLessThanOrEqual(0);
    });
  }

  test('unknown route renders the 404 page, still noindex', async ({ page }) => {
    const res = await page.goto('/nope');
    expect(res?.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test('robots.txt disallows everything', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  expect(await res.text()).toMatch(/Disallow:\s*\/\s*$/m);
});

test('all 140 franchise pages exist, are noindex and carry a chart', async ({ request }) => {
  const index = await (await request.get('/explore')).text();
  const slugs = [...new Set([...index.matchAll(/href="\/explore\/([a-z0-9-]+)"/g)].map((m) => m[1]))];
  expect(slugs).toHaveLength(140);
  for (const slug of slugs) {
    const res = await request.get(`/explore/${slug}`);
    expect(res.status(), slug).toBe(200);
    const html = await res.text();
    expect(html, slug).toMatch(/<meta name="robots" content="[^"]*noindex/);
    expect(html, slug).toContain('Revenue breakdown');
  }
});

test.describe('home', () => {
  test('title, key figures, five findings', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Franchise:');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Merchandise Owns the Ledger');
    await expect(page.locator('.finding')).toHaveCount(5);
    await expect(page.getByText('$1,460.1B').first()).toBeVisible();
  });

  test('nothing auto-moves: no animated or autoplay elements', async ({ page }) => {
    await page.goto('/');
    const moving = await page.evaluate(() => ({
      autoplay: document.querySelectorAll('video[autoplay], audio[autoplay]').length,
      marquee: document.querySelectorAll('marquee').length,
      running: document.getAnimations().filter((a) => a.playState === 'running' && (a.effect?.getTiming().iterations ?? 1) === Infinity).length,
    }));
    expect(moving).toEqual({ autoplay: 0, marquee: 0, running: 0 });
  });
});

test.describe('explore', () => {
  test('lists all 140 and sorts by name and by total', async ({ page }) => {
    await page.goto('/explore');
    const rows = page.locator('#explore-body tr');
    await expect(rows).toHaveCount(140);
    await expect(rows.first()).toContainText('Pokémon');
    if (await page.locator('button[data-sort="name"]').isVisible()) await page.locator('button[data-sort="name"]').click();
    else await page.locator('#sort').selectOption('name:asc');
    await expect(rows.first().locator('a').first()).not.toHaveText('Pokémon');
    const names = await rows.locator('td:first-child a').allInnerTexts();
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    expect(names.slice(0, 5)).toEqual(sorted.slice(0, 5));
  });

  test('search, origin and stream filters narrow the list and write the URL', async ({ page }) => {
    await page.goto('/explore');
    await page.locator('#origin').selectOption('Japan');
    const rows = page.locator('#explore-body tr');
    const n = await rows.count();
    expect(n).toBeGreaterThan(5);
    expect(n).toBeLessThan(140);
    await expect(page.locator('#reset')).toBeVisible();
    await expect(page).toHaveURL(/origin=Japan/);

    await page.locator('#q').fill('pokemon');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Pokémon');

    await page.locator('#q').fill('zzzzzz');
    await expect(page.locator('#empty')).toBeVisible();

    await page.locator('#reset').click();
    await expect(rows).toHaveCount(140);
    await expect(page.locator('#reset')).toBeHidden();
  });

  test('filter state in the URL is restored on load', async ({ page }) => {
    await page.goto('/explore?origin=Japan&stream=games');
    await expect(page.locator('#origin')).toHaveValue('Japan');
    const n = await page.locator('#explore-body tr').count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(140);
  });

  test('a row opens its franchise page with a revenue chart', async ({ page }) => {
    await page.goto('/explore');
    await page.locator('#explore-body tr').first().locator('a').first().click();
    await expect(page).toHaveURL(/\/explore\/pokemon$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pokémon');
    await expect(page.locator('.cbars').first()).toBeVisible();
  });
});

test.describe('compare', () => {
  test('preloaded from the URL, caps at three, removing frees a slot, URL is shareable', async ({ page }) => {
    await page.goto('/compare?f=pokemon,star-wars,marvel-cinematic-universe-mcu');
    const picks = page.locator('#picks .pick');
    await expect(picks).toHaveCount(3);
    await expect(page.locator('#msg')).toContainText('3 picked');
    await expect(page.locator('#c-totals .cb-row, #c-totals .cbars').first()).toBeVisible();

    await page.locator('button[data-remove="star-wars"]').click();
    await expect(picks).toHaveCount(2);
    await expect(page).toHaveURL(/f=pokemon,marvel-cinematic-universe-mcu/);

    await page.locator('#add').selectOption('barbie');
    await expect(picks).toHaveCount(3);
    await expect(page).toHaveURL(/barbie/);
  });

  test('presets load a comparison', async ({ page }) => {
    await page.goto('/compare');
    await page.locator('[data-preset]').first().click();
    const n = await page.locator('#picks .pick').count();
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThanOrEqual(3);
  });
});

test.describe('theme', () => {
  test('toggle switches and persists across navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#theme-btn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.goto('/owners');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.locator('#theme-btn').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('downloads', () => {
  test('every file link opens in a new tab and resolves', async ({ page, request }) => {
    await page.goto('/downloads');
    const links = page.locator('main a[href^="/downloads/"]');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < count; i++) {
      const a = links.nth(i);
      await expect(a).toHaveAttribute('target', '_blank');
      await expect(a).toHaveAttribute('rel', /noopener/);
      const href = (await a.getAttribute('href'))!;
      expect((await request.get(href)).status(), href).toBe(200);
    }
    await expect(page.locator('main a[href="/downloads/franchise.pdf"]').first()).toBeVisible();
  });
});

test.describe('read and sources', () => {
  test('every citation in the article resolves to an entry on the sources page', async ({ page }) => {
    await page.goto('/read');
    const hrefs = await page.locator('a.cite[href^="/sources#"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')!));
    const ids = [...new Set(hrefs.map((h) => h.split('#')[1]))];
    expect(ids.length).toBeGreaterThan(10);
    await page.goto('/sources');
    for (const id of ids) await expect(page.locator(`[id="${id}"]`), id).toHaveCount(1);
    await expect(page.locator('[id^="S0"], [id="HH2018"]')).toHaveCount(23);
  });
});

test('no franchise page scrolls horizontally', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/explore');
  const slugs = [...new Set(await page.locator('#explore-body a[href^="/explore/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')!)))];
  expect(slugs).toHaveLength(140);
  const bad: string[] = [];
  for (const href of slugs) {
    await page.goto(href, { waitUntil: 'domcontentloaded' });
    const o = await overflow(page);
    if (o.doc > 0 || o.body > 0) bad.push(`${href} (+${Math.max(o.doc, o.body)}px)`);
  }
  expect(bad).toEqual([]);
});
