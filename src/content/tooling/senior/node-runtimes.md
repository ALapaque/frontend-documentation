---
title: "Node, Deno, Bun : quel runtime en 2026"
slug: "node-runtimes"
framework: "tooling"
level: "senior"
order: 5
duration: 15
prerequisites: ["dev-environment"]
updated: 2026-07-09
seoTitle: "Node vs Deno vs Bun en 2026 — TypeScript natif, APIs web et choix de runtime"
seoDescription: "Les trois runtimes JavaScript ont convergé : TypeScript exécuté nativement, APIs web-standard, gestion de paquets intégrée. Ce qui distingue encore Node, Deno 2 et Bun, et comment choisir selon le contexte."
ogVariant: "sage"
related:
  - { framework: "tooling", slug: "dev-environment" }
  - { framework: "typescript", slug: "erasable-syntax" }
---

Longtemps, Node a régné seul : un seul runtime JavaScript côté serveur, et tout
le reste — TypeScript, gestion de paquets, lint, bundle — greffé dessus en couches
successives. Puis Deno et Bun sont arrivés, moins pour détrôner Node que pour le
**pousser à évoluer**. En 2026, les trois convergent : chacun exécute TypeScript
sans étape de build, expose les mêmes APIs web-standard, et embarque son propre
gestionnaire de paquets. Le choix n'est donc plus « lequel sait faire quoi » mais
« lequel colle à mon contexte » — un choix d'infra plus subtil qu'avant.

## La convergence : ce que les trois partagent maintenant

Trois lignes de fracture historiques se sont refermées presque en même temps.

**TypeScript sans build.** Les trois exécutent un `.ts` directement, par
**type-stripping** : ils retirent les annotations de types et lancent le
JavaScript restant, sans typecheck ni transpilation lourde. Deno et Bun le font
depuis leurs débuts ; Node les a rejoints. Le corollaire est partout le même : le
runtime n'est pas un typechecker, il efface les types sans les vérifier — d'où
l'importance de la syntaxe effaçable, détaillée dans
[erasable-syntax](/typescript/senior/erasable-syntax).

**Les APIs web-standard.** `fetch`, `URL`, `Request`/`Response`, Web Streams,
`AbortController` : ces APIs nées dans le navigateur sont désormais globales dans
les trois runtimes. Un module qui ne s'appuie que sur elles tourne à l'identique
sous Node, Deno et Bun — et souvent sur un edge worker. C'est le vrai changement
de fond : le code devient **portable** au lieu d'être lié à `require` et aux
modules `node:`.

**La gestion de paquets intégrée.** Bun a son `bun install`, Deno 2 a
`deno install`/`deno add`, Node embarque le sien. Les trois lisent un
`package.json` et savent parler à npm — plus besoin d'un binaire tiers.

Convergence ne veut pas dire équivalence pour autant. Les gestes de base sont
partagés ; ce qui diffère, c'est la **profondeur de compatibilité**, le modèle de
sécurité et la vitesse. C'est là que se joue le choix d'infra.

## Node : l'écosystème et la compatibilité maximale

Node reste la référence par la seule force de son écosystème : deux décennies de
paquets npm et de code de prod éprouvé. Aucun concurrent ne compense cet effet de
réseau à court terme.

Le grand rattrapage de Node, c'est le **type-stripping natif**. Introduit en
expérimental (flag `--experimental-strip-types`), activé par défaut dès Node 23.6,
il a été **stabilisé** dans Node 24.12 et 25.2. Sur une version récente,
`node app.ts` fonctionne donc sans flag et sans `ts-node`.

```bash
# Node récent : plus de flag, plus de ts-node, plus de tsx en dev.
node server.ts
```

:::callout{type="warn"}
Le type-stripping de Node **efface** les types, il ne les **transforme** pas. Les
constructions qui émettent du code à l'exécution (`enum`, `namespace` avec
valeurs, décorateurs legacy) ne passent pas sans `--experimental-transform-types`.
C'est voulu : ça pousse vers la syntaxe effaçable, portable entre runtimes.
:::

L'autre atout est **la stabilité LTS**. La ligne LTS (Node 24 en 2026) garantit
des correctifs de sécurité sur plusieurs années, un cycle de release prévisible, et
une compat que les hébergeurs et images Docker suivent au doigt. Pour de la prod,
c'est décisif : tu ne veux pas que ton runtime soit la variable qui bouge. Node
reste ainsi **la cible par défaut de la production** — le choix qu'il faut
justifier de ne *pas* faire, pas l'inverse.

## Deno 2 : sécurité, TypeScript de première classe, compat npm

Deno a été conçu par le créateur de Node pour corriger ses regrets de design. Sa
signature, c'est la **sécurité par permissions** : par défaut, un script Deno ne
peut ni lire le disque, ni ouvrir le réseau, ni lire les variables
d'environnement. Chaque accès se déclare explicitement.

```bash
# Rien n'est autorisé par défaut ; on ouvre au cas par cas.
deno run --allow-net --allow-read=./data serveur.ts
```

**Pourquoi ça compte.** Dans un monde de dépendances transitives par milliers, un
paquet compromis ne peut pas exfiltrer tes secrets sans permission réseau. Node
exécute tout code avec les pleins pouvoirs de ton process ; Deno inverse le défaut.
Pour un script qui tire du code tiers, ou du multi-tenant, le modèle de menace est
nettement plus sain.

Deno traite **TypeScript comme un citoyen de première classe** (pas de config,
`.ts` partout) et embarque un **outillage intégré** — `deno fmt`, `deno lint`,
`deno test` — là où Node te fait assembler Prettier, ESLint et un runner à la main.

Le reproche historique — « Deno n'est pas compatible npm » — est levé depuis
**Deno 2** : les specifiers `npm:` importent les paquets npm directement, les
modules `node:` sont pris en charge, `package.json` et `node_modules` sont
reconnus, et `deno install` lit même les lockfiles npm/pnpm/yarn/bun. En parallèle,
Deno pousse **JSR**, un registre ESM-first et TypeScript-natif (types inclus, pas
de `@types/*` séparé) où publient déjà Hono, Supabase et d'autres.

```ts
// Deno : un import npm et un import JSR, côte à côte, sans install préalable.
import express from "npm:express@4";
import { Hono } from "jsr:@hono/hono";
```

**Où Deno brille.** Les scripts (un seul binaire, permissions fines, TS sans
setup), l'**edge** (Deno Deploy, cible web-standard), et tout contexte où la
**sécurité** est un critère de premier ordre plutôt qu'une arrière-pensée.

## Bun : la vitesse et la DX tout-en-un

Bun attaque un autre angle : la **vitesse** et la densité d'outillage. Bâti sur
JavaScriptCore (le moteur de Safari) plutôt que V8, écrit en Zig, il vise le
démarrage le plus court et l'install la plus rapide du lot. Son **démarrage** est
plusieurs fois plus rapide qu'un cold start Node ou Deno — ce qui compte pour des
scripts lancés en boucle ou des fonctions serverless — et `bun install` est
couramment **10 à 25× plus rapide** que `npm install` sur cache froid, grâce à un
cache global à hard links et une implémentation native.

Surtout, Bun est **tout-en-un** : le runtime embarque un **bundler** (`bun build`),
un **test runner** compatible Jest (`bun test`), un **package manager**
(`bun install`), un loader `.env` et des bindings SQLite natifs (`bun:sqlite`). Là
où une stack Node empile cinq outils et cinq configs, Bun couvre la chaîne avec un
seul binaire.

```bash
bun install          # install ultra-rapide, lit le package.json npm
bun run index.ts     # exécute le .ts directement
bun test             # runner intégré, API compatible Jest
bun build ./app.ts   # bundler intégré, pas d'esbuild à câbler
```

:::callout{type="tip"}
Le test runner compatible Jest est un levier de migration sous-estimé : une suite
`describe`/`it`/`expect` existante tourne souvent sous `bun test` sans réécriture,
ce qui permet d'essayer Bun sur un repo réel sans big-bang.
:::

La **compatibilité Node** de Bun progresse vite mais n'est pas encore totale : la
grande majorité des paquets marchent, les points durs restent les addons natifs et
les recoins les plus obscurs des modules `node:`. À vérifier avant de viser la prod
sur une app lourde en dépendances système.

**Où Bun brille.** La **DX** au quotidien (un binaire, feedback instantané), les
**monorepos** (install et tâches rapides changent l'ergonomie à l'échelle), et les
**scripts rapides** où le temps de démarrage domine.

## La même tâche dans les trois

:::compare
::bad
```bash
# Le monde d'avant : un runtime + des outils tiers empilés à la main.
npx tsx app.ts          # exécuter un .ts (ts-node/tsx en surcouche)
npm install             # gestionnaire séparé
npx vitest              # runner de test tiers à installer et configurer
```
::
::good
```bash
# 2026 : chaque runtime couvre les trois gestes nativement.
node app.ts   |  deno run app.ts   |  bun run app.ts     # exécuter un .ts
node --run …  |  deno install      |  bun install        # installer
node --test   |  deno test         |  bun test           # tester
```
::
:::

La **tâche** est identique partout — lancer un `.ts`, installer, tester — seul le
binaire change. C'est ça, la convergence : les gestes de base ne différencient
plus. Ce qui reste, c'est la compat, la sécurité et la vitesse.

## Comment choisir (ton senior)

Le choix se cadre par **critère dominant**, pas par préférence.

- **Compatibilité et prod → Node.** Si le critère est « ça doit marcher avec tout
  l'écosystème et tenir des années », Node LTS est le défaut. C'est le choix
  qu'on n'a pas à défendre. Le type-stripping natif lui a retiré son dernier
  handicap DX face aux challengers.
- **Sécurité et edge → Deno.** Permissions par défaut, TS de première classe,
  outillage intégré, cible web-standard pour le edge. Idéal pour les scripts qui
  tirent du code tiers et les workloads où le modèle de menace est explicite.
- **Vitesse et DX → Bun.** Démarrage et install les plus rapides, tout-en-un
  (bundler + test + package manager). Excellent pour les monorepos, les scripts,
  et l'expérience de dev locale — en gardant un œil sur la compat Node pour la prod.

:::callout{type="tip"}
Le vrai gagnant de cette convergence, c'est ta **base de code**. Un module écrit
en syntaxe effaçable et en APIs web-standard (`fetch`, `URL`, Web Streams) tourne
sous les trois runtimes **sans modification**. Vise cette portabilité : elle rend
le choix de runtime réversible. Tu peux développer sous Bun pour la vitesse et
déployer sous Node pour la stabilité, tant que ton code ne dépend d'aucune API
propriétaire.
:::

L'anti-pattern à éviter : coupler ta logique métier à `Bun.*` ou `Deno.*`. Ces
APIs propriétaires sont pratiques mais te verrouillent. Garde-les à la frontière
(l'entrée du process, le serveur HTTP), et laisse le cœur en web-standard.

## À retenir

En 2026, les trois runtimes ont convergé sur les fondamentaux : TypeScript sans
build, APIs web-standard, gestion de paquets intégrée. Le choix ne se joue donc
plus sur « qui sait faire quoi » mais sur le **critère dominant** de ton contexte —
compat/prod pour Node, sécurité/edge pour Deno, vitesse/DX pour Bun. Et comme le
code web-standard devient portable entre eux, le meilleur pari senior est d'écrire
du code qui ne dépend d'aucun runtime en particulier : c'est ce qui rend la
décision réversible.

:::cheatsheet
- title: "Convergence"
  desc: "TS sans build (type-stripping), fetch/URL/Web Streams, package manager intégré partout."
- title: "Node"
  desc: "Écosystème max, LTS stable, type-stripping natif (stable 24.12/25.2). Défaut prod."
- title: "Deno 2"
  desc: "Sécurité par permissions, TS première classe, compat npm + JSR, fmt/lint/test intégrés."
- title: "Bun"
  desc: "Le plus rapide (start, install), bundler + test Jest + package manager en un binaire."
- title: "Choisir"
  desc: "Compat/prod → Node ; sécurité/edge → Deno ; vitesse/DX → Bun."
- title: "Portabilité"
  desc: "Syntaxe effaçable + APIs web-standard = code qui tourne sous les trois. Évite Bun.*/Deno.*."
:::
