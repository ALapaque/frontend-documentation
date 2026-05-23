---
title: "Fuites mémoire"
lead: "Abonnements, listeners, timers, observers : ce qui fuit quand on oublie de nettoyer — et comment l'éviter."
updated: 2026-05-22
seoTitle: "Fuites mémoire — Angular vs React vs Vue"
seoDescription: "Éviter les fuites mémoire : nettoyer abonnements, addEventListener, timers et observers. takeUntilDestroyed/DestroyRef, cleanup useEffect/AbortController, onUnmounted/effectScope."
related:
  - { framework: "angular", slug: "signals-rxjs-interop" }
  - { framework: "react", slug: "effects-basics" }
  - { framework: "vue", slug: "lifecycle" }
---

## D'où viennent les fuites

Une fuite, c'est une ressource dont la durée de vie dépasse celle du composant
qui l'a créée. Les coupables sont toujours les mêmes : un `subscribe()` RxJS
jamais désabonné, un `addEventListener` sur `window` jamais retiré, un
`setInterval` qui tourne dans le vide, un `IntersectionObserver` non
déconnecté, une closure qui retient un gros objet, du DOM détaché encore
référencé. Le composant disparaît, mais le callback survit — et garde tout son
graphe d'objets en vie.

| Symptôme | Angular | React | Vue |
| --- | --- | --- | --- |
| Abonnement non nettoyé | `subscribe()` sans teardown | callback `useEffect` sans cleanup | `watch`/`subscribe` hors scope |
| Listener oublié | `addEventListener` manuel | idem dans `useEffect` | idem dans `onMounted` |
| Outil de nettoyage | `takeUntilDestroyed()` / `DestroyRef` | retour de `useEffect` + `AbortController` | `onUnmounted` / `effectScope` |
| Détection auto | `| async` se désabonne seul | Strict Mode double-monte | `watch` arrête au démontage |
| Verrou par défaut | `inject(DestroyRef)` | cleanup obligatoire | scope du `setup()` |

## Ce qui nettoie tout seul

Trois mécanismes vous évitent la corvée manuelle. Le pipe `| async` d'Angular
se désabonne au démontage. Le `watch`/`computed` de Vue est lié au scope du
`setup()` et s'arrête seul. React n'offre rien d'automatique : le retour de
`useEffect` *est* le nettoyage, et le double-montage du Strict Mode est votre
meilleur détecteur de fuite en dev — si un listener s'accumule, vous le voyez
immédiatement.

:::callout{type="warn"}
Le piège classique : `interval(1000).subscribe(...)` dans `ngOnInit` sans
`takeUntilDestroyed`, un `addEventListener('resize', ...)` sans retour de
cleanup, ou un `effectScope` créé puis jamais `.stop()`. Aucun de ces cas ne
plante : la fuite est silencieuse jusqu'au profiler.
:::

## Un abonnement auto-nettoyé

:::tri{title="S'abonner sans fuir"}
::angular
```ts
import { Component, inject, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

@Component({ selector: 'app-ticker', template: `{{ tick() }}` })
export class Ticker {
  private destroyRef = inject(DestroyRef);
  tick = signal(0);

  constructor() {
    // takeUntilDestroyed lit le DestroyRef du contexte d'injection :
    // l'abonnement est coupé au démontage, zéro ngOnDestroy.
    interval(1000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.tick.update((n) => n + 1));

    // Listener manuel : on enregistre le teardown auprès du DestroyRef.
    const onResize = () => this.tick.set(window.innerWidth);
    window.addEventListener('resize', onResize);
    this.destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
  }
}
```
::
::react
```tsx
import { useEffect, useState } from 'react';

export function Ticker() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    const onResize = () => setTick(window.innerWidth);
    window.addEventListener('resize', onResize);

    // Le retour EST le nettoyage : appelé au démontage
    // et entre chaque double-montage du Strict Mode.
    return () => {
      clearInterval(id);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <>{tick}</>;
}
```
::
::vue
```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const tick = ref(0);

onMounted(() => {
  const id = setInterval(() => tick.value++, 1000);
  const onResize = () => (tick.value = window.innerWidth);
  window.addEventListener('resize', onResize);

  // onUnmounted lié au scope du composant : nettoyage garanti.
  onUnmounted(() => {
    clearInterval(id);
    window.removeEventListener('resize', onResize);
  });
});
</script>

<template>{{ tick }}</template>
```
::
:::

## Le cas des observers

`IntersectionObserver`, `ResizeObserver`, `MutationObserver` suivent la même
règle : on `disconnect()` au teardown. Dans React, retournez-le depuis
`useEffect` ; dans Angular, via `DestroyRef.onDestroy` ; dans Vue, via
`onUnmounted`. Un `fetch` annulable se branche sur un `AbortController` dont on
appelle `.abort()` au démontage — utile autant contre les fuites que contre les
race conditions.

## Verdict

Tout abonnement durable doit avoir un **propriétaire qui le démantèle**. Le
réflexe : à chaque fois que vous écrivez `subscribe`, `addEventListener`,
`setInterval` ou `new XObserver`, écrivez le nettoyage dans la même respiration.
Angular vous donne `takeUntilDestroyed`/`DestroyRef`, Vue le scope du `setup`,
React le retour de `useEffect`. La discipline est identique partout : **rien
qui survit au composant ne doit garder une référence vers lui**.
