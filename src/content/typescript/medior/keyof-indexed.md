---
title: "keyof et accès indexé"
slug: "keyof-indexed"
framework: "typescript"
level: "medior"
order: 4
duration: 15
prerequisites: ["generics", "utility-types"]
updated: 2026-05-23
seoTitle: "keyof, accès indexé T[K], typeof — Medior TypeScript"
seoDescription: "keyof, types d'accès indexé T[K], typeof sur une valeur, indexer un tuple avec number, dériver une union depuis un objet as const et typer une fonction par clé."
ogVariant: "gold"
related:
  - { framework: "typescript", slug: "narrowing" }
---

## `keyof` : l'union des clés d'un type

`keyof T` produit l'**union des noms de clés** de `T`, sous forme de types
littéraux. C'est l'opérateur qui relie le monde des objets à celui des unions de
chaînes : au lieu de manipuler `string` (n'importe quelle clé), tu manipules
exactement les clés qui existent.

```ts
type User = { id: string; nom: string; age: number };
type Cle = keyof User; // "id" | "nom" | "age"

let k: Cle = "nom"; // ok
k = "email";        // erreur : "email" n'appartient pas à keyof User
```

Sur un `Record<string, V>`, `keyof` vaut `string | number` ; sur un type avec
index signature `[k: number]`, il inclut `number`. Le cas usuel — un objet aux
clés littérales — donne une union de littéraux, et c'est là toute sa puissance.

## Les types d'accès indexé : `T[K]`

`T[K]` lit le **type d'une propriété** par sa clé, exactement comme tu lis une
valeur avec `obj[k]` au runtime — mais au niveau type. Si `K` est une union, `T[K]`
renvoie l'union des types correspondants.

```ts
type User = { id: string; nom: string; age: number };

type IdType = User["id"];          // string
type Mixte = User["nom" | "age"];  // string | number
type Tous = User[keyof User];      // string | number (union des valeurs)
```

`T[keyof T]` est l'idiome pour obtenir l'**union de tous les types de valeurs** :
le miroir de `keyof` côté valeurs.

## `typeof` sur une valeur

Attention au double sens de `typeof`. En JavaScript runtime, `typeof x` renvoie une
chaîne. Dans un **contexte de type**, `typeof valeur` capture le **type inféré
d'une variable existante**. C'est le pont qui te fait passer d'une valeur concrète
à son type sans le réécrire.

```ts
const config = {
  hote: "localhost",
  port: 5432,
  ssl: false,
};

type Config = typeof config;
// { hote: string; port: number; ssl: boolean }

type CleConfig = keyof typeof config; // "hote" | "port" | "ssl"
```

`keyof typeof valeur` est l'enchaînement idiomatique : « les clés du type de cette
valeur ». Tu dérives le type depuis la donnée, sans le maintenir à la main.

## Indexer un tuple ou un tableau avec `number`

Un tableau ou un tuple s'indexe au niveau type par `number` pour obtenir le type
de ses **éléments**. `T[number]` est à un tableau ce que `T[keyof T]` est à un
objet : l'union de ce qu'il contient.

```ts
const couleurs = ["rouge", "vert", "bleu"];
type Couleur = (typeof couleurs)[number]; // string

const tuple = ["a", 1, true] as const;
type Element = (typeof tuple)[number]; // "a" | 1 | true
type Premier = (typeof tuple)[0];      // "a" (index littéral sur un tuple)
```

Sans `as const`, `couleurs` est inféré `string[]` et `[number]` donne `string`.
Avec `as const`, le tableau devient un tuple de littéraux et `[number]` donne
l'union précise.

## Dériver une union depuis un objet `as const`

C'est le pattern qui remplace les `enum` par des données. Tu déclares une seule
fois une source de vérité (un tableau ou un objet `as const`), puis tu en dérives
l'union de types. Ajoute une entrée, l'union se met à jour seule.

:::compare
::bad
```ts
const ROLES = ["admin", "editeur", "lecteur"];
// type Role doit être réécrit à la main et divergera
type Role = "admin" | "editeur" | "lecteur";

function aDroit(r: Role) { /* ... */ }
```
::
::good
```ts
const ROLES = ["admin", "editeur", "lecteur"] as const;
type Role = (typeof ROLES)[number]; // "admin" | "editeur" | "lecteur"

function aDroit(r: Role) { /* ... */ }
```
::
:::

**Pourquoi.** Dans la version « bad », `ROLES` (la valeur, utilisée au runtime
pour itérer) et `Role` (le type, utilisé pour vérifier) sont **deux déclarations
indépendantes**. Ajoute `"invite"` au tableau sans toucher l'union, et
`aDroit("invite")` est rejeté alors que la donnée l'autorise : les deux ont
divergé. Avec `as const`, le tableau est figé en tuple de littéraux ; `keyof`/
`[number]` extrait l'union **calculée** depuis cette unique source. La valeur et le
type restent synchronisés par construction, parce qu'il n'existe **qu'une seule
déclaration**. C'est la version « data-driven » du single source of truth.

## Typer une fonction par clé : `obj[key]`

En combinant `keyof` et l'accès indexé dans une signature générique, tu types un
accès dynamique **sans perte**. Le type de retour suit la clé passée, au lieu de
s'effondrer sur l'union de toutes les valeurs.

```ts
function get<T, K extends keyof T>(obj: T, cle: K): T[K] {
  return obj[cle];
}

const u = { nom: "Ada", age: 36 };
const n = get(u, "nom"); // n: string
const a = get(u, "age"); // a: number
get(u, "email");         // erreur : "email" n'est pas keyof T
```

:::callout{type="tip"}
La clé du dispositif est `K extends keyof T` **plus** un retour `T[K]`. Si tu
typais la clé en `string` et le retour en `T[keyof T]`, tu obtiendrais
`string | number` pour chaque appel — l'information de **quelle** clé est perdue.
Le générique `K` mémorise la clé exacte, et `T[K]` la rejoue côté valeur. C'est le
mariage des deux opérateurs de ce chapitre.
:::

:::cheatsheet
- title: "keyof T"
  desc: "Union des noms de clés de T, en types littéraux."
- title: "T[K]"
  desc: "Type de la propriété K. Si K est une union, renvoie l'union des types."
- title: "T[keyof T]"
  desc: "Union de tous les types de valeurs de l'objet."
- title: "typeof valeur"
  desc: "En contexte de type : capture le type inféré d'une variable existante."
- title: "keyof typeof valeur"
  desc: "Les clés du type d'une valeur, sans réécrire le type."
- title: "(typeof arr)[number]"
  desc: "Type des éléments d'un tableau/tuple. Avec as const : union de littéraux."
- title: "<T, K extends keyof T>(o,k): T[K]"
  desc: "Accès par clé typé sans perte : le retour suit la clé passée."
:::
