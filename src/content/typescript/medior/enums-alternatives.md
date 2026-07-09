---
title: "Enums : les alternatives modernes"
slug: "enums-alternatives"
framework: "typescript"
level: "medior"
order: 6
duration: 14
prerequisites: ["satisfies"]
updated: 2026-07-09
seoTitle: "TypeScript enum vs union et objets const — quelle alternative choisir"
seoDescription: "Pourquoi les enum TypeScript posent problème (coût runtime, comportements surprenants, non erasable) et comment les remplacer par des unions de littéraux et des objets const as const + satisfies, plus sûrs et sans code émis."
ogVariant: "iris"
related:
  - { framework: "typescript", slug: "satisfies" }
  - { framework: "typescript", slug: "utility-types" }
---

`enum` est l'une des rares constructions TypeScript qui **émet du code
JavaScript** à l'exécution. Presque tout le reste (types, interfaces,
annotations) disparaît à la compilation : c'est de la syntaxe « effaçable ».
Pas `enum`. En prime, il cache des pièges : enums numériques réversibles,
comparaisons inattendues, incompatibilité avec le type-stripping natif de Node.
Il existe des alternatives plus sûres, sans coût à l'exécution, et que tu
connais déjà à moitié.

## Les problèmes des enum

### Il n'est pas effaçable

Voici ce que le compilateur produit pour un `enum` tout simple.

```ts
enum Statut { Actif, Inactif }

// Ce que TypeScript ÉMET :
var Statut;
(function (Statut) {
  Statut[(Statut["Actif"] = 0)] = "Actif";
  Statut[(Statut["Inactif"] = 1)] = "Inactif";
})(Statut || (Statut = {}));
```

Un objet réel est construit à l'exécution : pas qu'un peu de poids en plus,
mais une **incompatibilité de fond** avec les outils qui se contentent de
*retirer* les types sans les transformer.

:::callout{type="warn"}
Node 22+ exécute les `.ts` par **type-stripping** : il efface la syntaxe de
type et lance le JavaScript restant, sans compilateur. Un `enum` ne peut pas
être effacé, il devrait être *transformé* — Node refuse donc, et le flag
`--erasableSyntaxOnly` le signale comme une erreur. Même chose avec `esbuild`,
`swc` en transpile-only et bien des bundlers : la syntaxe non effaçable est un
point de friction permanent.
:::

### Les enums numériques mentent

Par défaut, un membre sans valeur reçoit un **nombre**. Deux conséquences.

```ts
enum Direction { Nord, Est, Sud } // 0, 1, 2

// 1. Réversible : l'objet mappe AUSSI les nombres vers les noms.
Direction[0]; // "Nord" — un aller-retour que tu n'as pas demandé

// 2. N'importe quel nombre passe le contrôle de type.
function tourner(d: Direction) {}
tourner(99); // AUCUNE erreur : 99 est accepté comme Direction valide
```

Le « type » `Direction` n'est en réalité qu'un `number` déguisé. Toute la
promesse de sécurité de l'enum s'effondre sur son cas le plus courant.

### Le nominal typing surprend

Contrairement au reste de TypeScript, qui est **structurel**, un enum est
**nominal** : un littéral égal à la valeur est rejeté.

```ts
enum Couleur { Rouge = "rouge" }

const c: Couleur = "rouge";
// ERREUR : '"rouge"' n'est pas assignable au type 'Couleur'.
// Il FAUT écrire Couleur.Rouge, malgré une valeur identique.
```

La donnée que tu reçois d'une API ou d'un formulaire est une `string`
ordinaire, pas un membre d'enum. Tu dois donc la recaster sans arrêt, ce qui
ajoute du bruit sans ajouter de sûreté.

Et `const enum` ? Il évite l'objet émis en **inlinant** les valeurs, mais il
est interdit sous `isolatedModules` (le mode qu'imposent esbuild, swc et Vite),
casse en transpilation isolée et empêche d'itérer sur les valeurs. Un problème
échangé contre un autre.

## Alternative 1 : l'union de littéraux

Quand tu as juste besoin d'un ensemble fermé de valeurs, une **union de
littéraux** suffit. Zéro code émis, autocomplétion, et le type *est* la valeur.

```ts
type Statut = "actif" | "inactif" | "suspendu";

function afficher(s: Statut) {}
afficher("actif");    // OK, autocomplété
afficher("supprime"); // ERREUR : non assignable à Statut
```

Une donnée arrivée en `string` se compare directement, sans recast, et le
`type` s'efface entièrement. Pour la majorité des cas — statuts, rôles,
variantes d'un composant — c'est la réponse par défaut. Sa limite : une union
est un type, pas une **valeur**. Impossible de l'itérer ou de lister ses
membres à l'exécution. Si tu en as besoin, passe à l'alternative suivante.

## Alternative 2 : l'objet `as const` + `satisfies`

Quand tu veux **à la fois** un objet itérable (les valeurs) **et** un type
dérivé, combine `as const` et `satisfies`.

```ts
export const Statut = {
  Actif: "actif",
  Inactif: "inactif",
  Suspendu: "suspendu",
} as const satisfies Record<string, string>;

// Le type dérivé : "actif" | "inactif" | "suspendu"
export type Statut = (typeof Statut)[keyof typeof Statut];

function afficher(s: Statut) {}
afficher(Statut.Actif);        // accès par nom, comme un enum
afficher("actif");             // OK aussi : structurel, pas nominal
Object.values(Statut);         // ["actif","inactif","suspendu"] — itérable
```

Chaque pièce compte : **`as const`** fige les propriétés en littéraux
`readonly` (sinon les valeurs s'élargissent en `string` et le type dérivé
devient inutile) ; **`satisfies Record<string, string>`** vérifie la forme sans
**élargir** le type inféré ; **`(typeof Statut)[keyof typeof Statut]`** indexe
le type de l'objet par toutes ses clés, produisant l'**union de ses valeurs**.
Résultat : le confort de l'enum (accès par nom, source unique) sans son
mensonge numérique ni son nominal typing, et un simple objet gelé côté runtime.

## enum vs les alternatives

:::compare
::bad
```ts
// enum : émet du JS, piège numérique, non effaçable.
enum Role { Admin, Membre } // 0, 1

donnerAcces(3); // accepté : 3 est un Role « valide »
Role[0];        // "Admin" — table inverse implicite
// Casse --erasableSyntaxOnly et `node fichier.ts`.
```
::
::good
```ts
// Union : rien à l'exécution, valeurs exactes.
type Role = "admin" | "membre";

// Objet const : quand il faut AUSSI itérer.
const Role = {
  Admin: "admin",
  Membre: "membre",
} as const satisfies Record<string, string>;
type Role = (typeof Role)[keyof typeof Role];
```
::
:::

## Vérifier l'exhaustivité

Union ou objet const, tu gardes la même sûreté qu'un enum sur un `switch` : la
**vérification d'exhaustivité** via le type `never`. Dans la branche `default`,
la valeur ne devrait plus rien pouvoir être ; si un cas manque, elle reste
assignable et l'erreur remonte.

```ts
type Statut = "actif" | "inactif" | "suspendu";

function assertNever(x: never): never {
  throw new Error(`Cas non géré : ${JSON.stringify(x)}`);
}

function libelle(s: Statut): string {
  switch (s) {
    case "actif":   return "Actif";
    case "inactif": return "Inactif";
    // "suspendu" oublié :
    default:
      // ERREUR : '"suspendu"' n'est pas assignable au type 'never'.
      return assertNever(s);
  }
}
```

Ajoute un membre à `Statut` et **chaque** `switch` non exhaustif casse à la
compilation. Ce filet disparaît si tu remplaces `assertNever` par un `default`
fourre-tout.

## Quand un enum reste acceptable

Rarement, mais honnêtement : quand tu maintiens du code **existant** truffé
d'enums et que migrer coûterait plus que ça ne rapporte (la cohérence prime) ;
ou quand tu cibles un runtime/bundler qui compile réellement le TypeScript et
n'utilises **jamais** le run natif Node ni le type-stripping. Dans ces cas,
privilégie les **enums de chaînes** (`Actif = "actif"`) aux numériques : tu
évites la réversibilité et l'acceptation de n'importe quel nombre.

:::callout{type="tip"}
Recommandation par défaut : **union de littéraux** pour un ensemble fermé de
valeurs ; **objet `as const satisfies`** quand tu dois aussi itérer ou lister
ces valeurs à l'exécution. Garde `enum` pour l'existant, jamais pour du neuf.
:::

## À retenir

`enum` émet du code et n'est pas effaçable, d'où le conflit avec le
type-stripping de Node, `--erasableSyntaxOnly` et les transpileurs isolés ; ses
variantes numériques sont réversibles et acceptent n'importe quel nombre ; son
nominal typing force à recaster des données déjà en `string`. Les alternatives
couvrent tous les besoins réels sans ces défauts — union de littéraux pour un
ensemble fermé, objet `as const satisfies` quand il faut aussi une valeur
itérable — et gardent la vérification d'exhaustivité via `never`.

:::cheatsheet
- title: "enum émet du JS"
  desc: "Une des rares constructions TS non effaçable : casse le run natif Node et --erasableSyntaxOnly."
- title: "Piège numérique"
  desc: "enum numérique = réversible (Dir[0]) et accepte n'importe quel number. Préfère les enums de chaînes si tu dois en garder."
- title: "Nominal, pas structurel"
  desc: "Un littéral égal à la valeur est rejeté ; il faut Enum.Membre. Bruit constant face aux données string."
- title: "Union de littéraux"
  desc: "type T = 'a' | 'b'. Zéro runtime, autocomplétion. Défaut pour un ensemble fermé de valeurs."
- title: "Objet as const satisfies"
  desc: "const T = {...} as const satisfies Record<string,string>; type T = (typeof T)[keyof typeof T]. Valeur itérable ET type."
- title: "Exhaustivité"
  desc: "switch + assertNever(x: never): ajouter un membre casse chaque switch non exhaustif à la compilation."
:::
