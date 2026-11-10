// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import sanity from '@sanity/astro';
import { defineConfig, fontProviders } from 'astro/config';
import { loadEnv } from 'vite';

import tailwindcss from '@tailwindcss/vite';

// astro.config runs before Astro loads .env, so read the PUBLIC_ vars via Vite.
const { PUBLIC_SANITY_STUDIO_PROJECT_ID, PUBLIC_SANITY_STUDIO_DATASET, PUBLIC_COMING_SOON } = loadEnv(
  process.env.NODE_ENV ?? 'development',
  process.cwd(),
  '',
);

// https://astro.build/config
export default defineConfig({
  site: 'https://www.udruzenjeskipera.me',
  integrations: [
    mdx(),
    // While the coming-soon page is live, only the homepage goes in the sitemap.
    sitemap(
      PUBLIC_COMING_SOON === 'true'
        ? { filter: (page) => new URL(page).pathname === '/' }
        : {},
    ),
    sanity({
      projectId: PUBLIC_SANITY_STUDIO_PROJECT_ID,
      dataset: PUBLIC_SANITY_STUDIO_DATASET,
      apiVersion: '2026-11-09',
      useCdn: false, // static build: fetch fresh published content at build time
      // Studio is standalone in ../studio — not embedded here.
    }),
  ],

  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Roboto',
      cssVariable: '--font-roboto',
      weights: [400, 500, 600, 700, 800],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: [400, 500],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['sans-serif'],
    },
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
