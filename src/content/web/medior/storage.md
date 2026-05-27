---
title: "Le stockage côté client : localStorage, cookies, IndexedDB"
slug: "storage"
framework: "web"
level: "medior"
order: 3
duration: 14
prerequisites: []
updated: 2026-05-23
seoTitle: "Stockage navigateur : localStorage, cookies, IndexedDB et Cache API"
seoDescription: "Choisir la bonne API de stockage : localStorage synchrone et string-only, cookies et SameSite/HttpOnly/Secure, IndexedDB asynchrone pour les gros volumes, Cache API, quotas et sécurité."
ogVariant: "gold"
related:
  - { framework: "web", slug: "fetch" }
---

Le navigateur offre plusieurs zones de stockage, et le bon choix dépend de **trois axes** : synchrone ou asynchrone, volume, et qui peut y accéder (JS, serveur, Service Worker). Se tromper d'API, c'est soit bloquer le thread principal, soit exposer un secret, soit exploser un quota. Comprendre le **mécanisme** de chacune évite ces trois pièges.

## localStorage et sessionStorage : simples, mais synchrones

`localStorage` et `sessionStorage` partagent la même API (`getItem`, `setItem`, `removeItem`, `clear`). La différence de durée de vie : `localStorage` persiste indéfiniment, `sessionStorage` est vidé à la fermeture de l'onglet. Les deux sont **liés à l'origine** (scheme + host + port) : `https://app.com` ne voit pas le stockage de `https://api.app.com`.

Deux propriétés définissent leurs limites. D'abord, **tout est une string** : il n'existe aucun autre type. Ensuite, **toutes les opérations sont synchrones** et s'exécutent sur le thread principal.

```js
localStorage.setItem("theme", "dark");
const theme = localStorage.getItem("theme"); // "dark"
localStorage.getItem("inconnu"); // null, pas undefined
```

### Le piège du JSON

Comme seule la string existe, stocker un objet impose une **sérialisation** manuelle. `setItem(key, obj)` ne stocke pas l'objet : il appelle implicitement `String(obj)`, ce qui produit le tristement célèbre `"[object Object]"`.

:::compare
::bad
```js
const user = { id: 7, name: "Lina" };
localStorage.setItem("user", user);
localStorage.getItem("user"); // "[object Object]" : données perdues
```
::
::good
```js
const user = { id: 7, name: "Lina" };
localStorage.setItem("user", JSON.stringify(user));
const back = JSON.parse(localStorage.getItem("user") ?? "null");
```
::
:::

**Pourquoi.** L'API ne connaît que des chaînes : passer un objet déclenche une coercition `toString()` qui aplatit toute la structure en `"[object Object]"`. Il faut donc **sérialiser** en JSON à l'écriture et **désérialiser** à la lecture. Attention : `JSON.parse` jette une exception sur une valeur corrompue ou `null`, d'où le `?? "null"` défensif.

### Le piège du blocage

Comme l'accès est synchrone, écrire de gros volumes **bloque le thread principal** : tant que `setItem` n'a pas fini d'écrire sur le disque, l'UI ne peut ni peindre ni répondre aux événements. Sur un objet de plusieurs centaines de Ko, le `JSON.stringify` + l'écriture provoquent un jank visible.

:::callout{type="warn"}
N'utilise `localStorage` que pour de **petites** valeurs simples (préférences, flags, identifiant de thème). Pour tout ce qui dépasse quelques Ko ou s'écrit souvent, passe à IndexedDB : tu sors l'écriture du thread principal.
:::

## Les cookies : le seul stockage que le serveur voit

Un cookie est une petite paire clé/valeur que le navigateur **renvoie automatiquement** dans l'en-tête `Cookie` de chaque requête vers le domaine. C'est ce qui les distingue radicalement de `localStorage` : ils traversent le réseau. D'où leur usage pour les **sessions** d'authentification.

Trois attributs gouvernent leur sécurité, et tu dois les connaître :

- **`HttpOnly`** : le cookie devient **invisible à JavaScript** (`document.cookie` ne le lit pas). C'est la défense de base contre le vol de session par XSS.
- **`Secure`** : le cookie n'est envoyé que sur HTTPS, jamais en clair.
- **`SameSite`** : contrôle l'envoi en contexte tiers. `Strict` ne l'envoie jamais en cross-site, `Lax` l'envoie sur navigation de premier niveau (clic sur un lien), `None` (qui exige `Secure`) l'envoie partout. C'est le rempart principal contre le CSRF.

```js
// Côté serveur (ce que JS ne devrait PAS faire pour une session) :
// Set-Cookie: sid=abc; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600
```

Côté client, `document.cookie` est une API maladroite (concaténation de strings) ; on ne l'utilise que pour des cookies non sensibles. Les cookies de session se posent **côté serveur** avec `HttpOnly`.

## IndexedDB : asynchrone, transactionnel, gros volumes

IndexedDB est une **base de données orientée objet** dans le navigateur. Contrairement à `localStorage`, elle est **asynchrone** (les opérations passent par des requêtes et des transactions, jamais bloquantes), stocke des objets structurés sans sérialisation manuelle (algorithme de **clonage structuré**, qui gère `Date`, `Blob`, `Map`, etc.), et accepte des centaines de Mo.

Son API native est verbeuse (events `onsuccess`/`onerror`). En 2026, on l'enrobe quasi toujours avec une mini-lib basée sur Promises (type `idb`).

```js
import { openDB } from "idb";

const db = await openDB("app", 1, {
  upgrade(db) {
    db.createObjectStore("users", { keyPath: "id" });
  },
});

await db.put("users", { id: 7, name: "Lina", avatar: blob });
const user = await db.get("users", 7); // objet reconstruit, pas de JSON.parse
```

**Pourquoi l'asynchrone change tout.** Chaque lecture/écriture est planifiée par le moteur et résolue plus tard via une microtâche : le thread principal reste libre de peindre l'UI pendant l'I/O disque. C'est exactement ce qui manque à `localStorage`.

## Cache API en bref

La **Cache API** (`caches.open`, `cache.put`, `cache.match`) stocke des paires **Request/Response** complètes. Elle est conçue pour les Service Workers et le mode hors ligne : on y met des assets et des réponses réseau, pas des données applicatives arbitraires. Asynchrone elle aussi, elle partage le quota de stockage de l'origine.

## Comment choisir

:::cheatsheet
- title: "localStorage"
  desc: "petites strings, préférences ; synchrone, à éviter pour les gros volumes"
- title: "sessionStorage"
  desc: "idem mais vidé à la fermeture de l'onglet"
- title: "Cookies"
  desc: "sessions d'auth ; HttpOnly + Secure + SameSite, posés côté serveur"
- title: "IndexedDB"
  desc: "objets structurés, gros volumes, écritures fréquentes ; asynchrone"
- title: "Cache API"
  desc: "Request/Response pour le mode hors ligne et les Service Workers"
:::

## Quotas et sécurité

Chaque origine dispose d'un **quota** partagé (souvent un pourcentage de l'espace disque libre) couvrant IndexedDB et la Cache API. Tu peux l'interroger via `navigator.storage.estimate()` et demander une persistance résistante à l'éviction avec `navigator.storage.persist()`. Sous pression disque, le navigateur **évince** le stockage non persistant des origines les moins utilisées.

Règle non négociable : **ne stocke jamais de secret** (token longue durée, clé d'API, mot de passe) dans `localStorage` ni dans un cookie lisible par JS. Tout ce qui est accessible à JavaScript est exfiltrable par une faille XSS. Les jetons de session vivent dans des cookies `HttpOnly`, hors de portée du script.
