---
title: "Le DOM : manipuler la page"
slug: "the-dom"
framework: "web"
level: "junior"
order: 4
duration: 14
prerequisites: ["html-semantics"]
updated: 2026-05-23
seoTitle: "Le DOM expliqué : sélection, création et coût du reflow"
seoDescription: "Comprendre le DOM comme un arbre d'objets : querySelector, createElement, template, textContent vs innerHTML et XSS, reflow/repaint, batching et DocumentFragment."
ogVariant: "sage"
related:
  - { framework: "web", slug: "html-semantics" }
---

Beaucoup de débutants confondent le HTML et le DOM. Le HTML est le **texte source** que tu écris dans ton fichier ; le DOM (*Document Object Model*) est l'**arbre d'objets vivants** que le navigateur construit à partir de ce texte. C'est une distinction fondamentale : une fois la page chargée, ton fichier `.html` ne sert plus à rien. Ce que JavaScript manipule, ce que le visiteur voit, ce que les outils de développement affichent, c'est le DOM. Comprendre cette nuance change ta façon de coder.

## Le DOM est un arbre d'objets

Quand le navigateur lit ton HTML, il le *parse* et crée un objet pour chaque balise, chaque texte, chaque attribut, reliés en arbre : un nœud parent, des enfants, des frères. Cet arbre n'est pas une copie figée du fichier — c'est une structure modifiable en temps réel.

```js
document.body            // le nœud <body>
element.parentNode       // remonter au parent
element.children         // les éléments enfants
element.nextElementSibling
```

La conséquence directe : si tu corriges une faute de frappe dans le DOM via JavaScript, la page change instantanément, mais ton fichier source, lui, n'est pas touché. Inversement, ce que tu vois dans l'inspecteur peut être très différent du *view-source* d'origine, car les scripts ont eu le temps de tout réécrire.

## Sélectionner des éléments

Pour agir sur un nœud, il faut d'abord le retrouver dans l'arbre. Les deux méthodes modernes utilisent la syntaxe des sélecteurs CSS, ce que tu connais déjà.

```js
const titre = document.querySelector("h1");          // le premier qui matche
const liens = document.querySelectorAll("nav a");    // tous, dans une NodeList
liens.forEach((a) => console.log(a.href));
```

`querySelector` renvoie le **premier** élément correspondant (ou `null`). `querySelectorAll` renvoie une `NodeList` de tous les éléments, parcourable avec `forEach`. Cette `NodeList` est *statique* : elle photographie le DOM à l'instant de l'appel et n'est pas mise à jour si tu ajoutes des éléments ensuite.

## Créer et insérer des nœuds

On ne fabrique pas un élément en écrivant des balises dans une chaîne, mais en demandant au navigateur de créer un vrai objet, qu'on configure puis qu'on attache à l'arbre.

```js
const li = document.createElement("li");
li.textContent = "Nouvel article";
li.className = "item";
document.querySelector("ul").append(li);   // attaché en dernier enfant
```

Tant qu'un nœud n'est pas inséré dans le document (via `append`, `prepend`, `before`, `after`), il existe en mémoire mais n'apparaît nulle part. Pour des structures répétées, l'élément `<template>` est idéal : son contenu est parsé mais inerte (images non chargées, scripts non exécutés) jusqu'à ce que tu le clones.

```html
<template id="carte">
  <article class="carte"><h3></h3><p></p></article>
</template>
```

```js
const tmpl = document.querySelector("#carte");
const clone = tmpl.content.cloneNode(true);
clone.querySelector("h3").textContent = "Titre";
document.body.append(clone);
```

## Modifier texte, attributs et classes

Pour le contenu textuel, deux propriétés se ressemblent mais ont une différence de sécurité majeure : `textContent` et `innerHTML`.

:::compare
::bad
```js
const pseudo = location.search;            // vient de l'utilisateur
zone.innerHTML = "Bonjour " + pseudo;       // interprété comme du HTML
```
::
::good
```js
const pseudo = new URLSearchParams(location.search).get("nom");
zone.textContent = "Bonjour " + pseudo;     // inséré comme texte brut
```
::
:::

**Pourquoi.** `innerHTML` demande au navigateur de **parser** la chaîne comme du HTML : si elle contient `<img src=x onerror="...">`, le code s'exécute. C'est la faille **XSS** (*cross-site scripting*) : une donnée venue de l'utilisateur devient du code actif dans ta page. `textContent`, lui, insère la chaîne comme du **texte pur** : les chevrons sont affichés littéralement, jamais interprétés. Règle : `textContent` par défaut, `innerHTML` seulement pour du HTML que **tu** maîtrises entièrement.

Pour les attributs et les classes, des API dédiées :

```js
img.setAttribute("alt", "Logo");
img.alt = "Logo";                  // raccourci pour les attributs courants
el.classList.add("actif");
el.classList.toggle("ouvert");     // ajoute ou retire selon l'état
el.dataset.id = "42";              // écrit data-id="42"
```

## Le coût caché : reflow et repaint

Modifier le DOM n'est pas gratuit. Quand tu changes une propriété qui affecte la **géométrie** (taille, position, ajout d'un nœud), le navigateur doit recalculer la mise en page de la zone touchée : c'est le **reflow** (ou *layout*). S'ensuit le **repaint** : redessiner les pixels. Le reflow est coûteux car il peut se propager à tout l'arbre.

Le piège classique est de *lire* puis *écrire* en boucle une dimension, ce qui force le navigateur à recalculer la mise en page à chaque tour (*layout thrashing*).

:::compare
::bad
```js
items.forEach((el) => {
  el.style.width = el.offsetWidth + 10 + "px"; // lit (force reflow) puis écrit, à chaque tour
});
```
::
::good
```js
const largeurs = items.map((el) => el.offsetWidth); // toutes les lectures d'abord
items.forEach((el, i) => {
  el.style.width = largeurs[i] + 10 + "px";         // puis toutes les écritures
});
```
::
:::

**Pourquoi.** Le navigateur essaie d'être paresseux : il regroupe les écritures et ne recalcule la mise en page qu'au dernier moment. Mais dès que tu **lis** une valeur géométrique (`offsetWidth`, `getBoundingClientRect`), il est forcé de recalculer immédiatement pour te donner une réponse exacte. Alterner lecture/écriture casse le regroupement et déclenche un reflow par itération. En séparant toutes les lectures, puis toutes les écritures, tu laisses le navigateur *batcher* le travail en un seul reflow.

## DocumentFragment pour les insertions multiples

Insérer cent éléments un par un dans le document, c'est risquer un reflow à chaque insertion. Un `DocumentFragment` est un conteneur léger, hors document : tu y empiles tes nœuds, puis tu l'insères en une fois.

```js
const frag = document.createDocumentFragment();
for (const texte of liste) {
  const li = document.createElement("li");
  li.textContent = texte;
  frag.append(li);          // aucune répercussion sur la page
}
document.querySelector("ul").append(frag); // un seul reflow ici
```

:::callout{type="info"}
Quand on insère un `DocumentFragment`, ce sont ses **enfants** qui passent dans le document ; le fragment lui-même disparaît et ne laisse aucune balise wrapper. C'est exactement ce qu'on veut : ajouter plusieurs `<li>` directement dans le `<ul>`, sans conteneur parasite, en une seule opération.
:::

## À retenir

:::cheatsheet
- title: "DOM ≠ HTML source"
  desc: "Le DOM est un arbre d'objets vivants construit à partir du HTML, modifiable à chaud."
- title: "querySelector / All"
  desc: "Sélection par syntaxe CSS ; All renvoie une NodeList statique."
- title: "createElement + append"
  desc: "Crée un vrai objet, configure-le, puis attache-le à l'arbre pour l'afficher."
- title: "template + cloneNode"
  desc: "Gabarit inerte parsé une fois, cloné pour des structures répétées."
- title: "textContent vs innerHTML"
  desc: "textContent insère du texte sûr ; innerHTML parse du HTML, vecteur de XSS."
- title: "classList / dataset"
  desc: "add, toggle pour les classes ; dataset pour lire/écrire les attributs data-*."
- title: "reflow / repaint"
  desc: "Changer la géométrie recalcule la mise en page ; éviter lire/écrire en boucle."
- title: "DocumentFragment"
  desc: "Empile les nœuds hors document, insère tout en une fois : un seul reflow."
:::
