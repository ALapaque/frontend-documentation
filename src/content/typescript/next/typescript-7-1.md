---
title: "TypeScript 7.1 : l'API revient, les content mappers arrivent"
slug: "typescript-7-1"
framework: "typescript"
level: "next"
order: 2
duration: 13
prerequisites: ["typescript-7", "declaration-files", "conditional-types"]
updated: 2026-11-27
seoTitle: "TypeScript 7.1 beta — nouvelle API, content mappers, es2026"
seoDescription: "TypeScript 7.1 est en beta depuis le 20 octobre 2026 : une API repensée en points d'entrée (typescript/sync, /async, /fs, /ast), les content mappers pour Vue, Svelte, Astro et MDX, es2026 et un contrôle plus strict des types conditionnels. Ce qui change, ce qui casse, et qui peut migrer."
ogVariant: "iris"
related:
  - { framework: "typescript", slug: "typescript-7" }
  - { framework: "typescript", slug: "conditional-types" }
  - { framework: "typescript", slug: "declaration-files" }
  - { framework: "angular", slug: "angular-22" }
---

:::callout{type="warn"}
**Statut en novembre 2026.** TypeScript 7.1 est en **beta** depuis le 20 octobre
2026 (`npm i -D typescript@beta`). La Release Candidate était annoncée « dans
environ un mois » : au 27 novembre, aucune n'est publiée et `latest` reste la
7.0.2. Des noms peuvent encore bouger ; cet article sera relu à la sortie stable.
:::

## Ce que la 7.0 avait laissé fermé

[TypeScript 7.0](/typescript/next/typescript-7) a livré le compilateur natif :
même langage, vérification environ dix fois plus rapide. Mais c'était une boîte
fermée. Tu pouvais la lancer en ligne de commande, pas la piloter depuis du code,
et elle ne lisait que du TypeScript et du JavaScript. Tout ce qui *embarque* le
compilateur — Volar pour Vue, Svelte, Astro et MDX, les templates Angular, le lint
typé — est donc resté sur TypeScript 6.

La 7.1 ouvre la boîte par deux côtés : une **API** pour écrire des outils
au-dessus du compilateur, et des **content mappers** pour lui faire lire autre
chose que du TypeScript. S'y ajoutent quelques nouveautés de langage, un contrôle
de types plus strict et de nouveaux gains : 1,2× à 1,9× plus rapide que la 7.0 et
16 % à 50 % de mémoire en moins selon le dépôt, d'après les mesures de l'annonce.

## La nouvelle API : des points d'entrée, plus un seul bloc

L'API de la 6.x était un module monolithique : tout vivait sous l'objet `ts`.
Celle de la 7.1 est découpée en points d'entrée. Ce n'est pas un renommage mais
une **rupture** : un script écrit pour la 6.x est à réécrire.

| Point d'entrée | Rôle |
| --- | --- |
| `typescript/sync` | Client synchrone du compilateur : options, programme, type-checker |
| `typescript/async` | Le même client, à base de promesses |
| `typescript/fs` | Systèmes de fichiers virtuels, complets ou en couches |
| `typescript/ast` | Types et enums de l'arbre ; gardes sous `/ast/is`, fabriques sous `/ast/factory` |

:::compare
::bad
```ts
// API 6.x : tout passe par l'objet `ts`
import ts from "typescript";
const program = ts.createProgram(["src/main.ts"], { strict: true });
// En 7.1.0-beta, `ts` n'expose plus que `version` et `versionMajorMinor`.
```
::
::good
```ts
// API 7.1 : un client explicite, libéré en fin de portée
import { API, formatDiagnosticsWithColorAndContext } from "typescript/sync";

using api = new API();
using program = api.createProgram(["src/main.ts"], { strict: true, noEmit: true });
const diagnostics = program.getSemanticDiagnostics();
console.log(formatDiagnosticsWithColorAndContext(diagnostics, api));
```
::
:::

**Pourquoi.** Le compilateur est désormais un programme Go : ton code JavaScript
ne l'*est* plus, il lui *parle*. `API` est un client, et les objets qu'il crée
(`Program`, snapshots) ont une moitié côté Go que le ramasse-miettes de JavaScript
ne voit pas : abandonnés, ils font fuir la mémoire. Ce sont donc des `Disposable`.
Soit tu les déclares avec `using`, qui appelle `[Symbol.dispose]()` à la sortie
du bloc (`tsc` le transpile si ton runtime ne le connaît pas), soit tu appelles
toi-même `api.close()` et `program.dispose()`. Côté `typescript/async`, c'est
`await using`.

### Snapshots : le projet à un instant donné

Cet exemple est un *batch* : on construit tout, on lit les erreurs, on jette. Un
éditeur ou un mode watch ne peut pas reconstruire le monde à chaque frappe.
L'API modélise donc le temps avec des **snapshots** : une version de tous les
projets et programmes à un instant donné, dont tu dérives la suivante.

```ts
// `api` : le client ci-dessus ; `file` : chemin absolu ; helpers de "typescript/fs".
using avant = api.createSnapshot({
  fileSystem: createFileSystemWithLib([[file, 'export const prix: number = "12";']]),
  createPrograms: [{ rootFiles: [file], compilerOptions: { strict: true } }],
});
using programme = avant.operation.createdPrograms[0];
console.log(programme.getSemanticDiagnostics().length); // 1

using apres = avant.update({
  fileSystem: createFileSystemLayer([[file, "export const prix: number = 12;"]]),
  ensurePrograms: [programme.id],
});
using corrige = apres.getProgram(programme.id);
console.log(corrige?.getSemanticDiagnostics().length); // 0
```

`createFileSystemWithLib` décrit un système de fichiers **complet** en mémoire,
plus les `lib.*.d.ts` du compilateur ; `createFileSystemLayer` ne décrit que les
fichiers **modifiés**, le reste retombe sur la couche précédente. Sans rien
préciser, l'API lit le disque. `ensurePrograms` force le recalcul des programmes
cités, et l'ancien snapshot reste interrogeable. La surveillance des fichiers
n'est pas fournie : à ton outil de transmettre les changements à `update()`.

## Content mappers : `tsc` lit autre chose que du TypeScript

Un composant `.vue`, `.svelte` ou `.astro` contient du TypeScript sans être un
fichier TypeScript. Jusqu'ici, Volar faisait le pont : il traduit le fichier en
code virtuel, le donne à TypeScript, puis ramène erreurs et complétions à la
bonne position. Ça marche dans l'éditeur, au prix de contournements, et en ligne
de commande chaque format garde son vérificateur à part : `vue-tsc`,
`svelte-check`, `astro check`.

La 7.1 fait de ce modèle un point d'extension officiel. Un **content mapper** est
un paquet enregistré pour une extension de fichier : il fournit à TypeScript une
représentation virtuelle du fichier et les correspondances vers les régions
d'origine. La promesse : un seul `tsc` qui vérifie les `.ts` et les composants
dans la même passe, à la vitesse du natif.

```json
{
  "compilerOptions": { "strict": true, "noEmit": true },
  "contentMappers": [
    { "package": "@vue/content-mapper", "extensions": [".vue"] }
  ]
}
```

`contentMappers` est une clé de **premier niveau** du `tsconfig.json` ; `package`
et `extensions` sont obligatoires, un objet `options` propre au mapper est
facultatif. Mais la déclarer ne suffit pas. Un content mapper est du **code
arbitraire** que le compilateur exécute : il faut l'autoriser à chaque lancement,
avec `tsc --runExternalCode`. Dans VS Code, il faut la confiance accordée au
workspace *et* une autorisation propre aux mappers ; le réglage
`js/ts.contentMappers.enabled` coupe tout. Traite un mapper comme toute
dépendance qui s'exécute pendant ton build : voir
[Supply chain npm](/tooling/medior/npm-supply-chain-security).

:::callout{type="warn"}
**Novembre 2026.** Côté écosystème, rien n'est stable. L'annonce cite des mappers
« prototypés ou implémentés » pour Astro, CSS Modules, Ember, MDX, Svelte et Vue.
Sur npm, `@vue/content-mapper` n'existe qu'en alpha (`4.0.0-alpha.3`, qui exige
`typescript >=7.1.0-beta`) : à essayer sur une branche, pas en production.
:::

## Langage et bibliothèque standard

**Modules ambiants par attribut.** Pour typer `import theme from "./theme.css"`,
tu écrivais une [déclaration ambiante](/typescript/senior/declaration-files) par
extension : `declare module "*.css"`. Or ce qui décide du résultat à l'exécution,
c'est l'**attribut** d'import, pas l'extension, et rien ne signalait un attribut
oublié. La 7.1 permet de déclarer le module *par attribut* :

```ts
// assets.d.ts — à écrire dans ton projet : TypeScript ne le fournit pas
declare module "*" with { type: "css" } {
  const sheet: CSSStyleSheet;
  export default sheet;
}

// app.ts
import theme from "./theme.css" with { type: "css" }; // CSSStyleSheet
import oubli from "./autre.css"; // TS2307 : sans attribut, aucun module ne correspond
```

Comme pour toute déclaration ambiante, TypeScript ne vérifie pas que le fichier
existe sur le disque : cette erreur-là reste l'affaire du bundler ou du runtime.

**`import source`.** `import source filtre from "./filtre.wasm"` importe un
module dans sa *phase source* : analysé par le runtime, mais ni lié ni exécuté.
Pour du WebAssembly, tu obtiens un `WebAssembly.Module` à passer toi-même à
`WebAssembly.instantiate()`. Côté types, c'est un `AbstractModuleSource`, nouveau
type global de `lib.esnext` ; il faut `module` à `esnext`, `nodenext` ou
`preserve`.

:::callout{type="warn"}
**Novembre 2026.** Les *source phase imports* sont une proposition TC39 au
stage 3, pas encore dans le standard. Selon l'annonce, Node.js récent accepte la
forme WebAssembly, mais beaucoup d'environnements ignorent encore la forme
JavaScript. TypeScript te laisse l'écrire ; ton runtime, pas forcément.
:::

**`es2026`.** C'est désormais une valeur stable de `target` et de `lib`, et la
cible par défaut de la beta. Seule la bibliothèque change : `getOrInsert()` et
`getOrInsertComputed()` sur `Map` et `WeakMap`, `Math.sumPrecise()`,
`Error.isError()`, `Array.fromAsync()`, `Iterator.concat()`, `JSON.rawJSON()`,
base64 et hexadécimal sur `Uint8Array`. `lib: esnext` reçoit `Promise.allKeyed`,
`Iterator.zip` et, sur les itérateurs, `chunks`, `join` et `includes`. Rappel :
`lib` **déclare** ces méthodes, il ne les fournit pas. `tsc` ne polyfille rien.

## Ce qui casse : les conditionnels distributifs

Un [type conditionnel](/typescript/senior/conditional-types) appliqué à un
paramètre nu se **distribue** sur les unions : chaque membre est évalué à part.
Dans une branche, `A` ne désigne donc plus l'union entière mais **un seul** de
ses membres. Jusqu'à la 7.0, TypeScript confondait les deux. Plus maintenant.

```ts
type Paire<A extends number, B extends A> = `${B} dans ${A}`;

type Avant<A extends number, B extends A> =
  A extends B ? never : Paire<A, B>;
// TS2344: Type 'B' does not satisfy the constraint 'A'.
//   'B' is only assignable to the non-distributed 'A',
//   but 'A' has been distributed here.

// Tu ne voulais pas distribuer : enveloppe dans un tuple
type Apres<A extends number, B extends A> =
  [A] extends [B] ? never : Paire<A, B>;
```

L'erreur est juste. Avec `Avant<0 | 1, 0>`, `A` vaut tour à tour `0` puis `1` ;
quand il vaut `1`, `B` vaut toujours `0`, qui respecte la contrainte face à
l'union mais pas face à `1`. L'ancien comportement fabriquait `"0 dans 1"` sans
broncher. Si tu tiens à la distribution, revérifie la contrainte dans la
branche : `B extends A ? Paire<A, B> : never`. Autre source possible d'erreurs
nouvelles : les types du DOM de `lib.d.ts` ont été régénérés.

## Qui peut migrer, et quand

| Ton projet | État en novembre 2026 | Consigne |
| --- | --- | --- |
| TypeScript pur (bibliothèque, Node, React) | Déjà compatible avec la 7.0 | Tester la beta en CI |
| Angular | `@angular/compiler-cli` 22.3.0 exige `typescript >=6.0 <6.1` | Rester en 6.0 |
| Svelte, Astro | `svelte-check` 4.7.8 et `@astrojs/check` 0.9.12 exigent `^5.0.0 \|\| ^6.0.0` | Rester en 6.0 |
| Vue | `@vue/content-mapper` et `@vue/language-core` 4.0 en alpha | Garder l'outillage stable |
| Lint typé | `typescript-eslint` 8.74.0 exige `typescript >=4.8.4 <6.1.0` | Garder TS 6 pour ESLint |

Un signe que ça bouge : le parseur de `typescript-eslint` déclare déjà une *peer
dependency* optionnelle `@typescript/native` qui vise la 7.1 beta. La
cohabitation décrite dans [l'article sur la 7.0](/typescript/next/typescript-7)
reste donc la bonne stratégie : TypeScript 6 sous le nom `typescript`, le
compilateur natif sous l'alias `@typescript/native`. En attendant la stable :

- lance la beta sur ton code sans l'installer (`npx -p typescript@beta tsc
  --noEmit`), puis dans un job de CI **non bloquant** ;
- repère quels outils dépendent du compilateur avec `npm explain typescript` ;
- si tu maintiens un script fondé sur `ts.createProgram`, prévois une
  **réécriture** sur `typescript/sync`, pas un rechercher-remplacer.

## À retenir

La 7.0 changeait le moteur, la 7.1 rouvre le capot. L'API revient sous une autre
forme : des points d'entrée, un client qui parle au compilateur Go, des objets à
libérer avec `using`, des snapshots pour modéliser le temps. Les content mappers
font entrer Vue, Svelte, Astro et MDX dans `tsc`, derrière un flag explicite
parce qu'ils exécutent du code. Tout cela est en beta : teste maintenant, migre
quand ton outillage aura suivi.

:::cheatsheet
- title: "7.1.0-beta"
  desc: "Publiée le 20 octobre 2026 sous le tag npm beta. Pas de RC au 27 novembre ; latest reste la 7.0.2."
- title: "typescript/sync"
  desc: "API découpée en points d'entrée : /sync, /async, /fs, /ast. L'objet ts monolithique de la 6.x n'existe plus."
- title: "using api = new API()"
  desc: "API, Program et snapshots sont Disposable : using, ou close() et dispose() à la main, sinon la mémoire fuit côté Go."
- title: "contentMappers"
  desc: "Clé de premier niveau du tsconfig (package, extensions). Rien ne s'exécute sans tsc --runExternalCode."
- title: "Conditionnels distributifs"
  desc: "Dans une branche distribuée, A n'est plus l'union d'origine : erreur TS2344 en 7.1. Tuple [A] ou garde en plus."
:::
