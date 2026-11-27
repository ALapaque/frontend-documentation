---
title: "Sécurité des Server Components"
slug: "rsc-security"
framework: "react"
level: "senior"
order: 10
duration: 15
prerequisites: ["rsc", "streaming-ssr"]
updated: 2026-11-27
seoTitle: "Sécurité RSC — frontière de confiance, taint API, fuites de props, CVE 2025-2026"
seoDescription: "Les Server Components déplacent la frontière de confiance : ce qui fuit via les props sérialisées, la taint API de React, la validation des Server Actions, et les leçons des CVE, de décembre 2025 à novembre 2026. Le guide pour ne pas exposer tes secrets."
ogVariant: "crimson"
related:
  - { framework: "react", slug: "rsc" }
  - { framework: "web", slug: "security" }
---

Les Server Components mélangent serveur et client **dans un même arbre** : tu écris `await db.user.findUnique()` trois lignes au-dessus d'un bouton interactif. C'est leur force — et leur risque. La frontière de confiance ne passe plus entre deux projets ou deux APIs, mais entre deux composants qui se ressemblent. Et tout ce qui traverse cette frontière est **sérialisé et envoyé au navigateur**, secrets compris.

Ce module trace la carte : où passe exactement la ligne, quels patterns empêchent une fuite (DTO, Data Access Layer, taint API), pourquoi une Server Action est un endpoint public, et ce que les CVE de décembre 2025, puis celles de l'automne 2026, ont rappelé à tout l'écosystème.

## La frontière invisible

Un Server Component ne s'exécute jamais dans le navigateur, mais **ses props destinées à un composant `'use client'` y voyagent**. React sérialise chaque prop qui franchit la frontière dans le payload RSC (le flux « Flight »), lisible dans le HTML initial et les réponses réseau. La règle tient en une phrase : **toute prop passée à un composant client est publique**, même si le composant ne l'affiche jamais.

:::compare
::bad
```tsx
// page.tsx — Server Component
const user = await db.user.findUnique({ where: { id } });
// user contient passwordHash, sessionToken, stripeCustomerId…
return <ProfileCard user={user} />; // ProfileCard est 'use client' → TOUT part au navigateur
```
::
::good
```tsx
// page.tsx — Server Component
const profile = await getUserProfile(id); // DTO : { id, name, avatarUrl }
return <ProfileCard user={profile} />;    // seul le nécessaire traverse
```
::
:::

**Pourquoi.** Le composant client n'a pas besoin d'afficher `passwordHash` pour le fuiter : la sérialisation porte sur **l'objet entier**, au moment où la prop franchit la frontière. L'onglet Réseau des DevTools suffit à le lire. Le DTO n'est pas de la paranoïa, c'est la seule garantie structurelle : ce qui n'existe pas dans l'objet ne peut pas fuir. Et méfie-toi des refactors — un composant serveur qui devient `'use client'` transforme ses props internes en données publiques sans qu'aucun diff ne le crie.

## Data Access Layer

Le pattern recommandé (y compris par la doc Next.js) : centraliser tout l'accès aux données dans une couche dédiée qui vérifie la session et retourne des **DTO explicites**. Jamais de requête base directement dans un composant page.

```ts
// data/user.ts
import 'server-only';
import { cache } from 'react';
import { verifySession } from './session';

export const getUserProfile = cache(async (id: string) => {
  await verifySession(); // l'authz vit ICI, pas dans la page
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return null;
  return { id: user.id, name: user.name, avatarUrl: user.avatarUrl }; // DTO : liste blanche
});
```

**Pourquoi.** Trois protections en une. Le paquet `server-only` fait échouer le build si un module client importe ce fichier — la fuite devient une erreur de compilation, pas un incident. Le DTO en liste blanche garantit que l'ajout d'une colonne sensible en base ne change rien à ce qui sort. Et l'authz centralisée survit aux refactors de pages : chaque lecteur passe par le même péage, peu importe quel composant appelle.

## La taint API

React fournit un filet côté serveur : marquer un objet ou une valeur pour qu'il **refuse de le sérialiser** vers le client. Si une prop « taintée » tente de franchir la frontière, React lève une erreur avec ton message.

```ts
import { experimental_taintObjectReference, experimental_taintUniqueValue } from 'react';

export async function getUser(id: string) {
  const user = await db.user.findUnique({ where: { id } });
  experimental_taintObjectReference(
    "Ne passe pas l'objet user complet au client. Utilise getUserProfile().",
    user
  );
  experimental_taintUniqueValue('Le token de session ne doit pas quitter le serveur.', user, user.sessionToken);
  return user;
}
```

**Pourquoi.** `taintObjectReference` marque la **référence** : un spread (`{ ...user }`) crée un objet neuf, non tainté — le filet est troué par copie. `taintUniqueValue` marque la **valeur** elle-même, plus robuste pour un token ou une clé. L'API est toujours préfixée `experimental_` en novembre 2026 (Next.js l'expose derrière `experimental.taint`), mais elle est utilisée en production réelle. Prends-la pour ce qu'elle est : une ceinture de sécurité qui transforme une fuite silencieuse en crash bruyant. Ta stratégie reste le DTO ; la taint API attrape ce que la revue de code a raté.

## Server Actions = endpoints publics

Chaque fonction `'use server'` devient un endpoint HTTP. N'importe qui peut l'appeler avec des arguments arbitraires, sans passer par ton UI. Un bouton `disabled`, une condition dans le JSX, un champ caché : rien de tout ça ne protège l'action elle-même.

```ts
'use server';
import { z } from 'zod';
import { verifySession } from '@/data/session';

const Input = z.object({ postId: z.string().uuid(), title: z.string().min(1).max(200) });

export async function updatePost(raw: unknown) {
  const session = await verifySession();      // 1. authentification DANS l'action
  const { postId, title } = Input.parse(raw); // 2. zéro confiance dans les arguments
  const post = await db.post.findUnique({ where: { id: postId } });
  if (post?.authorId !== session.userId) throw new Error('Forbidden'); // 3. authz sur la ressource
  await db.post.update({ where: { id: postId }, data: { title } });
}
```

**Pourquoi.** Raisonne comme pour une route d'API REST, parce que c'en est une : l'attaquant choisit les arguments, le type TypeScript n'existe plus à l'exécution, et le fait que ton UI n'appelle l'action que pour « ses » posts n'engage que ton UI. Valide la forme (Zod), re-vérifie la session, re-vérifie le droit **sur la ressource visée** — les trois, dans l'action, à chaque appel.

## Les leçons des CVE 2025-2026

Le 3 décembre 2025, l'équipe React a divulgué **CVE-2025-55182** (surnommée « React2Shell », CVSS 10.0) : une RCE non authentifiée via la désérialisation du payload Flight reçu par les Server Functions. Un POST forgé suffisait ; l'exploitation dans la nature a commencé dès le 5 décembre. Correctifs : React 19.0.1 / 19.1.2 / 19.2.1 et des patchs Next.js sur toutes les lignes de la 14.2.35 à la 16.0.7 (l'avis Next.js, CVE-2025-66478, a ensuite été fusionné comme doublon).

Le 11 décembre, deux suites : **CVE-2025-55184** (déni de service — une boucle infinie déclenchée par un payload forgé), dont le premier correctif était incomplet et a nécessité **CVE-2025-67779**, et **CVE-2025-55183** (exposition du code source serveur compilé — donc potentiellement des secrets écrits en dur). Correctifs complets : **React 19.0.3 / 19.1.4 / 19.2.3** et les versions Next.js alignées.

:::callout{type="info"}
Sans dramatiser : le correctif est sorti le jour de la divulgation, et l'écosystème a suivi vite (outil `npx fix-react2shell-next`, patchs hébergeurs). Ce que l'épisode a montré, c'est que **la désérialisation des Server Functions est une surface d'attaque de niveau framework** — invisible dans ton code, exposée sur chaque app RSC. Abonne-toi aux advisories React et Next.js, et traite ce type de mise à jour comme un déploiement d'urgence, pas comme un ticket de fond de backlog.
:::

La série ne s'est pas arrêtée là. Le 26 janvier 2026, React 19.0.4 / 19.1.5 / 19.2.4 ont ajouté des mitigations DoS sur les Server Actions et durci les Server Components.

Le 14 octobre 2026, mise à jour hors cycle, avec trois failles. Une **RCE non authentifiée** dans les React Server Components (GHSA-xqc2-xf4c-x3h3, CVE-2026-126187, critique) : côté Next.js (GHSA-673q-mjm6-r5xr), elle se déclenche quand une fonction `'use cache'` renvoie plusieurs typed arrays, sans contournement connu. Une seconde RCE critique dans l'API Image Optimization avec SVG (CVE-2026-96889), via une bibliothèque amont — contournement : `sharp` ≥ 0.35.5. Et un DoS sur les apps App Router qui exposent au moins une Server Action. Correctifs : **React 19.0.9 / 19.1.10 / 19.2.9 / 19.3.1** et **Next.js 16.4.1 / 15.5.28**.

Le 3 novembre 2026, nouvelle release de sécurité, **Next.js 16.4.5 / 15.5.29** : sept avis, dont plusieurs **fuites de cache** avec Cache Components. Le plus sévère : une fonction `'use cache'` qui lit un root param (un identifiant de tenant, par exemple), appelée à la fois directement et depuis `unstable_cache`, peut servir le contenu d'un tenant à un autre. Les autres touchent les fonctions `'use cache'` imbriquées qui lisent un root param et les arguments binaires, dont deux valeurs distinctes pouvaient produire la même clé de cache.

Deux leçons durables de 2025. D'abord, la sécurité du framework ne remplace pas la tienne : la CVE d'exposition de code source rappelle qu'un secret écrit en dur dans un module serveur finit par sortir un jour — les patterns de ce module (DTO, `server-only`, taint) limitent le rayon d'explosion même quand la couche du dessous casse. Ensuite, une app RSC jamais mise à jour est une app exposée : fige tes versions, mais pas ta veille. 2026 en ajoute une troisième : le cache est une frontière de confiance. Une clé de cache qui oublie le tenant ou l'utilisateur, c'est une fuite de données.

## Checklist de revue

:::callout{type="tip"}
À vérifier sur chaque PR qui touche du code RSC :

- **Props traversantes** : chaque objet passé à un composant `'use client'` est un DTO construit en liste blanche, jamais un modèle base brut.
- **Server Actions** : validation Zod des arguments + session et authz re-vérifiées dans l'action, sur la ressource visée.
- **`import 'server-only'`** présent dans tout module qui touche la base, les secrets ou les tokens.
- **Taint** posée sur les modèles sensibles (`user`, `account`, clés) au point de lecture.
- **Env** : aucun secret dans une variable `NEXT_PUBLIC_*` — ce préfixe signifie « inliné dans le bundle client ».
- **Versions** : en novembre 2026, React ≥ 19.3.1 (ou 19.0.9 / 19.1.10 / 19.2.9) et Next.js ≥ 16.4.5 (ou 15.5.29 sur la ligne 15.5). Ces planchers bougent : vérifie les advisories React et Next.js, pas d'advisory ouverte sur la stack.
:::

## À retenir

:::cheatsheet
- title: "Prop client = donnée publique"
  desc: "Tout ce qui franchit la frontière 'use client' est sérialisé dans le payload Flight et lisible côté navigateur."
- title: "DTO en liste blanche"
  desc: "Ce qui n'existe pas dans l'objet ne peut pas fuir. Jamais de modèle base brut en prop."
- title: "Data Access Layer + server-only"
  desc: "Accès données centralisé, authz au même endroit, import côté client = erreur de build."
- title: "Taint API = filet, pas stratégie"
  desc: "experimental_taintObjectReference / taintUniqueValue font échouer la sérialisation. Attention : le spread détainte l'objet."
- title: "Server Action = endpoint public"
  desc: "Appelable par n'importe qui. Valider (Zod) + authn + authz dans l'action, à chaque appel."
- title: "CVE 2025-2026"
  desc: "Déc. 2025 : RCE CVE-2025-55182 (Flight), puis DoS et fuite de source. Oct.-nov. 2026 : RCE via 'use cache', fuites de cache entre tenants. Planchers en novembre 2026 : React 19.0.9 / 19.1.10 / 19.2.9 / 19.3.1, Next.js 16.4.5 / 15.5.29. Patcher vite, suivre les advisories."
:::
