---
title: "React Compiler"
slug: "compiler"
framework: "react"
level: "senior"
order: 3
duration: 18
prerequisites: ["memo-callback"]
updated: 2026-09-24
seoTitle: "React Compiler — ce qu'il optimise vraiment"
seoDescription: "Le React Compiler expliqué : mémoïsation automatique, ce qu'il faut encore écrire, ses limites, et le portage en Rust (oxc-transform-react) qui le rend plus de 10x plus rapide que la version Babel."
ogVariant: "crimson"
related:
  - { framework: "vue", slug: "vapor-mode" }
  - { framework: "angular", slug: "change-detection" }
---

## La fin du useMemo manuel

Le React Compiler analyse ton code au build et insère la mémoïsation à ta place.
Tu écris du code naïf ; il en déduit quelles valeurs et fonctions peuvent être
réutilisées entre les rendus.

:::compare
::bad
```tsx
// avant : mémoïsation manuelle, verbeuse et faillible
const sorted = useMemo(() => sort(items), [items]);
const onClick = useCallback(() => select(id), [id]);
```
::
::good
```tsx
// avec le compilateur : tu écris ça, il optimise
const sorted = sort(items);
const onClick = () => select(id);
```
::
:::

**Pourquoi** : la mémoïsation manuelle est faillible — un tableau de dépendances incomplet sert une valeur périmée, un tableau trop large annule le gain. Le compilateur analyse le flux de données réel au build et insère la mémoïsation avec des dépendances exactes, sans verbosité ni risque de désynchronisation entre le calcul et ses `deps`.

## Ce qu'il faut encore respecter

Le compilateur **suppose** que ton code suit les règles de React : composants
purs, pas de mutation des props/état, hooks au top level. Il ne corrige pas du
code impur — il optimise du code correct.

## Le portage en Rust : assez rapide pour rester allumé

Le frein à l'adoption n'était pas la correction du compilateur mais son **coût de
build** : écrit pour Babel, il ajoutait un passage lourd sur chaque fichier, au
point que beaucoup d'équipes le désactivaient en développement.

Meta a porté le compilateur en **Rust** courant 2026, distribué comme
`oxc-transform-react`. Les mesures publiées donnent **plus de 10× la vitesse de
la version Babel** — un fichier qui prenait ~100 ms tombe à ~10 ms — et un dépôt
React Router a relevé un gain d'environ **17×** sur la part compilateur de son
build.

```ts vite.config.ts
import react from '@vitejs/plugin-react';   // v6.1.0+

export default defineConfig({
  // oxc-transform-react est une peer dependency à installer
  plugins: [react({ compiler: true })],
});
```

Le plugin traite alors compilateur, JSX et Fast Refresh **en une seule passe**,
au lieu d'empiler les transformations.

:::callout{type="info"}
L'intérêt dépasse Vite : l'objectif affiché est que l'écosystème Rust — **SWC,
Bun, Biome, Oxc** — partage une implémentation unique du compilateur au lieu d'en
maintenir chacun une variante. Concrètement, le même comportement de mémoïsation
te suit d'un outil à l'autre.
:::

:::cheatsheet
- title: "Mémoïse pour toi"
  desc: "Valeurs dérivées, callbacks, et l'équivalent de memo() sur les composants."
- title: "Exige la pureté"
  desc: "Composants sans effet de bord pendant le rendu, props non mutées."
- title: "eslint-plugin-react-compiler"
  desc: "Signale le code que le compilateur ne peut pas optimiser sûrement."
- title: "Portage Rust"
  desc: "oxc-transform-react : >10x la vitesse de Babel. Vite : react({ compiler: true }) en v6.1.0+."
:::

### Idée reçue : « plus besoin de comprendre les re-renders »

Faux. Le compilateur réduit le travail manuel, mais déboguer une perf ou un bug
de dépendance exige toujours de savoir *pourquoi* un composant re-rend. L'outil
automatise l'application, pas la compréhension.

:::callout{type="tip"}
Stable depuis 2025 et activé par défaut dans les chaînes d'outils récentes, il
s'adopte fichier par fichier sur l'existant. Garde le lint dédié : le code qu'il
refuse d'optimiser viole souvent discrètement les règles de React — un bon
signal. Pour exclure ponctuellement un composant, la directive `'use no memo'`
en tête de fonction sert d'échappatoire (temporaire, le temps de corriger).
:::
