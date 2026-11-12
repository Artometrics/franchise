/**
 * Per-report configuration. The next report in the series copies /site and edits this file
 * plus the files in src/data/source.
 */
export const report = {
  slug: 'franchise',
  name: 'Franchise',
  title: 'Franchise: Merchandise Owns the Ledger',
  titleAccent: 'Franchise:',
  titleRest: 'Merchandise Owns the Ledger',
  tagline: 'culture, quantified',
  host: 'franchise.artometrics.com',
  parentUrl: 'https://artometrics.com/franchise',
  parentLabel: 'artometrics.com/franchise',
  siteUrl: 'https://artometrics.com',
  author: 'Kyle McAuliffe',
  vintage: {
    revision: '1384334611',
    revisionDate: '7 November 2026',
    read: '10 November 2026',
    articleUpdated: '12 November 2026',
  },
  firebase: { project: 'artometrics-510519', site: 'artometrics-franchise' },
} as const;
