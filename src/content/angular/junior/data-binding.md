---
title: "Data binding"
slug: "data-binding"
framework: "angular"
level: "junior"
order: 2
duration: 10
prerequisites: []
updated: 2026-05-22
seoTitle: "Data binding Angular — Guide Junior"
seoDescription: "Les 4 flèches du binding Angular : interpolation, property, event et two-way."
ogVariant: "sage"
related:
  - { framework: "react", slug: "jsx-basics" }
  - { framework: "vue", slug: "template-syntax" }
---

## Les quatre flèches

Le binding, c'est le contrat entre ta classe TypeScript et ton template. Il y a
quatre directions, et la syntaxe te dit laquelle d'un coup d'œil.

```html
<!-- 1. Interpolation : classe → vue (texte) -->
<h1>{{ title }}</h1>

<!-- 2. Property binding : classe → vue (propriété DOM) -->
<img [src]="avatarUrl" [alt]="name" />

<!-- 3. Event binding : vue → classe -->
<button (click)="save()">Enregistrer</button>

<!-- 4. Two-way : classe ↔ vue -->
<input [(ngModel)]="search" />
```

:::cheatsheet
- title: "{{ }}"
  desc: "Interpolation. Texte de la classe vers la vue."
- title: "[prop]"
  desc: "Property binding. Une valeur descend vers le DOM."
- title: "(event)"
  desc: "Event binding. Un événement remonte vers la classe."
- title: "[(ngModel)]"
  desc: "Two-way. La syntaxe « banana in a box » : [()] = [prop] + (event)."
:::

## Property ≠ attribut

Une erreur classique : confondre attribut HTML et propriété DOM. `[src]` lie une
**propriété**. Pour un vrai attribut (aria, data-, colspan), utilise `[attr.]`.

:::compare
::bad
```html
<td [colspan]="2">…</td>
```
::
::good
```html
<td [attr.colspan]="2">…</td>
```
::
:::

**Pourquoi** : `colspan` n'existe pas comme propriété DOM sur l'élément `<td>` — c'est uniquement un attribut HTML. `[colspan]` cherche donc une propriété inexistante et échoue ; `[attr.colspan]` écrit bien dans l'attribut. La règle : `[prop]` pour les propriétés du DOM, `[attr.]` pour ce qui n'existe que dans le HTML (aria, data-, colspan).

:::callout{type="tip"}
La syntaxe `[(…)]` — surnommée « banana in a box » en anglais, car les `()`
(la banane) sont nichés dans les `[]` (la boîte) — n'a rien de magique : c'est
juste un property binding **et** un event binding sur la même ligne. Tout
composant qui expose `value` + `valueChange` fonctionne avec `[()]`.
:::
