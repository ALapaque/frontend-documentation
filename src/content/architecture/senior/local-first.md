---
title: "Local-first : l'app qui vit côté client"
slug: "local-first"
framework: "architecture"
level: "senior"
order: 4
duration: 17
prerequisites: ["ddd"]
updated: 2026-07-09
seoTitle: "Architecture local-first — sync engines, CRDTs et UI instantanée hors ligne"
seoDescription: "Le local-first inverse le modèle : l'app lit et écrit dans une base locale, un sync engine réconcilie avec le serveur en arrière-plan. UI instantanée, offline natif, collaboration temps réel. Les sync engines de 2026, les CRDTs et leurs compromis."
ogVariant: "crimson"
related:
  - { framework: "architecture", slug: "ddd" }
  - { framework: "web", slug: "service-workers-pwa" }
---

Dans le modèle classique, chaque interaction est une **requête réseau** : tu cliques, un spinner tourne, tu attends la réponse, tu gères l'erreur, tu invalides un cache. L'UI est **captive de la latence** : le temps de réponse de ton app, c'est le ping vers ton serveur plus la charge du back. Le **local-first** renverse ça. L'app lit et écrit dans une **base locale** (instantané, y compris hors ligne), et un **moteur de synchronisation** réconcilie avec le serveur **en arrière-plan**. Le réseau devient un détail d'implémentation, pas le chemin critique de chaque clic.

Ce n'est pas une astuce de perf. C'est un **déplacement du modèle de données** : la source de vérité de l'UI passe du serveur au client. Tout le reste — offline, collaboration, optimistic UI — découle de ce choix.

## Le renversement : de « fetch » à « lire local »

:::compare
::bad
```ts
// server-state : le serveur est la source de vérité, tu la mets en cache
async function addTodo(text: string) {
  setLoading(true);
  try {
    const todo = await api.post('/todos', { text }); // aller-retour réseau
    queryClient.invalidateQueries(['todos']);         // re-fetch pour resync
  } catch (e) {
    toast.error('Échec, réessaie');                   // et si le réseau tombe ?
  } finally {
    setLoading(false);                                // spinner obligatoire
  }
}
```
::
::good
```ts
// local-first : tu écris dans la base locale, le sync engine s'occupe du reste
function addTodo(text: string) {
  db.todos.insert({ id: crypto.randomUUID(), text, done: false });
  // Retour immédiat. Pas de spinner, pas de try/catch réseau.
  // Le moteur pousse la mutation au serveur quand il peut, et la rejoue si offline.
}
```
:::

Dans le premier cas, l'UI **attend le serveur** et rejoue manuellement le cache. Dans le second, l'écriture est **locale et synchrone** ; la synchro est un processus **asynchrone et invisible** géré par le moteur.

Le mouvement local-first, formalisé par l'essai d'Ink & Switch (Kleppmann et al., 2019), pose **sept idéaux** : rapide (pas d'attente réseau), multi-appareil (tes données te suivent), offline (fonctionne sans connexion), collaboration (édition concurrente), longévité (les données survivent au service), privacy (chiffrement de bout en bout possible) et contrôle utilisateur (tu possèdes tes données). Peu d'apps atteignent les sept ; le local-first, c'est **choisir lesquels** te concernent.

## Les sync engines : répliquer un sous-ensemble côté client

Un **sync engine** maintient une **copie partielle** de la base serveur dans le client et garde les deux en cohérence. Tu écris localement, il propage ; le serveur change, il rapatrie. Le paysage 2026 se sépare en deux familles.

**Sync de base SQL** — tu gardes ton backend, le moteur synchronise des lignes :
- **ElectricSQL** — couche de sync durable au-dessus de **Postgres**. Tu définis des *shapes* (sous-ensembles de tables filtrés) et Electric les stream vers un SQLite/PGlite client. Idéal si tu as déjà un Postgres.
- **PowerSync** — **SQLite complet** côté client, sync bidirectionnelle avec Postgres, MongoDB ou MySQL. Très robuste sur l'offline long ; orienté migration d'apps existantes.
- **Zero** (Rocicorp) — arrivé en **1.0 en 2026**. Son propre langage de requête (**ZQL**), son serveur `zero-cache`, un modèle de permissions et une gestion des conflits par **rebase**. Marche avec n'importe quel backend.

**État réactif / event-sourcing** — le moteur possède le modèle :
- **LiveStore** — chaque mutation est un **événement** ajouté à un log ; le client matérialise ses vues en rejouant le log. Undo, time-travel et merge offline deviennent naturels.
- **Jazz** — « batteries incluses » : des *CoValues* (valeurs collaboratives) avec auth, permissions et sync intégrés. Tu manipules des objets, pas des requêtes.
- **Convex** — backend réactif **hébergé** : fonctions serveur, requêtes temps réel, sync gérée pour toi. Le choix « sûr » pour une équipe qui ne veut pas opérer l'infra de sync elle-même.

À côté, **TinyBase** est un data store réactif local qui se branche sur des couches de persistance/sync (SQLite, Yjs). La ligne de fracture : **synchroniser des lignes SQL** (tu gardes ta base) ou **synchroniser un état applicatif** (le moteur devient ta base).

## Les CRDTs : fusionner des modifications concurrentes

Quand deux appareils modifient la **même donnée hors ligne**, qui gagne au retour ? Un **CRDT** (Conflict-free Replicated Data Type) est une structure de données conçue pour que des éditions **concurrentes fusionnent automatiquement**, sans conflit et sans coordination — même dans un ordre différent, tous les répliquas convergent vers le même état.

C'est la brique de la **collaboration temps réel** : curseurs multiples, document partagé façon Notion/Figma, où deux personnes tapent dans le même paragraphe. Les trois bibliothèques de 2026 :

- **Yjs** — l'incumbent, dominant pour l'édition de texte riche (Tiptap, BlockNote). Écosystème mûr, providers réseau prêts à l'emploi.
- **Automerge** — l'alternative issue de la recherche ; la 3.0 (cœur Rust) a divisé la mémoire par ~10, rendant les gros documents viables dans le navigateur.
- **Loro** — le nouveau venu en Rust : CRDTs texte riche et **arbre déplaçable** (*movable tree*), pour les cas que Yjs et Automerge couvrent mal.

:::callout{type="tip"}
Un CRDT n'est **pas toujours nécessaire**. Pour un champ « statut de tâche » ou « titre », un simple **last-write-wins** (le dernier timestamp gagne) suffit et coûte mille fois moins cher. Réserve les CRDTs à ce qui **fusionne vraiment** : texte collaboratif, listes réordonnées, dessin partagé. Sur des champs scalaires indépendants, LWW par champ est le bon défaut — c'est d'ailleurs ce que font la plupart des sync engines en interne.
:::

## Les compromis durs

Le local-first déplace de la complexité, il ne la supprime pas. Les points qui font mal en production :

:::callout{type="warn"}
- **Autorisation** — le client **ne peut pas tout répliquer**. Un moteur naïf qui sync « toute la table » fuite les données des autres utilisateurs. Il faut un modèle de permissions **côté serveur** qui filtre ce que chaque client a le droit de voir (les *shapes* d'Electric, les permissions ZQL de Zero). La sécurité n'est jamais dans le client.
- **Résolution de conflits** — « fusion automatique » ne veut pas dire « fusion correcte » sur le plan métier. Deux personnes réservent le dernier siège hors ligne : le CRDT converge, mais ta règle métier, elle, doit dire non. Les invariants critiques restent **validés serveur**.
- **Réplication partielle** — tu ne charges qu'un sous-ensemble. Définir *quel* sous-ensemble (par utilisateur, par projet, par date) et le faire évoluer sans casser les clients existants est un vrai travail de design.
- **Migrations de schéma** — des clients hors ligne depuis des semaines reviennent avec un **ancien schéma**. Il faut versionner et migrer les données locales, comme une base embarquée. Le event-sourcing (LiveStore) aide, mais ne l'efface pas.
- **Taille des données locales** — le stockage navigateur (IndexedDB, OPFS) a des limites, et l'éviction existe. Répliquer 500 Mo dans un onglet n'est pas gratuit ; il faut borner ce qui vit côté client.
:::

Aucun de ces points n'est rédhibitoire, mais chacun demande une **décision explicite**. Le local-first n'est pas « gratuit », il est « payé ailleurs ».

## Optimistic UI : le pont depuis le server-state

Tu n'as pas besoin d'un sync engine complet pour goûter au renversement. L'**optimistic UI** en est la version light : tu appliques le changement **localement d'abord**, tu envoies la mutation, et tu **confirmes ou rollback** selon la réponse.

```ts
// TanStack Query : optimistic update, l'étape avant un vrai local-first
useMutation({
  mutationFn: toggleTodo,
  onMutate: async (id) => {
    await qc.cancelQueries({ queryKey: ['todos'] });
    const prev = qc.getQueryData(['todos']);
    // Écriture optimiste : l'UI bouge tout de suite
    qc.setQueryData(['todos'], (t) => toggle(t, id));
    return { prev };
  },
  onError: (_e, _id, ctx) => qc.setQueryData(['todos'], ctx.prev), // rollback
  onSettled: () => qc.invalidateQueries({ queryKey: ['todos'] }),  // resync
});
```

C'est le **même geste** — écrire local, réconcilier après — mais orchestré à la main, mutation par mutation. Le **server-state** (TanStack Query, voir le module dédié) reste ta source de vérité ; l'optimisme n'est qu'un cache avancé. Un sync engine, c'est l'**étape d'après** : il généralise ce pattern à **toute la base**, gère l'offline, la reprise et les conflits pour toi, et fait de la copie locale la vraie source de vérité. Comprendre l'optimistic UI, c'est comprendre en petit ce qu'un moteur fait en grand.

## Quand adopter, quand c'est surdimensionné

:::callout{type="info"}
**Adopte le local-first quand** au moins un de ces besoins est central : **collaboration** temps réel (plusieurs curseurs sur une donnée), **offline** réel (terrain, mobile, réseau instable), **latence critique** (outil interne où chaque milliseconde d'attente use l'utilisateur), ou **multi-appareil** avec continuité. Linear, Figma, Obsidian vivent de ce modèle.
:::

À l'inverse, c'est **surdimensionné** pour une app majoritairement **lecture**, un back-office peu concurrent, ou un CRUD où le server-state (fetch + cache + optimistic) suffit déjà. Introduire un sync engine, c'est un **nouveau modèle mental** pour toute l'équipe, une nouvelle infra à opérer, et les compromis durs ci-dessus. Si la latence ne fait pas mal et que personne n'édite hors ligne, tu paierais une complexité pour un idéal dont tu n'as pas besoin.

Le bon réflexe senior : ne pas demander « est-ce que le local-first est cool ? » (il l'est) mais « **lequel des sept idéaux** est un besoin produit chez moi ? ». Si la réponse est « aucun de vraiment critique », reste sur le server-state — c'est déjà 90 % du bénéfice perçu pour 10 % du coût.

## À retenir

:::cheatsheet
- title: "Lire/écrire local, sync en fond"
  desc: "La source de vérité de l'UI passe au client. Le réseau n'est plus le chemin critique de chaque interaction."
- title: "Sync engine = réplique partielle"
  desc: "Electric/PowerSync/Zero (sync SQL) vs LiveStore/Jazz/Convex (état réactif). Choisis selon : garder ta base ou déléguer le modèle."
- title: "CRDT seulement si ça fusionne"
  desc: "Yjs, Automerge, Loro pour texte/listes collaboratifs. Ailleurs, last-write-wins par champ suffit."
- title: "L'autorisation reste serveur"
  desc: "Le client ne réplique qu'un sous-ensemble autorisé. La sécurité et les invariants métier ne sont jamais dans le client."
- title: "Optimistic UI = l'étape d'avant"
  desc: "Écrire local puis confirmer/rollback (TanStack Query). Un sync engine généralise ce geste à toute la base."
- title: "Choisis par idéal, pas par hype"
  desc: "Collaboration, offline ou latence critique → oui. CRUD lecture peu concurrent → le server-state suffit."
:::
