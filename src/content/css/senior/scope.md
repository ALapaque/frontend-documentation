---
title: "@scope : styliser sans fuite"
slug: "scope"
framework: "css"
level: "senior"
order: 8
duration: 15
prerequisites: ["cascade-layers", "has-nesting"]
updated: 2026-07-09
seoTitle: "CSS @scope — styliser un sous-arbre sans fuite ni sélecteurs à rallonge"
seoDescription: "@scope limite des règles à un sous-arbre du DOM : racine et borne (donut scoping), la nouvelle proximité de la cascade, :scope, et pourquoi ça remplace les conventions BEM et le CSS-in-JS pour l'isolation, sans Shadow DOM."
ogVariant: "gold"
related:
  - { framework: "css", slug: "cascade-layers" }
  - { framework: "css", slug: "custom-properties" }
---

Isoler le CSS d'un composant pour qu'il ne fuite pas — ni ne subisse la fuite des
autres — est un problème vieux comme le CSS. On y a répondu par des conventions de
nommage (BEM), le CSS-in-JS et ses classes hachées, le Shadow DOM et sa frontière
étanche : autant d'abstractions pour un manque du langage. `@scope` y répond nativement,
**dans la cascade** — tu déclares un sous-arbre du DOM et tes règles n'en débordent pas.

## La syntaxe de base

`@scope (<sélecteur racine>)` limite les règles qu'il contient au sous-arbre dont la
racine correspond au sélecteur.

```css
@scope (.card) {
  img { border-radius: 8px; }
  h2  { font-size: 1.25rem; }
}
```

Le `img` et le `h2` ne sont stylés **que** s'ils descendent d'un `.card` ; un `img`
ailleurs est intact. Tu n'écris plus `.card img` sur chaque règle pour te protéger d'un
débordement : tu déclares la racine une fois, tous les sélecteurs à l'intérieur héritent
de cette frontière.

## Donut scoping : inclure la racine, exclure un sous-arbre

La vraie puissance arrive avec la borne basse, introduite par `to` :

```css
@scope (.card) to (.card__content) {
  a { color: var(--brand); }
}
```

Les règles s'appliquent depuis `.card` **et s'arrêtent avant** `.card__content`.
Entre les deux, on dessine un « donut » : la racine est le contour, la borne creuse le
trou. La borne haute est **inclusive**, la borne basse **exclusive** (ajoute `> *` à
l'une ou l'autre pour inverser cette inclusivité).

**Pourquoi ce trou.** Un composant contient souvent une zone à contenu arbitraire : un
slot, de la prose Markdown, un composant enfant rendu par une autre équipe. Sans donut,
`@scope (.card) a { … }` recolorerait aussi les liens de ce composant imbriqué dans
`.card__content` — la fuite qu'on veut éviter. La borne basse dit « à partir d'ici, ce
n'est plus mon territoire » : le seul mécanisme CSS pour « ce sous-arbre, sauf celui-là ».

## `:scope` et les scopes implicites

À l'intérieur d'un bloc, `:scope` désigne **la racine elle-même**, pas ses descendants.

```css
@scope (.card) {
  :scope { padding: 1rem; box-shadow: var(--elev-1); }
  img    { width: 100%; }
}
```

Tu peux aussi omettre le prélude et écrire `@scope { … }` dans un `<style>` inline : le
scope prend pour racine **le parent du `<style>`**. Pratique pour un fragment rendu côté
serveur qui embarque son style, sans jamais nommer de classe.

```html
<section class="hero">
  <style>
    @scope {
      h1 { font-size: clamp(2rem, 5vw, 4rem); }
    }
  </style>
  <!-- le h1 d'ici est stylé, pas ceux d'ailleurs -->
</section>
```

## La proximité : un nouveau critère de cascade

C'est la partie neuve et subtile. `@scope` ajoute un départage inédit dans la cascade :
la **proximité de scope**. À spécificité égale, la règle dont la racine de scope est **la
plus proche** de l'élément (le moins de sauts vers le haut dans le DOM) l'emporte.

:::compare
::bad
```css
/* thèmes imbriqués sans @scope : à spécificité égale (0,1,1),
   c'est l'ORDRE d'apparition qui tranche — la dernière gagne */
.theme-dark  a { color: white; }
.theme-light a { color: black; }
/* un lien dans .theme-light IMBRIQUÉ dans .theme-dark reste blanc : faux */
```
::
::good
```css
@scope (.theme-dark)  { a { color: white; } }
@scope (.theme-light) { a { color: black; } }
/* le lien prend la couleur du thème le plus PROCHE de lui : correct */
```
::
:::

**Pourquoi c'est décisif.** Sans `@scope`, deux sélecteurs de même spécificité tombent
sur l'ordre d'apparition : le dernier déclaré gagne, quel que soit le thème qui entoure
réellement le lien — faux pour des thèmes imbriqués. `@scope` insère la proximité **juste
au-dessus** de cet ordre : le moteur compte les sauts DOM jusqu'à chaque racine et fait
gagner la plus proche. Le comportement attendu devient le défaut.

## Ce que `@scope` ne fait PAS à la spécificité

Piège de senior : le scope **n'ajoute aucun poids** au sélecteur cible. Un sélecteur nu
se comporte comme si `:where(:scope)` le précédait — spécificité nulle.

```css
@scope (.article) {
  a { color: teal; }   /* spécificité (0,0,1) — comme un `a` global */
}
.sidebar a { color: red; } /* (0,1,1) : gagne, il est plus spécifique */
```

C'est voulu : `@scope` sert l'**isolation**, pas la victoire de force. Tu restes
surchargeable proprement, à l'opposé de la spirale `.card .card__body .card__title` qui
alourdit le poids à chaque niveau.

:::callout{type="warn"}
Exception : `:scope` **explicite** ajoute une spécificité de classe (0,1,0), car c'est
une pseudo-classe. `:scope img` pèse donc (0,1,1), pas (0,0,1) — évite `:scope` en
préfixe réflexe sur chaque règle, sinon tu réintroduis le poids que le scope t'épargne.
:::

Dans l'ordre global, la proximité se range **sous** la spécificité et les cascade layers
(importance › couches › spécificité › **proximité** › ordre). `@scope` et `@layer` sont
donc complémentaires : les couches arbitrent *entre familles de styles*, le scope *entre
instances imbriquées d'un même composant*.

## Quand l'utiliser (et quand non)

`@scope` n'efface pas le Shadow DOM. Sa frontière est **une frontière de sélecteurs**,
pas d'encapsulation : les custom properties, `color`, `font` la traversent, et le CSS
global du document peut encore cibler l'intérieur.

:::callout{type="info"}
- **`@scope`** : isoler le CSS d'un composant *dans le document*, sans build ni runtime,
  proximité en prime. Le bon défaut pour un design system en CSS natif.
- **Shadow DOM** : encapsulation *dure* (styles ET DOM) pour un web component qui doit
  résister au CSS de la page hôte. Plus lourd, coupe l'héritage.
- **Conventions (BEM) / CSS-in-JS** : ce que `@scope` remplace pour l'isolation — fini
  le préfixe manuel et la classe hachée juste pour éviter les collisions.
:::

**Support 2026.** `@scope` est **Baseline** : Chrome 118, Safari 17.4 et Firefox 146
(décembre 2025, qui a fait basculer l'at-rule dans Baseline) le gèrent. Prudence sur la
longue traîne — Safari 17.3 et antérieurs (donc iOS 17.3) l'ignorent ; un `@scope` non
reconnu étant sauté, prévois un fallback non scopé pour ces cibles.

## À retenir

`@scope` apporte l'isolation qui manquait au CSS natif : une racine délimite un
sous-arbre, une borne y creuse un donut, la proximité résout les composants imbriqués —
sans ajouter de spécificité ni de build. Couplé aux cascade layers, c'est le socle d'un
CSS où l'intention prime sur les hacks.

:::cheatsheet
- title: "@scope (.card) { … }"
  desc: "Limite les règles au sous-arbre de racine .card. Rien ne fuit dehors."
- title: "to (.limit)"
  desc: "Donut : borne basse. Racine incluse, sous-arbre de .limit exclu."
- title: ":scope"
  desc: "Cible la racine elle-même. Attention : ajoute une spécificité (0,1,0)."
- title: "Zéro spécificité"
  desc: "Un sélecteur nu = :where(:scope) devant. Le scope n'alourdit pas le poids."
- title: "Proximité"
  desc: "Nouveau critère : à spécificité égale, la racine la plus proche gagne. Sous spécificité, sur l'ordre."
- title: "Baseline 2026"
  desc: "Chrome 118, Safari 17.4, Firefox 146. Fallback pour la longue traîne < Safari 17.4."
:::
