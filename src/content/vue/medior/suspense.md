---
title: "Suspense & async components"
slug: "suspense"
framework: "vue"
level: "medior"
order: 8
duration: 14
prerequisites: ["composables"]
updated: 2026-05-22
seoTitle: "Vue Suspense & composants asynchrones"
seoDescription: "<Suspense>, defineAsyncComponent et async setup() : orchestrer le chargement et les erreurs de composants async."
ogVariant: "gold"
related:
  - { framework: "react", slug: "suspense-basics" }
  - { framework: "angular", slug: "defer-lazy" }
---

## Suspense orchestre l'attente, pas le composant

`<Suspense>` est un composant intégré qui coordonne plusieurs dépendances
asynchrones d'un sous-arbre et n'affiche le contenu que lorsqu'elles sont toutes
résolues. Deux slots : `#default` (le vrai contenu) et `#fallback` (l'attente).

```vue
<template>
  <Suspense>
    <template #default>
      <UserProfile :id="id" />
    </template>
    <template #fallback>
      <Spinner />
    </template>
  </Suspense>
</template>
```

Tant qu'un descendant a une promesse en cours, le `#fallback` reste affiché. Dès
résolution, Vue bascule sur `#default` en un seul commit — pas de contenu partiel.

## Deux sources d'asynchronisme

Un composant devient « async » de deux manières. Le `setup()` avec `await` de
premier niveau, et `defineAsyncComponent` pour le chargement paresseux du module.

```vue
<script setup>
// async setup : le top-level await suspend ce composant
const res = await fetch(`/api/users/${props.id}`);
const user = await res.json();
</script>
```

```ts
import { defineAsyncComponent } from 'vue';
// composant chargé à la demande ; sa résolution est aussi attendue par Suspense
const Chart = defineAsyncComponent(() => import('./Chart.vue'));
```

:::callout{type="warn"}
Un `await` de premier niveau dans `setup()` arrête l'exécution avant
l'enregistrement des hooks. Place `onMounted`, `onUnmounted` etc. **avant** ton
premier `await`, sinon ils sont silencieusement ignorés.
:::

## Suspense vs un isLoading manuel

Sans Suspense, tu pilotes l'attente à la main avec un drapeau réactif. Ça marche,
mais ça mélange logique de fetch et orchestration d'affichage dans chaque vue.

:::compare
::bad
```vue
<script setup>
const isLoading = ref(true);
const user = ref(null);
onMounted(async () => {
  user.value = await getUser(props.id);
  isLoading.value = false;
});
</script>
<template>
  <Spinner v-if="isLoading" />
  <UserCard v-else :user="user" />
</template>
```
::
::good
```vue
<!-- Parent.vue : l'enfant fait son await, le parent orchestre -->
<Suspense>
  <template #default><UserCard :id="id" /></template>
  <template #fallback><Spinner /></template>
</Suspense>
```
::
:::

**Pourquoi** : le drapeau manuel duplique l'état d'attente dans chaque composant et ne coordonne pas plusieurs fetchs concurrents — deux enfants asynchrones produisent deux spinners non synchronisés et des affichages partiels. `<Suspense>` attend l'agrégat de toutes les promesses du sous-arbre et commit en une seule transition, ce qui centralise l'orchestration et évite le clignotement.

## Gérer les erreurs

Suspense ne capture pas les rejets de promesse : il gère la résolution, pas
l'échec. Pour les erreurs, utilise `onErrorCaptured` dans un composant parent qui
joue le rôle de frontière d'erreur.

```vue
<script setup>
import { ref, onErrorCaptured } from 'vue';
const error = ref(null);
onErrorCaptured((err) => {
  error.value = err;
  return false; // stoppe la propagation
});
</script>
<template>
  <FallbackError v-if="error" :error="error" />
  <Suspense v-else>
    <template #default><AsyncView /></template>
    <template #fallback><Spinner /></template>
  </Suspense>
</template>
```

### Idée reçue : « Suspense est stable, utilisable partout »

`<Suspense>` reste marqué **expérimental** : son API peut bouger entre versions
mineures. Plusieurs pièges concrets. L'imbrication de `<Suspense>` se comporte de
façon subtile — un Suspense imbriqué résout son fallback localement et ne
re-suspend pas le parent après le premier rendu, sauf via l'attribut `suspensible`.
Les changements de route asynchrones et `<KeepAlive>` introduisent des cas limites
de timing. Réserve Suspense aux scénarios maîtrisés (fetch initial d'une vue,
chargement de chunk) et garde un fetch piloté manuellement pour les flux complexes.

:::cheatsheet
- title: "Slots default + fallback"
  desc: "Le contenu async dans default, l'attente dans fallback."
- title: "Hooks avant await"
  desc: "Enregistre onMounted/onUnmounted avant le premier top-level await."
- title: "Erreurs via onErrorCaptured"
  desc: "Suspense ne gère que la résolution ; capture les rejets en amont."
- title: "Encore expérimental"
  desc: "API susceptible de changer ; attention à l'imbrication."
:::
