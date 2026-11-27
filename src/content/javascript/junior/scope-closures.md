---
title: "Portée et closures"
slug: "scope-closures"
framework: "javascript"
level: "junior"
order: 1
duration: 14
prerequisites: []
updated: 2026-11-27
seoTitle: "Portée et closures en JavaScript — var, let, const, hoisting et TDZ"
seoDescription: "La portée lexicale, le hoisting et la zone morte temporelle, puis les closures pas à pas : compteur, fabrique, état privé, piège de la boucle et mémoire. Le socle pour comprendre les closures périmées de React."
ogVariant: "sage"
related:
  - { framework: "javascript", slug: "promises-async-await" }
  - { framework: "javascript", slug: "event-loop" }
  - { framework: "react", slug: "state-basics" }
  - { framework: "web", slug: "events" }
---

Tu écris des closures tous les jours, souvent sans le savoir : un handler de clic, un
callback de `setTimeout`, un composant React. Et quand une boucle affiche `3, 3, 3`
au lieu de `0, 1, 2`, ou qu'un callback lit une vieille valeur, c'est encore elles.

Deux règles expliquent tout. La **portée** dit *où* une variable est visible. La
**closure** dit ce qu'une fonction *emporte* en quittant l'endroit où elle est née.

## La portée : qui voit quoi

Imagine une maison aux pièces emboîtées, séparées par des vitres sans tain. Depuis
une pièce, tu vois tout ce qui se trouve dans celles qui l'entourent ; depuis
l'extérieur, tu ne vois rien de ce qu'elle contient. Une **portée** (*scope*) est une
de ces pièces, et une variable vit dans la pièce où elle est déclarée.

```js
const TVA = 0.2;                  // portée module : tout le fichier

export function totalTTC(prix) {  // `prix` : portée fonction
  let total = 0;                  // portée fonction
  for (const p of prix) {         // `p` : portée bloc
    const ttc = p * (1 + TVA);    // `ttc` : portée bloc, TVA vue depuis l'intérieur
    total += ttc;
  }
  return total;                   // ici, `p` et `ttc` n'existent plus
}
```

Quatre sortes de pièces, de la plus large à la plus étroite :

- **Globale** : visible de partout. `console`, `document` et `fetch` y vivent.
- **Module** : chaque fichier chargé comme [module ES](/web/medior/es-modules) a sa
  propre pièce. Rien n'en sort sans `export`.
- **Fonction** : les paramètres et ce qui est déclaré dans le corps de la fonction.
- **Bloc** : ce qui est déclaré avec `let` ou `const` entre deux accolades (`if`,
  `for`, `try`).

Cette portée est dite **lexicale** : elle dépend de l'endroit où le code est *écrit*,
pas de celui où la fonction est *appelée*. Face à un nom, le moteur cherche dans la
pièce courante, puis dans celle qui l'entoure, jusqu'à la portée globale. S'il ne
trouve rien : `ReferenceError`.

## var, let, const : hoisting et zone morte

Avant d'exécuter une portée, le moteur en repère toutes les déclarations. C'est le
**hoisting** (hissage) : tout se passe comme si elles remontaient en haut de leur
pièce. Le mot-clé décide de la portée et de l'état de la variable *avant* sa ligne.

| Mot-clé | Portée | Avant sa ligne | Réassignable |
| --- | --- | --- | --- |
| `var` | fonction | vaut `undefined` | oui |
| `let` | bloc | `ReferenceError` | oui |
| `const` | bloc | `ReferenceError` | non |

```js
console.log(remise); // undefined : `var` est hissée, mais sans sa valeur
var remise = 10;

console.log(prix);   // ReferenceError: Cannot access 'prix' before initialization
let prix = 42;
```

Entre l'entrée dans le bloc et la ligne du `let`, la variable existe, mais y toucher
lève une erreur : c'est la **zone morte temporelle** (*temporal dead zone*, TDZ). Un
garde-fou : mieux vaut une erreur sur la bonne ligne qu'un `undefined` silencieux.

Second défaut de `var` : elle ignore les blocs. Déclarée dans un `if` ou un `for`,
elle reste visible dans toute la fonction. D'où la règle : `const` par défaut, `let`
quand tu dois réassigner, plus de `var` dans du code neuf.

:::callout{type="info"}
Une déclaration `function` est hissée tout entière : tu peux l'appeler avant la ligne
où elle est écrite. Et `const` interdit de *réassigner* la variable, pas de
*modifier* l'objet qu'elle désigne : `const liste = []; liste.push(1)` fonctionne.
:::

## La closure : une fonction qui garde la clé

Retour dans la maison. Une fonction naît dans une pièce et en **garde la clé toute sa
vie** : même emmenée ailleurs, même si le code qui l'a créée est terminé. Ce couple,
une fonction et l'environnement (la pièce) où elle est née, c'est une **closure**.
Pas de syntaxe spéciale : toute fonction en forme une dès sa création.

```js
function creerCompteur() {
  let total = 0;               // vit dans la pièce de CET appel
  return function incrementer() {
    total += 1;                // lit et modifie la variable d'origine
    return total;
  };
}

const compterVisites = creerCompteur();
compterVisites(); // 1
compterVisites(); // 2

const compterClics = creerCompteur(); // nouvel appel = nouvelle pièce
compterClics();   // 1 : indépendant de compterVisites
```

`creerCompteur` a rendu la main, et pourtant `total` survit : `incrementer` détient
encore la clé. Trois conséquences :

- **Un état privé.** Aucun code extérieur ne peut lire ni modifier `total` autrement
  qu'en appelant la fonction.
- **Une pièce par appel.** Chaque appel de `creerCompteur` crée un nouveau `total` :
  les deux compteurs s'ignorent.
- **La variable, pas une copie.** La closure ne photographie pas la valeur : elle
  garde l'accès à la variable elle-même et la relit à chaque appel.

### Fabrique et état partagé

`creerCompteur` est une **fabrique** : une fonction qui en fabrique d'autres. Deux
raffinements courants : la configurer par un paramètre, capturé lui aussi, et
renvoyer plusieurs fonctions qui partagent la même pièce.

```js
function creerPanier(tva) {
  const articles = [];         // inaccessible de l'extérieur
  return {
    ajouter(article) { articles.push(article); },
    totalTTC() { return articles.reduce((s, a) => s + a.prix * (1 + tva), 0); },
  };
}

const panier = creerPanier(0.2);
panier.ajouter({ nom: 'Clavier', prix: 100 });
panier.totalTTC(); // 120
panier.articles;   // undefined : aucune porte d'entrée
```

Ce que `ajouter` écrit, `totalTTC` le lit, et `tva` reste réglée une fois pour
toutes. Un état caché, quelques fonctions pour y toucher : c'est déjà la forme d'un
composable Vue ou d'un petit store.

## Le piège classique de la boucle

Trois callbacks créés dans une boucle, exécutés une seconde plus tard :

:::compare
::bad
```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(`Étape ${i}`), 1000);
}
// Étape 3, Étape 3, Étape 3
```
::
::good
```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(`Étape ${i}`), 1000);
}
// Étape 0, Étape 1, Étape 2
```
::
:::

**Pourquoi.** `var` a une portée de fonction : il n'existe qu'**un seul** `i` pour
toute la boucle, et les trois callbacks ont la clé de la même pièce. Quand ils
s'exécutent, la boucle est terminée et `i` vaut `3`. Avec `let`, chaque tour de
boucle crée un `i` tout neuf dans sa propre pièce : chaque callback retrouve le sien.

C'est la preuve qu'une closure capture une *variable*, pas une *valeur*. Le décalage,
lui, vient de ce qu'un callback de timer attend la fin du code en cours : c'est le
travail de l'[event loop](/javascript/medior/event-loop). Avec `forEach` ou `map`,
pas de piège : chaque passage dans le callback est un nouvel appel, avec sa pièce.

## Closures et mémoire

Une pièce n'est démolie que lorsque plus personne n'en a la clé. Tant qu'une fonction
est joignable, les variables qu'elle utilise restent en mémoire ; dès que plus rien
ne la référence, le ramasse-miettes libère le tout. Ça fuit quand un objet à longue
durée de vie garde la fonction alors que tu n'en as plus besoin : un listener sur
`window`, un `setInterval`, un tableau global.

```js
function ouvrirApercu(fichier) {
  const pixels = decoder(fichier);            // plusieurs Mo
  const redessiner = () => dessiner(pixels);
  window.addEventListener('resize', redessiner);
  // Sans ce nettoyage, `window` garde `redessiner`, qui garde `pixels`.
  return () => window.removeEventListener('resize', redessiner);
}
```

Le remède est lui-même une closure : la fonction renvoyée se souvient de `redessiner`
pour pouvoir le retirer. Même réflexe avec `clearInterval`. Les techniques de
nettoyage sont détaillées dans [Événements du DOM](/web/medior/events) et dans le
comparatif [Fuites mémoire](/compare/memory-leaks).

## Le pont vers les frameworks

Un composant React est une fonction que React rappelle à chaque rendu. Chaque rendu
est donc un nouvel appel, avec sa propre pièce et son propre `count`.

```jsx
function Compteur() {
  const [count, setCount] = useState(0);
  const alerterPlusTard = () => setTimeout(() => alert(count), 3000);

  return (
    <>
      <button onClick={() => setCount(count + 1)}>{count}</button>
      <button onClick={alerterPlusTard}>Alerter dans 3 s</button>
    </>
  );
}
```

Clique sur le second bouton quand le compteur affiche 0, puis incrémente trois fois
dans la foulée : l'alerte affiche `0`. Rien de magique : `count` est une constante du
rendu qui a créé le callback. Les rendus suivants ont créé d'*autres* `count` dans
d'*autres* pièces, mais le timer détient toujours l'ancienne clé, comme tes deux
compteurs indépendants.

Quand cette vieille valeur provoque un bug, on parle de **closure périmée**. Les
remèdes sont dans le comparatif [Closures périmées](/compare/stale-closures) ; côté
React, commence par la mise à jour fonctionnelle de
[State : les bases](/react/junior/state-basics), puis
[useEffectEvent](/react/medior/use-effect-event). Les refs Vue et les signaux Angular
esquivent le piège : la closure y capture une *boîte* (`count.value`, `count()`) dont
elle relit le contenu à chaque appel.

## À retenir

:::cheatsheet
- title: "Portée lexicale"
  desc: "Global, module, fonction, bloc : une variable se lit depuis sa portée et celles qu'elle contient, jamais depuis l'extérieur."
- title: "const par défaut, let sinon, plus de var"
  desc: "let et const respectent les blocs et lèvent une ReferenceError avant leur ligne (TDZ) ; var ne connaît que la fonction et vaut undefined."
- title: "Closure = fonction + environnement"
  desc: "Toute fonction garde l'accès aux variables de l'endroit où elle est née : la variable elle-même, pas une copie."
- title: "Un appel = un environnement neuf"
  desc: "Chaque appel de fonction et chaque tour d'un for avec let crée ses propres variables ; avec var, tous les callbacks partagent la même."
- title: "Mémoire"
  desc: "Une closure vivante retient ce qu'elle utilise : retire tes listeners et arrête tes timers quand tu n'en as plus besoin."
- title: "Rendu React"
  desc: "Chaque rendu est un appel de fonction : ses callbacks voient les valeurs de ce rendu-là, pas celles des suivants."
:::
