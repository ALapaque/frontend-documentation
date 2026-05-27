---
title: "Stratégie de test"
slug: "testing-strategy"
framework: "angular"
level: "senior"
order: 7
duration: 22
prerequisites: ["rxjs-operators", "architecture"]
updated: 2026-05-22
seoTitle: "Stratégie de test — angular"
seoDescription: "CDK Component Harnesses, marble testing avec TestScheduler, MSW, et le combo Vitest/Cypress/Playwright : quoi tester, à quel niveau, et pourquoi."
ogVariant: "crimson"
related:
  - framework: "react"
    slug: "testing-strategy"
  - framework: "vue"
    slug: "testing-strategy"
---

## Tester au bon niveau

La pyramide reste valide, mais ce qui compte est de faire correspondre l'outil au type de logique. Empiler des tests E2E lents sur de la logique pure, ou tester une logique RxJS via le DOM, est un anti-pattern coûteux.

| Niveau | Cible | Outil |
|---|---|---|
| Unitaire | logique pure, services, signals | Vitest + TestBed |
| Composant | rendu + interaction, isolé | Vitest + CDK Harness |
| Flux temporels | RxJS, opérateurs, debounce | TestScheduler (marbles) |
| Intégration HTTP | composant ↔ API mockée | MSW |
| E2E | parcours réel, navigateur | Playwright / Cypress |

## Component Harnesses (CDK)

Un harness est une API stable pour piloter un composant en test, sans toucher au DOM brut. Il survit aux refontes de template : on interroge le *comportement*, pas la structure.

:::compare
::bad
```ts
const input = fixture.nativeElement.querySelector('input.search-field');
input.value = 'angular';
input.dispatchEvent(new Event('input'));
fixture.detectChanges();
```
::
::good
```ts
const loader = TestbedHarnessEnvironment.loader(fixture);
const field = await loader.getHarness(MatInputHarness);
await field.setValue('angular');
```
::
:::

**Pourquoi** : le test « bad » est couplé aux détails d'implémentation — le sélecteur `input.search-field`, l'événement exact à dispatcher, l'appel manuel à `detectChanges`. Renommer une classe CSS ou passer à un autre élément casse le test alors que le comportement est intact : c'est un test fragile qui décourage le refactoring. Le harness expose un contrat sémantique (`setValue`) : il encapsule le sélecteur, gère lui-même la stabilisation asynchrone (zone, change detection) et reste valide tant que le composant *fait* la même chose. On teste l'intention, pas le câblage.

## Marble testing avec TestScheduler

Pour la logique RxJS (debounce, switchMap, retry), tester via le temps réel est lent et indéterministe. Le `TestScheduler` virtualise l'horloge : on décrit les flux en diagrammes ASCII et on assert l'égalité.

```ts
import { TestScheduler } from 'rxjs/testing';

it('debounce ne garde que la dernière valeur dans la fenêtre', () => {
  const scheduler = new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });

  scheduler.run(({ cold, expectObservable }) => {
    const source = cold('a-b-c---|');
    const result = source.pipe(debounceTime(3, scheduler));
    //  émissions séparées de <3 frames sont écrasées
    expectObservable(result).toBe('------c-|');
  });
});
```

:::callout{type="tip"}
Dans `scheduler.run`, tous les schedulers asynchrones sont automatiquement virtualisés : un `debounceTime` de 200 ms s'exécute instantanément. C'est le seul moyen de tester un typeahead `switchMap` de façon déterministe.
:::

## MSW pour l'intégration HTTP

`HttpTestingController` reste bon pour vérifier qu'une requête *part* avec les bons paramètres. Mais pour tester un composant de bout en bout contre une API réaliste — y compris erreurs, latence, pagination — MSW intercepte au niveau réseau (Service Worker / fetch), de façon partagée entre tests unitaires et E2E.

```ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/orders', () => HttpResponse.json([{ id: 1, total: 42 }])),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

L'avantage décisif : les mêmes handlers servent en Vitest et en Playwright, donc une seule source de vérité pour le contrat d'API simulé.

## Idée reçue : « E2E couvre tout, le reste est redondant »

Faux, et c'est un piège de coût. Un test E2E qui valide une règle de validation de formulaire paie le prix d'un navigateur, d'un serveur, d'un parcours complet pour vérifier une logique qu'un test unitaire couvrirait en millisecondes — et il échouera pour mille raisons sans rapport (réseau, timing, sélecteur). Les E2E sont chers, lents et instables ; ils doivent rester rares et cibler les **parcours critiques** (login → achat → confirmation), pas la logique. La logique pure va en unitaire, le rendu en harness, les flux en marbles. La couverture vient de la combinaison, pas de l'empilement d'E2E.

## Code source

Pour comprendre les fondations de ces outils :

- Les harnesses CDK et la stabilisation asynchrone (`ComponentHarness`, `HarnessLoader`, `waitForTasksOutsideAngular`) : `packages/cdk/testing/` dans le dépôt `angular/components`, en particulier `component-harness.ts` et `testbed/testbed-harness-environment.ts`.
- Le `TestScheduler` et le parsing des diagrammes marble : `src/internal/testing/TestScheduler.ts` du dépôt `ReactiveX/rxjs` (voir `parseMarbles` et `createColdObservable`).
- `HttpTestingController` côté Angular : `packages/common/http/testing/src/backend.ts`.

Lire `TestScheduler.run` montre comment il substitue les schedulers globaux par un `VirtualTimeScheduler` le temps du callback, ce qui explique la virtualisation automatique du temps.
