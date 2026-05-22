# Practical Docs

Documentation pédagogique multi-framework — **Angular**, **React**, **Vue** —
en trois niveaux (Junior → Medior → Senior). Esthétique dark luxury, Angular 21
avec SSR + hydration et change detection zoneless.

> Statut : **Phase 1 (Setup)** terminée — bootstrap, design system, composants
> UI fondamentaux, routing lazy. Voir `CONTENT_DECISIONS.md` pour le journal des
> décisions et le plan d'avancement.

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
| `npm run build` | Build de production (SSR + prerender) dans `dist/` |
| `npm run serve:ssr:frontend-documentation` | Lance le serveur SSR depuis `dist/` |
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

## Ajouter un module (à partir de la Phase 2)

> Le pipeline de contenu markdown est livré en Phase 2. La procédure définitive
> (front-matter, blocs custom `:::callout` / `:::compare`, index de recherche)
> sera documentée ici à ce moment-là.

## Niveaux

| Niveau | Couleur | Promesse |
| --- | --- | --- |
| Junior | vert sauge `#8FA68E` | On explique comme une première fois |
| Medior | or champagne `#C9A876` | Bases acquises — pièges, perfs, idées reçues |
| Senior | rouge profond `#B86F6F` | Implémentation, architecture, trade-offs |

## Déploiement

Build statique + serveur SSR Node (`dist/frontend-documentation/server`). Le
détail (prerender complet, sitemap, OG images) est couvert en Phase 5.
