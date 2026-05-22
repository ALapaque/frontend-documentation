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

**Pourquoi** : le constructeur s'exécute à l'instanciation de la classe, avant qu'Angular n'ait résolu les `@Input()` — ils valent encore `undefined`. `ngOnInit` est le premier hook appelé *après* l'affectation des inputs, donc un fetch qui en dépend y part avec les bonnes valeurs. Réserve le constructeur à l'injection de dépendances.

## Toucher le DOM : afterNextRender

Les hooks `ngOnInit`/`ngAfterViewInit` s'exécutent pendant la détection de
changement, et le DOM n'y est pas garanti peint. Pour mesurer une taille, donner
le focus ou brancher une lib qui manipule le DOM, utilise `afterNextRender`
(une fois) ou `afterRender` (à chaque rendu).

```ts
import { Component, ElementRef, afterNextRender, inject } from '@angular/core';

@Component({ selector: 'app-chart', template: '<canvas #c></canvas>' })
export class Chart {
  private host = inject(ElementRef);
  constructor() {
    afterNextRender(() => {
      // DOM prêt et peint : sûr pour mesurer ou initialiser une lib tierce
      const w = this.host.nativeElement.offsetWidth;
    });
  }
}
```

:::callout{type="tip"}
`afterNextRender` ne s'exécute que dans le navigateur, jamais côté serveur (SSR).
C'est l'endroit idéal pour tout code qui touche `window`/`document` sans casser
l'hydratation.
:::
