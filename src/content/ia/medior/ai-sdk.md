---
title: "L'AI SDK : useChat, streaming et tool calling"
slug: "ai-sdk"
framework: "ia"
level: "medior"
order: 2
duration: 15
prerequisites: ["chat-streaming-ui"]
updated: 2026-07-08
seoTitle: "AI SDK (Vercel) — streamText, useChat, tool calling, structured output"
seoDescription: "Le standard de facto pour brancher un LLM dans une app front : streamText côté serveur, useChat côté client, tool calling typé, structured output avec Zod, multi-provider (Anthropic, OpenAI, Google) sans réécriture."
ogVariant: "gold"
related:
  - { framework: "ia", slug: "chat-streaming-ui" }
  - { framework: "ia", slug: "mcp" }
---

Tu sais coder le streaming d'un chat à la main — SSE, `ReadableStream`, parsing des chunks (article *chat-streaming-ui*). C'est le bon réflexe pour comprendre ce qui circule. Mais en production, tu réécrirais à chaque projet la même plomberie : format de stream, état des messages, boucle d'appels d'outils. En 2026, l'**AI SDK** (le paquet `ai`, créé par Vercel, open source) est devenu le standard de facto pour ça : une API unique au-dessus des providers, le streaming câblé de bout en bout, des outils typés avec Zod. Le SDK en est à sa version majeure 7 (sortie début juillet 2026), mais la forme d'API décrite ici — `streamText`, `useChat`, `tool`, `generateObject` — est stable depuis la v5. Deux couches : **AI SDK Core** (côté serveur, agnostique du framework) et **AI SDK UI** (les hooks côté client).

## Pourquoi une abstraction provider

Chaque fournisseur de modèles a son API propriétaire : formats de messages, paramètres, protocoles de streaming différents. Coder contre l'API brute d'un seul fournisseur, c'est du lock-in : le jour où tu veux comparer un modèle Anthropic à un modèle Google, tu réécris ta couche réseau. L'AI SDK normalise tout : le provider est un simple argument.

```ts
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic"; // ou @ai-sdk/openai, @ai-sdk/google...
const result = streamText({
  model: anthropic("claude-sonnet-4-5"),
  // model: openai("gpt-5"), model: google("gemini-2.5-pro") — rien d'autre ne change
  prompt: "Résume ce ticket en une phrase.",
});
```

**Pourquoi.** Le reste du code — messages, outils, schémas, streaming — ne dépend pas du fournisseur. Tu peux A/B tester deux modèles, basculer sur un fallback quand un provider tombe, ou renégocier tes coûts sans réécriture. Même logique qu'un ORM : l'abstraction a un coût (les options très spécifiques passent par `providerOptions`), mais il est faible devant ce qu'elle t'évite.

## streamText côté serveur

Côté serveur, `streamText` lance la génération et rend un résultat streamable. Dans un route handler (Next.js ici, mais n'importe quel serveur JS fait l'affaire), tu convertis les messages UI reçus du client, puis tu renvoies la réponse au format de stream du SDK.

```ts app/api/chat/route.ts
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const result = streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: "Tu es un assistant concis. Réponds en français.",
    messages: convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
}
```

**Pourquoi.** Le SDK distingue deux représentations : `UIMessage` (l'état complet côté client — texte, appels d'outils, métadonnées) et `ModelMessage` (la version épurée envoyée au modèle). `convertToModelMessages` fait le pont, et `toUIMessageStreamResponse()` renvoie une réponse HTTP en SSE que le client du SDK sait consommer — exactement la plomberie que tu codais à la main, en une ligne. Note : la v7 renomme certaines options (`system` devient `instructions`) et fait évoluer les helpers de réponse ; la forme montrée ici est celle documentée en v5/v6, encore présente en v7, et un codemod officiel (`npx @ai-sdk/codemod`) automatise la migration — vérifie la doc de **ta** version installée.

## useChat côté client

Côté client, `useChat` gère l'état du chat : liste des messages, statut (`ready`, `submitted`, `streaming`, `error`), arrêt (`stop`) et relance (`regenerate`). Le même hook existe pour Vue, Svelte et Angular (`@ai-sdk/vue`, `@ai-sdk/svelte`, `@ai-sdk/angular`), avec la même API depuis la v5. Attention : depuis la v5, le hook ne gère plus le champ de saisie — c'est ton state à toi.

```tsx
import { useChat } from "@ai-sdk/react";
import { useState } from "react";
export function Chat() {
  const [input, setInput] = useState(""); // le champ de saisie : ton state
  const { messages, sendMessage, status, stop } = useChat();
  return (
    <>
      {messages.map((m) => (
        <div key={m.id}>{m.parts.map((p, i) => (p.type === "text" ? <p key={i}>{p.text}</p> : null))}</div>
      ))}
      {status === "streaming" && <button onClick={stop}>Stop</button>}
      <form onSubmit={(e) => { e.preventDefault(); sendMessage({ text: input }); setInput(""); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} />
      </form>
    </>
  );
}
```

**Pourquoi.** Un message n'est pas une simple string : c'est une liste de `parts` (texte, appel d'outil, raisonnement, fichier). Ton rendu itère sur les parts et affiche ce qu'il sait afficher — c'est ce qui permet au même composant de montrer du texte streamé *et* l'exécution d'un outil. Et comme le Core est agnostique du framework, tu peux aussi te passer du hook : un service Angular qui fait un `fetch` sur ta route et lit le `ReadableStream` (comme dans *chat-streaming-ui*) consomme exactement le même endpoint.

## Tool calling

Un outil, c'est une fonction que tu déclares et que **le modèle décide** d'appeler. Le SDK boucle pour toi : le modèle demande l'outil, le SDK exécute ton `execute`, renvoie le résultat au modèle, qui formule sa réponse finale.

```ts
import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { z } from "zod";
const result = streamText({
  model: anthropic("claude-sonnet-4-5"),
  messages: convertToModelMessages(messages),
  stopWhen: stepCountIs(5), // autorise la boucle outil -> résultat -> réponse (5 étapes max)
  tools: {
    meteo: tool({
      description: "Donne la météo actuelle pour une ville.",
      inputSchema: z.object({ ville: z.string().describe("Nom de la ville") }),
      execute: async ({ ville }) => fetchMeteo(ville), // ton code : API, base de données...
    }),
  },
});
```

**Pourquoi.** `inputSchema` (un schéma Zod) sert trois fois : il documente l'outil pour le modèle, il **valide** les arguments générés avant d'exécuter ton code, et il type `execute` — `ville` est un `string`, garanti. Sans `stopWhen`, la génération s'arrête après le premier appel d'outil ; avec, le SDK renvoie le résultat au modèle jusqu'à obtenir une vraie réponse.

:::callout{type="warn"}
Les arguments d'un outil sont **générés par un modèle**, donc non fiables par nature : valide-les comme une entrée utilisateur (le schéma Zod aide, mais vérifie aussi les droits et les bornes métier). Et ne branche jamais un outil destructif — suppression, paiement, envoi d'e-mail — sans confirmation humaine explicite avant `execute`.
:::

## Structured output

Quand tu veux des **données** et pas de la prose — remplir un formulaire, extraire des tags, trier des tickets — n'espère pas un JSON propre en le demandant dans le prompt. `generateObject` contraint la sortie avec un schéma Zod.

:::compare
::bad
```ts
const { text } = await generateText({ model, prompt }); // « Réponds UNIQUEMENT en JSON... »
const data = JSON.parse(text); // casse : bloc markdown, virgule en trop, phrase d'intro...
```
::
::good
```ts
const { object } = await generateObject({
  model: anthropic("claude-sonnet-4-5"),
  schema: z.object({ tags: z.array(z.string()).max(5), priorite: z.enum(["basse", "haute"]) }),
  prompt: `Classe ce ticket de support : ${ticket}`,
});
```
::
:::

**Pourquoi.** À gauche, tu pries : le modèle peut entourer le JSON de markdown, inventer un champ, oublier une virgule — et `JSON.parse` explose en production. À droite, le SDK passe le schéma au mode de sortie structurée du provider, valide le résultat contre Zod, et rend un `object` **typé** (`priorite: "basse" | "haute"`) ou une erreur nette. Pour streamer un objet en cours de construction (un formulaire qui se remplit en direct), `streamObject` expose un `partialObjectStream`.

## Production

```ts
const result = streamText({
  model: anthropic("claude-sonnet-4-5"),
  messages: convertToModelMessages(messages.slice(-20)), // tronque l'historique
  maxOutputTokens: 1024, maxRetries: 2,     // borne la sortie ; retente sur 429 / 5xx
  abortSignal: AbortSignal.timeout(30_000), // un provider qui rame ne bloque pas ton UI
  onError: ({ error }) => report(error),    // sinon l'erreur meurt en silence dans le stream
});
```

**Pourquoi.** Ce qui distingue une démo d'un produit, c'est ce que tu fais quand ça rate et ce que ça coûte quand ça marche. Chaque requête renvoie **tout** l'historique au modèle : sans troncature (ou résumé des vieux messages), le coût croît avec la conversation et tu finis par déborder la fenêtre de contexte. `maxOutputTokens` borne la sortie ; les retries intégrés absorbent les erreurs transitoires, mais garde un timeout global. Enfin, active le **prompt caching** quand ton provider le prend en charge (Anthropic le propose via `providerOptions`) : le system prompt et les définitions d'outils, identiques à chaque appel, coûtent alors une fraction du prix après le premier passage.

## À retenir

:::cheatsheet
- title: "Une API, N providers"
  desc: "Changer Anthropic / OpenAI / Google = changer la ligne model. Zéro lock-in d'API propriétaire."
- title: "streamText + useChat"
  desc: "Serveur : convertToModelMessages puis toUIMessageStreamResponse(). Client : messages, sendMessage, status, stop — React, Vue, Svelte, Angular. L'input reste ton state."
- title: "Tool calling"
  desc: "tool({ inputSchema: zod, execute }) + stopWhen: stepCountIs(n). Valide tout, confirme le destructif."
- title: "Structured output"
  desc: "generateObject / streamObject + schéma Zod : du JSON typé et validé, pas un « réponds en JSON » dans le prompt."
- title: "Production"
  desc: "maxOutputTokens, maxRetries, timeout, historique tronqué, prompt caching : borne les coûts et les pannes."
:::
