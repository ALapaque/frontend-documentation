import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SITE_NAME, SITE_URL } from '../site';

export interface SeoInput {
  readonly title: string;
  readonly description: string;
  /** Absolute path, e.g. /angular/medior/signals */
  readonly path: string;
  readonly image?: string;
  readonly type?: 'website' | 'article';
  /** JSON-LD object (e.g. TechArticle). Serialized into a script tag. */
  readonly jsonLd?: Record<string, unknown>;
}

/**
 * Sets per-route document metadata: title, description, canonical, OpenGraph,
 * Twitter cards and optional JSON-LD. Called from page components during
 * render so the tags land in the prerendered/SSR HTML.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  set(input: SeoInput): void {
    const fullTitle = `${input.title} — ${SITE_NAME}`;
    const url = `${SITE_URL}${input.path}`;
    const image = input.image ? `${SITE_URL}${input.image}` : `${SITE_URL}/og/default.png`;
    const type = input.type ?? 'website';

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: input.description });

    const tags: Array<{ key: 'property' | 'name'; value: string; content: string }> = [
      { key: 'property', value: 'og:title', content: fullTitle },
      { key: 'property', value: 'og:description', content: input.description },
      { key: 'property', value: 'og:type', content: type },
      { key: 'property', value: 'og:url', content: url },
      { key: 'property', value: 'og:image', content: image },
      { key: 'property', value: 'og:site_name', content: SITE_NAME },
      { key: 'name', value: 'twitter:card', content: 'summary_large_image' },
      { key: 'name', value: 'twitter:title', content: fullTitle },
      { key: 'name', value: 'twitter:description', content: input.description },
      { key: 'name', value: 'twitter:image', content: image },
    ];
    for (const t of tags) {
      this.meta.updateTag({ [t.key]: t.value, content: t.content } as Record<string, string>);
    }

    this.setCanonical(url);
    this.setJsonLd(input.jsonLd);
  }

  private setCanonical(url: string): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setJsonLd(data: Record<string, unknown> | undefined): void {
    const existing = this.doc.getElementById('ld-json');
    if (existing) existing.remove();
    if (!data) return;
    const script = this.doc.createElement('script');
    script.id = 'ld-json';
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(data);
    this.doc.head.appendChild(script);
  }
}
