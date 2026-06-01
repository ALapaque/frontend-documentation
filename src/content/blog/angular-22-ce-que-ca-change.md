---
title: "Angular 22 arrive : ce que ça change cette semaine"
slug: "angular-22-ce-que-ca-change"
date: 2026-06-01
author: "L'équipe Practical Docs"
tags: ["angular", "release", "migration"]
cover: "angular-v22"
lead: "Signal Forms passent stable, Zoneless devient le défaut, Vitest remplace Karma. Une release de transition assumée — et la première où Angular paraît vraiment « signal-first » de bout en bout. Le guide pour ne pas le rater."
seoTitle: "Angular 22 — Signal Forms stable, zoneless par défaut, Vitest par défaut"
seoDescription: "Angular 22 marque la stabilisation des Signal Forms, fait du zoneless le défaut pour les nouveaux projets, et bascule sur Vitest. Ce qui change, comment migrer cette semaine, et les décisions à prendre."
related:
  - { framework: "angular", slug: "angular-22" }
  - { framework: "angular", slug: "signal-forms" }
  - { framework: "angular", slug: "zoneless" }
---

Angular sort une version majeure tous les six mois. La plupart sont des itérations sages ; **la 22 ne l'est pas**. Elle ferme un cycle de trois ans entamé avec la fonction `signal()` en v16, et acte la bascule : la **forme** par défaut d'un composant Angular en 2026 est `OnPush`, sans Zone.js, avec un état en signals, des formulaires en signals, et des tests en Vitest. Le code ne change pas du jour au lendemain — mais les *défauts* du framework, eux, ont changé.

Voici ce qui bouge **cette semaine**, et ce qu'il faut décider.

## Signal Forms : stables

Les Signal Forms quittent l'expérimental. `@angular/forms/signals` est désormais une API publique : `form()`, le binding `[control]`, les schémas de validation (`required`, `min`, `validate`), la validation croisée (`valueOf`), les tableaux dynamiques (`applyEach`), la validation serveur (`validateHttp`), l'intégration Zod (`validateStandardSchema`), et `submit()` qui remappe les erreurs renvoyées par l'API.

L'idée centrale reste la même : ton **signal de données est la source de vérité**, et le formulaire en est une projection réactive. Plus de double état entre `FormGroup` et ton modèle, plus de `valueChanges` à observer pour savoir si c'est valide.

```ts
const model = signal({ email: '', password: '', confirm: '' });
const f = form(model, (path) => {
  required(path.email);
  validate(path.confirm, ({ value, valueOf }) =>
    value() === valueOf(path.password)
      ? null
      : { kind: 'mismatch', message: 'Les mots de passe diffèrent' },
  );
});
```

**Ce que ça change pour ton équipe.** Pendant un an, la réponse pragmatique était : *« on garde les Reactive Forms pour la prod, on prototype en Signal Forms ailleurs »*. Cette réponse devient datée. Les Reactive Forms restent **maintenus** — pas dépréciés — mais l'inertie a basculé : nouveau formulaire = Signal Form, sauf raison explicite (un `FormArray` avec des intégrations tierces lourdes, par exemple).

À lire pour creuser : le module [Signal Forms](/angular/medior/signal-forms) couvre les bases puis la partie avancée (validation croisée, async, Zod, soumission).

## Zoneless : c'est désormais le défaut

`provideZonelessChangeDetection()` est stable depuis 20.2, et **Angular 22 l'active par défaut pour les nouveaux projets**. Concrètement, un `ng new` produit aujourd'hui une app sans Zone.js : ~33 ko de moins dans le bundle, des cycles de détection qui ne tournent que quand l'état change vraiment, et des stack traces enfin lisibles.

:::callout{type="warn"}
**Pour les apps existantes, il ne se passe rien à l'upgrade.** Zone.js reste installé, ta config ne bouge pas. La question n'est pas « ça casse ? » mais « quand est-ce qu'on migre ? ». La réponse est rarement « jamais ».
:::

L'ordre qui marche, qu'on a vu tenir sur plusieurs migrations :

1. **OnPush partout d'abord.** C'est le marchepied — un composant `OnPush` n'attend déjà plus le tick global de Zone.js, il se rafraîchit sur notification explicite. Si l'app est verte en `OnPush` *avec* Zone.js, elle le sera presque sûrement *sans*.
2. **L'état lié à la vue passe en signal** (ou `AsyncPipe` pour les flux). Les `setTimeout` qui mutent un champ nu, les `subscribe()` qui écrivent une propriété, deviennent des `signal.set()`.
3. **Le schematic.** Une migration `OnPush + zoneless` analyse le code et propose un plan — bonne base de départ, à relire à la main.
4. **`provideCheckNoChangesConfig({ exhaustive: true })` en dev.** C'est ton détecteur de fuites : il lève `ExpressionChangedAfterItHasBeenCheckedError` sur tout binding qui aurait changé sans avoir notifié Angular. Chaque erreur révèle une dépendance cachée à Zone.js — typiquement un `setTimeout` ou une lib tierce qui mute un champ.
5. **Retire Zone.js en dernier**, une fois l'app verte sous le détecteur.

Détails et pièges dans le module [Zoneless](/angular/senior/zoneless), qu'on vient de refondre pour cette release.

## Vitest est le runner par défaut, Karma est retiré

Karma a vécu — il est retiré d'Angular 22. Le **runner par défaut est Vitest**, intégré au compilateur, qui démarre en quelques millisecondes plutôt que quelques secondes et tourne sur les mêmes outils que ton bundler.

Pour les apps existantes : Karma continue de fonctionner si tu le laisses, mais c'est une fin de vie. Le migrer est rapide quand les tests sont écrits proprement (peu d'`async/done` à l'ancienne, peu de chronométrage Zone.js explicite). En zoneless, le mantra de test devient `await fixture.whenStable()` plutôt que `fakeAsync` / `tick()` — la détection est planifiée par les signals, pas par un drain de microtâches.

## Selectorless : encore en chantier

Le morceau le plus visuel de la roadmap — pouvoir importer un composant et l'utiliser **sans le déclarer** dans `imports: [...]` — n'est **pas** dans la 22. Il est dans la pipe mais reste expérimental. Si tu lis un blog qui annonce le contraire, méfie-toi.

:::callout{type="info"}
On en reparle quand ce sera stable. Pour l'instant, `imports: [...]` reste obligatoire — c'est l'un des derniers points d'inconfort résiduels des composants standalone.
:::

## Et le reste

Quelques améliorations qui méritent d'être mentionnées :

- **`@let` consolidé** dans les templates : pour dériver une valeur locale (par ex. un signal lu une fois) sans la recalculer à chaque expression. C'est petit, mais ça enlève une couche de gymnastique des templates.
- **OnPush-leaning par défaut** : la documentation, les schematics et les nouvelles APIs présupposent OnPush. Les composants par défaut ne *forcent* pas OnPush, mais tout le reste pousse dans cette direction.
- **Compiler / dépendance build** : poursuite du désempilage côté compilateur — moins de coût à la compile, meilleur incremental.

## Décisions à prendre cette semaine

Trois choses concrètes :

1. **Pinner Angular 22** dans tes nouveaux projets ; ne plus créer d'app sur la 21 sauf cas particulier.
2. **Évaluer un premier formulaire** en Signal Form sur une feature secondaire de l'app de prod. Pas pour migrer, pour mesurer l'ergonomie en équipe.
3. **Planifier une journée zoneless** : pas pour migrer en une journée, pour faire le diagnostic — combien de composants ne sont pas `OnPush` ? Combien de `setTimeout` mutent un champ nu ? Tu sors avec un plan chiffré, pas avec une dette de plus.

## Le récap technique

Pour la version « références qu'on relit » plutôt que « ce qu'on en fait » : l'article [Angular 22 — ce qui a été livré + horizon v23](/angular/next/angular-22) liste les changements API par API. Cet article-ci est le complément narratif.
