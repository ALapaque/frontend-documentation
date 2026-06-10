---
title: "Angular 22 est sorti : ce que ça change"
slug: "angular-22-ce-que-ca-change"
date: 2026-06-10
author: "L'équipe Practical Docs"
tags: ["angular", "release", "migration"]
cover: "angular-v22"
lead: "C'est officiel depuis le 3 juin : Signal Forms et Resources sont stables, OnPush devient le défaut, Vitest remplace Karma, TypeScript 6 est requis. La première release où Angular est « signal-first » de bout en bout. Le guide pour migrer sans se rater."
seoTitle: "Angular 22 est sorti — Signal Forms et Resources stables, OnPush par défaut, Vitest"
seoDescription: "Angular 22 (3 juin 2026) stabilise les Signal Forms et les Resources, fait d'OnPush la détection par défaut, bascule sur Vitest et exige TypeScript 6. Ce qui change, comment migrer, et les décisions à prendre."
related:
  - { framework: "angular", slug: "angular-22" }
  - { framework: "angular", slug: "signal-forms" }
  - { framework: "angular", slug: "zoneless" }
---

Angular sort une version majeure tous les six mois. La plupart sont des itérations sages ; **la 22, sortie le 3 juin, ne l'est pas**. Elle ferme un cycle de trois ans entamé avec la fonction `signal()` en v16, et acte la bascule : la **forme** par défaut d'un composant Angular en 2026 est `OnPush`, sans Zone.js, avec un état en signals, des formulaires en signals, des données async en `httpResource`, et des tests en Vitest. Le code ne change pas du jour au lendemain — mais les *défauts* du framework, eux, ont changé.

Voici ce qui a **réellement été livré**, et ce qu'il faut décider.

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

## Resources : l'async piloté par signal, stable

L'autre grosse stabilisation : **`resource()`, `rxResource()` et `httpResource()`** sortent de l'expérimental. Un signal de requête en entrée, un état réactif (`value`/`isLoading`/`error`) en sortie, l'annulation des requêtes obsolètes gérée par le framework.

```ts
const userId = signal('42');
const user = httpResource(() => `/api/users/${userId()}`);
// user.value() · user.isLoading() · user.error()
```

C'était le chaînon manquant du puzzle signal : l'état synchrone était couvert, l'async restait à RxJS. Plus maintenant — RxJS redevient un **choix**, pas une obligation.

## OnPush devient le défaut (et zoneless reste le socle)

Le zoneless est le défaut des nouveaux projets **depuis la 21** — rien de neuf là-dessus. Ce que la 22 ajoute : **`OnPush` est désormais la stratégie de détection par défaut** des nouveaux composants. L'ancienne détection large (« CheckAlways ») devient l'exception à demander explicitement. Concrètement, un `ng new` produit aujourd'hui une app sans Zone.js, dont chaque composant généré est OnPush : des cycles de détection qui ne tournent que quand l'état change vraiment, et des stack traces enfin lisibles.

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

Pour les apps existantes : une migration **`migrate-karma-to-vitest`** est fournie par le CLI, et elle est rapide quand les tests sont écrits proprement (peu d'`async/done` à l'ancienne, peu de chronométrage Zone.js explicite). Les utilitaires `fakeAsync` restent pris en charge. En zoneless, le mantra de test devient `await fixture.whenStable()` plutôt que `tick()` — la détection est planifiée par les signals, pas par un drain de microtâches.

## Selectorless et @boundary : pas dans cette release

Deux morceaux très attendus manquent à l'appel :

- Le **selectorless** — utiliser un composant **sans le déclarer** dans `imports: [...]` — reste expérimental. Si tu lis un billet qui annonce le contraire, méfie-toi.
- Le bloc **`@boundary`** (frontières d'erreur dans les templates : un composant qui plante affiche un fallback au lieu d'emporter la page) est annoncé pour **v22.1 ou v23**, en developer preview.

:::callout{type="info"}
On en reparle quand ce sera stable. Pour l'instant, `imports: [...]` reste obligatoire — c'est l'un des derniers points d'inconfort résiduels des composants standalone.
:::

## Et le reste

Les nouveaux défauts et petites API qui méritent d'être mentionnés :

- **HttpClient passe sur `fetch`** par défaut (fini XMLHttpRequest) — meilleur streaming, meilleure interop edge/SSR.
- **Hydratation incrémentale par défaut** en SSR : les sous-arbres s'hydratent à la demande, sans configuration.
- **`strictTemplates` activé d'office** sur les nouveaux projets.
- **`@Service`** : décorateur raccourci pour `@Injectable({ providedIn: 'root' })`, et **`injectAsync()`** pour charger un service paresseusement via la DI.
- **Angular ARIA stable** : les primitives d'accessibilité de `@angular/aria` sortent de developer preview.
- **TypeScript 6 et Node 22 requis** — TS ≤ 5.9 n'est plus pris en charge.

## Décisions à prendre maintenant

Quatre choses concrètes :

1. **Vérifier TypeScript 6 + Node 22** avant tout `ng update` — c'est le prérequis bloquant de cette release.
2. **Passer les nouveaux projets en 22** ; ne plus créer d'app sur la 21 sauf cas particulier.
3. **Migrer un premier formulaire** en Signal Form sur une feature secondaire — l'API est stable, l'argument « attendre » est tombé.
4. **Planifier une journée zoneless** si ce n'est pas déjà fait : combien de composants ne sont pas `OnPush` ? Combien de `setTimeout` mutent un champ nu ? Tu sors avec un plan chiffré, pas avec une dette de plus.

## Le récap technique

Pour la version « références qu'on relit » plutôt que « ce qu'on en fait » : l'article [Angular 22 — ce qui a été livré + horizon v23](/angular/next/angular-22) liste les changements API par API. Cet article-ci est le complément narratif.
