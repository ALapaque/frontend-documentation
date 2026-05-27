---
title: "Lifting state"
slug: "lifting-state"
framework: "react"
level: "junior"
order: 4
duration: 11
prerequisites: ["state-basics", "jsx-basics"]
updated: 2026-05-22
seoTitle: "Lifting state — react"
seoDescription: "Faire remonter l'état partagé vers le parent commun pour garder une source unique de vérité, et le passer aux enfants via value et onChange."
ogVariant: "sage"
related:
  - framework: "vue"
    slug: "components-props"
  - framework: "angular"
    slug: "data-binding"
---

Quand deux composants doivent refléter la même donnée, le réflexe naïf est de mettre un `useState` dans chacun. C'est le début des bugs de synchronisation. La bonne réponse : faire remonter l'état (« lifting state up »).

## Le principe : une seule source de vérité

Un état vit dans **un seul** composant. Si plusieurs composants en ont besoin, on le place dans leur **plus proche parent commun**, qui le redescend par des props.

Pense à un thermostat : l'affichage et le bouton ne stockent pas chacun leur propre température. Ils lisent et modifient une seule valeur tenue par le thermostat. Si chacun gardait sa copie, ils finiraient par diverger.

Le parent expose deux choses aux enfants :

- une prop de **lecture** (`value`),
- une prop de **modification** (un callback, par convention `onChange`).

L'enfant ne possède rien : il affiche ce qu'on lui donne et signale les intentions vers le haut. C'est le pattern « controlled component ».

## L'exemple

Deux champs convertissant Celsius et Fahrenheit. L'état unique est le degré Celsius, tenu par le parent.

```tsx
function Convertisseur() {
  const [celsius, setCelsius] = useState(20);

  return (
    <>
      <Champ
        label="Celsius"
        value={celsius}
        onChange={setCelsius}
      />
      <Champ
        label="Fahrenheit"
        value={celsius * 9 / 5 + 32}
        onChange={(f) => setCelsius((f - 32) * 5 / 9)}
      />
    </>
  );
}

function Champ({ label, value, onChange }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
```

`Champ` est totalement passif : il ne sait pas qu'il existe deux unités. Toute la logique tient dans le parent, qui dérive Fahrenheit de Celsius. Impossible que les deux champs se contredisent : ils descendent tous les deux du même `celsius`.

## Dupliquer vs remonter

:::compare
::bad
```tsx
function Parent() {
  return (
    <>
      <Champ />        {/* useState interne */}
      <Champ />        {/* useState interne, séparé */}
    </>
  );
}

function Champ() {
  const [value, setValue] = useState(0);
  return <input value={value}
    onChange={(e) => setValue(+e.target.value)} />;
}
```
::
::good
```tsx
function Parent() {
  const [value, setValue] = useState(0);
  return (
    <>
      <Champ value={value} onChange={setValue} />
      <Champ value={value} onChange={setValue} />
    </>
  );
}

function Champ({ value, onChange }) {
  return <input value={value}
    onChange={(e) => onChange(+e.target.value)} />;
}
```
::
:::

**Pourquoi** : dans la version dupliquée, chaque `Champ` a son propre `useState`, donc deux cellules de mémoire indépendantes attachées à deux instances différentes. Modifier l'un ne re-rend pas l'autre et n'altère pas sa valeur : les deux dérivent. En remontant l'état, il n'existe qu'une cellule, tenue par le parent. Un `setValue` re-rend le parent, qui repasse la même nouvelle `value` aux deux enfants : ils restent par construction synchronisés. La source unique de vérité supprime la classe entière des bugs de désynchronisation.

## Quand ne PAS remonter

Remonter trop haut a un coût : chaque frappe re-rend tout le sous-arbre, et le parent se charge de détails qui ne le concernent pas.

:::callout{type="tip"}
Garde l'état au niveau le plus bas où il est encore partagé par tous ses lecteurs. S'il n'est utilisé que par un composant, laisse-le local. On remonte uniquement quand un frère ou le parent a réellement besoin de lire ou d'écrire la valeur.
:::

## À retenir

:::cheatsheet
- title: "Source unique de vérité"
  desc: "Un état = un seul useState, dans le plus proche parent commun des lecteurs."
- title: "value + onChange"
  desc: "Le parent descend la valeur et le callback ; l'enfant reste passif (controlled)."
- title: "Dériver, pas dupliquer"
  desc: "Calcule les valeurs liées (Fahrenheit) à la volée plutôt que de stocker un doublon."
- title: "Le bon niveau"
  desc: "Aussi bas que possible, aussi haut que nécessaire pour le partage."
:::
