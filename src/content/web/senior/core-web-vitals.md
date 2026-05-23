---
title: "Core Web Vitals : LCP, INP, CLS"
slug: "core-web-vitals"
framework: "web"
level: "senior"
order: 1
duration: 15
prerequisites: ["html-semantics"]
updated: 2026-05-23
seoTitle: "Core Web Vitals : LCP, INP et CLS expliqués"
seoDescription: "Comprends ce que mesurent LCP, INP et CLS, leurs seuils, les causes concrètes des mauvaises notes et comment les corriger avec preload, moins de JS et des dimensions explicites."
ogVariant: "crimson"
related:
  - { framework: "web", slug: "html-semantics" }
---

## Pourquoi les Core Web Vitals

Les Core Web Vitals (CWV) sont les trois métriques que Google considère comme représentatives de l'expérience réelle d'un utilisateur : la vitesse de rendu du contenu principal (**LCP**), la réactivité aux interactions (**INP**), et la stabilité visuelle (**CLS**). Elles entrent dans le ranking et, surtout, elles corrèlent avec le taux de conversion. Le point clé : elles se mesurent **sur le terrain** (données de vrais utilisateurs, le « field »), pas seulement en laboratoire. Une note de lab parfaite sur ta machine fibre ne dit rien d'un mobile Android d'entrée de gamme sur réseau 4G.

Chaque métrique a trois paliers, calculés au **75e percentile** de tes utilisateurs : un palier *good*, un *needs-improvement*, et un *poor*. Viser la médiane ne suffit pas — c'est le p75 qui compte.

:::callout{type="info"}
Depuis mars 2024, **INP a définitivement remplacé FID** comme métrique de réactivité. FID ne mesurait que le délai de la *première* interaction ; INP observe **toutes** les interactions de la vie de la page et retient (quasi) la pire. Beaucoup de pages « vertes » sur FID sont devenues « orange » sur INP.
:::

## LCP — Largest Contentful Paint

Le LCP marque l'instant où le **plus grand élément de contenu visible** dans le viewport finit de se peindre : généralement une image hero, une vidéo poster, ou un gros bloc de texte. C'est le proxy de « la page semble chargée ».

**Seuils** : *good* ≤ 2,5 s · *needs-improvement* ≤ 4,0 s · *poor* > 4,0 s.

Le LCP se décompose en quatre sous-temps : TTFB, délai de chargement de la ressource, durée de chargement, et délai de rendu. Un LCP lent vient presque toujours de l'un de ces points : serveur lent (TTFB), ressource LCP découverte trop tard, ou rendu bloqué par du CSS/JS.

La cause la plus fréquente : l'image LCP n'est découverte qu'après le parsing du CSS ou l'exécution d'un JS (lazy-loader, carrousel). Le navigateur ne peut pas la précharger via son *preload scanner*.

:::compare
::bad
```html
<!-- L'image hero est injectée par JS / chargée en lazy -->
<div class="hero" data-bg="/hero-2400.webp"></div>
<img src="/hero.webp" loading="lazy" />
```
::
::good
```html
<link rel="preload" as="image" href="/hero-1200.webp"
      imagesrcset="/hero-800.webp 800w, /hero-1200.webp 1200w" />
<img src="/hero-1200.webp" fetchpriority="high"
     width="1200" height="600" alt="..." />
```
::
:::

**Pourquoi.** Le *preload scanner* du navigateur parcourt le HTML brut avant même de construire le DOM pour amorcer les téléchargements au plus tôt. Une image posée en `background-image` via CSS ou injectée en JS lui est invisible : elle n'est demandée qu'après le téléchargement et l'évaluation de la ressource qui la référence, ce qui ajoute un aller-retour réseau au chemin critique. `loading="lazy"` sur l'élément LCP est encore pire : tu retardes volontairement la ressource qui définit ta métrique. À l'inverse, `<link rel="preload">` + `fetchpriority="high"` placent la ressource en tête de file dès la première passe.

## INP — Interaction to Next Paint

L'INP mesure la latence entre une interaction utilisateur (clic, tap, touche) et le **prochain rendu visuel** qui la reflète. Il agrège toutes les interactions et retient (au-delà de ~50 interactions) un percentile haut — pas la moyenne. C'est la métrique de la « page qui répond ».

**Seuils** : *good* ≤ 200 ms · *needs-improvement* ≤ 500 ms · *poor* > 500 ms.

Une interaction se découpe en trois phases : *input delay* (le main thread est occupé quand tu cliques), *processing time* (tes handlers s'exécutent), et *presentation delay* (le navigateur recalcule style/layout/paint). Une mauvaise note vient quasi toujours du main thread bloqué : long task de tiers, hydratation massive, gros handler synchrone, ou re-render React qui touche tout l'arbre.

:::compare
::bad
```js
button.addEventListener('click', () => {
  // tout en synchrone : bloque le rendu de la réponse
  const result = computeHeavyStuff(data); // long task
  sendAnalytics(result);
  renderEverything(result);
});
```
::
::good
```js
button.addEventListener('click', () => {
  showPendingState();              // feedback peint immédiatement
  requestAnimationFrame(() => {    // laisse le navigateur peindre d'abord
    sendAnalytics(data);           // non urgent
  });
  // découpe le gros calcul pour rendre la main au thread
  scheduler.postTask(() => computeHeavyStuff(data), { priority: 'background' });
});
```
::
:::

**Pourquoi.** Le main thread est mono-tâche : tant qu'une fonction tourne, le navigateur ne peut ni traiter d'autres événements ni peindre. Un handler de 300 ms ajoute mécaniquement 300 ms de *presentation delay*, et bloque aussi l'*input delay* des interactions suivantes. En affichant d'abord un état visible puis en déléguant le calcul (`scheduler.postTask`, `requestIdleCallback`, ou un découpage avec `yield`), tu rends la main au navigateur entre les morceaux : il peut peindre la réponse perçue avant de finir le travail lourd. Réduire le JS tiers et différer l'analytics attaque la cause racine — les long tasks.

## CLS — Cumulative Layout Shift

Le CLS quantifie l'instabilité visuelle : la somme des décalages de mise en page non provoqués par l'utilisateur, pondérée par la fraction du viewport impactée et la distance de déplacement. C'est la métrique du « contenu qui saute pendant que je lis ».

**Seuils** : *good* ≤ 0,1 · *needs-improvement* ≤ 0,25 · *poor* > 0,25.

Causes classiques : images sans dimensions, iframes/embeds/pubs sans place réservée, polices web déclenchant un FOIT/FOUT avec métriques différentes, et contenu injecté en haut du flux (bannières, A/B tests) après le premier rendu.

:::compare
::bad
```html
<img src="/promo.jpg" alt="Promo" />
<div class="ad-slot"><!-- pub injectée plus tard --></div>
```
::
::good
```html
<img src="/promo.jpg" alt="Promo" width="800" height="450" />
<div class="ad-slot" style="aspect-ratio: 16 / 9; min-height: 250px;"></div>
```
::
:::

**Pourquoi.** Sans `width`/`height` (ou `aspect-ratio`), le navigateur ne connaît pas le ratio de l'image avant de l'avoir téléchargée : il réserve une hauteur de 0, peint le contenu en dessous, puis le pousse violemment quand l'image arrive — c'est un layout shift. En fournissant les dimensions, le moteur calcule la boîte dès la première passe de layout et réserve l'espace exact. Idem pour un slot de pub : réserver l'espace via `aspect-ratio`/`min-height` empêche le contenu déjà lu de sauter à l'insertion. Pour les polices, `font-display: optional` ou `size-adjust` limitent le reflow dû au swap de fonte.

## Mesurer : lab vs field

Le **lab** (Lighthouse, WebPageTest, DevTools) te donne un environnement reproductible pour déboguer — idéal en CI. Mais il simule un seul appareil/réseau. Le **field / RUM** (Real User Monitoring) capture la distribution réelle de tes utilisateurs : c'est ce que Google utilise via le CrUX. À noter : **INP et CLS ne sont mesurables qu'en field**, car ils dépendent du comportement (interactions, scroll) sur toute la session.

Côté code, la lib officielle **`web-vitals`** s'appuie sur `PerformanceObserver` et expose des callbacks corrects (gère le bfcache, les onglets en arrière-plan, le bon timing) :

```js
import { onLCP, onINP, onCLS } from 'web-vitals';

function sendToAnalytics({ name, value, rating, id }) {
  navigator.sendBeacon('/rum',
    JSON.stringify({ name, value, rating, id }));
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
```

`sendBeacon` (ou `fetch` avec `keepalive`) garantit l'envoi même pendant l'unload de la page. Observe `rating` (`good`/`needs-improvement`/`poor`) et agrège **au p75** côté backend, jamais en moyenne.

:::callout{type="tip"}
Attribue tes mauvaises mesures : la lib `web-vitals/attribution` te dit *quel* élément est le LCP, *quel* sélecteur a causé le pire shift, ou *quel* handler a allongé l'INP. C'est la différence entre « mon INP est mauvais » et « le handler du bouton panier prend 280 ms ».
:::

:::cheatsheet
- title: "LCP ≤ 2,5 s"
  desc: "Preload + fetchpriority=high sur l'image LCP, jamais loading=lazy dessus."
- title: "INP ≤ 200 ms"
  desc: "Découpe les long tasks, diffère l'analytics, peins un feedback d'abord."
- title: "CLS ≤ 0,1"
  desc: "width/height ou aspect-ratio sur médias, réserve l'espace des inserts."
- title: "p75, pas moyenne"
  desc: "Les seuils s'évaluent au 75e percentile des vrais utilisateurs."
- title: "Field obligatoire"
  desc: "INP et CLS ne se mesurent qu'avec du RUM, le lab ne suffit pas."
- title: "web-vitals"
  desc: "onLCP/onINP/onCLS + sendBeacon ; attribution pour pointer la cause."
:::
