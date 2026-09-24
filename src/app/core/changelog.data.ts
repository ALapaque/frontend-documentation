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
    id: 'react-19-3-router-resources-2026-09',
    date: '2026-09-24',
    title: 'React 19.3 et les Router Resources Angular',
    note: "React 19.3 stabilise <ViewTransition> et ajoute les Fragment refs et browser() : un module dédié fait le tour. Côté Angular, les Router Resources remplacent les resolvers par resource(), en parallèle au lieu du séquentiel. Les modules React Compiler, Vue 3.6, Node et agents IA sont à jour.",
    modules: [
      { framework: 'react', level: 'next', slug: 'react-19-3' },
      { framework: 'angular', level: 'medior', slug: 'router-resources' },
      { framework: 'react', level: 'medior', slug: 'view-transition' },
      { framework: 'react', level: 'senior', slug: 'compiler' },
      { framework: 'vue', level: 'next', slug: 'vue-3-6' },
      { framework: 'ia', level: 'senior', slug: 'ai-agents' },
    ],
  },
  {
    id: 'ia-avancee-plateforme-2026-07',
    date: '2026-07-25',
    title: 'IA avancée, temps réel et TypeScript 7 stable',
    note: "L'IA passe au niveau supérieur : RAG, agents, evals et sécurité. Côté plateforme, un module sur le temps réel (SSE, WebSocket, WebTransport) et contrast-color(). TypeScript 7.0 est stable — l'article est à jour, avec la mise en garde pour Vue, Svelte et Astro.",
    modules: [
      { framework: 'ia', level: 'medior', slug: 'rag' },
      { framework: 'ia', level: 'senior', slug: 'ai-agents' },
      { framework: 'ia', level: 'senior', slug: 'ai-evals' },
      { framework: 'ia', level: 'senior', slug: 'ai-security' },
      { framework: 'web', level: 'senior', slug: 'temps-reel' },
      { framework: 'css', level: 'senior', slug: 'contrast-color' },
      { framework: 'typescript', level: 'next', slug: 'typescript-7' },
    ],
  },
  {
    id: 'ia-section-2026-07',
    date: '2026-07-08',
    title: 'Nouvelle section : IA',
    note: "L'IA côté front, sans hype : comprendre les LLM, coder avec un agent, construire un chat streaming, l'AI SDK, MCP, les patterns UX et l'IA locale dans le navigateur.",
    modules: [
      { framework: 'ia', level: 'junior', slug: 'llm-basics' },
      { framework: 'ia', level: 'medior', slug: 'chat-streaming-ui' },
      { framework: 'ia', level: 'senior', slug: 'mcp' },
      { framework: 'ia', level: 'senior', slug: 'browser-ai' },
    ],
  },
  {
    id: 'angular-22-released-2026-06',
    date: '2026-06-10',
    title: 'Angular 22 est sorti',
    note: "La release du 3 juin confirmée : Signal Forms et Resources stables, OnPush par défaut, TypeScript 6 requis. L'article et les modules sont à jour sur la release note officielle.",
    cta: {
      label: "Lire le bilan — Angular 22, ce que ça change",
      href: '/blog/angular-22-ce-que-ca-change',
    },
    modules: [
      { framework: 'angular', level: 'next', slug: 'angular-22' },
      { framework: 'angular', level: 'medior', slug: 'signal-forms' },
      { framework: 'angular', level: 'senior', slug: 'zoneless' },
    ],
  },
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
    note: 'Signal Forms stables, OnPush par défaut, Vitest par défaut. Le guide pour ne pas le rater, et les modules concernés.',
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
