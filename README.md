# Practical Docs

Documentation pédagogique multi-framework — **Angular**, **React**, **Vue** —
en trois niveaux (Junior → Medior → Senior). Esthétique dark luxury, Angular 21
avec SSR + hydration et change detection zoneless.

> Statut : **complet** — bootstrap, design system, pipeline de contenu
> markdown, pages, recherche Cmd+K, 27 modules rédigés, SEO + prerender. Voir
> `CONTENT_DECISIONS.md` pour le journal des décisions.

## Stack

- Angular 21, standalone + signals + control flow moderne
- SSR via `@angular/ssr` — `provideClientHydration(withEventReplay(), withIncrementalHydration())`
- Zoneless (`provideZonelessChangeDetection()`, pas de `zone.js`)
- Routing lazy (`loadComponent`) avec component input binding
- CSS natif, variables CSS, typographie Fraunces · Inter Tight · JetBrains Mono
- TypeScript strict

## Prérequis

- Node 20+ (testé sur Node 22)
- npm 10+

## Installation

```bash
npm install
```

## Scripts

| Script | Effet |
| --- | --- |
| `npm start` | Serveur de dev (HMR) sur http://localhost:4200 |
| `npm run content` | Compile le markdown + génère SEO (auto avant build/dev) |
| `npm run build` | Build de production (SSR + prerender complet) dans `dist/` |
| `npm run serve:ssr:frontend-documentation` | Lance le serveur SSR depuis `dist/` |
| `npm run scaffold:stubs` | Crée les `.md` stubs manquants du catalogue |
| `npm run smoke` | E2E : vérifie que toutes les routes du sitemap renvoient 200 |
| `npm test` | Tests unitaires (Vitest) |

### Tester le rendu SSR localement

```bash
npm run build
npm run serve:ssr:frontend-documentation
# puis : curl -s localhost:4000/angular
```

## Structure

```
src/
├── app/
│   ├── ui/          composants de présentation (eyebrow, level-chip, callout, code-block…)
│   ├── layout/      header, footer, shell
│   ├── features/    landing, framework-hub, module-page, compare-page, search, about
│   ├── core/        modèles partagés (levels, frameworks)
│   ├── app.config.ts        providers (zoneless, hydration, router)
│   ├── app.config.server.ts config SSR
│   └── app.routes.ts        routes lazy
├── styles/          tokens.css, typography.css, base.css, prose.css
└── index.html       polices + meta
```

## Ajouter un module

1. Crée `src/content/{framework}/{level}/{slug}.md` (ex.
   `src/content/angular/medior/signals.md`). L'arborescence
   `{framework}/{level}/` est obligatoire — l'URL en découle.
2. Renseigne le front-matter :

   ```yaml
   ---
   title: "Signals"
   slug: "signals"
   framework: "angular"
   level: "medior"        # junior | medior | senior
   order: 1               # ordre dans le niveau
   duration: 18           # minutes
   prerequisites: ["data-binding"]
   updated: 2026-05-22
   seoTitle: "..."
   seoDescription: "..."
   ogVariant: "gold"      # gold | sage | crimson (déduit du niveau si absent)
   related:
     - { framework: "react", slug: "state-basics" }
   stub: true             # optionnel — page "À venir"
   ---
   ```

3. Rédige le corps. Markdown standard + blocs custom :

   - `## Titre` / `### Sous-titre` → sections (alimentent le TOC)
   - ` ```ts ` … ` ``` ` → bloc de code (coloré par Shiki, bouton copier)
   - `:::callout{type="tip"}` … `:::` → encadré (`info` | `tip` | `warn`)
   - `:::compare` avec `::bad` / `::good` (chacun un bloc de code) → comparatif
   - `:::cheatsheet` (liste `- title:` / `desc:`) → grille de récap

4. `npm run content` régénère le contenu compilé (lancé automatiquement avant
   `build`/`dev`/`start`). En dev, redémarre `ng serve` après un changement de
   `.md`.

Voir `src/content/angular/medior/signals.md` pour un exemple complet.

## Niveaux

| Niveau | Couleur | Promesse |
| --- | --- | --- |
| Junior | vert sauge `#8FA68E` | On explique comme une première fois |
| Medior | or champagne `#C9A876` | Bases acquises — pièges, perfs, idées reçues |
| Senior | rouge profond `#B86F6F` | Implémentation, architecture, trade-offs |

## SEO & découverte

Générés au build dans `public/` (puis `dist/.../browser/`) :

- `sitemap.xml` — toutes les routes prerendues
- `llms.txt` — carte texte du contenu pour les LLMs crawleurs
- `robots.txt` — allow-all + pointeur sitemap
- `og/{framework}-{level}-{slug}.svg` — une carte OpenGraph par module

Chaque page pose son `<title>`, sa meta description, ses balises OpenGraph /
Twitter, son `<link rel="canonical">` et (modules) un JSON-LD `TechArticle`,
via `SeoService` — le tout présent dans le HTML prerendu.

## Déploiement

1. **Configure le domaine** : remplace `SITE_URL` dans
   `src/app/core/site.ts` par ton origine réelle (utilisé pour canonical, OG,
   sitemap, llms.txt). Ajoute aussi le domaine à `security.allowedHosts` dans
   `angular.json` si la route fallback `**` doit être rendue côté serveur.
2. `npm run build` — produit `dist/frontend-documentation/` (browser + server).
   Les 69 routes du sitemap sont prerendues en HTML statique.
3. Sers `dist/frontend-documentation/server/server.mjs` (Node) ou déploie le
   dossier `browser/` en statique derrière un CDN (les routes sont prerendues).
4. Vérifie : `npm run serve:ssr:frontend-documentation` puis `npm run smoke`.

> **OG images** : générées en SVG. Pour un partage social riche (Twitter/FB),
> rasterise-les en PNG (ex. `sharp`) en étape de déploiement — voir
> `CONTENT_DECISIONS.md`.

## Accessibilité & perf

Fondations en place : landmarks ARIA, skip-link, focus visible doré,
`prefers-reduced-motion`, navigation clavier (palette Cmd+K incluse), contraste
AA. L'audit Lighthouse doit être lancé sur un déploiement réel (pas de Chrome
dans l'environnement de build). Bundle initial ~92 Ko gzip (plancher Angular 21
+ router + hydration) ; Shiki et MiniSearch sont hors bundle initial.
