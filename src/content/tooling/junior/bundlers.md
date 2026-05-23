---
title: "Les bundlers : pourquoi et comment"
slug: "bundlers"
framework: "tooling"
level: "junior"
order: 2
duration: 13
prerequisites: ["package-managers"]
updated: 2026-05-23
seoTitle: "Bundlers : tree-shaking, HMR, Rolldown (Guide Junior)"
seoDescription: "Pourquoi un bundler : modules, transpilation, minification, tree-shaking, code-splitting, HMR, et le passage de Rollup à Rolldown en Rust."
ogVariant: "sage"
related:
  - { framework: "tooling", slug: "vite" }
  - { framework: "tooling", slug: "package-managers" }
---

## Pourquoi un bundler existe

Ton code source est découpé en dizaines de fichiers reliés par `import` /
`export` (les **modules ESM**). Tu écris aussi du TypeScript, du JSX, peut-être
du Sass — des syntaxes qu'aucun navigateur ne comprend nativement. Un **bundler**
prend cet ensemble et le transforme en quelques fichiers que le navigateur
sait charger efficacement.

Il assure plusieurs tâches distinctes :

- **Résolution de modules** : suivre le graphe des `import` depuis un point
  d'entrée jusqu'à toutes les dépendances.
- **Transpilation** : traduire TS/JSX/syntaxe récente en JavaScript que les
  navigateurs ciblés exécutent.
- **Minification** : retirer espaces, commentaires, renommer les variables pour
  réduire la taille transférée.
- **Tree-shaking** : éliminer le code mort, jamais importé.
- **Code-splitting** : découper en plusieurs morceaux (**chunks**) chargés à la
  demande.

## Tree-shaking et code-splitting : le mécanisme

Le **tree-shaking** repose sur le fait que les modules ESM sont **statiques** :
les `import`/`export` sont analysables sans exécuter le code. Le bundler trace
quelles exports sont réellement atteintes depuis l'entrée et **jette** le reste.

:::callout{type="info"}
Le tree-shaking ne fonctionne bien qu'avec des modules ESM et des paquets
« side-effect free ». Un `import 'polyfill'` sans liaison ou du CommonJS
(`require`) dynamique bride l'analyse statique : le bundler, dans le doute,
garde tout.
:::

Le **code-splitting** crée un chunk séparé à chaque `import()` dynamique. Le
navigateur ne télécharge le code d'une page qu'au moment où l'utilisateur y va.

```js
// Chargé seulement quand on ouvre le tableau de bord
const Dashboard = () => import('./Dashboard.js');
```

## Dev vs build : deux objectifs opposés

C'est la distinction la plus importante du chapitre.

:::compare
::bad
```bash
# Re-bundler tout le projet à chaque sauvegarde, en dev
# -> rechargement complet, état perdu, attente de plusieurs secondes
```
::
::good
```bash
# Dev : serveur ESM + HMR -> seul le module changé est remplacé
# Build : bundle minifié, tree-shaké, optimisé pour la production
```
::
:::

**Pourquoi.** En **développement**, on optimise pour la **vitesse de feedback** :
on veut voir son changement en millisecondes. Les outils modernes servent les
fichiers en ESM natif et appliquent le **HMR** (Hot Module Replacement) — le
module modifié est remplacé à chaud dans le navigateur **sans recharger la
page**, donc sans perdre l'état de l'app (le contenu d'un formulaire, par
exemple). En **production**, on optimise pour l'**utilisateur final** : un
bundle minifié, tree-shaké, splitté en chunks cachables. Construire un vrai
bundle de prod prend du temps, mais ne se fait qu'une fois au déploiement. Servir
en ESM natif comme en dev donnerait des centaines de requêtes : parfait pour le
feedback local, désastreux sur un réseau réel.

## La bascule vers Rust : Rolldown

Pendant des années, l'écosystème reposait sur deux outils en JavaScript/Go :
**esbuild** (en Go, ultra-rapide pour transpiler) et **Rollup** (en JS, le
champion du bundling de production et du tree-shaking). Vite utilisait esbuild
en dev et Rollup au build — deux moteurs aux comportements subtilement
différents, source de bugs « ça marche en dev mais pas en prod ».

En 2026, ces deux rôles fusionnent dans **Rolldown**, un bundler écrit en
**Rust**, compatible avec l'API de plugins Rollup et conçu pour remplacer les
deux d'un coup.

:::callout{type="tip"}
Le passage à Rust n'est pas qu'une mode. Rust compile en code natif sans
ramasse-miettes et exploite le **parallélisme** sur tous les cœurs du CPU. Sur
de gros projets, on parle d'un facteur 10 à 100 sur les temps de build par
rapport à un bundler en JavaScript pur.
:::

**Le bénéfice clé** : un **moteur unique** pour le dev et le build. Le code que
tu vois en développement est traité par la même base que celui livré en
production, ce qui supprime toute une classe d'écarts entre les deux.

## Mémo

:::cheatsheet
- title: "Module"
  desc: "Un fichier avec import/export ; l'unité de base du graphe."
- title: "Transpilation"
  desc: "Traduire TS/JSX/syntaxe récente en JS exécutable."
- title: "Tree-shaking"
  desc: "Supprimer le code jamais importé (analyse statique ESM)."
- title: "Code-splitting"
  desc: "Découper en chunks chargés à la demande via import()."
- title: "HMR"
  desc: "Remplacer un module à chaud sans recharger la page."
- title: "Bundler 2026"
  desc: "Rolldown (Rust) unifie dev et build, remplace esbuild + Rollup."
:::

Tu n'écriras presque jamais un bundler à la main : tu en consommes un, le plus
souvent via **Vite**, qui orchestre tout ça pour toi. Comprendre ce qu'il fait
te permet de diagnostiquer un bundle trop gros, un chunk manquant ou un
tree-shaking qui ne « shake » rien.
