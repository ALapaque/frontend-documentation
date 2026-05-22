---
title: "Stratégie de perf"
slug: "perf-strategy"
framework: "vue"
level: "senior"
order: 5
duration: 18
prerequisites: ["reactivity-deep", "reactivity-internals"]
updated: 2026-05-22
seoTitle: "Stratégie de perf — vue"
seoDescription: "Optimiser Vue 3 : defineAsyncComponent, shallowRef et markRaw pour les objets lourds non réactifs, v-once et v-memo pour figer le rendu."
ogVariant: "crimson"
related:
  - framework: "react"
    slug: "perf-profiling"
  - framework: "angular"
    slug: "perf-toolkit"
---

La perf en Vue se joue sur deux axes : la taille de ce qu'on envoie (code splitting) et le coût de la réactivité (combien d'objets Vue tracke, combien de re-rendus il déclenche). La règle de fond : ne rends réactif que ce qui doit l'être, et ne re-rends que ce qui change. Les outils ci-dessous existent pour relâcher la réactivité par défaut quand elle coûte plus qu'elle ne rapporte.

## defineAsyncComponent : différer le code

Un composant lourd ou rarement affiché (modale, éditeur riche, graphe) n'a pas à être dans le bundle initial. `defineAsyncComponent` le charge à la demande.

```ts
import { defineAsyncComponent } from 'vue'

const EditeurRiche = defineAsyncComponent({
  loader: () => import('./EditeurRiche.vue'),
  loadingComponent: Spinner,
  errorComponent: Erreur,
  delay: 200,      // ms avant d'afficher le loader
  timeout: 8000,   // échec au-delà
})
```

Le `loader` est un import dynamique : le bundler en fait un chunk distinct, téléchargé au premier rendu du composant. `loadingComponent`/`errorComponent` gèrent les états transitoires. Combiné à `<Suspense>`, on coordonne plusieurs chargements async sous un même fallback.

## shallowRef et markRaw : couper la réactivité profonde

`ref`/`reactive` rendent un objet réactif *en profondeur* : Vue parcourt récursivement chaque propriété et la wrappe dans un Proxy. Sur un gros objet (instance de carte Leaflet, gros tableau de données, AST), ce coût est inutile si l'objet n'est jamais muté champ par champ.

:::compare
::bad
```ts
import { ref } from 'vue'
// Vue proxifie récursivement TOUT l'objet à chaque accès
const carte = ref(new mapboxgl.Map(options))
const data = ref(grosTableauDe100kLignes)
```
::
::good
```ts
import { shallowRef, markRaw } from 'vue'
// shallowRef : réactif sur .value, pas sur les propriétés internes
const carte = shallowRef(markRaw(new mapboxgl.Map(options)))
// markRaw : "ne proxifie jamais cet objet"
const data = shallowRef(grosTableauDe100kLignes)
```
::
:::

**Pourquoi** : `ref(obj)` appelle `reactive` sur l'objet, qui installe un Proxy *à chaque niveau* lors des accès — pour un objet profond ou de grande taille, le coût de proxification et de tracking est dominant, alors qu'on ne réagit en réalité qu'au remplacement complet de la valeur. `shallowRef` ne rend réactif que `.value` : assigner une nouvelle valeur déclenche le rendu, mais muter `carte.value.zoom` ne tracke rien. `markRaw` pose un drapeau (`__v_skip`) qui dit au système de réactivité de ne *jamais* proxifier cet objet, même s'il transite par un `reactive` — indispensable pour les instances de bibliothèques tierces qui n'aiment pas être enveloppées dans un Proxy (la lib accède à `this`, le Proxy casse l'identité). On échange une granularité de réactivité dont on n'a pas besoin contre un gain mémoire et CPU substantiel.

:::callout{type="warn"}
Avec `shallowRef`, pour notifier Vue après une mutation interne, réassigne (`carte.value = carte.value`) ou utilise `triggerRef(carte)`. Muter en profondeur sans réassigner ne re-rend pas.
:::

## v-once et v-memo : figer le rendu

Côté template, deux directives évitent du travail de diff. `v-once` rend une fois et ne re-évalue plus jamais. `v-memo` ne re-rend que si une dépendance listée change.

```vue
<template>
  <!-- v-once : contenu statique coûteux, rendu une seule fois -->
  <header v-once>
    <Logo /> {{ versionApp }}
  </header>

  <!-- v-memo : ne re-rend la ligne que si id ou selected change -->
  <div
    v-for="item in liste"
    :key="item.id"
    v-memo="[item.id, item.id === selectedId]"
  >
    {{ item.label }} <Badge :actif="item.id === selectedId" />
  </div>
</template>
```

`v-once` met en cache le VNode au premier rendu : utile pour un contenu réellement immuable. `v-memo` compare le tableau de dépendances entre deux rendus et saute le sous-arbre si rien n'a changé — précieux dans une grande liste où seules quelques lignes bougent. À manier avec parcimonie : un `v-memo` mal calibré (dépendance oubliée) fige un affichage qui aurait dû changer.

### Idée reçue : « plus on rend réactif, mieux Vue gère ; shallowRef est une micro-optimisation négligeable »

Faux à grande échelle. La réactivité profonde a un coût proportionnel au nombre d'objets trackés : à l'init (création des Proxies) et au runtime (collecte des dépendances à chaque lecture). Pour des structures volumineuses ou des instances tierces, ce coût domine et n'apporte rien si l'on ne réagit qu'au remplacement global. `shallowRef`/`markRaw` ne sont pas du bricolage : c'est aligner la granularité de réactivité sur le besoin réel. Le réflexe « tout en ref » est précisément ce qui plombe les vues lourdes (tables de données, canvas, éditeurs). Mesurer dans le profiler Vue Devtools révèle souvent que le temps part dans le tracking d'objets qu'on ne mute jamais finement.

## Code source

Le cœur de la réactivité est dans `@vue/reactivity` (`packages/reactivity/src/`) :

- `reactive.ts` — `reactive()`, `markRaw()`, et le drapeau `ReactiveFlags.SKIP` (`__v_skip`) que `markRaw` pose pour court-circuiter `getTargetType`/`createReactiveObject`.
- `ref.ts` — `ref()` vs `shallowRef()` : la différence tient au flag `__v_isShallow` et à l'appel (ou non) de `toReactive` sur la valeur dans le setter ; `triggerRef` y force le déclenchement des effets.
- `baseHandlers.ts` — les handlers de Proxy (`get`/`set`) qui appellent `track`/`trigger` ; on y voit que les objets `markRaw` sortent tôt sans être enveloppés.

Côté rendu, `@vue/runtime-core` gère `v-once` et `v-memo` : `packages/runtime-core/src/helpers/withMemo.ts` implémente la comparaison du tableau de dépendances et le cache de VNode, et le compilateur (`@vue/compiler-core`) émet les appels `setBlockTracking`/`withMemo` correspondants.

:::cheatsheet
- title: "defineAsyncComponent"
  desc: "Chunk séparé chargé à la demande ; loading/error/timeout."
- title: "shallowRef"
  desc: "Réactif sur .value seulement ; pas de proxy profond."
- title: "markRaw"
  desc: "Interdit toute proxification ; pour instances tierces lourdes."
- title: "triggerRef"
  desc: "Force le re-rendu après mutation interne d'un shallowRef."
- title: "v-once / v-memo"
  desc: "Fige le rendu une fois / ne re-rend que si les deps listées changent."
:::
