# FRANCHISE mini-site: plan

Status: plan + mockups committed first, build follows. Nothing here is deployed or merged.

## 1. What this is

`franchise.artometrics.com` is the first of a series. Each Artometrics report (tagline "culture, quantified") gets its own full mini-site on its own subdomain, in the spirit of United by Data or Data with the Stars. The article stays the spine. The site adds ways in: an explorer, a comparer, an ownership view and the paperwork (sources, method, downloads).

* Target host: `franchise.artometrics.com`. Firebase Hosting site `artometrics-franchise` in project `twilda-510519` (artometrics-510519 is out of Hosting site quota).
* Delivery: pull request only. No merge, no deploy, no DNS.
* The old R/Quarto analysis (`franchise.qmd`, `franchise.csv`, `data/`, `charts/`, the root `.html`/`.css`) is not touched. Everything new is under `/site`.

## 2. Source of truth

The current published, corrected article, live at https://artometrics.com/franchise (updated 12 Nov 2026, data read 10 Nov 2026 from Wikipedia revision 1384334611, 7 Nov 2026).

Fetched on 12 Nov 2026 from the live site and the public repo `Artometrics/artometrics` (default branch `main`), then committed verbatim under `site/src/data/source/` with a SHA-256 manifest:

| What | From | Used for |
|---|---|---|
| Article body + frontmatter (`franchise.md`) | `src/content/blog/franchise.md` | Read page, findings, key figures, FAQ |
| Sources sidecar (`franchise.meta.json`) | `src/content/blog/franchise.meta.json` | Sources & method page, citations, chart titles and captions |
| Franchise ledger (140 rows) | `/data/articles/franchise/clean/franchise_entities_2026-10.csv` | Explore table, per-franchise pages, owners |
| Revenue by stream (360 rows) | `.../clean/franchise_revenue_long_2026-10.csv` | Per-franchise breakdown, compare |
| Published shares, ranges, concentration, region | `.../clean/category_shares_bootstrap.csv`, `owner_concentration_bootstrap.csv`, `region_summary_2026-10.csv` | Headline figures (read, not recomputed) |
| 28 chart specs (Plotly JSON) | `.../charts/**/*.plotly.json` | Article charts, redrawn |
| Box office top ten snapshot | `.../box_office_top10_snapshot_2026-11-10.csv` | 9 of 10 and 6 of 10 |
| Deals, Disney segments, failures, 2019 vs 2026 | `disney_acquisitions.csv`, `disney_segment_revenue_fy2025.csv`, `franchise_failures.csv`, `franchise_revenue_2019_vs_2026.csv` | Owners page, Read |
| Changelog, verified numbers, source registry | `CHANGELOG.md`, `verified_numbers.csv`, `sources.csv` | Sources & method, Downloads |
| PDF export | `/exports/franchise.pdf` | Downloads (opens in a new tab) |

Rules:

1. No figure is typed by hand into a page. Every number on screen comes from a source file above, through `src/lib/`.
2. Headline figures that the article publishes (shares, ranges, concentration, region) are read from the article's own CSVs. Anything this site derives itself (per-owner merchandise share, origin stream mix) is computed from the ledger, labelled "derived on this site", and has a unit test that reproduces the published figure wherever one exists.
3. Every figure carries its source ID (S017 etc.) and links to the Sources & method page.
4. The article's own cautions travel with the numbers: nominal estimates of consumer spending, not profit; ranges are re-sampling ranges; the owner column is a first-listed-parent counting rule, not a legal ownership audit; the PDF is the 10 November export.
5. If a source file and the live page disagree, the live page wins and the difference is logged in the PR.

## 3. Site map

| Route | Page | Contents |
|---|---|---|
| `/` | Home | Title "Franchise: Merchandise Owns the Ledger", key-figure cards, the 5 findings as scroll sections, entry points to the other pages |
| `/explore` | Explore | Sortable, filterable table of all 140 franchises: owner, origin country, revenue streams. Search, origin filter, owner filter, stream filter |
| `/explore/<slug>` | Franchise page (x140) | Header facts, revenue breakdown chart, stream table, neighbours, link to Compare pre-filled |
| `/compare` | Compare | Pick 2 or 3 franchises; side-by-side bars by stream and total. Selection lives in the URL |
| `/owners` | Owners | Concentration (Disney 29.5%, top five 58.3%, with ranges), all 57 parents, who owns what, merchandising styles by origin, acquisitions, IP and marketing checklist |
| `/read` | Read | The full article, source-linked, charts redrawn |
| `/sources` | Sources & method | Every citation (S-numbers), method, caveats, vintage, verified numbers |
| `/changelog` | Changelog | Figure-by-figure changes since October |
| `/downloads` | Downloads | CSVs and the PDF, all opening in a new tab; notes on what each holds |
| `/robots.txt` | | `Disallow: /` |

Footer on every page: link back to https://artometrics.com/franchise, the Artometrics wordmark and tagline, vintage line.

## 4. Design

Matches the live Artometrics brand, taken from the live CSS (`house-style.css`, `system.css`):

* Ground `#0e1110`, panel `#121014`, cream text `#f3ead7`, hot pink `#ff3d8a`, electric blue `#0047ff` (link tint `#9db7ff` on dark), muted `#b7d0cb`. Light theme: paper `#fffdf8`, ink `#14110e`.
* Type: Anton for display, DM Sans for body, DM Mono for labels and numbers, Chomsky for the wordmark. The brand font files are self-hosted.
* Boxes carry the hard offset shadow: pink for content, blue for actions.
* Wordmark (pink halftone) and "culture, quantified" in the masthead.
* Dark by default, with a toggle. Light theme persisted in `localStorage`. Charts read CSS variables and redraw on theme change.
* Mobile-first. Designed at 390 x 844 (iPhone), checked at 1440 x 900. No horizontal scroll at 390. Tap targets at least 44px. Tables become stacked cards below 640px.
* Nothing auto-moves: no autoplay, no auto-carousel, no scroll-jacking, no parallax, no count-up. Reduced-motion is respected even for hover transitions.

## 5. Charts

* d3 (scales, selection, shapes) drawn into SVG. Redrawn on container resize and theme change.
* Bar rows put the label above the bar, so long names fit at 390px. Values sit at the bar end. Negative values draw left of a zero line.
* Each chart has a title, description, source line and a "view the data" table, rendered at build time, so the numbers are readable without JS.
* Article charts are redrawn from the article's own Plotly JSON, not re-keyed. Colours map by role: highlight (pink), second series (blue), the rest (muted cream).
* Palette is colour-blind checked by also varying value labels and, where two series share a chart, row grouping. Meaning never rests on colour alone.

## 6. Tech

Astro 5 static output, TypeScript strict, `trailingSlash: never`, `build.format: file` so Firebase `cleanUrls` serves `/explore` and `/explore/pokemon`. Client scripts are small modules per page. Vitest for unit tests. Playwright for e2e.

`src/report.config.ts` holds the per-report values (slug, title, host, tagline, vintage, source paths). The next report's site can copy `/site` and change the config and source files.

noindex everywhere:

* `<meta name="robots" content="noindex, nofollow, noarchive">` in the shared layout
* `public/robots.txt`: `User-agent: *` / `Disallow: /`
* `firebase.json`: `X-Robots-Tag: noindex, nofollow, noarchive` on `**`, so it also covers CSV and PDF files
* no sitemap, no canonical, no Open Graph URLs

`firebase.json` targets hosting site `artometrics-franchise`; `.firebaserc` pins project `twilda-510519`.

## 7. Tests

Unit (Vitest), data logic first:

* CSV parser (quotes, embedded commas, blanks)
* slugs are unique and stable across all 140 rows
* totals: 140 rows, $1,460.1B; merchandise $812.4B and 55.6%; games 18.3%; box office 18.1%
* Pokémon $130.7B beats Star Wars + MCU $84.2B
* owner roll-up: Disney $430.7B, 29.5%; top five 58.3%; 57 parents
* origin figures: US $825.5B / Japan $394.5B / UK $136.1B and the published merchandise shares
* derived origin mix reproduces the published merchandise shares to rounding
* box office coding: 9 of 10 for 2025 (94.3% on Box Office Mojo), 6 of 10 for 2026 (61.9%)
* filter, sort and search functions of the explorer; compare selection rules (2 to 3, de-duplicated, URL round trip)
* citation linker (`[S017; S005]`, aliases like `[Jenkins, 2006]`)
* chart spec adapter (Plotly JSON to bar spec, negative values, label wrapping)
* noindex invariants: every built HTML page has the robots meta; `robots.txt` and `firebase.json` headers present

E2E smoke (Playwright) at 390 x 844 and 1440 x 900, against the built site:

* every route returns 200 and has the noindex meta and the footer link back
* no horizontal scroll at 390 on every route
* explorer sorts and filters; per-franchise page draws its chart
* compare accepts 2 and 3 picks and refuses a 4th
* theme toggle switches and persists
* a sample of 140 franchise pages, plus every internal link on the main pages, resolves

Screenshots: every page at both sizes, committed under `site/docs/screenshots/`, and copied to the Agent Store under `shots/`.

## 8. Order of work

1. This plan and the mockups (first commit).
2. Source data + loaders + unit tests.
3. Layout, brand, theme.
4. Charts.
5. Pages: Home, Explore, franchise pages, Compare, Owners, Read, Sources, Changelog, Downloads.
6. e2e, screenshots, fixes.
7. PR with Known weak spots.

## 9. Open questions I am answering by default

* Where does `docs/screenshots` live? Under `site/docs/screenshots` so the mini-site stays self-contained and can move to its own repo.
* Dark or light first? Dark, as on artometrics.com. Light is one tap away.
* Does the PDF match the web text? Not fully: the PDF is the 10 November export and predates the 12 November additions (the IP section and per-figure source links). The Downloads page says so.
* Per-franchise merchandise share is not in the article. It is shown as "derived on this site" and is computed from the ledger rows.
