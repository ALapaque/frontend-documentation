---
title: "Les fichiers de déclaration"
slug: "declaration-files"
framework: "typescript"
level: "senior"
order: 5
duration: 14
prerequisites: ["types-basics", "tsconfig-strict"]
updated: 2026-05-23
seoTitle: "Fichiers .d.ts TypeScript — declare, declare module, declare global, augmentation"
seoDescription: "Typer du JS non typé avec des .d.ts : declare, declare module et augmentation de module, types ambiants vs @types, declare global, génération automatique et le piège des types publiés non testés."
ogVariant: "crimson"
related:
  - { framework: "typescript", slug: "generics" }
---

## Le rôle d'un `.d.ts` : du type sans implémentation

Un fichier de déclaration ne contient **que des types**, jamais de code
exécutable. Il décrit la *forme* d'une valeur qui existe ailleurs — dans un
module JavaScript non typé, dans une variable globale injectée par
l'environnement, dans une API runtime. Le mot-clé central est `declare` : il dit
au compilateur « cette entité existe à l'exécution, fais-moi confiance pour son
type, n'émets rien ». Un `.d.ts` est donc un **contrat** posé par-dessus du code
opaque, sans le réécrire.

```ts
// global.d.ts
declare const __APP_VERSION__: string;        // injectée par le bundler
declare function gtag(...args: unknown[]): void; // script tiers global

declare module "legacy-lib" {                  // module JS sans types
  export function compute(input: number): number;
  export const VERSION: string;
}
```

Sans `declare`, écrire `const x: string` génère du JS (`const x = ...`). Avec
`declare`, rien n'est émis : tu **annotes** une réalité externe au lieu de la
créer.

## Typer du JavaScript non typé

C'est le cas le plus fréquent : une lib publiée en JS pur, sans `.d.ts` ni
package `@types`. Tu écris une déclaration ambiante qui décrit son API publique.
La discipline ici est de **ne typer que ce que tu utilises** et de rester fidèle
au comportement runtime réel.

:::compare
::bad
```ts
// On déclare le module en gros, tout en any : le typage ne sert à rien.
declare module "fancy-grid" {
  const grid: any;
  export = grid;
}

import grid from "fancy-grid";
grid.renderr({}); // faute de frappe NON détectée : tout est any
```
::
::good
```ts
declare module "fancy-grid" {
  export interface GridOptions { columns: number; virtual?: boolean }
  export class Grid {
    constructor(el: HTMLElement, opts: GridOptions);
    render(): void;
    destroy(): void;
  }
  export = Grid;
}

import Grid from "fancy-grid";
const g = new Grid(el, { columns: 3 });
g.renderr(); // ERREUR : 'renderr' n'existe pas sur Grid
```
::
:::

**Pourquoi.** `declare module "x" { const grid: any }` satisfait le compilateur
(l'import résout, plus d'erreur « impossible de trouver le module ») mais
désactive toute vérification : `any` se propage à chaque accès. Tu obtiens le
silence, pas la sécurité. Décrire les **vraies** signatures fait travailler le
système de types : une méthode mal orthographiée, un argument manquant, un
mauvais type d'option sont rattrapés. Le coût est de maintenir la déclaration en
phase avec la lib — mais une déclaration partielle et juste vaut infiniment mieux
qu'un `any` global qui crée une illusion de typage.

## Augmentation de module

`declare module "x"` a un deuxième usage, distinct du précédent : **augmenter**
un module qui possède déjà des types. Quand tu rouvres un module existant, tu
n'écrases pas ses déclarations, tu y **ajoutes** — c'est le *module
augmentation*. Indispensable pour les plugins qui greffent des propriétés sur des
types tiers.

```ts
import "express"; // l'import ancre l'augmentation à un vrai module

declare module "express" {
  interface Request {
    user?: { id: string; role: string }; // ajoutée par ton middleware d'auth
  }
}
```

:::callout{type="warn"}
L'augmentation ne fonctionne que si le fichier est un **module** (il contient au
moins un `import`/`export`). Dans un fichier de script (sans import/export),
`declare module "express"` ne *rouvre* pas le module Express : il **déclare** un
tout nouveau module ambiant qui masque le vrai et casse tous ses types. Ajoute
un `import` ou `export {}` pour rendre le fichier modulaire et changer la
sémantique de fond en comble.
:::

## Types ambiants vs `@types` / DefinitelyTyped

Deux sources de déclarations coexistent. Les **types ambiants** sont les `.d.ts`
que tu écris dans ton projet (globals, augmentations, shims). Les packages
**`@types/*`** viennent du dépôt communautaire **DefinitelyTyped** : ce sont des
`.d.ts` publiés sur npm pour des libs JS populaires (`@types/lodash`,
`@types/node`). TypeScript les découvre automatiquement via `typeRoots`
(`node_modules/@types` par défaut). Une lib moderne **embarque** souvent ses
propres types (champ `types`/`typings` dans son `package.json`), rendant
`@types` inutile.

```ts
// L'ordre de résolution d'un import : types embarqués > @types > shim ambiant
import _ from "lodash"; // résout @types/lodash si la lib n'embarque pas ses types
```

## `declare global`

Pour ajouter au **scope global** (pas à un module nommé) depuis un fichier qui
*est* un module, on utilise `declare global`. C'est ainsi qu'on type une
propriété ajoutée à `window`, une variable injectée, ou qu'on étend `globalThis`.

```ts
export {}; // force le statut de module

declare global {
  interface Window {
    dataLayer: unknown[];
  }
  var FEATURE_FLAGS: Record<string, boolean>;
}

window.dataLayer.push({ event: "page_view" }); // typé
```

Le `export {}` est crucial : sans lui, le fichier serait un script et ses
déclarations seraient *déjà* globales — `declare global` y serait alors une
erreur. Le bloc `global` est la passerelle entre l'espace modulaire et l'espace
global.

## Générer des déclarations automatiquement

Si **toi** publies une lib en TypeScript, tu n'écris pas les `.d.ts` à la main :
le compilateur les **émet** à partir de tes sources avec `declaration: true`.
`emitDeclarationOnly` produit les `.d.ts` sans le JS (utile quand un bundler gère
le JS) ; `declarationMap` ajoute des *source maps* pour que « aller à la
définition » saute vers ton `.ts` source.

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": false
  }
}
```

Pointe ensuite le champ `types` de ton `package.json` vers le `.d.ts` racine
généré pour que les consommateurs les trouvent.

:::callout{type="info"}
Le piège des types publiés : un `.d.ts` n'est **vérifié contre rien**. Rien ne
garantit qu'il décrit fidèlement le JS livré — ni qu'il reste juste après un
refactor. Une lib peut publier des types qui mentent sur son propre runtime. Côté
producteur, fais générer les types depuis les sources (pas à la main) et active
des tests de types (`tsd`, `expect-type`) ; côté consommateur, traite un `.d.ts`
tiers comme une promesse non testée, pas comme une vérité — surtout les `@types`
maintenus par la communauté, parfois en retard sur la lib réelle.
:::

:::cheatsheet
- title: ".d.ts"
  desc: "Fichier de types pur, aucune émission de JS. Décrit du code qui existe ailleurs."
- title: "declare"
  desc: "Annonce qu'une entité existe au runtime sans la créer (var, function, class, module)."
- title: "declare module \"x\" { ... }"
  desc: "Type un module JS non typé OU augmente un module typé existant (si le fichier est un module)."
- title: "augmentation de module"
  desc: "Rouvre un module pour y ajouter des membres ; nécessite import/export dans le fichier."
- title: "@types / DefinitelyTyped"
  desc: "Déclarations communautaires sur npm, trouvées via node_modules/@types. Souvent en retard."
- title: "declare global { }"
  desc: "Ajoute au scope global depuis un module ; exige export {} pour être un module."
- title: "declaration: true"
  desc: "Émet les .d.ts depuis les sources ; declarationMap pour pointer vers le .ts d'origine."
- title: "piège des types publiés"
  desc: "Un .d.ts n'est vérifié contre aucun runtime : il peut mentir. Génère, ne rédige pas."
:::
