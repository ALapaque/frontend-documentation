---
title: "Les génériques"
slug: "generics"
framework: "typescript"
level: "medior"
order: 2
duration: 15
prerequisites: ["functions", "narrowing"]
updated: 2026-05-23
seoTitle: "Génériques TypeScript — inférence, contraintes, défauts — Medior"
seoDescription: "Fonctions et types génériques, inférence des paramètres de type, contraintes extends, paramètres par défaut, générique vs any et le piège de la sur-généralisation."
ogVariant: "gold"
related:
  - { framework: "typescript", slug: "utility-types" }
---

## Pourquoi un générique plutôt qu'`any`

Un générique est un **paramètre de type** : tu écris une fois une fonction ou une
structure, et le type concret est fourni (ou inféré) à l'usage. La différence
fondamentale avec `any` n'est pas la sûreté en soi, c'est que le générique
**préserve la relation** entre l'entrée et la sortie.

:::compare
::bad
```ts
function premier(arr: any[]): any {
  return arr[0];
}
const x = premier([1, 2, 3]); // x: any — la relation est perdue
x.toFixed(2); // accepté, même si arr contenait des objets
```
::
::good
```ts
function premier<T>(arr: T[]): T {
  return arr[0];
}
const x = premier([1, 2, 3]); // x: number — inféré depuis l'argument
x.toFixed(2); // ok, et garanti
```
::
:::

**Pourquoi.** Avec `any[] -> any`, le compilateur efface l'information : il sait
qu'il reçoit un tableau, mais le type de retour est **déconnecté** du type des
éléments. `premier([1,2,3])` et `premier(["a"])` produisent tous deux `any`. Avec
`<T>(arr: T[]) => T`, `T` est une **variable** unifiée : le compilateur l'instancie
en `number` pour le premier appel, en `string` pour le second, et propage ce choix
jusqu'au retour. Le générique est un **canal** qui transporte le type à travers la
fonction ; `any` est un **trou** qui le jette. Tu obtiens la souplesse d'`any` sans
en perdre la traçabilité.

## L'inférence des paramètres de type

Le plus souvent, tu n'écris **pas** `<T>` à l'appel : TypeScript l'**infère** à
partir des arguments. C'est ce qui rend les génériques agréables à utiliser. Tu ne
les annotes explicitement que quand l'inférence est impossible ou trop large.

```ts
function paire<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}
const p = paire("age", 36); // p: [string, number], rien d'annoté

function identite<T>(x: T): T { return x; }
const v = identite<"on">("on"); // forçage explicite vers le littéral "on"
```

:::callout{type="info"}
L'inférence travaille **position par position**. Si un même `T` apparaît à
plusieurs endroits, le compilateur cherche un type qui satisfait **tous** les
sites ; en cas de conflit il calcule le plus petit supertype commun. Comprendre où
`T` apparaît (paramètre, retour, callback) explique pourquoi il s'infère large ou
étroit, et où placer une contrainte pour guider le résultat.
:::

## Les contraintes : `extends`

Un `T` nu n'autorise **aucune** opération spécifique : il pourrait être n'importe
quoi. Pour accéder à une propriété ou appeler une méthode, tu dois **contraindre**
`T` à une borne supérieure avec `extends`. C'est l'inverse de l'héritage de
classe : ça veut dire « `T` est **au moins** ce type ».

```ts
function longueur<T extends { length: number }>(x: T): number {
  return x.length; // autorisé : T garantit length
}
longueur("abc");   // ok
longueur([1, 2]);  // ok
longueur(42);      // erreur : number n'a pas de length
```

La combinaison la plus utile relie deux paramètres de type : `K extends keyof T`
contraint une clé à appartenir à un objet, ce qui type un accès par clé sans perte.

```ts
function prop<T, K extends keyof T>(obj: T, cle: K): T[K] {
  return obj[cle]; // type exact selon la clé
}
const u = { nom: "Ada", age: 36 };
const n = prop(u, "nom"); // n: string
const a = prop(u, "age"); // a: number
```

## Les paramètres de type par défaut

Comme un paramètre de fonction, un paramètre de type peut avoir une **valeur par
défaut** via `=`. Utile quand le générique a un cas d'usage dominant que tu ne veux
pas obliger l'appelant à écrire.

```ts
interface Conteneur<T = string> {
  valeur: T;
}
const c1: Conteneur = { valeur: "ok" };       // T = string par défaut
const c2: Conteneur<number> = { valeur: 42 }; // override explicite
```

Un défaut peut référencer un paramètre précédent et se combiner avec une
contrainte : `<T, U extends T = T>`. L'ordre compte, comme pour les paramètres de
fonction : un paramètre avec défaut ne doit pas précéder un paramètre obligatoire.

## Le piège de la sur-généralisation

Plus de paramètres de type ne veut pas dire meilleur code. Un générique qui
n'apparaît qu'**une seule fois** dans la signature ne relie rien : il ne sert à
rien et complique la lecture.

:::compare
::bad
```ts
// T n'apparaît qu'en entrée : il ne contraint ni ne relie rien
function logguer<T>(x: T): void {
  console.log(x);
}
// Pire : un générique en retour que la fonction ne produit pas vraiment
function vide<T>(): T {
  return {} as T; // assertion forcée, mensonge au compilateur
}
```
::
::good
```ts
// Pas de générique : unknown dit la vérité, sans fausse garantie
function logguer(x: unknown): void {
  console.log(x);
}
```
::
:::

**Pourquoi.** Un paramètre de type n'a de valeur que s'il **apparaît au moins deux
fois** : une fois pour le capturer (en entrée), une fois pour le réutiliser (retour,
autre paramètre, type de retour d'un callback). `logguer<T>(x: T): void` ne
réutilise jamais `T` : il se comporte exactement comme `unknown`, mais donne
l'illusion d'une garantie. Quant à `vide<T>(): T`, c'est le **piège du retour
non lié** : `T` est choisi par l'appelant alors que la fonction ne produit pas
réellement un `T`, ce qui force un `as T` qui **ment**. Règle : un générique doit
**connecter** deux points de la signature. S'il n'en connecte qu'un, remplace-le
par `unknown` ou une union explicite.

:::callout{type="tip"}
Avant d'ajouter `<T>`, demande-toi : « entre quels deux points la relation
doit-elle être préservée ? » Si tu ne sais pas répondre, tu n'as pas besoin du
générique. Et si tu te surprends à écrire `as T` dans le corps, c'est presque
toujours le signe d'un générique mal placé.
:::

:::cheatsheet
- title: "<T>(x: T): T"
  desc: "Paramètre de type : préserve la relation entrée/sortie, contrairement à any."
- title: "inférence"
  desc: "T est déduit des arguments. N'annote <...> que si l'inférence est trop large."
- title: "T extends Borne"
  desc: "Contrainte : T est au moins Borne, débloque les opérations de Borne."
- title: "K extends keyof T"
  desc: "Lie une clé à un objet pour typer obj[cle] sans perte."
- title: "<T = Defaut>"
  desc: "Valeur par défaut du paramètre de type ; peut référencer un T précédent."
- title: "règle des deux usages"
  desc: "Un T utile apparaît 2 fois. Une seule occurrence = remplace par unknown."
- title: "as T dans le corps"
  desc: "Signal d'alarme : générique mal placé qui ment au compilateur."
:::
