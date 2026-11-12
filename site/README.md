# Franchise mini-site (franchise.artometrics.com)

Static Astro site for the Artometrics Franchise report. Private review build: `noindex` in every page, `robots.txt` and `X-Robots-Tag` (see `firebase.json`).

```bash
npm ci
npm run sync:source   # refresh src/data/source from artometrics.com sources (optional; snapshot is committed)
npm run dev           # http://localhost:4321
npm run build         # copies downloads, builds dist/, then verifies noindex + back-links
npm test              # unit tests (vitest)
npm run test:e2e      # Playwright smoke at 390x844 and 1440x900 (builds and previews itself)
npm run shots         # full-page screenshots into docs/screenshots (needs a preview on :4321)
```

Not deployed. Hosting target: Firebase site `artometrics-franchise` in project `twilda-510519` (artometrics-510519 hosting site quota is full). See `PLAN.md` for architecture and data provenance.
