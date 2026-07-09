---
title: "Styliser les formulaires nativement"
slug: "modern-form-styling"
framework: "css"
level: "medior"
order: 8
duration: 15
prerequisites: ["selectors"]
updated: 2026-07-09
seoTitle: "Styliser les formulaires en CSS moderne — accent-color, field-sizing, select personnalisable"
seoDescription: "Enfin styliser les contrôles natifs sans les réécrire en JS : accent-color pour cases et radios, field-sizing pour des champs qui s'adaptent, et le <select> personnalisable (appearance: base-select, ::picker) qui remplace les combobox maison."
ogVariant: "gold"
related:
  - { framework: "css", slug: "selectors" }
  - { framework: "web", slug: "forms" }
---

Pendant vingt ans, styliser une case à cocher ou un `<select>` a voulu dire la
même chose : masquer le contrôle natif avec `appearance: none`, puis tout
reconstruire en `<div>` + JS + ARIA — en réécrivant gratuitement clavier, focus et
sémantique, et en semant des bugs d'accessibilité que le natif n'avait jamais eus.
Le CSS moderne renverse la logique : tu stylises les contrôles **natifs**
eux-mêmes, tout leur comportement restant câblé par le navigateur.

## Teinter les contrôles avec `accent-color`

Une case cochée, un bouton radio, une barre de `range`, une `<progress>` : leur
couleur d'accent vient du thème système. Une seule propriété la remplace, sur le
contrôle natif, sans le masquer.

```css
:root { accent-color: #7c3aed; }

input[type="range"] { accent-color: #ea580c; } /* ou par contrôle */
```

**Pourquoi c'est un gain.** Avant, recolorer une case cochée imposait de la cacher
et de dessiner une fausse case en `::before`, donc de recâbler `:checked`,
`:focus-visible` et le clic sur le `<label>`. `accent-color` garde la case
réelle : focus, coche et état indéterminé restent gérés par le navigateur, qui
ajuste même la coche en blanc ou noir selon la luminosité de ta teinte.

:::callout{type="tip"}
Ne fixe qu'`accent-color`, pas une couleur de premier plan concurrente : sinon tu
casses l'ajustement automatique du contraste de la coche.
:::

## Le curseur et la sélection

Deux propriétés cousines complètent les champs texte. `caret-color` colore le
curseur clignotant de saisie ; `::selection` habille le texte sélectionné.

```css
input, textarea { caret-color: #7c3aed; }

::selection { background: #7c3aed; color: white; }
```

Rien à masquer, rien à simuler : ce sont des primitives natives, gérées partout.

## Des champs qui grandissent : `field-sizing: content`

Un `<textarea>` qui s'agrandit à mesure qu'on tape a longtemps réclamé un script :
écouter `input`, mesurer le contenu via un élément fantôme, recalculer la hauteur
à chaque frappe. `field-sizing: content` remplace tout ça.

```css
textarea {
  field-sizing: content;
  min-height: 2lh;   /* plancher */
  max-height: 10lh;  /* plafond avant scroll */
}
```

Le contrôle dimensionne alors sa boîte sur son contenu réel. **Pourquoi c'est
mieux qu'un script :** aucune mesure JS, aucun reflow provoqué à la main, aucun
décalage d'une frappe de retard — le navigateur ajuste la taille dans le même
passage de layout que le rendu du texte.

## Le `<select>` enfin stylable nativement

C'est le gros morceau. Le `<select>` a toujours été le contrôle le plus rétif :
impossible de styliser sa liste déroulante, ses options, sa flèche. D'où
l'industrie entière de combobox maison. Le `<select>` personnalisable y met fin.

On active le rendu personnalisable avec `appearance: base-select`, à poser **à la
fois** sur le `<select>` et sur son picker :

```css
select,
::picker(select) { appearance: base-select; }
```

Le balisage s'enrichit : un `<button>` interne porte le `<selectedcontent>`, qui
reflète l'option choisie, et chaque `<option>` peut contenir du markup riche.

```html
<select>
  <button><selectedcontent></selectedcontent></button>
  <option value="fr">
    <span class="flag" aria-hidden="true">🇫🇷</span> <span>Français</span>
  </option>
  <option value="jp">
    <span class="flag" aria-hidden="true">🇯🇵</span> <span>日本語</span>
  </option>
</select>
```

Tu stylises ensuite chaque partie avec des pseudo-éléments dédiés :

```css
::picker(select) {                       /* la liste déroulante entière */
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 6px;
}
select::picker-icon { transition: rotate 200ms; } /* la flèche du bouton */
select:open::picker-icon { rotate: 180deg; }
option {                                 /* flex : drapeau + libellé */
  display: flex;
  gap: .6rem;
  padding: .5rem .75rem;
}
option:checked { font-weight: 600; }
option::checkmark { margin-left: auto; } /* la coche, dans le picker */
```

`<selectedcontent>` **clone** le contenu de l'`<option>` retenue dans le bouton
fermé. Tu peux y masquer une partie du markup — par exemple ne garder que le
libellé, sans le drapeau, une fois le choix fait : `selectedcontent .flag {
display: none; }`.

Et pourquoi tout ce détour vaut le coup :

:::compare
::bad
```html
<!-- combobox maison : sémantique et clavier à recâbler à la main -->
<div class="combo" role="combobox" aria-expanded="false"
     aria-haspopup="listbox" tabindex="0">Français</div>
<ul role="listbox" hidden>
  <li role="option" aria-selected="true">Français</li>
  <li role="option">日本語</li>
</ul>
<!-- + du JS : flèches, Échap, focus, clic extérieur, annonce
     lecteur d'écran, saisie au clavier pour filtrer... -->
```
::
::good
```html
<!-- <select> natif stylé : clavier, ARIA et tactile déjà câblés -->
<select>
  <button><selectedcontent></selectedcontent></button>
  <option>Français</option>
  <option>日本語</option>
</select>
```
::
:::

**Pourquoi.** La version maison te rend responsable de toute la mécanique offerte
gratuitement : rôles `combobox`/`listbox`, `aria-expanded`, navigation aux
flèches, `Échap`, retour du focus, fermeture au clic extérieur, annonce par le
lecteur d'écran, saisie de la première lettre. Un seul de ces fils mal branché, et
le contrôle devient inutilisable au clavier ou muet en lecture d'écran. Le
`<select>` natif garde tout ce comportement ; tu ne fais que l'habiller.

## Animer un `<details>` avec `::details-content`

Même logique pour l'accordéon natif. Le contenu déplié d'un `<details>` se cible
avec `::details-content`, et s'anime malgré la bascule discrète de visibilité
grâce à `allow-discrete`.

```css
details::details-content {
  opacity: 0;
  transition:
    opacity 300ms,
    content-visibility 300ms allow-discrete;
}
details[open]::details-content { opacity: 1; }
```

Plus besoin de JS pour mesurer la hauteur : l'ouverture native reste accessible
et animée.

## Statut 2026 et dégradation progressive

Ces primitives n'ont pas toutes la même maturité :

- `accent-color`, `caret-color`, `::selection` : largement gérés, sûrs partout.
- `::details-content` : Baseline depuis 2025, sûr sur les versions récentes.
- `field-sizing: content` : Chrome, Edge et Safari ; Firefox ne le gère pas encore.
- `<select>` personnalisable (`base-select`, `::picker`, `selectedcontent`,
  `::checkmark`) : d'abord Chrome/Edge (135+), Safari en cours ; pas encore
  Baseline début 2026.

La dégradation est gratuite : un `<select>` sans support de `base-select` reste un
`<select>` natif pleinement fonctionnel — l'utilisateur voit simplement le rendu
par défaut. Enveloppe les couches avancées dans `@supports` pour ne les appliquer
que là où elles tiennent :

```css
@supports (appearance: base-select) {
  select,
  ::picker(select) { appearance: base-select; }
}

@supports (field-sizing: content) {
  textarea { field-sizing: content; max-height: 10lh; }
}
```

**Pourquoi ce sens de lecture.** Tu pars du contrôle natif qui marche pour tout le
monde, puis tu ajoutes l'habillage moderne en surcouche. Personne ne se retrouve
devant un contrôle cassé faute de support : le pire cas reste le contrôle standard
du système.

## À retenir

Le réflexe « masquer et reconstruire en JS » n'est plus la norme. On teinte, on
dimensionne et on habille les contrôles **natifs**, en préservant leur
accessibilité sans la moindre ligne de script. Les briques matures (`accent-color`,
`::details-content`) sont utilisables tout de suite ; le `<select>` personnalisable
se pose derrière `@supports`, sûr grâce à sa dégradation vers le contrôle natif.

:::cheatsheet
- title: "accent-color"
  desc: "Teinte cases, radios, `range`, `progress`. Le navigateur gère le contraste de la coche."
- title: "caret-color / ::selection"
  desc: "Couleur du curseur de saisie et du texte sélectionné. Primitives natives, partout."
- title: "field-sizing: content"
  desc: "Le champ grandit avec son contenu, sans JS de mesure. Borne avec `min/max-height`."
- title: "appearance: base-select"
  desc: "À poser sur `select` ET `::picker(select)` pour activer le rendu personnalisable."
- title: "::picker(select) / ::picker-icon"
  desc: "Stylise la liste déroulante et la flèche. `::checkmark` cible la coche de l'option active."
- title: "selectedcontent"
  desc: "Reflète l'option choisie dans le bouton fermé ; masques-y le markup superflu."
- title: "::details-content"
  desc: "Cible le contenu déplié d'un `<details>` ; anime-le avec `content-visibility` + `allow-discrete`."
- title: "@supports + natif"
  desc: "Enveloppe les nouveautés dans `@supports` ; le contrôle natif reste le repli fonctionnel."
:::
