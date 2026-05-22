---
title: "Control flow"
slug: "control-flow"
framework: "angular"
level: "junior"
order: 4
duration: 11
prerequisites: ["data-binding"]
updated: 2026-05-22
seoTitle: "Control flow Angular — @if @for @switch"
seoDescription: "Le control flow intégré @if / @for / @switch face aux anciennes directives structurelles."
ogVariant: "sage"
related:
  - { framework: "react", slug: "lists-keys" }
  - { framework: "vue", slug: "template-syntax" }
---

## Le bloc, pas la directive

Depuis Angular 17, le control flow est **intégré au compilateur**. Plus de
`*ngIf`, plus d'import de `CommonModule` : on écrit des blocs `@`.

```html
@if (user(); as u) {
  <p>Bonjour {{ u.name }}</p>
} @else {
  <a routerLink="/login">Se connecter</a>
}

@for (item of items(); track item.id) {
  <li>{{ item.label }}</li>
} @empty {
  <li>Liste vide</li>
}
```

## `track` n'est plus optionnel

Dans `@for`, `track` est **obligatoire** — et c'est une bonne chose. Il dit à
Angular comment identifier une ligne pour ne re-rendre que ce qui change.

:::compare
::bad
```html
<!-- ancien : pas de tracking → tout est recréé -->
<li *ngFor="let u of users">{{ u.name }}</li>
```
::
::good
```html
@for (u of users(); track u.id) {
  <li>{{ u.name }}</li>
}
```
::
:::

**Pourquoi** : sans `track`, Angular ne sait pas relier un élément du DOM à une donnée d'un rendu à l'autre — il détruit et recrée toutes les lignes à chaque changement de la collection. Avec `track u.id`, il identifie chaque ligne par sa clé et ne touche que les nœuds réellement ajoutés, supprimés ou déplacés. Gain de perf direct et préservation de l'état du DOM (focus, scroll, animations).

:::callout{type="warn"}
Ne `track`e pas par `$index` si la liste est réordonnable : tu perds le bénéfice
du suivi (Angular croit que chaque position est une entité stable). `track` par
un identifiant métier.
:::

## @switch

```html
@switch (status()) {
  @case ('loading') { <app-spinner /> }
  @case ('error') { <app-error /> }
  @default { <app-content /> }
}
```

:::callout{type="tip"}
Les blocs `@` sont du vrai contrôle de flux, pas des directives : pas de
`<ng-template>` caché, pas de surcoût d'import. Migration automatique :
`ng generate @angular/core:control-flow`.
:::
