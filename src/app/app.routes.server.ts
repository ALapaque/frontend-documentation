import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Phase 1: static pages are prerendered; param-driven pages render on the
 * server on demand. Phase 5 wires `getPrerenderParams` from the content
 * catalogue so every sitemap path is statically prerendered at build.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'search', renderMode: RenderMode.Prerender },
  { path: 'about', renderMode: RenderMode.Prerender },
  { path: 'compare/:topic', renderMode: RenderMode.Server },
  { path: ':framework', renderMode: RenderMode.Server },
  { path: ':framework/:level/:slug', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Server },
];
