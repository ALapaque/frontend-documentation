---
title: "Types littéraux de gabarit"
slug: "template-literal-types"
framework: "typescript"
level: "senior"
order: 3
duration: 15
prerequisites: ["generics", "keyof-indexed", "conditional-types", "mapped-types"]
updated: 2026-05-23
seoTitle: "Template literal types TypeScript — unions combinatoires, infer, Uppercase"
seoDescription: "Construire des types de chaînes par gabarit, unions combinatoires, helpers de casse, inférence avec infer. Typage d'events, routes, CSS et explosion combinatoire."
ogVariant: "crimson"
related:
  - { framework: "typescript", slug: "mapped-types" }
  - { framework: "typescript", slug: "conditional-types" }
---

## Des chaînes calculées au niveau des types

Un template literal type a la même syntaxe qu'un gabarit JavaScript, mais opère
sur des **types**. Il interpole des types littéraux de chaîne pour en produire de
nouveaux. Là où `string` est le type de toutes les chaînes, un gabarit cible un
**motif** précis.

```ts
type Greeting = `Hello, ${string}!`;

const a: Greeting = "Hello, world!"; // OK
const b: Greeting = "Bonjour";       // erreur : ne matche pas le motif
```

L'intérêt n'est pas de valider du texte libre mais de **dériver** des chaînes
structurées : noms d'events, clés d'objet, routes, propriétés CSS. Le compilateur
garantit alors la cohérence entre des chaînes liées.

## Unions combinatoires

Quand un slot du gabarit reçoit une **union**, TypeScript produit le **produit
cartésien** de toutes les combinaisons. C'est le mécanisme central, et la source
à la fois de sa puissance et de son piège.

```ts
type Variant = "primary" | "danger";
type State = "hover" | "active";

type ClassName = `${Variant}-${State}`;
// "primary-hover" | "primary-active" | "danger-hover" | "danger-active"
```

Deux unions de 2 membres donnent 4 résultats ; trois unions de 3 en donnent 27.
La croissance est multiplicative, pas additive — on y revient.

## Helpers de casse intrinsèques

Quatre types utilitaires *intrinsèques* (implémentés dans le compilateur, pas en
TypeScript) transforment la casse à l'intérieur d'un gabarit : `Uppercase`,
`Lowercase`, `Capitalize`, `Uncapitalize`. Indispensables pour générer des
conventions de nommage cohérentes.

```ts
type Event = "click" | "focus";

type HandlerName = `on${Capitalize<Event>}`;
// "onClick" | "onFocus"
```

## Inférence dans les gabarits avec `infer`

Un gabarit peut servir de **motif d'extraction** dans un type conditionnel.
`infer` capture le segment qui occupe une position du gabarit — c'est du
parsing de chaîne au niveau des types.

```ts
// Extraire le paramètre d'une route Express-like.
type RouteParam<T> = T extends `${string}/:${infer P}/${string}`
  ? P
  : T extends `${string}/:${infer P}`
    ? P
    : never;

type A = RouteParam<"/users/:id/posts">; // "id"
type B = RouteParam<"/users/:userId">;   // "userId"
```

:::callout{type="tip"}
Combiné à la récursion, ce parsing peut extraire **tous** les paramètres d'une
route en accumulant les `infer` successifs dans une union. C'est exactement
comment les routeurs typés (TanStack Router, génération de routes) dérivent la
forme de l'objet `params` directement depuis le littéral de chemin.
:::

## Cas d'usage : clés d'events typées

Le motif le plus courant : croiser un type mappé avec un gabarit pour générer un
ensemble de clés cohérent à partir d'un autre type.

```ts
type Entity = { user: { id: number }; post: { title: string } };

type ChangeEvents = {
  [K in keyof Entity as `${string & K}:changed`]: (next: Entity[K]) => void;
};
// { "user:changed": (next: ...) => void; "post:changed": (next: ...) => void }
```

Le `string & K` est nécessaire : `keyof` peut inclure `number | symbol`, mais un
gabarit n'accepte que des types interpolables en chaîne. L'intersection restreint
`K` à sa partie `string`.

## Le piège de l'explosion combinatoire

:::compare
::bad
```ts
type Size = "xs" | "sm" | "md" | "lg" | "xl";
type Side = "top" | "right" | "bottom" | "left";
type Breakpoint = "sm" | "md" | "lg" | "xl";

// 5 x 4 x 4 = 80 littéraux... et ce n'est qu'une dimension
type Spacing = `${Breakpoint}:m${Side}-${Size}`;
```
::
::good
```ts
type Size = "xs" | "sm" | "md" | "lg" | "xl";
type Side = "top" | "right" | "bottom" | "left";

// Garde des slots libres en string ; valide au runtime ce qui ne tient pas.
type Spacing = `m${Side}-${Size}`; // 20 membres, borné et utile
```
::
:::

**Pourquoi.** Chaque slot occupé par une union multiplie le nombre de membres du
type résultant. La version `bad` matérialise 80 littéraux ; chaînés à d'autres
gabarits ou utilisés dans des unions de plus haut niveau, le compteur atteint
vite les **dizaines de milliers**. TypeScript limite d'ailleurs une union issue
d'un gabarit à 100 000 membres et lève `Expression produces a union type that is
too complex to represent` au-delà. Au-delà du plafond dur, même en dessous, le
temps de vérification et la mémoire explosent : l'autocomplétion rame, le serveur
de langage devient laggy. Garde un slot en `string` quand l'ensemble est trop
grand, ou valide la portion non bornée à l'exécution.

:::cheatsheet
- title: "`prefix${T}suffix`"
  desc: "Gabarit de type ; cible un motif de chaîne précis."
- title: "Union dans un slot"
  desc: "Produit cartésien : multiplicatif, pas additif."
- title: "Uppercase / Capitalize…"
  desc: "Quatre intrinsèques de transformation de casse."
- title: "extends `...${infer P}...`"
  desc: "Parse une chaîne et capture un segment."
- title: "string & K"
  desc: "Restreint une clé à sa partie chaîne pour l'interpoler."
- title: "Plafond ~100 000"
  desc: "Au-delà : 'union too complex'. Garde un slot en string."
:::

:::callout{type="warn"}
Un gabarit dont **tous** les slots sont `string` (ou un autre type primitif
large) ne se simplifie pas en `string` : il reste un motif et impose la forme.
Mais un gabarit qui ne contient que `${string}` sans texte fixe — `` `${string}` ``
— est équivalent à `string`. Vérifie toujours qu'il reste du texte littéral pour
que le motif contraigne réellement.
:::
