---
title: ":has() et l'imbrication native"
slug: "has-nesting"
framework: "css"
level: "senior"
order: 5
duration: 14
prerequisites: ["selectors"]
updated: 2026-05-23
seoTitle: "CSS — :has(), le sélecteur parent, et l'imbrication native (&)"
seoDescription: ":has() le sélecteur parent qui n'est pas coûteux, form:has(:invalid), :has() quantité/relation, l'imbrication native CSS avec &, la différence avec Sass et les pièges de spécificité."
ogVariant: "crimson"
related:
  - { framework: "css", slug: "selectors" }
---

## Le sélecteur parent qu'on attendait depuis 20 ans

`:has()` répond à la question qui manquait au CSS : « styler un élément **en fonction
de ce qu'il contient** ». Jusqu'ici la cascade ne descendait que vers le bas — on
ciblait des descendants, jamais des ancêtres. `:has()` renverse ça : `A:has(B)`
sélectionne tout `A` qui possède un `B` correspondant.

```css
/* la carte qui contient une image bascule en mode média */
.card:has(img) {
  grid-template-rows: auto 1fr;
}

/* le formulaire qui contient un champ invalide s'allume en rouge */
form:has(:invalid) {
  border-color: var(--danger);
}
```

Le crochet mental à corriger : `:has()` ne décrit pas l'élément lui-même, il décrit
une **condition sur sa descendance**. `.card:has(img)` reste un sélecteur de `.card`
— `img` est seulement le test. La spécificité et la cible finale portent sur `.card`.

:::callout{type="tip"}
`:has()` n'est pas réservé aux descendants. À l'intérieur, on peut utiliser les
combinateurs **relatifs au sujet** : `h2:has(+ p)` (un `h2` suivi d'un `p`),
`label:has(~ input:focus)` (un label dont un frère ultérieur a le focus). Le `+`
et le `~` partent de l'élément sujet, pas de la racine.
:::

## Non, ce n'est plus coûteux

La réputation de lenteur vient des premières specs où `:has()` était jugé
incalculable en temps réel. Les moteurs actuels (Blink, WebKit, Gecko) ont résolu ça
avec de l'**invalidation ciblée** : le navigateur ne réévalue pas tout l'arbre à
chaque mutation, il marque les ancêtres susceptibles d'être affectés par un
`:has()` et ne recalcule que ceux-là. En pratique, un `:has()` raisonnable coûte le
prix d'un sélecteur normal.

:::compare
::bad
```css
/* large et profond : chaque mutation DOM dans le body
   force le moteur à reconsidérer la racine */
:root:has(.modal-open) body {
  overflow: hidden;
}
```
::
::good
```css
/* la condition est ancrée près de l'élément ciblé :
   l'invalidation reste locale et rapide */
body:has(dialog[open]) {
  overflow: hidden;
}
```
::
:::

**Pourquoi.** L'invalidation de `:has()` fonctionne par **propagation vers le haut** :
quand un nœud change, le moteur remonte la chaîne d'ancêtres pour invalider ceux qui
ont une règle `:has()` les concernant. Plus le sujet du `:has()` est haut (comme
`:root`) et plus le contenu testé est profond et changeant, plus la zone à
re-vérifier est vaste. Ancrer le `:has()` sur un sujet **proche** du déclencheur
(`body:has(dialog[open])` au lieu de `:root:has(...)`) garde le périmètre
d'invalidation petit. Le coût n'est pas dans `:has()` en soi, mais dans la taille du
sous-arbre qu'une mutation oblige à reconsidérer.

## Quantité et relation

Combiné à `:nth-child` et aux fonctionnelles, `:has()` exprime des conditions de
quantité ou de relation entre frères — impossible auparavant sans JS.

```css
/* une galerie qui a au moins 4 enfants passe en grille dense */
.gallery:has(> :nth-child(4)) {
  grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
}

/* griser un fieldset dont AUCUNE option n'est cochée */
fieldset:not(:has(input:checked)) {
  opacity: 0.6;
}
```

`:has()` accepte une **liste tolérante** (`:has(a, b)` = « contient a ou b »), et se
combine avec `:not()` pour exprimer l'absence. C'est là que se trouve sa vraie
puissance : décrire un état d'interface (un onglet sans contenu, un panier vide, un
form en erreur) directement en CSS.

## L'imbrication native : `&` et les règles imbriquées

Le CSS imbrique désormais nativement les règles, sans préprocesseur. Une règle
enfant écrite à l'intérieur d'une règle parente cible les éléments correspondants
dans le **contexte** du parent. L'esperluette `&` représente explicitement le
sélecteur parent.

```css
.card {
  padding: 1rem;

  & h3 { margin: 0; }          /* .card h3 */
  &:hover { box-shadow: ...; } /* .card:hover, & collé = même élément */

  .is-dark & {                 /* .is-dark .card, & déplacé à droite */
    background: #111;
  }

  @media (min-width: 40rem) {  /* les at-rules s'imbriquent aussi */
    padding: 2rem;
  }
}
```

Deux usages distincts du `&` : **collé** à un sélecteur (`&:hover`) il vise le même
élément ; **déplacé** ailleurs (`.is-dark &`) il réécrit le contexte. Sans `&`
devant un sélecteur de type, le navigateur insère un descendant implicite (`h3`
devient `.card h3`).

## La différence avec Sass : ce n'est pas du sucre

L'imbrication native ressemble à Sass mais ne se compile pas — elle vit dans le
moteur, ce qui change deux choses.

:::compare
::bad
```css
/* habitude Sass : concaténer pour fabriquer une classe.
   En CSS natif, & est un sélecteur, pas une chaîne de texte */
.btn {
  &--primary { background: blue; } /* invalide : pas de .btn--primary */
}
```
::
::good
```css
/* le & natif ne fait JAMAIS de concaténation de string.
   On écrit le sélecteur complet, ou on imbrique un vrai sélecteur */
.btn {
  &.btn--primary { background: blue; } /* .btn.btn--primary */
}
.btn--primary { background: blue; }    /* ou en dehors, à plat */
```
::
:::

**Pourquoi.** Sass traite `&` comme une **interpolation textuelle** au moment de la
compilation : `&--primary` colle littéralement les caractères pour produire la chaîne
`.btn--primary`. Le `&` natif n'est pas du texte, c'est une **référence runtime au
sélecteur parent** résolue par le moteur — il ne peut pas fusionner avec un suffixe
pour inventer un nouveau nom de classe. `&--primary` est donc interprété comme « le
parent suivi du type d'élément `--primary` », ce qui n'existe pas. La règle : en CSS
natif, `&` ne se concatène jamais ; il ne fait que se combiner avec des sélecteurs
valides.

:::cheatsheet
- title: ":has(B)"
  desc: "Sélectionne l'élément sujet qui contient un B correspondant (sélecteur parent)."
- title: "A:has(> B)"
  desc: "Enfant direct ; `:has(+ B)` frère adjacent ; `:has(~ B)` frère ultérieur."
- title: ":not(:has(...))"
  desc: "Condition d'absence : « n'a aucun élément correspondant »."
- title: "&"
  desc: "Référence runtime au sélecteur parent. Collé = même élément, déplacé = contexte."
- title: "& type"
  desc: "Un type/classe imbriqué sans & devant devient un descendant implicite."
- title: "Specificité"
  desc: "`:has()` et l'imbrication prennent la specificité de leur argument le plus fort."
:::

## Le piège de la spécificité

`:has()`, `:is()` et l'imbrication partagent une règle qui surprend : leur
spécificité est celle de leur **argument le plus spécifique**.

```css
/* spécificité = celle de #hero, soit (1,0,0) — bien plus que prévu */
.card:has(#hero) { color: red; }

/* l'imbrication équivaut à :is() : la specificité du groupe
   est tirée vers le haut par le sélecteur le plus fort */
.menu {
  & a, & #logo { color: blue; } /* le 'a' hérite du poids de #logo */
}
```

**Le mécanisme.** `:has()` et l'imbrication calculent leur spécificité comme `:is()` :
on prend la liste d'arguments et on retient la spécificité **du membre le plus
spécifique**, pas une moyenne ni la somme. Glisser un `#id` dans un `:has()` ou dans
une liste imbriquée propage donc un poids d'ID à toute la règle, y compris aux
sélecteurs simples voisins. Si tu veux neutraliser cet effet, enveloppe l'argument
dans `:where(...)`, dont la spécificité est toujours zéro — `.card:has(:where(#hero))`
contient juste sur la présence de `#hero` sans en payer le poids. C'est l'outil de
contrôle indispensable dès qu'on mélange `:has()` et architecture de cascade.
