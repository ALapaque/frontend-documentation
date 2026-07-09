---
title: "Actions : useActionState, useFormStatus, useOptimistic"
slug: "actions-forms"
framework: "react"
level: "medior"
order: 13
duration: 15
prerequisites: ["forms-basics", "suspense-basics"]
updated: 2026-07-08
seoTitle: "React Actions — useActionState, useFormStatus, useOptimistic pour les formulaires"
seoDescription: "Le trio React 19 pour les formulaires : une fonction async passée à action, l'état pending/erreur géré par useActionState, le bouton qui se désactive avec useFormStatus, et l'optimisme contrôlé avec useOptimistic. Avec ou sans serveur."
ogVariant: "gold"
related:
  - { framework: "react", slug: "forms-libs" }
  - { framework: "react", slug: "server-state" }
---

Avant React 19, chaque formulaire réinventait la même machinerie : un `useState` pour `pending`, un autre pour l'erreur, un `try/catch/finally` dans le handler, un reset à la main. React 19 fait de la soumission async un citoyen de première classe : tu passes une fonction — une *Action* — à `action`, et React gère le cycle. Trois hooks complètent le tableau : `useActionState` pour l'état, `useFormStatus` pour le bouton, `useOptimistic` pour l'affichage anticipé.

## action au lieu de onSubmit

Un `<form>` accepte désormais une fonction dans `action`. React l'appelle avec le `FormData` du formulaire : pas de `e.preventDefault()`, pas de `new FormData(e.target)`.

```tsx
async function creerContact(formData: FormData) {
  await api.post("/contacts", {
    nom: formData.get("nom"),
    email: formData.get("email"),
  });
}

function NouveauContact() {
  return (
    <form action={creerContact}>
      <input name="nom" />
      <input name="email" type="email" />
      <button type="submit">Créer</button>
    </form>
  );
}
```

La soumission tourne dans une transition : l'interface reste interactive pendant l'`await`, et React remet les champs non contrôlés à zéro une fois l'action terminée. Bonus quand l'action est une Server Action : le formulaire fonctionne *avant* l'hydratation — le navigateur poste, le serveur exécute, c'est du progressive enhancement natif.

**Pourquoi.** `onSubmit` te donne un événement DOM et te laisse tout le reste : empêcher le rechargement, extraire les données, suivre l'état. `action` reçoit directement les données et confie le cycle de vie à React — qui peut alors offrir transition, reset et pending sans que tu écrives une ligne de plomberie.

## useActionState : l'état du cycle

`useActionState(fn, initial)` enveloppe ton action et t'expose son état : `[state, formAction, isPending]`. L'action reçoit l'état précédent en premier argument et retourne le nouvel état — erreurs de validation comprises.

```tsx
import { useActionState } from "react";

type Etat = { error: string | null; ok: boolean };

async function inscrire(_prev: Etat, formData: FormData): Promise<Etat> {
  const email = String(formData.get("email") ?? "");
  if (!email.includes("@")) return { error: "Email invalide.", ok: false };
  try {
    await api.post("/inscriptions", { email });
    return { error: null, ok: true };
  } catch {
    return { error: "Le serveur n'a pas répondu, réessaie.", ok: false };
  }
}

function Inscription() {
  const [state, formAction, isPending] = useActionState(inscrire, {
    error: null,
    ok: false,
  });

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <button disabled={isPending}>{isPending ? "Envoi…" : "S'inscrire"}</button>
      {state.error && <p role="alert">{state.error}</p>}
      {state.ok && <p>Bienvenue à bord.</p>}
    </form>
  );
}
```

**Pourquoi.** L'état d'erreur vit *avec* l'action, pas éparpillé dans trois `useState` que chaque handler doit penser à remettre à jour. La fonction retourne son résultat, React le stocke, le composant l'affiche : un seul flux de données, testable en appelant `inscrire` directement.

:::callout{type="tip"}
Le reset automatique efface les champs même quand l'action retourne une erreur. Pour conserver la saisie, renvoie les valeurs dans le `state` (`{ error, valeurs }`) et réinjecte-les via `defaultValue`.
:::

## useFormStatus : le bouton qui se débrouille

`useFormStatus` (importé de `react-dom`) lit l'état du `<form>` parent, comme un contexte. Idéal pour un bouton submit réutilisable qui se désactive tout seul, sans prop drilling de `isPending`.

```tsx
import { useFormStatus } from "react-dom";

function BoutonEnvoi({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Envoi…" : children}
    </button>
  );
}
```

:::callout{type="warn"}
`useFormStatus` ne fonctionne pas dans le composant qui rend le `<form>` lui-même : il lit le statut d'un formulaire *au-dessus* de lui dans l'arbre. Appelé au même niveau, `pending` reste `false` pour toujours. Le hook doit vivre dans un composant enfant rendu à l'intérieur du form.
:::

## useOptimistic : afficher le résultat attendu

Pour une action dont l'issue est quasi certaine (poster un commentaire, liker), attendre le serveur donne une interface molle. `useOptimistic` affiche immédiatement l'état espéré, puis réconcilie avec l'état réel quand l'action se termine.

```tsx
function Commentaires({ commentaires }: { commentaires: Commentaire[] }) {
  const [optimistes, ajouterOptimiste] = useOptimistic(
    commentaires,
    (courants, nouveau: Commentaire) => [...courants, nouveau],
  );

  async function poster(formData: FormData) {
    const texte = String(formData.get("texte"));
    ajouterOptimiste({ id: crypto.randomUUID(), texte, enCours: true });
    await api.post("/commentaires", { texte }); // puis revalidation de la liste
  }

  return (
    <form action={poster}>
      <ul>
        {optimistes.map((c) => (
          <li key={c.id} style={{ opacity: c.enCours ? 0.5 : 1 }}>{c.texte}</li>
        ))}
      </ul>
      <textarea name="texte" required />
      <BoutonEnvoi>Poster</BoutonEnvoi>
    </form>
  );
}
```

**Pourquoi.** L'état optimiste est *dérivé et temporaire* : dès que l'action se termine, React réaffiche l'état source (`commentaires`). Succès → la prop a été revalidée avec le vrai commentaire, transition invisible. Échec → l'ajout optimiste disparaît tout seul : le rollback est automatique, aucun `catch` de nettoyage à écrire.

## Avant/après : la plomberie disparaît

:::compare
::bad
```tsx
function Inscription() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api.post("/inscriptions", new FormData(e.currentTarget));
      e.currentTarget.reset(); // et e.currentTarget est peut-être déjà null…
    } catch {
      setError("Échec de l'envoi.");
    } finally {
      setPending(false);
    }
  }
  // trois états à synchroniser à la main, dans chaque formulaire du projet
}
```
::
::good
```tsx
function Inscription() {
  const [state, formAction, isPending] = useActionState(inscrire, { error: null });
  // pending, erreur, reset : gérés par React ; la logique vit dans `inscrire`
  return <form action={formAction}>…</form>;
}
```
::
:::

## Avec ou sans serveur

Tout ce qui précède marche en client pur : une action est juste une fonction async, libre d'appeler `fetch`, TanStack Query ou n'importe quoi. Avec les React Server Components, les Server Actions (`'use server'`) se branchent au même endroit : tu passes la fonction serveur à `action` ou à `useActionState`, et la mutation s'exécute côté serveur avec progressive enhancement complet. La mécanique serveur est détaillée dans `/react/senior/rsc`.

:::callout{type="warn"}
Valide TOUJOURS côté serveur. Une validation dans l'action cliente (ou un `required` HTML) n'est qu'un confort d'interface : n'importe qui peut forger la requête et la contourner. Le schéma de validation doit tourner là où la donnée est écrite.
:::

## À retenir

:::cheatsheet
- title: "action={fn}"
  desc: "La fonction reçoit le FormData ; transition, reset auto, progressive enhancement avec une Server Action."
- title: "useActionState"
  desc: "[state, formAction, isPending] : l'action retourne erreurs et résultat, React stocke et expose."
- title: "useFormStatus"
  desc: "pending dans un composant ENFANT du form — jamais dans celui qui rend le <form>."
- title: "useOptimistic"
  desc: "Affiche l'état espéré pendant l'action ; retour automatique à l'état réel, rollback compris."
- title: "Validation serveur"
  desc: "L'action cliente est contournable : revalide systématiquement là où la donnée est persistée."
:::
