---
title: "Interfaces et alias de type"
slug: "interfaces-types"
framework: "typescript"
level: "junior"
order: 3
duration: 14
prerequisites: ["types-basics"]
updated: 2026-05-23
seoTitle: "TypeScript — interface vs type, typage structurel, extension"
seoDescription: "interface vs type, typage structurel (duck typing) face au nominal, extension et intersection, propriétés optionnelles et readonly, index signatures, quand choisir l'un."
ogVariant: "sage"
related:
  - { framework: "typescript", slug: "functions" }
---

## Nommer la forme d'un objet

Dès que tu manipules des objets, tu veux donner un **nom** à leur forme plutôt
que de répéter `{ prenom: string; nom: string }` partout. TypeScript offre deux
outils pour ça : `interface` et `type`. Les deux décrivent une structure, et dans
90 % des cas ils sont interchangeables. La vraie question n'est pas « lequel est
meilleur » mais « lequel exprime mon intention ».

```ts
interface Utilisateur {
  prenom: string;
  nom: string;
}

type Point = {
  x: number;
  y: number;
};
```

## Le typage structurel : ce qui compte, c'est la forme

TypeScript est **structurel**, pas nominal. Ça veut dire qu'un type est défini
par sa **forme**, pas par son nom. Si un objet possède toutes les propriétés
attendues, il est compatible — peu importe d'où il vient ou comment il a été
déclaré. C'est le « duck typing » : si ça marche comme un canard, c'est un canard.

```ts
interface AvecNom {
  nom: string;
}

function afficher(x: AvecNom) {
  console.log(x.nom);
}

const chien = { nom: "Rex", race: "berger" };
afficher(chien); // ok : chien a bien un nom (les extras sont ignorés)
```

**Pourquoi c'est différent du nominal.** Dans un langage nominal (Java, C#), il
faudrait que `chien` **déclare explicitement** qu'il implémente `AvecNom`. En
TypeScript, l'appartenance est calculée par comparaison de structure. C'est ce
qui rend le langage si fluide avec les objets JS littéraux : tu n'as rien à
déclarer à l'avance. Le piège à connaître : les **objets littéraux passés
directement** subissent un contrôle plus strict (excess property check) qui
refuse les propriétés inconnues, alors qu'une variable intermédiaire (comme
`chien` ci-dessus) y échappe.

:::callout{type="warn"}
`afficher({ nom: "Rex", race: "berger" })` **échoue** alors que passer la
variable `chien` réussit. Ce n'est pas une incohérence : sur un littéral écrit
sur place, TypeScript suppose qu'une propriété en trop est une **faute de frappe**
(`naem` au lieu de `nom`) et te prévient. Via une variable, il fait confiance au
typage structurel.
:::

## Étendre et composer

Pour réutiliser une forme, `interface` utilise `extends`, et `type` utilise
l'**intersection** `&`. Les deux ajoutent des propriétés à une base.

:::compare
::bad
```ts
interface Admin {
  prenom: string;
  nom: string;
  role: "admin";   // on recopie tout Utilisateur à la main
}
```
::
::good
```ts
interface Admin extends Utilisateur {
  role: "admin";   // hérite de prenom + nom
}

// équivalent avec type :
type AdminAlt = Utilisateur & { role: "admin" };
```
::
:::

**Pourquoi.** Recopier les champs crée une **duplication** : le jour où
`Utilisateur` gagne un champ `email`, tu dois penser à le répercuter partout.
`extends` (interface) et `&` (type) maintiennent un **lien** : la dérivée suit
automatiquement la base. La différence subtile : avec `extends`, TypeScript
**vérifie** que tu ne crées pas de conflit incompatible entre la base et l'ajout,
alors que `&` fusionne silencieusement (deux champs de même nom mais de types
incompatibles produisent `never`).

## Propriétés optionnelles et readonly

Deux modificateurs essentiels sur les propriétés : `?` rend une propriété
**facultative**, `readonly` interdit la réassignation après création.

```ts
interface Config {
  readonly id: string;     // fixé une fois, jamais réécrit
  theme: "clair" | "sombre";
  langue?: string;         // peut être absente : string | undefined
}

const c: Config = { id: "a1", theme: "sombre" };
c.theme = "clair"; // ok
c.id = "a2";       // erreur : readonly
```

**Pourquoi `readonly` plutôt que `const`.** `const` empêche de réassigner la
**variable**, mais pas de muter ses propriétés. `readonly` agit au niveau de la
**propriété** : il documente et fait respecter qu'un champ est posé une fois pour
toutes (un identifiant, une clé). Note que c'est une garantie de **compilation** :
elle disparaît au runtime, donc elle protège ton code, pas un attaquant.

## Index signatures

Quand tu ne connais pas les clés à l'avance (un dictionnaire), une **index
signature** décrit le type des clés et des valeurs sans les lister.

```ts
interface Traductions {
  [cle: string]: string;   // n'importe quelle clé string → valeur string
}

const fr: Traductions = {
  accueil: "Accueil",
  profil: "Profil",
};
fr.nimporte_quoi; // typé string, même si la clé n'existe pas vraiment
```

:::callout{type="info"}
Une index signature est pratique mais **permissive** : `fr.cleInexistante` est
typé `string` alors qu'au runtime c'est `undefined`. Si tu connais l'ensemble des
clés, préfère un type explicite ou `Record<"accueil" | "profil", string>`, qui
restreint les clés valides. Active `noUncheckedIndexedAccess` dans `tsconfig` pour
que les accès indexés renvoient `T | undefined` et te forcent à vérifier.
:::

## interface ou type : comment choisir

Les deux décrivent des objets, mais chacun a un terrain de prédilection.

:::compare
::bad
```ts
// type pour une forme d'objet publique qu'on étendra souvent
type Bouton = { label: string };
type BoutonIcone = Bouton & { icone: string };
```
::
::good
```ts
// interface : extensible, messages d'erreur plus clairs sur les objets
interface Bouton { label: string }
interface BoutonIcone extends Bouton { icone: string }

// type : indispensable pour unions, tuples, primitifs nommés
type Id = string | number;
type Paire = [number, number];
```
::
:::

**Pourquoi.** `interface` ne sait décrire que des **formes d'objets**, mais elle
le fait bien : elle prend en charge la **fusion de déclarations** (deux `interface` de
même nom se combinent, utile pour augmenter des types de bibliothèques), et produit
souvent des messages d'erreur plus lisibles. `type` est plus **général** : seul
lui peut nommer une union, un tuple, un type primitif ou un type calculé. La règle
pratique : **`interface` pour les objets et les API publiques que tu exposes,
`type` dès que tu as besoin d'une union, d'un tuple ou d'une composition que
`interface` ne peut pas exprimer**.

:::cheatsheet
- title: "interface"
  desc: "Forme d'objet, extensible (extends), fusion de déclarations. À privilégier pour les objets."
- title: "type"
  desc: "Tout : unions, tuples, primitifs nommés, compositions. Le seul à exprimer un | ."
- title: "structurel"
  desc: "Compatibilité par forme, pas par nom (duck typing)."
- title: "excess property"
  desc: "Un littéral direct refuse les clés en trop ; une variable y échappe."
- title: "extends / &"
  desc: "Étendre une base sans la recopier. extends vérifie les conflits, & fusionne."
- title: "prop?"
  desc: "Optionnelle : type T | undefined."
- title: "readonly"
  desc: "Pas de réassignation après création (garantie compile-time)."
- title: "[cle: string]"
  desc: "Index signature pour dictionnaires ; permissive, pense à noUncheckedIndexedAccess."
:::
