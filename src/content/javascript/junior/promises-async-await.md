---
title: "Promesses et async/await"
slug: "promises-async-await"
framework: "javascript"
level: "junior"
order: 2
duration: 16
prerequisites: []
updated: 2026-11-27
seoTitle: "Promesses et async/await en JavaScript — Promise.all, AbortSignal, Promise.try"
seoDescription: "Les promesses expliquées pas à pas : les trois états, then/catch/finally, async/await, l'await oublié, Promise.all et ses cousins, l'annulation par AbortSignal. Avec les ajouts récents : Promise.withResolvers, Promise.try et Array.fromAsync."
ogVariant: "sage"
related:
  - { framework: "web", slug: "fetch" }
  - { framework: "javascript", slug: "event-loop" }
  - { framework: "javascript", slug: "scope-closures" }
  - { framework: "typescript", slug: "utility-types" }
---

JavaScript ne fait qu'une chose à la fois. Or une requête réseau prend 200 ms,
parfois 3 secondes : s'il attendait les bras croisés, la page resterait figée. La
parade : lancer le travail, **continuer**, et être prévenu quand le résultat arrive.
Ce « résultat à venir » est un objet : une **promesse** (`Promise`).

Pense au bipeur qu'on te remet au comptoir d'un fast-food. Tu n'as pas encore ton
plateau, mais tu peux aller t'asseoir au lieu de bloquer la file : il sonnera quand
ce sera prêt, ou on t'annoncera une rupture de stock. `fetch`, la lecture d'un
fichier, l'accès au presse-papiers : tout ce qui prend du temps te remet un bipeur.

## Une promesse, trois états

Une promesse est toujours dans l'un de ces trois états :

- **en attente** (`pending`) : le travail est en cours, le bipeur est muet ;
- **tenue** (`fulfilled`) : le travail a réussi, elle porte une **valeur** ;
- **rejetée** (`rejected`) : il a échoué, elle porte une **raison** (une erreur).

Le changement d'état n'a lieu qu'une fois et il est définitif : la promesse est alors
**réglée** (`settled`). Dans le langage courant, « résolue » veut souvent dire tenue.

### Réagir avec then, catch et finally

Tu ne lis pas sa valeur : tu lui confies une fonction à appeler le moment venu.

```js
fetch("/api/users/42")
  .then((response) => response.json()) // renvoie une promesse : la chaîne l'attend
  .then((user) => renderProfile(user)) // reçoit la valeur, pas la promesse
  .catch((error) => showError(error)) // toute erreur survenue plus haut atterrit ici
  .finally(() => hideSpinner()); // succès ou échec, on masque le chargement
```

Ce **chaînage** fonctionne parce que chaque `then` renvoie une *nouvelle* promesse,
tenue avec ce que retourne ta fonction ; si c'est une promesse, la chaîne l'attend.
Si une erreur est levée ou une promesse rejetée en route, les `then` suivants sont
sautés jusqu'au premier `catch`. Et ta fonction ne s'exécute jamais sur-le-champ,
même si la promesse est déjà tenue : elle passe par la file des microtâches, que
détaille [L'event loop](/javascript/medior/event-loop).

## async / await : la même chose, en plus lisible

`async` et `await` n'ajoutent aucun pouvoir : c'est une autre écriture des mêmes
promesses, du « sucre syntaxique ». Deux règles suffisent :

- une fonction `async` renvoie **toujours** une promesse ;
- `await promesse` met la fonction en pause jusqu'à ce que la promesse soit réglée,
  puis donne sa valeur, ou **lève** sa raison comme une exception.

La pause ne concerne que la fonction : le reste de la page continue de vivre. Et
puisqu'un rejet devient une exception, tu retrouves le `try / catch / finally`
habituel. Voici la chaîne précédente, réécrite :

```js
async function loadProfile(id) {
  try {
    const response = await fetch(`/api/users/${id}`);
    const user = await response.json();
    renderProfile(user);
  } catch (error) {
    showError(error);
  } finally {
    hideSpinner();
  }
}
```

### Le piège numéro un : l'await oublié

```js
async function saveProfile(profile) {
  try {
    api.save(profile); // await oublié : la fonction n'attend pas
    showToast("Profil enregistré"); // affiché avant la fin de la sauvegarde
  } catch (error) {
    showToast("Échec de l'enregistrement"); // jamais atteint
  }
}
```

Sans `await`, `api.save()` te remet son bipeur et la fonction continue : le succès
s'affiche alors que rien n'est enregistré. Si la sauvegarde échoue ensuite, le rejet
survient *après* la sortie du `try` : le `catch` ne le verra jamais.

Une promesse rejetée que personne n'écoute est un **rejet non géré** : le navigateur
affiche une erreur du type `Uncaught (in promise)` et déclenche l'événement
`unhandledrejection` ; Node.js arrête le processus par défaut. La règle ESLint
`@typescript-eslint/no-floating-promises` repère ces promesses laissées sans `await`.

## Séquentiel ou parallèle

`await` attend ; il ne lance rien. Le travail démarre quand tu **appelles** la
fonction, pas quand tu attends son résultat. Selon l'endroit où tu places tes
`await`, les opérations se suivent ou se chevauchent.

:::compare
::bad
```js
const users = [];
for (const id of ids) {
  // chaque requête attend la fin de la précédente
  users.push(await getUser(id));
}
```
::
::good
```js
// toutes les requêtes partent tout de suite
const promises = ids.map((id) => getUser(id));
const users = await Promise.all(promises);
```
::
:::

**Pourquoi.** Avec dix utilisateurs et 200 ms par requête, la boucle met 2 secondes ;
`Promise.all` environ 200 ms, car les dix requêtes voyagent ensemble, et le tableau
obtenu suit l'ordre des promesses fournies, pas l'ordre d'arrivée. La boucle reste le
bon choix quand une étape dépend de la précédente, ou pour ménager un serveur.

## Quatre combinateurs, quatre besoins

`Promise.all` a trois cousins. Tous prennent une liste de promesses et en renvoient
une seule ; ils diffèrent sur le moment où celle-ci est réglée.

| Combinateur | Réglée… | Te donne | Pour |
| --- | --- | --- | --- |
| `Promise.all` | quand toutes sont tenues, ou dès le premier rejet | le tableau des valeurs | des données toutes indispensables |
| `Promise.allSettled` | quand toutes sont réglées ; ne rejette jamais | un bilan par promesse | des blocs indépendants |
| `Promise.race` | dès la première réglée, tenue ou rejetée | son résultat, bon ou mauvais | ne garder que la plus rapide |
| `Promise.any` | dès la première tenue | sa valeur, ou `AggregateError` si toutes échouent | plusieurs sources équivalentes |

```js
const results = await Promise.allSettled([loadStats(), loadNews(), loadWeather()]);
// [{ status: "fulfilled", value: … }, { status: "rejected", reason: … }, …]
const widgets = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
```

Sur un tableau de bord, un bloc en panne ne doit pas faire tomber les autres : avec
`Promise.all`, un seul rejet t'aurait fait perdre les trois résultats.

## Annuler : AbortController et AbortSignal

Une promesse, c'est le bipeur, pas la cuisine : elle annonce un résultat, elle ne
peut pas arrêter le travail. Les combinateurs non plus : quand `Promise.all` rejette,
les autres opérations continuent en arrière-plan. L'annulation passe par un objet à
part : un `AbortController` fabrique un `signal` que tu passes à `fetch`, et
`controller.abort()` interrompt la requête en rejetant sa promesse.

Deux raccourcis t'épargnent la plomberie : `AbortSignal.timeout(ms)` se déclenche
tout seul après un délai, et `AbortSignal.any([...])` fusionne plusieurs signaux en
un seul, déclenché par le premier qui part.

```js
const controller = new AbortController();
cancelButton.addEventListener("click", () => controller.abort());
const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]);

try {
  const response = await fetch("/api/report", { signal });
  renderReport(await response.json());
} catch (error) {
  if (error.name === "TimeoutError") showToast("Le serveur met trop de temps.");
  else if (error.name !== "AbortError") throw error; // annulation voulue : silence
}
```

Le nom de l'erreur te dit qui a déclenché l'arrêt : `AbortError` pour `abort()`,
`TimeoutError` pour le délai. Les bases sont dans [fetch](/web/medior/fetch), les
bugs que l'annulation évite dans [Race conditions async](/compare/race-conditions)
et [Sécurité au démontage](/compare/unmount-safety).

## Trois ajouts récents

Trois méthodes récentes du standard, disponibles dans les navigateurs actuels :

| Méthode | Édition | Chrome | Firefox | Safari | Node.js |
| --- | --- | --- | --- | --- | --- |
| `Promise.withResolvers()` | ES2024 | 119 | 121 | 17.4 | 22 |
| `Promise.try()` | ES2025 | 128 | 134 | 18.2 | 23 |
| `Array.fromAsync()` | ES2026 | 121 | 115 | 16.4 | 22 |

```js
// new Promise : resolve n'existe que dans la fonction passée au constructeur
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Promise.withResolvers() : la promesse et ses deux commandes, côte à côte
const { promise, resolve, reject } = Promise.withResolvers();
dialog.addEventListener("close", () => resolve(dialog.returnValue), { once: true });
const choice = await promise;

// Promise.try(fn) : une promesse quoi qu'il arrive, même si fn lève une erreur
Promise.try(() => handler(event)).catch((error) => report(error));

// Array.fromAsync(source) : un itérable asynchrone rassemblé dans un tableau
const lines = await Array.fromAsync(readLines(file));
```

- **`Promise.withResolvers()`** crée une promesse à la main, pour emballer une API à
  événements ou à callbacks sans tout imbriquer dans le constructeur.
- **`Promise.try(fn)`** appelle `fn` tout de suite : valeur, promesse ou erreur
  synchrone, tout ressort par la même promesse, donc par le même `catch`.
- **`Array.fromAsync(source)`** vaut une boucle `for await` qui ferait `push` : elle
  attend les éléments **un par un**. Pour le parallèle, garde `Promise.all`.

## Typer une promesse

En TypeScript, une promesse s'écrit `Promise<T>`, où `T` est le type de la valeur
tenue. `await` retire l'emballage.

```ts
async function getUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

const user = await getUser(42); // User, et non Promise<User>
type Loaded = Awaited<ReturnType<typeof getUser>>; // User
```

`Awaited<T>` fait dans les types ce que `await` fait dans le code : il est détaillé
dans [Les utility types](/typescript/medior/utility-types). Et `Promise<User>` est
une déclaration, pas une vérification : `response.json()` renvoie `any`. Côté option
`lib`, `Promise.withResolvers` arrive avec `es2024`, `Promise.try` avec `es2025` ;
`Array.fromAsync` est encore dans `esnext` en novembre 2026.

## À retenir

:::cheatsheet
- title: "Trois états"
  desc: "pending, puis fulfilled (valeur) ou rejected (raison) : une seule fois, définitivement."
- title: "then / catch / finally"
  desc: "Chaque then renvoie une nouvelle promesse ; une erreur saute jusqu'au premier catch."
- title: "await : une pause locale, à ne pas oublier"
  desc: "Suspend la fonction async, pas la page ; sans lui, le code continue et le rejet échappe au try."
- title: "Promise.all pour le parallèle"
  desc: "await dans une boucle = l'un après l'autre ; all, allSettled, race, any selon le besoin."
- title: "AbortController + signal"
  desc: "Une promesse ne s'annule pas seule ; AbortSignal.timeout et AbortSignal.any combinent les raisons."
:::
