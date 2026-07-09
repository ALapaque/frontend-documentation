---
title: "Syntaxe erasable : le TS que Node exécute"
slug: "erasable-syntax"
framework: "typescript"
level: "senior"
order: 8
duration: 15
prerequisites: ["tsconfig-strict"]
updated: 2026-07-09
seoTitle: "TypeScript erasableSyntaxOnly — écrire du TS que Node exécute sans compiler"
seoDescription: "Node exécute désormais le TypeScript en effaçant les types, sans transpilation. Mais certaines constructions (enum, namespace, paramètres-propriétés) émettent du code et cassent ce modèle. --erasableSyntaxOnly garde ton code compatible avec le type-stripping natif."
ogVariant: "iris"
related:
  - { framework: "typescript", slug: "module-resolution" }
  - { framework: "typescript", slug: "enums-alternatives" }
---

## Node exécute maintenant tes `.ts`

Node — comme Deno et Bun avant lui — lance désormais tes fichiers `.ts` en
**effaçant** simplement les annotations de type. Pas de transpilation, pas de
source map, pas de dossier `dist/` : le runtime retire les types et exécute
le JavaScript qui reste. Tu tapes `node serveur.ts` et ça tourne.

Le prix de cette magie : ton TypeScript ne doit contenir **que** de la syntaxe
effaçable. Une syntaxe est effaçable si la supprimer ne change **rien** au
comportement — c'est le cas de `: string` ou d'une `interface`. Dès qu'une
construction **émet** du JavaScript (`enum`, `namespace` avec du code,
`constructor(private x)`), le modèle casse : il n'y a plus rien à effacer, il
faudrait *transformer*.

Les versions, vérifiées, côté Node :

```bash
# v22.6.0            : --experimental-strip-types apparaît (derrière un flag)
# v22.18.0 / v23.6.0 : activé par défaut, sans flag
# v24.12.0 / v25.2.0 : stabilisé (Stability 2)
# v26.0.0            : --experimental-transform-types retiré
node --version   # >= 22.18 : node app.ts marche sans rien configurer
```

C'est un changement de **modèle**. Pour du code serveur, un script, un outil,
l'étape de build disparaît : plus de `tsc` en watch, plus de `ts-node`. Tu
édites, tu réexécutes, tu vois le résultat.

## Comment le stripping efface les types

Le détail qui explique tout : Node ne *supprime* pas les caractères de type, il
les **remplace par des espaces** de même longueur. Une ligne
`const port: number = 3000` devient `const port         = 3000`. Les positions —
ligne et colonne — sont donc **préservées** à l'identique.

:::callout{type="info"}
C'est pour ça qu'il n'y a pas de source map. Chaque token JavaScript restant
exactement là où tu l'as écrit, une stack trace pointe déjà la bonne ligne du
`.ts` : le fichier émis est *aligné* sur la source, caractère pour caractère.
:::

Corollaire important : le stripping **ne vérifie rien**. Il efface sans valider —
une erreur de type ne fait pas broncher Node, elle passe et explose (ou pas) à
l'exécution. Le type-checking reste un job séparé, avec `tsc --noEmit` en CI.

## Ce qui n'est pas effaçable

Quatre familles de constructions émettent du JavaScript. Node les refuse avec
`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`. Comprendre **pourquoi** chacune émet évite
de les réintroduire par habitude.

**`enum`** — Un `enum Role { Admin, User }` se compile en un **objet** vivant à
l'exécution, avec un mapping inverse (`Role[0] === "Admin"`). Cet objet doit être
*construit* : pas réductible à des espaces. Le `const enum` n'aide pas — il exige
d'**inliner** ses valeurs partout, ce qu'un outil mono-fichier ne peut pas faire.

**`namespace` avec corps runtime** — `namespace N { export const x = 1 }` émet
une variable et une IIFE qui la remplit. Le corps *est* du code. Un namespace
qui ne contient **que** des types (`export type`, `interface`) n'émet rien et
reste autorisé : c'est la présence de valeurs à l'exécution qui bloque.

**Paramètres-propriétés** — `constructor(private repo: Repo) {}` est un
raccourci que TypeScript **déploie** en une déclaration de champ *plus* une
affectation `this.repo = repo` dans le constructeur. Effacer le seul mot-clé
`private` supprimerait cette affectation : `this.repo` resterait `undefined`. Le
compilateur *ajoute* du code, il n'en retire pas.

**`import =` / `export =`** — `import fs = require("node:fs")` et `export = ...`
sont la syntaxe d'interop CommonJS. Elles se traduisent en appels `require` /
`module.exports` : du code, lié à un format de module précis, non effaçable.

:::callout{type="warn"}
Les décorateurs *legacy* (`experimentalDecorators`) émettent aussi du code et ne
passent pas le stripping ; les décorateurs standards (TC39) ne sont pas encore
natifs non plus. Vise le type-stripping, considère les décorateurs hors-jeu.
:::

## `--erasableSyntaxOnly` : le garde-fou tsc

Vue depuis Node seul, la contrainte est invisible tant que tu ne butes pas
dessus. `--erasableSyntaxOnly` (TypeScript 5.8) déplace le contrôle **à la
compilation** : `tsc` refuse toute construction non effaçable. Tu attrapes le
problème dans l'éditeur, pas au premier `node app.ts`.

:::compare
::bad
```ts
// tsconfig sans erasableSyntaxOnly : tsc accepte, Node refuse à l'exécution
enum Role { Admin, User }                     // émet un objet
namespace Config { export const port = 3000 } // émet une IIFE
class Service {
  constructor(private repo: Repo) {}          // émet this.repo = repo
}
import fs = require("node:fs");                // émet un require
```
::
::good
```ts
// tsconfig: { "erasableSyntaxOnly": true } — tsc bloque tout ce qui émet
const Role = { Admin: "admin", User: "user" } as const;
type Role = (typeof Role)[keyof typeof Role];
const config = { port: 3000 } as const;
class Service {
  private repo: Repo;
  constructor(repo: Repo) {
    this.repo = repo; // affectation explicite : du vrai JS, ça reste
  }
}
import fs from "node:fs";
```
::
:::

Active-la dès que ta cible strippe (Node moderne, Deno, Bun) ou un pipeline
mono-fichier (esbuild, swc). Elle ne change **rien** au JavaScript émis — elle
ne fait qu'**interdire** en amont ce qui casserait le stripping.

## Les alternatives aux constructions interdites

Chaque construction bannie a un remplaçant idiomatique et effaçable :

- **`enum`** → une union de littéraux, ou un objet `as const` doublé d'un type
  dérivé (voir l'article dédié aux alternatives aux enums), sans objet runtime.
- **Paramètre-propriété** → déclare le champ, puis affecte-le explicitement dans
  le constructeur. Trois lignes de plus, zéro magie de compilation.
- **`namespace` de valeurs** → un module ESM ordinaire, ou un simple objet.
- **`import = require()`** → un `import` ESM standard.

## Le lien avec `isolatedModules` et `verbatimModuleSyntax`

Le type-stripping est l'aboutissement d'une idée plus ancienne : la
**compilation fichier par fichier**. Deux options t'y préparent.

`isolatedModules` garantit que chaque fichier se transpile **seul**, sans vue
globale du projet. Il interdit déjà ce qui exigerait cette vue (ré-exports
ambigus, `const enum` traversant les fichiers). Le stripping est le cas limite :
chaque fichier traité isolément, sans même un resolver.

`verbatimModuleSyntax` complète le tableau côté imports. Un stripper ne fait
**pas** d'élision dirigée par les types : il ne peut pas deviner, en lisant un
seul fichier, si `import { Foo }` désigne un type ou une valeur. Tu dois le lui
**dire** : `import type { Config }` est effacé, `import { loadConfig }` est
conservé. Le non-marqué reste dans le JS.

:::callout{type="tip"}
Le trio `erasableSyntaxOnly` + `isolatedModules` + `verbatimModuleSyntax` forme
le socle « un fichier, une passe, aucune devinette ». C'est exactement le
contrat que respectent Node, esbuild et swc. Active les trois ensemble : ils se
renforcent.
:::

## Quand adopter (et où sont les limites)

Adopte le type-stripping pour tout ce qui tourne **directement sous Node** :
API et services, scripts one-shot, outils CLI, tests. Tu supprimes une étape de
build et tu réexécutes à chaud. Pour ce genre de code, le gain est net. Les
limites, en revanche, sont réelles :

- **Le navigateur reste tributaire d'un bundler.** Le stripping ne résout pas
  les specifiers nus (`import x from "lodash"`), ne minifie pas, ne fait ni
  tree-shaking, ni code splitting, ni gestion du CSS.
- **Ni down-leveling, ni JSX.** Node exécute le JavaScript moderne restant sans
  abaisser ta syntaxe et ne transforme pas `.tsx` : un vieux moteur ou un fichier
  JSX demande toujours un vrai transpileur.
- **Aucun type-checking.** Le stripping efface sans valider. Garde
  `tsc --noEmit` en CI pour attraper les erreurs que Node ignore.

## À retenir

Le type-stripping fait tomber l'étape de build pour le code serveur, à une
condition : n'écrire que de la syntaxe effaçable. `erasableSyntaxOnly` transforme
cette condition implicite en règle vérifiée par `tsc`, et t'évite de découvrir
le problème en production.

:::cheatsheet
- title: "Type-stripping"
  desc: "Node remplace les types par des espaces (positions préservées), exécute le JS restant. Pas de source map, pas de build."
- title: "Versions Node"
  desc: "Défaut dès 22.18 / 23.6, stable en 24.12 / 25.2. node app.ts marche sans flag."
- title: "Non effaçable = interdit"
  desc: "enum, namespace avec runtime, paramètres-propriétés, import =/export =. Ils émettent du JS."
- title: "Pourquoi ça émet"
  desc: "enum → objet + mapping inverse ; namespace → IIFE ; private x → this.x = x ; import = → require."
- title: "erasableSyntaxOnly"
  desc: "Option tsc 5.8 : bloque à la compilation tout ce qui casse le stripping. N'altère pas le JS émis."
- title: "Le socle mono-fichier"
  desc: "erasableSyntaxOnly + isolatedModules + verbatimModuleSyntax : un fichier, une passe, marque import type."
- title: "Limites"
  desc: "Le navigateur veut un bundler. Pas de down-level, pas de JSX, pas de type-check : garde tsc --noEmit."
:::
