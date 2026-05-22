---
title: "Listes & clés"
slug: "lists-keys"
framework: "react"
level: "junior"
order: 5
duration: 10
prerequisites: ["jsx-basics", "state-basics"]
updated: 2026-05-22
seoTitle: "Listes & clés — react"
seoDescription: "À quoi sert vraiment la prop key : donner une identité stable aux éléments d'une liste pour la réconciliation, et pourquoi l'index trahit dès que la liste bouge."
ogVariant: "sage"
related:
  - framework: "vue"
    slug: "template-syntax"
  - framework: "angular"
    slug: "control-flow"
---

Rendre une liste en React, c'est mapper un tableau vers du JSX. React demande alors une `key` par élément. Ce n'est pas une formalité pour faire taire le warning : c'est l'information qui permet à React de suivre **quel élément est quel élément** entre deux rendus.

## Rendre une liste

```tsx
function ListeTaches({ taches }: { taches: Tache[] }) {
  return (
    <ul>
      {taches.map((t) => (
        <li key={t.id}>{t.label}</li>
      ))}
    </ul>
  );
}
```

Le `.map` transforme chaque donnée en un élément. La `key` doit être **unique parmi les frères** et **stable** : la même donnée garde la même clé d'un rendu à l'autre.

## La clé sert l'identité, pas l'ordre

Entre deux rendus, React compare l'ancien arbre au nouveau (réconciliation). Pour une liste, il apparie les éléments **par leur clé**, pas par leur position. La clé répond à la question : « cet élément du nouveau rendu est-il le même que celui d'avant ? »

- Même clé présente avant et après : React **réutilise** le nœud DOM existant et son état interne, et ne met à jour que ce qui a changé.
- Clé qui disparaît : React **démonte** l'élément (et détruit son état).
- Clé qui apparaît : React **monte** un nouvel élément.

L'identité conditionne donc le DOM réutilisé, l'état conservé, et les animations de montage/démontage.

## index vs id

:::compare
::bad
```tsx
{taches.map((t, i) => (
  <li key={i}>
    <input defaultValue={t.label} />
  </li>
))}
```
::
::good
```tsx
{taches.map((t) => (
  <li key={t.id}>
    <input defaultValue={t.label} />
  </li>
))}
```
::
:::

**Pourquoi** : avec `key={index}`, la clé décrit la **position**, pas l'élément. Si on insère une tâche en tête, l'ancienne position 0 devient position 1 : React voit « la clé 0 a toujours un `<li>` » et réutilise le nœud, mais avec les nouvelles données. Résultat : les états non contrôlés (valeur tapée dans un `<input>`, focus, scroll, état d'un composant enfant) restent collés à la position et migrent sur la mauvaise ligne. Avec `key={t.id}`, la clé suit la donnée : insérer en tête fait apparaître une clé neuve, React monte une ligne au bon endroit et déplace les autres sans corrompre leur état. La réconciliation devient correcte ET plus efficace (déplacement de nœuds au lieu de re-création).

## Quand l'index est acceptable

L'index n'est pas interdit, il est dangereux quand la liste change. Il convient si :

- la liste est **statique** (jamais réordonnée, ni filtrée, ni avec insertion/suppression au milieu),
- les éléments **n'ont pas d'état propre** ni d'entrées de formulaire non contrôlées.

:::callout{type="warn"}
Ne fabriquez jamais une clé avec `Math.random()` : elle change à chaque rendu, donc React démonte et remonte tout à chaque fois. Vous perdez l'état, le focus, et toute performance. Utilisez un identifiant stable issu de la donnée.
:::

## À retenir

:::cheatsheet
- title: "Une clé = une identité"
  desc: "Unique parmi les frères, stable dans le temps, issue de la donnée (id)."
- title: "Pas la position"
  desc: "L'index décrit la place, pas l'élément : il trahit dès qu'on insère/réordonne."
- title: "Effet réel"
  desc: "La clé pilote le DOM réutilisé, l'état conservé et les montages/démontages."
- title: "Jamais aléatoire"
  desc: "Math.random() en key = remontage total à chaque rendu."
:::
