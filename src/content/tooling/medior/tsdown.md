---
title: "tsdown : bundler tes bibliothèques"
slug: "tsdown"
framework: "tooling"
level: "medior"
order: 6
duration: 13
prerequisites: ["bundlers"]
updated: 2026-07-09
seoTitle: "tsdown — publier une bibliothèque TypeScript : ESM/CJS, .d.ts et exports"
seoDescription: "tsdown, le bundler de bibliothèques bâti sur Rolldown : sorties ESM et CJS, génération rapide des .d.ts via isolatedDeclarations, champ exports du package.json. Pourquoi bundler une bibliothèque diffère de bundler une application."
ogVariant: "sage"
related:
  - { framework: "tooling", slug: "bundlers" }
  - { framework: "typescript", slug: "isolated-declarations" }
---

Bundler une **application** et publier une **bibliothèque** npm sont deux métiers
différents. Une app, tu la construis avec Vite : elle avale tout — ton code, tes
dépendances, tes assets — pour produire un `index.html` et des fichiers hashés,
servis tels quels par un CDN. Une bibliothèque, elle, ne s'exécute pas seule :
elle est **importée** par d'autres projets. Elle doit donc exposer plusieurs
formats (ESM **et** CJS), ses **types** (`.d.ts`), un champ `exports` propre, et
surtout **ne pas embarquer** ses dépendances. tsdown est l'outil taillé pour ça.

## Une app, une bibliothèque : pourquoi pas le même outil

Vite optimise pour un produit fini qui tourne dans un navigateur : il bundle tout
le graphe dans un artefact autonome, hashe les fichiers pour le cache, et vise
**une** cible. Une bibliothèque a les contraintes inverses : consommée par du code
qu'elle ne connaît pas (Node en CJS, un bundler moderne en ESM, un projet
TypeScript), elle doit externaliser ses dépendances, livrer plusieurs formats,
fournir des types, et déclarer ses entrées publiques.

:::compare
::bad
```ts vite.config.ts
// Traiter une bibliothèque comme une app
export default defineConfig({
  // React finit embarqué -> doublons chez le consommateur
  // un seul format, pas de .d.ts, fichiers hashés = imports cassés
  build: { outDir: 'dist' },
});
```
::
::good
```ts tsdown.config.ts
// Bundler pour la publication
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'], // deux formats de sortie
  dts: true,              // types générés
  // dépendances externalisées par défaut
});
```
::
:::

**Pourquoi.** Une bibliothèque publie du code **relié**, pas empaqueté : elle
laisse le consommateur (et son bundler d'app) résoudre les dépendances partagées,
au lieu d'embarquer sa propre copie de React ou de Vue.

## tsdown : la config minimale

tsdown est bâti sur **Rolldown** (le bundler en Rust de l'écosystème Vite) et
**Oxc** (parser et transformeur, eux aussi en Rust). Même moteur que Vite 8 côté
build, mais préconfiguré pour le cas « bibliothèque ». La config tient en quelques
clés.

```ts tsdown.config.ts
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
});
```

```bash
npx tsdown          # build unique
npx tsdown --watch  # reconstruit à chaque sauvegarde
```

`entry` liste les points d'entrée de ton API publique, `format` demande les deux
formats de module, `dts: true` déclenche les déclarations de types. C'est tout :
pas de hash, pas d'`index.html`, dépendances externes d'office. `defineConfig` ne
fait rien à l'exécution — il apporte l'autocomplétion et le typage dans l'éditeur.

## Les `.d.ts` : des types corrects, générés vite

Sans fichiers `.d.ts`, un consommateur TypeScript perd l'autocomplétion et le
typage de ta bibliothèque : elle apparaît comme `any`. `dts: true` produit ces
déclarations à partir de ton code source, et la façon de les générer dépend de ton
`tsconfig.json`. Si `isolatedDeclarations` est activé, tsdown passe par
**oxc-transform** (en Rust) : chaque fichier produit son `.d.ts` **sans lire les
autres**, ce qui parallélise et va très vite. Sinon, tsdown retombe sur le
compilateur TypeScript : fiable, mais plus lent car il doit résoudre le graphe de
types complet.

:::callout{type="tip"}
`isolatedDeclarations` t'oblige à annoter explicitement les types de retour de ton
API publique. C'est la contrainte qui rend la génération parallèle possible, et au
passage une bonne discipline pour une bibliothèque. Le mécanisme est détaillé dans
l'article **isolated-declarations** (TypeScript, niveau senior).
:::

**Par format.** ESM et CJS n'ont pas la même extension de déclaration : un module
CJS attend un `.d.cts`, un module ESM un `.d.ts`. tsdown génère la déclaration
adaptée à chaque sortie, pour que le consommateur reçoive les bons types quel que
soit le mode d'import.

## Le champ `exports` du `package.json`

Produire les fichiers ne suffit pas : il faut dire à Node et aux bundlers **quel
fichier servir dans quel cas**. C'est le rôle du champ `exports`.

```json package.json
{
  "name": "ma-lib",
  "type": "module",
  "files": ["dist"],
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./utils": { "import": "./dist/utils.js", "require": "./dist/utils.cjs" }
  }
}
```

Chaque **condition** répond à une question du consommateur : `import` sert l'ESM,
`require` le CJS, `types` pointe vers les déclarations. L'ordre compte — `types` en
premier pour que TypeScript le trouve. Les vieux champs `main`/`module` restent un
filet pour les outils qui ignorent encore `exports`. Un second bloc comme `./utils`
crée un **sous-chemin** (`import { x } from 'ma-lib/utils'`), et rien hors de ce qui
est déclaré n'est accessible : `exports` **verrouille** la surface publique. tsdown
sait générer et tenir ce champ à jour via l'option `exports: true`, ce qui évite les
écarts entre fichiers produits et champ déclaré.

:::callout{type="warn"}
Un `exports` incohérent (extension `.cjs` manquante, condition `types` oubliée,
sous-chemin non déclaré) est l'une des causes les plus fréquentes de « ça marche
chez moi mais pas chez le consommateur ». Vérifie le paquet publié avec `publint`
ou `@arethetypeswrong/cli`.
:::

## Externaliser les dépendances

Par défaut, tsdown **n'embarque pas** ce qui est déclaré dans `dependencies` et
`peerDependencies` : ces paquets restent des imports externes, et ton bundle ne
contient que **ton** code. Pour une dépendance que le projet hôte possède
forcément (React, Vue), le bon outil est `peerDependencies` : tu déclares en avoir
besoin, sans l'installer ni la dupliquer.

```json package.json
{
  "peerDependencies": {
    "react": ">=18"
  }
}
```

**Pourquoi.** React doit être un **singleton** : une seule instance partagée dans
toute l'app. Si ta bibliothèque embarque sa propre copie, deux instances de React
coexistent et les hooks lèvent l'erreur « invalid hook call ». En le laissant
externe et en `peerDependencies`, tu réutilises l'instance déjà présente.

## tsdown vs tsup : pourquoi migrer

tsup a longtemps été le standard pour bundler une bibliothèque TypeScript. Il
repose sur **esbuild**. tsdown est son successeur direct : même surface de
configuration, mais moteur **Rolldown/Oxc** au lieu d'esbuild.

- **Vitesse.** Sur des bibliothèques à nombreuses entrées ou au graphe chargé, le
  moteur Rust affiche des builds sensiblement plus rapides, `.d.ts` compris.
- **Cohérence.** Rolldown est aussi le moteur de Vite 8 : bibliothèque et app
  partagent le même comportement de bundling, moins de divergences subtiles.
- **Migration douce.** tsdown reprend les principales options de tsup. Dans les cas
  simples, migrer revient à renommer `tsup.config.ts` en `tsdown.config.ts` et à
  changer l'import de `tsup` vers `tsdown`.

:::callout{type="info"}
**Statut 2026.** tsdown est maintenu sous l'égide de **VoidZero** (l'entité derrière
Vite, Vitest, Rolldown et Oxc). Son adoption grimpe vite et il est positionné comme
la voie recommandée pour publier une bibliothèque à mesure que l'écosystème bascule
sur Rolldown. tsup reste fonctionnel ; pour un nouveau paquet, tsdown est le défaut.
:::

## À retenir

Publier une bibliothèque n'est pas construire une app : il faut externaliser les
dépendances, livrer ESM **et** CJS, fournir des `.d.ts` corrects par format, et
déclarer un `exports` propre. tsdown fait exactement ça, sur le moteur Rolldown/Oxc,
avec une config minuscule. Active `isolatedDeclarations` pour des types générés à
pleine vitesse, et laisse tsdown tenir ton champ `exports` à jour.

:::cheatsheet
- title: "entry"
  desc: "Les points d'entrée de l'API publique. Plusieurs entrées = sous-chemins."
- title: "format: ['esm', 'cjs']"
  desc: "Deux formats de sortie. ESM pour les bundlers, CJS pour Node hérité."
- title: "dts: true"
  desc: "Génère les .d.ts. Rapide via oxc si isolatedDeclarations est activé."
- title: "exports (package.json)"
  desc: "Conditions import/require/types. Verrouille la surface publique du paquet."
- title: "peerDependencies"
  desc: "React, Vue : externes et non dupliqués. Le projet hôte fournit l'instance."
- title: "tsdown vs tsup"
  desc: "Successeur bâti sur Rolldown/Oxc. Migration : renomme la config, change l'import."
:::
