---
title: "Cascade layers et @scope"
slug: "cascade-layers"
framework: "css"
level: "senior"
order: 7
duration: 16
prerequisites: ["selectors", "has-nesting"]
updated: 2026-05-23
seoTitle: "CSS — @layer, cascade layers, @scope et le donut scoping"
seoDescription: "@layer pour dompter la cascade au-dessus de la spécificité : ordre des couches, reset/base/components/utilities, @import layer(), @scope et la proximité, et le piège de !important inversé dans les layers."
ogVariant: "crimson"
related:
  - { framework: "css", slug: "has-nesting" }
---

## Une priorité au-dessus de la spécificité

La cascade tranche les conflits dans cet ordre : origine et importance, **puis les
couches**, puis la spécificité, puis l'ordre d'apparition. Les **cascade layers**
(`@layer`) introduisent un palier *avant* la spécificité. Conséquence radicale : une
règle dans une couche prioritaire l'emporte sur une règle d'une couche inférieure
**même si cette dernière est bien plus spécifique**.

```css
/* l'ordre de déclaration des couches fixe leur priorité,
   de la plus faible à la plus forte */
@layer reset, base, components, utilities;

@layer components {
  #sidebar .btn { background: gray; } /* spécificité (1,1,0) */
}
@layer utilities {
  .bg-blue { background: blue; }       /* spécificité (0,1,0) */
}
```

Ici `.bg-blue` gagne contre `#sidebar .btn`, alors qu'il est bien moins spécifique.

**Pourquoi.** La spécificité ne départage que les règles **d'une même couche**. Entre
deux couches, le moteur compare d'abord leur rang : `utilities` ayant été déclaré
après `components`, il est plus prioritaire, et ce critère se résout *avant* qu'on
regarde la spécificité. C'est exactement le levier qu'on cherchait : on cesse de
gonfler les sélecteurs (`#sidebar .btn.btn.btn`) pour gagner une bataille de
spécificité ; on range simplement la règle dans la bonne couche.

:::callout{type="tip"}
Seul **le premier** `@layer reset, base, components, utilities;` compte pour fixer
l'ordre. Déclare cette liste tout en haut de ta feuille maîtresse : tu réserves les
rangs une fois pour toutes, et l'ordre ne dépend plus de qui charge son CSS en
premier. Les couches non listées s'ajoutent ensuite, à la fin, dans leur ordre
d'apparition.

Le CSS **non-layered** (hors de toute couche) est traité comme s'il formait une
couche implicite **plus prioritaire que toutes les couches nommées**.
:::

## Pourquoi ça dompte enfin la cascade

L'architecture canonique reset / base / components / utilities devient déclarative.
Chaque famille de styles a un rang fixe, et on n'a plus jamais à deviner « est-ce que
ma classe utilitaire va battre le composant ? ».

:::compare
::bad
```css
/* sans couches : pour qu'une utilitaire batte un composant,
   on surenchérit la spécificité — guerre des !important */
.card .title { color: var(--ink); }
.text-muted   { color: gray !important; } /* sinon .card .title gagne */
```
::
::good
```css
@layer components, utilities;

@layer components {
  .card .title { color: var(--ink); } /* (0,2,0) */
}
@layer utilities {
  .text-muted { color: gray; }        /* (0,1,0) mais couche supérieure */
}
```
::
:::

**Pourquoi.** Dans le cas sans couches, `.card .title` a une spécificité (0,2,0)
supérieure à `.text-muted` (0,1,0) : l'utilitaire perd, sauf à dégainer
`!important`, qui contamine ensuite tout le projet. Avec les couches, `utilities` est
déclaré après `components`, donc **plus prioritaire** — la comparaison de couche
tranche avant la spécificité, et `.text-muted` gagne *sans* surenchère ni
`!important`. Les utilitaires redeviennent ce qu'ils doivent être : des surcharges
fiables, à un seul niveau de classe.

## `@import` avec `layer()`

On peut ranger une feuille entière dans une couche au moment de l'import — idéal pour
neutraliser un framework tiers en le confinant à un rang bas.

```css
/* tout Bootstrap atterrit dans la couche 'vendor', en bas de pile */
@import url("bootstrap.css") layer(vendor);

@layer vendor, components, utilities; /* vendor passera toujours après */
```

`layer(vendor)` enferme la feuille importée dans la couche nommée. Comme `vendor` est
déclaré en premier, **tout** ton code maison (rangé dans des couches ultérieures)
domine le framework sans avoir à lutter contre sa spécificité interne. C'est la fin
des overrides à coups de `!important` sur du CSS tiers.

## `@scope` : le donut scoping et la proximité

`@scope` limite des règles à un sous-arbre, avec une **racine** et une **limite**
optionnelle (`to`). Entre les deux, on obtient un « donut » : la racine est incluse,
tout ce qui est sous la limite est exclu.

```css
@scope (.card) to (.card__footer) {
  /* s'applique dans .card MAIS s'arrête avant .card__footer */
  a { color: var(--brand); }
  :scope { padding: 1rem; } /* :scope = la racine .card elle-même */
}
```

`@scope` apporte aussi la **proximité de scope**, un critère de cascade inédit : à
spécificité égale, la règle dont la racine de scope est **la plus proche** dans
l'arbre l'emporte.

:::compare
::bad
```css
/* thèmes imbriqués : à spécificité égale, c'est l'ORDRE
   de déclaration qui tranche — pas la proximité voulue */
.theme-dark a  { color: white; }
.theme-light a { color: black; }
/* un lien dans .theme-light DANS .theme-dark devient blanc */
```
::
::good
```css
@scope (.theme-dark)  { a { color: white; } }
@scope (.theme-light) { a { color: black; } }
/* le lien prend la couleur du thème le plus PROCHE de lui */
```
::
:::

**Pourquoi.** Sans `@scope`, deux règles de même spécificité (0,1,1) sont départagées
par l'**ordre d'apparition** : la dernière déclarée gagne, quel que soit le thème
réellement le plus proche de l'élément. C'est faux pour des thèmes imbriqués. `@scope`
ajoute la **proximité** comme critère de cascade, évalué juste avant l'ordre
d'apparition : le moteur mesure la distance entre l'élément et chaque racine de scope,
et fait gagner la racine la plus proche. Le lien prend donc la couleur du thème qui
l'entoure le plus directement — comportement attendu, impossible à obtenir
proprement à la spécificité seule.

## Le piège : `!important` est inversé dans les couches

`@layer` réserve une surprise. Pour les déclarations **normales**, la couche déclarée
en dernier gagne. Pour les déclarations **`!important`**, l'ordre des couches est
**inversé** : c'est la couche la plus *basse* qui l'emporte.

```css
@layer base, theme; /* theme > base en normal */

@layer base  { a { color: red !important; } }
@layer theme { a { color: blue !important; } }
/* le lien est ROUGE : en !important, base (déclaré en premier) gagne */
```

**Pourquoi.** L'importance se résout *avant* l'ordre des couches dans la cascade, et
elle **renverse** la comparaison de couche. L'intention : une couche fondamentale
(un reset, un thème système, des contraintes d'accessibilité) doit pouvoir poser un
verrou que les couches supérieures ne peuvent pas casser. En normal, `theme` domine
`base` ; mais dès qu'on passe en `!important`, la hiérarchie s'inverse pour que
`base` garde le dernier mot. Retiens-le comme une règle de sécurité : `!important`
dans une couche basse devient quasi inviolable — d'où l'importance de ne s'en servir
que pour des invariants délibérés.

:::cheatsheet
- title: "@layer a, b, c;"
  desc: "Déclare l'ordre des couches : a faible … c forte. Le premier en haut fait foi."
- title: "Couche > spécificité"
  desc: "Entre couches, le rang tranche avant la spécificité."
- title: "Non-layered"
  desc: "Le CSS hors couche bat toutes les couches nommées (normal)."
- title: "@import layer(x)"
  desc: "Confine une feuille importée dans la couche x (idéal pour le vendor)."
- title: "@scope (root) to (limit)"
  desc: "Donut : applique sous root, exclut à partir de limit. `:scope` = la racine."
- title: "Proximité"
  desc: "Critère de cascade de @scope : la racine la plus proche gagne à spécificité égale."
- title: "!important inversé"
  desc: "En !important, c'est la couche la PLUS BASSE qui l'emporte."
:::

## Migrer sans tout réécrire

Pas besoin de big bang. Enferme d'abord le legacy et le vendor dans des couches
basses (`@layer legacy;`, `@import ... layer(vendor)`), puis introduis tes nouvelles
familles (`base`, `components`, `utilities`) dans des couches supérieures. Le code
non encore migré reste *non-layered*, donc prioritaire — ce qui te garantit que rien
ne casse pendant que tu déplaces progressivement les fichiers dans leurs couches.

:::callout{type="info"}
`@layer`, `@import layer()` et `@scope` (avec sa proximité) sont **baseline** sur les
navigateurs evergreen en 2026. Tu peux fonder l'architecture de cascade d'un design
system entier dessus sans polyfill. Combiné aux container queries et à `:has()`,
c'est le socle d'un CSS où l'intention prime enfin sur les hacks de spécificité.
:::
