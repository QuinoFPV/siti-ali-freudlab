import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ali-milano.it',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
