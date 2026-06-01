import { RenderMode, ServerRoute } from '@angular/ssr';
import { CATALOGUE } from '../content/generated/catalogue';
import { COMPARE_LIST } from '../content/generated/compare-list';
import { BLOG_LIST } from '../content/generated/blog-list';
import { SECTIONS } from './core/levels';

/**
 * Every content route is statically prerendered at build from the catalogue,
 * so the whole sitemap is static HTML (200 in SSR, optimal SEO). The unmatched
 * fallback renders on the server on demand.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'search', renderMode: RenderMode.Prerender },
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'compare', renderMode: RenderMode.Prerender },
  {
    path: 'compare/:topic',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => COMPARE_LIST.map((c) => ({ topic: c.topic })),
  },
  { path: 'blog', renderMode: RenderMode.Prerender },
  {
    path: 'blog/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => BLOG_LIST.map((p) => ({ slug: p.slug })),
  },
  {
    path: ':framework',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => SECTIONS.map((framework) => ({ framework })),
  },
  {
    path: ':framework/:level/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () =>
      CATALOGUE.map((m) => ({ framework: m.framework, level: m.level, slug: m.slug })),
  },
  { path: '**', renderMode: RenderMode.Server },
];
