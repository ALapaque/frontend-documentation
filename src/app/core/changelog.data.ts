import type { Framework, Level } from './levels';

/** A module published in a changelog entry, resolved to its meta at display time. */
export interface ChangelogModuleRef {
  readonly framework: Framework;
  readonly level: Level;
  readonly slug: string;
}

/** Primary call-to-action on a changelog entry — typically a blog post link. */
export interface ChangelogCta {
  readonly label: string;
  /** Internal router URL (e.g. /blog/<slug>). */
  readonly href: string;
}

/** One dated release line, grouping the articles shipped together. */
export interface ChangelogEntry {
  /** Stable unique id. Drives the "seen" watermark — never reuse or reorder ids. */
  readonly id: string;
  /** ISO date (YYYY-MM-DD), shown to the reader. Not used for seen-tracking. */
  readonly date: string;
  readonly title: string;
  readonly note?: string;
  /** Optional headline CTA above the module list (e.g. linked to a blog post). */
  readonly cta?: ChangelogCta;
  readonly modules: readonly ChangelogModuleRef[];
}

/**
 * Curated changelog, newest entry first. Add a new entry when articles ship;
 * the first-visit modal shows every entry the reader hasn't seen yet.
 */
export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    id: 'vue-vapor-preview-2026-06',
    date: '2026-06-01',
    title: 'Aperçu : Vue 3.6 et Vapor mode',
    note: "Stable visé Q4, bêta feature-complete : comment tester Vapor par îlots cet été sans casser ton app.",
    cta: {
      label: "Lire l'aperçu — Vue 3.6 et Vapor",
      href: '/blog/vue-3-6-vapor-preview',
    },
    modules: [
      { framework: 'vue', level: 'next', slug: 'vue-3-6' },
      { framework: 'vue', level: 'senior', slug: 'vapor-mode' },
    ],
  },
  {
    id: 'angular-22-blog-2026-06',
    date: '2026-06-01',
    title: 'Angular 22 arrive',
    note: 'Signal Forms stables, zoneless par défaut, Vitest par défaut. Le guide pour ne pas le rater, et les modules concernés.',
    cta: {
      label: "Lire l'article — Angular 22, ce que ça change",
      href: '/blog/angular-22-ce-que-ca-change',
    },
    modules: [
      { framework: 'angular', level: 'next', slug: 'angular-22' },
      { framework: 'angular', level: 'medior', slug: 'signal-forms' },
      { framework: 'angular', level: 'senior', slug: 'zoneless' },
    ],
  },
  {
    id: 'angular-deep-dives-2026-05',
    date: '2026-05-28',
    title: 'Approfondissements Angular',
    note: 'Signal Forms gagne une partie avancée (validation croisée, async, Zod, soumission), et le module Zoneless est refondu (défaut en v21, migration, débogage).',
    modules: [
      { framework: 'angular', level: 'medior', slug: 'signal-forms' },
      { framework: 'angular', level: 'senior', slug: 'zoneless' },
    ],
  },
  {
    id: 'fundamentals-horizon-2026',
    date: '2026-05-28',
    title: "L'horizon 2026 des fondamentaux",
    note: "Ce qui arrive côté plateforme web, CSS et outillage : Temporal, if(), Rolldown et le reste.",
    modules: [
      { framework: 'web', level: 'next', slug: 'web-platform-2026' },
      { framework: 'css', level: 'next', slug: 'css-2026' },
      { framework: 'tooling', level: 'next', slug: 'tooling-2026' },
    ],
  },
  {
    id: 'i18n-2026',
    date: '2026-05-27',
    title: 'Internationalisation',
    note: "Formater et traduire pour le monde entier : l'API Intl et l'i18n des trois frameworks.",
    modules: [
      { framework: 'web', level: 'medior', slug: 'internationalization' },
      { framework: 'angular', level: 'medior', slug: 'i18n' },
      { framework: 'react', level: 'medior', slug: 'i18n' },
      { framework: 'vue', level: 'medior', slug: 'i18n' },
    ],
  },
];
