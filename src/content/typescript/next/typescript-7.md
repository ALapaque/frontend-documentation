---
title: "TypeScript 7.0 : le compilateur natif"
slug: "typescript-7"
framework: "typescript"
level: "next"
order: 1
duration: 15
prerequisites: ["tsconfig-strict", "module-resolution"]
updated: 2026-07-25
seoTitle: "TypeScript 7.0 stable — compilateur natif Go, 8 à 12× plus rapide"
seoDescription: "TypeScript 7.0 est stable depuis le 8 juillet 2026 : le compilateur natif Go est le tsc du paquet typescript, 8 à 12x plus rapide, editeur 13x plus reactif. Le langage ne change pas, mais l'API programmatique attend la 7.1 — et Vue, Svelte, Astro doivent patienter."
ogVariant: "iris"
related:
  - { framework: "typescript", slug: "module-resolution" }
---

:::callout{type="info"}
**TypeScript 7.0 est stable** depuis le **8 juillet 2026**. Le compilateur natif
est désormais le `tsc` du paquet standard : `npm i -D typescript` suffit. Les
noms `tsgo` et `@typescript/native-preview` appartiennent à la phase d'aperçu,
close.
:::

## Ce qui change vraiment : le compilateur, pas le langage

TypeScript 7.0 est la version la plus surprenante de l'histoire du projet, parce
que sa nouveauté **n'est pas** dans le langage. Pas de nouvel opérateur, pas de
nouveau type, pas de syntaxe inédite. Ce qui change, c'est le **compilateur
lui-même** : `tsc` a été **entièrement réécrit en Go**, sous le nom de code
**Corsa**. Le compilateur historique était écrit en TypeScript et s'exécutait sur
Node ; le nouveau est un programme natif compilé. Retiens cette ligne de
séparation avant tout le reste : **ton code ne change pas**, seul l'outil qui le
vérifie et le transpile change.

:::callout{type="info"}
Pourquoi Go et pas Rust ou autre ? L'équipe a choisi Go parce qu'il offre un
modèle mémoire et une structuration de code **proches** de l'implémentation
TypeScript existante (graphes d'objets, beaucoup de pointeurs partagés, ramasse-
miettes), ce qui permet un **portage fidèle** plutôt qu'une refonte risquée. La
concurrence native de Go sert aussi à paralléliser des phases (parsing, binding)
que la version Node, mono-thread, ne pouvait pas exploiter.
:::

## Les gains mesurés : 8× à 12× sur la compilation

Les chiffres publiés à la sortie stable, sur de vrais dépôts :

| Projet | TS 6 | TS 7 | Gain |
| --- | --- | --- | --- |
| VS Code | 125,7 s | 10,6 s | **11,9×** |
| Sentry | 139,8 s | 15,7 s | **8,9×** |
| Bluesky | 24,3 s | 2,8 s | **8,7×** |
| Playwright | 12,8 s | 1,47 s | **8,7×** |
| tldraw | 11,2 s | 1,46 s | **7,7×** |

Ce n'est pas une optimisation marginale, c'est un changement de **régime
d'usage** : un type-check qui était une étape de CI qu'on évitait de lancer
localement redevient quelque chose qu'on peut exécuter à chaque sauvegarde.

:::compare
::bad
```bash
# TS 6 (compilateur sur Node) : type-check de VS Code
$ time tsc --noEmit
# ~125s — trop lent pour boucler localement
```
::
::good
```bash
# TS 7 (tsc natif Go) : même tsconfig, même résultat
$ time tsc --noEmit
# ~10.6s — assez rapide pour tourner à chaque save
```
::
:::

**Pourquoi.** Le compilateur TS 6 est du JavaScript exécuté par V8 : il subit le
coût du *JIT warm-up*, d'un seul thread effectif pour l'essentiel du travail, et
d'un *garbage collector* qui pagine sur des structures énormes. Le nouveau `tsc`
est un binaire **compilé en avance** (pas de warm-up) qui **parallélise** des
phases sur plusieurs cœurs grâce aux goroutines. L'algorithme de vérification
reste **le même** ; c'est sa *machine d'exécution* qui passe d'un interprète
généraliste à un programme natif spécialisé.

:::callout{type="warn"}
Attention à une idée reçue née pendant la preview : le gain **mémoire** est réel
mais **modeste**, pas spectaculaire. Les mesures à la stable donnent **−18 %**
sur VS Code (5,2 Go → 4,2 Go) et **−26 %** sur Bluesky (1,8 Go → 1,3 Go). Le
facteur ~10, c'est la **vitesse**, pas la mémoire.
:::

## L'éditeur : le gain le plus sensible au quotidien

Le **serveur de langage** (LSP) alimente l'autocomplétion, les erreurs en temps
réel et « aller à la définition ». Réécrit en natif, il change l'expérience sur
les gros projets : sur VS Code, le délai d'apparition des erreurs passe de
**17,5 secondes à moins de 1,3 seconde** — environ **13×**. C'est le gain que tu
ressens à chaque frappe, avant même de penser à la CI.

## Le parallélisme, et comment le pousser

Le compilateur exécute parsing, type-check et émission en parallèle. Trois
options le pilotent :

```bash
tsc --checkers 8      # workers de vérification (défaut : 4)
tsc --builders 4      # builds parallèles de références de projet
tsc --singleThreaded  # force le mono-thread (débogage, env. contraints)
```

Le défaut de `--checkers` est **4**. Sur une machine généreuse, monter à `8`
pousse VS Code jusqu'à **16,7×** au lieu de 11,9×. Mesure avant de figer une
valeur : au-delà du nombre de cœurs réels, tu perds le bénéfice.

## Installation et migration

```bash
npm i -D typescript     # tsc EST désormais le compilateur natif
npx tsc --noEmit        # mêmes diagnostics, même tsconfig.json
```

Les nightlies passent par `typescript@next`. Et si tu as besoin de garder
l'ancien compilateur en parallèle — le temps de valider — un paquet de
compatibilité l'expose sous `tsc6` :

```bash
npm i -D typescript@npm:@typescript/typescript6
```

:::callout{type="tip"}
Le chemin le plus sûr reste celui recommandé par l'équipe : **passer d'abord par
TypeScript 6.0**, qui porte les dépréciations, puis sauter en 7.0. Une base
propre en 6.x migre presque toujours sans friction.
:::

## Ce qui casse quand même

La **parité de comportement** est le contrat du projet : mêmes erreurs, même JS
émis, mêmes `.d.ts` sur la même entrée. Mais « le langage ne change pas » ne veut
pas dire « rien ne bouge » — la 7.0 acte des **suppressions de configuration**
préparées par la 6.x :

- `target: "es5"` n'est plus pris en charge ;
- `baseUrl` disparaît (utilise `paths` avec des chemins relatifs) ;
- les systèmes de modules historiques sont retirés.

Ce sont des changements de **`tsconfig.json`**, pas de code applicatif. D'où
l'intérêt de passer par la 6.0 d'abord : elle signale ces points avant le saut.

## Le point qui bloque encore : pas d'API programmatique

C'est **la** limite de la 7.0, et elle concerne directement beaucoup de fronts :

:::callout{type="warn"}
**TypeScript 7.0 ne fournit pas d'API programmatique.** Les outils qui *embarquent*
le compilateur dans leur propre chaîne — Volar, et donc **Vue, Svelte, Astro,
MDX** — ne peuvent pour l'instant s'appuyer que sur TypeScript 6.0. Si ton projet
en fait partie, **reste en 6.0** : tu perdrais le support éditeur. L'API est
attendue en **7.1**, avec un rythme annoncé d'une version tous les 3-4 mois.
:::

Concrètement : un projet React ou Angular en TS pur peut passer en 7.0
aujourd'hui ; un projet Vue avec des fichiers `.vue` attend la 7.1. Vérifie
l'état de ton outillage avant de mettre à jour, pas après.

## Ce qui reste identique côté langage

Insistons une dernière fois, parce que c'est la source de confusion : **rien**
de ce que tu as appris sur le langage ne change avec TS 7.0. Les génériques, les
types conditionnels, `satisfies`, les décorateurs stage-3, la résolution de
modules, les utility types — tout fonctionne exactement pareil. Tu ne réécris
aucune annotation, tu n'apprends aucune syntaxe. La numérotation saute de 6 à 7
pour marquer le **changement d'implémentation**, pas une rupture du langage.

```ts
// Ce code se vérifie et s'émet à l'identique sous TS 6 et TS 7.
type Role = "admin" | "lecteur";
const droits = { admin: true, lecteur: false } satisfies Record<Role, boolean>;
// mêmes types inférés, mêmes erreurs, même JS — seule la VITESSE diffère
```

:::callout{type="info"}
Calendrier constaté : beta en avril 2026 (`@typescript/native-preview`), Release
Candidate le 22 juin, **stable le 8 juillet 2026**. La 6.x reste la dernière
ligne de l'ancien compilateur JavaScript, et le socle des outils qui attendent
l'API de la 7.1.
:::

:::cheatsheet
- title: "Corsa"
  desc: "Le compilateur TypeScript réécrit en Go. Depuis la 7.0 stable, c'est le tsc du paquet typescript."
- title: "8× à 12× plus rapide"
  desc: "VS Code 125,7s vers 10,6s ; Sentry 8,9x ; Bluesky 8,7x. Le type-check redevient une boucle locale."
- title: "Éditeur ~13×"
  desc: "Erreurs affichées en moins de 1,3s au lieu de 17,5s sur VS Code : le gain le plus quotidien."
- title: "Mémoire : −18 à −26 %"
  desc: "Gain réel mais modeste. Le facteur ~10 concerne la vitesse, pas la mémoire."
- title: "npm i -D typescript"
  desc: "Plus de paquet à part. typescript@next pour les nightlies, @typescript/typescript6 pour garder tsc6."
- title: "--checkers (défaut 4)"
  desc: "Monter à 8 pousse VS Code à 16,7x. Avec --builders et --singleThreaded pour déboguer."
- title: "Pas d'API en 7.0"
  desc: "Vue, Svelte, Astro, MDX (via Volar) restent en TS 6.0 jusqu'à la 7.1. Vérifie ton outillage AVANT."
- title: "Ruptures de config"
  desc: "target es5, baseUrl et les modules historiques disparaissent. Passe par la 6.0 d'abord."
:::
