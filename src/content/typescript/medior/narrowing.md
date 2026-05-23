---
title: "Le narrowing"
slug: "narrowing"
framework: "typescript"
level: "medior"
order: 1
duration: 14
prerequisites: ["types-basics", "functions"]
updated: 2026-05-23
seoTitle: "Narrowing & type guards — Medior TypeScript"
seoDescription: "Control-flow analysis, typeof/instanceof/in, truthiness, unions discriminées, type guards utilisateur, assertion functions et exhaustiveness check avec never."
ogVariant: "gold"
related:
  - { framework: "typescript", slug: "generics" }
---

## Le narrowing, c'est l'analyse du flot de contrôle

Une variable de type `string | number` ne te laisse appeler que les membres
**communs** aux deux. Pour atteindre `.toFixed()`, tu dois d'abord **prouver** au
compilateur que tu es dans le cas `number`. Ce rétrécissement progressif du type
au fil des branches s'appelle le **narrowing**, et le moteur qui le réalise est la
**control-flow analysis** (CFA).

La CFA suit chaque chemin d'exécution et calcule, à chaque point du programme, le
type **le plus précis possible** d'une variable compte tenu des tests déjà passés.
Ce n'est pas magique : ça repose sur des constructions que TypeScript sait
reconnaître comme des **guards**. Tout l'art consiste à écrire des tests que la CFA
comprend.

```ts
function format(x: string | number): string {
  if (typeof x === "number") {
    return x.toFixed(2); // ici x: number
  }
  return x.trim();       // ici x: string (le number est éliminé)
}
```

:::callout{type="info"}
La CFA est **sensible à l'ordre** et aux réassignations. Un `early return`, un
`throw` ou un `continue` retirent un cas du reste de la fonction (narrowing par
élimination). Mais réassigner la variable réinitialise son type au type déclaré :
la preuve obtenue plus haut est perdue dès que la valeur peut avoir changé.
:::

## Les guards intégrés : typeof, instanceof, in

`typeof` discrimine les **primitifs** (`"string"`, `"number"`, `"boolean"`,
`"object"`, `"function"`, `"undefined"`, `"bigint"`, `"symbol"`). `instanceof`
discrimine les **classes** via la chaîne de prototypes. `in` teste la **présence
d'une propriété** et sert à séparer des objets de formes différentes.

```ts
function taille(x: string | unknown[] | { length: number }) {
  if (typeof x === "string") return x.length;
  if (x instanceof Array) return x.length;
  if ("length" in x) return x.length; // x: { length: number }
}
```

Attention au piège classique : `typeof null === "object"`. Un test
`typeof x === "object"` n'exclut **pas** `null`, il faut le combiner avec
`x !== null`.

## La truthiness

Un simple `if (x)` rétrécit en éliminant les valeurs **falsy**
(`null`, `undefined`, `0`, `""`, `NaN`, `false`). C'est l'outil le plus courant
pour écarter `null | undefined`.

```ts
function longueur(s: string | null) {
  if (!s) return 0; // s est falsy : null OU "" éliminés ici
  return s.length;  // s: string
}
```

Le piège : `if (x)` sur un `number | undefined` élimine **aussi** `0`, qui est une
valeur métier légitime. Pour ne viser que l'absence, teste explicitement
`x != null` (le `!=` lâche couvre `null` et `undefined` d'un coup).

## Les unions discriminées : le pattern clé

Le pattern le plus puissant du narrowing est l'**union discriminée** (ou
*tagged union*) : chaque membre de l'union porte une propriété **littérale
commune** qui sert d'étiquette. Tester cette étiquette rétrécit l'union à un seul
membre, et la CFA débloque alors les propriétés spécifiques.

```ts
type Etat =
  | { statut: "chargement" }
  | { statut: "succes"; donnees: string[] }
  | { statut: "erreur"; message: string };

function rendu(e: Etat): string {
  switch (e.statut) {
    case "chargement": return "...";
    case "succes":     return e.donnees.join(", "); // donnees accessible
    case "erreur":     return e.message;            // message accessible
  }
}
```

:::compare
::bad
```ts
type Forme = { rayon?: number; cote?: number };
function aire(f: Forme) {
  if (f.rayon) return Math.PI * f.rayon ** 2;
  return f.cote! * f.cote!; // ! partout, formes invalides possibles
}
```
::
::good
```ts
type Forme =
  | { type: "cercle"; rayon: number }
  | { type: "carre"; cote: number };
function aire(f: Forme) {
  switch (f.type) {
    case "cercle": return Math.PI * f.rayon ** 2;
    case "carre":  return f.cote ** 2;
  }
}
```
::
:::

**Pourquoi.** Le modèle avec propriétés optionnelles autorise des états
**impossibles** : `{ rayon: 3, cote: 5 }` passe le typage alors qu'il n'a aucun
sens, et tu compenses avec des `!` qui désactivent les vérifications. L'union
discriminée encode une **alternative exclusive** : un membre OU l'autre, jamais les
deux. Le discriminant `type` est un littéral, donc tester sa valeur est un guard
que la CFA exploite pour rétrécir à un seul membre et exposer ses champs sans
assertion. Tu rends les états illégaux **inexprimables**, pas juste détectables.

## Les type guards utilisateur : `x is T`

Quand un test ne peut pas s'écrire avec les guards intégrés, tu factorises la
logique dans une fonction qui retourne un **type predicate** `arg is T`. Pour le
compilateur, un retour `true` signifie « dans le scope appelant, `arg` est un `T` ».

```ts
type Chat = { miauler(): void };
type Chien = { aboyer(): void };

function estChat(a: Chat | Chien): a is Chat {
  return "miauler" in a;
}

function parler(a: Chat | Chien) {
  if (estChat(a)) a.miauler(); // a: Chat
  else a.aboyer();             // a: Chien
}
```

:::callout{type="warn"}
Un type guard utilisateur est une **promesse non vérifiée**. Si la logique du
corps ne correspond pas au predicate annoté, TypeScript te fait confiance et le
narrowing devient faux. Depuis TS 5.5, l'inférence des predicates couvre certains
cas simples (un `filter` qui teste `x != null`), mais dès que c'est non trivial,
écris le predicate à la main et garde le corps fidèle.
:::

## Les assertion functions

Une **assertion function** ne retourne rien : elle **lève** si la condition est
fausse, sinon le code continue. La signature `asserts arg is T` (ou
`asserts condition`) dit à la CFA : « après cet appel, tu peux considérer la
garantie comme acquise ».

```ts
function assertDefini<T>(v: T, msg?: string): asserts v is NonNullable<T> {
  if (v == null) throw new Error(msg ?? "valeur absente");
}

function traiter(x: string | null) {
  assertDefini(x);
  return x.toUpperCase(); // x: string, narrowé par l'assertion
}
```

La différence avec un type guard : le guard **branche** (`if`), l'assertion
**coupe** le flot par une exception. L'une te fait choisir, l'autre garantit ou
plante.

## `never` et l'exhaustiveness check

`never` est le type **sans aucune valeur** : le type vide. Dans une union
discriminée traitée par `switch`, si tu as géré tous les cas, la branche `default`
reçoit un résiduel de type `never`. En l'**assignant** à une variable `never`, tu
forces une erreur de compilation le jour où quelqu'un **ajoute un membre** à
l'union sans gérer son cas.

```ts
function aire(f: Forme): number {
  switch (f.type) {
    case "cercle": return Math.PI * f.rayon ** 2;
    case "carre":  return f.cote ** 2;
    default: {
      const _exhaustif: never = f; // erreur si un cas est oublié
      throw new Error(`forme non gérée: ${(f as any).type}`);
    }
  }
}
```

**Pourquoi ça marche.** Si tous les cas sont couverts, le type de `f` dans
`default` est réduit à `never`, et `never` est assignable à `never` : ça compile.
Ajoute `{ type: "triangle"; ... }` à `Forme` sans `case` correspondant, et `f`
vaut désormais `{ type: "triangle"; ... }` dans `default` : ce type n'est pas
assignable à `never`, donc **erreur**. Tu transformes un oubli silencieux en
erreur de build. C'est de la sûreté **proactive**, pas un test runtime.

:::cheatsheet
- title: "control-flow analysis"
  desc: "Le moteur qui rétrécit le type selon les tests passés sur chaque chemin."
- title: "typeof / instanceof / in"
  desc: "Guards intégrés : primitif / classe / présence de propriété."
- title: "truthiness"
  desc: "if (x) élimine les falsy. Vise l'absence avec x != null pour épargner 0 et \"\"."
- title: "union discriminée"
  desc: "Tag littéral commun. Le pattern clé : rend les états illégaux inexprimables."
- title: "x is T"
  desc: "Type guard utilisateur. Promesse non vérifiée : garde le corps fidèle."
- title: "asserts x is T"
  desc: "Assertion function : lève sinon, narrowe le flot après l'appel."
- title: "never + exhaustiveness"
  desc: "default { const _: never = x } : erreur de build si un cas est ajouté."
:::
