---
title: "Sécurité au démontage"
lead: "Écrire dans un composant qui n'existe plus : annuler à temps."
updated: 2026-05-22
seoTitle: "Sécurité au démontage — Angular vs React vs Vue"
seoDescription: "Éviter les mises à jour après destruction : annuler les async en vol, garder des références vivantes, nettoyer à la destruction."
related:
  - { framework: "angular", slug: "lifecycle" }
  - { framework: "react", slug: "effects-basics" }
  - { framework: "vue", slug: "lifecycle" }
---

## Écrire dans un fantôme

Un composant lance un `fetch`, l'utilisateur navigue ailleurs, le composant est
détruit — puis la réponse arrive et appelle `setState` / `signal.set` /
`ref.value =`. Au mieux, c'est un travail inutile ; au pire, vous touchez un
état orphelin, retenez le composant en mémoire, ou enchaînez sur du DOM
disparu. La parade est unique : **annuler l'async en vol au démontage**, ou au
moins refuser d'écrire si le composant n'est plus là.

| Symptôme | Angular | React | Vue |
| --- | --- | --- | --- |
| Écriture post-démontage | `set` après destruction | `setState` après unmount | `ref` après `onUnmounted` |
| Annulation en vol | `takeUntilDestroyed` / `DestroyRef` | `AbortController` dans cleanup | `AbortController` / `onUnmounted` |
| Garde explicite | rarement nécessaire | `isMounted` via `useRef` | flag dans le scope |
| Avertissement console | non | non (React 18+ ne prévient plus) | non |

## Annuler vaut mieux que garder

React 18+ ne crie plus « can't update state on unmounted component », mais le
problème de fond demeure : un `fetch` non annulé continue, et écrire son
résultat est inutile voire fuyant. Préférez **annuler** (`AbortController`,
`takeUntilDestroyed`) à **garder une garde** (`isMounted`). L'annulation libère
la ressource ; la garde ne fait que masquer l'écriture tardive.

:::callout{type="warn"}
Le `isMounted` via `useRef` reste un filet utile pour les API non annulables
(une promesse tierce sans `signal`). Mais ce n'est qu'un pansement : si l'API
*peut* être annulée, annulez-la — c'est la seule solution qui ne fuit pas.
:::

## Charger en s'arrêtant si on disparaît

:::tri{title="Un chargement qui abandonne au démontage"}
::angular
```ts
import { Component, signal, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';

@Component({ selector: 'app-profile', template: `{{ user()?.name }}` })
export class Profile {
  private http = inject(HttpClient);
  user = signal<{ name: string } | null>(null);

  constructor() {
    // takeUntilDestroyed annule la requête HTTP au démontage :
    // pas de set sur un composant détruit.
    this.http
      .get<{ name: string }>('/api/me')
      .pipe(takeUntilDestroyed())
      .subscribe((u) => this.user.set(u));
  }
}
```
::
::react
```tsx
import { useEffect, useState } from 'react';

export function Profile() {
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    fetch('/api/me', { signal: ctrl.signal })
      .then((r) => r.json())
      .then(setUser)
      .catch((e) => { if (e.name !== 'AbortError') throw e; });

    // abort au démontage : la requête s'arrête, aucun setState orphelin
    return () => ctrl.abort();
  }, []);

  return <>{user?.name}</>;
}
```
::
::vue
```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const user = ref<{ name: string } | null>(null);

onMounted(() => {
  const ctrl = new AbortController();

  fetch('/api/me', { signal: ctrl.signal })
    .then((r) => r.json())
    .then((u) => (user.value = u))
    .catch((e) => { if (e.name !== 'AbortError') throw e; });

  // onUnmounted annule la requête en vol
  onUnmounted(() => ctrl.abort());
});
</script>

<template>{{ user?.name }}</template>
```
::
:::

## Les async non annulables

Pour une promesse qu'on ne peut pas interrompre, gardez une référence vivante :
un `useRef(true)` mis à `false` dans le cleanup côté React, un flag dans le
scope `setup` côté Vue, le `DestroyRef.destroyed` côté Angular. On lit ce drapeau
avant d'écrire. C'est moins propre que l'annulation, mais ça évite l'écriture
fantôme.

## Verdict

À chaque async lancé dans un composant, posez-vous : *« Et si le composant
disparaît avant la réponse ? »* La réponse par défaut est **annuler** —
`AbortController`, `takeUntilDestroyed`, `onUnmounted` qui `abort`. Réservez la
garde `isMounted` aux API qu'on ne peut pas annuler. Le silence de la console
sur React 18+ ne signifie pas que le problème a disparu : **annulez ce qui est
en vol au démontage**, point.
