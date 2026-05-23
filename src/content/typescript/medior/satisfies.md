---
title: "L'opérateur satisfies"
slug: "satisfies"
framework: "typescript"
level: "medior"
order: 5
duration: 14
prerequisites: ["types-basics", "utility-types"]
updated: 2026-05-23
seoTitle: "satisfies TypeScript — valider sans élargir, as const, config typée — Medior"
seoDescription: "L'opérateur satisfies vérifie qu'une valeur respecte un type sans en élargir l'inférence. Différence avec l'annotation et avec as, combinaison avec as const, cas d'usage config et palette."
ogVariant: "gold"
related:
  - { framework: "typescript", slug: "generics" }
---

## Le problème : vérifier sans perdre la précision

Tu écris une valeur littérale et tu veux deux choses en même temps : qu'elle
**respecte** une forme attendue (un contrat), et que TypeScript garde le **type
le plus précis** inféré depuis la valeur elle-même. Les deux outils classiques
te forcent à en sacrifier un. L'annotation `: T` vérifie le contrat mais
**élargit** : la variable prend le type `T`, pas le type littéral. Le `as T`
préserve... ce que tu lui dis, sans rien vérifier — c'est une assertion, donc
un mensonge potentiel. `satisfies T` est la troisième voie : il **vérifie** la
conformité à `T` puis te rend le type **inféré de la valeur**, intact.

:::compare
::bad
```ts
type Couleurs = Record<string, [number, number, number]>;

// Annotation : vérifie, mais élargit le type de la variable.
const palette: Couleurs = {
  rouge: [255, 0, 0],
  vert: [0, 128, 0],
};

palette.rouge; // type [number, number, number] — clés perdues, tuple générique
palette.bleu;  // PAS d'erreur : Record<string, ...> autorise toute clé string
```
::
::good
```ts
type Couleurs = Record<string, [number, number, number]>;

const palette = {
  rouge: [255, 0, 0],
  vert: [0, 128, 0],
} satisfies Couleurs;

palette.rouge; // type number[] ... ou [number,...] : voir as const plus bas
palette.bleu;  // ERREUR : la propriété 'bleu' n'existe pas
```
::
:::

**Pourquoi.** L'annotation `: Couleurs` lie la variable au type déclaré : à
partir de là, TypeScript **oublie** la valeur concrète et ne connaît que
`Record<string, ...>`. Les clés littérales `rouge`/`vert` disparaissent, donc
`palette.bleu` est jugé valide (toute clé `string` est permise par le
`Record`). `satisfies` inverse l'ordre des opérations : il **confronte** la
valeur à `Couleurs` pour valider la forme (chaque valeur doit bien être un
triplet), **sans réécrire** le type de `palette`. Le type final reste celui que
l'inférence tire de l'objet littéral — avec ses clés exactes — donc une clé
inconnue redevient une erreur. Tu gagnes la vérification *et* la précision.

## Le triangle annotation / as / satisfies

Ces trois mécanismes répondent à la même question — « quel type pour cette
valeur ? » — mais à des moments et avec des garanties différentes.

```ts
const a: { x: number } = { x: 1 };          // élargit vers { x: number }
const b = { x: 1 } as { x: number };        // assertion : pas de vérif de surplus
const c = { x: 1 } satisfies { x: number }; // vérifie + garde le type inféré { x: 1 }... non :
//                                              { x: number } car x:1 n'est pas figé sans as const
```

Le point clé : `satisfies` ne **fige** rien tout seul. L'inférence d'un objet
mutable produit déjà `{ x: number }` (pas `{ x: 1 }`), parce que TypeScript
suppose qu'une propriété mutable peut changer. Pour conserver les **littéraux**,
il faut le combiner avec `as const`.

:::callout{type="warn"}
`as` et `satisfies` ne jouent pas dans la même catégorie. `as` est une
**assertion** : tu affirmes un type, le compilateur te croit, et un `as` faux
passe (`{} as { x: number }` ne lève rien). `satisfies` est une **contrainte
vérifiée** : un objet qui ne respecte pas la forme est rejeté. N'utilise `as`
que quand tu en sais plus que le compilateur ; utilise `satisfies` quand tu veux
qu'il te corrige.
:::

## Combiner avec `as const`

`as const` fige la valeur en `readonly` et préserve les littéraux ; `satisfies`
vérifie le contrat. Ensemble, l'ordre compte : on fige d'abord, on valide
ensuite.

```ts
type Triplet = readonly [number, number, number];

const palette = {
  rouge: [255, 0, 0],
  vert: [0, 128, 0],
} as const satisfies Record<string, Triplet>;

palette.rouge[0]; // 255 (littéral exact), type readonly [255, 0, 0]
// palette.rouge[0] = 0; // ERREUR : readonly
```

Sans `satisfies`, `as const` te donnerait la précision mais aucune garantie que
chaque entrée est bien un triplet. Sans `as const`, `satisfies` valide mais
laisse le type s'élargir (`number[]`). La paire couvre les deux besoins :
**littéraux figés** *et* **conformité au contrat**.

## Cas d'usage : Record partiel et exhaustivité contrôlée

`satisfies` brille quand le **type cible est plus large** que ce que tu veux
exposer. Tu valides contre le type large, mais tu navigues avec les clés
réelles.

```ts
type Route = "/" | "/login" | "/dashboard" | "/admin";

// On veut un sous-ensemble typé de routes -> handler, sans tout couvrir.
const handlers = {
  "/": () => "accueil",
  "/login": () => "connexion",
} satisfies Partial<Record<Route, () => string>>;

handlers["/login"]; // OK, type () => string
// handlers["/inconnue"]; // ERREUR : clé hors des clés réellement définies
// handlers["/admin"];    // ERREUR aussi : non définie, alors que Partial l'autoriserait à l'annotation
```

L'annotation `: Partial<Record<Route, ...>>` aurait autorisé l'accès à `/admin`
(valeur `undefined`), masquant un trou. `satisfies` garde la liste **exacte** des
clés définies, donc l'accès à une route non gérée échoue à la compilation.

:::callout{type="tip"}
Règle de pouce : commence par écrire ta valeur sans annotation, ajoute
`satisfies T` à la fin pour la **valider**, et ne passe à l'annotation `: T` que
si tu veux délibérément **effacer** la précision (par exemple exposer un type
public stable indépendant de l'implémentation).
:::

## Validation de config typée

Le pattern le plus répandu : un objet de configuration que tu veux à la fois
conforme à un schéma et précisément typé pour l'autocomplétion en aval.

```ts
type Config = {
  mode: "dev" | "prod";
  port: number;
  features: Record<string, boolean>;
};

export const config = {
  mode: "dev",
  port: 3000,
  features: { darkMode: true, beta: false },
} satisfies Config;

config.mode;              // type "dev" (littéral), pas "dev" | "prod"
config.features.darkMode; // accessible et typé boolean
// config.features.absente; // ERREUR : clé inconnue détectée
```

L'inférence garde `mode: "dev"`, ce qui permet à un code consommateur de faire du
*narrowing* précis (`if (config.mode === "dev")` réduit utilement), tout en
ayant garanti que `port` est bien un `number` et `mode` une valeur admise.

:::cheatsheet
- title: "satisfies T"
  desc: "Vérifie la conformité à T sans élargir : garde le type inféré de la valeur."
- title: "vs : T (annotation)"
  desc: "L'annotation vérifie mais élargit la variable vers T et perd les littéraux/clés."
- title: "vs as T (assertion)"
  desc: "as ne vérifie pas : il affirme. satisfies corrige, as peut mentir."
- title: "as const satisfies T"
  desc: "Fige les littéraux en readonly PUIS valide le contrat. Ordre : const avant satisfies."
- title: "Partial<Record<K, V>>"
  desc: "satisfies garde les clés réellement définies ; l'annotation les autoriserait toutes."
- title: "Quand annoter quand même"
  desc: "Pour exposer un type public stable détaché de l'implémentation interne."
:::
