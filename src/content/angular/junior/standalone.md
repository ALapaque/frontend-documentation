---
title: "Standalone vs NgModule"
slug: "standalone"
framework: "angular"
level: "junior"
order: 3
duration: 12
prerequisites: ["data-binding"]
updated: 2026-05-22
seoTitle: "Standalone vs NgModule — angular"
seoDescription: "Comprendre les standalone components, bootstrapApplication, les imports directs sur le composant et migrer un projet NgModule sans casse."
ogVariant: "sage"
related:
  - framework: "vue"
    slug: "components-props"
---

## Le modèle standalone en une phrase

Un composant standalone déclare lui-même ce dont il a besoin. Plus de `NgModule` pour faire l'intermédiaire : le composant porte la propriété `standalone` (implicite depuis Angular 19) et un tableau `imports` qui liste les autres composants, directives et pipes qu'il utilise dans son template.

La métaphore : un `NgModule`, c'est une boîte à outils partagée que toute une équipe se passe. Le standalone, c'est chaque ouvrier qui porte sa propre ceinture avec exactement les outils qu'il utilise. On voit immédiatement qui dépend de quoi.

```ts
import { Component } from '@angular/core';
import { UserCardComponent } from './user-card.component';

@Component({
  selector: 'app-user-list',
  imports: [UserCardComponent],
  template: `
    @for (user of users; track user.id) {
      <app-user-card [user]="user" />
    }
  `,
})
export class UserListComponent {
  users = [{ id: 1, name: 'Ada' }];
}
```

## Bootstrapper sans AppModule

Une application standalone démarre avec `bootstrapApplication`. Les providers globaux (router, HTTP, etc.) passent dans `providers`, via des fonctions `provide*`.

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
  ],
});
```

## Declarations vs imports

:::compare
::bad
```ts
@NgModule({
  declarations: [UserListComponent, UserCardComponent],
  imports: [CommonModule, RouterModule],
  exports: [UserListComponent],
})
export class UserModule {}
```
::
::good
```ts
@Component({
  selector: 'app-user-list',
  imports: [UserCardComponent, RouterLink],
  template: `...`,
})
export class UserListComponent {}
```
::
:::

**Pourquoi** : dans le modèle NgModule, `UserCardComponent` est rendu visible à `UserListComponent` parce qu'ils sont déclarés dans le même module ; la dépendance est implicite et globale au module. Avec standalone, `UserListComponent` importe explicitement `UserCardComponent`. Le compilateur connaît le graphe exact de dépendances par composant, ce qui permet un tree-shaking précis : un composant jamais importé n'entre pas dans le bundle. Le `CommonModule` disparaît aussi, car `@if`/`@for` sont des constructions du langage de template, pas des directives à importer.

## Migrer un projet existant

Le schematic officiel fait le gros du travail en trois passes : conversion des composants en standalone, suppression des NgModules devenus inutiles, puis bascule du bootstrap.

```bash
ng generate @angular/core:standalone
```

:::callout{type="warn"}
Lance les trois étapes dans l'ordre proposé et committe entre chaque. La dernière passe touche `main.ts` et le bootstrap : c'est la plus structurante, isole-la.
:::

:::cheatsheet
- title: "imports"
  desc: "Liste les composants/directives/pipes utilisés dans le template."
- title: "bootstrapApplication"
  desc: "Remplace platformBrowserDynamic().bootstrapModule()."
- title: "provideX()"
  desc: "Fonctions de configuration des providers globaux (router, http...)."
- title: "ng g @angular/core:standalone"
  desc: "Schematic de migration automatique en 3 passes."
:::
