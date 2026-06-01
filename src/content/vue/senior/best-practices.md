---
title: "Best practices Vue 2026"
slug: "best-practices"
framework: "vue"
level: "senior"
order: 8
duration: 18
prerequisites: ["composition-vs-options", "composables", "reactivity-deep"]
updated: 2026-06-01
seoTitle: "Best practices Vue 2026 — script setup, composables, Pinia, Vapor-ready, a11y"
seoDescription: "Les habitudes qui tiennent à l'échelle en Vue 2026 : Composition API + script setup, composables ciblés, Pinia stores par feature, état dérivé via computed, tests pragmatiques, accessibilité et anti-patterns."
ogVariant: "iris"
related:
  - { framework: "angular", slug: "best-practices" }
  - { framework: "react", slug: "best-practices" }
---

Les *best practices* qui tiennent en Vue 2026 partent d'un constat simple : la **Composition API** + **`<script setup>`** est l'écosystème mainstream, **Pinia** la solution officielle de state, et **Vapor** se profile comme runtime par défaut à terme. Écrire du Vue idiomatique aujourd'hui, c'est écrire du Vue qui sera **vapor-ready** demain.

## Nommage

- **Composants** en `PascalCase` (multi-mot pour éviter les conflits avec les éléments HTML natifs) : `UserCard.vue`, pas `Card.vue`. Le compilateur le force, embrasse-le.
- **Composables** préfixés `use` : `useCart`, `useDebounced`. Si tu ne préfixes pas, ce n'est pas un composable — c'est une fonction utilitaire.
- **Refs** : nom du sujet, pas du type. `count`, pas `countRef`. La syntaxe `count.value` (ou `<template>{{ count }}</template>` qui auto-unwrap) lève l'ambiguïté.
- **Props/events** : `value` + `update:value` pour le two-way `v-model`. Pas de `data`/`onChange` à l'ancienne.

## Composition API + `<script setup>`, sans hésiter

L'Options API reste prise en charge pour la rétrocompatibilité, mais le **nouveau code part en Composition**. C'est aussi ce que **Vapor exige** (Composition-only). Écrire en Options aujourd'hui, c'est faire de la dette pour la migration Vapor de demain.

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
const props = defineProps<{ initial: number }>();
const emit = defineEmits<{ change: [value: number] }>();

const count = ref(props.initial);
const isEmpty = computed(() => count.value === 0);
function increment() {
  count.value++;
  emit('change', count.value);
}
</script>

<template>
  <button @click="increment">{{ count }} {{ isEmpty ? '(vide)' : '' }}</button>
</template>
```

## Structure : par feature, pas par type

```text
src/
├── core/              # auth, http, errors — transverse
├── features/
│   ├── checkout/
│   │   ├── CheckoutView.vue
│   │   ├── ui/        # composants présentationnels
│   │   ├── composables/use-checkout.ts
│   │   └── stores/checkout.ts   (Pinia)
│   └── catalog/
└── ui/                # design system partagé
```

**Pourquoi.** Un dossier `components/` qui contient tout devient ingérable. La co-localisation par feature rend le code **suppressible** : retirer une feature = retirer un dossier. Et les composables vivent **dans leur feature**, pas dans un fourre-tout `composables/` global.

## État : dérive, ne stocke pas

Les trois primitives à utiliser dans cet ordre :
1. **`ref`/`reactive` colocalisé** dans le composant pour le state UI local
2. **Composable partagé** quand deux composants en ont besoin (`useCart`, `useFilters`)
3. **Pinia store** quand l'état est vraiment **transverse** (user courant, panier, theme)

:::compare
::bad
```ts
// Pinia store qui contient TOUT
const main = defineStore('main', { state: () => ({ user, cart, theme, ui, filters, ... }) });
```
::
```ts
// Un store par feature, lisible et testable
const user = defineStore('user', () => { /* ... */ });
const cart = defineStore('cart', () => { /* ... */ });
```
::good
:::

Une valeur **dérivable** ne se stocke pas. `total = computed(() => items.value.reduce(...))`, pas un `ref<number>` synchronisé à la main.

## Composables ciblés

Un composable = **un sujet**. `useCart()` gère le panier ; `useDebounced(value, 300)` debounce une valeur. Pas de composable géant `useEverything()` qui retourne 30 choses.

Le retour est un objet — destructure ce dont tu as besoin :

```ts
// composables/use-cart.ts
export function useCart() {
  const items = ref<Item[]>([]);
  const total = computed(() => items.value.reduce(sum, 0));
  function add(i: Item) { items.value.push(i); }
  return { items: readonly(items), total, add };  // expose en lecture seule + actions
}
```

`readonly()` empêche la mutation depuis l'extérieur — l'invariant reste dans le composable.

## Async : `<Suspense>` + état pendant

`<Suspense>` permet à un composant d'`await` au setup. Combine avec un état `pending` géré par parent.

```vue
<Suspense>
  <UserProfile :id="id" />        <!-- awaite fetch dans setup -->
  <template #fallback>
    <ProfileSkeleton />           <!-- dimensions correctes pour éviter CLS -->
  </template>
</Suspense>
```

Côté **données serveur**, `@tanstack/vue-query` est le standard de facto pour cache + invalidation + dédup.

## Tests : Testing Library + Vitest

- **Vitest** comme runner (Vite-native, rapide, ESM)
- **`@testing-library/vue`** pour tester ce que l'utilisateur voit, pas la structure interne
- **MSW** pour mocker les requêtes au niveau réseau
- Pas de snapshots de templates — trop fragiles

```ts
test('add to cart updates total', async () => {
  render(Cart);
  await userEvent.click(screen.getByRole('button', { name: /ajouter/i }));
  expect(screen.getByText(/€12/i)).toBeInTheDocument();
});
```

## Accessibilité par défaut

- Sémantique HTML d'abord (`<button>`, pas `<div @click>`)
- `aria-label` sur les boutons icon-only
- `<label>` toujours associé aux inputs
- `:focus-visible` jamais retiré sans alternative
- `prefers-reduced-motion` respecté dans les transitions

## Performance : Vapor-ready

:::cheatsheet
- title: "v-memo pour les listes lourdes"
  desc: "v-memo=\"[dep]\" évite de rerender l'item si dep n'a pas changé (Vapor n'en aura plus besoin)."
- title: "v-once pour le statique"
  desc: "Rend une seule fois ; jamais re-évalué."
- title: "defineAsyncComponent"
  desc: "Lazy-load par défaut sur les composants lourds (éditeur, graph)."
- title: "shallowRef pour les gros objets"
  desc: "Quand tu mutes l'identité de l'objet, pas ses champs profonds."
- title: "Composition only"
  desc: "Pas d'Options API dans le nouveau code — Vapor ne la gère pas."
- title: "readonly() sur les exposes"
  desc: "Empêche la mutation hors du composable ; l'invariant reste lisible."
:::

## Anti-patterns

:::callout{type="warn"}
- **Options API dans du code neuf** — tu te bloques pour Vapor.
- **`watch` pour dériver** — utilise `computed`. `watch` sert aux side-effects.
- **Un store Pinia géant** — un par feature, composables.
- **`v-html` sans sanitiser** — XSS direct.
- **Composable qui fait fetch + UI + cache à la main** — délègue à TanStack Query.
- **Émettre depuis un composable** — un composable expose des refs/actions, pas des events. Les events viennent du composant.
:::

## À retenir

:::cheatsheet
- title: "Composition + script setup"
  desc: "Standard. Préparation à Vapor."
- title: "Structure par feature"
  desc: "Composants + composables + stores co-localisés."
- title: "Dérive avec computed"
  desc: "Une valeur calculable ne se stocke pas."
- title: "Pinia par feature"
  desc: "Un store par sujet ; jamais le store-monolithe."
- title: "readonly() à l'export"
  desc: "Le composable garde l'invariant ; le consommateur lit."
- title: "Suspense + Query"
  desc: "Async via Suspense, données serveur via TanStack Query."
:::
