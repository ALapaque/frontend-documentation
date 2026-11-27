---
title: "Mode sombre : color-scheme, light-dark() et thèmes"
slug: "dark-mode"
framework: "css"
level: "medior"
order: 9
duration: 16
prerequisites: ["colors"]
updated: 2026-11-27
seoTitle: "Mode sombre en CSS — color-scheme, light-dark() et bascule de thème sans flash"
seoDescription: "Déclarer color-scheme, écrire chaque token une seule fois avec light-dark(), brancher une bascule utilisateur sans flash au chargement, puis traiter les images, l'Adaptive Dark Mode de Safari et les couleurs forcées."
ogVariant: "gold"
related:
  - { framework: "css", slug: "custom-properties" }
  - { framework: "css", slug: "contrast-color" }
  - { framework: "css", slug: "colors" }
  - { framework: "web", slug: "accessibility" }
---

Un mode sombre « classique » tient en deux blocs : les tokens clairs sur `:root`, les
tokens sombres sous `[data-theme="dark"]` ou dans un `@media`. Ça marche à moitié. La
page est sombre, mais les barres de défilement restent blanches, les champs natifs
aussi, et un flash clair précède chaque chargement. La cause est toujours la même : tu
as repeint la page sans jamais **dire au navigateur** qu'elle sait être sombre.

Ce silence commence à se voir. D'après WebKit, près de 40 % des chargements de page
viennent d'utilisateurs en mode sombre, et 10 % seulement des chargements le prennent
en charge. Safari teste donc un mode qui assombrit lui-même les pages restées muettes.
Autant décider toi-même.

## `color-scheme` : annoncer ce que la page sait faire

`color-scheme` ne peint rien de ton design. Il annonce les schémas que la page accepte,
et le navigateur adapte alors **tout ce qui lui appartient** :

- le fond du canvas (la surface peinte derrière `<html>`) et les barres de défilement ;
- les contrôles de formulaire et le soulignement du correcteur orthographique ;
- les couleurs système (`Canvas`, `CanvasText`, `LinkText`…), donc le texte par défaut ;
- la valeur renvoyée par `light-dark()`.

```html
<meta name="color-scheme" content="light dark">
```

```css
:root { color-scheme: light dark; }
```

Les deux écritures se complètent. La balise `<meta>` est lue avant le CSS : le premier
rendu a déjà le bon fond, même si la feuille de style tarde. La propriété s'hérite et se
redéfinit sur n'importe quel élément. Quatre valeurs à connaître :

- **`normal`** (défaut) — rien d'annoncé : tout ce qui est natif reste clair.
- **`light dark`** — les deux schémas ; le navigateur suit la préférence de l'utilisateur.
- **`light`** ou **`dark`** seul — un schéma unique, quel que soit le réglage système.
- **`only`** (`light only`) — en plus, interdit au navigateur de passer outre.

:::compare
::bad
```css
/* thème « à la main » : le navigateur croit toujours la page claire */
[data-theme="dark"] { --bg: #111; --fg: #eee; }
body { background: var(--bg); color: var(--fg); }
/* scrollbars blanches, <select> et <input type="date"> clairs sur fond noir */
```
::
::good
```css
[data-theme="dark"] { color-scheme: dark; --bg: #111; --fg: #eee; }
body { background: var(--bg); color: var(--fg); }
```
::
:::

**Pourquoi.** Les contrôles natifs et les scrollbars ne lisent pas tes tokens : ils
suivent le schéma de l'élément. Sans déclaration, ce schéma vaut « clair ». C'est le
maillon qui manque au theming par `data-theme` de
[custom properties](/css/senior/custom-properties).

:::callout{type="warn"}
N'annonce que ce que tu tiens. Avec `color-scheme: light dark` et un `background: white`
codé en dur, le texte par défaut passe en clair chez un utilisateur en sombre : blanc
sur blanc. Fond et texte se déclarent toujours **par paire**.
:::

## `prefers-color-scheme` ou `light-dark()` : une valeur de vérité par token

Les deux écritures ne lisent pas la même chose, et tout le reste en découle.

- `@media (prefers-color-scheme: dark)` lit la **préférence de l'utilisateur** (système
  ou navigateur). Elle vaut pour tout le document et ignore ton `color-scheme`.
- `light-dark(clair, sombre)` lit le **schéma utilisé par l'élément** : la préférence,
  filtrée par `color-scheme`. Elle suit donc l'héritage, sous-arbre par sous-arbre.

:::compare
::bad
```css
:root { --surface: #fff; --text: #1a1a1a; }
@media (prefers-color-scheme: dark) {
  :root { --surface: #121212; --text: #ececec; }
}
/* la bascule manuelle oblige à recopier les deux palettes */
[data-theme="light"] { --surface: #fff; --text: #1a1a1a; }
[data-theme="dark"]  { --surface: #121212; --text: #ececec; }
```
::
::good
```css
:root {
  color-scheme: light dark;
  --surface: light-dark(#fff, #121212);
  --text: light-dark(#1a1a1a, #ececec);
}
```
::
:::

**Pourquoi.** Chaque token porte ses deux valeurs au même endroit, et un seul
interrupteur décide : `color-scheme`. Dans la première version, chaque palette existe en
double ; le jour où l'une des copies est oubliée, les deux chemins divergent.

Trois pièges reviennent en revue de code :

- **Sans `color-scheme`, `light-dark()` renvoie toujours la première valeur.** La
  fonction ne lit pas le système, elle lit le schéma de l'élément.
- **Des couleurs, pas des valeurs quelconques.** Pas de longueur ni d'ombre entière,
  mais la couleur *dans* l'ombre, oui :
  `box-shadow: 0 1px 3px light-dark(rgb(0 0 0 / 0.12), rgb(0 0 0 / 0.6))`.
- **Un token typé ne bascule plus localement.** Enregistré avec `@property` et
  `syntax: "<color>"`, il est calculé là où il est déclaré, puis hérité tel quel.

Ce dernier point compte, parce que la portée locale est le vrai bonus de la fonction :

```css
.pied-de-page { color-scheme: dark; } /* toujours sombre : ses tokens basculent seuls */
```

`light-dark()` est Baseline **largement disponible** depuis le 13 novembre 2026 (Chrome
123, Firefox 120, Safari 17.5) : plus besoin de repli dans un projet courant.

## Bascule utilisateur : trois états, aucun token dupliqué

Un sélecteur de thème a trois positions : **système**, clair, sombre. Avec des tokens
en `light-dark()`, il ne touche qu'à `color-scheme` :

```css
:root                     { color-scheme: light dark; } /* système */
:root[data-theme="light"] { color-scheme: light; }
:root[data-theme="dark"]  { color-scheme: dark; }
```

```js
function setTheme(theme) { // "light" | "dark" | "system"
  const root = document.documentElement;
  if (theme === "system") {
    delete root.dataset.theme; // on rend la main au système
    localStorage.removeItem("theme");
  } else {
    root.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }
}
```

« Système » se stocke par une **absence** de valeur. Si tu résous la préférence au
premier passage pour enregistrer `"dark"`, l'utilisateur reste coincé le jour où son
système change d'apparence.

### Éviter le flash au chargement

Le HTML rendu par le serveur ne connaît pas `localStorage`. Si l'attribut est posé à
l'hydratation, la page s'affiche d'abord dans le thème système, puis saute. La parade :
un script **inline et bloquant** dans le `<head>`, avant les feuilles de style.

```html
<head>
  <meta name="color-scheme" content="light dark">
  <script>
    try {
      const theme = localStorage.getItem("theme");
      if (theme === "light" || theme === "dark") {
        document.documentElement.dataset.theme = theme;
      }
    } catch {} // stockage bloqué : on garde le thème système
  </script>
  <link rel="stylesheet" href="/app.css">
</head>
```

Trois lignes synchrones ne coûtent rien ; un module différé arriverait après le premier
rendu. Avec une CSP stricte, ce script demande un `nonce` ou un hash.

:::callout{type="tip"}
Autre voie en SSR : stocker le choix dans un **cookie**, que le serveur lit pour rendre
`<html data-theme="dark">` directement. Plus aucun script, mais le HTML varie d'un
utilisateur à l'autre : il ne se met plus en cache partagé tel quel.
:::

## Images et médias

Une image ne lit pas tes tokens. Trois techniques, qui ne suivent pas toutes la bascule :

| Technique | Préférence système | Ta bascule (`color-scheme`) |
| --- | --- | --- |
| SVG inline en `currentColor` | oui | oui |
| `light-dark()` avec des images | oui | oui |
| `<picture>` + `media` | oui | **non** |

```css
.logo {
  background-image: url("/logo-clair.svg"); /* repli */
  background-image: light-dark(url("/logo-clair.svg"), url("/logo-sombre.svg"));
}
```

```html
<picture>
  <source srcset="/schema-sombre.png" media="(prefers-color-scheme: dark)">
  <img src="/schema-clair.png" alt="Schéma d'architecture">
</picture>
```

Les icônes en SVG inline avec `fill: currentColor` suivent le texte sans rien faire :
c'est la relation décrite dans [couleurs](/css/junior/colors). `light-dark()` accepte
des images (`url()`, dégradés) depuis le 14 septembre 2026 seulement — Chrome 150,
Firefox 150, Safari 27, Baseline *nouvellement* disponible — d'où la ligne de repli.

Le piège est `<picture>` : sa media query lit le système, pas ton `data-theme`. Un
utilisateur en système sombre qui choisit « clair » sur ton site reçoit l'image sombre
sur une page claire. Avec une bascule manuelle, passe par le CSS ou par le SVG inline.

## Adaptive Dark Mode de Safari

:::callout{type="warn"}
**Bêta, novembre 2026.** Adaptive Dark Mode a été annoncé le 3 novembre 2026 dans
Safari 27.3 bêta. Le comportement décrit ici vient de cette annonce et peut encore
bouger d'ici la version stable.
:::

Quand l'utilisateur l'active, avec un système en apparence sombre, Safari assombrit
lui-même les pages claires. La décision se prend en deux temps :

1. La page déclare `color-scheme: light dark` (balise `<meta>` ou CSS) : Safari ne
   touche à **rien**.
2. Sinon, il analyse les couleurs. Fond sombre et texte clair : rien ne change. Page
   claire : elle est transformée.

La transformation inverse la luminosité en conservant la teinte, vise un contraste de
4,5:1 pour le texte et convertit les dégradés clairs. Les images restent intactes, sauf
les SVG et les logos bitmap noir et blanc, inversés si nécessaire ; `<canvas>` n'est
jamais modifié. Ton code ne peut pas le détecter : JavaScript relit les couleurs
d'origine, pas les couleurs transformées.

Le theming par `data-theme` sans `color-scheme` tombe donc en plein dedans : thème
clair affiché, système sombre, page réécrite par une heuristique. Pour refuser :

```html
<meta name="color-scheme" content="light only">
```

`color-scheme: light only` fait la même chose en CSS, sur `:root` ou sur un seul
élément (une carte, un aperçu de document). Safari reconnaît `only` depuis la bêta 2
de la 27.3. À l'inverse, `color-scheme: light dark` posé sur un bloc te rend la main
sur cette seule portion. Dans la bascule, le choix explicite « clair » mérite le même
verrou, puisque la spécification ne retient que `only` comme interdiction :

```diff
- :root[data-theme="light"] { color-scheme: light; }
+ :root[data-theme="light"] { color-scheme: light only; }
```

## Au-delà du sombre : contraste et couleurs forcées

Clair et sombre ne sont pas les seules préférences. Deux media queries, largement
disponibles, couvrent les besoins de contraste.

- **`prefers-contrast: more`** — l'utilisateur demande plus de contraste : renforce
  les bordures, abandonne les gris subtils. Tu gardes la main sur la palette.
- **`forced-colors: active`** — le navigateur **impose** une palette (thèmes de
  contraste de Windows). Les couleurs passent en couleurs système, `box-shadow` et
  `text-shadow` disparaissent, comme les `background-image` sans `url()`.

```css
.btn:focus-visible {
  box-shadow: 0 0 0 3px var(--focus);
  outline: 2px solid transparent; /* invisible ici, repeint en couleurs forcées */
}

@media (forced-colors: active) {
  .onglet[aria-selected="true"] { border-block-end: 3px solid Highlight; }
}

@media (prefers-contrast: more) {
  :root { --border: light-dark(#000, #fff); }
}
```

Tout état porté par une ombre ou un seul fond s'efface en couleurs forcées : double-le
d'une bordure ou d'un `outline`, et nomme les couleurs système (`Canvas`, `CanvasText`,
`Highlight`, `ButtonText`). Elles suivent aussi `color-scheme`, donc elles marchent
partout. Le reste du sujet est dans [accessibilité](/web/senior/accessibility).

## À retenir

Le mode sombre n'est plus une palette en double : c'est une **déclaration**
(`color-scheme`), des tokens écrits une fois (`light-dark()`) et un attribut qui ne
change que le schéma. Tout ce qui lit la préférence système sans passer par
`color-scheme` — `@media`, `<picture>` — ignore ta bascule.

:::cheatsheet
- title: "color-scheme: light dark"
  desc: "En `<meta>` et sur `:root`. Le navigateur adapte canvas, champs, scrollbars et couleurs système."
- title: "light-dark(clair, sombre)"
  desc: "Lit le schéma de l'élément, pas le système. Sans `color-scheme`, renvoie toujours la première valeur."
- title: "Bascule à trois états"
  desc: "`data-theme` ne change que `color-scheme`. Script inline dans le `<head>` pour éviter le flash."
- title: "Images"
  desc: "`currentColor` et `light-dark()` suivent la bascule ; `<picture media>` ne suit que le système."
- title: "Adaptive Dark Mode"
  desc: "Safari 27.3 bêta (nov. 2026) assombrit les pages claires muettes. `light only` pour s'en exclure."
- title: "forced-colors"
  desc: "Ombres et fonds effacés : `outline` transparent, bordures, couleurs système (`Canvas`, `Highlight`)."
:::
