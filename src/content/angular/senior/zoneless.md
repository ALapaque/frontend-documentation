---
title: "Zoneless"
slug: "zoneless"
framework: "angular"
level: "senior"
order: 2
duration: 22
prerequisites: ["change-detection", "signals"]
updated: 2026-06-10
seoTitle: "Angular zoneless — défaut en v21, migration et débogage"
seoDescription: "Le mode sans zone.js, désormais par défaut en Angular 21 : comment Angular sait quand re-rendre, l'ordre de migration (OnPush → signals → retrait de zone.js), débusquer les dépendances cachées avec checkNoChanges, et tester en zoneless."
ogVariant: "crimson"
related:
  - { framework: "vue", slug: "reactivity-internals" }
  - { framework: "react", slug: "compiler" }
---

:::callout{type="info"}
Le zoneless n'est plus expérimental : `provideZonelessChangeDetection()` est
**stable depuis Angular 20.2**, et **Angular 21 (nov. 2025) l'active par défaut**
pour les nouveaux projets. La question n'est donc plus « faut-il y aller » mais
« comment migrer l'existant sans rien casser ».
:::

## Ce que zone.js faisait

`zone.js` patchait toutes les API asynchrones du navigateur (`setTimeout`,
`addEventListener`, `Promise`, XHR…) pour déclencher un tick global après
chaque tâche. Pratique, mais brutal : Angular re-vérifiait tout
« au cas où », sans distinguer les tâches qui touchent l'UI des autres.
Résultat : ~33 ko de bundle en moins une fois retiré, et des cycles de
détection seulement quand l'état change vraiment.

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

## Migrer : l'ordre des opérations

Migrer vers zoneless, c'est surtout migrer ton état mutable vers des signals.
L'ordre compte — fais-le par étapes, pas en retirant zone.js d'un coup.

:::cheatsheet
- title: "1. OnPush partout"
  desc: "Passe les composants en ChangeDetectionStrategy.OnPush : c'est le marchepied, ça force déjà à notifier explicitement."
- title: "2. État → signals"
  desc: "Convertis les champs lus dans les templates en signals (ou AsyncPipe pour les flux)."
- title: "3. Le schematic"
  desc: "ng generate @angular/core:signals / l'aide de migration OnPush+zoneless analyse le code et propose un plan."
- title: "4. Retire zone.js"
  desc: "provideZonelessChangeDetection() + supprime zone.js des polyfills une fois l'app verte."
:::

**Pourquoi cet ordre.** `OnPush` ne dépend pas du zoneless mais l'anticipe : un
composant `OnPush` ne se rafraîchit déjà que sur notification explicite
(`@Input` changé, signal, `AsyncPipe`, `markForCheck`). Si l'app marche en `OnPush`
**avec** zone.js, elle marchera presque sûrement sans. Retirer zone.js en dernier
transforme une grosse bascule risquée en une suite de petits changements vérifiables.

## Débusquer les dépendances cachées

Le risque, c'est l'état qui changeait « par accident » grâce au tick global de
zone.js : un `setTimeout`, une lib tierce, une souscription RxJS qui écrit un champ
nu. En zoneless, ces mises à jour n'apparaissent plus à l'écran. Pour les attraper
**avant** la prod, active la vérification exhaustive en développement.

```ts
bootstrapApplication(App, {
  providers: [
    provideZonelessChangeDetection(),
    provideCheckNoChangesConfig({ exhaustive: true, interval: 1000 }),
  ],
});
```

**Pourquoi.** `provideCheckNoChangesConfig` relance périodiquement une détection de
contrôle : si une valeur liée a changé sans avoir notifié Angular, il lève
`ExpressionChangedAfterItHasBeenCheckedError` et pointe le binding fautif. C'est
ton détecteur de fuites : chaque erreur révèle un état qui dépendait du réveil
automatique de zone.js et qu'il faut passer en signal (ou notifier via
`markForCheck`).

:::callout{type="warn"}
Les coupables récurrents : `setTimeout`/`setInterval` qui mutent un champ,
`requestAnimationFrame`, les callbacks d'une bibliothèque non-Angular (carte,
graphe, éditeur), et les `subscribe()` qui écrivent une propriété au lieu d'un
signal. Pour ces flux, `signal` + `set()`, l'`AsyncPipe`, ou en dernier recours
`ChangeDetectorRef.markForCheck()`.
:::

## Tester en zoneless

Configure le `TestBed` avec le même provider, et synchronise via `whenStable()`
plutôt qu'en t'appuyant sur le réveil de zone.

```ts
TestBed.configureTestingModule({
  providers: [provideZonelessChangeDetection()],
});
const fixture = TestBed.createComponent(MyCmp);
await fixture.whenStable();   // attend que le scheduler ait tické
expect(fixture.nativeElement.textContent).toContain('…');
```

`fakeAsync`/`tick()` restent utilisables pour piloter le temps, mais le réflexe
zoneless est `await fixture.whenStable()` : tu attends la détection planifiée par
les signals, pas un drain de microtâches géré par zone.

## Code source

`provideZonelessChangeDetection` installe un `ChangeDetectionScheduler` basé sur
les notifications du graphe de signals. Comparer avec l'ancien
`NgZone.onMicrotaskEmpty` montre pourquoi le zoneless est à la fois plus rapide
et plus prévisible.

:::cheatsheet
- title: "Statut"
  desc: "Stable depuis 20.2, défaut en Angular 21 ; la 22 ajoute OnPush par défaut. ~33 ko de moins sans zone.js."
- title: "Déclencheurs du tick"
  desc: "Mutation de signal, événement lié, AsyncPipe, markForCheck()."
- title: "Ordre de migration"
  desc: "OnPush → état en signals → schematic → retrait de zone.js."
- title: "Débogage"
  desc: "provideCheckNoChangesConfig({ exhaustive }) lève une erreur sur l'état non notifié."
- title: "Dépendances cachées"
  desc: "setTimeout, libs tierces, subscribe() écrivant un champ nu → signal / AsyncPipe / markForCheck."
- title: "Tests"
  desc: "provideZonelessChangeDetection() + await fixture.whenStable()."
:::
