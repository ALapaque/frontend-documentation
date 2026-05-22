---
title: "Zoneless"
slug: "zoneless"
framework: "angular"
level: "senior"
order: 2
duration: 18
prerequisites: ["change-detection", "signals"]
updated: 2026-05-22
seoTitle: "Angular zoneless — pièges et migration"
seoDescription: "Le mode sans zone.js : comment Angular sait quand re-rendre, et comment migrer sans surprise."
ogVariant: "crimson"
related:
  - { framework: "vue", slug: "reactivity-internals" }
  - { framework: "react", slug: "compiler" }
---

## Ce que zone.js faisait

`zone.js` patchait toutes les API asynchrones du navigateur (`setTimeout`,
`addEventListener`, `Promise`, XHR…) pour déclencher un tick global après
chaque tâche. Pratique, mais c'est un marteau : Angular re-vérifiait tout
« au cas où ».

## Sans zone, qui déclenche le tick ?

En zoneless, Angular planifie un cycle de détection à partir de signaux
**explicites** :

:::cheatsheet
- title: "Mutation de signal"
  desc: "set / update sur un signal lu dans un template."
- title: "Événement avec binding"
  desc: "Un (click), un (input) lié dans le template."
- title: "AsyncPipe"
  desc: "Une émission d'Observable consommée via | async."
- title: "markForCheck()"
  desc: "L'échappatoire manuel pour les cas hors de ces sources."
:::

```ts
bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection()],
});
```

## Le piège : l'état hors signal

Sans zone, muter un champ de classe « nu » ne déclenche **rien**. Ce qui marchait
par accident sous zone.js cesse de marcher.

:::compare
::bad
```ts
loaded = false;
ngOnInit() {
  setTimeout(() => { this.loaded = true; }); // zoneless : la vue ne bouge pas
}
```
::
::good
```ts
loaded = signal(false);
ngOnInit() {
  setTimeout(() => this.loaded.set(true)); // signal → tick planifié
}
```
::
:::

**Pourquoi** : sans zone.js, plus rien ne patche `setTimeout` pour réveiller Angular — muter `this.loaded` ne notifie personne et aucun cycle de détection n'est planifié. Un `signal.set()` notifie directement le `ChangeDetectionScheduler`, qui planifie le tick. C'est ce mécanisme explicite qui remplace le réveil global et automatique qu'offrait zone.js.

:::callout{type="warn"}
Migrer vers zoneless, c'est surtout migrer ton état mutable vers des signals.
Active d'abord `OnPush` partout, convertis les champs liés à la vue en signals,
puis retire zone.js. Dans cet ordre, la bascule est quasi transparente.
:::

## Code source

`provideZonelessChangeDetection` installe un `ChangeDetectionScheduler` basé sur
les notifications du graphe de signals. Comparer avec l'ancien
`NgZone.onMicrotaskEmpty` montre pourquoi le zoneless est à la fois plus rapide
et plus prévisible.
