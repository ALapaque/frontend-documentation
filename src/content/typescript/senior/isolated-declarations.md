---
title: "isolatedDeclarations : des .d.ts en parallèle"
slug: "isolated-declarations"
framework: "typescript"
level: "senior"
order: 10
duration: 14
prerequisites: ["declaration-files"]
updated: 2026-07-09
seoTitle: "TypeScript isolatedDeclarations — générer les .d.ts vite et en parallèle"
seoDescription: "isolatedDeclarations impose des types de retour explicites pour rendre la génération des fichiers de déclaration purement locale : chaque fichier produit son .d.ts sans analyser le reste du projet, ce qui débloque une génération parallèle et des outils non-tsc."
ogVariant: "iris"
related:
  - { framework: "typescript", slug: "declaration-files" }
  - { framework: "typescript", slug: "tsconfig-strict" }
---

Générer les `.d.ts` d'un paquet, c'est demander à `tsc` d'**inférer** le type de
retour de chaque export. Or pour inférer un retour, le compilateur doit remonter
tout ce que la fonction appelle : d'autres modules, d'autres paquets, parfois le
graphe entier du monorepo. La génération de déclarations devient donc lente,
séquentielle, et surtout **impossible** pour un outil qui ne réimplémente pas tout
le vérificateur. `isolatedDeclarations` casse ce nœud : il rend la production de
`.d.ts` **purement locale**, calculable fichier par fichier.

## Le problème : inférer un retour exige tout le graphe

Un `.d.ts` ne décrit que l'**API publique** d'un module : la forme de ce qu'il
exporte. Sans annotation, cette forme n'existe nulle part telle quelle — le
compilateur doit la **reconstruire** en analysant l'implémentation, qui dépend
d'autres fichiers, qui dépendent d'autres paquets.

```ts
import { loadUser } from "./db";        // dans un autre paquet

// Aucun type de retour écrit : tsc doit inférer.
// Pour cela il lui faut le type de loadUser, donc résoudre ./db,
// donc éventuellement tout le graphe amont.
export function getProfile(id: string) {
  const user = loadUser(id);
  return { name: user.name, since: user.createdAt };
}
```

Dans un monorepo, l'effet est un **goulot d'étranglement** : le paquet `ui`
n'émet ses déclarations qu'après que `core` a résolu les siennes, qui attendent
`utils`, etc. La génération de types se sérialise le long du graphe de
dépendances — huit minutes de build de types ne sont pas rares.

## La contrainte : annoter les frontières publiques

`isolatedDeclarations: true` (arrivé dans TypeScript 5.5) impose une règle
simple : **tout ce qui est exporté doit avoir un type explicite**. Un retour de
fonction publique, une variable exportée, une propriété de classe publique — plus
aucune inférence tolérée **à la frontière du module**. À l'intérieur des corps,
l'inférence reste entière : la contrainte ne touche que ce qui traverse la
frontière.

:::compare
::bad
```ts
// isolatedDeclarations: true
export function getProfile(id: string) {
  return { name: "Ada", since: Date.now() };
}
// TS9007: Function must have an explicit return type annotation
//         with --isolatedDeclarations.
```
::
::good
```ts
// isolatedDeclarations: true
interface Profile {
  name: string;
  since: number;
}

export function getProfile(id: string): Profile {
  const name = pickName(id);   // inférence libre DANS le corps
  return { name, since: Date.now() };
}
```
::
:::

**Pourquoi.** Une fois le retour écrit `: Profile`, produire la déclaration ne
demande plus de lire `pickName`, ni `./db`, ni quoi que ce soit d'externe. La
signature publique est **écrite noir sur blanc dans le fichier**. Le `.d.ts` se
recopie depuis le source, il ne se calcule plus.

## Le gain : chaque fichier produit son `.d.ts` seul

C'est là tout l'intérêt. Si aucune frontière n'exige d'inférence inter-fichiers,
générer le `.d.ts` d'un fichier ne lit **que ce fichier**. La génération devient
donc **parallélisable** : mille fichiers, mille tâches indépendantes, dans
n'importe quel ordre, sur tous les cœurs. Et — le plus spectaculaire — elle n'a
plus besoin du **vérificateur de types** : émettre un `.d.ts` se réduit à du
*syntax stripping* (lire le source, effacer les corps, garder les signatures).
Un outil qui ne sait même pas résoudre un import peut le faire.

:::callout{type="info"}
Des générateurs tiers exploitent exactement ça. La transformation
`isolatedDeclarations` d'**oxc** (paquet `oxc-transform`), écrite en Rust, produit
un `.d.ts` par simple analyse syntaxique, sans vérificateur, en un temps proche de
zéro ; **tsdown** (bâti sur Rolldown/oxc) s'en sert pour émettre les déclarations
d'une bibliothèque à la vitesse d'un bundler natif. `tsc` reste une option (avec
`declaration: true`), mais il n'est plus le **seul** capable.
:::

## Le pourquoi côté build : découpler types et vérification

L'idée de fond est un **découplage**. Historiquement, générer les `.d.ts` et
vérifier les types étaient la même passe : tsc inférait tout, autant en sortir
les déclarations au passage. `isolatedDeclarations` sépare les deux
responsabilités.

- La **génération** devient une tâche mécanique et locale, confiée à l'outil le
  plus véloce (oxc, tsdown), parallélisée sans contrainte d'ordre.
- La **vérification** (qui a toujours besoin du graphe global) reste le travail
  de tsc, lancé une seule fois à la racine du monorepo, pas une fois par paquet.

```json
{
  "compilerOptions": {
    "declaration": true,
    "isolatedDeclarations": true,
    "emitDeclarationOnly": true
  }
}
```

Dans un pipeline de monorepo, les paquets n'ont plus à s'attendre pour publier
leurs types : la génération passe de plusieurs minutes séquentielles à quelques
dizaines de secondes en parallèle, pendant que le type-check global tourne à côté
sans rien bloquer.

## Le coût : plus d'annotations, adoption progressive

La contrepartie est réelle : il faut **écrire** les types de retour que tsc
devinait pour toi, et l'activation brutale fait surgir des centaines d'erreurs
`TS9007` d'un coup. Mais ce coût se rembourse vite : ces annotations
**documentent l'API publique** de façon stable et accélèrent aussi le type-check
normal, puisqu'un retour explicite évite au vérificateur de le recalculer à
chaque usage. Un retour annoté est un point d'ancrage, pas seulement une
contrainte.

:::callout{type="tip"}
Adopte par paquet, pas d'un bloc. Active `isolatedDeclarations` d'abord sur les
bibliothèques que tu **publies** (celles dont les `.d.ts` comptent le plus). Un
codemod comme le mode `--fix` d'oxc infère et écrit une grande partie des
annotations manquantes ; il reste à relire les cas où l'inférence était trop
large.
:::

:::callout{type="warn"}
`isolatedDeclarations` ne **remplace pas** la vérification de types. Il garantit
que les déclarations sont générables localement, pas que ton code est correct : il
faut toujours réexécuter un `tsc --noEmit` quelque part pour valider le graphe
complet. Ne confonds pas « mes `.d.ts` se génèrent vite » et « mon code
type-check ».
:::

## Frontières de paquet et documentation de l'API publique

Au fond, `isolatedDeclarations` formalise une bonne pratique que les auteurs de
bibliothèques appliquaient déjà à la main : **une frontière de paquet doit être
explicitement typée**. Ce que tu exposes au monde ne devrait jamais dépendre
d'une inférence qui dérive au moindre refactor interne. L'option aligne ainsi
trois objectifs : des `.d.ts` rapides à produire, une API publique stable, et une
frontière qui ne fuit pas ses détails d'implémentation. Un contrat écrit vaut
mieux qu'un contrat inféré — pour le lecteur humain comme pour l'outil de build.

## À retenir

La génération de déclarations par inférence force tsc à lire tout le graphe, ce
qui la rend lente et séquentielle. `isolatedDeclarations` exige des types
explicites aux frontières publiques pour rendre cette génération **purement
locale** : chaque fichier produit son `.d.ts` seul, en parallèle, même sans
vérificateur — d'où des outils natifs comme oxc et tsdown. Le prix : quelques
annotations de plus, qui documentent l'API et accélèrent aussi le check.

:::cheatsheet
- title: "isolatedDeclarations: true"
  desc: "Impose un type explicite sur tout export ; rend la génération des .d.ts locale à chaque fichier."
- title: "Le problème"
  desc: "Inférer un retour d'export oblige tsc à analyser tout le graphe amont : lent et séquentiel."
- title: "La contrainte"
  desc: "Retours de fonctions, variables et propriétés publiques doivent être annotés. Erreur TS9007 sinon."
- title: "Le gain"
  desc: "Un .d.ts par fichier, sans lire les autres → génération parallélisable, sans type checker."
- title: "Outils tiers"
  desc: "oxc / oxc-transform (Rust), tsdown, Rolldown émettent les .d.ts ; tsc reste une option, plus une obligation."
- title: "Monorepo"
  desc: "Les paquets n'attendent plus la résolution des autres pour publier leurs types : minutes → secondes."
- title: "Ne remplace pas le check"
  desc: "Réexécute toujours tsc --noEmit pour valider le graphe ; l'option ne garantit que la génération."
:::
