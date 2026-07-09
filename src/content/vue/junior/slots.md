---
title: "Les slots : composer par le contenu"
slug: "slots"
framework: "vue"
level: "junior"
order: 7
duration: 14
prerequisites: ["components-props"]
updated: 2026-07-09
seoTitle: "Slots Vue — slot par défaut, slots nommés et scoped slots expliqués"
seoDescription: "Comprendre les slots Vue : slot par défaut, contenu de repli, slots nommés (v-slot / #), scoped slots pour remonter des données du composant enfant au parent, et $slots pour le rendu conditionnel."
ogVariant: "sage"
related:
  - { framework: "vue", slug: "components-props" }
  - { framework: "vue", slug: "script-setup" }
---

Les props transmettent des *données* : un texte, un nombre, un objet. Mais dès qu'un composant doit accueillir du *balisage* — un titre en `<h2>`, une liste de boutons, un fragment de template entier — les props montrent leurs limites. Passer du HTML dans une chaîne de caractères oblige à `v-html`, casse la réactivité et ouvre une faille XSS. Ce n'est pas la bonne porte d'entrée.

Les slots sont cette porte. Un slot est un emplacement que l'enfant réserve dans son template, et que le parent remplit avec le contenu de son choix. L'enfant décide *où* le contenu s'affiche et l'entoure de sa structure ; le parent décide *quoi* afficher. Cette séparation est ce qui rend un composant réellement réutilisable : la même `<Card>` sert à une facture, un profil ou une alerte, sans rien changer à son code.

## Le slot par défaut

Dans l'enfant, `<slot />` marque l'emplacement. Tout ce que le parent place entre les balises du composant vient s'y insérer.

```vue
<!-- Card.vue -->
<template>
  <article class="card">
    <slot />
  </article>
</template>
```

```vue
<!-- Parent.vue -->
<script setup>
import Card from './Card.vue'
</script>

<template>
  <Card>
    <h2>Facture #1042</h2>
    <p>Montant : 320 €</p>
  </Card>
</template>
```

Le `<article class="card">` est la structure fixe que `Card` apporte toujours. Le `<h2>` et le `<p>` sont le contenu variable, injecté par le parent à l'endroit du `<slot />`. L'enfant n'a aucune idée de ce qu'il rend : il fournit un cadre, pas un contenu. C'est exactement ce qui le rend générique.

## Le contenu de repli

Un slot peut proposer un contenu par défaut, affiché uniquement si le parent ne fournit rien. Il suffit de placer ce contenu entre les balises `<slot>` et `</slot>`.

```vue
<!-- Card.vue -->
<template>
  <article class="card">
    <slot>Aucun contenu à afficher.</slot>
  </article>
</template>
```

Si le parent écrit `<Card />` sans rien à l'intérieur, le texte de repli apparaît. Dès qu'il fournit du contenu, ce dernier remplace intégralement le repli. Utile pour un état vide, un libellé par défaut ou un placeholder — le composant reste utilisable même mal renseigné, sans afficher une zone vide déroutante.

## Les slots nommés

Un slot par défaut suffit pour une seule zone. Mais une mise en page a souvent plusieurs emplacements distincts : un en-tête, un corps, un pied. On les distingue par un `name`.

```vue
<!-- Layout.vue -->
<template>
  <div class="layout">
    <header><slot name="header" /></header>
    <main><slot /></main>
    <footer><slot name="footer" /></footer>
  </div>
</template>
```

Côté parent, chaque zone se cible avec `<template #header>`. Le `#` est la syntaxe raccourcie de `v-slot:header` — les deux sont strictement équivalents, mais `#` est la forme moderne à privilégier.

```vue
<!-- Parent.vue -->
<template>
  <Layout>
    <template #header>
      <h1>Tableau de bord</h1>
    </template>

    <p>Contenu principal, dans le slot par défaut.</p>

    <template #footer>
      <small>© 2026</small>
    </template>
  </Layout>
</template>
```

Le contenu sans `<template>` explicite atterrit dans le slot par défaut (le `<slot />` sans nom). L'ordre des `<template>` dans le parent n'a aucune importance : c'est le `name` qui décide de la destination, pas la position. L'enfant garde donc la maîtrise totale de la disposition.

## Les scoped slots : inverser le contrôle

Jusqu'ici le flux est à sens unique : le parent envoie du markup vers le bas. Les scoped slots ajoutent le chemin inverse — l'enfant peut *remonter des données* au contenu que le parent lui a confié. On lie ces données au `<slot>` comme des props.

```vue
<!-- Liste.vue -->
<script setup>
defineProps({ items: Array })
</script>

<template>
  <ul>
    <li v-for="(item, i) in items" :key="item.id">
      <slot :item="item" :index="i" />
    </li>
  </ul>
</template>
```

Le parent récupère ces valeurs en déstructurant l'objet de slot avec `#default="{ item, index }"` :

```vue
<!-- Parent.vue -->
<script setup>
import Liste from './Liste.vue'
const users = [
  { id: 1, nom: 'Ada' },
  { id: 2, nom: 'Alan' },
]
</script>

<template>
  <Liste :items="users">
    <template #default="{ item, index }">
      <strong>{{ index + 1 }}.</strong> {{ item.nom }}
    </template>
  </Liste>
</template>
```

**Pourquoi c'est le point clé.** Il y a ici une inversion de contrôle. `Liste` possède toute la *logique* : l'itération `v-for`, la structure `<ul>`/`<li>`, plus tard le tri, la pagination ou le chargement. Mais elle ignore totalement à quoi ressemble un élément. Le parent, lui, ne gère ni la boucle ni la structure : il reçoit chaque `item` et décide seulement de son *rendu*. La responsabilité est coupée en deux au bon endroit — mécanique d'un côté, présentation de l'autre.

Concrètement, la même `<Liste>` affiche une ligne de tableau, une carte utilisateur ou une simple puce, sans qu'on touche à son code. Sans scoped slot, il faudrait soit dupliquer la logique d'itération dans chaque écran, soit noyer le composant sous des props de configuration (`renderMode`, `showAvatar`, `labelKey`…) qui ne couvriront jamais tous les cas.

:::callout{type="tip"}
`#default="{ item }"` déstructure l'objet passé au slot. Sans déstructurer, `#default="slotProps"` donne accès à `slotProps.item` — pratique quand les clés sont nombreuses.
:::

C'est précisément ce mécanisme qui fonde les composants dits *renderless* ou *headless* : un composant qui n'affiche aucun markup propre, expose sa logique (état, événements, données) via un scoped slot, et laisse 100 % du rendu au parent. La logique devient réutilisable indépendamment du style.

## Tester la présence d'un slot avec $slots

Parfois l'enfant veut adapter sa structure selon que le parent a rempli un slot ou non — par exemple n'afficher le `<footer>` que s'il y a un pied à montrer. L'objet `$slots` liste les slots effectivement fournis ; on l'interroge avec `v-if`.

```vue
<!-- Card.vue -->
<template>
  <article class="card">
    <div class="corps"><slot /></div>
    <footer v-if="$slots.footer" class="pied">
      <slot name="footer" />
    </footer>
  </article>
</template>
```

Si le parent ne fournit pas de `#footer`, `$slots.footer` est `undefined` et le `<footer>` entier disparaît — pas de bordure ni de marge d'un conteneur vide. C'est plus fiable qu'un contenu de repli : ici on supprime *le contour lui-même*, pas seulement ce qu'il y a dedans. Dans `<script setup>`, la même information est disponible via `useSlots()` quand un test en JavaScript est nécessaire.

## À retenir

Une prop pour une donnée, un slot pour du balisage : les deux sont complémentaires, pas concurrents. Le slot par défaut couvre le cas simple, les slots nommés structurent plusieurs zones, et le scoped slot inverse le contrôle pour déléguer un rendu tout en gardant la logique dans l'enfant.

:::cheatsheet
- title: "Slot par défaut"
  desc: "<slot /> dans l'enfant ; reçoit tout contenu non nommé placé entre les balises du composant."
- title: "Contenu de repli"
  desc: "<slot>texte</slot> s'affiche seulement si le parent ne fournit rien."
- title: "Slots nommés"
  desc: "<slot name='x' /> côté enfant ; <template #x> côté parent (raccourci de v-slot:x)."
- title: "Scoped slots"
  desc: "L'enfant remonte des données via <slot :item='item' /> ; le parent les lit avec #default='{ item }'."
- title: "Inversion de contrôle"
  desc: "L'enfant tient la logique et l'itération, le parent décide du rendu de chaque élément."
- title: "$slots"
  desc: "v-if='$slots.footer' pour tester la présence d'un slot et supprimer un conteneur vide."
:::
