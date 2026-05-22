---
title: "Lifecycle d'un composant"
slug: "lifecycle"
framework: "angular"
level: "junior"
order: 1
duration: 12
prerequisites: []
updated: 2026-05-22
seoTitle: "Lifecycle d'un composant Angular — Guide Junior"
seoDescription: "ngOnInit, ngOnDestroy, afterRender : quand chaque hook s'exécute et à quoi il sert vraiment."
ogVariant: "sage"
related:
  - { framework: "react", slug: "effects-basics" }
  - { framework: "vue", slug: "lifecycle" }
---

## Naissance, vie, mort

Un composant traverse trois moments : il est **créé**, il **vit** (réagit aux
changements), puis il est **détruit**. Angular t'offre des points d'entrée — les
*hooks* — pour brancher ton code à chacun.

```ts
import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({ selector: 'app-widget', template: '...' })
export class Widget implements OnInit, OnDestroy {
  ngOnInit() {
    // Les inputs sont disponibles. Idéal pour l'init async.
  }
  ngOnDestroy() {
    // Nettoie : abonnements, timers, listeners.
  }
}
```

:::callout{type="tip"}
Si tu t'abonnes à un Observable dans `ngOnInit`, désabonne-toi dans
`ngOnDestroy` — ou laisse `takeUntilDestroyed()` le faire pour toi.
:::

## Constructor ou ngOnInit ?

:::compare
::bad
```ts
constructor(private http: HttpClient) {
  this.http.get('/api').subscribe(/* inputs pas encore prêts */);
}
```
::
::good
```ts
private http = inject(HttpClient);
ngOnInit() {
  this.http.get('/api').subscribe(/* inputs disponibles ici */);
}
```
::
:::
