---
title: "Playwright : les tests end-to-end fiables"
slug: "playwright"
framework: "tooling"
level: "medior"
order: 5
duration: 16
prerequisites: ["vitest"]
updated: 2026-07-09
seoTitle: "Playwright — tests E2E sans flakiness : auto-waiting, locators et Trace Viewer"
seoDescription: "Playwright rend les tests end-to-end fiables : auto-waiting qui tue le flaky, locators par rôle accessible, web-first assertions qui réessaient, fixtures isolées et Trace Viewer pour déboguer un échec de CI image par image."
ogVariant: "sage"
related:
  - { framework: "tooling", slug: "vitest" }
  - { framework: "tooling", slug: "ci-cd" }
---

Les tests end-to-end (E2E) traînent une sale réputation : lents, « flaky » (verts
un coup sur deux sans qu'on touche au code), truffés de `sleep(500)` glissés là
pour « laisser le temps » à la page. Ce réflexe est la maladie, pas le remède.
Playwright attaque la **cause racine du flaky** — les attentes mal gérées — avec
l'auto-waiting, dans un vrai navigateur, sans que tu orchestres le timing à la main.

## Le flaky et l'auto-waiting

Un test E2E casse presque toujours pour la même raison : il agit **trop tôt**. Tu
cliques avant que le bouton soit rendu, tu lis un texte avant que la requête
réponde. Le DOM n'est pas synchrone avec ton script : il vit au rythme du réseau,
du rendu et du JS. La parade artisanale — le `sleep` — « marche » sur ta machine
rapide puis explose sur la CI plus lente ; tu rallonges le délai, la suite devient
interminable, et le flaky revient au premier pic de latence.

Playwright supprime le problème : avant **chaque** action, il vérifie que l'élément
est *actionnable* — attaché au DOM, visible, stable (plus d'animation), prêt à
recevoir l'événement (ni masqué, ni désactivé). Sinon, il réessaie jusqu'au
timeout. Tu décris **quoi** faire, pas **quand**.

:::compare
::bad
```ts
// Tu devines le timing à la main : fragile et lent
await page.waitForTimeout(500);            // et si c'est plus long ?
await page.waitForSelector('#submit');     // deux étapes manuelles
await page.click('#submit');               // clic qui peut rater l'anim
```
::
::good
```ts
// Auto-waiting : la vérification d'actionnabilité est incluse dans click()
await page.getByRole('button', { name: 'Valider' }).click();
```
::
:::

**Pourquoi.** À gauche, tu réimplémentes une attente que Playwright fait mieux, et
le `waitForTimeout` fixe est un pari sur la vitesse de la machine. À droite,
`click()` attend *intrinsèquement* que le bouton soit prêt : pas de course entre
ton script et le DOM.

## Les locators : cibler par rôle accessible

Un `locator` n'est pas un élément figé, c'est une **description** de « comment
trouver cet élément », rejouée au dernier moment à chaque action — ce qui rend
l'auto-waiting possible. Reste **par quoi** tu cibles : un sélecteur CSS comme
`.btn-primary.mt-4 > span` est couplé au style, un refactor le casse alors que le
comportement est intact. Playwright pousse les **locators par rôle accessible**,
qui décrivent l'élément comme un utilisateur le perçoit.

```ts
// Par rôle ARIA + nom accessible : ce que « voit » l'utilisateur
await page.getByRole('button', { name: 'Ajouter au panier' }).click();
await page.getByLabel('Adresse e-mail').fill('a@b.co');   // par le label du champ
await page.getByText('Commande confirmée').click();       // par le texte visible
await page.getByTestId('cart-total');                     // dernier recours
```

**Pourquoi.** Cibler par rôle aligne le test sur l'**accessibilité** : si
`getByRole('button', …)` ne trouve rien, c'est souvent que l'élément n'est pas un
vrai bouton accessible — garde-fou a11y gratuit. Ces locators résistent aux
changements cosmétiques ; réserve `getByTestId` aux cas sans rôle ni texte stable.

:::callout{type="tip"}
Le codegen (`npx playwright codegen`) enregistre tes clics et propose les locators
dans le bon ordre de priorité : rôle, texte, test id. Utilise-le pour démarrer.
:::

## Les web-first assertions

Une assertion classique est **instantanée** : elle regarde l'état à l'instant T et
tranche — donc reproduit le bug du timing dans la vérification, en affirmant qu'un
texte est là avant que la requête réponde. Les **web-first assertions** réessaient :
`expect(locator)` renvoie un matcher asynchrone qui **réévalue la condition** jusqu'à
ce qu'elle soit vraie ou que le timeout tombe. D'où le `await` obligatoire.

:::compare
::bad
```ts
// Assertion instantanée sur une valeur figée : flaky
const txt = await page.getByTestId('status').textContent();
expect(txt).toBe('Payé');   // lu trop tôt → échec aléatoire
```
::
::good
```ts
// Web-first : réessaie jusqu'au timeout que la condition devienne vraie
await expect(page.getByTestId('status')).toHaveText('Payé');
await expect(page.getByRole('alert')).toBeVisible();
```
::
:::

**Pourquoi.** `toBeVisible()`, `toHaveText()`, `toBeEnabled()` intègrent la même
logique d'attente que les actions : la vérification *contient* l'attente. C'est la
brique qui élimine le `waitForSelector` défensif avant chaque `expect`.

## Les fixtures : un test isolé par défaut

Un test qui dépend de l'état laissé par le précédent est une bombe à retardement :
il passe dans l'ordre, échoue en parallèle, impossible à déboguer. Playwright règle
ça par les **fixtures** : chaque test reçoit son propre **contexte navigateur**
(`context`) — cookies, `localStorage` et session vierges. Deux tests ne partagent
jamais d'état, ce qui autorise l'exécution parallèle sans interférence. `test.extend`
te laisse composer tes **propres fixtures** (page authentifiée, données préparées)
pour ne pas répéter le même setup partout.

```ts
import { test as base, expect } from '@playwright/test';

// Fixture perso : une page déjà connectée
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill('user@demo.io');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await use(page);          // le test s'exécute ici, avec la page prête
  },
});

test('accède au tableau de bord', async ({ authedPage }) => {
  await expect(authedPage.getByRole('heading', { name: 'Tableau de bord' }))
    .toBeVisible();
});
```

**Pourquoi.** La fixture centralise le setup **et** le teardown (le code après
`use` sert au nettoyage), et Playwright ne monte que les fixtures réellement
demandées. Isolation sans boilerplate, parallélisme sûr par construction.

## Le Trace Viewer : rejouer un échec de CI

Le pire scénario du E2E : un test rouge sur la CI, vert en local. Sans navigateur
sous les yeux, impossible de savoir *ce qui s'est passé* à la milliseconde de
l'échec. Active la trace (souvent `trace: 'on-first-retry'`), et Playwright
enregistre tout : **timeline** des actions, **snapshot du DOM** à chaque étape,
**requêtes réseau**, **console** et captures d'écran — un fichier que la CI archive
comme artefact.

```bash
# La CI produit trace.zip ; tu le rejoues en local, image par image
npx playwright show-trace trace.zip
```

**Pourquoi.** C'est l'arme anti « ça marche chez moi ». Tu rembobines l'exécution
exacte de la CI : tu survoles l'action fautive, tu inspectes le DOM tel qu'il était,
tu vois si une requête a renvoyé un 500 ou si un overlay masquait le bouton. Le
débogage passe de la devinette à l'observation.

:::callout{type="info"}
`npx playwright test --ui` ouvre le **mode UI** : mêmes timeline et snapshots, mais
en temps réel pendant que tu écris tes tests, avec réexécution au clic et voyage
dans le temps sur chaque étape. Le Trace Viewer en mode développement.
:::

## E2E ou unitaire : placer le curseur

Un test E2E est précieux mais **coûteux** : vrai navigateur, dépendance au réseau,
plus lent qu'un unitaire. La répartition tient dans l'image de la **pyramide** (ou
du **trophée**) des tests : beaucoup d'unitaires rapides à la base, une couche
d'intégration, un **petit** sommet de E2E sur les parcours critiques (login,
paiement, checkout).

- **Logique pure, composant isolé, cas limites** → test unitaire côté
  [Vitest](/tooling/vitest) : millisecondes, aucun navigateur.
- **Parcours utilisateur complet, plusieurs pages, vrai réseau** → Playwright.

Playwright gère aussi d'autres besoins sans changer d'outil :

- **Component testing** : monter un composant React/Vue/Svelte isolé dans un vrai
  navigateur (`@playwright/experimental-ct-*`), quand jsdom ne suffit pas.
- **Exécution parallèle** : les fichiers sont répartis sur plusieurs *workers* par
  défaut ; l'isolation par contexte rend ce parallélisme sûr.
- **Agents (2026)** : `npx playwright init-agents` installe un trio *planner /
  generator / healer* branché sur le **serveur MCP** de Playwright ; le healer
  répare un locator cassé par un renommage. Un accélérateur, pas un remplacement de
  ton jugement sur *quoi* tester.

## À retenir

L'auto-waiting est le cœur de Playwright : il attend qu'un élément soit actionnable
avant d'agir, ce qui tue la classe entière des bugs de timing. Combine-le aux
locators par rôle (résistants, alignés a11y), aux web-first assertions qui
réessaient, à l'isolation par fixtures et au Trace Viewer, et tu obtiens des E2E
stables. Garde-les rares : au sommet de la pyramide, pour les parcours qui comptent.

:::cheatsheet
- title: "Auto-waiting"
  desc: "Chaque action attend que l'élément soit actionnable : plus de sleep."
- title: "Locators par rôle"
  desc: "getByRole/getByLabel/getByText : résistants aux refactors CSS, alignés a11y."
- title: "Web-first assertions"
  desc: "await expect(locator).toBeVisible() réessaie jusqu'au timeout."
- title: "Fixtures isolées"
  desc: "Contexte navigateur neuf par test ; test.extend pour auth/données."
- title: "Trace Viewer"
  desc: "show-trace rejoue un échec de CI : DOM, réseau, console, image par image."
- title: "E2E rares"
  desc: "Sommet de la pyramide ; la logique fine reste côté Vitest."
:::
