---
title: "Temps réel : SSE, WebSocket, WebTransport"
slug: "temps-reel"
framework: "web"
level: "senior"
order: 9
duration: 17
prerequisites: ["fetch"]
updated: 2026-07-25
seoTitle: "Temps réel sur le web — SSE, WebSocket et WebTransport (Baseline 2026)"
seoDescription: "Choisir le bon transport temps réel : Server-Sent Events pour le flux serveur vers client, WebSocket pour le bidirectionnel, WebTransport sur HTTP/3 et QUIC pour le multiplexage et les datagrammes. Head-of-line blocking, reconnexion et arbitrage."
ogVariant: "crimson"
related:
  - { framework: "web", slug: "fetch" }
  - { framework: "ia", slug: "chat-streaming-ui" }
---

Le web est bâti sur un modèle où le client demande et le serveur répond. Dès
qu'on veut l'inverse — une notification, un cours de bourse, la position d'un
curseur partagé — il faut un canal que la requête/réponse ne fournit pas.

Trois technologies répondent à ce besoin, et le réflexe « je prends WebSocket »
est souvent le mauvais. Depuis mars 2026, **WebTransport est Baseline** : le
choix compte davantage qu'avant.

## Le point de départ : le polling, et pourquoi il coûte cher

Interroger le serveur toutes les *n* secondes fonctionne, et reste défendable
pour une donnée qui change lentement. Mais chaque tour paie un aller-retour
complet — connexion, en-têtes, cookies — pour apprendre le plus souvent que rien
n'a changé. La latence moyenne vaut la moitié de l'intervalle, et la charge croît
linéairement avec le nombre de clients, indépendamment de l'activité réelle.

Le *long polling* (garder la requête ouverte jusqu'à ce qu'il y ait du nouveau)
corrige la latence mais mobilise une connexion par client, avec une reconnexion
à chaque message.

## Server-Sent Events : le flux descendant, sans effort

Si les données ne circulent que du **serveur vers le client**, `EventSource` est
la réponse la plus simple — et la plus sous-estimée.

```js
const flux = new EventSource('/api/notifications');

flux.addEventListener('message', (e) => {
  afficher(JSON.parse(e.data));
});

// Reconnexion automatique, avec reprise là où on s'était arrêté
flux.addEventListener('error', () => {
  // le navigateur retente tout seul ; rien à écrire
});
```

Côté serveur, c'est du HTTP ordinaire en `text/event-stream` :

```
retry: 3000
id: 42
data: {"type":"commande","statut":"expediee"}

```

**Pourquoi c'est souvent le bon choix.** SSE passe sur HTTP standard : proxies,
CDN, authentification par cookie, compression, HTTP/2 — tout fonctionne sans
configuration particulière. Surtout, la **reconnexion automatique avec reprise**
est intégrée : le navigateur renvoie le dernier `id` reçu via l'en-tête
`Last-Event-ID`, et le serveur reprend le flux au bon endroit. Avec WebSocket,
cette logique est à écrire à la main, et elle est rarement écrite correctement.

:::callout{type="tip"}
C'est exactement le transport utilisé par les réponses de LLM en streaming
(renvoi à `/ia/medior/chat-streaming-ui`) : un flux de jetons descendant, sans
besoin de canal remontant. Le réflexe WebSocket y serait une complication pure.
:::

Ses limites : unidirectionnel, texte uniquement (le binaire demande un encodage),
et sur HTTP/1.1 il consomme une des six connexions par domaine — un problème qui
disparaît en HTTP/2.

## WebSocket : le bidirectionnel établi

Quand le client doit **aussi** émettre fréquemment — chat, édition collaborative,
jeu — WebSocket ouvre un canal permanent full-duplex après une poignée de main
HTTP.

```js
const ws = new WebSocket('wss://exemple.test/salon/42');

ws.addEventListener('message', (e) => traiter(JSON.parse(e.data)));
ws.addEventListener('open', () => ws.send(JSON.stringify({ type: 'rejoindre' })));
```

Le protocole est mûr, universellement pris en charge et bien outillé. Trois
points sont à ta charge, et ils constituent l'essentiel du travail réel :

- **La reconnexion** : rien n'est automatique. Il faut un *backoff* exponentiel
  avec gigue, et une stratégie de reprise de l'état après coupure.
- **Le maintien de connexion** : les proxies coupent les connexions inactives.
  Prévois un ping/pong applicatif.
- **La détection de coupure** : un `readyState` à `OPEN` ne garantit pas que le
  chemin réseau fonctionne encore. Seul un aller-retour applicatif le prouve.

:::callout{type="warn"}
WebSocket s'appuie sur **TCP**, d'où le *head-of-line blocking* : un seul paquet
perdu bloque **tous** les messages suivants, même ceux qui n'ont rien à voir, le
temps de la retransmission. Sur un réseau mobile instable, une perte isolée fige
brièvement l'ensemble du flux. C'est la limite que WebTransport lève.
:::

## WebTransport : QUIC dans le navigateur

WebTransport est bâti sur **HTTP/3 et QUIC** (donc UDP). Il apporte deux capacités
que WebSocket ne peut pas offrir.

```js
const transport = new WebTransport('https://exemple.test/rt');
await transport.ready;

// 1) Des flux INDÉPENDANTS : une perte sur l'un ne bloque pas les autres
const flux = await transport.createBidirectionalStream();
const writer = flux.writable.getWriter();
await writer.write(new TextEncoder().encode('bonjour'));

// 2) Des DATAGRAMMES : non fiables, non ordonnés, latence minimale
const dw = transport.datagrams.writable.getWriter();
await dw.write(new Uint8Array([0x01, 0x2a]));   // position, état du curseur…
```

- **Multiplexage réel** : plusieurs flux sur une même connexion, chacun avec son
  propre ordre de livraison. Le *head-of-line blocking* disparaît entre flux.
- **Datagrammes non fiables** : pour les données dont **la fraîcheur prime sur la
  complétude** — position d'un joueur, curseur collaboratif, audio. Retransmettre
  une position vieille de 200 ms n'a aucun intérêt ; mieux vaut la suivante.

S'ajoute la **migration de connexion** de QUIC : passer du Wi-Fi à la 5G ne coupe
pas la session, là où TCP la perd avec l'adresse IP.

:::callout{type="info"}
**Statut 2026.** WebTransport est Baseline depuis mars 2026, quand Safari 26.4 l'a
livré sans drapeau. Chrome le gère depuis la 97 (2022), Firefox depuis la 114
(2023). En revanche, il exige un serveur **HTTP/3** avec des certificats valides —
la contrainte d'exploitation est réelle, et souvent le vrai facteur de décision.
:::

## Choisir, concrètement

| Besoin | Transport |
| --- | --- |
| Notifications, flux de statut, jetons LLM | **SSE** |
| Chat, collaboration texte, bidirectionnel classique | **WebSocket** |
| Multiplexage, données à perte tolérée, jeu, média | **WebTransport** |
| Donnée changeant toutes les minutes | **Polling** — ne complique pas |

L'ordre de décision qui évite les erreurs : commence par le **polling** si la
fréquence le permet, passe à **SSE** dès qu'il faut du descendant temps réel,
n'ajoute **WebSocket** que si le client émet vraiment souvent, et ne va vers
**WebTransport** que si le multiplexage ou les datagrammes répondent à un
problème mesuré.

:::compare
::bad
```js
// WebSocket pour un flux purement descendant :
// on hérite de la reconnexion manuelle, du ping/pong et de
// la reprise d'état, pour zéro bénéfice.
const ws = new WebSocket('wss://exemple.test/notifications');
```
::
::good
```js
// SSE : reconnexion et reprise par Last-Event-ID intégrées,
// compatible proxies et CDN sans configuration.
const flux = new EventSource('/api/notifications');
```
::
:::

## Ce qui casse en production

Quel que soit le transport, les mêmes sujets reviennent :

- **La reprise après coupure.** Le réseau tombera. Numérote les messages et
  prévois un mécanisme de rattrapage, sinon l'interface diverge silencieusement
  de l'état serveur.
- **La contre-pression.** Un serveur qui émet plus vite que le client ne traite
  finit par saturer la mémoire de l'onglet. Surveille `bufferedAmount` sur
  WebSocket, et regroupe les mises à jour plutôt que d'en émettre une par
  changement.
- **L'onglet en arrière-plan.** Les navigateurs ralentissent les temporisateurs.
  Ferme le canal sur `visibilitychange` quand c'est acceptable, et resynchronise
  au retour.
- **La montée en charge.** Une connexion permanente par utilisateur, c'est de la
  mémoire par utilisateur côté serveur — et un routage collant si tu as plusieurs
  instances.

## À retenir

Le choix par défaut n'est pas WebSocket, c'est **SSE** : plus simple, reconnexion
et reprise intégrées, compatible avec toute l'infrastructure HTTP existante.
WebSocket se justifie par un besoin **bidirectionnel fréquent**. WebTransport,
désormais Baseline, apporte le multiplexage sans blocage et les datagrammes — au
prix d'une infrastructure HTTP/3. Dans tous les cas, la partie difficile n'est pas
d'ouvrir le canal, c'est de **survivre à sa coupure**.

:::cheatsheet
- title: "SSE (EventSource)"
  desc: "Descendant seul. Reconnexion et reprise via Last-Event-ID intégrées. HTTP standard : proxies et CDN OK."
- title: "WebSocket"
  desc: "Full-duplex sur TCP. Reconnexion, ping/pong et reprise d'état entièrement à ta charge."
- title: "Head-of-line blocking"
  desc: "Sur TCP, un paquet perdu bloque tous les messages suivants. La limite structurelle de WebSocket."
- title: "WebTransport"
  desc: "HTTP/3 + QUIC. Flux multiplexés indépendants et datagrammes non fiables. Baseline depuis mars 2026."
- title: "Datagrammes"
  desc: "Pour ce dont la fraîcheur prime sur la complétude : position, curseur, audio. Pas pour un message de chat."
- title: "L'ordre de décision"
  desc: "Polling, puis SSE, puis WebSocket si le client émet, puis WebTransport si un besoin mesuré l'exige."
- title: "Survivre à la coupure"
  desc: "Numéroter les messages, prévoir le rattrapage, surveiller la contre-pression, gérer l'onglet caché."
:::
