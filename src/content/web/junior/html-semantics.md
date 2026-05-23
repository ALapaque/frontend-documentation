---
title: "La sémantique HTML"
slug: "html-semantics"
framework: "web"
level: "junior"
order: 1
duration: 13
prerequisites: []
updated: 2026-05-23
seoTitle: "La sémantique HTML : balises, landmarks et accessibilité"
seoDescription: "Pourquoi choisir la bonne balise HTML : arbre d'accessibilité, SEO, robustesse. Landmarks, hiérarchie des titres, button vs div, et le piège du div-soup."
ogVariant: "sage"
related:
  - { framework: "web", slug: "forms" }
---

Un navigateur ne se contente pas d'afficher ton HTML : il en construit un **arbre d'accessibilité** (accessibility tree), une version parallèle du DOM où chaque nœud porte un *rôle*, un *nom* et un *état*. C'est cet arbre, et non tes pixels, que lisent les lecteurs d'écran, les moteurs de recherche et les outils d'automatisation. La sémantique, c'est l'art de choisir la balise qui décrit *ce qu'est* un élément, pas seulement *à quoi il ressemble*.

## Pourquoi la sémantique n'est pas cosmétique

Quand tu écris `<button>`, le navigateur sait sans que tu lui dises : c'est cliquable, focusable au clavier, activable par `Entrée` et `Espace`, et il l'expose dans l'arbre avec le rôle `button`. Quand tu écris `<div>`, il ne sait rien : c'est une boîte muette. La sémantique te fait gagner trois choses gratuitement.

- **Accessibilité** : l'arbre d'accessibilité donne aux technologies d'assistance le rôle et l'état réels. Un `<nav>` est annoncé « navigation », un `<h2>` permet de sauter de section en section.
- **SEO** : les robots pondèrent le contenu d'un `<main>` ou d'un `<article>` différemment d'un pied de page. Une hiérarchie de titres claire structure l'extraction.
- **Robustesse** : le comportement natif (focus, clavier, états) est maintenu par le navigateur, testé sur toutes les plateformes. Tu n'as rien à réimplémenter.

:::callout{type="info"}
L'arbre d'accessibilité se calcule à partir de la balise, des attributs ARIA et de quelques règles CSS (`display: none` retire un nœud). La **première règle d'ARIA** : ne pas utiliser ARIA. Une balise native correcte vaut toujours mieux qu'un `<div role="button">` rafistolé.
:::

## Les landmarks : la carte de la page

Les *landmarks* sont des régions repérables que l'utilisateur de lecteur d'écran peut lister et atteindre directement. Elles découpent la page en zones de sens.

```html
<body>
  <header>            <!-- bandeau : logo, titre du site -->
    <nav aria-label="Principale">…</nav>
  </header>

  <main>              <!-- LE contenu unique de cette page -->
    <article>         <!-- un contenu autonome, syndicable -->
      <h1>Titre de l'article</h1>
      <section>       <!-- un regroupement thématique titré -->
        <h2>Une partie</h2>
      </section>
    </article>
  </main>

  <footer>…</footer>  <!-- mentions, liens secondaires -->
</body>
```

Quelques mécanismes à connaître. `<main>` doit être **unique** par page et contient ce qui change d'une page à l'autre. `<article>` désigne un bloc qui aurait du sens **sorti de son contexte** (un billet, une carte produit, un commentaire). `<section>` regroupe un thème et attend presque toujours un titre. `<nav>` marque un ensemble de liens de navigation : on en met plusieurs (principale, fil d'Ariane, pied de page) en les distinguant avec `aria-label`.

## La hiérarchie des titres

Les titres `<h1>`–`<h6>` ne sont pas des tailles de police : ils dessinent un **plan**. Les lecteurs d'écran génèrent une table des matières navigable à partir d'eux. La règle : un seul `<h1>` (le sujet de la page), puis on ne saute pas de niveau (`<h2>` puis `<h3>`, jamais `<h2>` directement vers `<h4>`).

:::compare
::bad
```html
<div class="titre-xxl">Tableau de bord</div>
<p class="sous-titre">Ventes</p>
<div class="card" onclick="ouvrir()">Voir le détail</div>
```
::
::good
```html
<h1>Tableau de bord</h1>
<h2>Ventes</h2>
<button type="button" onclick="ouvrir()">Voir le détail</button>
```
::
:::

**Pourquoi.** Dans la version de gauche, l'arbre d'accessibilité ne contient *aucun* titre : un lecteur d'écran qui demande « liste des titres » renvoie une liste vide, l'utilisateur ne peut pas se repérer ni sauter de section. Le `<div onclick>` n'a pas le rôle `button`, n'est pas dans l'ordre de tabulation (pas de `tabindex`), ne réagit ni à `Entrée` ni à `Espace`, et n'annonce pas qu'il est actionnable. À droite, le navigateur place `heading level 1`, `heading level 2` et `button` dans l'arbre, gère le focus clavier et l'activation tout seul. Le besoin (être perçu comme un titre, être cliquable au clavier) est satisfait par le rôle natif, pas par l'apparence.

## button vs div cliquable

C'est le piège le plus fréquent. Un `<div onclick>` *paraît* fonctionner à la souris, mais il manque tout le reste : focus clavier, activation au clavier, rôle annoncé, état `disabled`, focus visible. Reproduire tout ça à la main demande `tabindex="0"`, `role="button"`, un gestionnaire `keydown` pour `Entrée`/`Espace`, et tu oublieras toujours un détail. Utilise `<button>` (action sur la page) ou `<a href>` (navigation vers une URL). Le critère : *est-ce que ça mène quelque part ?* → lien ; *est-ce que ça fait quelque chose ?* → bouton.

## Le piège du div-soup

La « div-soup », c'est une page faite presque entièrement de `<div>` et `<span>` stylés. Visuellement identique à une page sémantique, elle est invisible pour l'arbre d'accessibilité : pas de landmarks, pas de titres, pas de rôles. Elle coûte cher plus tard (accessibilité à recâbler avec ARIA, SEO faible, code illisible). La parade est simple : avant d'écrire `<div>`, demande-toi s'il existe une balise qui *nomme* l'intention (`<nav>`, `<button>`, `<ul>`, `<figure>`, `<time>`…). Le `<div>` reste légitime, mais comme **conteneur de mise en page neutre**, pas comme substitut universel.

:::callout{type="tip"}
Audit express : ouvre l'onglet *Accessibility* des DevTools et regarde l'arbre. S'il est rempli de « generic », c'est de la div-soup. S'il montre des `navigation`, `main`, `heading`, `button`, ta sémantique tient.
:::

## À retenir

:::cheatsheet
- title: "Balise = rôle"
  desc: "Choisis la balise qui décrit le sens, pas l'apparence ; le rôle alimente l'arbre d'accessibilité."
- title: "Landmarks"
  desc: "header / nav / main (unique) / footer découpent la page en régions navigables."
- title: "article vs section"
  desc: "article = contenu autonome et syndicable ; section = regroupement thématique titré."
- title: "Titres = plan"
  desc: "Un seul h1, pas de saut de niveau : c'est la table des matières du lecteur d'écran."
- title: "button, pas div onclick"
  desc: "Le bouton natif apporte focus, clavier et état gratuitement ; le div ne le fait pas."
- title: "ARIA en dernier"
  desc: "Première règle d'ARIA : ne pas en mettre si une balise native existe."
:::
