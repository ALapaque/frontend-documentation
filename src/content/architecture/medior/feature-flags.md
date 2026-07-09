---
title: "Feature flags : découpler déploiement et release"
slug: "feature-flags"
framework: "architecture"
level: "medior"
order: 3
duration: 15
prerequisites: ["foundations"]
updated: 2026-07-09
seoTitle: "Feature flags — séparer le déploiement de la mise en production, sans dette"
seoDescription: "Les feature flags séparent « déployer du code » de « activer une fonctionnalité » : release progressive, kill switch, tests A/B, accès par rôle. Les types de flags, le lien avec le trunk-based development, et la discipline de nettoyage pour éviter la dette."
ogVariant: "crimson"
related:
  - { framework: "architecture", slug: "foundations" }
  - { framework: "architecture", slug: "monorepo" }
---

Sans feature flags, **déployer, c'est mettre en production**. Le code qui part sur `main` devient visible à la seconde où le build atterrit. Conséquence directe : tu n'oses pas fusionner une fonctionnalité incomplète, donc tu l'empiles sur une branche qui vit trois semaines, qui diverge, et que tu fusionnes dans la douleur. Les feature flags cassent ce couplage : le code part en prod **désactivé**, et tu l'actives quand tu veux, pour qui tu veux.

## Déploiement n'est pas release

Ce sont deux événements distincts, et les confondre est la source du problème.

- **Déploiement** : le code est présent sur le serveur / dans le bundle. C'est un fait technique.
- **Release** : la fonctionnalité est visible pour un utilisateur. C'est une décision produit.

```ts
// Le code est déployé (présent), mais pas encore "released"
if (flags.nouveauPanier) {
  return <NouveauPanier />;
}
return <PanierLegacy />; // ce que voit tout le monde tant que le flag est off
```

Le flag est l'interrupteur qui sépare les deux. Déployer devient un non-événement — banal, plusieurs fois par jour. Décider qu'une fonctionnalité est visible devient un acte séparé, réversible, sans redéploiement.

## Ce que ça débloque

Le bénéfice n'est pas « pouvoir cacher un bouton ». C'est un changement de rythme d'équipe.

- **Merges petits et fréquents.** Une fonctionnalité à moitié faite peut vivre sur `main` derrière un flag off. Tu fusionnes tous les jours, pas au bout de trois semaines.
- **Rollback instantané.** Un bug en prod ? Tu passes le flag à off. Pas de revert, pas de rebuild, pas de fenêtre de redéploiement — l'effet est immédiat.
- **Release progressive.** Tu actives pour 1 %, puis 10 %, puis 100 %. Tu observes les métriques entre chaque palier.
- **Découplage produit / tech.** L'équipe produit choisit *quand* activer, sans dépendre d'un créneau de déploiement.

## Les types de flags

Tout le monde appelle ça « un feature flag », mais Pete Hodgson distingue quatre familles. Elles n'ont **ni la même durée de vie ni le même propriétaire**, et les mélanger dans un seul mécanisme est une erreur.

:::cheatsheet
- title: "Release"
  desc: "Cache un travail en cours. Temporaire (jours/semaines). Propriétaire : l'équipe dev. À supprimer une fois la feature à 100 %."
- title: "Ops / kill switch"
  desc: "Coupe une feature coûteuse ou instable pendant un incident. Longue durée. Propriétaire : ops / SRE. Reste en place tant que la feature vit."
- title: "Experiment (A/B)"
  desc: "Sert deux variantes pour mesurer. Durée de l'expérience. Propriétaire : produit / data. Retiré quand le résultat est tranché."
- title: "Permission"
  desc: "Ouvre un accès selon le plan ou le rôle (premium, beta, admin). Permanent. Propriétaire : produit. Ce n'est pas de la dette : c'est de la logique métier."
:::

:::callout{type="tip"}
Le piège classique est de traiter un flag de **permission** (permanent, métier) comme un flag de **release** (jetable) — ou l'inverse. Nomme-les et range-les par famille dès le départ : un `release_*` a vocation à disparaître, un `plan_*` a vocation à rester.
:::

## Le lien avec le trunk-based development

Les flags ne sont pas un gadget isolé : ils sont la condition qui rend le **trunk-based development** praticable. Intégrer en continu sur `main` suppose de pouvoir y fusionner du code pas encore prêt à être vu. Sans flag, c'est impossible, donc on part sur des branches longues.

:::compare
::bad
```text
Branche de feature longue (3 semaines)
  main   ●───────────────────────────●  ← merge géant, douloureux
              ╲                     ╱
   feature     ●──●──●──●──●──●──●─●
   - diverge de main chaque jour
   - conflits accumulés au merge
   - la CI ne voit le code intégré qu'à la toute fin
   - "big bang" : tout casse ou rien
```
::
::good
```text
Trunk-based + flags (merges quotidiens)
  main ●──●──●──●──●──●──●──●──●──●──●
       │  │  │        code derrière flags.nouveauPanier (off)
       └──┴──┴─ chaque commit est intégré, testé, déployable
   - jamais de divergence longue
   - conflits minuscules (résolus chaque jour)
   - la feature s'active via le flag, quand elle est prête
```
::
:::

Le flag remplace la branche comme mécanisme d'isolation. La différence : le code isolé par un flag est **quand même intégré et testé en continu**, alors que le code isolé sur une branche ne l'est pas.

## Implémenter un flag

Le point d'évaluation est trivial — `if (flags.x)`. Ce qui demande de la réflexion, c'est le **contexte d'évaluation** et l'endroit où le flag est résolu.

```ts
// Le contexte décide de la valeur : pas juste on/off global
type Contexte = { userId: string; role: 'admin' | 'user'; plan: 'free' | 'pro' };

function evalue(flag: string, ctx: Contexte): boolean {
  const regle = regles[flag];
  if (regle.role && regle.role !== ctx.role) return false;   // ciblage par rôle
  if (regle.plan && regle.plan !== ctx.plan) return false;   // ciblage par plan
  if (regle.pourcentage) {
    return hash(ctx.userId + flag) % 100 < regle.pourcentage; // rollout progressif, stable par user
  }
  return regle.actif;
}
```

Le hash sur `userId` garantit qu'un même utilisateur voit **toujours** la même variante — sinon l'interface clignote entre deux rendus.

**Côté client vs côté serveur.** C'est une décision de sécurité, pas de confort.

:::callout{type="warn"}
Un flag évalué **côté client** est **visible et falsifiable**. Le bundle JS contient le nom du flag, et souvent la condition. N'utilise jamais un flag client pour cacher une fonctionnalité payante ou un accès sensible : un utilisateur peut forcer la valeur dans la console. Les flags de **permission** doivent être évalués et **appliqués côté serveur** (l'API refuse la donnée), le client ne fait qu'ajuster l'affichage.
:::

Règle simple : le client peut *masquer* pour le confort visuel ; seul le serveur peut *interdire*.

## La dette des flags

Un flag de release non retiré est le pire des deux mondes : un **chemin mort** (la branche `else` n'est jamais exécutée) et un **risque** (quelqu'un peut le rallumer par erreur, ou le code legacy dérive). Chaque flag ajoute une dimension au produit cartésien des états à tester : dix flags booléens, c'est 1024 combinaisons théoriques.

:::callout{type="warn"}
- **Date d'expiration.** Chaque flag de release naît avec une date de mort. Passé cette date, la CI peut échouer (un test qui vérifie qu'aucun flag n'a expiré).
- **Ticket de nettoyage.** Créer le flag et créer le ticket « supprimer le flag + la branche legacy » vont ensemble. Le second est fait quand la feature atteint 100 %.
- **Inventaire.** Une liste vivante : nom, type, propriétaire, date de création, statut. Un flag sans propriétaire est un flag qu'on n'ose plus toucher.
- **Retirer, c'est retirer les deux branches.** Supprimer un flag de release signifie garder le nouveau code **et effacer l'ancien**. Un flag laissé « à on pour toujours » n'est pas nettoyé.
:::

La discipline de suppression n'est pas optionnelle : c'est ce qui distingue les flags comme outil des flags comme cauchemar de maintenance.

## Build vs buy

Deux approches, selon l'échelle.

- **Maison (build).** Un objet de config, quelques règles, un endpoint qui renvoie les valeurs. Suffisant pour des flags simples on/off et un peu de ciblage par rôle. Zéro dépendance, mais tu réimplémentes le rollout progressif, l'audit, l'interface de gestion.
- **Plateforme (buy).** Une bibliothèque + un service dédié gère le ciblage fin, les pourcentages, l'historique de changements, les tests A/B avec métriques, et une UI pour que le produit active sans toucher au code.

La bascule se fait quand les **non-développeurs** ont besoin d'activer des flags, ou quand tu veux du vrai A/B mesuré. Tant que ce sont des flags de release techniques, du fait-maison est souvent le bon choix — n'ajoute pas la complexité avant le besoin.

## Tester avec des flags

Un flag crée deux chemins. Un test qui ne couvre qu'un seul des deux te ment sur ton niveau de couverture.

```ts
describe('panier', () => {
  it('flag off → panier legacy', () => {
    expect(render({ flags: { nouveauPanier: false } })).toContain('legacy');
  });
  it('flag on → nouveau panier', () => {
    expect(render({ flags: { nouveauPanier: true } })).toContain('nouveau');
  });
});
```

Tu passes le contexte de flags **en entrée** de ce que tu testes, comme une dépendance injectée — jamais lu depuis un état global caché. Une fois le flag retiré, tu supprimes le test de la branche morte en même temps que le code. Réexécuter la suite après le nettoyage confirme que rien ne dépendait encore du chemin supprimé.

## À retenir

:::cheatsheet
- title: "Déploiement ≠ release"
  desc: "Le code part en prod désactivé. L'activation est une décision séparée, réversible, sans redéploiement."
- title: "Merges petits, rollback instantané"
  desc: "Fusionner du code incomplet derrière un flag off. Couper une feature = passer le flag à off."
- title: "Quatre types de flags"
  desc: "Release (jetable), ops/kill switch (long, ops), experiment (A/B), permission (permanent, métier). Ne pas les mélanger."
- title: "Flags = trunk-based possible"
  desc: "Ils remplacent les branches longues comme mécanisme d'isolation, mais le code reste intégré et testé en continu."
- title: "Client masque, serveur interdit"
  desc: "Un flag client est visible et falsifiable. Les permissions s'appliquent côté serveur."
- title: "Discipline de nettoyage"
  desc: "Date d'expiration, ticket de suppression, inventaire. Un flag de release non retiré est un chemin mort et un risque."
:::
