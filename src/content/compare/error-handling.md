---
title: "Gestion des erreurs"
lead: "Une erreur de rendu ou de réseau ne doit jamais laisser un écran blanc."
updated: 2026-05-23
seoTitle: "Gestion des erreurs — Angular vs React vs Vue"
seoDescription: "ErrorHandler global Angular, error boundaries React et Suspense, onErrorCaptured et errorHandler Vue : UI de repli, logging, périmètre des erreurs réseau."
related:
  - { framework: "angular", slug: "interceptors-guards" }
  - { framework: "react", slug: "suspense-basics" }
  - { framework: "vue", slug: "reactivity-deep" }
---

## Vue d'ensemble

| Critère | Angular | React | Vue |
| --- | --- | --- | --- |
| Capture de rendu | `ErrorHandler` global | Error Boundary (composant) | `onErrorCaptured` (parent) |
| Périmètre | global (un handler) | par sous-arbre (boundary local) | par sous-arbre (hook) ou global |
| Hook global | `ErrorHandler.handleError` | aucun natif (boundary racine) | `app.config.errorHandler` |
| UI de repli localisée | via état + `@if` | `fallback` du boundary | slot d'erreur + état |
| Erreurs async | non capturées par défaut | non capturées par le boundary | non capturées par `onErrorCaptured` |
| Erreurs réseau | intercepteur HTTP | wrapper / TanStack Query | intercepteur `$fetch` / état |
| Suspense + erreur | `@defer (@error)` | Boundary englobe le Suspense | `<Suspense>` + boundary parent |

## Deux familles d'erreurs, deux mécanismes

Le piège fondateur : **les error boundaries ne capturent pas les erreurs
asynchrones**. Un `throw` pendant le rendu (accès à `undefined.x`) est capturé ;
une promesse rejetée dans un `fetch`, un timer ou un gestionnaire d'événement ne
l'est pas — l'erreur remonte hors du cycle de rendu.

- **Erreurs de rendu** (synchrones) : capturées par l'Error Boundary (React),
  `onErrorCaptured` (Vue), `ErrorHandler` (Angular).
- **Erreurs async** (réseau, promesses) : à gérer **à la source** — `catch`,
  état d'erreur d'une ressource, intercepteur HTTP — puis éventuellement à
  *transformer* en erreur de rendu (faire un `throw` pendant le rendu) si l'on
  veut qu'un boundary l'attrape.

C'est pour ça que TanStack Query expose `throwOnError` : il convertit une erreur
de requête en erreur de rendu pour la faire remonter au boundary le plus proche.

## UI de repli localisée

:::tri{title="Périmètre d'erreur + UI de repli"}
::angular
```ts
// Handler global : dernier filet, surtout pour le logging.
import { ErrorHandler, Injectable, inject } from '@angular/core';

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private logger = inject(LoggerService);
  handleError(error: unknown): void {
    this.logger.report(error);   // Sentry, etc.
  }
}
// providers: [{ provide: ErrorHandler, useClass: AppErrorHandler }]

// Repli localisé pour un bloc différé :
@defer (on viewport) {
  <app-chart />
} @error {
  <p>Le graphe n'a pas pu se charger.</p>
}
```
::
::react
```tsx
// Error Boundary : capture les throws de rendu de son sous-arbre.
import { ErrorBoundary } from 'react-error-boundary';

function Panel() {
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => <p>Échec : {error.message}</p>}
      onError={(e) => logger.report(e)}
    >
      <Suspense fallback={<Spinner />}>
        {/* throwOnError côté query → l'erreur réseau remonte ici */}
        <Chart />
      </Suspense>
    </ErrorBoundary>
  );
}
```
::
::vue
```vue
<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';

const failed = ref(false);
// Capture les erreurs de rendu des descendants. return false stoppe
// la propagation vers le handler global.
onErrorCaptured((err) => {
  logger.report(err);
  failed.value = true;
  return false;
});
</script>

<template>
  <p v-if="failed">Une erreur est survenue dans ce panneau.</p>
  <Suspense v-else><Chart /></Suspense>
</template>
```
::
:::

## Ne capture pas tout au sommet

:::compare
::bad
```tsx
// Un seul boundary à la racine : la moindre erreur d'un widget
// fait tomber TOUTE la page sur l'écran d'erreur global.
<RootErrorBoundary>
  <App />  {/* header, nav, contenu, widgets… tout d'un bloc */}
</RootErrorBoundary>
```
::
::good
```tsx
// Boundaries localisés : un widget qui tombe n'emporte que sa zone,
// le reste de l'appli reste utilisable.
<App>
  <Nav />
  <ErrorBoundary fallback={<WidgetError />}><Revenue /></ErrorBoundary>
  <ErrorBoundary fallback={<WidgetError />}><Activity /></ErrorBoundary>
</App>
```
::
:::

**Pourquoi.** Le périmètre d'un boundary détermine **ce qui disparaît** quand il
se déclenche. Un boundary racine transforme une erreur dans un widget secondaire
en panne totale de l'écran — l'utilisateur perd la navigation et tout le contenu
sain. En plaçant un boundary autour de chaque zone indépendante, tu **contiens**
la défaillance : le widget fautif affiche son repli, le reste continue de
fonctionner. Garde quand même un handler global (Angular `ErrorHandler`, Vue
`app.config.errorHandler`, boundary racine React) comme **dernier filet et point
de logging**, mais ne lui fais pas porter l'expérience de récupération.

:::callout{type="warn"}
Un Error Boundary React ne capture **pas** : les erreurs dans les gestionnaires
d'événements, dans le code asynchrone (`setTimeout`, `fetch`), pendant le SSR, ni
les erreurs *du boundary lui-même*. Même limite pour `onErrorCaptured` côté Vue.
Pour ces cas, gère l'erreur à la source (try/catch, état d'erreur) ou re-`throw`
pendant le rendu pour la faire remonter.
:::

## Erreurs réseau : centraliser sans tout avaler

Les erreurs réseau ont une logique transverse (401 → redirection login, 5xx →
retry, toast). Le bon endroit est un **intercepteur**, pas chaque composant.

```ts
// Angular — intercepteur fonctionnel : 401 global, le reste propagé.
export const authError: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) router.navigate(['/login']);
      return throwError(() => err); // on ne masque pas les autres erreurs
    }),
  );
```

React passe par un wrapper `fetch` ou la config globale de TanStack Query
(`retry`, `onError`) ; Nuxt par les hooks `onResponseError` de `$fetch` /
`useFetch`. Règle d'or : l'intercepteur gère le **transverse** (auth, retry,
log), mais laisse l'erreur métier remonter à l'UI qui sait l'afficher.

:::callout{type="tip"}
Distingue trois destinataires : l'**utilisateur** (UI de repli claire et
actionnable), le **logging** (Sentry via le handler global), et le **développeur**
(stack en dev). Une bonne UI de repli propose une action — *réessayer*, *recharger*
— plutôt qu'un message technique brut.
:::

:::cheatsheet
- title: "ErrorHandler.handleError (Angular)"
  desc: "Handler global : filet de sécurité et point de logging centralisé."
- title: "@defer (@error)"
  desc: "Angular : UI de repli locale si le bloc différé échoue à charger."
- title: "Error Boundary (React)"
  desc: "Capture les erreurs de rendu d'un sous-arbre ; place-en plusieurs, localisés."
- title: "throwOnError (TanStack Query)"
  desc: "Convertit une erreur réseau en erreur de rendu pour la faire remonter au boundary."
- title: "onErrorCaptured (Vue)"
  desc: "Hook parent ; return false stoppe la propagation au handler global."
- title: "app.config.errorHandler (Vue)"
  desc: "Handler applicatif global pour le logging des erreurs non rattrapées."
- title: "Intercepteur HTTP / $fetch"
  desc: "Centralise auth, retry et log des erreurs réseau hors des composants."
:::

## Verdict

Les trois frameworks séparent le **global** (un filet pour logger) du **local**
(une UI de repli par zone), mais avec des ergonomies différentes : React rend le
périmètre explicite et composable via les Error Boundaries (idéal avec Suspense) ;
Vue offre `onErrorCaptured` par sous-arbre plus un handler global ; Angular mise
sur un `ErrorHandler` central, les intercepteurs HTTP pour le réseau et `@error`
pour les blocs `@defer`. Le réflexe commun, lui, ne change pas : **les boundaries
ne voient pas l'async** — gère les erreurs réseau à la source, contiens les pannes
de rendu par des périmètres étroits, et garde un handler global uniquement comme
dernier recours et journal.
