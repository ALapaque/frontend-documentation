---
title: "Authentification web : sessions, JWT, OAuth et OIDC côté navigateur"
slug: "auth-sessions-oauth"
framework: "web"
level: "senior"
order: 10
duration: 18
prerequisites: ["security", "storage"]
updated: 2026-11-27
seoTitle: "Authentification web — sessions, JWT, OAuth 2, OIDC, PKCE et BFF (RFC 10017)"
seoDescription: "Comment une app front maintient une session : cookie HttpOnly contre JWT, Authorization Code + PKCE, id_token contre access_token, les trois architectures de la RFC 10017 (BFF en tête), rotation des refresh tokens et déconnexion multi-onglets."
ogVariant: "crimson"
related:
  - { framework: "web", slug: "passkeys" }
  - { framework: "architecture", slug: "bff-contrats-types" }
  - { framework: "angular", slug: "interceptors-guards" }
---

Tu sais prouver une identité ([passkeys](/web/senior/passkeys)) et régler un
cookie ([stockage](/web/medior/storage)). Reste le plus long : faire durer cette
preuve, requête après requête, jusqu'à des API qui vivent sur un autre domaine.

Trois questions structurent le sujet : **où vit la preuve**, **qui peut la lire**,
**comment tu la révoques**. Le débat « cookie ou JWT dans le `localStorage` » a
duré dix ans. En août 2026, l'IETF l'a tranché : la RFC 10017 (BCP 212, « OAuth 2.0
for Browser-Based Applications ») classe les architectures par niveau de sécurité.

## Cookie de session ou JWT : où vit l'état

Ce n'est pas « cookie contre JWT » : un cookie est un **transport**, un JWT (RFC
7519) est un **format**. Les vrais axes : où vit l'état (en base, derrière un
identifiant opaque, ou dans des *claims* signés que l'API vérifie sans rien lire)
et comment la preuve voyage (envoi automatique ou en-tête explicite).

| | Session serveur (cookie) | JWT sans état |
|---|---|---|
| Révocation | immédiate : tu supprimes la session | impossible avant `exp`, sauf liste de révocation (donc de l'état) |
| Taille | un identifiant court | des centaines d'octets à chaque requête |
| Montée en charge | magasin de sessions partagé | vérification locale, aucune lecture |
| Exposition typique | CSRF : le navigateur l'envoie tout seul | XSS : le script le lit pour remplir `Authorization` |

Un cookie `HttpOnly` reste invisible au script, mais un XSS peut quand même
*envoyer* des requêtes avec lui : il empêche le vol de la session, pas son usage
depuis la page. Un JWT lisible par le JS part chez l'attaquant et sert ailleurs
jusqu'à `exp`. Donc : durée de vie courte pour tout jeton sans état, et cookie
durci pour la session, par exemple
`__Host-session=…; Secure; HttpOnly; SameSite=Strict; Path=/`.

La RFC 10017 (§6.1.3.2) rend `Secure` et `HttpOnly` obligatoires et recommande
`SameSite=Strict`, `Path=/`, pas de `Domain` et un préfixe : `__Host-` interdit le
partage entre sous-domaines. Elle cite `__Host-Http-`, qui atteste en plus que le
cookie vient d'un en-tête `Set-Cookie` : Chrome 140 et Firefox 143 l'appliquent,
pas Safari (novembre 2026). `SameSite` seul ne couvre pas tout le CSRF : voir
[Sécurité front](/web/senior/security).

## OAuth 2 et OIDC : déléguer l'accès, prouver l'identité

OAuth 2.0 (RFC 6749) répond à une question précise : comment une app obtient-elle
un accès **limité** à une API **sans connaître le mot de passe** de l'utilisateur ?
Quatre rôles : le *resource owner* (l'utilisateur), le *client* (ton app),
l'*authorization server* (AS, qui authentifie et émet les jetons) et le *resource
server* (l'API). OAuth parle d'**autorisation**. **OpenID Connect** (OIDC) y ajoute
l'identité : avec le scope `openid`, l'AS renvoie aussi un `id_token`.

- **`access_token`** : pour l'**API**. Opaque pour le client, même quand c'est un
  JWT (RFC 9068) : ne le décode pas pour piloter l'UI.
- **`id_token`** : un JWT pour le **client**, qui dit qui s'est authentifié et
  quand. Ne l'envoie jamais à une API en guise de sésame.
- **`refresh_token`** : obtient de nouveaux access tokens sans l'utilisateur. C'est
  le jeton le plus précieux des trois.

Un seul flux est admis dans un navigateur, **Authorization Code + PKCE** :

```text
1. App → AS   GET /authorize?response_type=code&client_id=…&redirect_uri=…&state=…
                  &scope=openid&code_challenge=…&code_challenge_method=S256
2. AS         authentifie l'utilisateur (mot de passe, passkey, MFA)
3. AS → App   302 redirect_uri?code=…&state=…
4. App → AS   POST /token  grant_type=authorization_code&code=…&code_verifier=…
5. AS → App   { access_token, refresh_token, id_token }
```

**PKCE** (RFC 7636) lie les étapes 1 et 4 : le client tire un `code_verifier`
aléatoire, n'envoie que son hash SHA-256 (`code_challenge`) à l'étape 1, puis
révèle le verifier à l'étape 4. Un code intercepté ne vaut rien sans lui ; `state`
protège le retour contre le CSRF. L'**implicit flow**, qui livrait l'access token
dans le fragment d'URL, est terminé : la RFC 9700 (BCP 240, janvier 2025) le
déconseille, la RFC 10017 l'interdit aux apps navigateur, et les deux interdisent
le *password grant*.

:::callout{type="warn"}
**Statut en novembre 2026.** OAuth 2.1 n'est toujours pas une RFC : c'est un
Internet-Draft (`draft-ietf-oauth-v2-1-17`, 30 octobre 2026, expiration le 4 mai
2027). Il consolide ce qui précède : PKCE par défaut, ni implicit ni password
grant, redirect URI comparées à l'identique. Cite plutôt les RFC 9700 et 10017.
:::

## Les trois architectures de la RFC 10017

Le point de départ de la RFC est brutal : un script malveillant (XSS, dépendance
compromise) a **les mêmes privilèges que ton code**. Elle classe donc trois
architectures par sécurité décroissante, selon ce qu'un tel script peut emporter.

```text
1. BFF                  navigateur ──cookie──▶ BFF ──access token──▶ API
                        aucun jeton dans le navigateur
2. Backend médiateur    navigateur ──cookie──▶ backend (garde le refresh token)
                        navigateur ──access token──▶ API, en direct
3. Client OAuth dans    navigateur ──PKCE──▶ AS, puis ──access token──▶ API
   le navigateur        tous les jetons côté JS
```

**1. BFF.** Le backend du front devient le client OAuth, et un client
*confidentiel* : il s'authentifie auprès de l'AS, ce qu'un navigateur ne peut pas
faire. Il garde les jetons derrière une session par cookie et relaie chaque appel
d'API. Un XSS peut encore envoyer des requêtes depuis la page, mais n'a rien à
voler ni à rejouer ailleurs : c'est le choix « fortement recommandé » pour les
apps métier, sensibles ou à données personnelles. Le prix : un service à opérer,
que tout le trafic d'API traverse, et une défense CSRF **obligatoire**
(`SameSite=Strict`, plus un en-tête statique exigé sur chaque requête). Ce composant
façonne aussi tes données : voir
[BFF et contrats typés](/architecture/senior/bff-contrats-types).

**2. Backend médiateur de tokens.** Le backend obtient les jetons et garde le
refresh token, mais remet l'access token au JS, qui appelle les API en direct. Pas
de proxy à opérer, mais un access token volable. La RFC ne l'admet que si un BFF
complet est impossible.

**3. Client OAuth dans le navigateur.** La SPA, client *public*, gère tout : simple,
sans serveur, exposée à tout. Le pire : l'attaquant n'a pas besoin de trouver tes
jetons. Son script lance **son propre** flux dans une iframe cachée, sur la session
ouverte chez l'AS, et repart avec des jetons neufs. La RFC le déconseille pour les
apps métier ou sensibles.

:::callout{type="tip"}
Front et API sur le même domaine ? La RFC (§7.1) le dit sans détour : OAuth est
souvent inutile entre les deux. OIDC pour déléguer le login, puis une session par
cookie. OAuth a été conçu pour l'accès à des API tierces ou fédérées.
:::

## Stockage et rotation des jetons

Si des jetons arrivent dans le navigateur (architectures 2 et 3), où les ranger ?
La section 8 de la RFC conclut sans illusion : **aucune option n'empêche
l'exfiltration** quand du code malveillant tourne dans la page. `localStorage`,
`sessionStorage` et IndexedDB sont lisibles par tout script de l'origine. La
**mémoire** (variable de module) limite l'exposition au contexte courant et se perd
au rechargement : c'est le moindre mal. Un Web Worker peut isoler le refresh token,
pas l'access token. Ranger un jeton dans un cookie posé par le JS est déconseillé.

:::compare
::bad
```ts
// Client public : tout dans localStorage, lisible par n'importe quel script.
const { access_token, refresh_token } = await exchangeCode(code, verifier);
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token); // valable des heures
```
::
::good
```ts
// BFF : aucun jeton dans la page. Le cookie HttpOnly part tout seul ;
// l'en-tête statique impose un preflight à toute origine étrangère.
const res = await fetch('/bff/api/orders', { headers: { 'X-App': '1' } });
if (res.status === 401) location.assign('/bff/login');
```
::
:::

**Pourquoi.** Un XSS lit `localStorage` en une ligne et expédie le refresh token :
l'attaquant garde l'accès bien après la fermeture de l'onglet. Avec le BFF, la même
faille ne trouve rien à emporter et n'agit que tant que la page reste ouverte.

La **rotation** borne les dégâts d'un refresh token volé : à chaque usage, l'AS en
émet un nouveau et invalide l'ancien. Si un jeton invalidé revient, deux parties le
partagent, et l'AS révoque le jeton actif (RFC 9700, §4.14.2). La RFC 10017 exige
la rotation **ou** un jeton lié à une clé du client (DPoP, RFC 9449), et une durée
de vie bornée que la rotation ne prolonge pas : dans son exemple, 10 minutes pour
l'access token, 8 heures pour le refresh token. Rien de cela n'arrête l'iframe
cachée, où l'attaquant obtient ses propres jetons.

## Intégration front : wrapper, guards, onglets

Avec un BFF, le `::good` ci-dessus est toute l'intégration : il renouvelle les
jetons côté serveur, et un `401` signifie « session terminée ». Dès que l'access
token vit dans la page, il te faut un renouvellement **à vol unique** :

```ts
let accessToken: string | null = null; // mémoire uniquement
let pending: Promise<string> | null = null; // LE renouvellement en cours, partagé

const renew = () =>
  (pending ??= fetch('/auth/token', { method: 'POST', headers: { 'X-App': '1' } })
    .then(async (res) => {
      if (!res.ok) throw new Error('session terminée');
      return (accessToken = (await res.json()).access_token as string);
    })
    .finally(() => (pending = null)));

export async function api(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const call = (token: string) => {
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  };
  let res = await call(accessToken ?? (await renew()));
  if (res.status === 401) res = await call(await renew()); // une seule relance
  return res;
}
```

Ce n'est pas qu'une optimisation. Avec la rotation, deux renouvellements parallèles
présentent le même refresh token : le second passe pour une réutilisation, l'AS
révoque le jeton actif et l'utilisateur est déconnecté sans raison. Ici le backend
détient le refresh token, à lui de sérialiser ; dans un client public, c'est ton
code, y compris entre onglets (`navigator.locks.request()`). Dans un framework, ce
wrapper devient un [interceptor](/angular/medior/interceptors-guards).

- **Rafraîchissement silencieux.** L'iframe cachée vers l'AS (`prompt=none`) dépend
  du cookie de l'AS en contexte tiers, que Safari et Firefox bloquent. La RFC en
  prend acte : ce sont les refresh tokens qui prolongent la session.
- **Guards.** Au démarrage, lis l'état de session (`GET /auth/session`), puis
  laisse les guards rediriger. Ergonomie seulement : c'est l'API qui refuse.
- **Déconnexion multi-onglets.** Le logout détruit la session côté serveur **et**
  révoque le refresh token, puis prévient les autres onglets, sinon ils affichent
  une session morte : `new BroadcastChannel('auth')`, `postMessage()` d'un côté,
  `onmessage` et redirection de l'autre.

## Passkeys, FedCM et cookies tiers

- **Passkeys.** Une [passkey](/web/senior/passkeys) remplace l'étape 2 du flux,
  l'authentification, pas la session : le challenge vérifié, le serveur pose un
  cookie ou émet des jetons, et un cookie de session volé reste exploitable.
- **Cookies tiers.** Safari et Firefox les bloquent ou les cloisonnent par défaut.
  Chrome les garde : Google a confirmé le 22 avril 2025 qu'il laissait ce choix à
  l'utilisateur. Conçois comme s'ils n'existaient pas : pas d'iframe silencieuse,
  et un BFF sur le **même site** que le front, sinon son cookie est un cookie tiers.
- **FedCM.** L'API *Federated Credential Management* confie le « Se connecter
  avec… » au navigateur : il affiche le sélecteur de compte et interroge l'IdP,
  sans redirection ni cookie tiers. Tu passes `identity.providers` (un `configURL`
  et un `clientId` par IdP) à `navigator.credentials.get()`, et tu reçois un
  `token` que ton backend valide avant d'ouvrir la session.

:::callout{type="warn"}
**Statut en novembre 2026.** FedCM n'existe que dans les navigateurs Chromium
(depuis Chrome 108) : ni Firefox ni Safari ne l'implémentent, et MDN le classe
expérimental. Garde la redirection comme chemin principal, FedCM en amélioration
progressive derrière `'IdentityCredential' in window`.
:::

## À retenir

:::cheatsheet
- title: "Format ≠ transport"
  desc: "JWT = format, cookie = transport. Session serveur : révocation immédiate. JWT sans état : valable jusqu'à exp, donc durée de vie courte."
- title: "Authorization Code + PKCE"
  desc: "Seul flux admis en navigateur. Implicit et password grant sont terminés (RFC 9700, RFC 10017). OAuth 2.1 reste un Internet-Draft."
- title: "id_token ≠ access_token"
  desc: "id_token : pour le client, dit qui est connecté. access_token : pour l'API, opaque pour le client. Jamais l'un à la place de l'autre."
- title: "BFF d'abord (RFC 10017)"
  desc: "Client confidentiel, jetons côté serveur, cookie __Host- Secure HttpOnly SameSite=Strict, défense CSRF obligatoire. Aucun stockage navigateur ne résiste à un XSS."
- title: "Rotation, vol unique, logout diffusé"
  desc: "Refresh tokens en rotation et bornés dans le temps. Un seul renouvellement partagé sur 401, une seule relance. BroadcastChannel pour prévenir les autres onglets."
:::
