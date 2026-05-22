---
title: "Concurrent features"
slug: "concurrent-features"
framework: "react"
level: "senior"
order: 2
duration: 20
prerequisites: ["rsc"]
updated: 2026-05-22
seoTitle: "React concurrent — transitions, useOptimistic"
seoDescription: "Transitions, useDeferredValue, useOptimistic et Actions (useActionState/useFormStatus) : prioriser le rendu pour une UI réactive."
ogVariant: "crimson"
related:
  - { framework: "angular", slug: "zoneless" }
  - { framework: "vue", slug: "perf-strategy" }
---

## Tous les rendus ne se valent pas

Le rendu concurrent permet à React d'**interrompre** et de **prioriser**. Une
frappe au clavier est urgente ; le re-filtrage d'une grosse liste peut attendre.
Tu marques l'un comme non urgent, React garde l'UI fluide.

## useTransition

```tsx
const [isPending, startTransition] = useTransition();

function onChange(e) {
  setQuery(e.target.value);           // urgent : l'input répond
  startTransition(() => setResults(filter(e.target.value))); // peut être différé
}
```

## useDeferredValue

Même idée, côté consommateur : afficher une version « en retard » d'une valeur
le temps que le coûteux rattrape.

```tsx
const deferredQuery = useDeferredValue(query);
const list = useMemo(() => filter(deferredQuery), [deferredQuery]);
```

## useOptimistic

Afficher immédiatement le résultat attendu d'une mutation, avant la confirmation
serveur.

```tsx
const [optimistic, addOptimistic] = useOptimistic(messages, (state, msg) => [
  ...state,
  { ...msg, pending: true },
]);
```

## Actions : la transition asynchrone

Une **Action** est une fonction async passée à un `startTransition` (ou au prop
`action` d'un `<form>`). React enveloppe l'attente dans une transition : `pending`,
erreur et état final sont gérés sans automate manuel. `useActionState` relie
l'Action à son résultat ; `useFormStatus` lit l'état du `<form>` parent depuis un
enfant, sans prop drilling.

```tsx
function Inscription() {
  const [state, formAction, isPending] = useActionState(
    async (_prev, formData: FormData) => {
      const res = await createUser(formData);
      return res.error ?? null; // valeur retournée = nouvel état
    },
    null,
  );
  return (
    <form action={formAction}>
      <input name="email" />
      {state && <p>{state}</p>}
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus(); // lit le <form> parent
  return <button disabled={pending}>Envoyer</button>;
}
```

`useOptimistic` se branche naturellement ici : on affiche l'état attendu pendant
que l'Action est `pending`, React rétablit l'état réel quand elle résout (ou
échoue). C'est le triptyque React 19 des mutations côté client.

:::callout{type="info"}
Le prop `action` accepte une fonction client comme une **Server Action**
(`'use server'`, voir `rsc`). En progressive enhancement, le `<form>` reste
soumissible même avant l'hydratation : React intercepte une fois le JS chargé.
:::

:::cheatsheet
- title: "useTransition"
  desc: "Marque une mise à jour comme non urgente ; expose isPending. startTransition accepte une fonction async (Action)."
- title: "useDeferredValue"
  desc: "Diffère une valeur dérivée coûteuse sans bloquer l'urgent."
- title: "useOptimistic"
  desc: "État optimiste pendant qu'une action asynchrone se résout."
- title: "useActionState / useFormStatus"
  desc: "Relie une Action à son état (pending/erreur/résultat) ; useFormStatus lit le <form> parent."
:::

:::callout{type="warn"}
Une transition n'accélère rien : elle **réordonne**. Si le travail différé est
intrinsèquement lent, optimise-le (virtualisation, mémoïsation). Les transitions
masquent la latence, elles ne la suppriment pas.
:::
