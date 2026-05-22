---
title: "Teleport"
slug: "teleport"
framework: "vue"
level: "medior"
order: 9
duration: 10
prerequisites: ["template-syntax"]
updated: 2026-05-22
seoTitle: "Vue Teleport — modales, tooltips hors flux"
seoDescription: "<Teleport> : rendre un fragment ailleurs dans le DOM (body) tout en gardant la logique dans le composant."
ogVariant: "gold"
related:
  - { framework: "react", slug: "refs-dom" }
  - { framework: "angular", slug: "cva" }
---

## Le problème : un fragment prisonnier de son parent

Une modale ou un tooltip déclarés au fond de l'arbre héritent du contexte de leur
parent DOM : `overflow: hidden` les coupe, un `z-index` voisin les passe dessous,
un `transform` crée un contexte d'empilement qui casse `position: fixed`. La
logique appartient pourtant au composant local.

`<Teleport>` résout exactement ça : il déplace le **rendu DOM** vers une autre
cible (souvent `<body>`), hors des contraintes du parent.

```vue
<template>
  <button @click="open = true">Ouvrir</button>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay">
      <div class="modal">…<button @click="open = false">Fermer</button></div>
    </div>
  </Teleport>
</template>
```

## Cibler une destination

`to` accepte un sélecteur CSS ou un élément DOM. La cible doit exister au moment
du montage. `<body>` est le choix par défaut : racine d'empilement neutre.

```vue
<Teleport to="#modal-root">…</Teleport>
```

:::callout{type="tip"}
`:disabled` désactive le teleport à la volée : le contenu est rendu sur place,
dans le template d'origine. Pratique pour ne téléporter qu'au-dessus d'un
breakpoint ou pour rendre côté serveur sans cible disponible.
:::

```vue
<Teleport to="body" :disabled="isMobile">…</Teleport>
```

## Plusieurs teleports, une seule cible

Plusieurs `<Teleport>` peuvent viser la même destination : leur contenu s'empile
dans l'ordre de montage. Utile pour une pile de modales ou de toasts.

```vue
<Teleport to="#toasts"><Toast :msg="a" /></Teleport>
<Teleport to="#toasts"><Toast :msg="b" /></Teleport>
```

## Sans Teleport vs avec

:::compare
::bad
```vue
<!-- Card.vue : overflow:hidden coupe la modale -->
<div class="card" style="overflow: hidden">
  <div v-if="open" class="modal">Coupée par le parent</div>
</div>
```
::
::good
```vue
<div class="card" style="overflow: hidden">
  <Teleport to="body">
    <div v-if="open" class="modal">Rendue dans body, hors clip</div>
  </Teleport>
</div>
```
::
:::

**Pourquoi** : `overflow: hidden` (comme `transform`, `filter` ou `contain`) sur un ancêtre établit un contexte de découpe et d'empilement qui s'applique à tous les descendants, y compris une modale en `position: fixed`. Téléporter le nœud sous `<body>` le sort de cet ancêtre : il n'hérite plus de son clipping ni de son `z-index`, et `fixed` se positionne enfin par rapport au viewport.

### Idée reçue : « Teleport déplace la logique du composant »

Non. `<Teleport>` ne déplace **que la position du rendu dans le DOM**. Le
composant reste exactement au même endroit dans l'arbre de composants Vue :
l'état réactif, les props, les `provide`/`inject`, les événements et les
écouteurs continuent de vivre dans le composant d'origine. Un `@click` sur le
contenu téléporté remonte dans la hiérarchie logique, pas dans la hiérarchie DOM
de la cible. Tu pilotes une modale dans `<body>` avec un `ref` déclaré dans ton
composant, sans aucun store ni event bus.

:::cheatsheet
- title: "to=\"body\""
  desc: "Cible la racine d'empilement pour échapper overflow/z-index/transform."
- title: ":disabled"
  desc: "Bascule le rendu sur place sans changer le code logique."
- title: "Cibles partagées"
  desc: "Plusieurs Teleport empilent leur contenu dans l'ordre de montage."
- title: "Logique inchangée"
  desc: "Seul le DOM bouge ; state, events et inject restent locaux."
:::
