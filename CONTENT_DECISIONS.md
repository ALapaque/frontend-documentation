# Content & technical decisions

Journal des écarts au plan initial et des décisions non triviales. Une entrée
par décision, datée.

## 2026-05-22 — Phase 1 (Setup)

### Le « guide DI existant » n'existe pas dans le dépôt

Le brief référence un guide *Angular Dependency Injection* à réutiliser comme
base pour `angular/medior/dependency-injection` et comme référence de tonalité.
Le dépôt était **vide** au démarrage (aucun commit). Décision : le design
system (palette, typo, structure de page module) est reconstruit depuis la
description du brief, et le module DI sera **rédigé intégralement** en Phase 4
plutôt que réutilisé. Aucun contenu source n'a été perdu.

### Convention de nommage des fichiers : style guide 2016

Angular 21 propose par défaut le style guide 2025 (`level-chip.ts`). Le brief
liste explicitement des fichiers en `*.component.ts` (`level-chip.component.ts`,
etc.). Décision : `--file-name-style-guide=2016` au scaffold pour coller au
brief et éviter toute ambiguïté de chemins.

### Lazy loading : `loadComponent` par type de page

Le brief demande « lazy loading par framework et par niveau ». Les pages sont
**pilotées par le contenu** : un seul composant `ModulePageComponent` rend
n'importe quel `{framework}/{level}/{slug}`. Le découpage de code se fait donc
par **type de page** (`loadComponent`), et la granularité framework/niveau est
portée par les **chunks de contenu markdown** chargés à la demande (Phase 2).
Les segments statiques (`search`, `about`, `compare/:topic`) sont déclarés
avant le `:framework` dynamique pour ne pas être capturés par lui.

### SSR : `RenderMode.Server` temporaire pour les routes dynamiques

Sans catalogue de contenu, les routes à paramètres ne peuvent pas être
énumérées pour le prerender (`getPrerenderParams`). Phase 1 : les routes
statiques sont prerendues, les routes dynamiques rendent côté serveur à la
demande. Phase 5 basculera tout en `Prerender` une fois le catalogue présent.

### `allowedHosts: ["localhost"]`

La protection SSRF d'Angular 21 (`security.allowedHosts: []`) bloquait le
header `host` et forçait un fallback CSR sur les routes SSR. `localhost` est
ajouté pour permettre le test SSR local. **À compléter** avec le(s) domaine(s)
de production, ou rendu sans objet une fois tout prerendu (Phase 5).

### Polices via Google Fonts (CDN) avec `preconnect`

Fraunces / Inter Tight / JetBrains Mono chargées via `<link>` Google Fonts +
`preconnect` + `display=swap`. Le self-host (`assets/fonts/`) est différé ;
il sera nécessaire si l'environnement SSR interdit le réseau sortant.

### Pas de Tailwind

CSS natif avec variables CSS scopées par composant, conformément au brief.
Tokens dans `src/styles/tokens.css`, importés en tête de `src/styles.css`.

### Budget JS initial

Bundle initial ~80 Ko gzip = socle Angular 21 (core + router + hydration +
zoneless). La cible « < 80 Ko pour la home » sera ajustée en Phase 5
(tree-shaking Shiki côté client, audit des imports).
