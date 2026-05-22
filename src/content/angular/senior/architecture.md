---
title: "Architecture"
slug: "architecture"
framework: "angular"
level: "senior"
order: 6
duration: 23
prerequisites: ["standalone", "dependency-injection"]
updated: 2026-05-22
seoTitle: "Architecture — angular"
seoDescription: "Feature folders, libs Nx, frontières applicatives par lint, scoping du state et découpage smart/dumb : structurer une application Angular qui tient à l'échelle."
ogVariant: "crimson"
related:
  - framework: "react"
    slug: "state-architecture"
  - framework: "vue"
    slug: "state-architecture"
---

## Découper par domaine, pas par type

L'erreur structurante est d'organiser le code par type technique (`/components`, `/services`, `/models`) : une modification fonctionnelle traverse alors tout l'arbre. Le découpage durable est par **domaine métier**, chaque feature étant autonome.

```
src/app/
  features/
    orders/        ← tout ce qui concerne les commandes
      data-access/ ← services, state, appels HTTP
      ui/          ← composants dumb, présentationnels
      feature/     ← composants smart, routés
    catalog/
  shared/          ← utilitaires sans logique métier
  core/            ← singletons d'app (config, interceptors)
```

Cette segmentation (`data-access` / `ui` / `feature` / `shared`) est l'unité de raisonnement : on sait où vit chaque chose et ce qui a le droit de dépendre de quoi.

## Libs Nx et frontières par lint

Dans un monorepo Nx, chaque segment devient une *lib* avec des tags. La règle `@nx/enforce-module-boundaries` transforme l'architecture en contrainte vérifiée à la compilation, pas en convention espérée.

```jsonc
// project.json d'une lib
{ "tags": ["scope:orders", "type:data-access"] }
```

```jsonc
// .eslintrc — frontières applicables
{
  "depConstraints": [
    { "sourceTag": "type:feature", "onlyDependOnLibsWithTags": ["type:ui", "type:data-access", "type:util"] },
    { "sourceTag": "type:ui", "onlyDependOnLibsWithTags": ["type:ui", "type:util"] },
    { "sourceTag": "scope:orders", "onlyDependOnLibsWithTags": ["scope:orders", "scope:shared"] }
  ]
}
```

:::callout{type="warn"}
Sans frontières outillées, l'architecture dérive en quelques mois : un composant UI finira par importer un service HTTP « juste pour ce cas ». Le lint est ce qui rend la règle réelle. Le graphe de dépendances (`nx graph`) sert d'audit visuel.
:::

## Smart vs dumb components

:::compare
::bad
```ts
@Component({
  selector: 'app-order-list',
  template: `@for (o of orders(); track o.id) { <div>{{ o.total }}</div> }`,
})
export class OrderListComponent {
  private http = inject(HttpClient);
  orders = toSignal(this.http.get<Order[]>('/api/orders'), { initialValue: [] });
}
```
::
::good
```ts
// dumb : ne connaît que ses inputs/outputs
@Component({
  selector: 'app-order-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (o of orders(); track o.id) {
    <button (click)="select.emit(o)">{{ o.total }}</button>
  }`,
})
export class OrderListComponent {
  orders = input.required<Order[]>();
  select = output<Order>();
}

// smart : orchestre les données, le routage, le state
@Component({
  selector: 'app-orders-page',
  template: `<app-order-list [orders]="orders()" (select)="open($event)" />`,
})
export class OrdersPageComponent {
  private store = inject(OrdersStore);
  orders = this.store.orders;
}
```
::
:::

**Pourquoi** : dans la version mêlée, le composant de présentation est couplé à la source de données (`HttpClient`, URL). Il devient impossible à réutiliser dans un autre contexte, difficile à tester (il faut mocker HTTP pour vérifier un rendu), et incompatible `OnPush` propre car son entrée n'est pas un input. En séparant, le dumb component ne dépend que d'inputs/outputs : il est `OnPush`-pur (revérifié seulement quand la référence d'`orders` change), testable par simple binding, et réutilisable. Le smart component concentre l'effet de bord (data-access, navigation, state) en un seul endroit identifiable. La frontière smart/dumb aligne le couplage sur la responsabilité.

## Scoping du state

Le state ne doit pas être globalement « root » par défaut. Le faire scoper sur la portée qui le concerne réduit la surface de bug et le couplage :

- **Composant** : un signal local (`signal`/`computed`) suffit pour l'état d'UI éphémère.
- **Feature** : un store fourni dans les `providers` de la route de feature (`provideX` au niveau route) vit et meurt avec la feature, sans polluer l'app.
- **App** : `providedIn: 'root'` réservé aux singletons vraiment transverses (auth, config).

```ts
// state à durée de vie = celle de la feature, libéré à la sortie de route
export const ordersRoutes: Routes = [
  {
    path: 'orders',
    providers: [OrdersStore], // pas providedIn:'root'
    loadComponent: () => import('./orders-page.component').then((m) => m.OrdersPageComponent),
  },
];
```

## Code source

Pour comprendre comment la portée des providers est réellement appliquée :

- La hiérarchie d'injecteurs (`EnvironmentInjector`, injecteurs de route) : `packages/core/src/di/r3_injector.ts`.
- Le rattachement d'injecteurs aux routes via `providers` : `packages/router/src/router_module.ts` et la résolution dans `packages/router/src/operators/`.
- Côté Nx, la règle de frontières est implémentée dans `packages/eslint-plugin/src/rules/enforce-module-boundaries.ts` du dépôt `nrwl/nx` : elle lit le graphe de projet et les tags pour valider chaque import.

Lire `r3_injector` éclaire pourquoi un store fourni au niveau route est bien détruit à la sortie : son `EnvironmentInjector` est lié au cycle de vie de la route, pas à l'injecteur racine.
