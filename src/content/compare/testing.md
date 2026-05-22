---
title: "Testing"
lead: "Unitaire, composant, e2e : où placer l'effort et avec quels outils."
updated: 2026-05-22
seoTitle: "Testing — Angular vs React vs Vue"
seoDescription: "Vitest, Testing Library, harnesses, Playwright/Cypress : stratégies de test comparées entre les trois frameworks."
related:
  - { framework: "angular", slug: "testing-strategy" }
  - { framework: "react", slug: "testing-strategy" }
  - { framework: "vue", slug: "testing-strategy" }
---

## Vue d'ensemble

| Critère | Angular | React | Vue |
| --- | --- | --- | --- |
| Runner | Vitest (Karma déprécié) | Vitest / Jest | Vitest |
| Composant | TestBed + CDK harnesses | Testing Library | Vue Test Utils + Testing Library |
| Mock réseau | MSW | MSW | MSW |
| E2E | Playwright | Playwright | Playwright / Cypress |
| Composant isolé | — | Playwright CT | Cypress CT |

## La pyramide partagée

Quel que soit le framework, la stratégie est la même : beaucoup d'**unitaires**
rapides, une couche moyenne de **tests composant** (rendu + interaction sur du
DOM réel ou simulé), et peu de **e2e** lents mais réalistes. L'outillage a
convergé : **Vitest** comme runner par défaut partout, **MSW** pour intercepter
le réseau à tous les niveaux, **Playwright** pour le e2e. Ce qui diffère, c'est la
couche composant.

## Un test de composant

:::tri{title="Tester un bouton qui incrémente"}
::angular
```ts
import { TestBed } from '@angular/core/testing';

it('incrémente au clic', async () => {
  const fixture = TestBed.createComponent(Counter);
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const button = await loader.getHarness(MatButtonHarness);

  await button.click();
  expect(fixture.componentInstance.count()).toBe(1);
});
```
::
::react
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('incrémente au clic', async () => {
  render(<Counter />);
  await userEvent.click(screen.getByRole('button'));
  expect(screen.getByText('1')).toBeInTheDocument();
});
```
::
::vue
```ts
import { mount } from '@vue/test-utils';

test('incrémente au clic', async () => {
  const wrapper = mount(Counter);
  await wrapper.find('button').trigger('click');
  expect(wrapper.text()).toContain('1');
});
```
::
:::

## Réseau et isolation

:::callout{type="tip"}
Mocke le réseau au niveau **HTTP** avec MSW, jamais en stubbant `fetch` ou ton
client. Le même handler sert tes tests unitaires, composant *et* e2e — une seule
source de vérité pour les réponses serveur, et tes tests restent proches du réel.
:::

Angular se distingue par les **CDK component harnesses** : une API stable pour
piloter un composant sans dépendre de son DOM interne, ce qui rend les tests
robustes au refactor. React mise sur **Testing Library** (interroge par rôle/
texte, comme un utilisateur). Vue combine **Vue Test Utils** (accès au composant)
et Testing Library selon le goût.

## Verdict

L'outillage a largement convergé : **Vitest + MSW + Playwright** est le socle des
trois. La nuance est dans la couche composant. Angular pousse les **harnesses**,
qui paient leur prix sur les design systems en découplant le test du DOM —
verbeux mais durable. React et Vue privilégient **Testing Library**, plus léger
et orienté comportement utilisateur. Conseil transverse : investis dans la couche
**composant** (le meilleur ratio confiance/coût), garde le e2e pour les parcours
critiques, et centralise tes mocks dans MSW. Le framework change peu la stratégie
— la pyramide, si.
