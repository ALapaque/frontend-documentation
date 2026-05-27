---
title: "Performance de chargement : chemin critique et resource hints"
slug: "loading-performance"
framework: "web"
level: "senior"
order: 6
duration: 16
prerequisites: ["core-web-vitals"]
updated: 2026-05-23
seoTitle: "Performance de chargement : chemin critique, defer/async, resource hints"
seoDescription: "Maîtrise le chemin critique de rendu, le CSS/JS render-blocking, defer/async/type=module, les resource hints (preload, preconnect, prefetch, modulepreload), fetchpriority, le code splitting, le critical CSS et le budget de performance."
ogVariant: "crimson"
related:
  - { framework: "web", slug: "core-web-vitals" }
---

## Le chemin critique de rendu

Le **Critical Rendering Path** (CRP) est la séquence d'étapes que le navigateur traverse entre la réception du HTML et le premier pixel peint : parser le HTML en **DOM**, parser le CSS en **CSSOM**, fusionner les deux en *render tree*, calculer le **layout** (géométrie), puis le **paint** et le *compositing*. Optimiser le chargement, c'est raccourcir et désengorger ce chemin : moins d'octets bloquants, découverts plus tôt, dans le bon ordre.

La clé conceptuelle : le navigateur a besoin **à la fois** du DOM et du CSSOM pour peindre. Tant qu'une ressource bloque l'un des deux, rien ne s'affiche. C'est pourquoi on parle de ressources *render-blocking*. Le but n'est pas de tout charger vite, mais de débloquer le **premier rendu utile** au plus tôt, puis de laisser le reste arriver sans gêner.

## Render-blocking : CSS et JS

Le **CSS est render-blocking par nature** : le navigateur refuse de peindre tant que le CSSOM n'est pas complet, pour éviter un flash de contenu non stylé. Un `<link rel="stylesheet">` énorme dans le `<head>` retarde donc le premier paint de tout le document. Le **JS classique est à la fois parser-blocking et render-blocking** : quand le parser rencontre un `<script>` sans attribut, il **arrête de construire le DOM**, télécharge et exécute le script (qui peut modifier le DOM via `document.write`), puis reprend.

Pire encore : un `<script>` synchrone est aussi **bloqué par le CSS qui le précède**, car le script pourrait lire des styles calculés (`getComputedStyle`). Un gros CSS suivi d'un script inline gèle ainsi tout le parsing. La parade tient à deux choses : ne charger en bloquant que le CSS *critique*, et ne jamais charger de JS en synchrone dans le `<head>`.

:::compare
::bad
```html
<head>
  <link rel="stylesheet" href="/all.css" />   <!-- 180 ko bloquants -->
  <script src="/app.js"></script>             <!-- parser-blocking -->
  <script src="https://cdn/analytics.js"></script>
</head>
```
::
::good
```html
<head>
  <style>/* critical CSS inline : above-the-fold seulement */</style>
  <link rel="preload" href="/all.css" as="style"
        onload="this.rel='stylesheet'" />        <!-- reste async -->
  <script src="/app.js" type="module"></script>  <!-- différé par défaut -->
  <script src="https://cdn/analytics.js" async></script>
</head>
```
::
:::

**Pourquoi.** Dans la version *bad*, le navigateur ne peut rien peindre tant que les 180 ko de CSS ne sont pas téléchargés et parsés, et le `<script src="/app.js">` synchrone **suspend la construction du DOM** jusqu'à son téléchargement + exécution — pendant ce temps la page est blanche. Dans la version *good*, le **critical CSS** inline (juste le strictement visible) permet un premier paint immédiat sans aller-retour réseau ; le reste du CSS est chargé en `preload`/`onload` donc non bloquant. Les scripts `type="module"` sont **différés par défaut** (exécutés après le parsing, dans l'ordre), et l'analytics tiers en `async` s'exécute dès qu'il arrive sans bloquer le parser. Résultat : le DOM se construit sans interruption, le premier paint n'attend plus le JS ni le CSS non critique.

## defer, async et type=module

Ces attributs changent **quand** le script s'exécute par rapport au parsing du HTML. Les confondre coûte des secondes de blocage ou des bugs d'ordre d'exécution.

- **(rien)** : téléchargement et exécution synchrones, le parser **s'arrête**. À bannir dans le `<head>`.
- **`async`** : téléchargé en parallèle du parsing, exécuté **dès qu'il est prêt**, dans un ordre **non garanti**. Pour du code indépendant et sans dépendances (analytics, tags).
- **`defer`** : téléchargé en parallèle, exécuté **après** la fin du parsing, **dans l'ordre du document**. Idéal pour le code applicatif qui a des dépendances.
- **`type="module"`** : implique `defer` automatiquement (téléchargement parallèle, exécution après parsing) ; prend en charge `import`. En 2026 c'est le défaut moderne — les baselines de navigateurs prennent en charge les modules ES nativement, plus besoin de transpiler vers des bundles legacy pour la majorité du trafic.

:::callout{type="info"}
`async` et `defer` n'ont d'effet que sur les scripts **externes** (avec `src`). Sur un `<script>` inline, ils sont ignorés et le script s'exécute immédiatement, en bloquant. Et `async` sur du code à dépendances (ex. un plugin qui suppose que la lib est déjà chargée) provoque des erreurs intermittentes selon l'ordre d'arrivée réseau : choisis `defer` dès qu'un ordre compte.
:::

## Resource hints et fetchpriority

Les **resource hints** disent au navigateur d'amorcer un travail réseau plus tôt que sa découverte naturelle ne le permettrait. Chacun a un rôle précis ; les utiliser au mauvais endroit gaspille de la bande passante et entre en concurrence avec les ressources vraiment critiques.

- **`preconnect`** : ouvre tôt la connexion (DNS + TCP + TLS) vers une **origine tierce** que tu sais utiliser bientôt (CDN d'images, API). Économise un aller-retour, mais coûte une connexion — réserve-le à 2-3 origines critiques.
- **`preload`** : télécharge **immédiatement** une ressource découverte tard (police, image LCP, CSS importé en `@import`), avec son `as` correct. C'est le levier direct sur le LCP.
- **`modulepreload`** : équivalent de `preload` pour les modules ES — précharge **et parse** le module et, en cascade, ses imports, ce que `preload as="script"` ne fait pas correctement.
- **`prefetch`** : télécharge en **basse priorité** une ressource pour une navigation **future** probable (page suivante). À ne pas confondre avec `preload` (page courante, haute priorité).

```html
<link rel="preconnect" href="https://cdn.exemple.com" crossorigin />
<link rel="preload" href="/fonts/inter.woff2" as="font"
      type="font/woff2" crossorigin />
<link rel="modulepreload" href="/chunks/home.js" />
<link rel="prefetch" href="/page-suivante" as="document" />
<img src="/hero.webp" fetchpriority="high" width="1200" height="600" alt="" />
```

L'attribut **`fetchpriority`** ajuste la priorité que le navigateur assigne par défaut : `high` pour pousser l'image LCP devant les images décoratives, `low` pour rétrograder un carrousel hors écran. Il complète les hints — `preload` dit *quoi* charger tôt, `fetchpriority` dit *à quel point* c'est urgent dans la file.

## Code splitting et critical CSS

Le **code splitting** découpe ton bundle en *chunks* chargés à la demande, au lieu d'un mégafichier que l'utilisateur paie entièrement avant la première interaction. La granularité utile : un chunk pour le code de la route initiale, le reste en `import()` dynamique déclenché par la navigation ou l'interaction. Moins de JS sur le chemin critique = moins de parsing/exécution = meilleur INP et LCP.

```js
// chargé seulement quand l'utilisateur ouvre la modale
button.addEventListener('click', async () => {
  const { openEditor } = await import('./editor.js'); // chunk séparé
  openEditor();
});
```

Le **critical CSS** est la contrepartie côté style : extraire le CSS strictement nécessaire au rendu *above-the-fold*, l'inliner dans le `<head>`, et charger le reste de façon non bloquante. Tu élimines l'aller-retour réseau du CSS principal sur le premier paint. L'extraction se fait à la build (outils comme Critters/`beasties`, ou les pipelines de frameworks) en analysant le HTML rendu — ne la fais pas à la main, elle se périme à chaque changement de markup.

## Le budget de performance

Un **budget de performance** est un plafond chiffré, vérifié en CI, qui empêche la dérive : taille du JS transféré (ex. ≤ 170 ko gzip sur la route critique), nombre de requêtes, ou directement des seuils de métriques (LCP ≤ 2,5 s, INP ≤ 200 ms). Sans budget, chaque PR ajoute « juste une petite lib » et la page se dégrade lentement, invisiblement. Le budget rend le coût **visible et bloquant** : dépasser le plafond casse le build.

Tout ceci se relie aux **Core Web Vitals** : le critical CSS et le `preload` de l'image hero attaquent le **LCP** ; réduire et différer le JS (code splitting, `defer`/`async`) réduit les long tasks qui plombent l'**INP** ; et réserver l'espace des médias chargés tardivement protège le **CLS**. La performance de chargement n'est pas une fin en soi — c'est le moyen d'atteindre des CWV verts sur le terrain.

:::callout{type="tip"}
Mesure le poids transféré **par type et par route** dans ta CI (Lighthouse CI, bundle analyzer avec assertion de taille), pas seulement le total. Un budget global cache une route lourde derrière des routes légères. Et budgète le **JS** en priorité : un kilo-octet de JS coûte bien plus qu'un kilo-octet d'image, car il faut le télécharger *puis* le parser et l'exécuter sur le main thread.
:::

:::cheatsheet
- title: "DOM + CSSOM avant paint"
  desc: "Le rendu attend les deux ; débloque le premier paint utile d'abord."
- title: "CSS render-blocking"
  desc: "Inline le critical CSS, charge le reste en preload/onload non bloquant."
- title: "JS jamais synchrone en head"
  desc: "Un <script> sans attribut suspend la construction du DOM."
- title: "defer vs async"
  desc: "defer = après parsing, dans l'ordre ; async = dès prêt, ordre non garanti."
- title: "type=module"
  desc: "Différé par défaut, prend en charge import ; défaut moderne en 2026."
- title: "preconnect / preload"
  desc: "preconnect = origine tierce tôt ; preload = ressource tardive critique."
- title: "modulepreload / prefetch"
  desc: "modulepreload parse les modules ; prefetch = navigation future, basse prio."
- title: "fetchpriority"
  desc: "high pour l'image LCP, low pour le décoratif hors écran."
- title: "Code splitting"
  desc: "import() dynamique : moins de JS critique, meilleur LCP/INP."
- title: "Budget de perf"
  desc: "Plafond chiffré bloquant en CI ; budgète le JS en priorité."
:::
