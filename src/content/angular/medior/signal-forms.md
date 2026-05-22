---
title: "Signal Forms"
slug: "signal-forms"
framework: "angular"
level: "medior"
order: 8
duration: 17
prerequisites: ["forms-basics", "signals"]
updated: 2026-05-22
seoTitle: "Angular Signal Forms — guide Medior"
seoDescription: "Les Signal Forms (developer preview) : form(), Field, schémas de validation par signaux et interop avec les Reactive Forms."
ogVariant: "gold"
related:
  - { framework: "react", slug: "forms-libs" }
  - { framework: "vue", slug: "forms-basics" }
---

## Statut : developer preview

Les **Signal Forms** vivent dans `@angular/forms/signals`. C'est une *developer
preview* : l'API publique peut changer entre deux mineures, les noms de fonctions
et la forme des schémas ne sont pas figés. On ne migre pas une appli de prod
dessus aujourd'hui — on l'évalue, on prototype.

:::callout{type="warn"}
Tant que l'API est en preview, traite chaque montée de version mineure comme une
*breaking change* potentielle. Verrouille la version d'Angular et lis le
CHANGELOG de `@angular/forms` avant de bumper.
:::

L'idée centrale : un formulaire n'est plus un arbre d'objets `FormControl`
opaques, mais un **modèle adossé à des signaux**. Tu tiens un signal de données,
`form()` t'en dérive un arbre de champs réactifs.

```ts
import { signal } from '@angular/core';
import { form } from '@angular/forms/signals';

const model = signal({ email: '', age: 0 });
const f = form(model);

// lecture réactive
f.email().value();   // ''
f.age().value();     // 0
```

## form() et le binding via [control]

`form()` produit un arbre de `Field`. Chaque champ expose des signaux : `value()`,
`valid()`, `touched()`, `errors()`. Dans le template, on relie un input natif au
champ avec la directive `[control]` — pas de `formControlName`, pas de
`FormGroup` à déclarer.

```ts
@Component({
  imports: [Control],
  template: `
    <input [control]="f.email" />
    @if (f.email().touched() && !f.email().valid()) {
      <span>{{ f.email().errors()[0]?.message }}</span>
    }
  `,
})
export class SignupForm {
  protected readonly f = form(this.model);
}
```

:::cheatsheet
- title: "form(modelSignal)"
  desc: "Dérive un arbre de Field depuis un signal de données."
- title: "field().value()"
  desc: "Signal de la valeur courante du champ, en lecture/écriture."
- title: "field().valid() / errors()"
  desc: "État de validation dérivé, recalculé quand la valeur change."
- title: "[control]=\"f.x\""
  desc: "Relie un élément de formulaire natif au Field correspondant."
:::

## Validation par schéma

La validation se déclare comme un **schéma** appliqué au formulaire. Les règles
(`required`, `min`, validateurs custom) sont des fonctions qui lisent les signaux
du champ — donc elles réagissent automatiquement aux changements, sans
`updateValueAndValidity` à appeler à la main.

```ts
import { form, required, min, validate } from '@angular/forms/signals';

const f = form(model, (path) => {
  required(path.email, { message: 'Email requis' });
  min(path.age, 18, { message: 'Majeur uniquement' });
  validate(path.email, ({ value }) =>
    value().includes('@') ? null : { kind: 'format', message: 'Format invalide' },
  );
});
```

Le schéma reçoit un *path* typé : tu cibles `path.email`, le compilateur vérifie
que le champ existe. La validité de l'ensemble remonte dans `f().valid()`.

## Reactive Forms vs Signal Form

:::compare
::bad
```ts
form = new FormGroup({
  email: new FormControl('', { validators: [Validators.required, Validators.email] }),
  age: new FormControl(0, { validators: [Validators.min(18)] }),
});
// lecture : this.form.value, this.form.get('email')?.errors
// MAJ : this.form.patchValue(...), souscriptions valueChanges
```
::
::good
```ts
model = signal({ email: '', age: 0 });
f = form(this.model, (path) => {
  required(path.email);
  min(path.age, 18);
});
// lecture réactive : this.f.email().value(), this.f.email().errors()
```
::
:::

**Pourquoi** : avec les Reactive Forms, la source de vérité est l'objet
`FormGroup` interne, désynchronisé de ton modèle de données ; tu observes les
changements via `valueChanges` (un Observable) et tu pousses les valeurs avec
`patchValue`. La Signal Form inverse la dépendance : ton signal de données *est*
la source de vérité, le formulaire en est une projection réactive. Plus de double
état à synchroniser, plus de souscriptions RxJS à gérer pour lire la validité.

### Idée reçue : « ça remplace déjà les Reactive Forms »

Non. Tant que l'API est en developer preview, les Reactive Forms restent la
solution stable et supportée pour la production. Les Signal Forms ne couvrent pas
encore tous les cas (intégrations tierces, `FormArray` dynamiques avancés,
écosystème de validateurs existant). C'est une direction, pas un remplacement
immédiat. L'interop existe pour cohabiter, pas pour réécrire l'existant du jour
au lendemain.

:::callout{type="tip"}
Pour expérimenter sans casser l'existant : isole une feature secondaire (un
formulaire de filtre, une recherche) dans un signal form, garde tes écrans
critiques en Reactive Forms. Tu mesures l'ergonomie sans risque.
:::
