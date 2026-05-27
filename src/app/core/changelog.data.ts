import type { Framework, Level } from './levels';

/** A module published in a changelog entry, resolved to its meta at display time. */
export interface ChangelogModuleRef {
  readonly framework: Framework;
  readonly level: Level;
  readonly slug: string;
}

/** One dated release line, grouping the articles shipped together. */
export interface ChangelogEntry {
  /** ISO date (YYYY-MM-DD). Used to decide what the reader hasn't seen yet. */
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
