---
title: "Invoker Commands : agir sans JavaScript"
slug: "invoker-commands"
framework: "web"
level: "medior"
order: 9
duration: 13
prerequisites: ["html-semantics"]
updated: 2026-07-09
seoTitle: "Invoker Commands API — command et commandfor pour piloter l'UI en HTML"
seoDescription: "Les attributs command et commandfor : ouvrir un dialog, basculer un popover ou déclencher une action déclarativement, sans gestionnaire de clic. Commandes intégrées, commandes personnalisées et CommandEvent."
ogVariant: "iris"
related:
  - { framework: "web", slug: "popover-dialog" }
  - { framework: "web", slug: "events" }
---

Un pattern revient dans presque toutes les interfaces : **un bouton pilote un autre élément**. Ouvrir une modale, fermer un popover, basculer un panneau, déclencher une action sur une carte. Pendant des années, ce câblage passait invariablement par du JavaScript : sélectionner le bouton, sélectionner la cible, poser un `addEventListener('click', …)`, appeler la bonne méthode, puis penser à `aria-expanded`, au focus, à la touche `Échap`. Beaucoup de code de plomberie pour relier deux éléments qui se voient déjà dans le HTML.

Les **Invoker Commands** (baseline 2026) suppriment cette plomberie. Deux attributs, `command` et `commandfor`, décrivent la relation directement dans le balisage. Le navigateur se charge du reste — y compris l'accessibilité. Et pour tes propres composants, un `CommandEvent` prend le relais sans que tu réécrives le câblage à la main.

## `command` et `commandfor` : le câblage dans le HTML

Un invoker est un `<button>` qui porte deux attributs : `commandfor` désigne l'`id` de l'élément à piloter, et `command` nomme l'action à exécuter sur cet élément.

```html
<button command="show-modal" commandfor="confirm">Supprimer</button>

<dialog id="confirm">
  <p>Confirmer la suppression ?</p>
  <button command="close" commandfor="confirm">Annuler</button>
</dialog>
```

Aucun `<script>`. Le clic sur le premier bouton ouvre le dialog en modal, le clic sur le second le ferme. C'est la même idée que `popovertarget`, généralisée à d'autres actions que l'ouverture d'un popover.

Le navigateur ne fait pas que déclencher l'action : il **câble aussi l'arbre d'accessibilité**. Sur un invoker de popover, il pose `aria-expanded` et `aria-details` tout seul, exactement comme `popovertarget`. Tu n'écris pas ces attributs ARIA — et surtout, tu ne les oublies pas.

:::callout{type="tip"}
`command`/`commandfor` ne fonctionnent que sur un `<button>` (ou `<input type="button">`). Garde un vrai bouton : il apporte gratuitement le rôle, la focusabilité, l'activation clavier (`Entrée`/`Espace`) et l'état. Une `<div>` cliquable perd tout ça et n'active aucune commande.
:::

## Les commandes intégrées

Le navigateur reconnaît un jeu fixe de commandes pour les éléments natifs qui en ont besoin. Inutile de les inventer : seules ces valeurs déclenchent un comportement intégré.

Pour l'élément **`<dialog>`** :

- `show-modal` — ouvre le dialog en modal (équivaut à `dialog.showModal()`).
- `close` — ferme le dialog (équivaut à `dialog.close()`).
- `request-close` — demande la fermeture. Comme `dialog.requestClose()`, un événement `cancel` est émis **avant** la fermeture, ce qui te laisse l'annuler (par exemple pour confirmer une saisie non enregistrée).

Pour un élément **popover** :

- `toggle-popover` — bascule l'affichage.
- `show-popover` — affiche.
- `hide-popover` — masque.

La différence avec le JavaScript classique est structurelle : la commande est active dès le parsing du HTML, sans attendre le téléchargement ni l'exécution d'un script.

:::compare
::bad
```html
<!-- câblage manuel : sélection, écouteur, méthode, à répéter -->
<button id="open">Ouvrir</button>
<dialog id="confirm">…</dialog>
<script>
  const dlg = document.getElementById('confirm');
  document.getElementById('open')
    .addEventListener('click', () => dlg.showModal());
  // + gérer aria-expanded, le focus retour, Échap… à la main
</script>
```
::
::good
```html
<!-- déclaratif : la relation est dans le balisage, a11y câblée -->
<button command="show-modal" commandfor="confirm">Ouvrir</button>
<dialog id="confirm">…</dialog>
```
::
:::

## Les commandes personnalisées : le préfixe `--`

Le vrai gain arrive avec **tes propres composants**. Une commande personnalisée est n'importe quel nom **préfixé par deux tirets** : `command="--like"`, `command="--rotate-left"`. Ce préfixe `--` est obligatoire — il évite toute collision avec les commandes intégrées présentes ou futures. Sans lui, le navigateur ne reconnaît que le jeu natif et ignore une valeur inconnue.

Une commande personnalisée n'a **aucun comportement par défaut**. À la place, l'invocation émet un **`CommandEvent`** (type d'événement `"command"`) sur l'élément **cible**, celui désigné par `commandfor`. Tu écoutes cet événement une seule fois sur la cible, et le HTML reste entièrement déclaratif.

```html
<article id="post-42" data-id="42">
  <p>Contenu du post…</p>
  <button command="--like" commandfor="post-42" aria-pressed="false">
    J'aime
  </button>
</article>
```

```ts
const post = document.getElementById('post-42')!;

post.addEventListener('command', (event: CommandEvent) => {
  if (event.command !== '--like') return;

  const btn = event.source;              // le <button> déclencheur
  const liked = toggleLike(post.dataset.id!);
  btn.setAttribute('aria-pressed', String(liked));
});
```

Deux propriétés portent tout le contexte :

- **`event.command`** — la chaîne exacte invoquée (`"--like"`). Un `switch` dessus route plusieurs actions vers un seul écouteur.
- **`event.source`** — l'élément `<button>` qui a déclenché la commande. Utile pour mettre à jour son état (`aria-pressed`) sans le resélectionner.

Note que la cible d'une commande personnalisée n'a pas besoin d'être interactive : ici c'est un `<article>`. L'invoker, lui, reste toujours un `<button>`.

:::callout{type="info"}
Pour les commandes **intégrées**, le `CommandEvent` est émis **avant** l'action native et il est annulable : `event.preventDefault()` bloque le comportement par défaut. Tu peux ainsi intercepter un `close` pour retenir la fermeture d'un dialog selon une condition, tout en gardant l'invocation déclarative.
:::

## Pourquoi c'est mieux que le JS de câblage

Le bénéfice n'est pas cosmétique. Il tient à quatre points concrets :

- **Moins de JavaScript de plomberie.** Plus de `getElementById` + `addEventListener` répétés pour chaque paire bouton/cible. Le JS ne garde que la logique métier (`toggleLike`), pas le câblage.
- **Accessibilité correcte par défaut.** Sur les commandes intégrées, le navigateur gère `aria-expanded`, le focus et l'activation clavier — les détails que le câblage maison oublie le plus souvent.
- **Cohérence avec le natif.** `command`/`commandfor` prolongent le modèle de `popovertarget`, `<dialog>` et la Popover API. Un seul vocabulaire déclaratif pour piloter l'UI.
- **Dégradation propre.** Un vieux moteur qui ne connaît pas ces attributs les ignore : le bouton reste un bouton focusable, il n'active simplement rien. Si ta cible inclut l'historique lointain, prévois un repli JS ; pour un projet evergreen 2026, le natif suffit.

Détail qui pèse à l'échelle : l'événement `command` **remonte** (il fait du *bubbling*). Un écouteur unique posé haut dans le document capte donc les invocations de tous les composants, y compris ceux ajoutés au DOM après coup — pas besoin de réexécuter une fonction de câblage à chaque insertion, comme le voudrait un `addEventListener('click')` posé par composant.

## Interaction avec la Popover API

Les Invoker Commands et la [Popover API](/web/medior/popover-dialog) se recouvrent en partie. Pour un simple popover, `popovertarget` reste le raccourci le plus court :

```html
<button popovertarget="menu">Options</button>
<div id="menu" popover>…</div>
```

`command="toggle-popover"` fait la même chose. Quand choisir l'un plutôt que l'autre ?

- **`popovertarget`** est spécifique aux popovers et suffit tant que tu ne fais que les afficher/masquer.
- **`command`/`commandfor`** couvre un spectre plus large : dialog, popover **et** tes commandes personnalisées, avec un vocabulaire unique. Dès qu'un composant mélange popover et actions métier, `command` évite de jongler entre deux attributs.

Pour le mécanisme du top-layer, de `::backdrop`, du focus trap et de l'attribut `closedby`, l'article [Popover API et dialog](/web/medior/popover-dialog) détaille le socle sur lequel ces commandes s'appuient.

## À retenir

Les Invoker Commands rendent déclaratif le pattern « un bouton pilote un autre élément ». `command` + `commandfor` remplacent le `addEventListener` de câblage pour les éléments natifs, et le `CommandEvent` fait de même pour tes composants. Moins de JS de plomberie, une accessibilité câblée par le moteur, et une dégradation douce là où le natif n'est pas reconnu.

:::cheatsheet
- title: "command + commandfor"
  desc: "Sur un <button> : commandfor pointe l'id cible, command nomme l'action."
- title: "Commandes dialog"
  desc: "show-modal, close, request-close (émet cancel avant fermeture)."
- title: "Commandes popover"
  desc: "toggle-popover, show-popover, hide-popover."
- title: "Commande personnalisée"
  desc: "Préfixe obligatoire -- (ex. --like). Aucun comportement par défaut."
- title: "CommandEvent"
  desc: "Événement 'command' émis sur la cible ; il remonte (bubbling)."
- title: "event.command / event.source"
  desc: "La chaîne invoquée et le <button> déclencheur."
- title: "preventDefault()"
  desc: "Annule l'action native d'une commande intégrée avant qu'elle s'exécute."
- title: "Accessibilité"
  desc: "aria-expanded/aria-details câblés par le navigateur sur les commandes natives."
- title: "Baseline 2026"
  desc: "Chrome 135, Firefox 144, Safari 26.2. Dégrade en bouton inerte sinon."
:::
