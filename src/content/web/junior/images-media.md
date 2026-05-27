---
title: "Images et médias performants"
slug: "images-media"
framework: "web"
level: "junior"
order: 3
duration: 13
prerequisites: ["html-semantics"]
updated: 2026-05-23
seoTitle: "Images et médias web : AVIF, srcset, lazy loading et CLS"
seoDescription: "Servir des images modernes et rapides : formats AVIF/WebP, srcset/sizes, picture, lazy loading, dimensions explicites contre le CLS, fetchpriority, video et audio."
ogVariant: "sage"
related:
  - { framework: "web", slug: "html-semantics" }
---

Sur la plupart des sites, les images représentent le plus gros poids téléchargé, loin devant le HTML et le CSS. Une `<img>` mal servie ralentit le chargement, fait sauter la mise en page et gaspille la bande passante du visiteur. La bonne nouvelle : le navigateur sait déjà choisir le bon fichier, le décoder sans bloquer, et différer ce qui n'est pas visible. Ton travail consiste à lui donner les informations dont il a besoin pour décider.

## Les formats modernes

Le `JPEG` et le `PNG` datent des années 90. Depuis, deux formats les surclassent largement : **WebP** (universel en 2026) et surtout **AVIF**, dérivé du codec vidéo AV1, qui offre une compression nettement supérieure à qualité égale, avec transparence et HDR. Un même visuel pèse souvent deux à trois fois moins en AVIF qu'en JPEG.

Le piège : tous les navigateurs anciens ne lisent pas l'AVIF. La solution n'est pas de choisir un format unique, mais de **proposer plusieurs sources** et de laisser le navigateur prendre la première qu'il sait décoder.

```html
<picture>
  <source srcset="photo.avif" type="image/avif" />
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="Vue de la baie au lever du soleil" />
</picture>
```

**Pourquoi.** Le navigateur lit les `<source>` dans l'ordre et s'arrête à la première dont il sait lire le `type`. L'`<img>` final est le filet de sécurité : c'est lui qui porte l'`alt` et qui s'affiche si aucun format avancé n'est pris en charge. Tu sers le meilleur format à chacun sans script ni détection serveur.

## Servir la bonne taille : srcset et sizes

Envoyer une image de 2000 pixels de large à un téléphone qui l'affiche sur 360 pixels, c'est gâcher des octets et du temps. `srcset` décrit les **variantes disponibles** et leur largeur réelle (en `w`) ; `sizes` décrit la **largeur d'affichage** prévue selon le contexte.

```html
<img
  src="hero-800.jpg"
  srcset="hero-400.jpg 400w, hero-800.jpg 800w, hero-1600.jpg 1600w"
  sizes="(max-width: 600px) 100vw, 50vw"
  alt="Atelier de céramique"
  width="800" height="500" />
```

**Pourquoi.** Le navigateur connaît trois choses que toi non : la largeur réelle du viewport, la densité de l'écran (un écran Retina veut deux fois plus de pixels), et l'état de la connexion. Avec `srcset` + `sizes`, il calcule lui-même le candidat optimal et télécharge **un seul** fichier. C'est de la *résolution adaptative* : même image, plusieurs tailles, choix automatique.

:::callout{type="tip"}
`srcset` avec `w` sert à la **résolution** (même image, tailles différentes). `<picture>` avec `<source media="...">` sert à l'**art direction** : changer carrément de cadrage selon l'écran, par exemple un portrait serré sur mobile et un panoramique large sur desktop. Ce ne sont pas les mêmes besoins.
:::

## Art direction avec picture

Quand tu veux un recadrage différent (pas seulement une taille différente), `<picture>` avec un attribut `media` choisit la source selon une media query.

```html
<picture>
  <source media="(max-width: 600px)" srcset="cover-portrait.avif" type="image/avif" />
  <source media="(min-width: 601px)" srcset="cover-large.avif" type="image/avif" />
  <img src="cover.jpg" alt="Couverture du dossier" width="1200" height="600" />
</picture>
```

## Éviter le décalage de mise en page (CLS)

Sans dimensions, le navigateur ne connaît la taille d'une image qu'**après** l'avoir téléchargée. En attendant, il lui réserve une hauteur de zéro, puis pousse brutalement le contenu vers le bas quand l'image arrive : c'est le *Cumulative Layout Shift*, l'un des indicateurs de qualité les plus pénalisés.

:::compare
::bad
```html
<img src="photo.avif" alt="Plat du jour" />
```
::
::good
```html
<img src="photo.avif" alt="Plat du jour" width="1200" height="800" />
<!-- ou en CSS : aspect-ratio: 1200 / 800; -->
```
::
:::

**Pourquoi.** Les attributs `width` et `height` ne fixent pas la taille finale (le CSS reste maître via `max-width: 100%`), ils donnent le **ratio**. Dès la lecture du HTML, le navigateur calcule `height = largeur × (800/1200)` et réserve l'espace exact avant même de télécharger l'image. Le contenu ne saute plus. À défaut d'attributs, `aspect-ratio` en CSS produit le même effet. Le besoin (réserver la place) est porté par le ratio connu d'avance, pas par le fichier.

## Charger au bon moment : lazy loading et decoding

Une image hors écran n'a aucune raison d'être téléchargée tout de suite. `loading="lazy"` dit au navigateur de différer son chargement jusqu'à ce qu'elle approche du viewport. `decoding="async"` autorise le décodage de l'image en dehors du fil principal, pour ne pas figer le rendu.

```html
<img src="galerie-12.avif" alt="Sculpture en bronze"
     width="600" height="600" loading="lazy" decoding="async" />
```

:::callout{type="warn"}
Ne mets **jamais** `loading="lazy"` sur l'image principale visible au chargement (le *LCP*, souvent le grand visuel en haut de page). La différer retarde l'affichage le plus important et dégrade la performance perçue. Le lazy loading est réservé à ce qui est sous la ligne de flottaison.
:::

## Donner la priorité : fetchpriority

Le navigateur établit lui-même un ordre de priorité des téléchargements, mais il se trompe parfois sur l'image clé. `fetchpriority="high"` lui signale l'image vraiment importante à charger en premier ; `fetchpriority="low"` déprioritise les visuels accessoires.

```html
<!-- image héros, visible immédiatement : on la veut tôt -->
<img src="hero.avif" alt="Façade du musée"
     width="1600" height="900" fetchpriority="high" />
```

## Vidéo et audio natifs

Les éléments `<video>` et `<audio>` lisent des médias sans plugin. Comme pour les images, plusieurs `<source>` permettent de servir le format que le navigateur sait décoder, et le contenu entre les balises sert de repli textuel.

```html
<video controls width="640" height="360" preload="metadata" poster="apercu.jpg">
  <source src="demo.webm" type="video/webm" />
  <source src="demo.mp4" type="video/mp4" />
  <track kind="captions" src="sous-titres.vtt" srclang="fr" label="Français" />
  Ton navigateur ne peut pas lire cette vidéo.
</video>
```

Quelques attributs clés : `controls` affiche les boutons natifs, `preload="metadata"` ne télécharge que la durée et les dimensions (et non toute la vidéo), `poster` montre une image fixe avant lecture. Une vidéo d'arrière-plan décorative se déclare `muted autoplay playsinline loop` : sans `muted`, les navigateurs bloquent l'autoplay pour ne pas surprendre l'utilisateur avec du son. La balise `<track>` ajoute les sous-titres, indispensables à l'accessibilité.

## À retenir

:::cheatsheet
- title: "AVIF puis WebP"
  desc: "Formats modernes, 2 à 3 fois plus légers ; picture + source type pour le repli."
- title: "srcset + sizes"
  desc: "Plusieurs tailles d'une même image ; le navigateur choisit selon viewport et densité."
- title: "picture + media"
  desc: "Art direction : changer de cadrage selon l'écran, pas seulement de taille."
- title: "width / height ou aspect-ratio"
  desc: "Réserve l'espace via le ratio et supprime le CLS avant tout téléchargement."
- title: "loading=lazy"
  desc: "Diffère les images hors écran ; jamais sur l'image LCP visible au chargement."
- title: "decoding=async"
  desc: "Décode hors du fil principal pour ne pas bloquer le rendu."
- title: "fetchpriority"
  desc: "high pour l'image clé, low pour l'accessoire ; corrige l'ordre de téléchargement."
- title: "video / audio"
  desc: "Sources multiples, preload=metadata, poster, track pour les sous-titres."
:::
