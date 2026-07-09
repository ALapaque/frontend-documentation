---
title: "Speculation Rules : prérendre la page suivante"
slug: "speculation-rules"
framework: "web"
level: "senior"
order: 8
duration: 15
prerequisites: ["loading-performance"]
updated: 2026-07-09
seoTitle: "Speculation Rules API — prefetch et prerender déclaratifs pour une navigation instantanée"
seoDescription: "Rendre la navigation quasi instantanée avec les Speculation Rules : prefetch vs prerender, les document rules avec href_matches, le réglage d'eagerness pour maîtriser le coût, et les pièges (analytics, ressources gaspillées)."
ogVariant: "crimson"
related:
  - { framework: "web", slug: "loading-performance" }
  - { framework: "web", slug: "core-web-vitals" }
---

Le chargement le plus rapide, c'est celui déjà terminé avant même le clic. Les **Speculation Rules** disent au navigateur, de façon **déclarative**, quelles pages précharger ou pré-**rendre** pendant que l'utilisateur lit la page courante. Résultat : au clic, la navigation vers la page suivante paraît instantanée, sans écran blanc ni spinner. Tu ne changes pas ton code applicatif — tu ajoutes un bloc JSON qui décrit tes paris sur la prochaine navigation.

## Prefetch vs prerender

Deux niveaux d'anticipation, avec un coût et un gain très différents.

Le **prefetch** récupère le **document** HTML de la page cible à l'avance et le garde en cache mémoire. Il ne télécharge **pas** les sous-ressources (CSS, JS, images) et n'exécute rien. Au clic, le navigateur a déjà le HTML sous la main : il économise l'aller-retour réseau du document, mais doit encore parser, charger les sous-ressources et peindre. Gain modéré, coût faible.

Le **prerender** va beaucoup plus loin : il **rend la page entière** dans un onglet caché, sous-ressources incluses, **JavaScript exécuté**, layout calculé. Au clic, le navigateur ne fait qu'**activer** cet onglet déjà peint — la transition est quasi immédiate, souvent sous les 100 ms perçus. Gain maximal, mais coût maximal : tu paies une page complète (CPU, mémoire, réseau, requêtes serveur) pour une navigation qui n'aura peut-être jamais lieu.

:::callout{type="info"}
Le prefetch et le prerender via Speculation Rules gèrent aussi le **cross-origin** sous conditions (en-têtes d'opt-in côté cible pour le prerender), là où l'ancien `<link rel="prefetch">` était limité et peu fiable. Pour une page **same-origin** que tu contrôles, le prerender est le levier le plus puissant du catalogue perf.
:::

## La syntaxe : `<script type="speculationrules">`

Tu déclares tes règles dans un `<script>` au type spécial, contenant un JSON. Le navigateur qui ne connaît pas ce type l'ignore simplement — dégradation silencieuse, aucun risque pour les autres.

La forme la plus simple, une **liste d'URL** explicites (`source: "list"`) :

```html
<script type="speculationrules">
{
  "prerender": [
    { "source": "list", "urls": ["/produits", "/panier"] }
  ]
}
</script>
```

Les clés de premier niveau sont `prefetch` et `prerender`. Chacune prend un tableau de règles. Une règle en `list` énumère des `urls` que tu as identifiées comme probables (le lien « suivant » d'un tunnel, l'article en tête de liste). C'est précis mais figé : dès que le contenu est dynamique, maintenir cette liste à la main devient un piège.

## Document rules : cibler les liens dynamiquement

Les **document rules** résolvent ce problème : au lieu d'énumérer des URL, tu décris une **condition** que le navigateur applique à tous les liens `<a>` de la page. La présence de la clé `where` implique `source: "document"`.

Trois briques dans `where` :

- **`href_matches`** : motif d'URL (`"/*"` cible tous les liens same-origin, `"/articles/*"` une section).
- **`selector_matches`** : sélecteur CSS, pour cibler ou exclure des liens selon leur markup (ex. `.no-prerender`).
- **`and`** / **`not`** / **`or`** : combinateurs booléens pour composer des conditions.

L'exemple canonique : pré-rendre **tous les liens internes sauf** ceux qui déclenchent un effet ou cassent une session.

```html
<script type="speculationrules">
{
  "prerender": [
    {
      "where": {
        "and": [
          { "href_matches": "/*" },
          { "not": { "href_matches": "/logout" } },
          { "not": { "href_matches": "/api/*" } },
          { "not": { "selector_matches": ".no-prerender" } }
        ]
      },
      "eagerness": "moderate"
    }
  ]
}
</script>
```

**Pourquoi exclure `/logout` et `/api/*` ?** Parce que le prerender **émet une vraie requête GET** vers la cible. Pré-rendre `/logout`, c'est déconnecter l'utilisateur sans qu'il ait cliqué. Pré-rendre un endpoint d'API à effet de bord, c'est déclencher cet effet à l'aveugle. La règle d'or : ne spécule que sur des GET **idempotents** et sûrs.

## `eagerness` : le curseur agressivité / gaspillage

La clé `eagerness` décide **quand** le navigateur déclenche la spéculation. C'est le réglage central : trop agressif, tu gaspilles réseau, CPU et requêtes serveur pour des pages jamais visitées ; trop prudent, tu perds l'effet « instantané ». Quatre niveaux :

- **`immediate`** : spécule dès que la règle est lue, sans attendre aucun signal. Gain maximal, gaspillage maximal. À réserver à une cible dont tu es quasi certain (l'étape suivante d'un checkout). C'est le défaut des règles en `list`.
- **`eager`** : dès un signal très précoce — au survol de ~10 ms sur desktop, ou peu après l'entrée du lien dans le viewport sur mobile. Agressif mais un peu filtré par l'intention.
- **`moderate`** : au survol prolongé (~200 ms) ou au `pointerdown`. Le bon compromis par défaut : un survol de 200 ms trahit une intention réelle, sans spéculer sur chaque lien effleuré. C'est le réglage recommandé pour la plupart des document rules.
- **`conservative`** : uniquement au `pointerdown` / touch, juste avant le `click`. Fenêtre courte, donc gain plus faible, mais quasi zéro gaspillage — le navigateur ne spécule que quand le clic est presque acquis.

:::callout{type="tip"}
Précise **toujours** `eagerness` explicitement sur tes document rules, sans te reposer sur le défaut. Commence en `moderate`, puis mesure : monte en `eager`/`immediate` seulement sur les parcours à forte conversion où tu acceptes le surcoût, et redescends en `conservative` sur les zones à liens nombreux (listes, navigation) pour ne pas noyer le serveur.
:::

## Les pièges du prerender

Le prerender exécute ton JavaScript **avant** que l'utilisateur ne voie la page — parfois plusieurs secondes avant, parfois jamais si le clic n'arrive pas. Tout code à effet observable s'en trouve faussé.

:::callout{type="warn"}
Un prerender **exécute analytics, pixels publicitaires, compteurs de vues et A/B tests au moment du pré-rendu**, pas au moment de la visite. Sans précaution, tu gonfles tes pages vues, tu déclenches des impressions de pub jamais affichées, et tu fausses tes tests. C'est le piège numéro un de la fonctionnalité.
:::

La parade tient dans deux primitives. La propriété **`document.prerendering`** vaut `true` tant que la page est en cours de pré-rendu ; l'événement **`prerenderingchange`** se déclenche sur `document` au moment de l'**activation** (le vrai affichage). Tu diffères les effets sensibles jusque-là.

:::compare
::bad
```js
// S'exécute pendant le prerender → vue comptée à tort
analytics.pageview(location.pathname);
```
::
::good
```js
function trackPageview() {
  analytics.pageview(location.pathname);
}

if (document.prerendering) {
  // On attend l'activation réelle
  document.addEventListener('prerenderingchange', trackPageview, { once: true });
} else {
  trackPageview();
}
```
::
:::

**Pourquoi.** Dans la version *good*, si la page est encore un prerender caché, on ne compte rien : on s'abonne à `prerenderingchange`, qui ne se déclenchera **que si** l'utilisateur active vraiment la page. Si le prerender est abandonné, aucun événement n'est envoyé — la mesure reste juste. Applique le même différé à toute écriture non idempotente : mutations serveur, consommation de tokens, ouverture de connexions temps réel.

## bfcache et mesure

Le prerender ne remplace pas le **bfcache** (Back/Forward Cache) — il le complète. Le bfcache accélère les navigations **arrière/avant** en gardant en mémoire une page déjà visitée ; le prerender accélère la navigation **avant** vers une page pas encore visitée. Les deux visent le même ressenti d'instantanéité par des chemins différents, et un site bien réglé profite des deux.

Côté métriques, une page activée depuis un prerender démarre son horloge à l'**activation**, pas au pré-rendu. Le repère est **`activationStart`** dans `PerformanceNavigationTiming` : soustrais-le pour rapporter des Core Web Vitals cohérents (voir `/web/senior/core-web-vitals`). Un **LCP** mesuré depuis le début du pré-rendu serait absurde — la page était déjà peinte quand l'utilisateur l'a vue. Les bibliothèques CWV récentes gèrent ce décalage, mais vérifie que ta télémétrie maison ne rapporte pas des LCP quasi nuls (signe qu'elle mesure depuis l'activation, ce qui est le comportement voulu) ni gonflés (signe qu'elle ignore `activationStart`).

Surtout : **mesure que le prerender sert vraiment**. Segmente ta télémétrie selon que la navigation a été activée depuis un prerender ou non, et regarde le **taux de hit** (part des prerenders effectivement visités). Un taux faible veut dire que tu spécules trop large : ressources brûlées pour rien. C'est ce taux qui pilote ton réglage d'`eagerness`, pas l'intuition.

## Coût serveur et effets de bord

Un prefetch ou un prerender génère des **requêtes HTTP réelles** vers ton serveur — le navigateur ne les invente pas. Deux conséquences à ne jamais perdre de vue.

D'abord, la **charge**. Une page qui pré-rend agressivement tous ses liens en `immediate` peut multiplier ton trafic origine par le nombre de liens visibles. Sur une page-liste de 40 éléments, c'est 40 rendus complets (document + sous-ressources) pour un seul clic réel. Garde `eagerness` bas sur ces zones, et surveille l'impact sur ton origine et tes quotas de CDN/API.

Ensuite, les **effets de bord**. Un GET est censé être sans effet, mais beaucoup de backends trichent : un `?action=view` qui incrémente un compteur, un lien de désinscription en GET, un endpoint qui consomme un jeton à usage unique. La spéculation les déclenche **hors de tout clic**. Exclus ces routes via `not: { href_matches: ... }`, et à plus long terme, corrige la vraie faute : un GET ne doit jamais muter d'état.

:::callout{type="info"}
Tu peux distinguer une requête spéculative côté serveur : les navigateurs Chromium envoient l'en-tête **`Sec-Purpose: prefetch`** (avec `; prerender` pour un prerender). Utilise-le pour logger séparément, désactiver certaines écritures, ou refuser de servir des routes sensibles à la spéculation.
:::

En 2026, le support est **Chromium** (Chrome et Edge 109+, et dérivés) ; Firefox ne l'a pas encore livré et Safari le garde derrière un flag expérimental. C'est donc une **amélioration progressive** : les navigateurs compatibles gagnent une navigation instantanée, les autres se comportent normalement. Aucune raison de s'en priver, à condition de neutraliser les pièges analytics et les GET non idempotents avant de l'activer en production.

## À retenir

Les Speculation Rules déplacent le travail de navigation **avant** le clic, déclarativement. `prefetch` récupère le document ; `prerender` peint la page entière pour une activation instantanée — puissant mais coûteux. Les document rules avec `href_matches`/`selector_matches`/`and`/`not` ciblent les liens dynamiquement, et `eagerness` arbitre entre gain et gaspillage. Le prix d'entrée : différer les effets de bord (analytics via `document.prerendering`/`prerenderingchange`) et ne jamais spéculer sur un GET non idempotent.

:::cheatsheet
- title: "prefetch vs prerender"
  desc: "prefetch = document seul ; prerender = page entière rendue, JS exécuté, activation instantanée."
- title: "script type=speculationrules"
  desc: "Un bloc JSON, ignoré si non pris en charge. Clés prefetch et prerender."
- title: "Document rules"
  desc: "where + href_matches / selector_matches / and / not / or pour cibler les liens."
- title: "Exclure les routes risquées"
  desc: "not href_matches sur /logout, /api/*, GET à effet de bord ou jeton unique."
- title: "eagerness"
  desc: "immediate > eager > moderate > conservative. moderate par défaut, mesure puis ajuste."
- title: "Piège analytics"
  desc: "Le JS s'exécute avant la visite. Différer via document.prerendering + prerenderingchange."
- title: "bfcache"
  desc: "Complémentaire : bfcache = retour arrière, prerender = navigation avant."
- title: "Mesure"
  desc: "Soustraire activationStart pour des CWV justes ; suivre le taux de hit du prerender."
- title: "Coût serveur"
  desc: "Vraies requêtes GET. Header Sec-Purpose pour les distinguer ; attention aux quotas."
- title: "Support 2026"
  desc: "Chromium (Chrome/Edge 109+). Firefox/Safari : non livré. Amélioration progressive."
:::
