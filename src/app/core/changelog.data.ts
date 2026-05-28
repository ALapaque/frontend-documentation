import type { Framework, Level } from './levels';

/** A module published in a changelog entry, resolved to its meta at display time. */
export interface ChangelogModuleRef {
  readonly framework: Framework;
  readonly level: Level;
  readonly slug: string;
}

/** One dated release line, grouping the articles shipped together. */
export interface ChangelogEntry {
  /** Stable unique id. Drives the "seen" watermark — never reuse or reorder ids. */
  readonly id: string;
  /** ISO date (YYYY-MM-DD), shown to the reader. Not used for seen-tracking. */
  readonly date: string;
  readonly title: string;
  readonly note?: string;
  readonly modules: readonly ChangelogModuleRef[];
}

/**
 * Curated changelog, newest entry first. Add a new entry when articles ship;
 * the first-visit modal shows every entry the reader hasn't seen yet.
 */
export const CHANGELOG: readonly ChangelogEntry[] = [
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
