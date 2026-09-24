---
title: "Router Resources : charger les données de route"
slug: "router-resources"
framework: "angular"
level: "medior"
order: 13
duration: 15
prerequisites: ["async-resource", "routing-basics"]
updated: 2026-09-24
seoTitle: "Angular Router Resources — remplacer les resolvers par resource() (developer preview)"
seoDescription: "La propriété resources d'une route branche resource() sur le routeur Angular : chargement en parallèle au lieu du séquentiel des resolvers, nonBlocking() pour afficher un squelette, reload() sans renaviguer, et params réactifs. Statut developer preview depuis la 22.2."
ogVariant: "crimson"
related:
  - { framework: "angular", slug: "async-resource" }
  - { framework: "angular", slug: "router-navigation-api" }
---

Charger les données d'une route en Angular passait jusqu'ici par un **resolver** :
une fonction exécutée avant l'activation, dont le résultat atterrit dans
`ActivatedRoute.data`. Ça marche, mais deux défauts collent à ce modèle. Les
resolvers d'une hiérarchie s'exécutent **en séquence**, du parent vers l'enfant —
la navigation attend la somme de leurs temps. Et le résultat est une valeur
figée : pour la rafraîchir, il faut renaviguer.

Angular 22.2 introduit une alternative bâtie sur les signals : la propriété
**`resources`** d'une route, qui branche `resource()` directement sur le routeur.

:::callout{type="warn"}
**Developer preview** depuis la 22.2 (septembre 2026). L'API est utilisable et
documentée, mais peut encore bouger avant sa stabilisation, attendue en **v23 —
c'est-à-dire juin 2027**, depuis qu'Angular est passé à une major par an. Le
retour d'expérience est activement collecté sur le dépôt Angular : c'est une
fenêtre longue, pendant laquelle des signatures peuvent changer. Évite de bâtir
une migration massive dessus pour l'instant.
:::

## Activer et déclarer

Deux fonctions de configuration sont nécessaires : `withRouterResources()` pour
la fonctionnalité, et `withComponentInputBinding()` pour que le routeur injecte
les résultats dans les entrées du composant.

```ts
import { provideRouter, withComponentInputBinding, withRouterResources } from '@angular/router';

bootstrapApplication(App, {
  providers: [provideRouter(routes, withComponentInputBinding(), withRouterResources())],
});
```

La route déclare ensuite ses ressources dans une fonction qui reçoit un
**contexte** :

```ts
const routes: Routes = [
  {
    path: 'utilisateur/:id',
    component: ProfilUtilisateur,
    resources: (ctx) => {
      const service = inject(UtilisateurService);
      return {
        utilisateur: resource({
          params: () => ctx.params()['id'],
          loader: ({ params: id }) => service.getUtilisateur(id),
        }),
      };
    },
  },
];
```

Le contexte expose `params`, `queryParams`, `fragment` et `data` — **tous des
signals**. C'est le point décisif : la ressource ne reçoit pas un instantané des
paramètres, elle s'y **abonne**.

## Ce que le composant reçoit

Par défaut une ressource est **bloquante** : le routeur attend qu'elle soit
résolue avant d'activer la route, et injecte directement **la valeur**.

```ts
@Component({
  template: `<p>Utilisateur : {{ utilisateur().name }}</p>`,
})
export class ProfilUtilisateur {
  utilisateur = input.required<Utilisateur>();   // la valeur, pas la Resource
}
```

Pas d'état `loading` à gérer dans le composant : s'il est à l'écran, la donnée
est là. C'est le comportement d'un resolver, en mieux typé.

## `nonBlocking()` : activer tout de suite

Une donnée secondaire et lente — un rapport, des statistiques — ne devrait pas
retarder l'affichage de la page. `nonBlocking()` inverse le contrat :

```ts
resources: () => ({
  rapport: nonBlocking(
    resource({ loader: () => chargerRapportLourd() }),
  ),
}),
```

Le routeur **active le composant immédiatement** et lui injecte cette fois la
`Resource<T>` complète, avec ses signals d'état :

```ts
@Component({
  template: `
    @if (rapport().isLoading()) {
      <app-squelette />
    } @else if (rapport().error()) {
      <p>Rapport indisponible.</p>
    } @else {
      <app-rapport [donnees]="rapport().value()" />
    }
  `,
})
export class TableauDeBord {
  rapport = input.required<Resource<Rapport>>();
}
```

:::callout{type="tip"}
Retiens la règle de décision : **bloquant** pour ce sans quoi la page n'a aucun
sens (l'utilisateur sur sa fiche), **non bloquant** pour ce qui enrichit
(statistiques, recommandations, historique). C'est le même arbitrage qu'entre un
rendu serveur et un îlot différé, exprimé au niveau de la route.
:::

## Le vrai gain : le parallélisme

C'est l'argument qui justifie à lui seul le changement de modèle.

:::compare
::bad
```ts
// Resolvers : exécution SÉQUENTIELLE parent -> enfant.
// 300ms + 250ms + 400ms = la navigation attend ~950ms.
{ path: 'org/:id', resolve: { org: orgResolver },        // 300ms
  children: [{ path: 'equipe/:eid', resolve: { equipe: equipeResolver },  // 250ms
    children: [{ path: 'membre/:mid', resolve: { membre: membreResolver } }] }] }  // 400ms
```
::
::good
```ts
// Route resources : toutes les routes appariées chargent EN PARALLÈLE.
// max(300, 250, 400) = la navigation attend ~400ms.
{ path: 'org/:id', resources: (ctx) => ({ org: resource({ /* … */ }) }),
  children: [{ path: 'equipe/:eid', resources: (ctx) => ({ equipe: resource({ /* … */ }) }),
    children: [{ path: 'membre/:mid', resources: (ctx) => ({ membre: resource({ /* … */ }) }) }] }] }
```
::
:::

**Pourquoi c'était séquentiel avant.** Un resolver enfant pouvait légitimement
dépendre du résultat de son parent, donc le routeur les enchaînait par sécurité.
Les route resources font le pari inverse : les chargements sont indépendants par
défaut, et une dépendance réelle s'exprime par les signals du contexte plutôt que
par l'ordre d'exécution. Sur une hiérarchie profonde, la navigation passe de la
**somme** des latences à leur **maximum**.

## Rafraîchir sans renaviguer

Un resolver figé imposait un `router.navigate()` — donc de rejouer les guards et
le *matching* de route — juste pour recharger des données. Deux voies plus
directes existent maintenant.

```ts
export class ProfilUtilisateur {
  private ressource = inject(ActivatedRoute).resources?.['utilisateur'];

  rafraichir() {
    this.ressource?.reload();
  }
}
```

Ou, plus idiomatique encore : **modifier un signal lu par `params`**. La
ressource se réexécute d'elle-même, sans aucun appel impératif.

```ts
const filtre = signal<'actifs' | 'tous'>('actifs');

resources: (ctx) => ({
  membres: resource({
    params: () => ({ id: ctx.params()['id'], filtre: filtre() }),
    loader: ({ params }) => service.getMembres(params),
  }),
}),
```

**Pourquoi.** La ressource déclare ses dépendances réactives dans `params` ; tout
changement de l'une d'elles relance le `loader`. Le rechargement cesse d'être une
action à déclencher pour devenir une conséquence de l'état — c'est exactement la
promesse des signals, appliquée à la couche routage.

## Rediriger depuis une resource

La 22.2 apporte un complément direct : **`RedirectCommand` peut être levé** —
depuis un guard, un resolver, et donc aussi depuis le `loader` d'une resource.

```ts
resources: (ctx) => {
  const router = inject(Router);
  const service = inject(UtilisateurService);
  return {
    utilisateur: resource({
      params: () => ctx.params()['id'],
      loader: async ({ params: id }) => {
        const u = await service.getUtilisateur(id);
        if (!u) throw new RedirectCommand(router.parseUrl('/introuvable'));
        return u;
      },
    }),
  };
},
```

**Pourquoi c'est mieux qu'un `router.navigate()` dans le loader.** Lever une
commande laisse le routeur **annuler proprement** la navigation en cours et en
démarrer une autre, au lieu de superposer deux navigations concurrentes. C'est le
même modèle que SvelteKit ou Next.js : la redirection est une *valeur levée*, pas
un effet de bord glissé au milieu d'un chargement.

## Ce qu'il faut savoir avant d'y aller

- Les guards restent les guards : les resources ne remplacent **ni** `canActivate`,
  **ni** l'autorisation. Une ressource bloquante retarde l'affichage, elle ne
  protège rien.
- Une ressource bloquante en échec empêche l'activation de la route : prévois la
  gestion d'erreur de navigation, comme avec un resolver.
- Le typage des entrées dépend du mode : **valeur** en bloquant, **`Resource<T>`**
  en non bloquant. Les confondre est l'erreur de débutant sur cette API.
- `withComponentInputBinding()` est obligatoire pour la liaison automatique —
  sans lui, rien n'arrive dans le composant.

## À retenir

Les Router Resources remplacent un modèle impératif et séquentiel par un modèle
réactif et parallèle. Le gain principal n'est pas syntaxique : c'est la
**navigation qui attend le plus lent au lieu de la somme**, et des données qui se
rafraîchissent parce que l'état a changé, pas parce qu'on a renavigué. À suivre
de près, en gardant en tête le statut developer preview.

:::cheatsheet
- title: "withRouterResources()"
  desc: "À combiner avec withComponentInputBinding() dans provideRouter, sinon rien n'est injecté."
- title: "resources: (ctx) => ({ … })"
  desc: "ctx expose params, queryParams, fragment et data — en signals, donc la ressource s'y abonne."
- title: "Bloquant (défaut)"
  desc: "Le routeur attend et injecte LA VALEUR. Pas d'état loading à gérer dans le composant."
- title: "nonBlocking()"
  desc: "Active la route tout de suite et injecte la Resource<T> : isLoading(), error(), value(), hasValue()."
- title: "Parallèle, pas séquentiel"
  desc: "Toutes les routes appariées chargent ensemble. La navigation attend le max, plus la somme."
- title: "reload() ou signal"
  desc: "ActivatedRoute.resources['x'].reload(), ou muter un signal lu par params. Sans renavigation."
- title: "RedirectCommand levable"
  desc: "throw new RedirectCommand(...) depuis un loader : le routeur annule proprement au lieu de superposer."
- title: "Developer preview"
  desc: "Depuis la 22.2 ; stabilisation en v23, soit juin 2027 (cadence annuelle). L'API peut encore bouger."
:::
