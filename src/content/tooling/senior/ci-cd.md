---
title: "CI/CD"
slug: "ci-cd"
framework: "tooling"
level: "senior"
order: 2
duration: 17
prerequisites: ["vitest", "linting-formatting"]
updated: 2026-05-23
seoTitle: "CI/CD frontend — cache, matrices, gates qualité et builds déterministes"
seoDescription: "Pipeline build/test/lint/deploy avec cache de dépendances et d'artefacts, parallélisation, preview deployments, déterminisme et secrets — les mécanismes."
ogVariant: "crimson"
related:
  - { framework: "tooling", slug: "vite" }
  - { framework: "tooling", slug: "monorepo" }
---

## L'anatomie d'un pipeline

Un pipeline frontend transforme un commit en artefact déployable, en bloquant si
la qualité régresse. Les étapes : **install → lint → typecheck → test → build →
deploy**. L'ordre n'est pas arbitraire : on place le moins cher et le plus
discriminant en premier (lint, typecheck) pour échouer vite, et on parallélise
ce qui est indépendant.

```yaml
# .github/workflows/ci.yml
name: ci
on:
  pull_request:
  push: { branches: [main] }
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: "pnpm" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint && pnpm typecheck && pnpm test
```

Le `concurrency` avec `cancel-in-progress` tue le run précédent quand tu pushes
à nouveau sur la même branche : inutile de payer le CI pour un commit déjà
obsolète.

## Cache : dépendances vs artefacts

Deux caches distincts, deux mécanismes.

:::compare
::bad
```yaml
- run: npm install   # réécrit node_modules à chaque run, peut bouger les versions
```
::
::good
```yaml
- uses: actions/setup-node@v4
  with: { cache: "pnpm" }          # cache le store pnpm, clé = hash(lockfile)
- run: pnpm install --frozen-lockfile  # échoue si le lockfile devrait changer
```
::
:::

**Pourquoi.** `npm install` peut résoudre des versions différentes d'un run à
l'autre (plages semver), ce qui rend la CI non reproductible et invalide tout
cache. `--frozen-lockfile` impose : « installe exactement le lockfile, ou
échoue ». La clé de cache est le hash du lockfile : tant qu'il ne change pas, le
store est restauré tel quel, et l'install ne fait que créer des symlinks. C'est
la dépendance qui est cachée. L'**artefact**, lui (le `dist/` buildé), se cache
par hash des **sources** via le task runner du monorepo ou un cache distant
(`actions/cache` avec une clé dérivée des entrées de build).

## Parallélisation et matrices

Une matrice instancie le même job sur plusieurs dimensions, en parallèle.

```yaml
test:
  strategy:
    fail-fast: false
    matrix:
      shard: [1, 2, 3, 4]
  steps:
    - run: pnpm vitest run --shard=${{ matrix.shard }}/4
```

**Pourquoi.** Vitest partitionne déterministement la suite en 4 shards par
hashing des chemins de fichiers ; chaque shard tourne sur une machine séparée,
divisant le wall-clock par ~4. `fail-fast: false` empêche qu'un shard rouge
n'annule les autres — tu veux **tous** les échecs en une fois, pas une découverte
incrémentale shard par shard. La couverture, si activée, doit être mergée en
aval car chaque shard ne voit qu'une partie de la suite.

## La gate qualité

Bloquer le merge tant que typecheck + lint + test ne sont pas verts est le cœur
de la valeur CI. Ce n'est pas une politique sociale, c'est un invariant : `main`
reste toujours déployable.

:::callout{type="tip"}
Configure ces jobs comme **required status checks** sur la branche protégée.
GitHub refusera alors le merge tant qu'ils ne sont pas verts sur le **merge
result** (le code tel qu'il sera après merge), pas sur la branche isolée. C'est
ce qui attrape les régressions « sémantiques » : deux PRs vertes séparément qui
cassent une fois combinées.
:::

## Preview deployments

Chaque PR mérite une URL vivante. Le mécanisme : builder l'app pour la PR et la
déployer sur un environnement éphémère, dont l'URL est commentée sur la PR.

```yaml
preview:
  if: github.event_name == 'pull_request'
  steps:
    - run: pnpm build
    - run: npx vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}
```

L'environnement est éphémère et identifié par le SHA ou le numéro de PR, détruit
au merge/close. Bénéfice réel : la QA et le design review se font sur du buildé,
pas sur « ça marche chez moi ».

## Le piège des builds non-déterministes

Un build déterministe produit le **même output bit-à-bit** pour la même entrée.
Sans ça, ton cache d'artefacts est inutile et tes diffs de bundle sont du bruit.

:::compare
::bad
```ts
// injecté dans le bundle au build
export const BUILD_ID = Date.now();          // change à chaque build
export const banner = `Built ${new Date()}`; // idem
```
::
::good
```ts
// valeur stable, dérivée du commit, injectée par l'env
export const BUILD_ID = process.env.GIT_SHA; // déterministe pour un commit
```
::
:::

**Pourquoi.** Tout ce qui dépend de l'horloge, d'un PRNG non seedé, de l'ordre
de parcours d'un `Map`/filesystem, ou d'un chemin absolu de machine, injecte de
l'entropie dans l'output. Le hash du bundle change alors même que les sources
sont identiques, ce qui **invalide le cache** (cache miss systématique) et casse
le subresource integrity / les comparaisons de taille. Le déterminisme rend le
build une fonction pure de ses entrées — précisément ce qu'un cache exige pour
être correct.

## Secrets

Un secret ne doit jamais finir dans un artefact ni dans un log.

:::callout{type="warn"}
Les secrets sont injectés en variables d'environnement au **runtime du job**,
jamais committés. GitHub masque automatiquement les valeurs connues dans les
logs, mais **pas** ce que tu calcules à partir d'elles (un base64 d'un token
fuite). Pour le frontend : seules les variables `VITE_`/`NEXT_PUBLIC_` sont
inlinées dans le bundle client — n'y mets **que** du public. Un secret serveur
inliné dans un bundle est exposé à tout visiteur.
:::

:::cheatsheet
- title: "--frozen-lockfile"
  desc: "Install reproductible : échoue si le lockfile devrait bouger."
- title: "cache: pnpm"
  desc: "Restaure le store par hash du lockfile."
- title: "concurrency + cancel-in-progress"
  desc: "Tue les runs obsolètes sur la même ref."
- title: "matrix.shard"
  desc: "Partitionne la suite de tests sur N machines."
- title: "required status checks"
  desc: "Bloque le merge tant que la gate n'est pas verte."
- title: "GIT_SHA injecté"
  desc: "Remplace Date.now() pour un build déterministe."
:::

## À retenir

Un bon pipeline est rapide parce qu'il cache et parallélise, fiable parce qu'il
est déterministe et lockfile-frozen, et sûr parce que `main` est gardé par une
gate. Chaque optimisation (cache, shards, affected) repose sur la même
condition : que le build soit une fonction pure de ses entrées.
