---
title: "Outils : l'horizon 2026"
slug: "tooling-2026"
framework: "tooling"
level: "next"
order: 1
duration: 14
prerequisites: ["vite", "linting-formatting"]
updated: 2026-05-27
seoTitle: "Outils 2026 — Rolldown-Vite, oxlint, Node TypeScript natif, tsdown"
seoDescription: "Le front de l'outillage front-end mi-2026 : Vite passe à Rolldown (bundler Rust), oxlint et Biome accélèrent le lint, Node exécute TypeScript nativement, et tsdown bundle les bibliothèques."
ogVariant: "iris"
related:
  - { framework: "tooling", slug: "rust-toolchain" }
  - { framework: "web", slug: "web-platform-2026" }
---

:::callout{type="info"}
La tendance de fond de 2026 : **la chaîne d'outils passe en Rust** et **Node
comprend TypeScript sans transpileur**. Concrètement, Vite migre vers Rolldown,
le lint bascule vers oxlint/Biome, et `node fichier.ts` fonctionne. Le langage et
ton code ne changent pas — c'est la couche d'outillage qui s'accélère.
:::

## Rolldown : le nouveau moteur de Vite

Vite reposait sur deux bundlers (esbuild en dev, Rollup en prod), d'où des écarts
de comportement. **Rolldown** (bundler en Rust, API compatible Rollup) les unifie.

```bash
npm install rolldown-vite
# alias de "vite" : même config, moteur Rolldown
```

**Pourquoi.** Un seul bundler pour le dev et la prod supprime les surprises « ça
marche en dev, pas en build ». Rolldown vise les performances d'esbuild **avec**
l'écosystème de plugins de Rollup. La migration se veut transparente : `rolldown-vite`
remplace `vite` sans toucher à `vite.config`. Voir le module `vite` pour
l'architecture actuelle, et `rust-toolchain` pour la vague Rust de fond.

## oxlint et Biome : le lint en Rust

ESLint, écrit en JavaScript, devient le goulot d'étranglement sur les gros dépôts.
**oxlint** (du projet Oxc) et **Biome** réimplémentent l'analyse en Rust.

:::compare
::bad
```bash
# ESLint sur un gros monorepo : dizaines de secondes,
# la config est un assemblage de plugins et de parseurs.
eslint . --ext .ts,.tsx
```
::
::good
```bash
# oxlint : le même type de règles, en une fraction du temps.
# Souvent en complément d'ESLint (règles rapides d'abord).
npx oxlint@latest
```
::
:::

**Pourquoi.** Le lint est massivement parallélisable et Rust en tire parti :
gains d'un à deux ordres de grandeur. La stratégie courante n'est pas un
remplacement brutal mais une **cohabitation** — oxlint pour les règles rapides en
pré-commit, ESLint pour les règles typées qu'il ne couvre pas encore. Voir
`linting-formatting` pour le socle.

## Node exécute TypeScript nativement

Lancer un fichier `.ts` imposait `ts-node` ou une compilation préalable. Node
**efface les types** (type stripping) et exécute directement.

```bash
node script.ts        # plus de ts-node pour un script
```

**Pourquoi.** Node retire les annotations de type au chargement (sans vérifier les
types — c'est le rôle de `tsc`) et exécute le JavaScript restant. Pour les scripts,
les outils et le prototypage, l'étape de build disparaît. Le typage reste à valider
séparément ; l'exécution, elle, n'a plus besoin de transpileur.

:::callout{type="tip"}
C'est complémentaire du compilateur natif de TypeScript (le portage Go, `tsgo`) :
Node gère l'**exécution** sans types, `tsgo` accélère la **vérification**. Deux
fronts distincts, même direction — réduire la latence entre écrire et lancer.
:::

## tsdown : bundler les bibliothèques

Pour publier une bibliothèque (et non une app), **tsdown** — bâti sur Rolldown —
remplace l'empilement `tsup`/`rollup` + génération de types.

```bash
npx tsdown src/index.ts --format esm,cjs --dts
```

**Pourquoi.** Une bibliothèque a des besoins propres : multiples formats de sortie
(ESM + CJS), fichiers `.d.ts`, tree-shaking soigné. tsdown réunit bundling et
déclarations de types dans un outil unique adossé au même moteur Rust que Vite.

## À retenir

:::cheatsheet
- title: "Rolldown-Vite"
  desc: "Bundler Rust unifiant dev et prod ; rolldown-vite remplace vite sans changer la config."
- title: "oxlint / Biome"
  desc: "Lint en Rust, un à deux ordres de grandeur plus rapide ; souvent en cohabitation avec ESLint."
- title: "Node + TypeScript natif"
  desc: "node fichier.ts par type stripping (pas de vérification) ; plus de ts-node pour scripts et outils."
- title: "tsdown"
  desc: "Bundler de bibliothèques sur Rolldown : ESM+CJS, .d.ts, tree-shaking, en un outil."
- title: "Direction"
  desc: "Outillage en Rust + exécution TS native : la couche de build s'efface, le code reste identique."
:::
