---
title: "AI SDK 7 : des agents de production"
slug: "ai-sdk-7"
framework: "ia"
level: "next"
order: 1
duration: 15
prerequisites: ["ai-sdk", "ai-agents"]
updated: 2026-11-27
seoTitle: "AI SDK 7 — migration, Output, toolApproval, WorkflowAgent, timeouts, télémétrie"
seoDescription: "AI SDK 7 (25 juin 2026) passe en ESM seul et Node.js 22, renomme system, stepCountIs et onFinish, déplace l'approbation d'outil vers toolApproval et ajoute agents durables, timeouts fins et télémétrie refondue. Ce qui casse, ce qui est seulement déprécié, et quoi préparer."
ogVariant: "iris"
related:
  - { framework: "ia", slug: "ai-sdk" }
  - { framework: "ia", slug: "ai-agents" }
  - { framework: "ia", slug: "mcp-2026" }
---

Les articles de fond de cette section — `/ia/medior/ai-sdk` pour le socle,
`/ia/senior/ai-agents` pour la boucle — enseignent les concepts. Celui-ci traite
le delta de version : depuis le **25 juin 2026**, la majeure courante du paquet
`ai` est la **7**. Elle déplace le centre de gravité : moins « appeler un modèle »,
plus « faire tourner un agent en production ». Approbations, durabilité, timeouts,
observabilité : ce que tu bricolais autour de la boucle entre dans le SDK.

La plupart des formes v6 sont **dépréciées, pas supprimées**. Mais quelques ruptures
sont franches et deux changements sont silencieux : cet article fait le tri. Dans
les exemples, `model` désigne ton modèle, déclaré comme dans `/ia/medior/ai-sdk`.

## Ce qui casse, ce qui est seulement déprécié

Trois ruptures n'ont aucun alias de secours :

- **Node.js 22 minimum.** Les versions 18 et 20 ne sont plus prises en charge.
- **ESM uniquement.** `require("ai")` ne fonctionne plus : il te faut
  `"type": "module"` ou des fichiers `.mjs`.
- **Les messages `system` sont refusés dans `messages`.** Un historique persisté
  qui en contient casse. `allowSystemInMessages: true` les tolère : à réserver à
  des messages de confiance, sinon un client injecte son propre prompt système.

Le reste est une vague de renommages, tous doublés d'un alias déprécié : `system`
devient `instructions`, `stepCountIs` devient `isStepCount`, `onFinish` et
`onStepFinish` deviennent `onEnd` et `onStepEnd`, `result.fullStream` devient
`result.stream`. Le codemod officiel, `npx @ai-sdk/codemod v7`, les applique pour
toi. Il ne couvre pas tout : dans un route handler, les helpers de réponse quittent
l'objet résultat.

:::compare
::bad
```ts
const result = streamText({ model, system: CONSIGNES, messages, stopWhen: stepCountIs(5) });
return result.toUIMessageStreamResponse(); // forme v6 : dépréciée, fonctionne encore
```
::
::good
```ts
const result = streamText({ model, instructions: CONSIGNES, messages, stopWhen: isStepCount(5) });
return createUIMessageStreamResponse({
  stream: toUIMessageStream({ stream: result.stream }),
});
```
::
:::

**Pourquoi.** `toUIMessageStreamResponse()` était une méthode du résultat de
`streamText` : elle ne transformait que ce flux-là. `toUIMessageStream` est une
fonction qui accepte **n'importe quel** `stream`, celui d'un agent ou d'un harness
compris. Les anciennes méthodes seront retirées à la prochaine majeure.

Deux changements ne lèvent **aucune erreur**, et c'est le piège. `result.usage`
additionne désormais toutes les étapes (l'ancien `totalUsage`) ; la dernière étape
seule se lit dans `result.finalStep.usage`. Un tableau de bord de coûts change de
sens sans prévenir. Et les traces OpenTelemetry ne sortent plus du paquet `ai` :
sans `@ai-sdk/otel` (voir plus bas), elles disparaissent en silence.

## Sorties structurées : `generateText` + `Output`

`generateObject` et `streamObject`, dépréciés depuis la v6, restent exportés. Mais
la documentation n'enseigne plus qu'une voie : l'option `output` de `generateText`
et `streamText`.

```ts
import { generateText, Output } from "ai";

const { output } = await generateText({
  model,
  output: Output.object({
    schema: z.object({ tags: z.array(z.string()).max(5), priorite: z.enum(["basse", "haute"]) }),
  }),
  prompt: `Classe ce ticket de support : ${ticket}`,
});
```

Ce n'est pas cosmétique : la sortie structurée rejoint le flux des outils. Un seul
appel peut **appeler des outils, puis rendre un objet validé** ; produire cet objet
compte pour une étape, à prévoir dans `stopWhen`. Variantes : `Output.array()` pour
un tableau typé (`elementStream` émet en streaming chaque élément complet),
`Output.choice()` pour une classification, `Output.json()` pour du JSON sans schéma.

## Approbation d'outil : la règle quitte l'outil

En v6, l'approbation se déclarait sur l'outil, avec `needsApproval`. Or un même
outil n'a pas le même risque partout : rembourser une commande est banal dans un
back-office, sensible dans un chat public. La v7 déprécie `needsApproval` et place
la règle là où se décide l'usage : l'option `toolApproval` de `generateText`,
`streamText` ou `ToolLoopAgent`. Le pourquoi d'une validation humaine est traité
dans `/ia/senior/ai-agents`.

```ts
const agentSupport = new ToolLoopAgent({
  model,
  tools: { lireCommande, rembourser },
  toolApproval: {
    rembourser: async ({ montant }, { runtimeContext }) => {
      if (runtimeContext.role !== "support") {
        return { type: "denied", reason: "Réservé à l'équipe support" };
      }
      return montant > 100 ? "user-approval" : undefined; // undefined : exécution normale
    },
  },
});
```

Une règle rend `"approved"` ou `"denied"` (décision automatique, tracée),
`"user-approval"` (l'agent s'arrête et attend un humain) ou rien du tout. La forme
courte suffit souvent : `toolApproval: { rembourser: "user-approval" }`.

Reste une faille que la v7 nomme enfin. Avec `useChat`, le serveur reconstruit la
conversation à partir des messages **envoyés par le client**, qui peut y glisser une
approbation que personne n'a donnée. Le SDK revalide l'entrée et réévalue la règle
à chaque reprise, mais seule une signature ferme la porte : le serveur signe chaque
demande en HMAC et rejette toute approbation non signée.

:::callout{type="warn"}
**Novembre 2026.** La signature passe par `experimental_toolApprovalSecret` : le
préfixe signale une API qui peut encore bouger. Le même secret doit être partagé
par toutes les instances du serveur.
:::

## Des agents bornés, puis durables

Un agent peut se figer de plus de façons qu'une requête : un flux ouvert qui n'émet
plus rien, un outil muet, une boucle hors budget. Un `AbortSignal.timeout()` global
ne distingue rien de tout ça. L'option `timeout` accepte maintenant un objet :

```ts
const result = streamText({
  model,
  tools: { recherche, meteo },
  messages: await convertToModelMessages(messages),
  timeout: {
    totalMs: 60_000, // tout l'appel, étapes comprises
    stepMs: 20_000,  // une étape : génération, retries, outils locaux
    chunkMs: 5_000,  // streaming : silence maximal entre deux chunks
    toolMs: 5_000,   // par outil ; dépassé : erreur d'outil, la boucle continue
    tools: { rechercheMs: 15_000 }, // exception : nom de l'outil + « Ms »
  },
});
```

Borner ne suffit pas quand l'exécution dure. Un `ToolLoopAgent` vit en mémoire : un
redéploiement en cours de route, une approbation qui arrive deux heures plus tard,
et tout est perdu. Le paquet `@ai-sdk/workflow` fournit `WorkflowAgent`, la même
boucle dans un workflow persistant. La fonction qui porte l'agent est marquée
`"use workflow"` ; chaque `execute` marqué `"use step"` devient une étape durable :
résultat persisté, nouvelle tentative automatique, reprise après une approbation.
Piège de portage : `ToolLoopAgent` s'arrête par défaut à 20 étapes, alors que
`WorkflowAgent.stream()` n'a **aucune limite par défaut**. Écris ton `stopWhen`.

:::callout{type="warn"}
**Novembre 2026.** Deux briques restent expérimentales. `experimental_sandbox`
transmet aux outils un environnement d'exécution portable, sans isoler l'outil
lui-même, et peut changer dans un simple patch. `HarnessAgent` (`@ai-sdk/harness`)
pilote un runtime complet — Claude Code, Codex, Pi — derrière l'interface `Agent` :
la documentation annonce des ruptures entre deux releases.
:::

## Contexte, raisonnement, fichiers

En v6, les outils lisaient un `experimental_context` unique et non typé. La v7 le
scinde. Chaque outil déclare ses besoins avec `contextSchema` et les reçoit via
`toolsContext`, indexé par nom d'outil. L'état partagé de l'appel vit dans
`runtimeContext`, visible de `prepareStep`, des callbacks et des règles
d'approbation, sans être ajouté de lui-même au prompt.

```ts
const meteo = tool({
  inputSchema: z.object({ ville: z.string() }),
  contextSchema: z.object({ apiKey: z.string() }),
  execute: async ({ ville }, { context: { apiKey } }) => fetchMeteo(ville, apiKey),
});
const result = await generateText({
  model,
  reasoning: "low",
  tools: { meteo },
  toolsContext: { meteo: { apiKey: process.env.METEO_API_KEY! } },
  runtimeContext: { requestId, tenantId },
  prompt: "Quel temps fait-il à Lyon ?",
});
```

**Pourquoi.** C'est du moindre privilège : la clé météo n'est visible que de
l'outil météo, et TypeScript refuse un champ non déclaré. L'exemple montre aussi
`reasoning`, le réglage portable de l'effort de raisonnement (de `"none"` à
`"max"`) : un réglage équivalent resté dans `providerOptions` garde la priorité.

Enfin, `uploadFile` et `uploadSkill` envoient un fichier ou un skill **une seule
fois** chez le provider et rendent une `providerReference`, à passer dans les
appels suivants au lieu de renvoyer les mêmes octets à chaque étape.

## Observer, et au-delà du texte

La télémétrie s'activait appel par appel. Elle s'enregistre maintenant **une fois**,
au démarrage : `registerTelemetry(new OpenTelemetry())`, la classe venant du paquet
`@ai-sdk/otel`. Dès lors, chaque appel émet ses événements — c'est devenu de
l'*opt-out* (`telemetry: { isEnabled: false }` pour en exclure un). Chaque étape
expose aussi un objet `performance` (`timeToFirstOutputMs`,
`outputTokensPerSecond`) : de quoi savoir si c'est le modèle ou l'outil qui traîne.

Côté interface, `<MCPAppRenderer>` (`@ai-sdk/react`) affiche dans une iframe isolée
l'interface qu'un outil MCP expose en ressource `ui://` (le protocole est traité
dans `/ia/senior/mcp` et `/ia/next/mcp-2026`), et `runAgentTUI({ agent })`
(`@ai-sdk/tui`) lance un agent dans le terminal, sans écrire d'application.

:::callout{type="warn"}
**Novembre 2026.** La voix temps réel (`experimental_useRealtime`) et la
génération vidéo (`experimental_generateVideo`) restent expérimentales : leurs API
peuvent changer.
:::

## Quoi préparer

1. Passe à Node.js 22 ou plus et à l'ESM : c'est le prérequis de tout le reste.
2. Monte `ai` et les paquets `@ai-sdk/*` ensemble, puis lance le codemod.
3. Cherche les `{ role: "system" }` dans tes historiques persistés.
4. Installe `@ai-sdk/otel`, enregistre la télémétrie, relis ce qui lit `usage`.
5. Traite les avertissements de dépréciation comme une liste de tâches, sans
   urgence : aucune préversion 8 n'est publiée sur npm en novembre 2026.

## À retenir

La v7 ne change pas ta façon d'appeler un modèle : elle range dans le SDK ce qui
sépare une démo d'un agent exploitable. Distingue ce qui casse, ce qui change en
silence et ce qui est seulement renommé, et la migration reste peu risquée.

:::cheatsheet
- title: "Ruptures franches"
  desc: "Node.js 22 minimum, ESM uniquement, messages system refusés dans messages (allowSystemInMessages pour l'ancien comportement)."
- title: "Renommages"
  desc: "system -> instructions, stepCountIs -> isStepCount, onFinish -> onEnd, fullStream -> stream, helpers de réponse sans état. Alias dépréciés ; npx @ai-sdk/codemod v7."
- title: "Sorties structurées"
  desc: "generateText + Output.object / array / choice / json. generateObject est déprécié. L'objet compte pour une étape."
- title: "toolApproval"
  desc: "Règle par appel ou par agent : 'user-approval', 'approved', 'denied' ou une fonction. Signature HMAC encore expérimentale."
- title: "Borner et observer"
  desc: "timeout { totalMs, stepMs, chunkMs, toolMs }, WorkflowAgent pour la durabilité, registerTelemetry + @ai-sdk/otel, usage sur toutes les étapes."
:::
