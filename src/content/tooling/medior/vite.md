---
title: "Vite 8 : le moteur de dev unifié"
slug: "vite"
framework: "tooling"
level: "medior"
order: 1
duration: 15
prerequisites: ["bundlers", "package-managers"]
updated: 2026-05-23
seoTitle: "Vite 8 — Rolldown, Oxc, dev server ESM (Guide Medior)"
seoDescription: "Vite 8 en 2026 : Rolldown comme bundler unifié, Oxc sous le capot, dev server ESM natif, HMR, config et build de prod. Le pourquoi du mécanisme."
ogVariant: "gold"
related:
  - { framework: "tooling", slug: "bundlers" }
  - { framework: "tooling", slug: "vitest" }
---

## Ce que Vite résout

Avant Vite, un projet front démarrait un **bundle complet** avant même
d'afficher la première page : webpack relisait tout le graphe, transpilait,
assemblait, puis servait le résultat. Sur une grosse base, ça veut dire plusieurs
secondes — parfois minutes — entre `npm run dev` et le premier rendu, et un
rechargement lourd à chaque sauvegarde.

Vite part d'une observation simple : **le navigateur sait charger des modules
ES tout seul** (`<script type="module">`). En dev, inutile de tout empaqueter à
l'avance. Vite sert ton code source quasi tel quel, et ne transforme un fichier
que **quand le navigateur le demande**. Le coût de démarrage devient indépendant
de la taille du projet.

:::callout{type="info"}
Vite poursuit deux objectifs opposés selon le moment : en **dev**, latence
minimale et zéro bundling inutile ; en **build**, un bundle optimisé, minifié et
tree-shaké pour la prod. Garder ces deux régimes en tête évite la confusion
classique « ça marche en dev mais le build casse ».
:::

## Le dev server : ESM natif + esbuild pour les deps

Au démarrage, Vite distingue deux familles de code. Tes **dépendances**
(`node_modules`) changent rarement : Vite les **pré-bundle** une fois avec un
transpileur natif rapide, en les convertissant en ESM et en regroupant les
paquets éclatés en centaines de petits fichiers (un `lodash-es` peut compter des
centaines de modules, autant de requêtes HTTP évitées). Ton **code applicatif**,
lui, est transformé à la volée, fichier par fichier, à la demande du navigateur.

```bash
npm run dev
# VITE v8.x  ready in 180 ms
# Local: http://localhost:5173/
```

**Pourquoi.** Le pré-bundling des deps répond à deux problèmes : certains
paquets npm sont encore en CommonJS (que le navigateur ne sait pas charger), et
un import « profond » peut déclencher des centaines de requêtes. En convertissant
et regroupant les deps une seule fois dans un cache (`node_modules/.vite`), Vite
sert le reste en ESM pur : le navigateur fait le travail de résolution, et Vite
n'a qu'à transpiler les fichiers que tu touches réellement.

## HMR : remplacer un module sans recharger

Le **Hot Module Replacement** échange le code d'un module *à chaud* dans la page
ouverte, sans full reload, en préservant l'état applicatif (le contenu d'un
champ, l'onglet actif). Comme Vite connaît le graphe d'imports, il sait
exactement quels modules invalider quand tu sauvegardes — et seulement ceux-là.

:::compare
::bad
```bash
# Ancien modèle : chaque sauvegarde rebundle et recharge la page
[webpack] Compiling... done in 4200 ms
# état du formulaire perdu, scroll réinitialisé
```
::
::good
```bash
# Vite : seul le module modifié est renvoyé
[vite] hmr update /src/components/Cart.tsx
# état préservé, mise à jour en ~50 ms
```
::
:::

**Pourquoi.** Le coût du HMR de Vite est proportionnel au **module modifié et à
ses parents immédiats**, pas à la taille du projet. Le navigateur garde le reste
du graphe déjà chargé en mémoire ; Vite envoie via WebSocket l'ordre de
remplacer un seul module et de réexécuter sa frontière HMR. Un rebundle complet,
lui, jette tout et repart de zéro — d'où la perte d'état et la latence qui croît
avec la base de code.

## Vite 8 : Rolldown et Oxc sous le capot

Historiquement, Vite utilisait **deux** moteurs : esbuild (Go) pour la transpilation
et le pré-bundling, **Rollup** (JS) pour le build de prod. Deux outils, deux
comportements, parfois des divergences subtiles entre dev et build.

Vite 8 unifie tout autour de **Rolldown**, un bundler écrit en **Rust** compatible
avec l'API des plugins Rollup, et de **Oxc**, la boîte à outils JavaScript en Rust
(parser, transformer, resolver) qui alimente aussi Oxlint et Vitest. Le même
moteur pré-bundle les deps en dev **et** produit le bundle de prod.

:::callout{type="tip"}
Concrètement, tu n'as presque rien à changer : l'API `vite.config.ts` et
l'écosystème de plugins Rollup restent compatibles. Le gain est invisible et
gratuit — builds plus rapides, et un seul comportement de bundling entre dev et
prod, ce qui supprime une cause classique de bugs « works in dev only ».
:::

**Pourquoi Rust.** Le parsing et la transformation de JS sont des tâches massivement
parallélisables et gourmandes en allocation mémoire. Un moteur natif (Rust)
parallélise sur tous les cœurs sans le coût du garbage collector de Node, là où
un bundler en JS reste largement mono-thread. Unifier sur un seul moteur élimine
en prime la classe de bugs où esbuild et Rollup transpilaient différemment.

## La config : `vite.config.ts`

La config est un module qui exporte un objet. Les **plugins** sont le point
d'extension principal : framework (React, Vue), transformations, analyse de bundle.

```ts vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    sourcemap: true,
    target: 'es2022',
  },
});
```

`defineConfig` ne fait rien à l'exécution : c'est un simple wrapper qui apporte
l'**autocomplétion et le typage** dans ton éditeur. Un plugin Vite est un objet
avec des **hooks** (`transform`, `resolveId`, `load`…) appelés à des moments
précis du cycle — c'est ce qui permet à un plugin React d'injecter le HMR de
Fast Refresh sans que tu écrives quoi que ce soit.

## Le build de prod

```bash
npm run build   # vite build -> dossier dist/
npm run preview # sert dist/ comme en prod, pour vérifier avant deploy
```

En build, Vite (via Rolldown) fait l'inverse du dev : il **bundle**, applique le
**tree-shaking** (suppression du code mort), la **minification**, le
**code-splitting** (un chunk par route/import dynamique) et génère les hashs de
fichiers pour le cache long terme. Le résultat dans `dist/` est du statique
servable par n'importe quel CDN.

:::cheatsheet
- title: "vite (dev)"
  desc: "Serveur ESM, HMR, deps pré-bundlées. Démarrage indépendant de la taille."
- title: "vite build"
  desc: "Bundle prod via Rolldown : tree-shaking, minification, code-splitting."
- title: "vite preview"
  desc: "Sert dist/ localement pour valider le build avant déploiement."
- title: "import.meta.glob"
  desc: "Importer un dossier de fichiers d'un coup (routes, locales)."
- title: "import dynamique"
  desc: "import('./X') crée automatiquement un chunk séparé (lazy)."
:::

## Pourquoi Vite a gagné

Vite s'est imposé parce qu'il a fait coïncider la DX et le standard : en dev il
s'appuie sur l'ESM natif du navigateur au lieu de le combattre, et son API de
plugins a fédéré l'écosystème (Vitest, Storybook, Nuxt, SvelteKit). Vite 8 referme
la dernière faille — un seul moteur Rust du dev jusqu'au build — ce qui en fait en
2026 le défaut de fait du front.
