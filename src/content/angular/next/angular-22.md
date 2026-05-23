---
title: "Angular 22"
slug: "angular-22"
framework: "angular"
level: "next"
order: 1
duration: 14
prerequisites: ["signals", "signal-forms", "zoneless"]
updated: 2026-05-23
seoTitle: "Angular 22 — ce qui a été livré + horizon v23"
seoDescription: "Angular 22 (mai 2026) : Signal Forms stable, zoneless par défaut, Vitest comme runner par défaut, OnPush-leaning, selectorless en route. Et ce qui vient en v23."
ogVariant: "iris"
related:
  - { framework: "react", slug: "react-labs" }
  - { framework: "vue", slug: "vue-3-6" }
---

:::callout{type="info"}
Angular 22 est **sorti** (~mai 2026). Ce qui était « à venir » dans la 21 est
maintenant stable. Ce module fait le bilan de ce que la 22 a réellement livré,
puis regarde l'horizon v23. Tu peux migrer une app de prod, en suivant le
guide `ng update`.
:::

## L'ère « signal-first » est actée

La 22 ne révolutionne rien : elle **entérine** la direction prise depuis la 17.
Le fil rouge reste les signals, et la plupart des API qui étaient en preview ou
expérimentales en 21 ont franchi le cap. Concrètement, le « modèle mental
Angular par défaut » de mi-2026 est : signals partout, détection sans Zone,
composants OnPush, tests sur Vitest.

## Signal Forms : stable

Entrées en developer preview en 21, les **Signal Forms** sont **stables** en 22.
Le modèle de formulaire est adossé aux signals : la valeur, l'état de validité
et les erreurs sont des signals dérivés. Changer un champ ne re-évalue pas tout
l'arbre du formulaire — seuls les dérivés qui dépendent de ce champ recalculent.

```ts
import { form, required, minLength } from '@angular/forms/signals';

const login = form({ email: '', password: '' }, (f) => {
  required(f.email);
  required(f.password);
  minLength(f.password, 8);
});
// login.email().valid()  ·  login().value()  ·  login().errors()
```

**Pourquoi** ça compte : les Reactive Forms classiques reposaient sur des
`Observable` (`valueChanges`) et un cycle de validation global. Les Signal Forms
remplacent ce flux par de la réactivité fine et synchrone — la validation
devient un `computed`, pas un abonnement RxJS à gérer/désabonner.

## Zoneless par défaut

Le chemin **zoneless**, recommandé depuis la 21, est désormais le **défaut** des
nouvelles apps. `zone.js` n'est plus chargé par `ng new`. La détection de
changement est déclenchée par les signals (et par les API de scheduling
explicites), plus par le monkey-patching des API navigateur de Zone.

:::compare
::bad
```ts
// Pré-zoneless : Zone patche setTimeout/Promise/events et déclenche un tick
// global à chaque tâche async — détection large, coût difficile à tracer.
bootstrapApplication(App); // zone.js chargé implicitement
```
::
::good
```ts
// Angular 22 : zoneless par défaut
bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection()],
});
// Le rendu se déclenche sur écriture de signal, pas sur chaque tâche async.
```
::
:::

**Pourquoi.** Zone.js déclenchait un tick global après *toute* tâche
asynchrone, qu'elle touche l'UI ou non — d'où des cycles de détection inutiles
et difficiles à profiler. En zoneless, c'est l'écriture d'un signal qui marque
les composants concernés comme à re-rendre : la détection devient ciblée et
prévisible, et le bundle perd ~quelques dizaines de Ko (le poids de Zone).

## Vitest par défaut, Karma retiré

Le CLI génère les nouvelles apps avec **Vitest** comme runner par défaut.
**Karma est retiré** du flux par défaut. Vitest tourne sur Vite : démarrage
quasi instantané, mode watch réactif, exécution des tests dans un environnement
proche du build réel.

**Pourquoi.** Karma pilotait un vrai navigateur via WebDriver — lent, fragile en
CI, et désaligné du pipeline de build moderne (esbuild/Vite). Vitest réutilise
la transformation Vite déjà en place, partage la config, et offre un feedback
en millisecondes.

## OnPush-leaning

Les nouveaux composants penchent vers `OnPush` : avec les signals + zoneless, la
détection « par défaut » (CheckAlways) perd son intérêt, car les signals
notifient déjà précisément quoi re-rendre. Le générateur et les schematics
poussent dans cette direction.

## Selectorless : encore en route

Le **selectorless** (importer un composant dans le template via son import TS,
sans sélecteur string ni liste `imports`) progresse mais reste **expérimental**
en 22 — il n'a pas atteint le stable. À surveiller pour la v23.

## Le reste

:::cheatsheet
- title: "Signal Forms — STABLE"
  desc: "Modèle de formulaire sur signals, validation = computed. Plus de valueChanges RxJS."
- title: "Zoneless — défaut"
  desc: "zone.js retiré de ng new. Détection déclenchée par les signals."
- title: "Vitest — runner par défaut"
  desc: "Karma retiré du flux par défaut. Tests sur le pipeline Vite."
- title: "OnPush-leaning"
  desc: "Les nouveaux composants penchent OnPush ; CheckAlways devient l'exception."
- title: "Selectorless — exp."
  desc: "Toujours expérimental en 22. Cible probable v23."
- title: "TypeScript récent"
  desc: "Aligné sur la dernière TS supportée du moment."
:::

## Horizon v23

La v23 (~fin 2026) devrait viser la **stabilisation du selectorless**, le
nettoyage des reliquats Zone restants dans l'écosystème, et l'extension des
primitives signal (ressources async, formulaires plus riches). Le sens de
l'histoire ne change pas : moins de RxJS imposé, plus de signals.

:::callout{type="tip"}
Pour migrer sereinement : passe en zoneless **avant** de toucher au reste (c'est
le changement le plus structurant), bascule tes tests sur Vitest, puis migre tes
Reactive Forms vers Signal Forms champ par champ. `ng update` gère l'essentiel
des codemods.
:::
