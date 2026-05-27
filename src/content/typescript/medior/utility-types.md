---
title: "Les utility types"
slug: "utility-types"
framework: "typescript"
level: "medior"
order: 3
duration: 16
prerequisites: ["generics", "interfaces-types"]
updated: 2026-05-23
seoTitle: "Utility types TypeScript — Partial, Pick, Record, ReturnType — Medior"
seoDescription: "Partial, Required, Readonly, Pick, Omit, Record, ReturnType, Parameters, Awaited, NonNullable, leur construction mapped/conditional et pourquoi dériver un type plutôt que le dupliquer."
ogVariant: "gold"
related:
  - { framework: "typescript", slug: "keyof-indexed" }
---

## Dériver plutôt que dupliquer

Les **utility types** sont des types génériques fournis par la bibliothèque standard qui
**transforment** un type en un autre. Leur intérêt profond n'est pas de t'éviter
de taper : c'est de garder une **source unique de vérité** (*single source of
truth*). Quand un type B est dérivé de A, modifier A propage automatiquement le
changement à B. Dupliquer, c'est créer deux vérités qui divergeront.

:::compare
::bad
```ts
interface User {
  id: string;
  nom: string;
  email: string;
}
// Copie manuelle pour un formulaire d'édition : divergera
interface UserEdit {
  nom: string;
  email: string;
}
```
::
::good
```ts
interface User {
  id: string;
  nom: string;
  email: string;
}
type UserEdit = Omit<User, "id">; // dérivé : suit User automatiquement
```
::
:::

**Pourquoi.** La copie `UserEdit` n'a aucun lien avec `User`. Le jour où tu
ajoutes `avatar` à `User`, rien ne te rappelle de toucher `UserEdit` : les deux
définitions **divergent en silence** et le bug n'apparaît qu'à l'usage.
`Omit<User, "id">` est **recalculé** par le compilateur à chaque vérification : il
contient toujours exactement les champs de `User` sauf `id`. Tu déplaces la
cohérence du domaine de la discipline humaine vers le **système de types**, qui ne
l'oublie jamais.

## Les transformateurs de présence et de mutabilité

Ces quatre-là agissent sur **tous** les champs d'un type. `Partial<T>` les rend
optionnels, `Required<T>` les rend obligatoires (retire `?`), `Readonly<T>` les
fige.

```ts
type T = { a: number; b?: string };

type P = Partial<T>;   // { a?: number; b?: string }
type R = Required<T>;  // { a: number; b: string }
type Ro = Readonly<T>; // { readonly a: number; readonly b?: string }
```

`Partial` est l'outil canonique du *patch* (mise à jour partielle) ; `Readonly`
encode l'immutabilité au niveau type sans coût runtime.

## Sélectionner et exclure des clés

`Pick<T, K>` garde un sous-ensemble de clés, `Omit<T, K>` retire un sous-ensemble.
Ils sont **complémentaires** : `Pick` part de rien et ajoute, `Omit` part de tout
et enlève.

```ts
type User = { id: string; nom: string; motDePasse: string };

type UserPublic = Omit<User, "motDePasse">; // sans le secret
type UserId = Pick<User, "id">;             // juste l'id
```

:::callout{type="warn"}
Subtile mais cruciale : `Pick` **valide** que les clés existent (`K extends
keyof T`), donc une faute de frappe est une erreur. `Omit`, lui, accepte
historiquement des clés **inconnues** sans broncher (sa signature utilise
`keyof any`). Un `Omit<User, "mot2passe">` ne retire rien et ne te prévient pas.
Quand tu veux la sécurité du « ces clés doivent exister », `Pick` ou un
`Exclude<keyof T, ...>` t'avertit là où `Omit` reste muet.
:::

## `Record` : construire un dictionnaire typé

`Record<K, V>` crée un type objet dont les clés sont l'union `K` et toutes les
valeurs de type `V`. C'est la façon idiomatique de typer une table de
correspondance.

```ts
type Role = "admin" | "editeur" | "lecteur";
type Permissions = Record<Role, boolean>;
// { admin: boolean; editeur: boolean; lecteur: boolean }

const p: Permissions = { admin: true, editeur: true, lecteur: false };
// oublier une clé est une erreur : l'union force l'exhaustivité
```

## Dériver depuis des valeurs : `ReturnType`, `Parameters`, `Awaited`

Ces utilitaires extraient des types depuis des **signatures de fonction**, ce qui
évite de redéclarer ce que le code décrit déjà. `ReturnType<F>` donne le retour,
`Parameters<F>` donne le tuple des paramètres, `Awaited<P>` déballe une `Promise`
(récursivement) pour obtenir la valeur résolue.

```ts
function creerUser(nom: string, age: number) {
  return { id: crypto.randomUUID(), nom, age };
}

type User = ReturnType<typeof creerUser>; // { id: string; nom: string; age: number }
type Args = Parameters<typeof creerUser>; // [nom: string, age: number]

type Reponse = Awaited<Promise<Promise<number>>>; // number (déballé en profondeur)
```

`NonNullable<T>` retire `null` et `undefined` d'un type, miroir typé d'un guard
`x != null`.

```ts
type Maybe = string | null | undefined;
type Sur = NonNullable<Maybe>; // string
```

## Comment ils sont construits

Aucun de ces types n'est « câblé » dans le compilateur : ils sont écrits en
TypeScript avec deux mécanismes. Les **mapped types** itèrent sur les clés
(`[K in keyof T]`) ; les **conditional types** branchent selon une relation
d'assignabilité (`T extends U ? X : Y`) et extraient avec `infer`.

```ts
// Mapped type : reconstruit T en rendant chaque champ optionnel
type MonPartial<T> = { [K in keyof T]?: T[K] };

// Conditional type + infer : capture le type de retour d'une fonction
type MonReturnType<F> = F extends (...a: any[]) => infer R ? R : never;

// NonNullable : conditional distributif sur l'union
type MonNonNullable<T> = T extends null | undefined ? never : T;
```

:::callout{type="info"}
Savoir qu'ils sont de simples mapped/conditional types change tout : tu peux
**composer** (`Partial<Pick<T, K>>`), créer les tiens quand la bibliothèque n'a pas le bon
(`Mutable<T>`, qui retire `readonly` via `-readonly`), et lire les messages
d'erreur sans paniquer. Un utility type est du code, pas une boîte noire.
:::

:::cheatsheet
- title: "Partial<T> / Required<T>"
  desc: "Rend tous les champs optionnels / obligatoires (ajoute ou retire ?)."
- title: "Readonly<T>"
  desc: "Fige tous les champs en readonly, immutabilité au niveau type."
- title: "Pick<T, K> / Omit<T, K>"
  desc: "Garde / retire des clés. Pick valide les clés, Omit reste muet sur l'inconnu."
- title: "Record<K, V>"
  desc: "Dictionnaire : clés = union K, valeurs = V. Force l'exhaustivité des clés."
- title: "ReturnType<F> / Parameters<F>"
  desc: "Extrait le retour / le tuple des paramètres d'une fonction (via infer)."
- title: "Awaited<P>"
  desc: "Déballe une Promise, récursivement, vers sa valeur résolue."
- title: "NonNullable<T>"
  desc: "Retire null et undefined, équivalent typé d'un guard x != null."
- title: "mapped + conditional"
  desc: "[K in keyof T] et T extends U ? X : Y + infer : ce dont ils sont faits."
:::
