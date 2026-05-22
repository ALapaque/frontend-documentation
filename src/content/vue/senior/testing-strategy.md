---
title: "Stratégie de test"
slug: "testing-strategy"
framework: "vue"
level: "senior"
order: 7
duration: 20
prerequisites: ["composables", "components-props"]
updated: 2026-05-22
seoTitle: "Stratégie de test — vue"
seoDescription: "Tester Vue 3 : Vitest pour l'unitaire, Vue Test Utils (mount vs shallowMount), Cypress component testing, et quoi tester à quel niveau."
ogVariant: "crimson"
related:
  - framework: "react"
    slug: "testing-strategy"
  - framework: "angular"
    slug: "testing-strategy"
---

Une stratégie de test, ce n'est pas « couvrir 100 % » mais répartir l'effort là où il rapporte : tester le comportement, pas l'implémentation. La pyramide vaut pour Vue : beaucoup d'unitaire rapide (logique, composables), une couche de tests de composants centrés sur le contrat (props/events/rendu), et quelques tests bout-en-bout sur les parcours critiques. Le piège récurrent : tester des détails internes qui cassent au moindre refactor sans rien garantir.

## Vitest : la base unitaire

Vitest est le runner naturel d'un projet Vite : même config, même transformation, exécution rapide en ESM. Pour la logique pure et les composables, on teste sans monter de composant.

```ts
// useCompteur.ts
import { ref } from 'vue'
export function useCompteur(initial = 0) {
  const n = ref(initial)
  const inc = () => n.value++
  return { n, inc }
}
```

```ts
// useCompteur.test.ts
import { describe, it, expect } from 'vitest'
import { useCompteur } from './useCompteur'

describe('useCompteur', () => {
  it('incrémente', () => {
    const { n, inc } = useCompteur(5)
    inc()
    expect(n.value).toBe(6)
  })
})
```

Un composable qui n'utilise pas de cycle de vie (`onMounted`) ni d'`inject` se teste comme une fonction. S'il dépend du contexte de composant, on l'enveloppe dans un composant hôte de test (`mount` d'un composant minimal qui appelle le composable) — c'est le pattern `withSetup`.

## Vue Test Utils : tester le contrat du composant

VTU monte un composant et expose une API pour interagir et inspecter. La règle d'or : assert sur le comportement observable (rendu, événements émis), pas sur l'état interne.

```ts
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import Compteur from './Compteur.vue'

describe('Compteur.vue', () => {
  it('émet update au clic', async () => {
    const wrapper = mount(Compteur, { props: { modelValue: 0 } })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[1]])
    expect(wrapper.text()).toContain('1')
  })
})
```

On passe les `props`, on simule l'interaction (`trigger`, `setValue`), on vérifie le rendu (`text`, `find`) et les événements (`emitted`). Le `await` est requis : Vue applique les mises à jour DOM de façon asynchrone (nextTick), donc l'assertion doit attendre le flush.

## mount vs shallowMount

`mount` rend le composant et tous ses enfants réels. `shallowMount` remplace les composants enfants par des stubs vides.

:::compare
::bad
```ts
// shallowMount par défaut "pour isoler" — on stub des enfants
// dont le rendu fait partie du comportement qu'on teste
const wrapper = shallowMount(FormulairePaiement)
// <ChampMontant> est un stub : on ne peut pas saisir ni vérifier
// l'intégration réelle entre le formulaire et ses champs
expect(wrapper.emitted('payer')).toBeTruthy() // faux sentiment de sécurité
```
::
::good
```ts
// mount : on teste le composant avec ses enfants réels,
// au plus près de ce que vit l'utilisateur
const wrapper = mount(FormulairePaiement)
await wrapper.get('[data-test=montant]').setValue('42')
await wrapper.get('[data-test=valider]').trigger('click')
expect(wrapper.emitted('payer')).toEqual([[{ montant: 42 }]])
```
::
:::

**Pourquoi** : `shallowMount` stube les composants enfants (les remplace par des balises inertes), ce qui isole l'unité mais coupe les interactions réelles entre le parent et ses enfants — précisément le comportement que la plupart des tests de composant cherchent à garantir. Tester un formulaire dont les champs sont stubés vérifie surtout le câblage de stubs, pas l'app. `mount` rend l'arbre réel : le test exerce le composant comme l'utilisateur, ce qui le rend fiable et résistant au refactor interne. `shallowMount` reste justifié quand un enfant est lourd ou non déterministe (carte, requête au montage) qu'on veut explicitement neutraliser — c'est l'exception, pas le défaut. Le critère : stube uniquement ce que tu veux délibérément exclure.

:::callout{type="tip"}
Cible les éléments par `data-test=` plutôt que par classes CSS ou structure. Les sélecteurs de présentation cassent au moindre changement de style ; un attribut de test explicite documente l'intention et survit aux refactors.
:::

## Cypress component testing : le navigateur réel

Vitest+VTU s'exécutent dans jsdom — une simulation du DOM, sans vrai layout ni vrais styles. Pour ce qui dépend du navigateur réel (focus, scroll, mesures, CSS, drag), Cypress (ou Playwright CT) monte le composant dans un vrai Chromium.

```ts
import Modale from './Modale.vue'

it('piège le focus quand ouverte', () => {
  cy.mount(Modale, { props: { ouverte: true } })
  cy.get('[data-test=fermer]').focus()
  cy.realPress('Tab')
  cy.focused().should('have.attr', 'data-test', 'premier-champ') // focus trap réel
})
```

Le focus trap, les transitions CSS, le comportement de scroll ou les media queries ne sont fiables que dans un vrai moteur de rendu. C'est plus lent, donc réservé aux composants où le navigateur fait partie du contrat. Le reste reste en Vitest, bien plus rapide.

### Idée reçue : « plus le test est isolé (shallow, mocks partout), meilleur il est »

Faux. Un test trop isolé teste surtout ses propres mocks. La valeur d'un test vient de sa fidélité à ce que vit l'utilisateur : plus il exerce de code réel sur un chemin réel, plus il attrape de vrais bugs. Sur-stuber et sur-mocker produit des tests verts qui cassent en production. Le bon dosage suit le coût/risque : logique pure → unitaire isolé (rapide, ciblé) ; comportement de composant → `mount` avec enfants réels ; dépendances navigateur → Cypress CT ; parcours critique de bout en bout → E2E. On isole pour la vitesse ou pour neutraliser le non-déterministe, jamais par principe.

## Code source

`@vue/test-utils` (`vuejs/test-utils`, `src/`) s'appuie sur le runtime de Vue plutôt que sur un DOM réinventé :

- `mount.ts` — crée une app Vue (`createApp`) montée dans un conteneur, applique `global` (plugins, stubs, provides) et retourne un `VueWrapper`.
- `vueWrapper.ts` / `domWrapper.ts` — l'API d'inspection (`get`, `find`, `text`, `trigger`, `setValue`, `emitted`) ; `emitted` lit le registre d'événements posé par un patch sur l'instance au montage.
- `stubComponents` (dans `stubs.ts`) — la mécanique de remplacement des enfants utilisée par `shallowMount` (qui est `mount` avec `shallow: true`) : comprendre ce fichier dissipe la confusion sur ce qui est rendu ou non.

Côté Vitest, l'intégration passe par `@vitejs/plugin-vue` (même transformation SFC que la build) et l'environnement `jsdom`/`happy-dom` configuré dans `vitest.config`. Lire comment Vitest réutilise la pipeline Vite explique pourquoi les tests voient exactement le même code compilé que la production.

:::cheatsheet
- title: "Vitest"
  desc: "Unitaire rapide ESM ; logique pure et composables sans montage."
- title: "mount"
  desc: "Rend le composant + enfants réels ; défaut pour tester le contrat."
- title: "shallowMount"
  desc: "Stube les enfants ; exception, pour neutraliser un enfant lourd."
- title: "emitted() / trigger() / setValue()"
  desc: "Vérifier les events émis et simuler les interactions (await nextTick)."
- title: "Cypress / Playwright CT"
  desc: "Navigateur réel : focus, CSS, scroll, transitions. Lent, ciblé."
:::
