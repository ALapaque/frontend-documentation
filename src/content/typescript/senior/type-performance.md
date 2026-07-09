---
title: "Performance du typage : diagnostiquer tsc"
slug: "type-performance"
framework: "typescript"
level: "senior"
order: 11
duration: 16
prerequisites: ["conditional-types"]
updated: 2026-07-09
seoTitle: "Performance TypeScript — diagnostiquer et corriger un type-check lent"
seoDescription: "Quand tsc rame : mesurer avec --extendedDiagnostics et --generateTrace, repérer les types conditionnels et mappés qui explosent, préférer interface pour le cache, borner la récursivité. Rendre le type-check rapide, même avant TS 7."
ogVariant: "iris"
related:
  - { framework: "typescript", slug: "conditional-types" }
  - { framework: "typescript", slug: "mapped-types" }
---

Un type-check qui prend 40 s pourrit la DX : l'éditeur gèle sur chaque frappe, la
CI traîne. La cause tient rarement à la taille du code — le plus souvent, ce sont
quelques types trop « intelligents » qui font exploser le travail du compilateur.
Avant même d'attendre le compilateur natif (TS 7), tu peux mesurer où part le
temps et corriger l'algorithmique de tes types.

## Mesurer d'abord, jamais optimiser à l'aveugle

Le premier réflexe est faux : deviner. On réécrit un type qui « a l'air
compliqué » et coûtait 3 ms, pendant que le vrai coupable, ailleurs, en coûtait
8000. Commence par un chiffre.

```bash
tsc --noEmit --extendedDiagnostics
```

La commande liste le temps par phase et, surtout, deux compteurs qui comptent :

```
Types:                    182430
Instantiations:         12904531
Check time:                9.84s
Total time:               14.20s
```

**Pourquoi ces deux lignes.** Le temps de vérification suit à peu près le nombre
d'**instanciations** : chaque application d'un type générique à des arguments
concrets en crée une. Des millions sur un projet moyen, c'est le signe qu'un type
se ré-évalue en boucle. Note le chiffre, fais ta modif, réexécute : si les
instanciations chutent, tu as touché juste.

## Trouver les points chauds avec `--generateTrace`

`--extendedDiagnostics` donne le total. Pour savoir *quel fichier* et *quel type*
brûlent le budget, génère une trace.

```bash
# Produit trace.json et types.json dans out/
tsc --noEmit --generateTrace out/

# Analyse la trace et remonte les points chauds
npx @typescript/analyze-trace out/
```

`analyze-trace` sort une liste triée : les fichiers les plus lents à vérifier et
les types dont l'instanciation coûte le plus. Tu peux aussi ouvrir `trace.json`
dans `about://tracing` pour voir la timeline d'un `checkExpression` qui déraille.

:::callout{type="info"}
Un point chaud typique, c'est un `checkVariableDeclaration` à 4 s sur une ligne
anodine qui instancie un conditionnel géant importé trois fichiers plus loin.
Sans la trace, tu ne l'aurais jamais soupçonnée.
:::

## Les causes classiques d'explosion

Presque toute lenteur pathologique vient d'une poignée de patrons, tous variantes
d'un même défaut : un coût quadratique ré-évalué à chaque usage.

- **Conditionnels distribués** sur de grandes unions : `T extends U ? …` nu sur
  500 littéraux crée 500 branches imbriquées.
- **Types mappés profonds** : un `DeepPartial` récursif remappe tout l'arbre à
  chaque référence.
- **`infer` récursif non borné** : un parseur de template literal explose en
  profondeur d'instanciation.
- **Unions littérales géantes** : `` `${A}-${B}` `` matérialise le produit
  cartésien, 100 × 100 = 10 000 membres.

:::compare
::bad
```ts
// Cascade conditionnelle ré-évaluée pour CHAQUE clé de l'union,
// à chaque endroit où l'on écrit Handler<…>. Coût quadratique.
type Handler<E extends keyof Events> =
  E extends `${infer Domain}:${infer Action}`
    ? Domain extends keyof Registry
      ? (p: Registry[Domain][Action & keyof Registry[Domain]]) => void
      : never
    : never;
```
::
::good
```ts
// On matérialise UNE table indexée. Chaque Handler<E> devient
// une indexation O(1) — plus de cascade à dérouler.
type HandlerMap = { [E in keyof Events]: (p: Events[E]) => void };
type Handler<E extends keyof Events> = HandlerMap[E];
```
::
:::

**Pourquoi la droite gagne.** Le type mappé est calculé une fois ; ensuite
`HandlerMap[E]` est une lecture indexée mise en cache. La version de gauche
redéroule la logique conditionnelle à *chaque* usage, sans jamais réutiliser le
travail précédent.

## `interface` plutôt que `type` pour le cache

Ce n'est pas cosmétique. Le compilateur traite une `interface` comme un type
**nommé** : il la met en cache et compare deux interfaces par identité de
référence avant de descendre dans les champs.

```ts
// À éviter : type anonyme ré-aplati et re-comparé champ par champ à chaque usage.
type Props = BaseProps & LayoutProps & A11yProps & ThemeProps;

// Préférer : nommée, mise en cache, comparée par référence.
interface Props extends BaseProps, LayoutProps, A11yProps, ThemeProps {}
```

**Pourquoi.** Sur un gros objet référencé partout, la comparaison par référence
de `interface extends` évite des milliers de comparaisons structurelles. Réserve
`type` aux unions, tuples et calculs (conditionnels, mappés) — là où une
interface ne sait pas s'exprimer.

## Borner la récursivité et factoriser

Une récursion non bornée finit en `Type instantiation is excessively deep`, mais
bien avant l'erreur elle coûte cher. Deux leviers. D'abord, **borne la
profondeur** avec un accumulateur qui porte une condition de sortie :

```ts
// Sans garde-fou (Acc["length"] extends N), ceci part en vrille.
type Repeat<T, N extends number, Acc extends T[] = []> =
  Acc["length"] extends N ? Acc : Repeat<T, N, [...Acc, T]>;
```

Ensuite, **factorise les types intermédiaires**. Un sous-type nommé est calculé
et mis en cache une fois ; le même calcul inliné dans dix conditionnels est refait
dix fois.

## Annoter les frontières publiques

Chaque fois qu'une fonction exportée laisse TypeScript **inférer** son type de
retour, ce type est recalculé chez chaque consommateur. L'annoter transforme un
calcul répété en simple lecture.

:::callout{type="tip"}
Annote les types de retour des API publiques (fonctions exportées, hooks,
sélecteurs). Ça coupe la ré-inférence en cascade, stabilise les messages d'erreur
et documente le contrat. Dans le même esprit, découpe les gros fichiers de types :
un module de 3000 lignes force à tout recharger dès qu'une ligne change, là où des
modules courts limitent la surface recalculée à chaque édition.
:::

## Et le compilateur natif (TS 7) ?

Le portage natif de TypeScript (le compilateur en Go, cap sur TS 7.0) vise un
type-check environ 10× plus rapide. C'est énorme — mais c'est un gain sur le
**facteur constant**. Un type quadratique reste quadratique : le portage divise
le temps par un facteur fixe, il ne change pas la classe de complexité de tes
types.

:::callout{type="warn"}
N'attends pas TS 7 pour ignorer un type qui coûte 8 s : il coûtera peut-être
0,8 s au lieu de 8, mais un `DeepMerge` récursif sur une union géante restera le
point chaud du projet. Mesure et corrige aujourd'hui ; le natif viendra en bonus
par-dessus un code déjà sain.
:::

## À retenir

Ne devine jamais : `--extendedDiagnostics` donne le chiffre (instanciations),
`--generateTrace` + `analyze-trace` donnent le coupable. Les explosions viennent
presque toujours de conditionnels distribués, de types mappés profonds et de
récursions non bornées. Préfère `interface extends` aux grosses intersections,
factorise les types intermédiaires, annote les frontières. TS 7 accélérera tout,
mais ne te dispensera pas d'écrire des types au coût raisonnable.

:::cheatsheet
- title: "--extendedDiagnostics"
  desc: "Temps par phase + compteurs Types/Instantiations. Le point de départ."
- title: "--generateTrace out/"
  desc: "Produit trace.json + types.json ; analyse via npx @typescript/analyze-trace."
- title: "Instanciations = coût"
  desc: "Le temps de check suit le nombre d'instanciations. Fais-le chuter."
- title: "interface > intersection"
  desc: "interface extends se met en cache et se compare par référence."
- title: "Factoriser les types"
  desc: "Un type nommé est calculé une fois ; inliné, il est refait à chaque usage."
- title: "Borner la récursivité"
  desc: "Accumulateur + condition de sortie ; évite le produit cartésien des unions."
- title: "Annoter les retours publics"
  desc: "Coupe la ré-inférence en cascade chez les consommateurs."
- title: "TS 7 (natif)"
  desc: "~10× plus rapide, mais facteur constant : ton quadratique reste quadratique."
:::
