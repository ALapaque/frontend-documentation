---
title: "Les formulaires HTML"
slug: "forms"
framework: "web"
level: "junior"
order: 2
duration: 14
prerequisites: ["html-semantics"]
updated: 2026-05-23
seoTitle: "Les formulaires HTML : labels, validation native et FormData"
seoDescription: "Construire des formulaires natifs robustes : association label, validation HTML (required, type, pattern), FormData, preventDefault et accessibilité des erreurs."
ogVariant: "sage"
related:
  - { framework: "web", slug: "html-semantics" }
---

Le formulaire est l'un des plus vieux mécanismes du web, et c'est aussi l'un des plus complets *nativement*. Le navigateur sait déjà associer un label à un champ, valider une adresse e-mail, afficher un message d'erreur localisé, et empaqueter les données pour l'envoi. Avant d'écrire la moindre ligne de JavaScript, demande-toi ce que la plateforme fait déjà pour toi : presque tout.

## Les éléments natifs et leurs types

Un champ n'est pas qu'un `<input>` générique. L'attribut `type` change le clavier mobile affiché, la validation appliquée et l'interface proposée.

```html
<input type="email" />     <!-- clavier @ , validation du format -->
<input type="tel" />       <!-- pavé numérique -->
<input type="url" />       <!-- validation d'URL -->
<input type="number" min="0" max="10" step="1" />
<input type="date" />      <!-- sélecteur de date natif -->
<input type="search" />
<textarea></textarea>
<select><option>…</option></select>
```

Choisir le bon `type` est un acte d'accessibilité et d'ergonomie : `type="email"` sur mobile affiche un clavier avec `@`, et le navigateur refuse de soumettre une valeur mal formée sans une ligne de code de ta part.

## Associer un label à un champ

Tout champ doit avoir un **nom accessible**, et la façon canonique de le donner, c'est le `<label>`. Deux écritures : envelopper le champ, ou relier `for` à l'`id`.

:::compare
::bad
```html
<div>Email</div>
<input type="email" id="email" />
```
::
::good
```html
<label for="email">Email</label>
<input type="email" id="email" name="email" />
<!-- ou : <label>Email <input type="email" name="email" /></label> -->
```
::
:::

**Pourquoi.** Le `<div>Email</div>` est juste du texte voisin : dans l'arbre d'accessibilité, l'`<input>` n'a aucun nom, un lecteur d'écran annonce « zone de saisie » sans dire de quoi il s'agit. Le `<label for>` crée un lien explicite : le navigateur l'utilise comme *accessible name* du champ, **et** agrandit la zone cliquable (cliquer le label place le focus dans le champ — précieux pour les cases à cocher et sur mobile). Le besoin (identifier le champ pour tous, pointeur et clavier) est porté par la relation label↔input, pas par la proximité visuelle.

## La validation native

Le navigateur valide pour toi via des attributs déclaratifs : `required`, `type`, `min`/`max`, `minlength`/`maxlength`, `pattern` (une regex). Quand la contrainte échoue, la soumission est bloquée et un message localisé apparaît, sans JavaScript.

```html
<form>
  <label for="pseudo">Pseudo</label>
  <input id="pseudo" name="pseudo" required minlength="3"
         pattern="[a-z0-9_]+" />

  <label for="age">Âge</label>
  <input id="age" name="age" type="number" min="18" required />

  <button>Créer le compte</button>
</form>
```

:::callout{type="info"}
Tu peux personnaliser l'apparence des champs invalides avec les pseudo-classes CSS `:invalid`, `:valid` et surtout `:user-invalid` (qui ne s'active qu'**après** une interaction de l'utilisateur, pour ne pas crier au rouge dès l'affichage). Pour un message sur mesure, l'API `setCustomValidity()` injecte ton texte dans le mécanisme natif.
:::

## Récupérer les données : FormData

Un `<form>` correctement nommé (`name` sur chaque champ) se sérialise tout seul. L'objet `FormData` lit le formulaire et expose les paires clé/valeur, prêtes pour `fetch`.

```js
const form = document.querySelector("form");

form.addEventListener("submit", (e) => {
  e.preventDefault();          // on gère l'envoi nous-mêmes
  const data = new FormData(form);
  const valeurs = Object.fromEntries(data); // { pseudo: "…", age: "…" }
  // FormData est directement acceptable comme body d'un fetch
  // fetch("/api", { method: "POST", body: data });
});
```

## submit et preventDefault

L'événement `submit` se déclenche **sur le `<form>`**, pas sur le bouton. Par défaut, il recharge ou change de page (comportement historique). En appelant `e.preventDefault()`, tu annules cette navigation pour traiter les données en JavaScript. Point clé : la validation native s'exécute *avant* l'événement `submit` ; si un champ `required` est vide, `submit` n'est jamais émis. C'est pour cela qu'écouter `submit` (et non le `click` du bouton) te garantit des données déjà validées par la plateforme.

## Accessibilité des erreurs

Une erreur affichée visuellement mais absente de l'arbre d'accessibilité n'existe pas pour un lecteur d'écran. Trois attributs la rendent perceptible : `aria-invalid="true"` sur le champ fautif, `aria-describedby` qui pointe vers l'`id` du message, et un conteneur en `aria-live="polite"` pour annoncer les erreurs dynamiques.

```html
<label for="mail">Email</label>
<input id="mail" name="mail" type="email"
       aria-invalid="true" aria-describedby="mail-err" />
<p id="mail-err" role="alert">Format d'adresse invalide.</p>
```

## Pourquoi privilégier le natif

Réimplémenter la validation, le focus du premier champ invalide, les messages localisés et le clavier mobile en JavaScript, c'est des centaines de lignes à maintenir et à tester sur chaque navigateur. La plateforme l'a déjà fait, traduit dans toutes les langues, et le maintient. Pars du formulaire natif, puis enrichis seulement ce qui manque (validation asynchrone côté serveur, messages sur mesure). Le natif est ton socle, pas ton fallback.

:::callout{type="tip"}
Garde toujours `<button type="submit">` (le défaut) pour l'action principale et `type="button"` pour les boutons secondaires : un bouton sans `type` dans un formulaire soumet le formulaire, ce qui provoque des soumissions accidentelles.
:::

## À retenir

:::cheatsheet
- title: "label for / id"
  desc: "Donne un nom accessible au champ et agrandit la zone cliquable."
- title: "Le bon type"
  desc: "email, tel, number… : clavier mobile adapté + validation gratuite."
- title: "Validation native"
  desc: "required, pattern, min/max bloquent la soumission sans JS, messages localisés."
- title: "submit + preventDefault"
  desc: "L'event part du form, après la validation native ; preventDefault pour gérer soi-même."
- title: "FormData"
  desc: "Sérialise le form ; utilisable tel quel comme body de fetch."
- title: "Erreurs accessibles"
  desc: "aria-invalid + aria-describedby + role=alert / aria-live."
:::
