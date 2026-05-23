---
title: "Monorepo"
slug: "monorepo"
framework: "tooling"
level: "senior"
order: 1
duration: 16
prerequisites: ["vite", "linting-formatting"]
updated: 2026-05-23
seoTitle: "Monorepo frontend — workspaces, graphe de dépendances et cache de tâches"
seoDescription: "Workspaces pnpm/npm, phantom dependencies, task runners avec cache, build affecté et versioning avec changesets — les mécanismes, pas les recettes."
ogVariant: "crimson"
related:
  - { framework: "tooling", slug: "vite" }
  - { framework: "tooling", slug: "ci-cd" }
---

## Pourquoi un monorepo, et pourquoi ça casse mal

Un monorepo, ce n'est pas « tout le code dans un dossier ». C'est un **graphe de
paquets** géré par un seul lockfile, où le partage de code est résolu par des
liens locaux plutôt que par des publications npm. Le gain : une seule source de
vérité pour les versions, des refactors atomiques cross-paquets, un seul cycle
d'install. Le coût : tu hérites d'un graphe de dépendances que tu dois
**rendre explicite**, sinon il te trahit en silence.

## Workspaces : la résolution locale

Un workspace déclare quels dossiers sont des paquets liables. Le package manager
crée alors des symlinks dans `node_modules` au lieu de télécharger depuis le
registre.

```json
{
  "name": "root",
  "private": true,
  "workspaces": ["apps/*", "packages/*"]
}
```

Avec pnpm, la déclaration vit hors du `package.json` racine :

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

Structure canonique : `apps/` contient les déployables (web, admin, mobile-web),
`packages/` les bibliothèques internes (ui, config, utils, types). Une app
consomme un package via `"@acme/ui": "workspace:*"` — le protocole `workspace:`
force la résolution **locale** et fait échouer l'install si le paquet n'existe
pas dans le workspace, au lieu d'aller chercher un homonyme sur npm.

## Le graphe et le piège des phantom dependencies

Le coeur du sujet, c'est que `node_modules` plat (hoisting) ment sur ce à quoi
tu as réellement le droit d'accéder.

:::compare
::bad
```bash
# npm/yarn classic : hoisting plat
# A dépend de lodash, B ne le déclare PAS mais l'importe quand même.
node_modules/lodash   # hissé à la racine → visible par tout le monde
# packages/b/src/index.ts
import { merge } from "lodash"; // marche... aujourd'hui
```
::
::good
```bash
# pnpm : node_modules non-plat, symlinks vers le store
node_modules/.pnpm/lodash@4.17.21/...   # adressé par contenu
# B doit déclarer lodash pour pouvoir l'importer
pnpm --filter @acme/b add lodash
```
::
:::

**Pourquoi.** Le hoisting plat remonte les dépendances transitives à la racine
de `node_modules`. La résolution Node remonte l'arborescence des dossiers : un
import de `lodash` depuis B trouve le `lodash` hissé même si B ne l'a jamais
déclaré. C'est une **phantom dependency** — elle disparaît dès que A retire
lodash ou bump une version incompatible, et ça casse en prod sans que ton diff
ait touché B. pnpm utilise un store adressé par contenu et un `node_modules`
**non-plat** : seules les dépendances déclarées sont symlinkées dans chaque
paquet, donc un import non déclaré échoue à la compilation, là où c'est cheap à
corriger.

:::callout{type="warn"}
Le hoisting masque aussi les **doublons de version** : deux paquets exigeant
React 18 et 19 peuvent sembler marcher tant que l'un gagne le hoisting, puis
exploser au runtime (hooks dans deux instances de React). pnpm rend ces
conflits visibles à l'install. C'est inconfortable, c'est le but.
:::

## Task runners et cache de tâches

Lancer `build` sur 40 paquets séquentiellement est inutile : la plupart n'ont
pas changé. Turborepo et Nx modélisent les scripts comme un **graphe de tâches**
et y ajoutent un cache.

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": { "dependsOn": ["build"] }
  }
}
```

Le `^build` signifie « builde d'abord les dépendances amont de ce paquet ». Le
runner ordonne et **parallélise** ce qui peut l'être en respectant le graphe.

:::callout{type="tip"}
La clé de cache est un hash de **toutes les entrées** : fichiers sources du
paquet, hash des outputs des dépendances amont, version du runner, variables
d'environnement déclarées, et le lockfile. Change un seul octet d'entrée → la
clé change → la tâche se ré-exécute. Sinon, le runner **rejoue les logs et
restaure les `outputs` depuis le cache** sans rien exécuter. C'est pourquoi tu
dois déclarer `outputs` et les `env` lues : un output non déclaré ne sera pas
restauré, une env non déclarée crée des cache hits faux-positifs.
:::

## Nx vs Turborepo : deux philosophies

Turborepo et Nx partagent le même socle — graphe de tâches + cache d'entrées —
mais divergent sur la quantité d'abstraction. Turborepo est **minimal et
transparent** : tu décris tes tâches dans `turbo.json`, il les ordonne et les
cache, point. Nx est **intégré et opinionné** : il infère le graphe de projets
en lisant tes imports, et ajoute une couche d'outillage par-dessus.

Ce que Nx apporte en propre :

- **Project graph inféré** — Nx analyse les `import`/`require` réels pour
  déduire les dépendances entre projets, là où Turborepo s'appuie surtout sur
  les dépendances déclarées dans les `package.json`. `nx graph` ouvre une vue
  interactive du graphe.
- **Executors & generators** — des tâches paramétrées (`@nx/vite:build`) et du
  scaffolding (`nx g @nx/react:lib ui`) qui génèrent un projet déjà câblé
  (config, lint, test). Turborepo ne scaffolde rien.
- **Plugins** — `@nx/vite`, `@nx/react`, `@nx/eslint`… qui posent des
  `targetDefaults` et l'inférence de cibles sans config manuelle par projet.
- **Module boundaries** — une règle ESLint (`@nx/enforce-module-boundaries`)
  qui interdit les imports interdits selon des **tags**.

```json
// nx.json — cibles par défaut + cache
{
  "targetDefaults": {
    "build": { "dependsOn": ["^build"], "cache": true },
    "test": { "cache": true }
  }
}
```

```jsonc
// règle de frontière : une lib "feature" ne peut pas importer une "app",
// et "ui" reste pur (pas d'import de "data-access")
"@nx/enforce-module-boundaries": ["error", {
  "depConstraints": [
    { "sourceTag": "type:ui", "onlyDependOnLibsWithTags": ["type:ui", "type:util"] },
    { "sourceTag": "scope:web", "onlyDependOnLibsWithTags": ["scope:web", "scope:shared"] }
  ]
}]
```

:::callout{type="tip"}
La fonctionnalité qui justifie souvent Nx à grande échelle, c'est la
**Distributed Task Execution (DTE)** via Nx Cloud : au lieu de cacher seulement,
Nx répartit les tâches d'un même run sur plusieurs agents CI en parallèle, en
respectant le graphe, puis recolle les résultats. Turborepo offre le cache
distant (Remote Cache) mais pas la distribution native des tâches sur des agents.
:::

**Le trade-off.** Turborepo se glisse dans un repo existant en une après-midi et
ne te cache rien : peu de magie, peu de lock-in. Nx demande d'adopter sa
structure et son vocabulaire (projects, targets, tags, executors), mais te rend
en échange l'inférence du graphe, le scaffolding cohérent, les frontières
applicables et la distribution CI. Règle simple : **Turborepo** pour accélérer
un monorepo dont tu gardes la main sur l'outillage ; **Nx** quand tu veux une
plateforme de dev standardisée sur beaucoup d'équipes et de projets.

## Build affecté seulement

En CI, ne reconstruis que ce que le diff touche, transitivement.

:::compare
::bad
```bash
pnpm -r build   # construit les 40 paquets à chaque PR
```
::
::good
```bash
# Turborepo : filtre par diff depuis la base
turbo run build --filter="...[origin/main]"
# Nx : équivalent par graphe affecté
nx affected -t build --base=origin/main
```
::
:::

**Pourquoi.** `--filter="...[origin/main]"` calcule le set de paquets dont les
sources ont changé entre `HEAD` et `origin/main`, **plus leurs dépendants
transitifs** (le `...` en préfixe), car modifier `@acme/ui` peut casser toute
app qui le consomme. Le runner remonte le graphe inverse de dépendances pour
trouver ce sous-ensemble. Combiné au cache distant, une PR qui touche un seul
util ne reconstruit/teste que la fermeture impactée — le reste est un cache hit.

## Versioning avec changesets

Dans un monorepo publié, le défi est : quelle version bumper quand on modifie un
paquet dont dépendent d'autres ? Changesets répond avec des intentions de
version versionnées dans le repo.

```bash
pnpm changeset            # crée un .changeset/*.md : quels paquets, quel semver
pnpm changeset version    # applique les bumps + propage aux dépendants
pnpm changeset publish    # publie sur npm en respectant le graphe
```

**Pourquoi.** Un changeset déclare `@acme/ui: minor`. Au `version`, l'outil
propage : tout paquet qui dépend de `@acme/ui` reçoit un bump (patch par défaut)
parce que sa plage de dépendance change. Ça évite la dérive où une lib bouge
sans que ses consommateurs ne soient republiés, et ça génère un changelog par
paquet à partir des intentions, pas à partir de messages de commit interprétés.

:::cheatsheet
- title: "workspace:*"
  desc: "Force la résolution locale, échoue si le paquet n'est pas dans le workspace."
- title: "pnpm --filter <pkg>"
  desc: "Cible un paquet pour add/run sans toucher le reste du graphe."
- title: "dependsOn: ^build"
  desc: "Builde les dépendances amont avant le paquet courant."
- title: "outputs"
  desc: "Ce que le cache doit sauver/restaurer ; non déclaré = perdu."
- title: "...[origin/main]"
  desc: "Set affecté = paquets changés + dépendants transitifs."
- title: "nx graph"
  desc: "Visualise le project graph inféré depuis les imports réels."
- title: "@nx/enforce-module-boundaries"
  desc: "Règle ESLint : interdit les imports selon les tags des projets."
- title: "changeset version"
  desc: "Applique les bumps et les propage aux consommateurs."
:::

## À retenir

Le monorepo n'est gérable que si le graphe est honnête. pnpm rend les
dépendances explicites, le task runner les exploite pour cacher et paralléliser,
et changesets propage les versions le long du même graphe. Trois outils, une
seule structure de données : le graphe de dépendances.
