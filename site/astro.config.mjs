import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://franchise.artometrics.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  devToolbar: { enabled: false },
  vite: { build: { sourcemap: false } },
});
