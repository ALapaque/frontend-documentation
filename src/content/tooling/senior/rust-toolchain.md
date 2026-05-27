---
title: "La toolchain Rust"
slug: "rust-toolchain"
framework: "tooling"
level: "senior"
order: 3
duration: 16
prerequisites: ["vite", "vitest", "linting-formatting"]
updated: 2026-05-23
seoTitle: "Toolchain frontend en Rust (2026) — Rolldown, Oxc, Oxlint et Vite+"
seoDescription: "La vague Rust du tooling JS : Rolldown, Oxc, Oxlint, Oxfmt et leur intégration dans Vite 8/Vitest — pourquoi Rust gagne, et l'état d'adoption mi-2026."
ogVariant: "crimson"
related:
  - { framework: "tooling", slug: "vite" }
  - { framework: "tooling", slug: "monorepo" }
---

## Pourquoi le tooling JS migre vers Rust

La toolchain frontend a longtemps été écrite **en JavaScript, pour analyser du
JavaScript**. C'est élégant et auto-hébergé, mais ça plafonne : un linter ESLint
re-parse chaque fichier en AST avec un parser JS, alloue des milliers d'objets
par fichier, et tourne sur un seul thread parce que le modèle d'exécution de Node
est mono-thread par défaut. Quand Babel, ESLint, Prettier, esbuild et le bundler
parsent **chacun** le même fichier, tu payes le parsing cinq fois.

La vague 2026 — Rolldown, Oxc, Oxlint, Oxfmt — réécrit cette pile en Rust autour
d'une idée structurante : **un seul AST partagé, parsé une fois, exploité par
tous les outils en parallèle**.

## Oxc : le socle (parser, resolver, transformer)

Oxc (« Oxidation Compiler ») n'est pas un outil mais une **collection de briques
Rust** : un parser, un resolver de modules, un transformer (l'équivalent de
Babel), un minifier, un analyseur sémantique. Oxlint et Oxfmt sont des
consommateurs de ce socle.

```bash
# Oxc expose des binaires et une lib Rust ; côté JS, on consomme les outils.
npx oxlint              # le linter assis sur le parser Oxc
npx oxfmt               # le formateur
# Vite/Vitest, eux, lient les crates Oxc directement (transform, resolve).
```

**Pourquoi.** Le parser d'Oxc est l'un des plus rapides écrits en Rust : il
travaille sur des `&str` avec des allocations groupées (arena allocation) plutôt
qu'un objet GC par nœud. L'AST vit dans une **arène mémoire** : tous les nœuds
d'un fichier sont alloués dans un même bloc, libéré d'un coup, sans pression sur
un ramasse-miettes. Là où un AST JS éparpille des milliers de petits objets que
le GC doit suivre, Oxc fait une poignée d'allocations. C'est ce socle partagé qui
permet de parser **une fois** et de réutiliser l'AST pour lint, transform et
minify, au lieu de re-parser à chaque étape.

## Oxlint : le lint 50 à 100× plus rapide

Oxlint cible le créneau d'ESLint mais en Rust et multi-thread.

:::compare
::bad
```bash
# ESLint : un parser JS (espree/typescript-estree) par fichier, mono-thread,
# chaque règle re-traverse l'AST, le tout dans le runtime Node.
eslint "src/**/*.{ts,tsx}"   # plusieurs dizaines de secondes sur un gros repo
```
::
::good
```bash
# Oxlint : parser Oxc, traversée unique, threads = cœurs dispo.
oxlint src   # souvent < 1s sur le même repo
```
::
:::

**Pourquoi.** Trois mécanismes cumulés. (1) Le **parsing** : un seul parser Rust
en arène au lieu d'un parser JS qui alloue par nœud. (2) La **traversée** :
Oxlint exécute toutes ses règles en **une seule passe** sur l'AST partagé, là où
ESLint laisse chaque règle s'abonner à des nœuds et multiplie les visites. (3)
Le **parallélisme** : Rust n'a pas de GIL, Oxlint distribue les fichiers sur
tous les cœurs avec des threads natifs (via rayon), pendant que Node reste
mono-thread sauf à payer le coût de sérialisation des Worker. La somme donne le
facteur 50-100×. Le compromis mi-2026 : la couverture de règles n'égale pas
encore l'écosystème de plugins ESLint, d'où des setups hybrides.

:::callout{type="warn"}
Oxlint **ne remplace pas** tout ESLint à la mi-2026. Les plugins riches
(`eslint-plugin-react-hooks`, règles type-aware exigeant le typechecker TS)
n'ont pas tous d'équivalent. Le pattern courant : Oxlint en pre-commit et en CI
pour le gros des règles rapides, ESLint restreint aux règles type-aware. Ne
supprime pas ESLint avant d'avoir mappé chaque règle critique.
:::

## Oxfmt : le formateur

Oxfmt est le pendant de Prettier sur le socle Oxc. Même promesse : formatage
déterministe, mais en Rust et sans re-parsing redondant. Il partage le parser
d'Oxc, donc l'intégrer à côté d'Oxlint ne paye le parsing qu'une fois dans un
pipeline bien câblé.

```bash
oxfmt --write src   # reformate en place, sortie déterministe pour un input donné
```

Le déterminisme compte ici autant qu'en CI : un formateur qui produit deux
sorties pour une même entrée pollue les diffs et casse les caches de pre-commit.

## Rolldown : le bundler de production

Rolldown est le bundler Rust destiné à remplacer le couple esbuild (dev) +
Rollup (build) que Vite utilisait jusqu'ici.

```ts
// Côté usage, c'est transparent : Vite 8 délègue à Rolldown.
// vite.config.ts — l'API reste celle de Vite, le moteur change dessous.
import { defineConfig } from "vite";
export default defineConfig({ build: { target: "es2022" } });
```

**Pourquoi.** Vite avait un problème de cohérence : esbuild en dev (rapide mais
API de plugins limitée), Rollup en build (riche en plugins mais en JS, donc
lent). Deux moteurs = deux comportements possibles entre dev et prod. Rolldown
unifie : un seul bundler Rust, **compatible avec l'API de plugins Rollup**, assez
rapide pour le dev et assez complet pour le build. Un seul parser (Oxc), un seul
graphe de modules, une seule sémantique dev/prod. Le tree-shaking et la
résolution profitent du parallélisme Rust et du parser en arène, sans le coût de
la frontière JS/natif à chaque module.

## Comment Vite 8 et Vitest s'appuient dessus

L'intégration n'est pas « un nouvel outil de plus » : c'est un **remplacement du
moteur sous une API stable**.

- **Vite 8** : Rolldown comme bundler, transform via Oxc. Tu gardes
  `vite.config`, les plugins Rollup-compatibles continuent de marcher.
- **Vitest** : transform des fichiers de test via Oxc plutôt qu'un transformer
  JS, ce qui réduit le coût de transpilation avant exécution des tests.
- **Vite+** : une **CLI unifiée** qui orchestre le tout — dev server, build,
  test, lint, format — derrière une seule commande, plutôt que d'empiler des
  outils hétérogènes avec des configs disjointes.

:::callout{type="tip"}
Le gain réel de cette pile n'est pas « chaque outil est rapide » mais « les
outils **partagent le parsing** ». Si ton dev server (Rolldown), tes tests
(Vitest), ton linter (Oxlint) et ton formateur (Oxfmt) reposent tous sur Oxc, le
fichier est parsé en arène une fois et l'AST circule. C'est l'inverse du monde
Babel+ESLint+Prettier+esbuild où chaque outil parsait pour son compte.
:::

## Ce que ça change pour tes workflows

Concrètement : les boucles de feedback raccourcissent au point de changer les
habitudes. Un lint en pre-commit qui passe de 20 s à 0,5 s peut tourner sur
**l'arbre entier** au lieu du staged seulement. Un cold start de dev server qui
chute permet de relancer sans réfléchir. Le typecheck reste, lui, sur `tsc` (TS
n'est pas réécrit en Rust côté types) — donc dans une gate CI, le maillon lent
devient le typecheck, pas le lint ni le bundle.

:::compare
::bad
```yaml
# Gate CI 2024 : lint et build dominent le wall-clock.
- run: eslint .          # ~40s
- run: tsc --noEmit      # ~25s
- run: vite build        # ~30s (Rollup en JS)
```
::
::good
```yaml
# Gate CI 2026 : lint/build deviennent négligeables, tsc domine.
- run: oxlint .          # ~1s
- run: tsc --noEmit      # ~25s  <- le nouveau goulot
- run: vite build        # ~6s   (Rolldown en Rust)
```
::
:::

**Pourquoi.** Quand lint et bundle s'effondrent en temps, le profil de ta CI se
déplace : le coût total n'est plus dominé par le tooling JS-en-JS mais par les
étapes qui n'ont pas (encore) migré vers Rust, le typecheck en tête. Optimiser ta
CI en 2026, c'est donc sharder le typecheck ou utiliser `tsgo`/builds incrémentaux,
plus que tuner ESLint. Le profil de performance a bougé, ta stratégie d'optim
doit suivre.

## L'état d'adoption mi-2026

- **Oxlint** : mûr et largement adopté en complément d'ESLint ; rarement seul à
  cause des plugins manquants.
- **Oxfmt** : adoption croissante, en concurrence frontale avec Prettier déjà
  installé partout — la migration est friction sociale plus que technique.
- **Rolldown / Vite 8** : intégré, le chemin par défaut pour les nouveaux
  projets Vite ; les vieux projets migrent au rythme de la compatibilité de
  leurs plugins Rollup.
- **Vite+** : adoption précoce, séduisant pour les nouveaux monorepos qui veulent
  une CLI unique plutôt qu'un patchwork d'outils.

:::cheatsheet
- title: "Oxc"
  desc: "Socle Rust : parser/resolver/transformer en arène mémoire, AST partagé."
- title: "Oxlint"
  desc: "Lint multi-thread, traversée unique, 50-100× ESLint ; couverture partielle."
- title: "Oxfmt"
  desc: "Formateur Rust déterministe, pendant de Prettier sur le socle Oxc."
- title: "Rolldown"
  desc: "Bundler Rust compatible plugins Rollup ; un seul moteur dev/prod."
- title: "Vite 8"
  desc: "Délègue à Rolldown + Oxc ; API config inchangée."
- title: "Vite+"
  desc: "CLI unifiée dev/build/test/lint/format sur la pile Rust."
:::

## À retenir

La vague Rust n'est pas « plus vite pour le plaisir ». C'est une **refonte
architecturale** : un AST parsé une fois en arène, exploité en parallèle sans
GIL, partagé entre bundler, linter, formateur et runner de tests. Le corollaire
opérationnel : ton goulot d'étranglement se déplace vers ce qui n'a pas migré —
en 2026, c'est le typecheck. Optimise là où le temps est maintenant, pas où il
était.
