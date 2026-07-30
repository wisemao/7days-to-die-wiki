import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://mllllwb.github.io',
  base: '/7days-to-die-wiki',
  output: 'static',
  integrations: [mdx(), sitemap()],
  vite: {
    resolve: {
      alias: {
        '@data': '/data',
      },
    },
  },
});
