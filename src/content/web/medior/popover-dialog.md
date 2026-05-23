---
title: "Popover API et dialog"
slug: "popover-dialog"
framework: "web"
level: "medior"
order: 7
duration: 15
prerequisites: ["html-semantics"]
updated: 2026-05-23
seoTitle: "Popover API, dialog et Invoker Commands — overlays natifs sans JS"
seoDescription: "Construire des overlays accessibles en HTML natif : l'attribut popover (auto/manual), popovertarget, le top-layer qui tue le z-index, dialog/showModal/::backdrop/closedby, et les Invoker Commands command/commandfor baseline 2026 pour piloter sans JavaScript."
ogVariant: "gold"
related:
  - { framework: "web", slug: "html-semantics" }
---

Pendant des années, le moindre menu, tooltip ou modale impliquait une `<div>` custom, une montagne de JavaScript pour l'ouverture/fermeture, un `z-index` toujours trop bas, et un *focus trap* fait main qu'on oubliait de tester au clavier. La plateforme a rattrapé tout ça : la **Popover API**, l'élément **`<dialog>`** et les **Invoker Commands** couvrent désormais ces besoins **nativement**, avec une accessibilité câblée par le navigateur. Moins de code, et surtout du code correct par défaut.

Ouvre, ferme, navigue au clavier : la démo ci-dessous est un popover 100 % natif, sans une ligne de JS.

:::demo{kind="popover"}
:::

## La Popover API : `popover` + `popovertarget`

Un overlay léger (menu, tooltip, *disclosure*) se déclare en deux attributs HTML. L'élément à révéler porte `popover` ; le bouton qui le pilote porte `popovertarget` pointant sur son `id`.

```html
<button popovertarget="menu">Options</button>

<div id="menu" popover>
  <a href="/profil">Profil</a>
  <a href="/logout">Déconnexion</a>
</div>
```

Aucun JS. Le bouton bascule automatiquement la visibilité, et le navigateur câble la relation déclencheur/cible dans l'arbre d'accessibilité (`aria-expanded`, `aria-details`) sans que tu écrives un seul attribut ARIA.

Deux types existent, et le choix change le comportement :

- **`popover="auto"`** (la valeur par défaut, on peut écrire juste `popover`) : c'est un overlay **light-dismiss**. Il se ferme tout seul au clic à l'extérieur, à la touche `Échap`, et un autre popover `auto` qui s'ouvre ferme le précédent. Idéal pour menus et tooltips.
- **`popover="manual"`** : aucune fermeture automatique. Il ne disparaît que si tu le demandes explicitement (`popovertargetaction="hide"`, un command, ou `el.hidePopover()`). Pour des notifications/toasts qui ne doivent pas s'évanouir au premier clic ailleurs.

:::callout{type="tip"}
Tu peux préciser l'action du bouton avec `popovertargetaction="show | hide | toggle"`. Sans elle, c'est `toggle`. Pratique pour mettre un bouton « Fermer » **à l'intérieur** du popover : `<button popovertarget="menu" popovertargetaction="hide">Fermer</button>`.
:::

## Le top-layer : la fin de la guerre du `z-index`

Le vrai changement de mécanisme est invisible dans le HTML : un popover (et un `<dialog>` modal) est promu dans le **top-layer**, une couche de rendu **au-dessus de tout le document**, hors du flux normal et hors de tout contexte d'empilement.

:::compare
::bad
```css
/* div custom : on surenchérit le z-index à l'aveugle,
   et ça casse dès qu'un ancêtre crée un stacking context */
.modal { position: fixed; z-index: 9999; }
.header { position: sticky; z-index: 10; transform: translateZ(0); }
/* la modale passe DERRIÈRE le header : transform a créé un
   contexte d'empilement qui plafonne le 9999 de l'enfant */
```
::
::good
```html
<!-- top-layer natif : aucun z-index, jamais clippé par overflow,
     toujours au-dessus, indépendant des stacking contexts -->
<dialog id="m">…</dialog>
<button command="show-modal" commandfor="m">Ouvrir</button>
```
::
:::

**Pourquoi.** Le `z-index` n'est **pas global** : il ne classe les éléments que **dans le même contexte d'empilement** (*stacking context*). Or `transform`, `filter`, `opacity < 1`, `will-change`, `contain` et bien d'autres en créent un nouveau. Dès qu'un ancêtre de ta modale est dans un tel contexte, le `z-index: 9999` de la modale n'est comparé qu'aux frères *à l'intérieur* de ce contexte — il ne peut plus dépasser un sibling de l'ancêtre, peu importe sa valeur. Le top-layer contourne le problème à la racine : l'élément est **extrait** de la hiérarchie d'empilement du document et peint en dernier, par-dessus tout, sans jamais être rogné par un `overflow: hidden` parent. C'est structurellement impossible à reproduire avec du `z-index`, d'où l'échec systématique des div custom.

## L'élément `<dialog>` : la modale, pour de vrai

Pour une vraie modale (qui bloque l'interaction avec le reste de la page), `<dialog>` est l'outil dédié. La méthode `showModal()` fait trois choses qu'une `<div>` ne fait pas gratuitement :

```js
const dlg = document.querySelector('dialog');
dlg.showModal();   // 1. top-layer  2. ::backdrop  3. focus trap + inert du reste
dlg.close('ok');   // ferme et renseigne dlg.returnValue = "ok"
```

1. **Promotion top-layer** (voir ci-dessus).
2. Un pseudo-élément **`::backdrop`** apparaît automatiquement derrière la modale, stylable en CSS, pour assombrir/flouter le fond.
3. Le **focus trap natif** : le navigateur rend le reste du document `inert` (non focusable, ignoré par les lecteurs d'écran) et confine `Tab`/`Shift+Tab` à l'intérieur du dialog. `Échap` ferme. Tout ça sans une ligne de JS d'accessibilité.

```css
dialog::backdrop {
  background: rgb(0 0 0 / 0.5);
  backdrop-filter: blur(2px);
}
```

L'attribut **`closedby`** (baseline 2026) déclare la stratégie de fermeture directement en HTML, alignant `<dialog>` sur le light-dismiss des popovers :

- `closedby="any"` : ferme au clic extérieur **et** à `Échap` (comme `popover=auto`).
- `closedby="closerequest"` : ferme seulement sur une « demande de fermeture » (`Échap`, bouton système).
- `closedby="none"` : aucune fermeture implicite, même pas `Échap`.

```html
<dialog closedby="any">
  <form method="dialog">
    <p>Supprimer cet élément ?</p>
    <button value="cancel">Annuler</button>
    <button value="confirm">Supprimer</button>
  </form>
</dialog>
```

:::callout{type="info"}
`<form method="dialog">` ferme le `<dialog>` à la soumission **sans envoyer de requête** et stocke la `value` du bouton pressé dans `dialog.returnValue`. C'est le moyen natif de récupérer le choix de l'utilisateur (confirmer/annuler) sans gestionnaire d'événement.
:::

## Invoker Commands : piloter sans JavaScript

Nouveauté **baseline 2026**, les **Invoker Commands** généralisent l'idée de `popovertarget` à n'importe quelle action. Un bouton porte `command` (l'action) et `commandfor` (l'`id` de la cible) :

```html
<button command="show-modal" commandfor="confirm">Supprimer</button>
<button command="close"      commandfor="confirm">Annuler</button>
<dialog id="confirm">…</dialog>

<button command="toggle-popover" commandfor="menu">Menu</button>
<div id="menu" popover>…</div>
```

Les commandes natives couvrent `show-modal`, `close`, `request-close`, `show-popover`, `hide-popover`, `toggle-popover`. Tu n'écris **aucun** `addEventListener`. Et pour tes propres composants, les commandes personnalisées (préfixées `--`, ex. `command="--lire-audio"`) déclenchent un événement `CommandEvent` que tu écoutes une seule fois — le HTML reste déclaratif, le JS ne gère que la logique métier.

:::callout{type="tip"}
Mets toujours tes invokers dans un `<button>`, jamais une `<div>` cliquable. Le `<button>` apporte gratuitement le rôle, la focusabilité, l'activation au clavier (`Entrée`/`Espace`) et l'état. `command`/`commandfor` ne fonctionnent d'ailleurs que sur des éléments bouton.
:::

## Pourquoi le natif bat la div custom

:::compare
::bad
```html
<!-- modale "maison" : 40 lignes de JS pour réimplémenter
     (mal) ce que le navigateur offre déjà -->
<div class="modal" role="dialog" aria-modal="true" tabindex="-1">…</div>
<script>
  // gérer Échap, le clic backdrop, le focus trap Tab/Shift+Tab,
  // rendre le fond inert, restaurer le focus à la fermeture,
  // empiler le z-index… et oublier la moitié des cas clavier
</script>
```
::
::good
```html
<dialog id="m" closedby="any">…</dialog>
<button command="show-modal" commandfor="m">Ouvrir</button>
<!-- top-layer, ::backdrop, focus trap, inert, Échap, a11y : natif -->
```
::
:::

**Pourquoi.** Une `<div>` custom doit **réimplémenter à la main** trois choses que le moteur fournit nativement, et que presque personne ne réussit complètement. **(1) Le top-layer** : la div reste prisonnière des stacking contexts et de l'`overflow` de ses ancêtres — `<dialog>.showModal()` la promeut au-dessus de tout, structurellement. **(2) Le focus** : `showModal()` piège `Tab` dans la modale, rend le reste de la page `inert` (invisible au lecteur d'écran et non focusable) et restaure le focus sur le déclencheur à la fermeture ; en JS, ces trois étapes sont longues à écrire et faciles à casser. **(3) L'accessibilité** : le navigateur expose le rôle `dialog`, l'état modal et la relation déclencheur/cible dans l'arbre d'accessibilité automatiquement, là où la div oblige à câbler manuellement `role`, `aria-modal`, `aria-expanded` et le reste — souvent à moitié, donc cassé pour les utilisateurs de lecteurs d'écran. Le natif n'est pas « plus simple » par confort : il est **plus correct**, parce que la conformité est dans le moteur, pas dans ton code.

:::cheatsheet
- title: "popover (auto)"
  desc: "Overlay light-dismiss : ferme au clic extérieur, Échap, ou ouverture d'un autre."
- title: "popover=manual"
  desc: "Ne ferme jamais tout seul ; fermeture explicite uniquement (toasts)."
- title: "popovertarget"
  desc: "Sur un button : pilote la cible. popovertargetaction = show/hide/toggle."
- title: "dialog.showModal()"
  desc: "Top-layer + ::backdrop + focus trap + reste de la page inert."
- title: "::backdrop"
  desc: "Pseudo-élément stylable derrière une modale (overlay, blur)."
- title: "closedby"
  desc: "any (clic+Échap) / closerequest (Échap) / none. Light-dismiss déclaratif."
- title: "command / commandfor"
  desc: "Invoker baseline 2026 : show-modal, close, toggle-popover… sans JS."
- title: "form method=dialog"
  desc: "Ferme le dialog sans requête ; le button value alimente returnValue."
:::

## Support 2026

En mai 2026, la **Popover API** et **`<dialog>`** (avec `showModal()` et `::backdrop`) sont **baseline** sur tous les navigateurs evergreen depuis plusieurs versions. Les **Invoker Commands** (`command`/`commandfor`) et l'attribut **`closedby`** ont atteint le statut **baseline 2026** : utilisables sans polyfill sur Chrome, Edge, Safari et Firefox à jour.

La dégradation est douce par construction. Sur un très vieux moteur, un `[popover]` non reconnu reste un simple élément visible (prévois un `[popover] { display: none }` de secours si besoin), et un `command`/`commandfor` ignoré n'active rien — d'où l'intérêt de garder `<dialog>` + `showModal()` accessible aussi via une petite ligne de JS de repli si ta cible inclut l'historique lointain. Pour un projet 2026 visant l'evergreen, tu peux t'appuyer entièrement sur le natif.
