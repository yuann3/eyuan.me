import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { remarkReadingTime } from './src/utils/remark-reading-time.mjs';

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: 'https://www.eyuan.me',
  integrations: [mdx(), sitemap(), tailwind()],
  markdown: {
    remarkPlugins: [remarkReadingTime],
    syntaxHighlight: 'shiki',
    shikiConfig: {
      // https://docs.astro.build/en/guides/markdown-content/#syntax-highlighting
      theme: 'catppuccin-latte'
    }
  },
});


