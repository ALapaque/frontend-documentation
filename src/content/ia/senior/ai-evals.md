---
title: "Évaluer une feature IA : les evals"
slug: "ai-evals"
framework: "ia"
level: "senior"
order: 5
duration: 16
prerequisites: ["ai-sdk"]
updated: 2026-07-25
seoTitle: "Evals LLM — tester une feature IA sans assertion exacte"
seoDescription: "Pourquoi les tests classiques ne marchent pas sur un LLM, et quoi mettre à la place : jeu de référence, assertions déterministes quand c'est possible, LLM-as-judge quand ça ne l'est pas, mesure au niveau trace, tâche et système, et intégration en CI."
ogVariant: "sage"
related:
  - { framework: "ia", slug: "ai-agents" }
  - { framework: "tooling", slug: "vitest" }
---

Tu changes une phrase du prompt système. Est-ce que c'est mieux ? Personne ne
sait. Trois testeurs cliquent, trouvent ça « plutôt bien », et la modification
part en production — où elle casse un cas que personne n'avait essayé.

C'est le mode de fonctionnement par défaut des équipes qui livrent de l'IA, et
c'est la première cause de régressions en production. Le remède porte un nom :
les **evals**, un harnais de test adapté à un système non déterministe.

## Pourquoi `toBe()` ne marche pas

Un test classique compare une sortie à une valeur attendue. Un LLM produit une
sortie **différente à chaque appel**, toutes potentiellement correctes.

:::compare
::bad
```ts
// Faux dès le deuxième run : la formulation change,
// alors que la réponse reste juste.
expect(await repondre('Quel est le délai de retour ?'))
  .toBe('Le délai de retour est de 30 jours.');
```
::
::good
```ts
// On teste des PROPRIÉTÉS de la réponse, pas sa forme exacte.
const r = await repondre('Quel est le délai de retour ?');
expect(r).toContain('30');                 // le fait clé est présent
expect(r.length).toBeLessThan(400);        // la contrainte de concision tient
expect(citations(r)).not.toHaveLength(0);  // la source est citée
```
::
:::

Le principe général : **descends au niveau de propriété vérifiable**. Beaucoup de
choses qu'on croit « floues » sont en réalité déterministes — la présence d'un
chiffre, la validité d'un JSON, le respect d'un schéma, l'appel du bon outil.

## Le jeu de référence, socle de tout

Une eval commence par un jeu de cas : entrée, et ce qui doit être vrai de la
sortie. Vingt cas bien choisis valent mieux que mille générés au hasard.

```ts
export const casDeTest = [
  {
    nom: 'délai de retour — fait simple',
    entree: 'Quel est le délai de retour ?',
    attendu: { contient: ['30'], citeSource: true },
  },
  {
    nom: 'hors périmètre — doit refuser',
    entree: 'Donne-moi le salaire du dirigeant.',
    attendu: { refuse: true },
  },
  {
    nom: 'ambigu — doit demander une précision',
    entree: 'Ça coûte combien ?',
    attendu: { demandePrecision: true },
  },
];
```

:::callout{type="tip"}
Alimente ce jeu avec la **production**. Chaque incident, chaque retour négatif,
chaque réponse gênante devient un cas de test. Un jeu de référence qui ne grossit
pas après un incident ne sert à rien : c'est exactement le mécanisme du test de
non-régression, appliqué à l'IA.
:::

Pense à couvrir trois familles trop souvent oubliées : les questions **hors
périmètre** (le système doit refuser), les questions **ambiguës** (il doit
demander une précision) et les questions **piège** dont la réponse n'est pas dans
le corpus (il doit dire qu'il ne sait pas).

## LLM-as-judge : quand aucune assertion ne suffit

Pour « la réponse est-elle polie, complète et fidèle aux sources ? », aucune
assertion mécanique ne convient. On demande alors à un modèle de **noter** la
sortie d'un autre modèle.

```ts
const { object: verdict } = await generateObject({
  model: openai('gpt-5'),
  schema: z.object({
    fidele: z.boolean(),
    justification: z.string(),
    note: z.number().min(1).max(5),
  }),
  prompt:
    `Passages sources :\n${sources}\n\n` +
    `Réponse à évaluer :\n${reponse}\n\n` +
    'La réponse est-elle entièrement justifiée par les passages ? ' +
    "Signale toute affirmation absente des sources.",
});
```

Trois règles rendent un juge utilisable :

- **Un critère à la fois.** Un juge qui note « la qualité » globale donne du
  bruit. Un juge qui vérifie « chaque affirmation est-elle dans les sources ? »
  donne un signal exploitable.
- **Une sortie structurée**, avec justification : elle rend le verdict auditable
  et te permet de repérer un juge qui déraille.
- **Un juge calibré.** Fais-le tourner sur des cas dont **tu** connais la réponse.
  Si son verdict ne correspond pas au tien, c'est le juge qu'il faut corriger
  avant de lui faire confiance.

:::callout{type="warn"}
Un juge LLM hérite des biais de son modèle : il préfère les réponses longues, se
laisse influencer par un ton assuré, et note plus généreusement sa propre
production. Réserve-le à ce que l'assertion déterministe ne sait pas faire, et
garde-le hors du chemin critique de production — c'est un outil de mesure, pas un
filtre de sécurité.
:::

## Trois niveaux de mesure

Un système agentique se mesure à trois échelles, et confondre les trois empêche
de localiser une régression :

- **Trace** : l'agent a-t-il appelé le bon outil, avec les bons arguments, dans
  le bon ordre ? Vérifiable de façon déterministe — c'est le niveau le plus
  rentable, et le plus négligé.
- **Tâche** : le résultat final est-il correct, sur un jeu de référence annoté ?
  C'est là qu'interviennent assertions et juge.
- **Système** : sur la durée, quel est le taux de succès, le coût moyen par
  requête, la latence p95, le taux d'escalade vers un humain ?

:::callout{type="info"}
Une régression au niveau trace se corrige facilement (une description d'outil à
réécrire) alors qu'elle se manifeste au niveau tâche par « les réponses sont
moins bonnes ». Mesurer les traces, c'est transformer un symptôme diffus en cause
identifiable.
:::

## Faire tourner ça en CI, sans se ruiner

Les evals coûtent des appels payants et prennent du temps. Un découpage à deux
vitesses fonctionne bien :

```ts
// vitest.config.ts — les evals ne bloquent pas la boucle de dev
export default defineConfig({
  test: {
    exclude: ['**/*.eval.ts'],
    // npm run eval -> vitest --config vitest.eval.config.ts
  },
});
```

- **À chaque commit** : les assertions déterministes (schéma respecté, outil
  appelé, format valide) sur un petit sous-ensemble. Rapide, quasi gratuit.
- **À chaque changement de prompt, de modèle ou d'outil** : la suite complète,
  juge compris, avec comparaison au **score de référence** de la version
  précédente.

Le critère de blocage n'est pas « 100 % de réussite » — un système
probabiliste n'y arrive pas — mais **l'absence de régression** : le score ne doit
pas baisser par rapport à la version en production. Fixe un seuil (par exemple
« pas plus de 2 points de moins ») et rends-le bloquant.

:::callout{type="tip"}
Fixe la **température à 0** pendant les evals et épingle la version exacte du
modèle. Tu ne supprimeras pas tout l'aléa, mais tu élimines la variance que tu
peux contrôler — sinon tu ne sauras jamais si l'écart vient de ta modification ou
du hasard.
:::

## À retenir

Une feature IA sans evals n'est pas testée, elle est espérée. Construis un jeu de
référence nourri par les incidents, préfère l'assertion déterministe partout où
elle est possible, réserve le juge LLM au qualitatif, et mesure les traces autant
que les réponses. Le critère qui compte en CI, c'est la non-régression, pas la
perfection.

:::cheatsheet
- title: "Pas d'égalité exacte"
  desc: "Tester des propriétés vérifiables : fait présent, schéma valide, longueur, citation, outil appelé."
- title: "Jeu de référence"
  desc: "20 cas bien choisis. Chaque incident de prod devient un nouveau cas. Inclure hors-périmètre et ambigu."
- title: "LLM-as-judge"
  desc: "Un critère à la fois, sortie structurée avec justification, juge calibré sur des cas connus."
- title: "Trace / tâche / système"
  desc: "Bon outil et bons arguments ; résultat correct ; taux de succès, coût, latence p95 dans la durée."
- title: "Deux vitesses en CI"
  desc: "Déterministe à chaque commit ; suite complète à chaque changement de prompt, modèle ou outil."
- title: "Non-régression"
  desc: "Le seuil bloquant est « le score ne baisse pas », pas « tout passe ». Température 0, version épinglée."
:::
