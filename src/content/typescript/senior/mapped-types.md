---
title: "Types mappés"
slug: "mapped-types"
framework: "typescript"
level: "senior"
order: 2
duration: 16
prerequisites: ["generics", "utility-types", "keyof-indexed", "conditional-types"]
updated: 2026-05-23
seoTitle: "Types mappés TypeScript — modificateurs, remapping de clés, key filtering"
seoDescription: "Itérer sur keyof T, modificateurs +/-readonly et +/-?, remapping de clés avec as, filtrage. Reconstruire Partial et Pick à la main."
ogVariant: "crimson"
related:
  - { framework: "typescript", slug: "conditional-types" }
  - { framework: "typescript", slug: "template-literal-types" }
---

## Itérer sur les clés d'un type

Un type mappé construit un nouveau type objet en **itérant** sur une union de
clés. La syntaxe `{ [K in keyof T]: ... }` est l'équivalent au niveau des types
d'un `for...in` : pour chaque clé `K` de `T`, produis une propriété. À droite des
deux-points, on calcule le type de la valeur, et on a accès à `T[K]` (le type
indexé) pour le type d'origine.

```ts
type Clone<T> = { [K in keyof T]: T[K] };

type Box = Clone<{ x: number; y: string }>; // { x: number; y: string }
```

`keyof T` produit une union de littéraux (`"x" | "y"`), et `K in` itère dessus.
Le but : transformer **systématiquement** la forme d'un type sans réécrire chaque
propriété à la main. Toute la bibliothèque standard — `Partial`, `Required`, `Readonly`, `Pick`,
`Record` est faite ainsi.

## Modificateurs `readonly` et `?`

Un type mappé peut ajouter ou retirer les modificateurs de propriété. Le préfixe
`+` ajoute (implicite), `-` retire. C'est la seule façon de **soustraire** un
modificateur de façon générique.

```ts
// Tout optionnel
type Partial<T> = { [K in keyof T]?: T[K] };

// Retirer l'optionnalité ET le readonly
type Required<T> = { [K in keyof T]-?: T[K] };
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

// Forcer readonly
type Readonly<T> = { readonly [K in keyof T]: T[K] };
```

`-?` ne se contente pas de rendre la propriété requise : il **retire aussi**
`undefined` du type de la valeur si l'optionnalité l'avait introduit. C'est un
détail qui distingue `Required` d'un simple « enlève le `?` ».

:::callout{type="info"}
Les types mappés sont **homomorphes** quand ils itèrent directement sur
`keyof T` : ils préservent les modificateurs d'origine et savent se distribuer
sur les tableaux et tuples (un `Partial<string[]>` reste un tableau). Dès que tu
remplaces `keyof T` par une autre union (un `K extends keyof T`), tu perds
l'homomorphisme et la préservation des modificateurs.
:::

## Remapping de clés avec `as`

Depuis TS 4.1, la clause `as` réécrit la clé produite. Tu calcules une nouvelle
clé à partir de `K` (souvent avec des template literal types), ce qui permet de
renommer, préfixer, ou — point clé — **filtrer** des propriétés.

```ts
// Préfixer chaque clé : { name } => { getName }
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type G = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }
```

### Key filtering : produire `never` pour exclure

Si la clause `as` renvoie `never` pour une clé, cette propriété **disparaît** du
type résultant. Combiné à un conditionnel, c'est un filtre arbitraire sur les
propriétés.

```ts
// Ne garder que les propriétés dont la valeur est une fonction.
type MethodsOnly<T> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K];
};

type M = MethodsOnly<{ id: number; save(): void; load(): void }>;
// { save(): void; load(): void }
```

## Reconstruire `Pick` et `Partial` soi-même

Comprendre les types mappés, c'est pouvoir les écrire sans la bibliothèque. Voici les
deux fondamentaux, et pourquoi la contrainte sur `K` est essentielle.

:::compare
::bad
```ts
// Itérer sur keyof T puis filtrer dans la valeur : laisse des never
type Pick<T, K> = {
  [P in keyof T]: P extends K ? T[P] : never;
};
// => garde TOUTES les clés, les autres valant never
```
::
::good
```ts
type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

type P = Pick<{ a: number; b: string }, "a">; // { a: number }
```
::
:::

**Pourquoi.** Dans la version `bad`, le type mappé itère sur **toutes** les clés
de `T` ; le conditionnel ne fait que changer la *valeur* en `never`, pas
supprimer la *clé*. Le résultat conserve `b: never` — une propriété fantôme qu'on
ne peut jamais satisfaire. La version `good` itère directement sur `K` (l'union
des clés à garder), contrainte par `K extends keyof T` pour que `T[P]` soit
toujours valide. On change l'**ensemble itéré**, pas seulement les valeurs : la
clé absente de `K` n'est jamais générée.

## Combiner avec les conditionnels

Le vrai pouvoir vient de l'union des deux mécanismes : itérer sur les clés, puis
décider du type de valeur (ou de la clé via `as`) avec un conditionnel.

```ts
// Rendre optionnelles uniquement les propriétés d'un sous-ensemble K.
type PartialBy<T, K extends keyof T> =
  Omit<T, K> & { [P in K]?: T[P] };

type U = PartialBy<{ id: number; name: string }, "name">;
// { id: number } & { name?: string }
```

:::cheatsheet
- title: "[K in keyof T]"
  desc: "Itère sur les clés ; T[K] donne le type d'origine."
- title: "?: et -?:"
  desc: "Ajoute / retire l'optionnalité (et undefined avec -?)."
- title: "readonly / -readonly"
  desc: "Ajoute ou retire l'immuabilité."
- title: "as `prefix${K}`"
  desc: "Remappe la clé ; sert au renommage et au filtrage."
- title: "as ... ? K : never"
  desc: "never en clé => la propriété est supprimée."
- title: "Homomorphe"
  desc: "Itérer sur keyof T préserve readonly/? et les tuples."
:::

:::callout{type="warn"}
Un type mappé écrase toute signature d'index, d'appel ou de construction de `T` :
ces membres ne sont pas des « clés » au sens de `keyof` et ne sont pas remappés.
Si tu mappes un type qui possède une signature d'index `[k: string]: V`, attends-
toi à ce que la clé soit `string`/`number` et non une union de littéraux — le
remapping `as` peut alors produire des résultats inattendus.
:::
