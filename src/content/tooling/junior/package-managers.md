---
title: "Gestionnaires de paquets : npm, pnpm, yarn"
slug: "package-managers"
framework: "tooling"
level: "junior"
order: 1
duration: 14
prerequisites: []
updated: 2026-05-23
seoTitle: "npm, pnpm, yarn — lockfile, semver et store (Guide Junior)"
seoDescription: "Comprendre les gestionnaires de paquets : lockfile, semver, node_modules vs le store de pnpm, npx et scripts. Le pourquoi du mécanisme."
ogVariant: "sage"
related:
  - { framework: "tooling", slug: "vite" }
  - { framework: "tooling", slug: "dev-environment" }
---

## À quoi sert un gestionnaire de paquets

Un projet front moderne dépend de centaines de bibliothèques, qui dépendent
elles-mêmes d'autres bibliothèques. Le gestionnaire de paquets (**package
manager**) résout ce graphe de dépendances, télécharge les bonnes versions
depuis un registre (par défaut le **registry npm**), et les installe dans
`node_modules`. Il lit ses instructions dans `package.json`.

Trois acteurs se partagent l'écosystème en 2026 :

- **npm** : livré avec Node, le défaut, robuste, le plus lent historiquement.
- **pnpm** : le plus efficace en disque et en vitesse grâce à son store global.
- **yarn** : aujourd'hui surtout `yarn` v4 (Berry), avec son mode Plug'n'Play.

Tu peux changer d'outil, mais **ne mélange jamais** deux gestionnaires dans le
même dépôt : chacun a son propre lockfile, et les faire cohabiter recrée le
chaos que le lockfile est censé empêcher.

## Le lockfile : la photo exacte de l'arbre

`package.json` exprime des **intentions** (« je veux React 19 ou plus récent »).
Le lockfile (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`) enregistre le
**résultat exact** de la résolution : chaque version précise, son hash
d'intégrité, et l'agencement de l'arbre.

:::callout{type="warn"}
Le lockfile **doit** être commité dans Git. C'est lui qui garantit que ton
collègue et la CI installent exactement les mêmes octets que toi. Sans lui,
deux `install` à deux jours d'intervalle peuvent produire deux arbres
différents — la source numéro un du « works on my machine ».
:::

:::compare
::bad
```bash
# Le lockfile est dans .gitignore, chacun résout dans son coin
npm install lodash
# CI : "TypeError" sur une version mineure différente
```
::
::good
```bash
npm install lodash
git add package.json package-lock.json
# Tout le monde installe le même arbre figé
```
::
:::

**Pourquoi.** `npm install` relit le `package.json` et **reconstruit** l'arbre à
partir des ranges semver, qui sont volontairement flous. Une dépendance
transitive publiée entre-temps suffit à changer le résultat. Le lockfile fige
chaque version et son hash : tant qu'il est présent et inchangé, l'installation
est **déterministe et reproductible**. En CI, utilise d'ailleurs `npm ci` (et
non `install`) : cette commande **refuse** de modifier le lockfile et échoue si
`package.json` et lockfile divergent — exactement ce qu'on veut sur un build.

## Semver : lire les ranges `^` et `~`

Les versions suivent le **Semantic Versioning** : `MAJOR.MINOR.PATCH`. Un MAJOR
change l'API de façon cassante, un MINOR ajoute du compatible, un PATCH corrige
sans rien casser. Le préfixe devant la version dans `package.json` définit la
plage de mises à jour autorisées.

:::cheatsheet
- title: "^1.2.3"
  desc: "MINOR et PATCH autorisés ; bloque le MAJOR. Le défaut de npm."
- title: "~1.2.3"
  desc: "PATCH seulement (1.2.x). Plus prudent."
- title: "1.2.3"
  desc: "Version exacte épinglée, aucune mise à jour automatique."
- title: "*"
  desc: "N'importe quelle version. À fuir : casse garantie un jour."
:::

```json package.json
{
  "dependencies": {
    "react": "^19.0.0",
    "zod": "~3.23.0"
  }
}
```

Le piège : `^0.x.y` traite le **MINOR** comme cassant (un projet en `0.x` est
réputé instable), donc `^0.5.0` n'autorise que `0.5.x`. Beaucoup de bugs
« mystérieux » viennent de là.

## node_modules à plat vs le store de pnpm

npm et yarn « classique » installent les paquets en **les copiant** dans un
`node_modules` aplati : chaque projet duplique sur disque les mêmes octets, et
l'algorithme de mise à plat (**hoisting**) remonte les paquets à la racine pour
les partager. Effet de bord dangereux : ton code peut importer un paquet que tu
n'as **jamais déclaré** simplement parce qu'il a été hissé là par hasard
(**phantom dependency**).

pnpm casse ce modèle. Il télécharge chaque version **une seule fois** dans un
**store global** (`~/.local/share/pnpm/store`), puis crée dans `node_modules`
des **liens** (hard links + symlinks) vers ce store.

:::callout{type="tip"}
Sur une machine avec 20 projets React, pnpm ne stocke React 19 qu'une fois sur
le disque au lieu de 20. Les installations suivantes sont quasi instantanées :
il n'y a plus de téléchargement, juste des liens à recréer.
:::

**Pourquoi.** Un **hard link** fait pointer deux entrées de dossier vers les
mêmes blocs disque : zéro copie, zéro octet supplémentaire. pnpm range chaque
paquet dans un sous-dossier isolé et n'expose au code **que** les dépendances
réellement déclarées via symlinks. Résultat : gain de place massif, installs
rapides, et fin des phantom dependencies puisqu'un import non déclaré ne trouve
plus rien dans l'arbre.

## Exécuter sans installer globalement : npx / dlx

`npx` (npm) et `pnpm dlx` exécutent un binaire de paquet **sans** l'installer
durablement : ils le téléchargent dans un cache temporaire, le lancent, puis
oublient. Idéal pour les outils ponctuels comme un générateur de projet.

```bash
npx create-vite@latest mon-app
pnpm dlx create-vite@latest mon-app
```

Tu évites ainsi de polluer ton install globale avec des CLI que tu n'utiliseras
qu'une fois, et tu obtiens toujours la dernière version publiée.

## Les scripts npm : ton interface de commandes

Le champ `scripts` de `package.json` mappe des noms courts à des commandes
shell. Toute l'équipe utilise alors le **même** vocabulaire, peu importe l'outil
sous-jacent.

```json package.json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest",
    "lint": "oxlint ."
  }
}
```

Lance-les avec `npm run dev` (ou `pnpm dev`, le `run` est optionnel sur pnpm).
Les binaires de tes dépendances sont automatiquement dans le `PATH` du script :
pas besoin de chemin vers `node_modules/.bin`. C'est le point d'entrée canonique
d'un projet — quand tu arrives sur un dépôt inconnu, lis ses `scripts` en
premier.
