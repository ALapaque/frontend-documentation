---
title: "Forms : les bases"
slug: "forms-basics"
framework: "angular"
level: "junior"
order: 5
duration: 14
prerequisites: ["data-binding", "standalone"]
updated: 2026-05-22
seoTitle: "Forms : les bases — angular"
seoDescription: "Reactive vs Template-driven : FormControl, FormGroup, ngModel, et comment choisir la bonne approche pour démarrer proprement."
ogVariant: "sage"
related:
  - framework: "react"
    slug: "forms-basics"
  - framework: "vue"
    slug: "forms-basics"
---

## Deux approches, un même but

Angular propose deux familles de formulaires. Le **template-driven** met l'état dans le template via `ngModel`. Le **reactive** met l'état dans la classe via des objets `FormControl`. Les deux finissent par produire un modèle de données, mais l'endroit où vit la source de vérité change tout.

## Template-driven : ngModel

Rapide à écrire, le template-driven convient aux formulaires simples. Il faut importer `FormsModule`.

```ts
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <input [(ngModel)]="email" name="email" />
    <p>{{ email }}</p>
  `,
})
export class LoginComponent {
  email = '';
}
```

## Reactive : FormControl et FormGroup

Le modèle est construit dans la classe. On importe `ReactiveFormsModule`. Le `FormGroup` regroupe plusieurs contrôles, et la valeur est typée.

```ts
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <input formControlName="email" />
      <input formControlName="age" type="number" />
    </form>
    @if (form.controls.email.invalid && form.controls.email.touched) {
      <p>Email invalide</p>
    }
  `,
})
export class SignupComponent {
  form = new FormGroup({
    email: new FormControl('', { validators: [Validators.required, Validators.email] }),
    age: new FormControl(0),
  });
}
```

## Choisir : ngModel ou FormControl

:::compare
::bad
```ts
@Component({
  template: `<input [(ngModel)]="email" name="email" />`,
})
export class C {
  email = '';
  // validation, état pristine/dirty, valueChanges :
  // tout doit être lu depuis le template via une ref #f="ngForm"
}
```
::
::good
```ts
@Component({
  template: `<input [formControl]="email" />`,
})
export class C {
  email = new FormControl('');
  // form.value est typé string
  // email.valueChanges est un Observable testable
  // email.setValidators(...) programmatique
}
```
::
:::

**Pourquoi** : avec `ngModel`, l'état du contrôle (valeur, validité, dirty) n'existe que comme propriété du DOM dirigé par la directive ; pour y accéder en TypeScript il faut passer par une référence de template, ce qui rend le test et la logique conditionnelle indirects. Le `FormControl` reactive est un objet JavaScript de première classe : sa valeur est typée par inférence, ses changements sont exposés comme `Observable` via `valueChanges`, et on peut le manipuler (ajouter un validateur, désactiver, reset) sans toucher au DOM. À mesure que le formulaire grossit, cette source de vérité unique et observable évite la dispersion de logique dans le template.

:::callout{type="tip"}
Règle simple : un champ de recherche jetable ou un toggle isolé → template-driven. Tout formulaire avec validation croisée, étapes, ou valeurs dynamiques → reactive.
:::

:::cheatsheet
- title: "FormsModule"
  desc: "À importer pour ngModel (template-driven)."
- title: "ReactiveFormsModule"
  desc: "À importer pour FormControl/FormGroup (reactive)."
- title: "valueChanges"
  desc: "Observable émettant à chaque changement de valeur."
- title: "form.value"
  desc: "Snapshot typé de l'état courant du formulaire."
:::
