---
title: "Stratégies de rendu"
lead: "CSR, SSR, SSG, ISR, streaming : qui rend le HTML, et à quel moment."
updated: 2026-05-23
seoTitle: "Stratégies de rendu — Angular vs React vs Vue"
seoDescription: "CSR vs SSR vs SSG vs ISR vs streaming : Angular hydratation incrémentale et defer, React RSC et streaming SSR, Nuxt ssr/ssg/isr/hybrid. Impact SEO, TTFB, LCP."
related:
  - { framework: "angular", slug: "ssr-hydration" }
  - { framework: "react", slug: "rsc" }
  - { framework: "vue", slug: "nuxt-ssr" }
---

## Vue d'ensemble

| Critère | Angular | React | Vue (Nuxt) |
| --- | --- | --- | --- |
| SSR | `@angular/ssr` + `provideServerRendering` | RSC + streaming SSR (Next, etc.) | SSR par défaut |
| SSG (prerender) | `getPrerenderParams` | `generateStaticParams` | `nuxt generate` / `prerender: true` |
| ISR | non natif (CDN / cache custom) | `revalidate` (Next) | route rules `isr: 60` |
| Streaming | partiel via `@defer` (viewport) | natif (Suspense + flux HTML) | natif (Suspense + flux) |
| Hydratation | full ou **incrémentale** (`@defer hydrate`) | sélective (Server vs Client Components) | full (`<NuxtIsland>` pour îlots) |
| Granularité « pas de JS » | bloc `@defer` | Server Component (zéro JS) | îlot serveur |
| Réglage par route | config build | par segment / fichier | `routeRules` (hybrid) |

## Le bon axe de lecture : *quand* le HTML est produit

Ne raisonne pas en « SSR vs CSR » comme un choix binaire mais en **moment de
production du HTML** :

- **CSR** : HTML vide, le JS construit tout dans le navigateur. TTFB minuscule
  mais LCP tardif et SEO faible (le crawler doit exécuter le JS).
- **SSR (à la requête)** : le serveur rend le HTML à chaque requête. Bon SEO,
  bon LCP, mais TTFB dépend de tes appels data et de la charge serveur.
- **SSG (au build)** : HTML figé au build, servi depuis un CDN. TTFB minuscule,
  SEO parfait, mais contenu potentiellement périmé.
- **ISR** : SSG + régénération en arrière-plan après expiration (`revalidate`).
  Le compromis vitesse/fraîcheur le plus courant pour le contenu semi-statique.
- **Streaming SSR** : le serveur envoie le `<head>` et la coquille **immédiatement**,
  puis pousse le reste du HTML au fil de l'eau quand la donnée arrive. Le TTFB
  ne dépend plus de la requête la plus lente.

## Distinct de l'hydratation

L'hydratation n'est **pas** une stratégie de rendu : c'est ce qui se passe
*après* que le HTML serveur soit affiché, quand le JS « rattache » les écouteurs.
C'est la phase qui rend une page interactive — et le poste de coût caché du SSR.
Les trois frameworks cherchent à en faire **moins** :

- Angular : **hydratation incrémentale**. Un bloc `@defer (hydrate on viewport)`
  reste du HTML inerte jusqu'à ce qu'il entre dans le viewport, où seul ce
  fragment s'hydrate. Le JS n'est téléchargé et exécuté qu'à ce moment.
- React : **Server Components**. Un composant serveur n'envoie *aucun* JS au
  client — rien à hydrater. Seuls les `'use client'` sont hydratés.
- Vue/Nuxt : **îlots serveur** (`<NuxtIsland>` / composants `.server.vue`)
  rendus en HTML pur, sans JS côté client.

```ts
// Angular — hydratation incrémentale : ce bloc ne charge son JS
// et ne s'hydrate qu'au moment où il entre dans le viewport.
@defer (hydrate on viewport) {
  <app-comments [postId]="id()" />
} @placeholder {
  <p>Commentaires…</p>
}
```

## Le même choix exprimé dans les trois frameworks

:::tri{title="Pré-rendre une liste de slugs au build (SSG)"}
::angular
```ts
// app.routes.server.ts — prerender + liste des params connus.
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'blog/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const slugs = await fetchSlugs();
      return slugs.map((slug) => ({ slug }));
    },
  },
];
```
::
::react
```tsx
// app/blog/[slug]/page.tsx — Next génère une page statique par slug.
export async function generateStaticParams() {
  const slugs = await fetchSlugs();
  return slugs.map((slug) => ({ slug }));
}

// ISR : régénère en arrière-plan toutes les 60 s.
export const revalidate = 60;
```
::
::vue
```ts
// nuxt.config.ts — règles par route : statique, ISR, ou SSR.
export default defineNuxtConfig({
  routeRules: {
    '/blog/**': { prerender: true },   // SSG au build
    '/news/**': { isr: 60 },           // ISR : régénère après 60 s
    '/dashboard/**': { ssr: false },   // CSR pur (appli derrière login)
  },
});
```
::
:::

## Ne mets pas tout en SSR « par sécurité »

:::compare
::bad
```ts
// Tout en SSR à la requête, y compris un dashboard derrière login.
// Chaque vue refait des appels API serveur, le TTFB explose sous charge,
// et le SEO est inutile (page jamais indexée).
routeRules: { '/dashboard/**': { ssr: true } }
```
::
::good
```ts
// Le contenu public en statique/ISR (SEO + CDN),
// l'appli privée en CSR (pas de coût serveur, pas de SEO requis).
routeRules: {
  '/': { prerender: true },
  '/blog/**': { isr: 3600 },
  '/dashboard/**': { ssr: false },
}
```
::
:::

**Pourquoi.** Le SSR n'a de valeur que là où le **HTML initial compte** : SEO,
partage social (Open Graph), ou LCP sur une première visite. Une appli derrière
authentification n'est jamais indexée et l'utilisateur attend de toute façon un
chargement de données — la rendre en SSR ajoute un coût serveur par requête et un
risque de fuite de données dans le HTML, sans bénéfice. À l'inverse, une page
marketing rendue en CSR sacrifie SEO et LCP pour rien. La granularité par route
(`routeRules`, `RenderMode`, segments Next) existe précisément pour **choisir par
zone** plutôt que d'imposer une stratégie globale.

:::callout{type="info"}
Pour le SEO, ce qui compte n'est pas « SSR ou pas » mais que le **contenu
principal soit dans le HTML initial**. Un Server Component React, une page
prérendue Nuxt et une route Angular `Prerender` produisent tous du HTML indexable
sans exécution de JS. Une SPA CSR force le crawler à exécuter le JS — possible
mais lent et fragile.
:::

## TTFB, LCP : où chaque stratégie gagne ou perd

- **CSR** : TTFB excellent (HTML quasi vide), LCP mauvais (tout le travail après
  download du JS). Pénalisant sur mobile bas de gamme.
- **SSR à la requête** : LCP bon, mais TTFB = temps serveur + data. Le **streaming**
  corrige ça : on envoie la coquille tout de suite et on `Suspense`-e les zones
  lentes, donc le TTFB redevient bas sans sacrifier le contenu.
- **SSG/ISR** : le meilleur des deux (TTFB CDN + HTML complet), au prix de la
  fraîcheur — d'où l'ISR pour borner la péremption.

Le streaming est le grand niveleur de mi-2026 : React (RSC + flux HTML) et Nuxt
(Suspense) l'ont nativement ; Angular l'approche par bloc avec `@defer` et son
hydratation incrémentale plutôt que par un vrai flux de document.

:::cheatsheet
- title: "RenderMode.Prerender (Angular)"
  desc: "Fige une route au build ; getPrerenderParams énumère les params dynamiques."
- title: "generateStaticParams + revalidate (React/Next)"
  desc: "SSG par slug, ISR via revalidate pour régénérer en arrière-plan."
- title: "routeRules { isr, prerender, ssr } (Nuxt)"
  desc: "Choisit la stratégie par segment de route : statique, ISR ou CSR."
- title: "@defer (hydrate on viewport)"
  desc: "Angular : HTML inerte jusqu'au viewport, hydratation et JS à la demande."
- title: "Server Components"
  desc: "React : zéro JS client pour la zone non interactive, rien à hydrater."
- title: "Streaming SSR"
  desc: "Coquille immédiate puis HTML poussé au fil de l'eau : TTFB bas sans CSR."
:::

## Verdict

Il n'y a pas de « meilleure » stratégie, seulement une **par zone**. Le contenu
public veut SSG/ISR ou SSR streamé ; l'appli privée veut souvent du CSR. React
(RSC + streaming) pousse le plus loin l'idée d'envoyer zéro JS pour le statique et
de streamer le reste. Nuxt offre le réglage le plus lisible avec `routeRules`
(ssr/ssg/isr/hybrid sur une seule config). Angular, longtemps centré client, a
rattrapé l'essentiel avec le SSR moderne, `@defer` et l'**hydratation
incrémentale** — son angle est moins le streaming de document que le report fin du
JS bloc par bloc. Choisis selon la question : *ce HTML initial doit-il être indexé
ou rapide à peindre ?* Si non, ne paie pas le SSR.
