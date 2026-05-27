---
title: "State management"
lead: "Trois écoles pour la même question : où vit l'état, et qui le notifie ?"
updated: 2026-05-22
seoTitle: "State management — Angular vs React vs Vue"
seoDescription: "Signals, hooks/RSC et ref/Pinia comparés : modèle mental, granularité de re-render et passage à l'échelle."
related:
  - { framework: "angular", slug: "signals" }
  - { framework: "react", slug: "state-architecture" }
  - { framework: "vue", slug: "pinia" }
---

## Vue d'ensemble

| Critère | Angular | React | Vue |
| --- | --- | --- | --- |
| Primitive locale | `signal()` | `useState` | `ref()` / `reactive()` |
| Dérivé | `computed()` | `useMemo` | `computed()` |
| Store global | Service + signals | Zustand / Redux | Pinia |
| Granularité | Fine (signal) | Composant | Fine (proxy) |
| Notification | Pull, automatique | Re-render explicite | Pull, automatique |

## Un compteur partagé

:::tri{title="Store de compteur minimal"}
::angular
```ts
@Injectable({ providedIn: 'root' })
export class Counter {
  readonly count = signal(0);
  readonly double = computed(() => this.count() * 2);
  increment() { this.count.update((n) => n + 1); }
}
```
::
::react
```tsx
import { create } from 'zustand';

export const useCounter = create((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));
```
::
::vue
```ts
export const useCounter = defineStore('counter', () => {
  const count = ref(0);
  const double = computed(() => count.value * 2);
  function increment() { count.value++; }
  return { count, double, increment };
});
```
::
:::

## Le clivage de fond

:::callout{type="info"}
Angular et Vue *tirent* (pull) : tu lis une valeur, le framework trace la
dépendance et te re-notifie. React *pousse* (push) : tu déclares un nouvel état
et l'arbre se réconcilie. Le premier modèle est plus fin par défaut, le second
plus explicite.
:::

## Verdict

Pour de l'état **local**, les trois primitives se valent — choisis celle de ton
framework. Pour de l'état **partagé**, Angular n'a pas besoin de lib (un service
+ signals suffit), React impose un choix d'écosystème (Zustand pour la
simplicité, Redux Toolkit pour la rigueur), et Vue a une réponse canonique avec
Pinia. La vraie variable, c'est la **granularité du re-render** : si elle compte
pour toi, signals et proxies Vue gagnent sans effort.
