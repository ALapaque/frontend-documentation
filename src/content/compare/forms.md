---
title: "Formulaires"
lead: "Saisie, validation, soumission : trois approches du même problème."
updated: 2026-05-22
seoTitle: "Formulaires — Angular vs React vs Vue"
seoDescription: "Reactive/Signal Forms (Angular) vs React Hook Form/Actions (React) vs v-model (Vue) : binding, validation, soumission."
related:
  - { framework: "angular", slug: "signal-forms" }
  - { framework: "react", slug: "forms-libs" }
  - { framework: "vue", slug: "forms-basics" }
---

## Vue d'ensemble

| Critère | Angular | React | Vue |
| --- | --- | --- | --- |
| Binding | Reactive / Signal Forms | Controlled state / RHF | `v-model` / `defineModel` |
| Source de vérité | `FormGroup` / signal du form | `useState` ou `register` | `ref` réactif |
| Validation | Validators composables | Resolver (Zod/Valibot) | Schéma + règles manuelles |
| Soumission async | `submit()` + état signal | `useActionState` / RHF | `@submit.prevent` |
| Re-render à la frappe | Fin (signal) | Tout le form (sans RHF) | Fin (proxy) |

## Le binding

Angular pousse vers les **Signal Forms** : un arbre typé piloté par signals,
validation déclarative et état (`dirty`, `touched`, `valid`) lisible comme une
valeur. React n'a pas de form natif — soit du *controlled* à la main, soit React
Hook Form (non contrôlé, zéro re-render à la frappe), soit les **Actions** côté
serveur. Vue résout le binding d'un trait avec `v-model` ; `defineModel` rend un
champ enfant bidirectionnel sans plomberie.

## Un login minimal

:::tri{title="Formulaire de connexion"}
::angular
```ts
@Component({
  template: `
    <form (submit)="submit($event)">
      <input [field]="form.email" type="email" />
      <input [field]="form.password" type="password" />
      <button [disabled]="form().invalid()">Connexion</button>
    </form>`,
})
export class Login {
  form = form(signal({ email: '', password: '' }), (p) => {
    required(p.email); email(p.email);
    required(p.password); minLength(p.password, 8);
  });

  async submit(e: Event) {
    e.preventDefault();
    if (this.form().invalid()) return;
    await this.auth.login(this.form().value());
  }
}
```
::
::react
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export function Login() {
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(schema),
  });
  const onSubmit = handleSubmit((v) => auth.login(v));

  return (
    <form onSubmit={onSubmit}>
      <input {...register('email')} type="email" />
      <input {...register('password')} type="password" />
      <button disabled={formState.isSubmitting}>Connexion</button>
    </form>
  );
}
```
::
::vue
```vue
<script setup lang="ts">
import { reactive, computed } from 'vue';

const model = reactive({ email: '', password: '' });
const valid = computed(
  () => /.+@.+/.test(model.email) && model.password.length >= 8,
);

async function submit() {
  if (!valid.value) return;
  await auth.login(model);
}
</script>

<template>
  <form @submit.prevent="submit">
    <input v-model="model.email" type="email" />
    <input v-model="model.password" type="password" />
    <button :disabled="!valid">Connexion</button>
  </form>
</template>
```
::
:::

## Validation et soumission

:::callout{type="tip"}
Centralise la validation dans un **schéma** (Zod, Valibot) plutôt que dans des
règles éparpillées : un seul schéma sert la validation client *et* la coercition
de type. Angular Signal Forms et React (via resolver) s'y prêtent directement ;
côté Vue, branche le schéma dans un `computed` ou via VeeValidate.
:::

Pour la soumission, soigne trois états : `pending`, `error`, `success`. React 19
les offre nativement avec `useActionState`. Angular les expose via les signals du
form. Vue les gère à la main — c'est trivial mais à ne pas oublier.

## Verdict

Pour un form **simple**, Vue gagne en ergonomie : `v-model` et c'est plié. Dès
que la **validation se complexifie** ou que le typage compte, Angular Signal
Forms offre le modèle le plus structuré et le plus typé, sans dépendance. React
n'a rien en natif : pour tout form non trivial, **React Hook Form + Zod** est la
réponse par défaut, et `useActionState` pour les mutations serveur. La vraie
question n'est pas le binding mais **où vit la validation** — mets-la dans un
schéma partagé, et le framework devient un détail.
