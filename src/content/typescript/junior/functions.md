---
title: "Typer les fonctions"
slug: "functions"
framework: "typescript"
level: "junior"
order: 2
duration: 14
prerequisites: ["types-basics"]
updated: 2026-05-23
seoTitle: "TypeScript — Typer paramètres, retour, callbacks et surcharges"
seoDescription: "Paramètres optionnels, par défaut et rest, inférence du retour, void vs undefined, surcharges et leurs limites, et comment typer proprement les callbacks."
ogVariant: "sage"
related:
  - { framework: "typescript", slug: "interfaces-types" }
---

## La fonction est un contrat à deux faces

Une fonction promet : « donne-moi des entrées de cette forme, je te rends une
sortie de cette forme ». Le compilateur vérifie les deux côtés à chaque appel.
C'est pourquoi le typage des fonctions est l'endroit où TypeScript apporte le
plus de valeur : c'est la **frontière** entre deux morceaux de code.

## Paramètres et retour

Les paramètres doivent **toujours** être annotés : le compilateur ne peut pas
deviner ce que l'appelant enverra. Le retour, lui, est en général **inféré** à
partir du corps.

```ts
function aire(largeur: number, hauteur: number): number {
  return largeur * hauteur;
}
```

:::compare
::bad
```ts
function nom(u: { prenom: string; nom: string }): string {
  return `${u.prenom} ${u.nom}`;
}
```
::
::good
```ts
function nom(u: { prenom: string; nom: string }) {
  return `${u.prenom} ${u.nom}`; // retour inféré : string
}
```
::
:::

**Pourquoi.** Annoter le retour est souvent redondant : TypeScript le calcule à
partir du `return`, et si le corps change, l'inférence suit automatiquement.
Annoter en plus crée une double maintenance. **Mais** annoter le retour sur une
fonction **publique** (exportée, API) est une bonne pratique : ça verrouille le
contrat et fait échouer la compilation **dans la fonction** si tu casses la
promesse, plutôt que chez l'appelant où l'erreur est plus difficile à diagnostiquer.

## Optionnels, valeurs par défaut, rest

Trois mécanismes pour assouplir la liste d'arguments :

```ts
// optionnel : peut être omis, type incluant undefined
function saluer(nom: string, titre?: string) {
  return titre ? `${titre} ${nom}` : nom;
}

// valeur par défaut : type inféré, optionnel à l'appel
function incrementer(n: number, pas = 1) {
  return n + pas;
}

// rest : capture le surplus dans un tableau typé
function somme(...valeurs: number[]) {
  return valeurs.reduce((a, b) => a + b, 0);
}
```

:::callout{type="info"}
`titre?: string` rend le type `string | undefined`. Un paramètre à valeur par
défaut (`pas = 1`) est implicitement optionnel à l'appel, mais à l'intérieur son
type est `number` (jamais `undefined`), puisque le défaut comble le trou. Évite
de combiner `?` et `=` sur le même paramètre : c'est redondant et le `?` devient
inutile.
:::

## `void` vs `undefined`

`undefined` est une **valeur**. `void` signifie « le retour ne sera pas
exploité ». La nuance compte surtout pour les callbacks.

```ts
function log(msg: string): void {
  console.log(msg);
}

type Handler = () => void;
const h: Handler = () => 42; // accepté ! la valeur est juste ignorée
```

**Pourquoi `void` n'est pas `undefined`.** Un type de retour `void` sur une
**signature attendue** veut dire « j'ignore ce que tu retournes ». C'est ce qui
permet de passer `array.forEach(x => maList.push(x))` : `push` retourne un
`number`, mais `forEach` attend `(x) => void`, et la valeur est simplement
écartée. Si `void` était strictement `undefined`, ce code idiomatique échouerait.
À l'inverse, une fonction **déclarée** retournant `void` ne te laissera pas
utiliser sa valeur de retour comme si elle existait.

## Typer les callbacks

Un callback est un paramètre fonction : on le type avec une signature de
fonction. Une fois la signature posée, les paramètres du callback sont
**inférés** à l'appel — tu n'as plus à les réannoter.

:::compare
::bad
```ts
function chaque(liste: number[], cb: Function) {
  liste.forEach(cb); // cb: Function = any déguisé
}
```
::
::good
```ts
function chaque(liste: number[], cb: (valeur: number, i: number) => void) {
  liste.forEach(cb);
}
chaque([1, 2], (v, i) => console.log(v, i)); // v, i inférés
```
::
:::

**Pourquoi.** `Function` est presque aussi dangereux qu'`any` : il accepte
n'importe quelle fonction et ne vérifie ni les paramètres ni le retour de
l'appel. En écrivant la signature complète `(valeur: number, i: number) => void`,
tu obtiens deux choses : le compilateur refuse les callbacks incompatibles, et le
**contextual typing** infère automatiquement le type de `v` et `i` à l'appel.
Plus la signature est précise, moins l'appelant a besoin d'annoter.

## Surcharges (overloads) et quand les éviter

Une surcharge déclare plusieurs **signatures** pour une seule implémentation,
quand la forme du retour dépend de la forme des arguments.

```ts
function reverse(x: string): string;
function reverse<T>(x: T[]): T[];
function reverse(x: string | unknown[]): string | unknown[] {
  return typeof x === "string"
    ? x.split("").reverse().join("")
    : x.slice().reverse();
}
```

Mais les surcharges sont verbeuses et l'implémentation doit gérer tous les cas
manuellement. Quand le retour ne change **pas** selon les entrées, une simple
**union** est plus lisible et mieux inférée :

:::compare
::bad
```ts
function id(x: string): string;
function id(x: number): number;
function id(x: string | number) { return x; }
```
::
::good
```ts
function id<T extends string | number>(x: T): T {
  return x;
}
```
::
:::

**Pourquoi.** Les surcharges multiplient les signatures que le compilateur essaie
**dans l'ordre**, et l'implémentation perd le lien direct entre entrée et sortie.
Ici un **générique** `<T>` exprime la vraie relation — « le retour a le même type
que l'argument » — en une ligne, sans dupliquer. Réserve les surcharges aux cas
où la **structure** du retour diffère réellement (un tableau vs une chaîne),
sinon préfère une union ou un générique.

:::cheatsheet
- title: "paramètres"
  desc: "Toujours annoter : le compilateur ne devine pas les entrées."
- title: "retour"
  desc: "Inféré en local ; annoté sur les fonctions publiques pour verrouiller le contrat."
- title: "param?"
  desc: "Optionnel : type devient T | undefined."
- title: "param = valeur"
  desc: "Défaut : optionnel à l'appel, type plein à l'intérieur."
- title: "...rest"
  desc: "Capture le surplus dans un tableau typé."
- title: "void"
  desc: "Retour ignoré ; tolère qu'un callback renvoie une valeur."
- title: "callback"
  desc: "Type avec une signature complète, jamais Function."
- title: "overloads"
  desc: "À réserver aux retours de structure différente ; sinon union/générique."
:::
