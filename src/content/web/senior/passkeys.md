---
title: "Passkeys : l'authentification sans mot de passe"
slug: "passkeys"
framework: "web"
level: "senior"
order: 7
duration: 17
prerequisites: ["security"]
updated: 2026-07-09
seoTitle: "Passkeys et WebAuthn — authentification résistante au phishing côté front"
seoDescription: "Comprendre et intégrer les passkeys : le modèle WebAuthn (clé publique/privée, relying party, challenge), l'enregistrement et l'authentification via navigator.credentials, la Conditional UI en autofill, et pourquoi c'est résistant au phishing."
ogVariant: "crimson"
related:
  - { framework: "web", slug: "security" }
---

Le mot de passe est le maillon faible de toute authentification. Il est **partagé** : le même secret existe chez l'utilisateur et sur ton serveur, donc une fuite de base de données l'expose. Il est **réutilisé** d'un site à l'autre, donc une fuite ailleurs te touche. Et surtout, il est **hameçonnable** : un faux site qui ressemble au tien récupère le secret que l'utilisateur tape de bonne foi, puis le rejoue chez toi. Aucune règle de complexité, aucun rate-limiting ne corrige ce défaut de conception : le secret est transmissible, donc volable.

Les **passkeys** remplacent « un secret partagé » par « une paire de clés asymétrique liée à l'origine ». L'utilisateur ne tape plus rien de secret ; son appareil signe un défi avec une clé privée qui ne sort jamais. Un faux site ne peut pas obtenir cette signature parce que la clé est verrouillée à ton domaine. C'est ça, l'histoire : une authentification que le phishing ne peut structurellement pas casser.

## Le modèle : une paire de clés liée à l'origine

Derrière les passkeys, il y a **WebAuthn** (Web Authentication API), la brique navigateur, et **FIDO2** côté standard. Le vocabulaire est important parce qu'il structure tout le reste.

- La **relying party** (RP), c'est toi : le service qui authentifie. Elle est identifiée par un `rpId`, en pratique ton domaine (`exemple.com`).
- L'**authentificateur**, c'est ce qui détient et manipule les clés : Face ID / Touch ID sur mobile, Windows Hello, ou une clé matérielle (YubiKey). C'est lui qui génère la paire de clés et garde la privée.
- Le **challenge**, c'est un nonce aléatoire à usage unique fourni par ton serveur, que l'authentificateur signe pour prouver qu'il est présent *maintenant* (contre le rejeu).

Le principe cryptographique tient en une phrase : **à l'enregistrement, l'authentificateur crée une paire de clés ; la clé privée ne quitte jamais l'appareil, seule la clé publique part sur ton serveur.** Ton serveur ne stocke donc aucun secret réutilisable. Une fuite de ta base ne donne à l'attaquant que des clés publiques — inutiles sans la privée correspondante, qui est enfermée dans le Secure Enclave du téléphone.

Pourquoi c'est **résistant au phishing** : l'authentificateur ne signe un challenge que pour l'`rpId` auquel la clé est rattachée, et le navigateur vérifie que l'origine de la page correspond avant même de solliciter la clé. Un site `exemp1e.com` qui imite le tien ne peut ni sélectionner ni faire signer une passkey créée pour `exemple.com`. Le lien clé ↔ origine est appliqué par le navigateur, pas par la vigilance de l'utilisateur. C'est la différence de nature avec un mot de passe (ou même un code OTP), qu'un humain fatigué recopiera sur n'importe quelle page qui le lui demande.

:::callout{type="info"}
Deux notions à distinguer. Une **assertion** est ce que l'authentificateur renvoie à l'authentification (une signature). Une **attestation** est ce qu'il renvoie à l'enregistrement (la clé publique + éventuellement une preuve du modèle d'authentificateur). Pour la majorité des sites grand public, tu ne vérifies pas l'attestation en détail — elle sert surtout aux contextes réglementés (banque, entreprise) qui veulent restreindre les modèles autorisés.
:::

## Enregistrement : `navigator.credentials.create()`

L'enregistrement crée la paire de clés et remonte la clé publique à ton serveur. Le front n'invente rien : il reçoit des options *générées par le serveur* (dont le challenge), les passe à l'API, puis renvoie le résultat.

```js
// 1. Le serveur génère les options, dont un challenge aléatoire lié à la session.
const opts = await fetch('/webauthn/register/options', { method: 'POST' })
  .then((r) => r.json());

// 2. Le front décode les champs binaires (base64url) en ArrayBuffer.
opts.challenge = base64urlToBuffer(opts.challenge);
opts.user.id = base64urlToBuffer(opts.user.id);

const credential = await navigator.credentials.create({
  publicKey: {
    challenge: opts.challenge,                 // nonce à usage unique, vérifié au retour
    rp: { id: 'exemple.com', name: 'Exemple' },
    user: {
      id: opts.user.id,                        // identifiant opaque, PAS l'email
      name: 'ada@exemple.com',
      displayName: 'Ada Lovelace',
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },         // ES256 (à privilégier)
      { type: 'public-key', alg: -257 },       // RS256 (repli)
    ],
    authenticatorSelection: {
      residentKey: 'required',                 // credential découvrable (voir plus bas)
      userVerification: 'preferred',           // Face ID / Touch ID / PIN
    },
  },
});

// 3. credential.response contient l'ATTESTATION → au serveur, qui valide le
//    challenge et l'origine, puis stocke la clé publique.
await fetch('/webauthn/register/verify', {
  method: 'POST',
  body: serialize(credential),
});
```

Les paramètres qui comptent : `pubKeyCredParams` liste les algorithmes de signature acceptés par ordre de préférence (`-7` = ES256, quasi universel) ; `userVerification` demande une preuve de présence *et* d'identité (biométrie ou PIN) plutôt qu'un simple contact ; `residentKey: 'required'` force une **credential découvrable**, condition d'un login sans identifiant préalable. La promesse **rejette** si l'utilisateur annule ou si aucun authentificateur ne convient — prévois ce chemin.

## Authentification : `navigator.credentials.get()`

À la connexion, l'authentificateur signe un nouveau challenge avec la clé privée ; ton serveur vérifie la signature avec la clé publique déjà stockée.

```js
const opts = await fetch('/webauthn/login/options', { method: 'POST' })
  .then((r) => r.json());
opts.challenge = base64urlToBuffer(opts.challenge);

const assertion = await navigator.credentials.get({
  publicKey: {
    challenge: opts.challenge,
    rpId: 'exemple.com',
    allowCredentials: [], // vide → credential découvrable, l'utilisateur choisit son compte
    userVerification: 'preferred',
  },
});

// assertion.response.signature est signée par la clé privée. Le serveur revérifie
// challenge + origine, puis la signature avec la clé publique stockée.
await fetch('/webauthn/login/verify', {
  method: 'POST',
  body: serialize(assertion),
});
```

`allowCredentials` sert à restreindre les clés candidates quand tu connais déjà l'utilisateur (par exemple après un premier facteur). Laissé vide, il s'appuie sur les credentials découvrables et permet un flux « choisis ton compte ». Le champ `signature` de l'assertion est le cœur de la preuve : personne ne peut le forger sans la clé privée, et il est inutilisable ailleurs car il inclut l'origine et le challenge.

## Conditional UI : la passkey dans l'autofill

La friction tue l'adoption. La **Conditional UI** (ou *autofill UI*) propose les passkeys directement dans l'autocomplétion du champ de connexion, sans bouton dédié : si une passkey existe pour ton `rpId`, le navigateur la suggère ; sinon, l'utilisateur tape son identifiant normalement. C'est le meilleur repli progressif qui soit.

Deux ingrédients. Côté HTML, le token `webauthn` dans `autocomplete` :

```html
<input name="username" autocomplete="username webauthn" />
```

Côté JS, un `get()` avec `mediation: 'conditional'` lancé *au chargement de la page*. Contrairement à un `get()` classique, il n'ouvre aucune modale bloquante : il reste en attente et n'affiche rien tant qu'aucune passkey n'est disponible.

```js
// Ne tente la Conditional UI que si le navigateur la gère réellement.
const caps = await PublicKeyCredential.getClientCapabilities?.();
if (caps?.conditionalGet) {
  navigator.credentials
    .get({
      mediation: 'conditional',
      publicKey: { challenge, rpId: 'exemple.com', allowCredentials: [] },
    })
    .then(handleAssertion); // se résout quand l'utilisateur choisit une passkey
}
```

:::compare
::bad
```js
// Bouton « Se connecter avec une passkey » qui appelle get() sans repli.
// Sur un appareil sans passkey enregistrée : modale d'erreur, cul-de-sac.
btn.onclick = () => navigator.credentials.get({ publicKey });
```
::
::good
```js
// Autofill non bloquant au chargement + le champ mot de passe classique reste là.
// La passkey est une SUGGESTION, jamais un mur.
if ((await PublicKeyCredential.getClientCapabilities())?.conditionalGet) {
  navigator.credentials.get({ mediation: 'conditional', publicKey });
}
```
::
:::

## Rôle du front vs rôle du serveur

Il faut être limpide sur le partage des responsabilités, parce que c'est là que se logent les failles. Le **front orchestre** : il transporte les options du serveur vers l'API, encode/décode les champs binaires, gère l'UX (annulation, repli, autofill). Il ne décide de **rien** en matière de sécurité. La confiance ne repose jamais sur du code que l'utilisateur contrôle.

Toute la sécurité est **côté serveur** : générer un challenge aléatoire et imprévisible lié à la session, puis à la réception **le revérifier**, vérifier que l'origine (`clientDataJSON.origin`) et le `rpIdHash` correspondent à ton domaine, valider la signature avec la clé publique stockée, et surveiller le compteur de signatures (`signCount`) pour détecter un clonage.

:::callout{type="warn"}
La vérification serveur du **challenge** et de l'**origine** n'est pas optionnelle : c'est ce qui rend les passkeys résistantes au phishing et au rejeu. Si ton serveur accepte un challenge sans le comparer à celui qu'il a émis pour *cette* session, ou s'il ne recalcule pas que l'`origin` reçue est bien la tienne, tu réintroduis exactement les attaques que WebAuthn élimine. Le challenge doit être à usage unique et invalidé après emploi ; l'origine ne se déduit pas d'un header client (falsifiable), elle se compare à une allow-list serveur. Ne fais jamais confiance au front pour ces contrôles — le lien clé ↔ origine appliqué par le navigateur ne te protège que si le serveur le revérifie de son côté.
:::

## Détails pratiques en 2026

**`getClientCapabilities()`** remplace l'ancien empilement de détections de fonctionnalités. Cette méthode statique renvoie un objet de booléens que tu interroges pour adapter l'UI *avant* d'appeler l'API :

```js
const caps = await PublicKeyCredential.getClientCapabilities();
caps.conditionalGet;                     // proposer l'autofill de passkeys ?
caps.userVerifyingPlatformAuthenticator; // Face ID / Windows Hello dispo ?
caps.hybridTransport;                    // scan cross-appareil (QR + Bluetooth) ?
caps.relatedOrigins;                     // Related Origin Requests géré ?
caps.conditionalCreate;                  // enregistrement silencieux possible ?
```

**Credentials découvrables (resident keys).** Une passkey découvrable stocke assez d'information dans l'authentificateur pour permettre un login *sans identifiant* : l'utilisateur arrive sur ta page, clique dans le champ, choisit son compte. C'est ce que débloque `residentKey: 'required'` à l'enregistrement et `allowCredentials: []` à l'authentification.

**Synchronisation multi-appareils.** La plupart des passkeys grand public sont *synchronisées* par le trousseau de la plateforme (iCloud Keychain, Google Password Manager) : créée sur le téléphone, la passkey est disponible sur le laptop du même écosystème. Le corollaire, c'est que l'état peut diverger. Le **Signal API** sert à resynchroniser le gestionnaire de mots de passe avec ta base : `signalAllAcceptedCredentials()` après connexion pour purger côté client les clés que tu as révoquées, `signalCurrentUserDetails()` quand un utilisateur change de nom, `signalUnknownCredential()` quand le serveur ne reconnaît pas un identifiant présenté.

**Related Origin Requests.** Historiquement une passkey est verrouillée à un seul `rpId`. Les *Related Origin Requests* autorisent une passkey à servir sur plusieurs domaines liés que tu déclares (par exemple `exemple.fr` et `exemple.be`), via un fichier `/.well-known/webauthn` listant les origines associées — utile pour les marques multi-domaines, sans casser le modèle de sécurité.

**Dégradation et repli.** Une passkey ne doit jamais être le *seul* chemin. Prévois un repli (lien magique par email, second facteur classique) pour les navigateurs anciens, les appareils sans authentificateur, ou la perte d'appareil — sinon un utilisateur qui perd son téléphone perd son compte.

## À retenir

Les passkeys ne sont pas « un mot de passe plus long » : elles changent la nature du secret. Plus rien de partagé ni de transmissible ne transite ; ton serveur ne stocke que du public. Le front n'est qu'un chef d'orchestre — il ne détient aucune confiance. La sécurité vit dans la génération et la vérification serveur du challenge et de l'origine. Livre-les avec une Conditional UI pour l'adoption et un repli solide pour ne jamais enfermer personne dehors.

:::cheatsheet
- title: "Clé privée locale, publique au serveur"
  desc: "La privée ne quitte jamais l'appareil ; une fuite de ta base n'expose que du public."
- title: "create() = enregistrement"
  desc: "navigator.credentials.create → attestation ; challenge, rp, user, pubKeyCredParams."
- title: "get() = authentification"
  desc: "navigator.credentials.get → assertion signée ; le serveur vérifie avec la clé publique."
- title: "Résistant au phishing"
  desc: "Clé liée à l'rpId ; un faux domaine ne peut pas la faire signer."
- title: "Sécurité côté serveur"
  desc: "Challenge unique + vérif de l'origine et du rpId au retour, jamais côté front."
- title: "Conditional UI"
  desc: "mediation: 'conditional' + autocomplete='webauthn' pour l'autofill non bloquant."
- title: "getClientCapabilities()"
  desc: "Détecte conditionalGet, relatedOrigins, etc. avant d'adapter l'UI."
- title: "Découvrables + Signal API"
  desc: "residentKey pour le login sans identifiant ; Signal API pour resynchroniser."
- title: "Toujours un repli"
  desc: "Chemin de récupération pour appareil perdu ou navigateur non compatible."
:::
