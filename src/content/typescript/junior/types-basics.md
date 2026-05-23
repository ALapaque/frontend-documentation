---
title: "Les types de base"
slug: "types-basics"
framework: "typescript"
level: "junior"
order: 1
duration: 13
prerequisites: []
updated: 2026-05-23
seoTitle: "TypeScript — Types primitifs, inférence, any vs unknown"
seoDescription: "Types primitifs, inférence et pourquoi ne pas tout annoter, le danger d'any face à unknown, unions et littéraux, tableaux, tuples et const assertions."
ogVariant: "sage"
related:
  - { framework: "typescript", slug: "functions" }
---

## Pourquoi des types par-dessus JavaScript

TypeScript n'ajoute rien au runtime : tout est **effacé** à la compilation, le
code exécuté reste du JavaScript. Ce que tu gagnes, c'est un **contrat vérifié
avant l'exécution**. Le compilateur lit ton code, calcule la forme de chaque
valeur, et te signale les incohérences (un `string` passé là où on attend un
`number`) là où JS te laisserait planter en production. Le type est une
documentation que la machine vérifie pour toi.

## Les types primitifs

Les briques de base correspondent aux valeurs primitives de JavaScript :
`string`, `number`, `boolean`, `null`, `undefined`, `bigint` et `symbol`. Tu les
écris en minuscules.

```ts
let nom: string = "Ada";
let age: number = 36;        // pas d'int/float : un seul number
let actif: boolean = true;
let rien: null = null;
let gros: bigint = 9007199254740993n;
```

:::callout{type="warn"}
N'utilise **pas** `String`, `Number` ou `Boolean` (majuscules) comme types. Ce
sont les objets wrappers, pas les primitifs : `let x: String` accepte un objet
boxé et provoque des incompatibilités subtiles. La règle est simple : type
primitif = minuscule.
:::

## L'inférence : laisse le compilateur deviner

Tu n'es **pas** obligé d'annoter chaque variable. Quand tu initialises une
variable, TypeScript en **infère** le type à partir de la valeur. Annoter
manuellement ce qui est déjà évident ajoute du bruit sans rien vérifier de plus.

:::compare
::bad
```ts
let titre: string = "Bonjour";
const total: number = 1 + 2;
const noms: string[] = ["a", "b"];
```
::
::good
```ts
let titre = "Bonjour";        // inféré : string
const total = 1 + 2;          // inféré : number
const noms = ["a", "b"];      // inféré : string[]
```
::
:::

**Pourquoi.** L'inférence ne se contente pas de copier le type, elle l'affine
selon le **contexte de déclaration**. Un `const titre = "Bonjour"` est inféré
comme le type littéral `"Bonjour"` (la valeur ne peut plus changer), alors qu'un
`let titre = "Bonjour"` est inféré comme `string` (réassignable). Annoter à la
main casse cette finesse et te force à maintenir deux sources de vérité : si la
valeur change, tu dois penser à corriger l'annotation. La bonne pratique est
d'annoter les **frontières** (paramètres, retours publics, structures de
données) et de laisser inférer le **local**.

## `any` vs `unknown` : le danger d'`any`

`any` désactive le typage. Une valeur `any` accepte n'importe quelle opération
sans vérification — c'est un trou dans le filet qui se propage silencieusement à
tout ce qu'elle touche. `unknown` est son équivalent **sûr** : il accepte
n'importe quelle valeur en entrée, mais t'interdit de l'utiliser tant que tu ne
l'as pas **rétrécie** (narrowing) par un test.

:::compare
::bad
```ts
function parse(json: string): any {
  return JSON.parse(json);
}
const data = parse("{}");
data.utilisateur.nom.toUpperCase(); // compile, mais crash au runtime
```
::
::good
```ts
function parse(json: string): unknown {
  return JSON.parse(json);
}
const data = parse("{}");
if (typeof data === "object" && data !== null && "nom" in data) {
  // ici TypeScript sait que data a une propriété nom
}
```
::
:::

**Pourquoi.** Avec `any`, le compilateur abandonne : `data.utilisateur.nom` est
accepté alors que rien ne garantit la structure, et l'erreur n'apparaît qu'à
l'exécution. `unknown` force à **prouver** la forme avant l'accès. Le narrowing
(`typeof`, `in`, `instanceof`) restreint progressivement le type dans chaque
branche, et c'est exactement cette preuve qui rend le code sûr. Retiens : `any`
est contagieux, `unknown` est confiné.

## Unions et types littéraux

Le `|` compose une **union** : la valeur est de l'un OU l'autre type. Combiné aux
types littéraux, il modélise un ensemble fini de valeurs autorisées, bien plus
précis qu'un `string` ouvert.

```ts
type Statut = "brouillon" | "publie" | "archive";

function changer(s: Statut) { /* ... */ }
changer("publie");   // ok
changer("publié");   // erreur : "publié" n'est pas dans l'union
```

Sur une union, tu ne peux accéder qu'aux membres **communs** à tous les types
tant que tu n'as pas narrowé :

```ts
function format(x: string | number): string {
  if (typeof x === "number") return x.toFixed(2); // ici x est number
  return x.trim();                                  // ici x est string
}
```

## Tableaux et tuples

Un tableau est une collection **homogène** de longueur variable. Un tuple est une
collection de **longueur fixe** où chaque position a son propre type — utile pour
les retours multiples (pense à `useState`).

```ts
const scores: number[] = [10, 20, 30];      // ou Array<number>
const paire: [string, number] = ["age", 36]; // tuple : ordre et types fixés

const [cle, valeur] = paire; // cle: string, valeur: number
```

**Pourquoi le tuple plutôt qu'un tableau ?** `number[]` autorise n'importe quel
index et toute longueur. `[string, number]` garantit qu'il y a exactement deux
éléments, dans cet ordre précis, et le compilateur connaît le type de chaque
position lors du destructuring. C'est un contrat de structure, pas juste de
contenu.

## Les `const` assertions

`as const` fige une valeur dans sa forme la plus **étroite** et la rend
profondément `readonly`. Sans elle, un objet ou un tableau est inféré comme
mutable et large.

:::compare
::bad
```ts
const config = { mode: "dark", retries: 3 };
// type inféré : { mode: string; retries: number }
config.mode = "n'importe quoi"; // accepté
```
::
::good
```ts
const config = { mode: "dark", retries: 3 } as const;
// type : { readonly mode: "dark"; readonly retries: 3 }
config.mode = "light"; // erreur : readonly
```
::
:::

**Pourquoi.** Par défaut, TypeScript infère « large » sur les objets et tableaux
parce qu'ils sont en général destinés à muter : `mode` devient `string`, pas
`"dark"`. `as const` inverse ce choix : il transforme chaque valeur en son type
littéral et marque tout en `readonly`. C'est indispensable pour dériver une union
à partir de données (`typeof tableau[number]`) ou pour passer une config figée
sans risquer une mutation accidentelle.

:::cheatsheet
- title: "string | number | boolean"
  desc: "Primitifs, toujours en minuscule. Jamais les wrappers majuscules."
- title: "inférence"
  desc: "N'annote pas le local : laisse deviner, annote les frontières."
- title: "any"
  desc: "Désactive les vérifs et se propage. À éviter."
- title: "unknown"
  desc: "Sûr : impose un narrowing (typeof, in, instanceof) avant usage."
- title: "union |"
  desc: "L'un OU l'autre. Avec des littéraux, modélise un ensemble fini."
- title: "tuple [a, b]"
  desc: "Longueur fixe, type par position. Plus strict qu'un tableau."
- title: "as const"
  desc: "Fige en types littéraux et readonly profond."
:::
