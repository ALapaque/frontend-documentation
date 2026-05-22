---
title: "ControlValueAccessor"
slug: "cva"
framework: "angular"
level: "medior"
order: 7
duration: 16
prerequisites: ["forms-basics"]
updated: 2026-05-22
seoTitle: "ControlValueAccessor — angular"
seoDescription: "Le CVA démystifié : writeValue, registerOnChange, registerOnTouched, setDisabledState et le provider NG_VALUE_ACCESSOR pour brancher un input custom sur ngModel et formControl."
ogVariant: "gold"
related:
  - framework: "react"
    slug: "forms-libs"
  - framework: "vue"
    slug: "forms-basics"
---

## Le rôle du ControlValueAccessor

Angular ne sait pas, par défaut, lire ou écrire la valeur d'un composant custom. Le `ControlValueAccessor` (CVA) est le contrat qui relie un composant à l'API de formulaires : il traduit dans les deux sens entre le `FormControl` (le modèle) et l'état interne du composant (la vue).

La métaphore : le CVA est un adaptateur de prise. Le `FormControl` parle une langue (valeur, validité, disabled) ; votre composant en parle une autre. Le CVA fait la conversion pour que `[(ngModel)]` ou `formControlName` fonctionnent sur votre composant comme sur un `<input>` natif.

Quatre méthodes à implémenter :

| Méthode | Sens | Rôle |
|---|---|---|
| `writeValue(v)` | modèle → vue | le form pousse une valeur dans le composant |
| `registerOnChange(fn)` | vue → modèle | le composant remonte ses changements |
| `registerOnTouched(fn)` | vue → modèle | le composant signale le blur (touched) |
| `setDisabledState(d)` | modèle → vue | le form active/désactive le composant |

## Implémentation minimale

Un toggle custom branché aux formulaires.

```ts
import { Component, signal, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-toggle',
  template: `
    <button type="button" (click)="toggle()" [disabled]="disabled()">
      {{ value() ? 'ON' : 'OFF' }}
    </button>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleComponent),
      multi: true,
    },
  ],
})
export class ToggleComponent implements ControlValueAccessor {
  value = signal(false);
  disabled = signal(false);

  private onChange: (v: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: boolean): void {
    this.value.set(!!v);
  }
  registerOnChange(fn: (v: boolean) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  toggle(): void {
    if (this.disabled()) return;
    this.value.update((v) => !v);
    this.onChange(this.value());
    this.onTouched();
  }
}
```

L'usage devient transparent, en reactive comme en template-driven :

```html
<app-toggle [formControl]="notifications" />
<app-toggle [(ngModel)]="darkMode" name="dark" />
```

## Le provider NG_VALUE_ACCESSOR

:::compare
::bad
```ts
@Component({ selector: 'app-toggle', /* ... */ })
export class ToggleComponent implements ControlValueAccessor {
  // implémente le contrat mais n'est pas enregistré
}
```
::
::good
```ts
@Component({
  selector: 'app-toggle',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleComponent),
      multi: true,
    },
  ],
})
export class ToggleComponent implements ControlValueAccessor {}
```
::
:::

**Pourquoi** : implémenter l'interface ne suffit pas — `implements ControlValueAccessor` n'est qu'un contrat de type effacé à la compilation. La directive `formControlName`/`ngModel` cherche au runtime, via DI, le token `NG_VALUE_ACCESSOR` sur l'élément hôte. Sans le provider, elle ne trouve aucun accessor et lève « No value accessor for form control ». Le `multi: true` est requis car le token est un multi-provider (plusieurs accessors possibles). Le `forwardRef` est nécessaire parce qu'on référence la classe dans son propre décorateur, avant qu'elle ne soit définie.

## Idée reçue : « il faut implémenter setDisabledState »

`setDisabledState` est **optionnel** dans l'interface, mais l'ignorer casse silencieusement `control.disable()` : votre composant restera interactif alors que le modèle le croit désactivé, et il pourra émettre des valeurs sur un contrôle désactivé. De même, beaucoup oublient `onTouched` : sans appel à `this.onTouched()` au blur, l'état `touched` n'est jamais positionné, donc les messages d'erreur conditionnés à `control.touched` ne s'affichent jamais. Le contrat n'est pas « les méthodes obligatoires » mais « les quatre comportements que l'utilisateur attend d'un champ natif ».

:::callout{type="tip"}
Vous pouvez écrire le provider en une ligne avec un helper réutilisable, mais préférez ajouter la **validation** via un second provider `NG_VALIDATORS` (`Validator`) plutôt que de mélanger validité et accès à la valeur dans le CVA.
:::

:::cheatsheet
- title: "writeValue(v)"
  desc: "Le formulaire écrit une valeur dans le composant (modèle → vue)."
- title: "registerOnChange(fn)"
  desc: "Stocke le callback à appeler quand la vue change."
- title: "registerOnTouched(fn)"
  desc: "Callback à appeler au blur pour marquer touched."
- title: "NG_VALUE_ACCESSOR + multi:true"
  desc: "Enregistre l'accessor via DI ; sans lui, 'No value accessor'."
:::
