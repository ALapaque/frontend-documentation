---
title: "tsconfig strict & options modernes"
slug: "tsconfig-strict"
framework: "typescript"
level: "senior"
order: 4
duration: 17
prerequisites: ["narrowing", "utility-types"]
updated: 2026-05-23
seoTitle: "tsconfig strict TypeScript — strictNullChecks, noUncheckedIndexedAccess, bundler"
seoDescription: "La famille strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, verbatimModuleSyntax et moduleResolution bundler. Pourquoi activer strict dès le départ coûte moins cher que migrer."
ogVariant: "crimson"
related:
  - { framework: "typescript", slug: "narrowing" }
  - { framework: "typescript", slug: "conditional-types" }
---

## La compilation ne valide pas, elle vérifie ce que tu lui demandes

Un `tsconfig.json` n'est pas un fichier de build : c'est le **contrat de
rigueur** que le compilateur applique. Par défaut, sans `strict`, TypeScript est
laxiste — il accepte des `any` implicites, ignore `null`, et te laisse écrire du
JavaScript à peine annoté. La valeur du langage est proportionnelle à la sévérité
que tu actives. Comprendre chaque flag, c'est savoir *quelle classe de bug* il
élimine.

## La famille `strict`

`"strict": true` est un **méta-flag** : il active d'un coup une douzaine de
contrôles, et en activera de nouveaux à chaque version majeure. Les plus
structurants :

- **`strictNullChecks`** : `null` et `undefined` ne sont plus assignables à
  n'importe quel type. `string` ne contient plus `null` ; tu dois écrire
  `string | null` explicitement et **narrower** avant usage. C'est de loin le
  flag qui élimine le plus de bugs réels (le « billion dollar mistake »).
- **`noImplicitAny`** : un paramètre ou une variable dont le type ne peut être
  inféré devient une erreur au lieu de retomber silencieusement sur `any`. Tu es
  forcé d'annoter ou de laisser l'inférence faire son travail.
- **`strictFunctionTypes`** : vérifie les paramètres de fonction en
  **contravariance** (sauf les méthodes, laissées bivariantes pour compatibilité).
  Empêche d'assigner `(x: Animal) => void` là où l'on attend `(x: Dog) => void`.
- **`strictBindCallApply`** : type correctement `bind`, `call`, `apply`.
- **`strictPropertyInitialization`** : une propriété de classe non optionnelle
  doit être initialisée dans le constructeur (ou marquée `!`).
- **`useUnknownInCatchVariables`** : la variable d'un `catch` est `unknown`, pas
  `any` — tu dois la narrower avant de la lire.

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

:::callout{type="tip"}
N'active jamais les sous-flags un par un en désactivant `strict`. Garde
`"strict": true` et, si une migration l'exige temporairement, **désactive
explicitement** le sous-flag gênant (`"strictNullChecks": false`) avec un
commentaire et une date. Ainsi, chaque nouveau contrôle ajouté par une version
future de TypeScript s'active automatiquement, et ta dette est visible.
:::

## `noUncheckedIndexedAccess` : l'accès par index n'est pas garanti

Hors de `strict` (il faut l'activer à part), ce flag ajoute `| undefined` à tout
accès via une signature d'index ou un index numérique de tableau. Le compilateur
reconnaît enfin une vérité du runtime : `arr[i]` peut être `undefined`.

```ts
const config: Record<string, string> = {};
const value = config["missing"]; // string | undefined (avec le flag)

const arr = [1, 2, 3];
const first = arr[0]; // number | undefined : l'index peut être hors borne
```

**Pourquoi c'est juste.** `arr[10]` renvoie `undefined` à l'exécution sans la
moindre erreur ; sans ce flag, TypeScript type pourtant `arr[10]` comme `number`
et te laisse appeler `arr[10].toFixed()` qui crashe. Le flag te force à narrower
(`if (first !== undefined)`) ou à utiliser `.at()`. Le coût : plus de checks
explicites. Le gain : la fin des `Cannot read property of undefined`.

## `exactOptionalPropertyTypes` : `?` ne veut pas dire « accepte undefined »

Sans ce flag, une propriété `name?: string` accepte aussi bien l'**absence** de
la clé que `name: undefined`. Avec lui, TypeScript distingue les deux : `?` veut
dire « peut être absente », pas « peut valoir `undefined` ».

:::compare
::bad
```ts
// exactOptionalPropertyTypes: false
type Options = { timeout?: number };

const o: Options = { timeout: undefined }; // accepté
// "timeout" in o === true, mais o.timeout === undefined
```
::
::good
```ts
// exactOptionalPropertyTypes: true
type Options = { timeout?: number };

const o: Options = { timeout: undefined }; // erreur
const ok: Options = {};                    // OK : la clé est absente
// pour autoriser undefined explicitement :
type Loose = { timeout?: number | undefined };
```
::
:::

**Pourquoi.** L'absence d'une clé et sa présence à `undefined` se comportent
différemment au runtime : `Object.keys` les compte différemment, `in` les
distingue, `{ ...defaults, ...o }` écrase une valeur `undefined` mais pas une clé
absente. Sans le flag, ces deux états sont confondus et tu bricoles des spreads
qui effacent silencieusement tes valeurs par défaut. Le flag rend l'intention
explicite : `?` pour optionnel, `| undefined` pour « valeur volontairement vide ».

## `verbatimModuleSyntax` : ce que tu écris est ce qui est émis

Ce flag (qui remplace `importsNotUsedAsValues` et `isolatedModules` côté imports)
impose que les imports/exports de **types** soient marqués `import type`. Le
compilateur n'efface plus « intelligemment » les imports : un `import` reste un
`import` JavaScript dans la sortie, un `import type` est entièrement supprimé.

```ts
import type { User } from "./types";   // effacé à la compilation
import { createUser } from "./factory"; // conservé : c'est une valeur
```

:::callout{type="warn"}
`verbatimModuleSyntax` est quasi obligatoire avec les transpileurs qui compilent
**fichier par fichier** (esbuild, swc, le bundler Vite). Ces outils ne font pas
d'analyse cross-fichier : ils ne *savent pas* qu'un import n'est qu'un type et le
laisseraient dans le bundle, provoquant des imports de modules inexistants à
l'exécution. Le marquage explicite `import type` lève l'ambiguïté et garantit un
tree-shaking correct des types.
:::

## `moduleResolution: "bundler"`

Depuis TS 5.0, c'est la stratégie à utiliser quand un bundler (Vite, esbuild,
Webpack) gère la résolution finale. Elle reproduit le comportement des bundlers
modernes : elle lit le champ `exports` du `package.json`, autorise les imports
**sans extension**, mais n'impose pas les règles strictes de Node ESM (`.js`
obligatoire dans le code source). À coupler avec `"module": "esnext"` ou
`"preserve"`.

```json
{
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

`"noEmit": true` est cohérent quand le bundler produit le JS : TypeScript ne sert
alors qu'au type-checking. `"skipLibCheck": true` saute la vérification des `.d.ts`
des dépendances — un compromis de vitesse universellement adopté.

## Activer `strict` dès le départ coûte moins cher

:::compare
::bad
```json
// Projet démarré sans strict, migration prévue "plus tard"
{ "compilerOptions": { "strict": false } }
```
::
::good
```json
// strict dès le premier commit
{ "compilerOptions": { "strict": true, "noUncheckedIndexedAccess": true } }
```
::
:::

**Pourquoi.** Sans `strictNullChecks` au départ, *chaque* type inféré du
codebase oublie `null`/`undefined` : les signatures, les retours d'API, les
champs optionnels propagent une fausse certitude dans tout le graphe de types.
Activer le flag après coup ne révèle pas un bug isolé mais des **milliers**
d'erreurs corrélées, car le compilateur recalcule la nullabilité de l'ensemble
d'un coup. Le coût de migration croît de façon super-linéaire avec la taille du
projet, et chaque correction risque d'en masquer une autre. En partant strict, le
coût est amorti une ligne à la fois, au moment où le code est écrit et où son
auteur a le contexte en tête. La rigueur est une dette qui ne s'emprunte pas : on
la paie comptant ou elle compose.

:::cheatsheet
- title: "strict: true"
  desc: "Méta-flag ; active strictNullChecks, noImplicitAny, etc. et les futurs."
- title: "strictNullChecks"
  desc: "null/undefined explicites ; le plus rentable des contrôles."
- title: "noUncheckedIndexedAccess"
  desc: "Ajoute | undefined aux accès par index (hors strict)."
- title: "exactOptionalPropertyTypes"
  desc: "Distingue clé absente et clé à undefined."
- title: "verbatimModuleSyntax"
  desc: "import type explicite ; sortie fidèle, sûr pour les bundlers."
- title: "moduleResolution: bundler"
  desc: "Résolution façon Vite/esbuild ; lit exports, imports sans extension."
- title: "skipLibCheck / noEmit"
  desc: "Saute les .d.ts deps ; type-check seul quand le bundler émet."
:::

:::callout{type="info"}
`noUncheckedIndexedAccess` et `exactOptionalPropertyTypes` ne sont **pas** inclus
dans `strict` — ce sont des contrôles « extra-strict » qu'on active à part, par
choix. Ils sont parmi les plus précieux mais aussi les plus bruyants à
l'introduction. Sur un projet existant, active-les en dernier, après avoir
stabilisé la base sous `strict`.
:::
