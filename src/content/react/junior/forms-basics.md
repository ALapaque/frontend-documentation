---
title: "Forms : les bases"
slug: "forms-basics"
framework: "react"
level: "junior"
order: 6
duration: 12
prerequisites: ["state-basics", "lifting-state"]
updated: 2026-05-22
seoTitle: "Forms : les bases — react"
seoDescription: "Composants de formulaire contrôlés (value + onChange) vs non contrôlés (ref + defaultValue) : la différence, le coût, et quand choisir l'un ou l'autre."
ogVariant: "sage"
related:
  - framework: "vue"
    slug: "forms-basics"
  - framework: "angular"
    slug: "forms-basics"
---

Un champ HTML possède déjà son propre état interne dans le DOM. La question d'un formulaire React est : **qui détient la vérité de la valeur**, le DOM ou un state React ? Deux réponses, deux styles : contrôlé et non contrôlé.

## Contrôlé : React tient la valeur

Le champ reçoit sa `value` d'un state et signale chaque frappe par `onChange`. Le DOM n'est qu'un reflet du state.

```tsx
function Inscription() {
  const [email, setEmail] = useState("");

  return (
    <form>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <p>{email.includes("@") ? "OK" : "Email invalide"}</p>
    </form>
  );
}
```

À chaque frappe : `onChange` → `setEmail` → re-rendu → le `<input>` reçoit la nouvelle `value`. La valeur affichée est **toujours** celle du state. C'est ce qui permet de valider en direct, transformer la saisie (uppercase, masque), ou désactiver un bouton instantanément.

## Non contrôlé : le DOM tient la valeur

Le champ gère sa propre valeur ; React la lit ponctuellement via une `ref`. On fournit éventuellement une valeur initiale avec `defaultValue` (et non `value`).

```tsx
function Inscription() {
  const emailRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log(emailRef.current?.value);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" defaultValue="" ref={emailRef} />
      <button>Envoyer</button>
    </form>
  );
}
```

Aucun re-rendu à la frappe : React ignore le contenu jusqu'au submit. C'est plus léger, mais on perd la réactivité par caractère.

:::callout{type="info"}
React 19 ajoute une troisième voie pour la soumission : le prop `action` du `<form>` reçoit une fonction qui prend un `FormData`, sans gérer `value`/`onChange` à la main. C'est le sujet des modules avancés (Actions, `useActionState`) ; retenez juste qu'elle existe.
:::

## Contrôlé vs non contrôlé

:::compare
::bad
```tsx
// Validation live souhaitée, mais champ non contrôlé
const ref = useRef<HTMLInputElement>(null);
// impossible de réagir à chaque frappe sans relire le DOM
<input ref={ref} defaultValue="" />
<button disabled={/* ??? on n'a pas la valeur ici */}>OK</button>
```
::
::good
```tsx
// Validation live : champ contrôlé
const [v, setV] = useState("");
<input value={v} onChange={(e) => setV(e.target.value)} />
<button disabled={v.length < 3}>OK</button>
```
::
:::

**Pourquoi** : la version contrôlée wins ici parce que la valeur vit dans un state React. Chaque frappe déclenche un re-rendu, donc l'expression `v.length < 3` est ré-évaluée et le `disabled` du bouton recalculé au bon moment dans le cycle de rendu. En non contrôlé, la valeur n'existe que dans le DOM ; React ne re-rend pas à la frappe, donc rien ne recalcule l'état du bouton tant qu'on ne relit pas manuellement la `ref` — ce qui suppose un événement et un re-rendu qu'on n'a justement pas. Le besoin (réagir en continu) impose le modèle où React voit chaque changement.

## Lequel choisir

:::callout{type="tip"}
Par défaut, contrôlé : c'est le modèle React idiomatique, prévisible, testable. Passez non contrôlé quand vous n'avez besoin de la valeur **qu'au submit**, pour un champ fichier (`<input type="file">` est toujours non contrôlé), ou pour de très gros formulaires où le re-rendu par frappe devient un coût mesurable — c'est précisément ce que font les libs comme React Hook Form.
:::

| Critère | Contrôlé | Non contrôlé |
| --- | --- | --- |
| Source de vérité | state React | DOM |
| Validation live | facile | manuelle |
| Re-rendu par frappe | oui | non |
| Lecture de la valeur | `state` | `ref.current.value` |
| Valeur initiale | `value` | `defaultValue` |

## À retenir

:::cheatsheet
- title: "Contrôlé"
  desc: "value + onChange : React détient la valeur, re-rendu à chaque frappe."
- title: "Non contrôlé"
  desc: "ref + defaultValue : le DOM détient la valeur, lue au submit."
- title: "value xor defaultValue"
  desc: "value => contrôlé ; defaultValue => non contrôlé. Ne pas mélanger sur un même champ."
- title: "Défaut raisonnable"
  desc: "Contrôlé, sauf besoin de perf ou input file."
:::
