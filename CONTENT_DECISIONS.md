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

## 2026-05-22 — Phase 2 (Pipeline contenu)

### Compilation du markdown au build, pas au runtime

`scripts/build-content.ts` (lancé par les hooks `pre*` npm) lit chaque
`.md`, parse le front-matter (gray-matter) et le corps en **blocs typés**,
puis émet du JSON. Avantages : SSR-safe par construction, compatible
prerender, et **aucune lib markdown/Shiki dans le bundle client**. Le runtime
ne fait que charger du JSON déjà compilé.

### Parser de blocs maison plutôt que markdown-it-container

La syntaxe custom (`::bad`/`::good` imbriqués dans `:::compare`, liste
YAML-ish dans `:::cheatsheet`) se prête mal aux plugins markdown-it-container.
Un scanner ligne à ligne reconnaît 4 constructions de premier niveau :
titres (`##`/`###`), fences ` ``` `, conteneurs `:::`, et prose. La prose est
rendue par markdown-it (`html: true`, contenu de confiance) ; le reste devient
des composants Angular. Les titres sont **extraits en blocs** pour alimenter le
TOC et servir d'ancres ; le `§` doré est injecté en CSS.

### Shiki au build + `SafeHtmlPipe`

Thème `vesper` (dark, chaud, cohérent avec l'or). La coloration se fait au
build. Le HTML Shiki porte ses couleurs en **styles inline**, que le sanitizer
Angular supprime sur `[innerHTML]`. D'où `core/safe-html.pipe.ts`
(`bypassSecurityTrustHtml`) — réservé au contenu de confiance généré au build,
jamais à de l'HTML utilisateur.

### Lazy par module via map de loaders générée

`generated/loaders.ts` mappe `${fw}-${lvl}-${slug}` → `() => import(JSON)`.
esbuild code-split donc **un chunk par module** (vérifié :
`angular-medior-signals-json` etc.). Le `ContentService` charge à la demande,
le resolver de route hydrate la page côté serveur. Le catalogue
(`generated/catalogue.ts`, front-matter seul) est en revanche bundlé
eagerement car les hubs/landing/recherche en ont besoin.

### Fichiers générés gitignorés

`src/content/generated/` est produit par `npm run content` (hooks
`prebuild`/`predev`/`prestart`). **Limite connue** : `ng serve` ne surveille
pas les `.md` ; modifier du contenu en cours de dev nécessite un redémarrage
(ou `npm run content` à la main). Un watcher chokidar pourra être ajouté.

### Blocs livrés vs prévus

Implémentés : `prose`, `heading`, `code`, `callout` (info/tip/warn),
`compare`, `cheatsheet`. Reportés (Phase 3, au besoin du contenu) :
`metaphor` (encadré SVG) et `recap-table` dédiée — les tableaux passent pour
l'instant par la prose markdown standard.

## 2026-05-22 — Phase 3 (Pages)

### Catalogue complet scaffolé en stubs

`scripts/catalog.ts` liste les 60 modules du brief (§5) ; `scaffold-stubs.ts`
(`npm run scaffold:stubs`) écrit un `.md` stub (front-matter + « À venir »)
pour chaque entrée **manquante** — jamais d'écrasement. Les hubs, la landing
et la recherche sont ainsi pilotés par de vraies données. Le scaffolder n'est
**pas** dans les hooks `pre*` (outil ponctuel, lancé à la main). 2 modules
rédigés (signals, lifecycle), le reste en stub à compléter en Phase 4.

### Recherche : docs générés au build + MiniSearch client lazy

Le build émet `generated/search.ts` (titre + desc + texte aplati par module).
Côté client, MiniSearch **et** ces documents sont chargés par import dynamique
au premier usage (browser only), donc absents du bundle initial. L'index est
assemblé en mémoire (instantané pour 60 docs) et exposé via un signal de
disponibilité pour que `search()` redevienne réactif une fois prêt. La palette
Cmd+K vit dans le shell ; l'écouteur clavier global est browser-only.

### Pages comparatives : pipeline étendu

Le compilateur traite aussi `src/content/compare/*.md` → `CompiledCompare`
(`generated/compare/*.json` + loaders + liste). Nouveau bloc `:::tri` avec
marqueurs `::angular` / `::react` / `::vue` → composant `tri-code` (3 colonnes,
coloration Shiki). Tables comparatives = tableaux markdown standard. 3 docs
rédigés (state-management, reactivity, ssr-hydration).

### Filtre niveau : clé localStorage globale

Persistance via une seule clé `pd:level-filter` (préférence globale, pas par
framework) — un dev a tendance à rester sur un niveau quel que soit le
framework. À reconsidérer si le besoin per-framework émerge.

### « Les 5 réflexes » du pied de module : reporté

Cette section dépend du contenu rédigé ; elle sera écrite comme section
markdown dédiée en Phase 4 plutôt que codée en dur.

### Test navigateur non effectué

L'environnement d'exécution n'a pas de navigateur : Cmd+K, scroll-spy du TOC et
persistance du filtre sont implémentés et SSR-safe (gardes `isPlatformBrowser`
/ `afterNextRender`), mais n'ont pas été validés visuellement. À vérifier en
Phase 5 (audit Lighthouse + test manuel).
