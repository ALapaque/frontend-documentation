---
title: "Frontières d'erreur : @boundary et error boundaries de route"
slug: "error-boundaries"
framework: "angular"
level: "medior"
order: 14
duration: 15
prerequisites: ["control-flow", "routing-basics"]
updated: 2026-11-27
seoTitle: "Angular @boundary et errorComponent — frontières d'erreur de template et de route"
seoDescription: "Les trois étages de gestion d'erreur d'Angular 22 : @boundary dans le template, errorComponent et withErrorBoundaries() côté routeur, ErrorHandler en dernier filet. Périmètre vue contre navigation, pièges et télémétrie, le tout en developer preview."
ogVariant: "gold"
related:
  - { framework: "angular", slug: "router-resources" }
  - { framework: "angular", slug: "angular-22" }
  - { framework: "angular", slug: "defer-lazy" }
  - { framework: "architecture", slug: "error-handling" }
---

Jusqu'à la 22.2, une exception levée pendant le rendu d'un composant Angular
n'avait qu'une issue : l'`ErrorHandler` global. Il journalise, mais il ne remplace
rien à l'écran — pour afficher un repli, il fallait gérer un état d'erreur à la
main, zone par zone. Rien de comparable aux Error Boundaries de React.

Deux minors ont comblé le manque : la **22.2** (23 septembre 2026) ajoute le bloc
`@boundary` dans les templates, la **22.3** (18 novembre 2026) son pendant côté
routeur, `errorComponent`. La syntaxe s'apprend vite. Ce qui demande de l'attention,
c'est le **périmètre** : quelle erreur atterrit à quel étage, et lesquelles à aucun.

:::callout{type="warn"}
**Developer preview** (novembre 2026) : `@boundary` depuis la 22.2, les error
boundaries du routeur depuis la 22.3. Une API en developer preview peut changer à
tout moment, y compris dans un patch. Les comportements décrits ici ont été
vérifiés sur la 22.3.0.
:::

## Trois étages, du plus local au plus global

| Étage | Où il se déclare | Ce qu'il remplace à l'écran |
| --- | --- | --- |
| `@boundary` / `@error` | dans un template | la zone entourée |
| `errorComponent` | sur une route | le contenu du `<router-outlet>` |
| `ErrorHandler` | dans les providers | rien : il journalise |

Une erreur de rendu remonte de vue en vue et s'arrête à la **première frontière
rencontrée** : un `@boundary` placé dans une page passe avant l'`errorComponent`
de sa route. Si personne ne la prend, elle finit dans `ErrorHandler.handleError`.

## `@boundary` : contenir une zone du template

[Angular 22](/angular/next/angular-22) montre la forme minimale. La forme complète :

```html
@boundary {
  <app-graphique-ventes [periode]="periode()" />
} @error (let err; reset = $reset; when estErreurReseau(err)) {
  <p>Connexion perdue.</p>
  <button (click)="reset()">Réessayer</button>
} @error {
  <p>Graphique indisponible : {{ $error.message }}</p>
}
```

- `$error` et `$reset` sont implicites dans chaque bloc `@error` ; tu peux les
  renommer (`let err`, `reset = $reset`).
- Les clauses `when` sont évaluées **dans l'ordre** quand l'erreur est attrapée :
  la première qui renvoie vrai gagne. Du plus spécifique au plus général.
- `$reset()` retente le rendu du contenu d'origine. Il ne répare rien : si la cause
  est toujours là, tu retombes dans `@error`.
- **Termine toujours par un `@error` sans `when`.** Si aucune clause ne correspond,
  la zone reste vide et l'erreur ressort du bloc sous la forme d'une
  `BoundaryError` : tu as perdu le contenu **et** le repli.

Ne confonds pas avec le `@error` de `@defer`, qui couvre l'échec du *chargement*
du bloc différé (voir [@defer & lazy](/angular/medior/defer-lazy)), pas le rendu.

## Côté routeur : `errorComponent` et `withErrorBoundaries()`

Même principe, une maille au-dessus : quand le composant d'une route plante, le
routeur affiche un autre composant **dans le même outlet**. Le layout parent et
les outlets voisins restent utilisables, et l'URL reste celle de la route demandée.

```ts
export const routes: Routes = [
  { path: 'produits/:id', component: FicheProduit, errorComponent: ErreurProduit },
];

provideRouter(
  routes,
  withComponentInputBinding(),
  withErrorBoundaries({
    defaultErrorComponent: ErreurGenerique,
    onError: (error, details) => inject(Telemetrie).signaler(error, details),
  }),
);
```

Le repli est un composant ordinaire. Son entrée `error` reçoit toujours l'erreur
attrapée, même si la route a un paramètre ou une donnée du même nom.

```ts
@Component({
  template: `
    <p>Produit {{ id() }} indisponible : {{ error()?.message }}</p>
    <button (click)="reessayer()">Réessayer</button>
  `,
})
export class ErreurProduit {
  private router = inject(Router);
  readonly error = input<Error>();
  readonly id = input<string>(); // paramètre de route, via withComponentInputBinding()

  reessayer() {
    this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: 'reload' });
  }
}
```

- **Sans `withErrorBoundaries()`, `errorComponent` est ignoré.** La 22.3 affiche
  un avertissement en mode dev, rien de plus.
- `defaultErrorComponent` sert aux routes qui n'ont pas le leur. Sans l'un ni
  l'autre, l'erreur continue vers l'`ErrorHandler`.
- `errorComponent` **ne se charge pas en lazy** : pas d'équivalent de
  `loadComponent`. Garde-le léger.
- **Pas de `$reset` ici** : pour retenter, il faut renaviguer. Une navigation vers
  la même URL est ignorée par défaut ; `onSameUrlNavigation: 'reload'` force le
  routeur à recréer le composant d'origine.

## Le périmètre : erreur de vue ou erreur de navigation ?

La distinction derrière la plupart des « mon `errorComponent` ne s'affiche pas » :

| L'erreur survient dans… | Nature | Qui la traite |
| --- | --- | --- |
| constructeur, injection, hooks, template, lecture d'une resource en erreur | vue | `@boundary` le plus proche, sinon `errorComponent` |
| guard, resolver, resource de route bloquante | navigation | `NavigationError`, `withNavigationErrorHandler` |
| gestionnaire d'événement, timer, promesse | hors rendu | ton code ; aucune frontière |

**Erreur de navigation.** Un guard, un resolver ou une
[resource de route](/angular/medior/router-resources) bloquante échouent **avant**
l'activation : l'outlet n'a rien à remplacer. Le routeur annule la navigation, émet
un `NavigationError`, et l'utilisateur reste sur la page d'où il venait. Le bon
endroit est `withNavigationErrorHandler()`, qui peut renvoyer un `RedirectCommand`.

**Erreur de vue.** Tout ce qui casse pendant la création ou le rendu. Cas subtil :
une `resource()` du composant dont le `loader` échoue ne lève rien, elle passe
dans l'état `error`. C'est la **lecture de `value()`** dans le template qui lève.
Si tu testes `error()` ou `hasValue()` avant de lire (voir
[resource() & httpResource()](/angular/medior/async-resource)), la frontière ne
voit rien.

**Hors rendu.** Un `(click)` qui lève dans un `@boundary` ne déclenche pas `@error` :
l'erreur part dans `handleError`, l'écran ne bouge pas. Même angle mort pour un
timer ou une promesse — voir le
[comparatif gestion des erreurs](/compare/error-handling).

## Quatre pièges

### Le contenu projeté n'est pas couvert

:::compare
::bad
```html
<!-- carte.html : la frontière entoure <ng-content> -->
@boundary {
  <ng-content />
} @error {
  <p>Contenu indisponible.</p>
}
```
::
::good
```html
<!-- tableau-de-bord.html : la frontière entoure la carte ET son contenu -->
@boundary {
  <app-carte><app-graphique-ventes /></app-carte>
} @error {
  <p>Contenu indisponible.</p>
}
```
::
:::

**Pourquoi.** Le contenu projeté appartient à la vue qui le **déclare**, pas à
celle qui le reçoit. L'erreur remonte la chaîne des vues de déclaration, pas
l'arbre DOM : elle passe du graphique au template du tableau de bord, sans jamais
traverser celui de la carte.

### Trois autres, plus courts

- **Une frontière ne se protège pas elle-même.** Une erreur levée dans un bloc
  `@error` file vers le `@boundary` englobant, ou vers l'`ErrorHandler` ; un
  `errorComponent` qui plante n'est pas rattrapé par l'outlet. Garde les replis
  bêtes : du texte, un bouton.
- **`canDeactivate` reçoit le composant d'erreur.** Quand l'`errorComponent` est
  affiché, les guards `canDeactivate` de la route s'exécutent quand même, avec
  **son** instance : teste `component instanceof EditionProduit` avant tout appel.
- **`RedirectCommand` passe aussi par la frontière.** Un composant peut en lever
  un, l'outlet lance la navigation. Mais l'`errorComponent`, s'il existe, s'affiche
  **pendant la transition**, et en 22.3 `onError` est appelé pour cette
  redirection aussi : écarte-la de ta télémétrie.

## Télémétrie : qui est prévenu ?

Une erreur attrapée reste une erreur que l'utilisateur a subie. Chaque étage a sa
propre sortie, et elles ne se recouvrent pas.

```ts
@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private telemetrie = inject(Telemetrie);
  handleError(error: unknown): void {
    this.telemetrie.signaler(error);                 // non attrapée
  }
  onViewError(error: Error, details: ErrorDetails): void {
    this.telemetrie.signalerRepli(error, details);   // attrapée par un @boundary
  }
}
```

- **`@boundary`** appelle `onViewError` s'il existe, **sinon `handleError`** : sans
  ce hook optionnel, tes erreurs contenues se mélangent aux vrais plantages.
  `details` désigne le composant fautif (`declarationType`) et la frontière
  (`boundary`, avec sa fonction `reset`).
- **Frontière de route** : la sortie est l'option `onError`, exécutée dans le
  contexte d'injection racine. En 22.3, une erreur remplacée par un
  `errorComponent` ne passe **pas** par l'`ErrorHandler` : sans `onError`, elle
  est silencieuse.
- **Rendu programmatique** : `createComponent()` et
  `ViewContainerRef.createComponent()` acceptent une option `onError`, équivalent
  du bloc `@error` — sauf pour le constructeur, dont l'erreur est levée à l'appel.

## Developer preview : par où commencer

- **Le filet de route d'abord** : `withErrorBoundaries()` avec un
  `defaultErrorComponent` et un `onError`. Toute erreur de rendu sous un
  `<router-outlet>` obtient un repli, et c'est facile à retirer si l'API bouge.
- **`@boundary` autour des zones indépendantes** (un widget, un graphique), pas
  autour de la page entière.
- **Les états explicites pour l'attendu** : un 404 se traite avec `error()` d'une
  resource, la frontière est pour l'imprévu — voir
  [Gérer les erreurs comme une architecture](/architecture/medior/error-handling).
- **Une surface concentrée** : un ou deux replis partagés, les prédicats `when` au
  même endroit. Si une signature change avant la v23 (vers juin 2027), tu corriges
  un fichier.

## À retenir

Angular a désormais un modèle complet de frontières d'erreur, mais chaque étage a
un périmètre étroit. Avant d'en poser une, demande-toi **à quel moment** l'erreur
survient : c'est ça qui décide de qui l'attrape.

:::cheatsheet
- title: "@boundary { } @error { }"
  desc: "Remplace une zone du template. $error, $reset(), clauses when dans l'ordre ; toujours finir par un @error sans when."
- title: "errorComponent + withErrorBoundaries()"
  desc: "Remplace le contenu de l'outlet. Ignoré sans la feature, non lazy, entrée error, pas de reset : on renavigue."
- title: "Vue contre navigation"
  desc: "Guards, resolvers et resources bloquantes échouent avant l'activation : NavigationError et withNavigationErrorHandler, pas errorComponent."
- title: "Hors périmètre"
  desc: "Contenu projeté, gestionnaires d'événements, asynchrone, et les erreurs du repli lui-même. L'ErrorHandler reste le dernier filet."
- title: "Télémétrie"
  desc: "@boundary : ErrorHandler.onViewError, sinon handleError. Route : option onError de withErrorBoundaries, et rien d'autre."
:::
