---
title: "Monorepo frontend : pnpm, Turborepo, Nx"
slug: "monorepo"
framework: "architecture"
level: "medior"
order: 1
duration: 16
prerequisites: ["foundations"]
updated: 2026-06-01
seoTitle: "Monorepo frontend — pnpm workspaces, Turborepo, Nx, quand et comment"
seoDescription: "Le monorepo côté frontend : pnpm workspaces pour la base, Turborepo pour le cache et la pipeline, Nx pour les générateurs et l'analyse de graphe. Quand ça vaut le coup, comment commencer, les pièges."
ogVariant: "gold"
related:
  - { framework: "architecture", slug: "foundations" }
  - { framework: "tooling", slug: "monorepo" }
---

Le monorepo n'est pas une mode : c'est l'outil qui rend les **refactors atomiques** possibles quand tu as plusieurs apps qui partagent du code (un design system, des types de domaine, des helpers). Côté frontend en 2026, le combo qui domine : **pnpm workspaces** pour la fondation, **Turborepo** ou **Nx** par-dessus pour le cache + la pipeline.

## Ce que ça résout, côté frontend

Tu as deux apps (admin + storefront) qui partagent un design system et des types d'utilisateur. Trois choix :

- **Multi-repo** : design-system dans un repo, types dans un autre, apps dans deux autres. Pour ajouter un champ à `User`, tu PR sur le repo types, tu publish une version, tu bump dans deux apps. **Une semaine pour propager un champ.**
- **Un seul gros repo, pas de workspaces** : tout mélangé, build long, conflits Git constants.
- **Monorepo avec workspaces** : `User` se modifie dans `packages/domain`, les apps voient le changement **dans la même PR**. CI rejoue les builds impactés. **Cinq minutes.**

## La base : pnpm workspaces

C'est la couche **minimum**. Pas d'outil extra, juste npm-compatible.

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```text
.
├── apps/
│   ├── admin/           (Vue + Nuxt)
│   └── storefront/      (Angular)
├── packages/
│   ├── design-system/   (composants partagés)
│   ├── domain/          (types métier, validation Zod)
│   └── http/            (client API)
├── pnpm-workspace.yaml
└── package.json
```

Tu importes via le nom du package, pas via un chemin relatif :

```ts
// apps/storefront/src/checkout.ts
import { type Cart } from '@my/domain';
import { Button } from '@my/design-system';
```

**Pourquoi c'est suffisant pour beaucoup d'équipes.** Pas besoin de Turbo ni de Nx tant que tu n'as pas 5+ apps ou des builds de plus de 30s. pnpm seul te donne déjà : un seul `pnpm install`, l'auto-link entre packages, des PR atomiques.

## Le pas d'après : Turborepo

Quand le build commence à coûter du temps, Turborepo apporte deux choses :
1. **Cache distribué** des sorties de build (basé sur le hash des inputs)
2. **Pipeline déclarée** (qui dépend de qui)

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],         // build les deps d'abord
      "outputs": ["dist/**", ".next/**"]
    },
    "test": { "dependsOn": ["^build"] },
    "lint": { }
  }
}
```

```bash
turbo build --filter=storefront    # build storefront + ses deps, cache hit si rien n'a changé
```

**Côté frontend, l'impact concret** : ton build CI passe de 8 minutes à 30 secondes quand tu modifies un texte de bouton (le design system reste cache hit, l'app récupère le hit du DS et ne rebuild que son propre delta).

## Le pas suivant : Nx

Nx ajoute, par rapport à Turbo :
- **Graphe de dépendances** explicite + visualisation (`nx graph`)
- **Générateurs** (`nx g @nx/angular:lib`, `nx g @nx/react:component`) — bootstrap d'un package en une commande
- **Boundaries enforcement** (`enforce-module-boundaries`) — tu peux interdire à `apps/admin` d'importer `apps/storefront` au niveau de l'ESLint
- **Affected** (`nx affected:test`) — ne lance que ce qui dépend du diff

Nx vs Turbo : Nx est **plus opinionated** et plus lourd. Turbo est **plus léger** et n'impose pas de structure. La règle pragmatique : **Turbo pour 2-4 apps**, **Nx au-delà ou si tu veux des générateurs**.

## La plus-value frontend (l'angle qui paie)

:::cheatsheet
- title: "Refactors atomiques"
  desc: "Renommer un champ de domaine = une PR, deux apps mises à jour ensemble. Pas de drift de version."
- title: "Design system intégré"
  desc: "Le composant Button vit avec les apps qui l'utilisent — tu vois immédiatement ce qui casse au changer."
- title: "Types partagés bout-en-bout"
  desc: "@my/domain importé par admin, storefront, et même la couche server (BFF). Une seule source de vérité."
- title: "CI plus rapide"
  desc: "Cache de build par paquet. Modifier le storefront ne rebuild pas l'admin."
- title: "Onboarding"
  desc: "Un clone, un install, tout marche. Pas de matrice à 6 repos à synchroniser."
- title: "Versionning"
  desc: "Versions internes en workspace:* (toujours la version locale) ; releases publiques via Changesets."
:::

## Les pièges

:::callout{type="warn"}
- **Mettre TOUT en monorepo** — si une équipe / un produit n'a aucune intersection avec le reste, c'est juste du bruit dans le graphe. Sépare quand il n'y a pas de partage.
- **Tasks circulaires** — `A dépend de B qui dépend de A`. Turbo/Nx s'en plaignent ; règle au plus tôt.
- **Pas d'enforcement de boundaries** — sans règles ESLint, n'importe quel fichier peut importer n'importe quoi. Le monorepo devient un gros sac de spaghetti.
- **Versions npm fixes entre packages** — utilise `workspace:*` (ou Nx publishes auto) pour que les packages internes pointent toujours sur la version locale, pas une version figée du registry.
- **Confondre monorepo et monolithe** — un monorepo peut contenir 5 apps indépendantes. Elles ne deviennent pas un monolithe juste parce qu'elles partagent un repo.
:::

## Par où commencer

1. **`pnpm init` à la racine** + `pnpm-workspace.yaml`
2. Déplace ce qui est partagé dans `packages/` (design-system, types, http client)
3. Référence par le nom du package, pas par chemin relatif
4. Ajoute Turbo quand le CI commence à râler (~30s+ sur des builds)
5. Passe à Nx si tu veux des générateurs, boundaries strictes, et que tu as 5+ apps

À éviter : reprendre une codebase en silos pour la **forcer** en monorepo le jour 1. Migre par paquets — extrais d'abord ce qui est partagé, le reste suit.

## À retenir

:::cheatsheet
- title: "pnpm workspaces"
  desc: "La base. Un seul install, packages internes auto-liés, PR atomiques."
- title: "Turborepo"
  desc: "Cache de build + pipeline déclarée. Quand le CI prend trop de temps."
- title: "Nx"
  desc: "Plus opinionated : générateurs, boundaries ESLint, graphe explicite. Au-delà de 4 apps."
- title: "Refactor atomique"
  desc: "Modifier un type partagé propage à toutes les apps dans la même PR."
- title: "Boundaries ESLint"
  desc: "Empêche un paquet d'importer un autre qu'il ne devrait pas voir."
- title: "Versions workspace:*"
  desc: "Les packages internes pointent toujours sur la version locale, jamais sur le registry."
:::
