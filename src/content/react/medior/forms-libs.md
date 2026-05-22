---
title: "Libs de formulaires"
slug: "forms-libs"
framework: "react"
level: "medior"
order: 5
duration: 17
prerequisites: ["forms-basics", "context-perf"]
updated: 2026-05-22
seoTitle: "Libs de formulaires — react"
seoDescription: "React Hook Form (uncontrolled, register, handleSubmit), Formik et la validation par resolver zod : pourquoi RHF gagne sur la perf des gros formulaires."
ogVariant: "gold"
related:
  - framework: "vue"
    slug: "forms-basics"
  - framework: "angular"
    slug: "cva"
---

Un formulaire contrôlé met chaque champ dans un `useState` : à grande échelle, chaque frappe re-rend tout le formulaire. Les libs sérieuses contournent ça. React Hook Form (RHF) s'appuie sur le DOM non contrôlé ; Formik reste centré sur le state contrôlé. La validation se branche par un *resolver*, typiquement zod.

## React Hook Form : register + handleSubmit

RHF enregistre les champs via `register`, qui pose une `ref` non contrôlée. La valeur vit dans le DOM ; RHF la lit au submit. Le composant ne re-rend pas à la frappe.

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  age: z.coerce.number().min(18),
});

function Inscription() {
  const { register, handleSubmit, formState: { errors } } =
    useForm({ resolver: zodResolver(schema) });

  return (
    <form onSubmit={handleSubmit((data) => api.create(data))}>
      <input {...register("email")} />
      {errors.email && <span>{errors.email.message}</span>}
      <input {...register("age")} />
      <button>Envoyer</button>
    </form>
  );
}
```

`zodResolver` adapte un schéma zod à l'API de validation de RHF : zod parse et coerce, RHF reçoit les erreurs typées. Le type des données de submit est inféré du schéma — une seule source de vérité pour le runtime et le type.

## Pourquoi c'est rapide : compare

:::compare
::bad
```tsx
function Form() {
  const [values, setValues] = useState({ a: "", b: "", c: "" });
  const set = (k) => (e) =>
    setValues(v => ({ ...v, [k]: e.target.value }));
  // chaque frappe sur N'IMPORTE quel champ re-rend tout le form
  return (
    <>
      <input value={values.a} onChange={set("a")} />
      <input value={values.b} onChange={set("b")} />
      <input value={values.c} onChange={set("c")} />
    </>
  );
}
```
::
::good
```tsx
function Form() {
  const { register, handleSubmit } = useForm();
  // aucune frappe ne re-rend le composant : refs non contrôlées
  return (
    <form onSubmit={handleSubmit(save)}>
      <input {...register("a")} />
      <input {...register("b")} />
      <input {...register("c")} />
    </form>
  );
}
```
::
:::

**Pourquoi** : dans la version state-heavy, la valeur de chaque champ est dans un `useState` partagé. Une frappe appelle `setValues`, qui re-rend `Form` et donc les trois `<input>`, à chaque caractère, pour un formulaire de 50 champs comme de 3. Le coût croît avec la taille du formulaire et la profondeur de l'arbre. RHF inverse le modèle : `register` attache une `ref` non contrôlée, la valeur reste dans le DOM, et RHF ne déclenche un re-rendu que quand c'est nécessaire (validation d'un champ, abonnement explicite via `watch`). Le composant racine ne re-rend pas à la frappe : le travail de React par caractère devient nul. C'est exactement le compromis « non contrôlé » du module de base, industrialisé et couplé à une validation.

## Idée reçue : « Formik et RHF, c'est pareil, juste une question de goût »

Faux sur le fond. Formik est conçu autour de l'état contrôlé : il maintient `values`, `errors`, `touched` dans son propre state et re-rend à mesure que vous tapez, comme la mauvaise version ci-dessus. Sur un petit formulaire, invisible ; sur un gros formulaire ou un tableau de champs répétés, Formik devient le goulet d'étranglement que les profils révèlent. RHF a fait le choix architectural inverse (non contrôlé par défaut) précisément pour ce cas. Ce n'est pas du goût : c'est deux modèles de propriété de la valeur, avec des courbes de coût différentes. Formik reste défendable pour de petits formulaires où son ergonomie de render-props plaît à l'équipe, mais la performance n'est pas un match nul.

## Choisir

:::callout{type="tip"}
RHF + zod par défaut sur un projet moderne : perf par construction, typage de bout en bout, écosystème de resolvers (zod, yup, valibot). Validez avec zod côté client ET réutilisez le même schéma côté serveur. Gardez le state contrôlé manuel uniquement pour un champ isolé avec logique très spécifique, ou un composant tiers qui n'expose qu'une API contrôlée (à brancher via `Controller`).
:::

## À retenir

:::cheatsheet
- title: "RHF = non contrôlé"
  desc: "register pose une ref ; pas de re-rendu à la frappe, coût indépendant de la taille."
- title: "resolver zod"
  desc: "Un schéma zod = validation runtime + types inférés, partagés client/serveur."
- title: "Controller"
  desc: "Pont vers les composants tiers qui n'acceptent que value/onChange."
- title: "Formik"
  desc: "Modèle contrôlé : OK petit formulaire, coûteux à grande échelle."
:::
