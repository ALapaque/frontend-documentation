---
title: "provide / inject"
slug: "provide-inject"
framework: "vue"
level: "medior"
order: 3
duration: 14
prerequisites: ["components-props", "reactivity-basics"]
updated: 2026-05-22
seoTitle: "provide / inject — vue"
seoDescription: "L'injection de dépendances de Vue 3 : provide/inject pour traverser l'arbre, clés Symbol typées via InjectionKey, et préservation de la réactivité."
ogVariant: "gold"
related:
  - framework: "angular"
    slug: "dependency-injection"
  - framework: "react"
    slug: "context-perf"
---

Les props descendent d'un parent vers son enfant direct. Quand une donnée doit traverser cinq niveaux de composants, les transmettre une par une devient ingérable : c'est le prop drilling. `provide`/`inject` court-circuite la chaîne : un ancêtre fournit une valeur, n'importe quel descendant la récupère, sans intermédiaire.

## Fournir et injecter

L'ancêtre appelle `provide(clé, valeur)`. Tout descendant, à n'importe quelle profondeur, appelle `inject(clé)` pour la lire.

```vue
<!-- Ancetre.vue -->
<script setup>
import { provide, ref } from 'vue'

const theme = ref('sombre')
provide('theme', theme)
</script>
```

```vue
<!-- Descendant.vue (n niveaux plus bas) -->
<script setup>
import { inject } from 'vue'

const theme = inject('theme', 'clair') // 'clair' = valeur par défaut
</script>

<template>
  <div :class="theme">...</div>
</template>
```

La portée est l'arbre des composants, pas l'application entière. Seuls les descendants de l'ancêtre qui a fait le `provide` peuvent injecter. Un composant non rattaché à ce sous-arbre récupère la valeur par défaut.

## Le piège du prop drilling

Faire transiter une donnée par des composants qui ne s'en servent pas pollue leurs props et couple inutilement toute la chaîne.

:::compare
::bad
```vue
<!-- Chaque niveau redéclare et repasse 'user' -->
<App :user="user" />
  <Layout :user="user" />
    <Sidebar :user="user" />
      <Profil :user="user" />
```
::
::good
```vue
<!-- App fournit une fois -->
<script setup>
provide('user', user)
</script>

<!-- Profil injecte directement -->
<script setup>
const user = inject('user')
</script>
```
::
:::

**Pourquoi** : avec le prop drilling, `Layout` et `Sidebar` déclarent une prop `user` qu'ils ne consomment pas, juste pour la relayer. Le moindre changement de forme de `user` force à toucher chaque maillon, et ces composants deviennent dépendants d'une donnée qui ne les concerne pas. `provide`/`inject` établit un canal direct ancêtre→descendant : les composants intermédiaires ignorent l'existence de `user`. On supprime le couplage transitif et le bruit dans les signatures. La contrepartie : la dépendance devient implicite, donc à réserver aux données vraiment transversales (thème, locale, utilisateur courant).

## Clés typées : Symbol + InjectionKey

Une clé en chaîne (`'theme'`) est fragile : collisions possibles, aucun typage. En TypeScript, on utilise un `Symbol` typé via `InjectionKey<T>`, qui propage le type de la valeur à l'injection.

```ts
// keys.ts
import type { InjectionKey, Ref } from 'vue'

export interface UserStore {
  name: Ref<string>
  logout: () => void
}

export const userKey = Symbol('user') as InjectionKey<UserStore>
```

```vue
<!-- Ancetre.vue -->
<script setup lang="ts">
import { provide, ref } from 'vue'
import { userKey } from './keys'

provide(userKey, {
  name: ref('Ada'),
  logout: () => { /* ... */ },
})
</script>
```

```vue
<!-- Descendant.vue -->
<script setup lang="ts">
import { inject } from 'vue'
import { userKey } from './keys'

const store = inject(userKey) // typé UserStore | undefined
</script>
```

L'`InjectionKey<T>` lie la clé au type de la valeur : `inject(userKey)` est inféré `UserStore | undefined` sans annotation. Le `Symbol` garantit l'unicité : deux modules ne peuvent pas se marcher dessus avec la même chaîne.

## Préserver la réactivité

L'erreur classique : fournir `theme.value` au lieu de `theme`. On envoie alors une valeur figée, l'injection ne se met jamais à jour.

```vue
<script setup>
import { provide, ref, readonly } from 'vue'

const compteur = ref(0)

// On fournit la ref (réactive), pas .value (figé)
provide('compteur', readonly(compteur))

function increment() { compteur.value++ }
</script>
```

On fournit la `ref` (ou un objet `reactive`) telle quelle : les descendants observent les changements. Pour empêcher un descendant de muter la source, on enveloppe dans `readonly` et on expose une méthode dédiée côté ancêtre. C'est le pattern recommandé : la mutation reste centralisée là où la donnée est définie.

:::callout{type="warn"}
`provide(clé, theme.value)` transmet un nombre, pas une ref. Le descendant reçoit un instantané non réactif. Fournis toujours la ref ou l'objet reactive, jamais `.value`.
:::

### Idée reçue : « provide/inject remplace un store comme Pinia »

Non. `provide`/`inject` est un mécanisme d'injection de dépendances limité à un sous-arbre, sans outillage : pas de devtools dédiés, pas d'actions tracées, pas d'hydratation SSR pensée pour l'état partagé global. C'est parfait pour fournir une instance à un sous-arbre (un thème, un client API, le contexte d'un composant composite type `<Tabs>`/`<Tab>`). Dès que l'état est global, partagé entre routes, persisté ou débogué dans le temps, Pinia est l'outil adapté. Les deux coexistent souvent : Pinia pour l'état applicatif, `provide`/`inject` pour câbler un composant composite.

:::cheatsheet
- title: "provide(clé, valeur)"
  desc: "Fournit une valeur à tout le sous-arbre de descendants."
- title: "inject(clé, défaut?)"
  desc: "Récupère la valeur ; second argument = valeur de repli."
- title: "InjectionKey<T>"
  desc: "Symbol typé : propage le type de la valeur à l'injection."
- title: "Fournir la ref"
  desc: "provide(clé, theme) et non theme.value, sinon réactivité perdue."
- title: "readonly()"
  desc: "Empêche les descendants de muter la source fournie."
:::
