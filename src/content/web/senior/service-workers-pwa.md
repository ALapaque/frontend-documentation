---
title: "Service Workers et PWA"
slug: "service-workers-pwa"
framework: "web"
level: "senior"
order: 4
duration: 16
prerequisites: []
updated: 2026-05-23
seoTitle: "Service Workers et PWA : cycle de vie, cache et offline"
seoDescription: "Maîtrise le cycle de vie d'un service worker (install, activate, fetch), les stratégies de cache (cache-first, network-first, stale-while-revalidate), la Cache API, le manifest et l'installabilité, l'offline et le piège du contenu périmé avec le versioning."
ogVariant: "crimson"
related:
  - { framework: "web", slug: "core-web-vitals" }
---

## Ce qu'est vraiment un service worker

Un **service worker** (SW) est un script qui tourne dans un thread séparé, sans accès au DOM, et qui agit comme un **proxy réseau programmable** entre ta page et le réseau. Il intercepte les requêtes sortantes (`fetch`), peut y répondre depuis un cache, et survit à la fermeture de l'onglet. C'est le socle des **PWA** (Progressive Web Apps) : offline, installabilité, push, background sync.

Deux propriétés structurent tout le reste. D'abord il est **event-driven et éphémère** : le navigateur le démarre quand un événement arrive (`fetch`, `push`) puis le tue dès qu'il est idle — tu ne peux **pas** y garder d'état en mémoire entre deux événements (utilise IndexedDB/Cache API). Ensuite il n'est servi que sur **HTTPS** (ou `localhost`), parce qu'un proxy réseau persistant entre de mauvaises mains serait une catastrophe.

## Le cycle de vie : install, activate, fetch

L'enregistrement déclenche une machine à états précise, conçue pour ne **jamais casser une page déjà ouverte**.

```js
// dans la page
navigator.serviceWorker.register('/sw.js', { scope: '/' });
```

- **install** : premier événement. C'est là qu'on précache le *shell* de l'app (`event.waitUntil(...)` garde le SW vivant jusqu'à la fin de la promesse). Un SW installé attend ensuite — il ne prend pas le contrôle tout de suite.
- **activate** : déclenché quand le nouveau SW prend le relais. C'est l'endroit pour **nettoyer les vieux caches**. Par défaut il n'active le nouveau SW que lorsque **tous les onglets contrôlés par l'ancien sont fermés**.
- **fetch** : à chaque requête dans le scope, le SW peut répondre via `event.respondWith(...)`.

```js
const VERSION = 'v7';
const SHELL = `shell-${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) =>
    c.addAll(['/', '/app.css', '/app.js', '/offline.html'])));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)))));
});
```

:::callout{type="warn"}
La fonction `self.skipWaiting()` force le nouveau SW à s'activer **sans attendre la fermeture des onglets**. Pratique, mais dangereuse : si tes pages déjà ouvertes ont chargé `app.js` v6 et que le SW commence à servir `app.css` v7, tu casses le contrat HTML/CSS/JS d'une session vivante. Ne `skipWaiting()` que si tes assets sont compatibles, ou propose un bouton « recharger pour mettre à jour » et appelle `skipWaiting()` sur action explicite de l'utilisateur.
:::

## Les stratégies de cache

La `Cache API` (`caches.open`, `cache.match`, `cache.put`) stocke des paires Request/Response. La stratégie choisie dépend de la **fraîcheur exigée** par chaque ressource — il n'y a pas de stratégie universelle.

- **Cache-first** : sert le cache, va au réseau seulement en cas de miss. Idéal pour les assets **immutables** (fingerprintés : `app.4f2a.js`). Latence minimale, jamais périmé car le nom change à chaque version.
- **Network-first** : tente le réseau, retombe sur le cache si offline. Pour le contenu **frais mais consultable offline** (un fil d'actualité, une page de doc).
- **Stale-while-revalidate** : sert immédiatement le cache (rapide) **et** déclenche en parallèle une mise à jour du cache pour la prochaine fois. Le meilleur compromis vitesse/fraîcheur pour du contenu qui tolère un léger décalage.

:::compare
::bad
```js
// Cache-first sur du HTML de navigation : piège du contenu périmé
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
```
::
::good
```js
self.addEventListener('fetch', (e) => {
  const req = e.request;
  // HTML : network-first avec fallback offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }
  // assets fingerprintés : cache-first
  e.respondWith(caches.match(req).then((r) => r || fetch(req)));
});
```
::
:::

**Pourquoi.** Le cache-first appliqué au **document HTML** est le piège classique : le HTML n'est pas fingerprinté (son URL est stable, `/produit/42`), donc une fois en cache il n'est **plus jamais remis à jour** tant que le SW ne change pas — l'utilisateur reste bloqué sur une version d'il y a des semaines, y compris si tu as corrigé un bug. En distinguant par `request.mode === 'navigate'`, tu réserves le cache-first aux ressources dont le nom change à chaque build (donc jamais périmées par construction) et tu gardes le HTML frais via network-first. La règle : **cache-first uniquement sur ce qui est immutable.**

## Le manifest et l'installabilité

Une PWA devient **installable** (ajoutée à l'écran d'accueil, lancée en standalone) quand trois conditions sont réunies : HTTPS, un service worker enregistré avec un handler `fetch`, et un **Web App Manifest** valide lié dans le `<head>`.

```html
<link rel="manifest" href="/app.webmanifest" />
```

```js
{
  "name": "Practical Docs",
  "short_name": "Docs",
  "start_url": "/?source=pwa",
  "display": "standalone",
  "theme_color": "#0b0b0f",
  "background_color": "#0b0b0f",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png",
      "purpose": "maskable" }
  ]
}
```

`display: standalone` retire la barre d'URL (sensation d'app native). Une icône `maskable` (zone de sécurité respectée) évite que l'OS la rogne mal. L'événement `beforeinstallprompt` te laisse capturer et différer le prompt d'installation pour le déclencher au bon moment.

## Offline et versioning : le vrai défi

L'offline n'est pas « tout mettre en cache » mais **décider quoi servir quand le réseau manque**. Une page de navigation doit retomber sur une `/offline.html` claire ; une API peut renvoyer la dernière réponse cachée avec un indicateur « données du <date> ».

Le piège central des SW reste le **contenu périmé**. Comme le SW persiste, un bug de cache survit aux rechargements normaux — `Cmd+R` ne le désinstalle pas. Trois disciplines :

1. **Versionne tes caches** (`shell-v7`) et purge les anciens en `activate`. Sinon les caches s'empilent sans limite.
2. **Fingerprint tes assets** (`app.4f2a.js`) pour rendre le cache-first sûr et l'invalidation automatique.
3. **Prévois une trappe de secours** : un endpoint ou un message qui force `registration.unregister()` + purge des caches, pour sortir tes utilisateurs d'un SW cassé en production.

:::callout{type="tip"}
N'écris pas ta logique de SW à la main pour un vrai projet : **Workbox** (Google) encapsule les stratégies, le precaching avec révisions, l'expiration et le nettoyage, en testé et corrigé. Tu gardes la maîtrise conceptuelle (savoir *quelle* stratégie où), mais tu n'as pas à réimplémenter les cas limites du cycle de vie.
:::

:::cheatsheet
- title: "install"
  desc: "Précache le shell ; waitUntil garde le SW vivant."
- title: "activate"
  desc: "Purge les vieux caches versionnés ; attend la fermeture des onglets."
- title: "fetch"
  desc: "respondWith pour servir du cache ou du réseau selon la stratégie."
- title: "Cache-first"
  desc: "Assets fingerprintés immutables uniquement."
- title: "Network-first"
  desc: "HTML de navigation, fallback offline.html."
- title: "Stale-while-revalidate"
  desc: "Contenu tolérant un léger décalage : rapide + frais ensuite."
- title: "skipWaiting prudent"
  desc: "Risque de casser une session ouverte ; préfère l'action utilisateur."
- title: "Manifest"
  desc: "HTTPS + SW fetch + manifest valide = installable."
:::
