---
title: "Accessibilité web : WCAG, ARIA et clavier"
slug: "accessibility"
framework: "web"
level: "senior"
order: 2
duration: 16
prerequisites: ["html-semantics"]
updated: 2026-05-23
seoTitle: "Accessibilité web : WCAG, ARIA, focus et contraste"
seoDescription: "Maîtrise l'arbre d'accessibilité, les bonnes pratiques ARIA, la gestion du focus clavier, name/role/value, le contraste et prefers-reduced-motion, puis teste correctement."
ogVariant: "crimson"
related:
  - { framework: "web", slug: "html-semantics" }
---

## WCAG en bref

Les **WCAG** (Web Content Accessibility Guidelines) sont le référentiel international. Elles s'organisent autour de quatre principes — le mnémonique **POUR** : **P**erceptible, **O**pérable, **U**nderstandable (compréhensible), **R**obuste. Chaque critère a un niveau de conformité : **A** (minimum), **AA** (la cible légale en UE/US, EN 301 549, ADA), **AAA** (rarement exigé globalement).

L'objectif n'est pas de cocher des cases mais de garantir que **tout le monde** — lecteur d'écran, navigation clavier seule, basse vision, troubles cognitifs ou moteurs — peut percevoir, utiliser et comprendre ton interface. La règle d'or qui sous-tend tout : un HTML sémantique correct te donne 80 % de l'accessibilité gratuitement.

## L'arbre d'accessibilité

Le navigateur ne se contente pas de construire le DOM : il en dérive un **arbre d'accessibilité** (accessibility tree), une version simplifiée exposée aux technologies d'assistance (AT) via les API de la plateforme. Chaque nœud y porte un **name**, un **role** et un **state/value**. Un lecteur d'écran ne « voit » pas tes pixels ni tes `<div>` : il lit cet arbre.

C'est pourquoi un `<div onclick>` stylé en bouton est invisible en tant que bouton pour l'AT : il n'a ni rôle `button`, ni nom accessible, ni gestion native du clavier. Le HTML natif, lui, alimente l'arbre automatiquement.

:::callout{type="warn"}
**Première règle d'ARIA : ne pas utiliser ARIA.** Si un élément HTML natif fournit déjà le rôle et le comportement (`<button>`, `<a href>`, `<input>`, `<nav>`, `<dialog>`), utilise-le. Un mauvais ARIA est pire que pas d'ARIA : `role="button"` sur une `<div>` t'oblige à réimplémenter à la main le focus, l'activation clavier (Entrée *et* Espace), l'état désactivé… et la moindre erreur casse l'expérience.
:::

## ARIA : name, role, value

Quand le HTML natif ne suffit pas (widgets composites : onglets, combobox, arbre), ARIA ajoute la sémantique manquante via trois piliers que l'arbre d'accessibilité expose : le **rôle** (`role="tab"`), le **nom** accessible (`aria-label`, `aria-labelledby`, ou le contenu textuel), et la **valeur/état** (`aria-selected`, `aria-expanded`, `aria-checked`).

:::compare
::bad
```html
<div class="btn" onclick="toggleMenu()">Menu</div>

<span class="checkbox" onclick="toggle(this)"></span>
```
::
::good
```html
<button type="button" aria-expanded="false" aria-controls="menu">
  Menu
</button>

<input type="checkbox" id="opt" />
<label for="opt">Recevoir la newsletter</label>
```
::
:::

**Pourquoi.** Une `<div onclick>` apparaît dans l'arbre d'accessibilité **sans aucun rôle interactif** : un lecteur d'écran ne l'annonce pas comme actionnable, elle n'est pas dans l'ordre de tabulation (pas de `tabindex`), et n'écoute ni Entrée ni Espace. Tu devrais ajouter `role`, `tabindex="0"`, des handlers clavier *et* gérer `aria-expanded` à la main. Le `<button>` natif fournit tout cela : rôle `button`, focusable, activable au clavier, et il participe à la soumission de formulaire. Le couple `<input type="checkbox">` + `<label for>` lie programmatiquement le nom au contrôle et expose l'état coché — un lecteur d'écran annonce « Recevoir la newsletter, case à cocher, non cochée ». Reproduire ça en ARIA est faisable mais fragile et inutile ici.

## Focus management et navigation clavier

Tout ce qui est cliquable doit être atteignable et utilisable **au clavier seul** (Tab, Maj+Tab, Entrée, Espace, flèches). Deux pièges majeurs :

- **L'ordre de focus** suit l'ordre du DOM. Évite `tabindex` positif (il casse l'ordre logique) ; n'utilise que `tabindex="0"` (rendre focusable) et `tabindex="-1"` (focusable par script, pas par Tab).
- **Le focus visible** : ne supprime jamais `outline` sans alternative. Utilise `:focus-visible` pour un anneau net sur navigation clavier.

Pour les overlays (modale, menu), tu dois **piéger le focus** dedans, le **restituer** à l'élément déclencheur à la fermeture, et masquer le reste à l'AT (`inert` sur le fond).

```js
function openDialog(dialog, trigger) {
  dialog.showModal();           // <dialog> gère le focus trap natif
  dialog.addEventListener('close', () => {
    trigger.focus();            // restitue le focus au déclencheur
  }, { once: true });
}
```

L'élément `<dialog>` natif gère le piège de focus, la touche Échap et le rôle `dialog` ; préfère-le à une modale maison.

## Contraste et prefers-reduced-motion

**Contraste** : le texte doit atteindre un ratio de **4,5:1** (3:1 pour le grand texte ≥ 24 px ou 18,7 px gras) selon WCAG AA. Les composants d'interface et les états de focus exigent au moins **3:1**. Un texte gris clair « élégant » sur fond blanc est la cause #1 d'échec AA. Ne code jamais une information **uniquement** par la couleur (erreur en rouge sans icône ni texte).

**Mouvement** : respecte la préférence système des utilisateurs sensibles au mouvement (vertiges, troubles vestibulaires).

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Pourquoi.** Une animation parallaxe ou un auto-scroll fluide peut déclencher des nausées chez certains utilisateurs. La media query `prefers-reduced-motion` expose un réglage OS explicite ; l'ignorer rend ton site littéralement inutilisable pour ces personnes. Côté contraste, un ratio insuffisant rend le texte illisible en plein soleil ou pour une basse vision — c'est une barrière perceptuelle, pas un détail esthétique.

## Tester l'accessibilité

Aucun outil automatique ne couvre plus de ~30–40 % des critères WCAG : ils détectent les contrastes, les `alt` manquants, les rôles invalides, mais pas si ton ordre de focus a du sens ni si un nom accessible est *pertinent*. Combine donc trois niveaux :

- **Automatique** : `axe-core` (ou son intégration Lighthouse/Playwright) en CI pour attraper les régressions évidentes.
- **Clavier** : débranche la souris, navigue toute la page au Tab. Tout est-il atteignable ? Le focus est-il visible et logique ? Peux-tu fermer une modale à Échap ?
- **Lecteur d'écran** : teste réellement avec NVDA (Windows), VoiceOver (macOS/iOS) ou TalkBack (Android). Écoute si chaque contrôle annonce un nom, un rôle et un état corrects.

:::callout{type="tip"}
Lance `axe` tôt et en continu : un test Playwright qui exécute `axe.run()` sur tes pages clés bloque les régressions en PR. Mais garde le test manuel clavier comme rituel avant chaque mise en production — c'est lui qui révèle les vrais blocages d'usage.
:::

:::cheatsheet
- title: "HTML d'abord"
  desc: "Élément natif > ARIA. La première règle d'ARIA, c'est ne pas l'utiliser."
- title: "name / role / value"
  desc: "Les trois infos que l'arbre d'accessibilité expose à chaque contrôle."
- title: "Clavier complet"
  desc: "Tab atteint tout, focus visible via :focus-visible, jamais de tabindex positif."
- title: "Focus des overlays"
  desc: "Piège le focus, restitue-le au déclencheur, <dialog> le fait nativement."
- title: "Contraste AA"
  desc: "4,5:1 texte normal, 3:1 grand texte et composants ; jamais la couleur seule."
- title: "Mouvement"
  desc: "Respecte prefers-reduced-motion: reduce pour animations et scroll."
- title: "Tester en 3 couches"
  desc: "axe en CI + parcours clavier + lecteur d'écran réel (NVDA/VoiceOver)."
:::
