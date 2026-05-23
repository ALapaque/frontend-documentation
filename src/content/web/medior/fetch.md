---
title: "fetch et les requêtes réseau"
slug: "fetch"
framework: "web"
level: "medior"
order: 1
duration: 14
prerequisites: []
updated: 2026-05-23
seoTitle: "fetch : Promise, response.ok, JSON et AbortController"
seoDescription: "Maîtriser fetch : await et Promise, le piège du response.ok (404/500 ne rejettent pas), parsing JSON, gestion d'erreur, annulation et timeout avec AbortController."
ogVariant: "gold"
related:
  - { framework: "web", slug: "events" }
---

`fetch()` est l'API standard pour parler au réseau. Elle renvoie une **Promise** : une valeur qui n'est pas encore là, mais qui le sera (résolue) ou échouera (rejetée). Comprendre `fetch`, ce n'est pas mémoriser une signature, c'est comprendre le **cycle de vie d'une requête** et les deux endroits exacts où les choses peuvent tourner mal : la couche transport, et le code applicatif HTTP.

## La forme de base : Promise et await

`fetch(url)` lance la requête et résout sa Promise dès que les **en-têtes de la réponse** sont arrivés — pas le corps. C'est pourquoi lire le corps (`.json()`, `.text()`) renvoie une *seconde* Promise : le téléchargement du body est asynchrone et peut arriver en flux.

```js
async function getUser(id) {
  const response = await fetch(`/api/users/${id}`);
  const user = await response.json(); // 2e await : le body se télécharge
  return user;
}
```

`await` suspend la fonction `async` jusqu'à résolution de la Promise, sans bloquer le thread principal : l'event loop continue de traiter les autres tâches pendant l'attente. C'est de l'asynchrone coopératif, pas du blocage.

## Le piège central : fetch ne rejette pas sur 404 / 500

C'est l'erreur la plus coûteuse de l'API. La Promise de `fetch` n'est rejetée **que** si la requête n'a pas pu aboutir au niveau réseau : DNS échoué, connexion coupée, CORS bloqué, requête annulée. Une réponse HTTP `404` ou `500` est, du point de vue du transport, une **requête réussie** : le serveur a répondu. La Promise est donc *résolue*, et c'est à toi d'inspecter `response.ok` (vrai pour les statuts 200–299).

:::compare
::bad
```js
try {
  const res = await fetch("/api/users/999");
  const user = await res.json(); // 404 -> body souvent vide -> throw ici, par hasard
  return user;
} catch (e) {
  // on croit attraper "le réseau", on attrape un parse JSON foireux
}
```
::
::good
```js
const res = await fetch("/api/users/999");
if (!res.ok) {
  // 404, 500... : on décide explicitement quoi faire
  throw new Error(`HTTP ${res.status} sur ${res.url}`);
}
return await res.json();
```
::
:::

**Pourquoi.** À gauche, on suppose que `fetch` lèverait une erreur sur un `404`. Il ne le fait pas : la Promise est résolue car le serveur *a répondu*. Le seul `throw` qui survient est accidentel — `res.json()` échoue parce que le corps d'erreur n'est pas du JSON valide. Ton `catch` confond alors « ressource introuvable » et « réponse illisible », et tu perds le `status`. À droite, on sépare les deux couches du cycle de vie : la couche transport (gérée par le rejet de la Promise, donc par un `try/catch` autour du `fetch`) et la couche HTTP applicative (gérée par `res.ok` / `res.status`). C'est cette distinction qui rend la gestion d'erreur fiable.

## Lire le corps : JSON et compagnie

Le body d'une réponse est un flux qu'on ne lit **qu'une fois**. Choisis la méthode selon le `Content-Type` : `.json()`, `.text()`, `.blob()` (binaire), `.arrayBuffer()`, `.formData()`. Appeler deux méthodes de lecture sur la même réponse jette une erreur (`body stream already read`).

```js
const res = await fetch("/api/data");
const type = res.headers.get("content-type") ?? "";
const data = type.includes("application/json")
  ? await res.json()
  : await res.text();
```

## Gestion d'erreur complète

Une fonction robuste couvre les trois cas : échec réseau (rejet), échec HTTP (`!res.ok`), et corps invalide. Un seul `try/catch` ne suffit pas à les distinguer si tu n'es pas explicite.

```js app.js
async function api(url, options) {
  let res;
  try {
    res = await fetch(url, options);          // 1. couche transport
  } catch (cause) {
    throw new Error("Réseau indisponible", { cause });
  }
  if (!res.ok) {                              // 2. couche HTTP
    throw new Error(`Erreur serveur ${res.status}`);
  }
  try {
    return await res.json();                  // 3. corps
  } catch (cause) {
    throw new Error("Réponse JSON malformée", { cause });
  }
}
```

:::callout{type="info"}
L'option `cause` du constructeur `Error` (standard) attache l'erreur d'origine sans la perdre. Tu remontes un message métier clair tout en gardant la trace technique pour le débogage. C'est bien plus propre que de concaténer des chaînes.
:::

## Annulation et timeout : AbortController

`fetch` n'a pas de timeout intégré. Une requête peut rester en suspens indéfiniment, ou devenir inutile (l'utilisateur a changé de page, retapé sa recherche). `AbortController` produit un `signal` qu'on passe à `fetch` ; appeler `controller.abort()` rejette la Promise avec une erreur `AbortError`.

```js
// Timeout de 5 s, prêt à l'emploi :
const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
```

```js
// Annulation manuelle (ex. recherche au clavier) :
const controller = new AbortController();
const promesse = fetch(url, { signal: controller.signal });
// à la frappe suivante, on annule la requête précédente :
controller.abort();
```

`AbortSignal.timeout(ms)` est la forme moderne et concise pour un délai maximal. Pour combiner plusieurs raisons d'annulation (timeout **et** action utilisateur), `AbortSignal.any([s1, s2])` fusionne plusieurs signaux.

:::callout{type="tip"}
Distingue l'annulation volontaire des vraies erreurs : dans ton `catch`, teste `if (err.name === "AbortError") return;`. Une requête annulée n'est pas un bug — inutile d'afficher un message d'erreur à l'utilisateur.
:::

## Headers et méthodes

Pour autre chose qu'un `GET`, tu passes un objet d'options. Les `headers` informent le serveur du format envoyé et attendu ; le `body` doit être sérialisé (`JSON.stringify` pour du JSON, ou directement un `FormData` qui pose son propre `Content-Type`).

```js
await fetch("/api/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Ada" }),
});
```

Note : avec un `FormData` comme `body`, **ne fixe pas** `Content-Type` toi-même — le navigateur ajoute le bon en-tête `multipart` avec sa frontière (`boundary`). Le forcer casse l'envoi.

## À retenir

:::cheatsheet
- title: "Promise + await"
  desc: "fetch résout aux en-têtes ; lire le body est un second await asynchrone."
- title: "response.ok"
  desc: "Le piège : 404/500 résolvent la Promise. Vérifie res.ok, sinon throw toi-même."
- title: "Rejet = réseau"
  desc: "fetch ne rejette que sur échec transport (DNS, CORS, abort), pas sur statut HTTP."
- title: "Body lu une fois"
  desc: "json / text / blob : une seule lecture par réponse, choisie selon le Content-Type."
- title: "AbortController"
  desc: "Annulation et timeout via signal ; AbortSignal.timeout(ms) pour un délai max."
- title: "Headers cohérents"
  desc: "Content-Type pour JSON ; ne le force pas avec FormData (boundary auto)."
:::
