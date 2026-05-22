---
title: "Règles des hooks"
slug: "hooks-rules"
framework: "react"
level: "medior"
order: 1
duration: 13
prerequisites: ["effects-basics"]
updated: 2026-05-22
seoTitle: "Règles des hooks & custom hooks — Medior React"
seoDescription: "Pourquoi l'ordre des hooks est sacré, et comment factoriser de la logique dans un custom hook."
ogVariant: "gold"
related:
  - { framework: "vue", slug: "composables" }
  - { framework: "angular", slug: "signals-rxjs-interop" }
---

## Pourquoi l'ordre compte

React n'identifie pas tes hooks par leur nom mais par leur **ordre d'appel**. Le
premier `useState` du premier rendu doit rester le premier au rendu suivant.
D'où les deux règles : appelle les hooks au **top level**, et seulement depuis
un composant ou un autre hook.

:::compare
::bad
```tsx
if (open) {
  const [x, setX] = useState(0); // ordre instable entre les rendus
}
```
::
::good
```tsx
const [x, setX] = useState(0);
if (open) {
  // utilise x ici
}
```
::
:::

**Pourquoi** : React stocke l'état des hooks dans une liste interne indexée par l'**ordre d'appel**, pas par un nom. Un `useState` derrière un `if` est appelé certains rendus et pas d'autres : l'index glisse, et React associe ton état à un autre hook — valeurs corrompues ou crash. L'appel inconditionnel au top level garantit le même ordre à chaque rendu.

## Custom hooks : factoriser la logique, pas le rendu

Un custom hook est juste une fonction qui appelle des hooks. Il extrait de la
**logique** réutilisable ; il ne rend rien.

```tsx
function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
```

### Idée reçue : « un custom hook partage son état »

Faux. Chaque appel d'un hook a son **propre** état. Deux composants qui appellent
`useDebounced` n'ont rien en commun — comme deux appels d'une fonction ont leurs
propres variables locales.

:::callout{type="tip"}
La convention `use*` n'est pas cosmétique : le linter `eslint-plugin-react-hooks`
s'en sert pour vérifier les règles. Nomme tes hooks `useX`, toujours.
:::
