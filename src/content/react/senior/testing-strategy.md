---
title: "Stratégie de test"
slug: "testing-strategy"
framework: "react"
level: "senior"
order: 7
duration: 20
prerequisites: ["forms-libs", "server-state"]
updated: 2026-05-22
seoTitle: "Stratégie de test — react"
seoDescription: "Testing Library (requêtes orientées utilisateur), MSW pour le réseau, Playwright component testing : quoi tester à quel niveau pour des tests robustes au refactor."
ogVariant: "crimson"
related:
  - framework: "vue"
    slug: "testing-strategy"
  - framework: "angular"
    slug: "testing-strategy"
---

Une stratégie de test n'est pas un outil mais une répartition : décider *quoi* tester à *quel niveau*. Le principe directeur, formulé par Testing Library : « more confidence the more your tests resemble the way your software is used ». On teste le comportement observable par l'utilisateur, pas l'implémentation. Trois outils couvrent les trois niveaux : RTL (unité/intégration de composants), MSW (frontière réseau), Playwright (composant rendu réel + e2e).

## RTL : requêtes orientées utilisateur

React Testing Library rend un composant et l'interroge comme un utilisateur : par rôle, label, texte — jamais par classe CSS ou structure interne. On simule des actions via `user-event`, on assert sur ce qui est visible.

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

test("affiche une erreur si email invalide", async () => {
  render(<Inscription />);
  const champ = screen.getByRole("textbox", { name: /email/i });
  await userEvent.type(champ, "pasunemail");
  await userEvent.click(screen.getByRole("button", { name: /envoyer/i }));
  expect(screen.getByText(/email invalide/i)).toBeVisible();
});
```

La priorité des requêtes (`getByRole` > `getByLabelText` > ... > `getByTestId` en dernier recours) n'est pas arbitraire : elle pousse vers des requêtes accessibles, donc vers une UI accessible. Un test qui passe par le rôle ARIA vérifie au passage que le composant est utilisable au clavier et au lecteur d'écran.

## Tester le comportement, pas l'implémentation : compare

:::compare
::bad
```tsx
// Couplé à l'implémentation : casse au moindre refactor
const { container } = render(<Compteur />);
const span = container.querySelector(".count-value");
fireEvent.click(container.querySelector("#inc-btn"));
expect(span.textContent).toBe("1");
// teste la classe CSS, l'id, la structure DOM
```
::
::good
```tsx
// Couplé au comportement utilisateur : survit au refactor
render(<Compteur />);
await userEvent.click(screen.getByRole("button", { name: /incrémenter/i }));
expect(screen.getByText("1")).toBeVisible();
```
::
:::

**Pourquoi** : la version `querySelector` ancre le test à des détails internes — nom de classe, id, arborescence — qui ne sont pas le contrat du composant. Renommer `.count-value`, passer d'un `<span>` à un `<output>`, ou réorganiser le DOM casse le test alors que le comportement observable est intact : faux négatif, friction au refactor, érosion de la confiance dans la suite. La version RTL interroge par rôle accessible et texte visible, c'est-à-dire par ce que l'utilisateur perçoit. Tant que le composant affiche un bouton « incrémenter » et un compteur, le test passe quelle que soit l'implémentation. Le mécanisme gagnant est le découplage : on teste le contrat (sortie observable + interactions), pas la mécanique interne, donc le test ne se brise que quand le comportement change réellement.

## MSW : intercepter le réseau

Mock Service Worker intercepte les requêtes au niveau réseau (fetch/XHR), pas en stubbant `fetch` ni ta couche de data. Le composant fait sa vraie requête ; MSW répond. Un seul jeu de handlers sert les tests unitaires (Node), les tests de composants et le dev en navigateur.

```tsx
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const server = setupServer(
  http.get("/api/user/:id", ({ params }) =>
    HttpResponse.json({ id: params.id, name: "Ada" })
  )
);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

:::callout{type="tip"}
Ne mocke pas ton client de data (TanStack Query, axios). Mocke la frontière réseau avec MSW : le test exerce alors ta vraie sérialisation, tes vrais headers, ta vraie gestion d'erreur HTTP. `resetHandlers` après chaque test évite la fuite d'état entre cas ; surcharge un handler dans un test précis pour simuler une 500 ou une latence.
:::

## Niveaux : quoi tester où

- **Unité/intégration (RTL + MSW, runner Vitest/Jest + jsdom)** : la majorité de la suite. Logique de composant, états dérivés, formulaires, branches d'erreur. Rapide, déterministe.
- **Composant réel (Playwright CT)** : monte le composant dans un *vrai* navigateur. Indispensable quand jsdom ment : layout, mesures (`getBoundingClientRect`), focus réel, animations, API navigateur. Plus lent, à réserver aux cas où le DOM simulé ne suffit pas.
- **E2E (Playwright)** : quelques parcours critiques de bout en bout (login → action → confirmation), sur l'app assemblée. Coûteux et plus flaky : peu nombreux, ciblés sur le risque métier.

La forme visée est un *trophée* de test (Kent C. Dodds) plutôt qu'une pyramide : masse au niveau intégration RTL, fine couche e2e au sommet, peu de tests purement unitaires sans valeur.

## Code source

RTL et `user-event` : `testing-library/react-testing-library` et `testing-library/user-event` ; le moteur de requêtes accessibles vit dans `testing-library/dom` (`src/queries/`), basé sur les rôles ARIA calculés par `dom-accessibility-api`. Le manifeste « Testing Implementation Details » et la page « About Queries » (priorité des requêtes) sur `testing-library.com` cadrent la philosophie. MSW : `mswjs/msw` (interception via Service Worker côté navigateur, `@mswjs/interceptors` côté Node). Playwright Component Testing : doc `playwright.dev/docs/test-components`, dépôt `microsoft/playwright`.

## À retenir

:::cheatsheet
- title: "Comportement, pas implémentation"
  desc: "Requêtes par rôle/label/texte ; jamais classe, id ou structure DOM. Survit au refactor."
- title: "MSW à la frontière réseau"
  desc: "Mocker fetch/XHR, pas ton client de data ; un jeu de handlers pour tests et dev."
- title: "Le bon niveau"
  desc: "Masse en intégration RTL+MSW ; Playwright CT quand jsdom ment ; e2e rares et critiques."
- title: "Trophée"
  desc: "Beaucoup d'intégration, peu d'e2e, peu d'unitaire isolé sans valeur."
:::
