---
title: "Types conditionnels"
slug: "conditional-types"
framework: "typescript"
level: "senior"
order: 1
duration: 16
prerequisites: ["generics", "keyof-indexed", "narrowing"]
updated: 2026-05-23
seoTitle: "Types conditionnels TypeScript — extends, infer, distributivité"
seoDescription: "Maîtrise T extends U ? X : Y, le mot-clé infer, la distributivité sur les unions et comment la désactiver. La brique des utility types."
ogVariant: "crimson"
related:
  - { framework: "typescript", slug: "mapped-types" }
  - { framework: "typescript", slug: "template-literal-types" }
---

## Le ternaire au niveau des types

Un type conditionnel est un `if` qui s'exécute pendant la vérification de types,
pas à l'exécution. La forme canonique est `T extends U ? X : Y` : *si* `T` est
assignable à `U`, le type vaut `X`, sinon `Y`. Le mot-clé `extends` ici ne
signifie pas « hérite de » mais « est assignable à » — c'est une vérification de
sous-typage structurel, pas de chaîne de prototypes.

```ts
type IsString<T> = T extends string ? true : false;

type A = IsString<"hello">; // true
type B = IsString<42>;      // false
```

Le but n'est pas la cosmétique : un type conditionnel permet de **dériver** un
type d'un autre selon sa forme. C'est ce qui transforme TypeScript d'un système
d'annotations en un langage de calcul sur les types.

## `infer` : capturer un type dans une position

Seul, `extends` répond par oui/non. Couplé à `infer`, il **extrait** un type
positionné n'importe où dans `U`. `infer R` déclare une variable de type que le
compilateur résout par unification : « trouve quel type, à cette place, rend la
condition vraie, et appelle-le `R` ».

```ts
// Déballer le type contenu dans une Promise.
type Awaited<T> = T extends Promise<infer R> ? R : T;

type X = Awaited<Promise<number>>; // number
type Y = Awaited<string>;          // string (la branche else)

// Extraire le type de retour d'une fonction.
type ReturnOf<T> = T extends (...args: any[]) => infer R ? R : never;

type R = ReturnOf<() => Date>; // Date

// Extraire le type des éléments d'un tableau.
type ElementOf<T> = T extends readonly (infer E)[] ? E : never;

type E = ElementOf<string[]>; // string
```

L'`Awaited` natif de TypeScript est plus subtil (il déballe récursivement les
chaînes de `Promise<Promise<...>>` et gère les `thenable`), mais le principe est
celui-ci : `infer` au point de désballage.

:::callout{type="tip"}
Quand plusieurs `infer` portent le même nom dans des positions covariantes,
TypeScript en fait l'**union** ; en positions contravariantes (paramètres de
fonction), il en fait l'**intersection**. `T extends { a: infer U; b: infer U }`
donne `U = A | B`. C'est rarement ce qu'on veut : préfère des noms distincts.
:::

## La distributivité sur les unions

C'est le comportement le plus puissant — et le plus surprenant. Quand le type
testé est un **paramètre générique nu** (`T` seul à gauche de `extends`) et qu'on
lui passe une union, le type conditionnel se **distribue** : il s'applique à
chaque membre de l'union séparément, puis recombine les résultats en union.

```ts
type ToArray<T> = T extends any ? T[] : never;

// Distribue : (string extends any ? string[] : never) | (number extends ...)
type R = ToArray<string | number>; // string[] | number[]
//  PAS (string | number)[]
```

C'est exactement le mécanisme derrière `Exclude` et `Extract` :

```ts
type MyExclude<T, U> = T extends U ? never : T;

type R = MyExclude<"a" | "b" | "c", "a">;
// distribue puis filtre : never | "b" | "c" => "b" | "c"
```

Chaque membre est testé ; ceux qui matchent deviennent `never`, et `never`
disparaît d'une union. Le filtrage est gratuit grâce à cette propriété.

### Désactiver la distributivité avec `[T]`

La distributivité ne se déclenche **que** sur un type nu. Si tu enveloppes les
deux côtés dans un tuple à un élément — `[T] extends [U]` — `T` n'est plus nu,
la distribution n'a pas lieu, et l'union est testée d'un bloc.

:::compare
::bad
```ts
type IsNever<T> = T extends never ? true : false;

type R = IsNever<never>; // never (!) et non true
```
::
::good
```ts
type IsNever<T> = [T] extends [never] ? true : false;

type R = IsNever<never>; // true
```
::
:::

**Pourquoi.** `never` est l'union vide. Distribuer un conditionnel sur l'union
vide ne produit aucun membre, donc le résultat est `never` lui-même — jamais
`true`. En enveloppant avec `[T]`, on supprime la distributivité : la condition
est évaluée une seule fois sur `never` tel quel, qui *est* assignable à `never`,
d'où `true`. Le même piège casse tout type censé tester une union « en bloc »
(égalité de types, détection de `any`).

## Pourquoi c'est la base des utility types

Presque tous les utilitaires de la lib standard reposent sur ces trois pièces.
`Exclude`/`Extract` = distributivité. `NonNullable<T> = T & {}` exploite le
filtrage. `Parameters`, `ReturnType`, `InstanceType`, `ConstructorParameters`
sont tous des `infer` à une position précise d'une signature. Comprendre les
conditionnels, c'est cesser de consommer les utility types pour commencer à les
écrire — et à composer les tiens quand la lib standard s'arrête.

:::cheatsheet
- title: "T extends U ? X : Y"
  desc: "Ternaire de types ; extends = assignabilité, pas héritage."
- title: "infer R"
  desc: "Capture par unification le type à cette position."
- title: "Distributivité"
  desc: "T nu + union => applique membre par membre, recombine en union."
- title: "[T] extends [U]"
  desc: "Désactive la distributivité ; teste l'union en bloc."
- title: "T extends U ? never : T"
  desc: "Patron de filtrage (Exclude) ; never s'évapore de l'union."
- title: "T extends Promise<infer R>"
  desc: "Déballe un wrapper générique vers son contenu."
:::

## Composition récursive

Un conditionnel peut s'appeler lui-même. C'est ainsi qu'on déballe des
structures imbriquées — un `DeepReadonly`, un aplatissement de tableaux, ou un
désballage récursif de promesses.

```ts
type Flatten<T> = T extends readonly (infer E)[] ? Flatten<E> : T;

type R = Flatten<number[][][]>; // number
```

:::callout{type="warn"}
La récursion de types a une limite de profondeur (≈ 50 niveaux d'instanciation,
1000 pour les types « tail-recursive » optimisés depuis TS 4.5). Un type
récursif non borné explose en `Type instantiation is excessively deep`. Garde
tes récursions linéaires et place l'appel récursif en position terminale quand
c'est possible pour bénéficier de l'optimisation.
:::
