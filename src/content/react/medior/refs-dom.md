---
title: "Refs & DOM"
slug: "refs-dom"
framework: "react"
level: "medior"
order: 8
duration: 14
prerequisites: ["hooks-rules"]
updated: 2026-05-22
seoTitle: "React refs & DOM — useRef, ref as prop, useImperativeHandle"
seoDescription: "useRef, ref comme prop (React 19, sans forwardRef), callback refs et useImperativeHandle pour exposer une API impérative."
ogVariant: "gold"
related:
  - { framework: "vue", slug: "teleport" }
  - { framework: "angular", slug: "signal-queries" }
---

## useRef : une boîte mutable qui survit aux rendus

`useRef` retourne un objet `{ current }` stable entre les rendus. Deux usages :
accéder à un nœud DOM, ou stocker une valeur mutable hors du cycle de rendu
(timer, valeur précédente, instance). Ce n'est **pas** un état d'affichage.

```tsx
function Stopwatch() {
  const intervalId = useRef<number | null>(null); // valeur mutable, pas un état
  const [seconds, setSeconds] = useState(0);

  function start() {
    intervalId.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
  }
  function stop() {
    if (intervalId.current) clearInterval(intervalId.current);
  }
  return <button onClick={start}>{seconds}s</button>;
}
```

Pour le DOM, passe le ref à l'attribut `ref` d'un élément : React y écrit le nœud
après le commit.

```tsx
const inputRef = useRef<HTMLInputElement>(null);
useEffect(() => inputRef.current?.focus(), []);
return <input ref={inputRef} />;
```

## ref comme prop ordinaire (React 19)

Depuis React 19, `ref` est une prop normale d'un composant fonction : plus besoin
de `forwardRef`. Tu la déclares dans les props et tu la transmets.

:::compare
::bad
```tsx
// Avant React 19 : wrapper forwardRef obligatoire
const Input = forwardRef<HTMLInputElement, Props>((props, ref) => (
  <input ref={ref} {...props} />
));
```
::
::good
```tsx
// React 19 : ref est une prop comme une autre
function Input({ ref, ...props }: Props & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
```
::
:::

**Pourquoi** : `forwardRef` n'existait que parce que `ref` était traité spécialement et exclu de l'objet `props` transmis au composant. React 19 a levé cette exception : `ref` arrive désormais dans `props` comme n'importe quel attribut, donc l'enrobage devient du bruit. `forwardRef` reste supporté mais est déprécié et sera retiré d'une version future.

## Callback refs et nettoyage

Au lieu d'un objet ref, tu peux passer une fonction. React l'appelle avec le nœud
au montage et avec `null` au démontage. React 19 ajoute le **retour d'une fonction
de nettoyage**, comme un effet.

```tsx
<div
  ref={(node) => {
    const observer = new ResizeObserver(() => {});
    if (node) observer.observe(node);
    return () => observer.disconnect(); // cleanup React 19
  }}
/>
```

:::callout{type="tip"}
La fonction de nettoyage d'un callback ref évite le pattern legacy où React
appelait le callback avec `null` puis avec le nouveau nœud. Le cleanup est plus
explicite et symétrique avec `useEffect`.
:::

## useImperativeHandle : exposer une API minimale

Quand un parent doit déclencher une action impérative (focus, scroll, lecture),
expose une **petite** surface dédiée au lieu de divulguer le nœud DOM entier.

```tsx
type FormHandle = { focus: () => void; reset: () => void };

function ContactForm({ ref }: { ref?: Ref<FormHandle> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    reset: () => { /* … */ },
  }), []);
  return <input ref={inputRef} />;
}
```

:::callout{type="warn"}
Limite l'API impérative au strict nécessaire. Exposer le nœud DOM brut couple le
parent à l'implémentation interne ; une poignée `{ focus, reset }` reste stable
même si tu changes la structure du composant.
:::

### Idée reçue : « muter un ref déclenche un re-render »

Non. Écrire `ref.current = …` ne notifie pas React et ne provoque **aucun
re-rendu** — c'est précisément la raison d'être de `useRef` par rapport à
`useState`. Conséquence pratique : ne lis jamais `ref.current` pour produire du
JSX, car l'affichage ne se mettra pas à jour quand la valeur change. Si une valeur
doit apparaître à l'écran, c'est un `state`. Si elle ne sert qu'à de la logique
hors rendu (compteur interne, instance, dernière valeur connue), c'est un `ref`.

:::cheatsheet
- title: "ref ≠ state"
  desc: "Muter .current ne re-rend pas ; pour l'affichage, utilise useState."
- title: "ref as prop (19)"
  desc: "forwardRef n'est plus requis ; ref est une prop normale."
- title: "Callback ref + cleanup"
  desc: "Retourne une fonction de nettoyage appelée au démontage (React 19)."
- title: "Poignée minimale"
  desc: "useImperativeHandle expose une petite API, pas le nœud DOM brut."
:::
