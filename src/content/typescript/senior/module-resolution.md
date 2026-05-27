---
title: "Résolution de modules"
slug: "module-resolution"
framework: "typescript"
level: "senior"
order: 6
duration: 14
prerequisites: ["tsconfig-strict", "declaration-files"]
updated: 2026-05-23
seoTitle: "Résolution de modules TypeScript — bundler, node16/nodenext, verbatimModuleSyntax, exports"
seoDescription: "ESM vs CommonJS, moduleResolution bundler vs node16/nodenext, extensions explicites en ESM, verbatimModuleSyntax et import type, conditional exports dans package.json et le dual package hazard."
ogVariant: "crimson"
related:
  - { framework: "typescript", slug: "declaration-files" }
---

## Deux systèmes de modules, une seule confusion

Avant de parler résolution, il faut séparer deux questions que les débutants
fusionnent. La première : **quelle syntaxe** de modules tu écris — ESM
(`import`/`export`) ou CommonJS (`require`/`module.exports`). La seconde :
**comment le runtime trouve** le fichier visé par un spécificateur
(`"./utils"`, `"lodash"`). TypeScript ne *fait* aucune résolution à l'exécution :
il **simule** celle de ton hôte cible (Node, un bundler) pour vérifier que les
imports tiendront. Le rôle de `moduleResolution` est précisément de dire « voici
l'algorithme que mon hôte utilisera, modélise-le ».

ESM et CommonJS diffèrent sur des points qui *cassent* du code : ESM est
**statique** (les imports sont résolus avant exécution, hissés), CJS est
**dynamique** (`require` est un appel de fonction). ESM exige des **extensions
de fichier explicites**, CJS les devine. Un module ESM ne peut pas `require` un
module CJS sans précaution, et l'inverse n'est possible qu'en asynchrone
(`import()`).

## `moduleResolution` : `bundler` vs `node16`/`nodenext`

C'est le réglage le plus mal compris de tout `tsconfig`. Le bon choix dépend de
**qui** consomme tes fichiers à la fin.

`node16`/`nodenext` modélise la résolution **réelle de Node**. Node lit le champ
`"type"` du `package.json` pour décider si un `.js` est ESM ou CJS, exige des
**extensions explicites** dans les imports ESM, et applique strictement la map
`exports`. Choisis-le quand ton code tourne **directement sous Node** sans
bundler.

`bundler` modélise la résolution **d'un bundler** (Vite, esbuild, webpack). Il
autorise les imports **sans extension**, comprend la map `exports`, mais
n'impose pas les contraintes ESM/CJS de Node parce qu'un bundler les gomme.
Choisis-le quand un bundler avale ton code avant qu'il n'atteigne un runtime.

:::compare
::bad
```ts
// tsconfig: moduleResolution "node16", code destiné à Node ESM
// ("type": "module" dans package.json)
import { parse } from "./parser"; // ERREUR sous node16
```
::
::good
```ts
// Sous node16/nodenext en ESM : l'extension est OBLIGATOIRE
import { parse } from "./parser.js"; // on écrit .js même depuis un .ts
```
::
:::

**Pourquoi.** En ESM, Node ne fait **aucune** résolution « magique » : il ne
teste pas `./parser.ts`, `./parser/index.js`, etc. comme le faisait CJS. Le
spécificateur doit pointer le fichier **tel qu'il existera à l'exécution**.
Comme TypeScript compile `parser.ts` en `parser.js`, c'est l'extension **de
sortie** (`.js`) qu'on écrit dans le `.ts` source — TS le tolère et ne réécrit
pas le chemin. Sous `moduleResolution: "bundler"`, l'import sans extension
passe, parce qu'un bundler refait lui-même la résolution permissive. Le même
import est donc valide ou non *selon la cible* : la config doit refléter le
runtime, pas une préférence esthétique.

## Extensions explicites : la cause racine

La règle « extension obligatoire en ESM » découle directement de la nature
**statique** d'ESM : la spec impose des spécificateurs résolvables sans accès au
système de fichiers ni heuristique. Cela paraît verbeux mais supprime une classe
entière d'ambiguïtés (est-ce `foo.js`, `foo/index.js`, `foo.json` ?). Sous Node
ESM, omettre l'extension lève `ERR_MODULE_NOT_FOUND` à l'exécution — l'erreur
TypeScript de `node16` est donc un service rendu avant le crash.

## `verbatimModuleSyntax` et `import type`

Historiquement, TypeScript **élidait** automatiquement les imports qui ne
servaient qu'aux types (un import utilisé seulement comme annotation
disparaissait du JS émis). Cette magie causait des bugs subtils avec les
side-effects et brouillait la frontière ESM/CJS. `verbatimModuleSyntax: true`
supprime toute cette devinette : ce que tu écris est émis **verbatim**, sauf les
imports marqués `type`, qui sont garantis effacés.

```ts
import type { Config } from "./config";   // EFFACÉ à l'émission (type seul)
import { loadConfig } from "./config";     // CONSERVÉ : valeur runtime
import { type User, createUser } from "./user"; // User effacé, createUser gardé
```

:::callout{type="tip"}
Avec `verbatimModuleSyntax`, tu **dois** marquer `import type` ce qui n'est
qu'un type, sinon l'import reste dans le JS et peut tirer un module entier (ou
casser un consommateur CJS). Le bénéfice : l'émission devient **prévisible** —
plus aucun import n'apparaît ou disparaît selon l'usage. Le compilateur cesse
d'interpréter ton intention et exécute ta déclaration à la lettre.
:::

## Conditional exports : la map `exports`

Le champ `exports` du `package.json` est le point d'entrée moderne d'un package
et **remplace** `main`/`module`/`types` dispersés. Il déclare des **conditions**
résolues dans l'ordre par le runtime : `import` (ESM), `require` (CJS), `types`,
`default`. C'est ainsi qu'un package livre deux builds (ESM et CJS) et le bon
`.d.ts` selon le contexte.

```json
{
  "name": "ma-lib",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./plugin": {
      "types": "./dist/plugin.d.ts",
      "import": "./dist/plugin.mjs"
    }
  }
}
```

La condition `"types"` doit venir **en premier** dans chaque bloc : la résolution
s'arrête à la première condition satisfaite, et un outil cherchant les types ne
doit pas tomber d'abord sur du `.mjs`. `exports` **scelle** aussi le package :
seuls les chemins listés sont importables, les imports profonds (`ma-lib/dist/
interne`) sont bloqués. C'est intentionnel — l'auteur contrôle sa surface
publique.

## Le piège du dual package hazard

Quand un package fournit **à la fois** une version ESM (`import`) et CJS
(`require`), un même module peut être chargé **deux fois** dans le même
processus : une instance par format. Les deux copies ont des classes, des
symboles et un **état** distincts. Un `instanceof` échoue entre elles, un
singleton est dédoublé, un cache se scinde.

:::compare
::bad
```ts
// L'ESM importe la version "import", un dépendant CJS charge la version
// "require" : DEUX instances de la classe Token coexistent.
import { Token } from "ma-lib";
// ... ailleurs un module CJS fait require("ma-lib")
token instanceof TokenFromCJS; // false — pourtant "même" classe
```
::
::good
```ts
// Build ESM unique ; la condition "require" pointe un fin shim qui
// re-exporte l'ESM, ou la lib n'expose que de l'ESM. Une seule instance.
import { Token } from "ma-lib"; // toute consommation passe par le même module
```
::
:::

**Pourquoi.** Node identifie un module par son **chemin résolu**. ESM et CJS
résolvent vers des fichiers physiques différents (`index.mjs` vs `index.cjs`),
donc Node les traite comme deux modules sans lien et exécute leur code source
deux fois. Tout état porté par le module (instances de classe, `WeakMap`,
compteur) est **dupliqué**. `instanceof` compare des références de constructeur :
deux copies = deux constructeurs ≠ . La parade est d'éviter de dédoubler le code
porteur d'état — soit en ne publiant qu'ESM, soit en faisant pointer la branche
CJS vers un wrapper qui **importe** la branche ESM, pour qu'il n'existe qu'une
seule définition vivante.

:::cheatsheet
- title: "ESM vs CommonJS"
  desc: "ESM statique, extensions obligatoires ; CJS dynamique, résolution permissive."
- title: "moduleResolution: node16/nodenext"
  desc: "Modélise Node réel : type du package.json, extensions explicites, exports stricts."
- title: "moduleResolution: bundler"
  desc: "Modélise un bundler : imports sans extension tolérés, comprend exports."
- title: "extension .js dans un .ts"
  desc: "En ESM on écrit l'extension de SORTIE (.js) ; TS ne réécrit pas le chemin."
- title: "verbatimModuleSyntax"
  desc: "Émission prévisible : import type effacé, le reste conservé verbatim."
- title: "exports map"
  desc: "Point d'entrée par conditions (types > import > require). Scelle la surface publique."
- title: "dual package hazard"
  desc: "ESM+CJS = module chargé 2x, état dédoublé, instanceof cassé. Évite le code à état dupliqué."
:::
