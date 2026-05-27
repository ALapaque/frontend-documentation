---
title: "Streaming SSR"
slug: "streaming-ssr"
framework: "react"
level: "senior"
order: 4
duration: 19
prerequisites: ["suspense-basics", "concurrent-features"]
updated: 2026-05-22
seoTitle: "Streaming SSR — react"
seoDescription: "renderToPipeableStream, frontières Suspense qui streament leur HTML par morceaux, et hydratation sélective pilotée par l'interaction utilisateur."
ogVariant: "crimson"
related:
  - framework: "vue"
    slug: "nuxt-ssr"
  - framework: "angular"
    slug: "ssr-hydration"
---

Le SSR classique (`renderToString`) est synchrone et bloquant : il attend que tout l'arbre soit prêt avant d'émettre le premier octet, puis hydrate tout d'un bloc. Le streaming SSR casse ces deux contraintes en s'appuyant sur Suspense : émettre l'HTML par morceaux dès qu'il est prêt, et hydrater les morceaux dans l'ordre où l'utilisateur en a besoin.

## renderToPipeableStream

L'API serveur Node remplace `renderToString` par un flux. React envoie immédiatement le shell (tout ce qui est hors frontières Suspense), puis pousse chaque frontière résolue au fil de l'eau.

```tsx
import { renderToPipeableStream } from "react-dom/server";

app.get("/", (req, res) => {
  const { pipe } = renderToPipeableStream(<App />, {
    bootstrapScripts: ["/main.js"],
    onShellReady() {
      // shell prêt : on commence à streamer, le reste suivra
      res.setHeader("content-type", "text/html");
      pipe(res);
    },
    onShellError(err) {
      res.statusCode = 500;
      res.send("<h1>Erreur</h1>");
    },
  });
});
```

`onShellReady` se déclenche dès que le contenu hors Suspense est rendu : le TTFB ne dépend plus de la donnée la plus lente. Les frontières encore en attente émettent leur fallback, puis leur HTML réel arrive plus tard dans le même flux.

## Les frontières Suspense streament

Chaque `<Suspense>` est un point de découpe du flux. React émet d'abord le fallback à sa place, et quand la donnée résout côté serveur, il pousse l'HTML du contenu plus un petit script qui le swap en place — sans JS applicatif chargé.

```tsx
function Page() {
  return (
    <Layout>
      <Header />               {/* dans le shell, immédiat */}
      <Suspense fallback={<Skeleton />}>
        <Flux />               {/* streamé quand prêt */}
      </Suspense>
      <Suspense fallback={<Skeleton />}>
        <Recommandations />    {/* streamé indépendamment */}
      </Suspense>
    </Layout>
  );
}
```

Les deux frontières sont indépendantes : `Recommandations` peut arriver avant `Flux` si elle résout plus tôt. Le client n'attend pas la lenteur la plus haute.

## Hydratation sélective

Avant, l'hydratation était monolithique : tout ou rien, bloquant le thread. Avec le streaming, React hydrate frontière par frontière, et *priorise selon l'interaction*. Si l'utilisateur clique dans une zone pas encore hydratée, React hydrate cette zone en priorité, devant les autres.

:::callout{type="tip"}
L'hydratation sélective ne se configure pas : elle découle des frontières Suspense et du rendu concurrent. Multiplie les frontières pertinentes (par région d'UI) pour donner à React des points de découpe et de priorisation. Une seule frontière = un seul bloc d'hydratation, tu perds le bénéfice.
:::

## Compare : shell bloquant vs streamé

:::compare
::bad
```tsx
// renderToString : attend TOUTE la donnée avant d'émettre
const html = renderToString(<App />); // bloque sur le fetch le plus lent
res.send(html);                        // hydratation monolithique côté client
```
::
::good
```tsx
// renderToPipeableStream : émet le shell, streame le reste
renderToPipeableStream(<App />, {
  onShellReady() { pipe(res); }, // TTFB = vitesse du shell
});
```
::
:::

**Pourquoi** : `renderToString` produit une chaîne en une passe synchrone ; si un composant suspend, l'API ne sait pas attendre, donc on est forcé de tout résoudre avant le rendu et l'utilisateur ne reçoit rien jusqu'à la donnée la plus lente. Côté client, le HTML arrivé d'un bloc impose une hydratation d'un bloc qui bloque le main thread. `renderToPipeableStream` rend dans un modèle concurrent : il sépare le shell des frontières Suspense, émet le shell tôt (TTFB indépendant des données lentes), puis pousse chaque frontière résolue avec son patch. L'hydratation devient incrémentale et priorisable par l'interaction. Le gain n'est pas cosmétique : c'est le découplage du temps de réponse du shell par rapport au temps de résolution des données.

## Code source

Le streaming vit dans `react-dom/server` : `renderToPipeableStream` (Node) et `renderToReadableStream` (Web/Edge), implémentés dans `react-server-dom`/`ReactDOMFizzServer`. Le moteur de rendu serveur s'appelle *Fizz* ; côté client, *Fiber* gère l'hydratation sélective via le scheduler concurrent. Références : la doc officielle `react.dev/reference/react-dom/server/renderToPipeableStream`, le RFC « New Suspense SSR Architecture in React 18 » (discussions/37 du repo `reactwg/react-18`), et les sources `packages/react-dom/src/server/` et `packages/react-server/` du dépôt `facebook/react`. Les RSC (`rsc`) ajoutent par-dessus un flux de payload sérialisé distinct du HTML.

## À retenir

:::cheatsheet
- title: "Shell d'abord"
  desc: "onShellReady émet le hors-Suspense ; le TTFB ne dépend plus de la donnée la plus lente."
- title: "Frontières = découpe"
  desc: "Chaque Suspense streame son HTML indépendamment, dans l'ordre de résolution."
- title: "Hydratation sélective"
  desc: "Incrémentale et priorisée par l'interaction ; découle des frontières + rendu concurrent."
- title: "Fizz / Fiber"
  desc: "Fizz rend côté serveur, Fiber hydrate ; renderToPipeableStream (Node), renderToReadableStream (Edge)."
:::
