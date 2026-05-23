---
title: "Linting et formatting : rôles distincts"
slug: "linting-formatting"
framework: "tooling"
level: "medior"
order: 3
duration: 14
prerequisites: ["dev-environment"]
updated: 2026-05-23
seoTitle: "ESLint, Biome, Oxlint, Prettier — lint vs format (Medior)"
seoDescription: "Lint vs format en 2026 : ESLint vs Oxlint/Biome (Rust), Prettier vs Oxfmt, type-aware linting, intégration éditeur/CI et pre-commit hooks."
ogVariant: "gold"
related:
  - { framework: "tooling", slug: "dev-environment" }
  - { framework: "tooling", slug: "vite" }
---

## Deux outils, deux problèmes différents

On les confond toujours, et c'est la source d'innombrables guerres de config.

- Un **formatter** s'occupe de l'**apparence** : indentation, guillemets,
  virgules finales, longueur de ligne. Il ne juge **jamais** la justesse du code,
  seulement sa mise en forme. Il réécrit, point.
- Un **linter** s'occupe de la **correction** : variables inutilisées, `await`
  oublié, dépendances manquantes d'un hook, code mort, anti-patterns. Il
  **analyse** la sémantique et signale des bugs potentiels.

:::callout{type="info"}
Règle d'or : **un seul outil par responsabilité**. Si ton linter et ton formatter
se disputent le placement des virgules, tu boucles à l'infini. Désactive les
règles **stylistiques** du linter et laisse le formatter trancher la forme. Le
linter ne garde que les règles qui parlent de **logique**.
:::

## L'ancien monde et le mur de la performance

Le standard historique : **ESLint** (lint) + **Prettier** (format), tous deux en
JavaScript. Excellents, écosystème immense — mais lents sur les gros dépôts, car
chaque fichier est parsé et analysé en JS, largement mono-thread. Sur un monorepo,
un `eslint .` peut prendre des minutes.

C'est exactement le problème que la nouvelle génération en **Rust** attaque :

- **Oxlint** (linter, basé sur Oxc, le même moteur que Vite/Vitest)
- **Biome** (linter **et** formatter, en un seul binaire)
- **Oxfmt** (formatter de la famille Oxc)

:::compare
::bad
```bash
# ESLint sur un gros monorepo
time eslint .
# eslint .  41.80s user  3.10s system
```
::
::good
```bash
# Oxlint : même base, mêmes catégories de règles
time oxlint .
# oxlint .  0.62s user  0.18s system
```
::
:::

**Pourquoi.** Le gros du temps d'un linter, c'est **parser** le code en AST puis
le **parcourir**. Un outil en JS subit le garbage collector et reste mono-thread.
Oxlint/Biome parsent en Rust, **parallélisent par fichier** sur tous les cœurs, et
réutilisent un seul AST pour appliquer toutes les règles. D'où les fameux **50 à
100×** plus rapide. La vitesse n'est pas cosmétique : un lint instantané peut
tourner à chaque sauvegarde et bloquer un commit sans casser le flow.

## Type-aware linting : la limite à connaître

Certaines règles puissantes (« ce `Promise` n'est jamais attendu », « ce cast est
impossible ») exigent de connaître les **types**. Cela suppose de lancer le
**compilateur TypeScript** pour résoudre tout le graphe de types — une étape
lourde.

```bash
# Règle type-aware : nécessite le type-checker
eslint --rule '@typescript-eslint/no-floating-promises'
```

**Pourquoi.** Sans information de types, un linter ne voit que la syntaxe : il sait
qu'un appel existe, pas qu'il renvoie une `Promise`. Le **type-aware linting**
branche le linter sur le programme TypeScript complet pour interroger les types
résolus — d'où sa lenteur. En 2026, les linters Rust couvrent l'écrasante majorité
des règles **syntaxiques** ultra-vite ; pour le sous-ensemble **type-aware**, on
garde encore souvent typescript-eslint, ou on délègue carrément la vérification de
types à `tsc --noEmit` dans un job séparé.

## Intégration : éditeur, scripts, CI

```json package.json
{
  "scripts": {
    "lint": "oxlint .",
    "format": "biome format --write .",
    "check": "tsc --noEmit && oxlint ."
  }
}
```

Trois niveaux d'intégration, complémentaires et non interchangeables :

1. **Éditeur** : extension qui souligne les erreurs en temps réel et formate à la
   sauvegarde (`formatOnSave`). Feedback immédiat, mais dépend de la config locale.
2. **Pre-commit hook** : empêche un commit non conforme d'entrer dans l'historique.
3. **CI** : le filet de sécurité qui ne dépend d'aucune machine.

:::callout{type="tip"}
Ne fais **pas** confiance aux seuls réglages éditeur : ils diffèrent d'un poste à
l'autre. La CI est la **seule** vérité partagée. L'éditeur sert le confort, le hook
attrape tôt, la CI tranche.
:::

## Pre-commit hooks

Un hook Git lance lint/format sur les fichiers **mis en staging** avant chaque
commit. On le câble en général avec un orchestrateur (`lefthook`, `husky`) couplé
à un sélecteur de fichiers staged (`lint-staged`) pour ne traiter que ce qui change.

```yaml lefthook.yml
pre-commit:
  parallel: true
  commands:
    format:
      glob: "*.{ts,tsx,json,css}"
      run: biome format --write {staged_files}
      stage_fixed: true
    lint:
      glob: "*.{ts,tsx}"
      run: oxlint {staged_files}
```

**Pourquoi.** Lancer l'outil sur **tout** le dépôt à chaque commit serait lent et
hors-sujet : tu n'as touché que trois fichiers. En ciblant les `staged_files`, le
hook reste quasi instantané et corrige uniquement ce qui part dans le commit
(`stage_fixed` réajoute les fichiers reformatés). Le hook **ne remplace pas la
CI** : un collègue peut le contourner avec `--no-verify`, seule la CI est
infranchissable.

:::cheatsheet
- title: "Formatter (Prettier / Biome / Oxfmt)"
  desc: "Forme uniquement : indentation, guillemets. Réécrit, ne juge rien."
- title: "Linter (ESLint / Oxlint / Biome)"
  desc: "Logique : bugs, code mort, anti-patterns. Analyse, signale, parfois corrige."
- title: "Biome"
  desc: "Lint + format en un binaire Rust. Config unique, ultra-rapide."
- title: "Oxlint"
  desc: "Linter Rust (Oxc), 50-100× ESLint sur les règles syntaxiques."
- title: "tsc --noEmit"
  desc: "Vérification de types complète. Le complément type-aware du linter."
- title: "pre-commit + CI"
  desc: "Hook = feedback tôt ; CI = vérité non contournable."
:::

## Le combo recommandé en 2026

Pour un projet neuf : **Biome** seul (lint + format en un outil, une config) si
tu veux la simplicité, ou **Oxlint + Oxfmt** si tu veux rester dans la famille Oxc
alignée avec Vite/Vitest. Garde **tsc --noEmit** en CI pour la vérité des types,
et n'ajoute ESLint que pour les rares règles type-aware non encore couvertes. La
direction est claire : moteurs Rust unifiés, config minimale, vitesse permettant
de linter à chaque frappe.
