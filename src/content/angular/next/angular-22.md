---
title: "Angular 22"
slug: "angular-22"
framework: "angular"
level: "next"
order: 1
duration: 14
prerequisites: ["signals", "signal-forms", "zoneless"]
updated: 2026-05-22
seoTitle: "Angular 22 — ce qui arrive (RC)"
seoDescription: "Angular 22 : Signal Forms stable, composants selectorless, OnPush par défaut, Vitest par défaut, zoneless consolidé. En RC."
ogVariant: "iris"
related:
  - { framework: "react", slug: "react-labs" }
  - { framework: "vue", slug: "vue-3-6" }
---

:::callout{type="warn"}
Angular 22 est en **release candidate** (la dernière version stable est 21).
Le contenu ci-dessous reflète la RC et peut encore bouger d'ici la sortie
finale. Ne migre pas une app de prod sur une RC.
:::

## L'ère « signal-first » se confirme

La 22 ne révolutionne pas : elle **stabilise** la direction prise depuis la 17.
Le fil rouge reste les signals, et plusieurs API quittent leur statut
expérimental.

## Signal Forms passent stable

Entrées en developer preview en 21, les **Signal Forms** visent la stabilité en
22 : un modèle de formulaire adossé aux signals, avec validation fine et mises à
jour ciblées (changer un champ ne re-évalue pas tout l'arbre du formulaire).

```ts
import { form, required } from '@angular/forms/signals';

const login = form({ email: '', password: '' }, (f) => {
  required(f.email);
  required(f.password);
});
// login.email().valid() · login().value()
```

## Composants selectorless

Tu peux désormais **importer un composant directement dans le template**, sans
lui donner de sélecteur string ni le déclarer dans `imports`.

:::compare
::bad
```ts
@Component({ selector: 'app-avatar', /* … */ })
export class Avatar {}
// + l'ajouter aux imports du composant hôte, l'utiliser via <app-avatar>
```
::
::good
```ts
// selectorless : importé et utilisé directement (expérimental en 22)
import { Avatar } from './avatar';
// template: <Avatar [user]="u" />
```
::
:::

**Pourquoi** : le sélecteur string et la liste `imports` sont une indirection
historique héritée des NgModules. Le selectorless relie l'usage à l'import TS
réel — meilleure navigation IDE, tree-shaking évident, moins de boilerplate.
C'est **expérimental** en 22.

## Les autres changements notables

:::cheatsheet
- title: "OnPush par défaut"
  desc: "Les nouveaux composants générés naissent en OnPush — la détection fine devient la norme."
- title: "Vitest par défaut"
  desc: "Le CLI bascule le test runner par défaut sur Vitest (Karma définitivement derrière)."
- title: "Zoneless consolidé"
  desc: "Le chemin zoneless est solidifié et poussé comme défaut recommandé."
- title: "TypeScript 5.9"
  desc: "Support de TS 5.9."
:::

:::callout{type="tip"}
Pour te préparer : adopte les signals et `OnPush` partout, migre tes
formulaires mentaux vers le modèle Signal Forms, et passe tes tests sur Vitest
dès la 21 — la 22 ne fera qu'entériner ces choix.
:::
