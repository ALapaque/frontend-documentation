---
title: "Oxlint et Oxfmt : le lint en Rust"
slug: "oxlint-oxfmt"
framework: "tooling"
level: "medior"
order: 4
duration: 13
prerequisites: ["linting-formatting"]
updated: 2026-07-09
seoTitle: "Oxlint et Oxfmt — linter et formateur en Rust, 50 à 100× plus rapides qu'ESLint"
seoDescription: "Oxlint et Oxfmt (projet Oxc) remplacent ESLint et Prettier par des outils Rust massivement parallèles : lint d'un gros repo en secondes, migration depuis ESLint, statut du lint type-aware, et place dans la toolchain VoidZero."
ogVariant: "sage"
related:
  - { framework: "tooling", slug: "linting-formatting" }
  - { framework: "tooling", slug: "rust-toolchain" }
---

Sur un gros dépôt, `eslint .` prend des dizaines de secondes. C'est le maillon
lent : le pre-commit traîne, la CI bloque, et à la longue tu désactives des règles
juste pour respirer. **Oxlint** (Rust, parallèle, basé sur Oxc) fait le même travail
en une fraction du temps — assez vite pour tourner à chaque sauvegarde.

L'article `tooling/medior/linting-formatting` pose déjà les bases (lint contre
format, type-aware, pre-commit hook). Ici, on descend dans les **outils Rust
concrets** : config, maturité en 2026, et migration depuis ESLint + Prettier.

## Pourquoi ESLint rame et pourquoi Oxc s'envole

ESLint tourne dans Node, en JavaScript, largement **mono-thread**. Trois coûts
s'additionnent : la **résolution** de la config (plugins, parseur, `extends`), le
**parsing** de chaque fichier en AST, puis le **parcours** de cet AST par chaque
règle — souvent plusieurs fois, chaque plugin re-parcourant l'arbre pour son compte,
pendant que le garbage collector de Node nettoie les millions de nœuds créés.

Oxc attaque les trois. Un **seul parseur Rust** partagé produit **un seul AST**, sur
lequel toutes les règles passent en un balayage, le tout **parallélisé par fichier**
sur tous les cœurs. Pas de GC qui s'affole, pas de re-parsing.

:::compare
::bad
```bash
time eslint .
# eslint .   20.96s
```
::
::good
```bash
time oxlint .
# oxlint .   0.18s
```
::
:::

Le benchmark officiel `oxc-project/bench-linter` annonce **50 à 100× plus rapide**.
Sur une machine récente, un dépôt qui prenait ~21 s tombe sous 200 ms (~118×) ; sur
le code de Vue, la mesure tourne autour de **60×**. L'ordre de grandeur est réel :
c'est structurel, pas un réglage.

## Oxlint : installe, lance, configure

```bash
npx oxlint@latest      # essai immédiat, rien à ajouter au projet
npm install -D oxlint   # puis en dépendance de dev une fois convaincu
```

Oxlint porte déjà **plus de 700 règles** venues d'ESLint core et des plugins
populaires (`import`, `jsx-a11y`, `react`, `react-hooks`, `unicorn`, `jest`,
`typescript`), rangées par **catégorie**. Par défaut, seule `correctness` — les
vrais bugs — est active, ce qui évite de crouler sous le bruit dès le premier run.
La config vit dans un `.oxlintrc.json`, au format proche d'ESLint :

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["import", "react", "typescript"],
  "categories": { "correctness": "error" },
  "rules": { "no-console": "warn", "eqeqeq": "error" },
  "ignorePatterns": ["dist/**", "coverage/**"]
}
```

:::callout{type="tip"}
Côté éditeur, l'extension **Oxc** (VS Code, Cursor, Zed) souligne les erreurs en
temps réel et applique les corrections sûres via `--fix`. Comme le lint est quasi
instantané, tu peux le lancer à chaque frappe sans casser le flow — c'est tout
l'intérêt de la vitesse, pas juste un chiffre sur un graphe.
:::

## Le lint type-aware : la pièce manquante se met en place

Certaines règles très utiles exigent de connaître les **types** :
`no-floating-promises` (un `await` oublié), `no-misused-promises`, `no-unsafe-*`.
Impossible à trancher à la syntaxe seule : il faut résoudre tout le graphe de types.
C'est historiquement le domaine réservé de **typescript-eslint**, et sa lenteur.

En 2026, Oxlint attaque ce terrain avec **tsgolint**, un moteur bâti sur
**typescript-go** (le portage Go du compilateur, cap sur TypeScript 7 / « Corsa »).
Oxlint gère la découverte des fichiers, la config et la sortie ; tsgolint exécute
les règles type-aware et renvoie les diagnostics sémantiques.

```bash
oxlint --type-aware   # active le lint type-aware (encore en préversion)
```

**59 des 61 règles** type-aware de typescript-eslint sont couvertes, et des dépôts
qui demandaient ~1 minute finissent en **moins de 10 secondes**.

:::callout{type="warn"}
Ce pan est en **alpha** début 2026, pas encore stable. Le modèle raisonnable est
**hybride** : Oxlint pour le gros du lint syntaxique (rapide, mûr), et tu gardes
typescript-eslint — ou un simple `tsc --noEmit` en CI — pour le résiduel type-aware
tant que la préversion n'est pas figée.
:::

## Oxfmt : le formateur de la famille

Côté forme, Oxc a désormais son formateur, **Oxfmt**. Sorti en **alpha en décembre
2025**, passé en **bêta en février 2026**. Sa cible assumée est Prettier : il passe
**100 % des tests de conformité JS/TS de Prettier**, reste à **plus de 95 %** de
compatibilité sur la sortie, pour environ **30× plus rapide**.

```bash
npx oxfmt            # formate tout le dépôt, écriture en place
npx oxfmt --check    # vérifie sans réécrire (utile en CI)
```

Il ne se limite pas à JS/TS : JSX, TSX, JSON, YAML, TOML, CSS/SCSS/Less, Markdown,
GraphQL, Vue et d'autres. Il intègre aussi le **tri des imports** et Tailwind, là
où Prettier réclame des plugins. Des projets réels tournent déjà dessus :
`vuejs/core`, `vercel/turborepo`, `getsentry/sentry-javascript`. « Bêta » n'est pas
« instable » : au basculement, fais **un seul gros commit de reformatage**, isolé
du reste, pour ne pas polluer les revues suivantes.

## Migration : cohabiter, puis remplacer

Le passage n'est pas manuel. `@oxlint/migrate` lit une **config plate ESLint
(v9/v10)** et génère le `.oxlintrc.json` correspondant :

```bash
npx @oxlint/migrate   # usage unique, sans l'ajouter aux dépendances
```

L'outil préserve les `overrides` par chemin, convertit `globals` et `env`, reprend
les patterns d'ignore, et **migre même les plugins non natifs** en les rebranchant
via les plugins JavaScript d'Oxlint. Attention : une config **ESLint v8 héritée**
(`.eslintrc.js`) n'est pas migrable directement — passe-la d'abord en config plate
avec `@eslint/migrate-config`. Garde Oxlint et l'outil sur la **même version**.

:::compare
::bad
```bash
# Tout couper d'un coup : risqué sur un gros dépôt
rm eslint.config.js && oxlint .
```
::
::good
```bash
# Cohabitation : Oxlint prend le gros, ESLint garde le résiduel
oxlint . && eslint . --rulesdir ./eslint-residuel
```
::
:::

La bonne trajectoire est **graduelle** : Oxlint absorbe l'écrasante majorité des
règles syntaxiques, tu ne laisses à ESLint que le résiduel (surtout le type-aware).
Avec les plugins JS d'Oxlint en alpha, l'équipe Oxc estime que ~80 % des
utilisateurs d'ESLint peuvent basculer et voir « ça marche » sans y retoucher. Côté
format, `oxfmt` remplace Prettier en gardant `.prettierignore` comme repère.

## Place dans la toolchain VoidZero, et quand adopter

Oxlint et Oxfmt ne sont pas des outils isolés : Oxc est le **même socle** que
Rolldown, Vite et Vitest, sous l'ombrelle **VoidZero** qui vise une toolchain
unifiée en Rust — un seul parseur, un seul modèle mental, du bundler au linter.
Le détail de cette convergence est dans `tooling/senior/rust-toolchain`.

- **Oxlint** : mûr, rapide, adoptable **maintenant** sur les règles syntaxiques.
- **Oxfmt** : en bêta, largement compatible Prettier — adoptable, en gardant en
  tête un ajustement mineur au moment du basculement.
- **Type-aware** : en alpha — teste-le, mais reste en hybride pour la CI jusqu'à
  sa stabilisation.

## À retenir

Oxlint lint 50 à 100× plus vite qu'ESLint parce qu'il partage un seul AST Rust et
parallélise par fichier. Adopte-le dès aujourd'hui pour le syntaxique, migre avec
`@oxlint/migrate`, et garde le type-aware en hybride le temps que l'alpha se pose.
Oxfmt (bêta) remplace Prettier avec >95 % de compatibilité pour ~30× la vitesse.
Le tout s'aligne sur la toolchain VoidZero autour de Vite.

:::cheatsheet
- title: "Oxlint"
  desc: "Linter Rust (Oxc), 700+ règles portées, 50-100× ESLint. Config .oxlintrc.json."
- title: "npx oxlint@latest"
  desc: "Essai immédiat, sans installation. Catégorie correctness active par défaut."
- title: "Type-aware (tsgolint)"
  desc: "59/61 règles typescript-eslint via typescript-go. Alpha : reste en hybride."
- title: "Oxfmt"
  desc: "Formateur Rust, bêta 2026. 100% conformité Prettier, >95% sortie, ~30× plus vite."
- title: "@oxlint/migrate"
  desc: "Config ESLint plate v9/v10 → .oxlintrc.json. Usage unique, versions alignées."
- title: "Toolchain VoidZero"
  desc: "Même socle Oxc que Vite/Rolldown/Vitest. Cf. tooling/senior/rust-toolchain."
:::
