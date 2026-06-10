---
title: "Signal Forms"
slug: "signal-forms"
framework: "angular"
level: "medior"
order: 8
duration: 24
prerequisites: ["forms-basics", "signals"]
updated: 2026-06-10
seoTitle: "Angular Signal Forms — des bases à la validation avancée"
seoDescription: "Les Signal Forms : form(), Field, schémas de validation par signaux, interop avec les Reactive Forms, puis la partie avancée — validation croisée, tableaux dynamiques, validation serveur, schémas Zod et soumission."
ogVariant: "gold"
related:
  - { framework: "react", slug: "forms-libs" }
  - { framework: "vue", slug: "forms-basics" }
---

## Statut : stable depuis Angular 22

Les **Signal Forms** vivent dans `@angular/forms/signals`. Expérimentales en
v21, elles sont **stables depuis Angular 22** (juin 2026) : l'API publique est
figée et suit la politique de dépréciation standard du framework. Tu peux les
utiliser en production.

:::callout{type="info"}
Les **Reactive Forms ne sont pas dépréciés** : ils restent maintenus et il n'y a
pas d'urgence à migrer l'existant. La bascule pragmatique : nouveau formulaire =
Signal Form, migration de l'existant au fil des refontes d'écrans.
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

### Idée reçue : « il faut migrer tous les Reactive Forms »

Non. Les Signal Forms sont stables depuis la 22 et sont le bon défaut pour le
**nouveau** code — mais les Reactive Forms restent maintenus, et certaines
intégrations tierces (bibliothèques de composants, écosystème de validateurs
existant) parlent encore `FormControl`. L'interop existe pour cohabiter : on ne
réécrit pas l'existant du jour au lendemain, on migre au fil des refontes.

:::callout{type="tip"}
Pour démarrer sans risque : commence par une feature secondaire (un formulaire
de filtre, une recherche), mesure l'ergonomie en équipe, puis fais des Signal
Forms le standard des nouveaux écrans.
:::

---

## Avancé

Les bases ci-dessus suffisent pour un formulaire simple. En production, quatre
besoins reviennent : un champ qui en regarde un autre, des tableaux de taille
variable, une validation qui interroge le serveur, et une soumission qui recolle
les erreurs renvoyées par l'API. Les sections suivantes couvrent ces cas.

### Validation croisée : un champ qui en regarde un autre

« Confirmer le mot de passe » compare **deux** champs : la règle n'est pas locale.
Dans un validateur, `valueOf()` lit la valeur d'un autre champ du schéma.

```ts
import { form, validate } from '@angular/forms/signals';

const f = form(model, (path) => {
  validate(path.confirm, ({ value, valueOf }) =>
    value() === valueOf(path.password)
      ? null
      : { kind: 'mismatch', message: 'Les mots de passe diffèrent' },
  );
});
```

Quand l'erreur doit se **rattacher** à un autre champ que celui validé,
`validateTree` expose `fieldTree` pour cibler la destination de l'erreur. La règle
réagit toute seule : `valueOf` lit un signal, donc dès que `password` change, la
validation de `confirm` se réévalue — aucun `updateValueAndValidity`.

### Tableaux dynamiques : `applyEach`

L'équivalent du `FormArray` : appliquer un sous-schéma à **chaque** élément d'un
tableau, sans en connaître le nombre à l'avance.

```ts
import { form, required, min, applyEach } from '@angular/forms/signals';

const model = signal({ lignes: [{ produit: '', qte: 1 }] });
const f = form(model, (path) => {
  applyEach(path.lignes, (ligne) => {
    required(ligne.produit, { message: 'Produit requis' });
    min(ligne.qte, 1, { message: 'Quantité minimale : 1' });
  });
});

// Ajouter une ligne = muter le signal de données, le formulaire suit.
model.update((m) => ({ ...m, lignes: [...m.lignes, { produit: '', qte: 1 }] }));
```

La structure du formulaire **dérive** du modèle : ajouter ou retirer une ligne
mute le signal source, et l'arbre de `Field` + les validateurs de `applyEach` se
réappliquent. Plus de `FormArray.push()` / `removeAt()` à tenir en parallèle d'un
état de données séparé.

### Validation serveur : `validateHttp`

Certaines règles n'ont de réponse que côté serveur (« ce pseudo est-il pris ? »).
`validateHttp` déclare l'appel et expose un état **`pending()`** le temps de la
réponse.

```ts
import { validateHttp } from '@angular/forms/signals';

validateHttp(path.pseudo, {
  request: ({ value }) => `/api/pseudo-libre?u=${encodeURIComponent(value())}`,
  onSuccess: (res) => (res.pris ? { kind: 'taken', message: 'Pseudo déjà pris' } : null),
  onError: () => ({ kind: 'net', message: 'Vérification impossible' }),
});
```

:::callout{type="warn"}
Pendant l'appel, `field().pending()` est `true` et `field().valid()` renvoie
`false` — un formulaire en attente de validation serveur **n'est pas valide**.
Désactive le bouton de soumission sur `pending()`, et debounce : `validateHttp`
se redéclenche à chaque frappe.
:::

### Réutiliser un schéma serveur : `validateStandardSchema`

Tu as souvent déjà un schéma Zod (ou Valibot) décrivant le contrat de l'API —
généré depuis OpenAPI, ou partagé avec le back. Plutôt que de redéclarer les
règles, branche-le.

```ts
import { z } from 'zod';
import { form, validateStandardSchema } from '@angular/forms/signals';

const contrat = z.object({ email: z.email(), age: z.number().min(18) });
const f = form(model, (path) => validateStandardSchema(path, contrat));
```

Une seule source de vérité, partagée client/serveur : tu ne réécris pas
`required`/`min`/`email` en double. C'est aussi la clé des **formulaires
dynamiques** — un générateur qui lit un JSON Schema construit le `form()`
correspondant et valide directement contre ce schéma.

### Logique conditionnelle et soumission

Le schéma porte aussi la logique d'état : `disabled` (et ses cousins) prend une
fonction réactive, et l'helper `submit()` gère l'état de soumission en
**remappant** les erreurs serveur sur les bons champs.

```ts
import { form, disabled, required, submit } from '@angular/forms/signals';

const f = form(model, (path) => {
  required(path.siret, { when: ({ valueOf }) => valueOf(path.type) === 'entreprise' });
  disabled(path.siret, ({ valueOf }) => valueOf(path.type) !== 'entreprise');
});

async function onSubmit() {
  await submit(f, async (form) => {
    const res = await api.creerCompte(form().value());
    return res.ok ? null : [{ field: f.email, error: { kind: 'server', message: res.message } }];
  });
}
```

**Pourquoi.** Le piège classique : l'API rejette (« email déjà utilisé ») et on
affiche un toast déconnecté du champ fautif. `submit()` route l'erreur serveur
vers `f.email().errors()`, exactement comme une erreur locale — l'utilisateur la
voit là où il doit corriger.

:::callout{type="tip"}
Perf sur un gros formulaire : le coût n'est pas la validation (les signaux ne
recalculent que ce qui dépend du champ modifié) mais le **rendu**. Garde les
composants en `OnPush` et lis `f.champ().value()`, jamais `f().value()` dans le
template — lire la racine abonne la vue à *tout* le formulaire. Côté test, pas de
`fakeAsync` pour les règles synchrones : tu mutes le signal et tu lis l'état.
:::

:::cheatsheet
- title: "valueOf() — validation croisée"
  desc: "Lire un autre champ dans un validateur ; réagit seul (mots de passe, conditions)."
- title: "validateTree + fieldTree"
  desc: "Valider au niveau d'un groupe et rattacher l'erreur à un champ précis."
- title: "applyEach"
  desc: "Sous-schéma par élément d'un tableau ; le FormArray dérive du modèle."
- title: "validateHttp + pending()"
  desc: "Validation serveur async ; pending() → invalide, désactive la soumission et debounce."
- title: "validateStandardSchema"
  desc: "Brancher un schéma Zod/Valibot existant ; base des formulaires dynamiques."
- title: "disabled / when + submit()"
  desc: "Logique d'état dans le schéma ; submit() remappe les erreurs serveur sur les champs."
:::
