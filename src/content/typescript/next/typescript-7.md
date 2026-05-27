---
title: "TypeScript 7.0 : le compilateur natif"
slug: "typescript-7"
framework: "typescript"
level: "next"
order: 1
duration: 14
prerequisites: ["tsconfig-strict", "module-resolution"]
updated: 2026-05-23
seoTitle: "TypeScript 7.0 — compilateur natif Go, tsgo, projet Corsa, 10x plus rapide"
seoDescription: "TypeScript 7.0 réécrit le compilateur en Go (tsgo, projet Corsa) : ~10x plus rapide, ~3x moins de mémoire, parité de comportement avec TS 6, distribution native-preview, LSP et CI plus rapides, langage inchangé."
ogVariant: "iris"
related:
  - { framework: "typescript", slug: "module-resolution" }
---

## Ce qui change vraiment : le compilateur, pas le langage

TypeScript 7.0 est la version la plus surprenante de l'histoire du projet, parce
que sa nouveauté **n'est pas** dans le langage. Pas de nouvel opérateur, pas de
nouveau type, pas de syntaxe inédite. Ce qui change, c'est le **compilateur
lui-même** : `tsc` a été **entièrement réécrit en Go**, sous le nom de code
**Corsa**, et le binaire s'appelle **`tsgo`**. Le compilateur historique était
écrit en TypeScript et s'exécutait sur Node ; le nouveau est un programme natif
compilé. Retiens cette ligne de séparation avant tout le reste : **ton code ne
change pas**, seul l'outil qui le vérifie et le transpile change.

:::callout{type="info"}
Pourquoi Go et pas Rust ou autre ? L'équipe a choisi Go parce qu'il offre un
modèle mémoire et une structuration de code **proches** de l'implémentation
TypeScript existante (graphes d'objets, beaucoup de pointeurs partagés, ramasse-
miettes), ce qui permet un **portage fidèle** plutôt qu'une refonte risquée. La
concurrence native de Go sert aussi à paralléliser des phases (parsing, binding)
que la version Node, mono-thread, ne pouvait pas exploiter.
:::

## Les gains : ~10× en vitesse, ~3× en mémoire

Les chiffres annoncés et mesurés sur de gros dépôts : **environ 10× plus rapide**
sur la compilation et le *type-check* complets, et **environ 3× moins de
mémoire**. Sur un monorepo où `tsc` prenait une minute, le *check* tombe à
quelques secondes. Ce n'est pas une optimisation marginale, c'est un changement
de **régime d'usage** : un type-check qui était une étape de CI qu'on évitait de
lancer localement redevient quelque chose qu'on peut exécuter à chaque
sauvegarde.

:::compare
::bad
```bash
# TS 6 (compilateur sur Node) : type-check d'un gros projet
$ time tsc --noEmit
# ~48s, pic mémoire ~3.6 Go — trop lent pour boucler localement
```
::
::good
```bash
# TS 7 (tsgo, natif Go) : même projet, même tsconfig, même résultat
$ time tsgo --noEmit
# ~5s, pic mémoire ~1.2 Go — assez rapide pour tourner à chaque save
```
::
:::

**Pourquoi.** Le compilateur TS 6 est du JavaScript exécuté par V8 : il subit le
coût du *JIT warm-up*, d'un seul thread effectif pour l'essentiel du travail, et
d'un *garbage collector* qui pagine sur des structures énormes. `tsgo` est un
binaire **compilé en avance** (pas de warm-up), **parallélise** des phases sur
plusieurs cœurs grâce aux goroutines, et utilise des structures de données plus
compactes avec une gestion mémoire mieux adaptée au graphe de types — d'où le
facteur ~3 sur la mémoire. L'algorithme de vérification reste **le même** ; c'est
sa *machine d'exécution* qui passe d'un interprète généraliste à un programme
natif spécialisé. Les gains viennent du changement de plateforme, pas d'un
relâchement des règles de typage.

## Parité de comportement avec TS 6

Le contrat central du projet Corsa est la **parité** : `tsgo` doit produire les
**mêmes erreurs**, le **même JS émis**, les **mêmes `.d.ts`** que le compilateur
TS 6 sur la même entrée. Ce n'est pas un nouveau type-checker plus permissif ou
plus strict — c'est une **réimplémentation** validée par des suites de tests
différentielles qui comparent les deux sorties. Un projet qui compile sous TS 6
doit compiler à l'identique sous TS 7, aux écarts résiduels près que la beta sert
justement à traquer.

```bash
# Migration de surface : remplacer l'invocation, garder le même tsconfig.json
$ npm i -D @typescript/native-preview
$ npx tsgo --noEmit   # mêmes diagnostics attendus que npx tsc --noEmit
```

## Distribution : `@typescript/native-preview`

Pendant la phase d'aperçu, le binaire natif se récupère via le paquet
**`@typescript/native-preview`**, séparé du `typescript` classique pour ne pas
perturber les chaînes existantes. Il fournit l'exécutable `tsgo` et un serveur de
langage natif. Tu peux donc l'essayer **à côté** de ton `tsc` actuel, comparer les
diagnostics, mesurer les temps, sans t'engager.

:::callout{type="tip"}
Garde `typescript` (le compilateur TS 6) comme filet de sécurité tant que tu es
en preview : lance `tsgo` pour la vitesse au quotidien, mais valide ta CI contre
les deux jusqu'à ce que la parité soit confirmée sur **ton** code. Le jour où TS
7.0 est stable, le binaire natif devient le `tsc` par défaut et le paquet
preview disparaît.
:::

## Ce que ça change concrètement : LSP et CI

Deux effets pratiques dominent. D'abord le **serveur de langage** (LSP) : c'est le
processus qui alimente l'autocomplétion, les erreurs en temps réel et « aller à la
définition » dans ton éditeur. Réécrit en natif, il **répond plus vite** sur les
gros projets — moins de latence entre la frappe et le diagnostic, moins de gel de
l'éditeur sur un monorepo. Ensuite la **CI** : un type-check 10× plus rapide
raccourcit directement les pipelines, réduit le coût des runners et rend
réaliste un *check* bloquant sur chaque commit.

## Ce qui reste identique côté langage

Insistons une dernière fois, parce que c'est la source de confusion : **rien**
de ce que tu as appris sur le langage ne change avec TS 7.0. Les génériques, les
types conditionnels, `satisfies`, les décorateurs stage-3, la résolution de
modules, les utility types — tout fonctionne exactement pareil. Le `tsconfig.json`
est **le même fichier** avec **les mêmes options**. Tu ne réécris aucune
annotation, tu n'apprends aucune syntaxe. La numérotation saute de 6 à 7 pour
marquer le **changement d'implémentation**, pas une rupture du langage.

```ts
// Ce code se vérifie et s'émet à l'identique sous TS 6 et TS 7.
type Role = "admin" | "lecteur";
const droits = { admin: true, lecteur: false } satisfies Record<Role, boolean>;
// mêmes types inférés, mêmes erreurs, même JS — seule la VITESSE diffère
```

:::callout{type="info"}
Calendrier visé (mi-2026) : **beta en avril 2026** via `@typescript/native-
preview`, **version stable visée pour le milieu de l'année**. Les dates exactes
peuvent glisser ; ce qui est ferme, c'est la stratégie : sortir le compilateur
natif sous le numéro 7.0 une fois la parité atteinte, en gardant la 6.x comme
dernière ligne de l'ancien compilateur.
:::

:::cheatsheet
- title: "Corsa / tsgo"
  desc: "Le compilateur TypeScript réécrit en Go ; binaire tsgo, projet de code Corsa."
- title: "~10× plus rapide"
  desc: "Compilation et type-check complets, grâce au natif compilé et à la parallélisation."
- title: "~3× moins de mémoire"
  desc: "Structures plus compactes et gestion mémoire adaptée au graphe de types."
- title: "parité avec TS 6"
  desc: "Mêmes erreurs, même JS émis, mêmes .d.ts : réimplémentation, pas nouveau type-checker."
- title: "@typescript/native-preview"
  desc: "Paquet d'aperçu fournissant tsgo et le LSP natif, à côté du typescript classique."
- title: "LSP + CI"
  desc: "Éditeur plus réactif sur gros projets ; pipelines de type-check nettement raccourcis."
- title: "langage inchangé"
  desc: "Aucune nouvelle syntaxe ni type ; même tsconfig. Seul le compilateur change."
- title: "calendrier"
  desc: "Beta avril 2026, stable visé mi-2026 ; dates indicatives, stratégie ferme."
:::
