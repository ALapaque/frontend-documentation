---
title: "Agents : la boucle, les outils, les garde-fous"
slug: "ai-agents"
framework: "ia"
level: "senior"
order: 4
duration: 17
prerequisites: ["ai-sdk", "mcp"]
updated: 2026-09-24
seoTitle: "Agents IA — boucle think-act-observe, outils, mémoire et garde-fous"
seoDescription: "Ce qui distingue un agent d'un simple appel LLM : la boucle think-act-observe, l'abstraction ToolLoopAgent, des outils bien conçus, la gestion du contexte, l'approbation d'outil (needsApproval) et les garde-fous sans lesquels un agent part en vrille."
ogVariant: "sage"
related:
  - { framework: "ia", slug: "ai-sdk" }
  - { framework: "ia", slug: "mcp" }
---

Un appel LLM classique est une fonction : une entrée, une sortie, terminé. Un
**agent** ajoute une seule chose — une **boucle** — et ça change tout. Le modèle
ne se contente plus de répondre : il décide d'une action, observe le résultat, et
recommence jusqu'à ce que la tâche soit finie.

Cette différence est modeste en code et énorme en conséquences. Un appel simple
est prévisible et borné ; un agent est un système **non déterministe qui agit sur
le monde**, dont tu ne connais à l'avance ni le nombre d'étapes, ni le coût, ni
les effets de bord.

## La boucle think-act-observe

```ts
import { generateText, stepCountIs } from 'ai';

const { text, steps } = await generateText({
  model: openai('gpt-5'),
  tools: { chercherCommande, rembourser },
  stopWhen: stepCountIs(8),   // borne DURE : sans elle, la boucle peut ne pas finir
  prompt: 'Le client 4021 veut un remboursement sur sa dernière commande.',
});
```

À chaque tour, le modèle reçoit l'historique complet (consigne, question, appels
d'outils déjà faits et leurs résultats), puis choisit : appeler un outil, ou
répondre. Le runtime exécute l'outil, ajoute le résultat à l'historique, et
relance. La boucle s'arrête quand le modèle répond sans appeler d'outil — ou
quand **ta** borne l'arrête.

:::callout{type="warn"}
La borne d'arrêt n'est pas une option de confort. Sans `stopWhen`, un agent qui
se trompe peut boucler indéfiniment sur le même outil, brûler ton budget en
quelques minutes et saturer ton API. Fixe **toujours** un nombre maximal d'étapes,
et de préférence aussi un plafond de tokens et un délai.
:::

## Ne réécris pas la boucle : l'abstraction `Agent`

La boucle ci-dessus est utile à comprendre, pas forcément à écrire. Depuis l'AI
SDK 6, `Agent` est une **interface**, et `ToolLoopAgent` en fournit
l'implémentation prête pour la production : elle appelle le modèle, exécute les
outils demandés, réinjecte les résultats et recommence.

```ts
import { ToolLoopAgent } from 'ai';

export const agentPanier = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-4.5',
  instructions: 'Tu assistes le service client sur les commandes.',
  tools: { chercherCommande, rembourser },
  // stopWhen: stepCountIs(20) par défaut
});

const resultat = await agentPanier.generate({
  prompt: 'Le client 4021 veut un remboursement sur sa dernière commande.',
});
```

L'agent se définit **une fois** et se réutilise partout, avec `generate()` ou
`stream()`. La borne d'arrêt existe par défaut (`stepCountIs(20)`) — mais reste à
ajuster : 20 étapes sur un modèle coûteux, c'est déjà une facture.

:::callout{type="tip"}
`Agent` étant une interface, d'autres implémentations couvrent des besoins
différents — notamment l'**exécution durable et reprenable**, où l'état de la
boucle survit à un redémarrage de processus. C'est ce qu'il faut viser dès qu'un
agent travaille plusieurs minutes : sans durabilité, un déploiement en cours de
tâche perd tout.
:::

## L'approbation d'outil, désormais native

Le garde-fou le plus important — faire valider les actions irréversibles par un
humain — ne demande plus de plomberie maison. Il se déclare **sur l'outil** :

```ts
export const rembourser = tool({
  description: 'Rembourse une commande.',
  inputSchema: z.object({ commandeId: z.string(), montant: z.number() }),
  needsApproval: true,                     // toujours demander
  execute: async ({ commandeId, montant }) => effectuerRemboursement(commandeId, montant),
});

// ou conditionnellement, selon les arguments :
needsApproval: async ({ montant }) => montant > 100,
```

**Pourquoi la forme conditionnelle change tout.** Exiger une approbation sur
*chaque* appel fatigue l'utilisateur, qui finit par tout valider sans lire — le
garde-fou devient décoratif. Conditionner l'approbation au **risque réel** (un
montant, une commande destructive, un périmètre élargi) garde l'attention humaine
là où elle compte.

## Un outil est une API pour un lecteur non fiable

C'est le point que la plupart des équipes sous-estiment. Le modèle ne voit de ton
outil que **son nom, sa description et son schéma**. Ces trois éléments sont le
prompt qui décide s'il l'appelle correctement.

:::compare
::bad
```ts
// Nom opaque, description vide, paramètres non contraints.
// Le modèle devine — et devine mal.
const t = tool({
  description: 'requête base',
  inputSchema: z.object({ q: z.string(), type: z.number() }),
  execute: ({ q, type }) => db.query(q, type),
});
```
::
::good
```ts
// Le nom dit l'intention, la description dit QUAND l'utiliser,
// le schéma rend les valeurs invalides inexprimables.
const chercherCommande = tool({
  description:
    "Retrouve les commandes d'un client. À utiliser avant tout " +
    'remboursement pour vérifier le montant et la date.',
  inputSchema: z.object({
    clientId: z.string().describe('Identifiant interne, ex. "4021"'),
    statut: z.enum(['payee', 'expediee', 'annulee']).optional(),
  }),
  execute: async ({ clientId, statut }) => rechercher(clientId, statut),
});
```
::
:::

**Pourquoi.** Un `z.enum` supprime une classe entière d'erreurs : le modèle ne
peut pas inventer un statut. Une description qui précise *quand* utiliser l'outil
évite les appels hors sujet. Et le message d'erreur renvoyé par `execute` est lu
par le modèle : rédige-le comme une instruction de correction (« client
introuvable, vérifie l'identifiant ») plutôt qu'en jetant une stack trace.

Côté surface d'exposition, **MCP** standardise cette déclaration d'outils entre
serveurs et clients (renvoi à `/ia/senior/mcp`).

## Le contexte est une ressource qui s'épuise

À chaque tour, l'historique complet repart au modèle. Une boucle de dix étapes
avec de gros résultats d'outils sature la fenêtre de contexte, et le coût croît
de façon quadratique — chaque tour paie tous les tours précédents.

Trois leviers :

- **Résumer** l'historique ancien quand il dépasse un seuil, en gardant la
  consigne et les faits établis.
- **Tronquer les résultats d'outils** : renvoyer 5 lignes utiles plutôt que
  200 lignes de JSON. Un outil bavard est un outil coûteux.
- **Externaliser la mémoire** : stocker les faits durables (préférences, décisions)
  hors du prompt, et n'en réinjecter que ce qui est pertinent — c'est du RAG
  appliqué à la mémoire de l'agent (renvoi à `/ia/medior/rag`).

:::callout{type="info"}
Distingue la **mémoire de travail** (l'historique de la tâche en cours, éphémère)
de la **mémoire à long terme** (ce que l'agent sait de l'utilisateur, persistée en
base). Les confondre donne soit un agent amnésique, soit un prompt qui gonfle
sans fin.
:::

## Un seul agent, ou plusieurs ?

La mode est aux systèmes multi-agents. La réalité est qu'ils coûtent cher en
latence, en tokens et en débogage. Deux structures suffisent presque toujours :

- **Agent unique outillé** : un seul modèle, plusieurs outils. Simple à tracer, à
  borner, à corriger. **Commence toujours par là.**
- **Superviseur et spécialistes** : un agent orchestre des sous-agents dédiés
  (recherche, rédaction, vérification), chacun avec son propre contexte réduit.
  Justifié quand les sous-tâches sont vraiment indépendantes et que le contexte
  d'un agent unique explose.

:::callout{type="tip"}
Avant d'ajouter un agent, demande-toi si un **outil** ne suffirait pas. Beaucoup
de « sous-agents » sont en réalité des fonctions déterministes déguisées : un
calcul, un appel d'API, une transformation. Le code ordinaire est plus rapide,
gratuit et testable.
:::

## Les garde-fous, avant la mise en production

Un agent qui agit vraiment (rembourser, envoyer, supprimer) demande des barrières
que le modèle **ne peut pas franchir lui-même** :

- **Approbation humaine** sur les actions irréversibles ou coûteuses : l'agent
  prépare, un humain valide. Un outil peut renvoyer « en attente d'approbation »
  et suspendre la boucle.
- **Moindre privilège** : les outils exposés portent les droits de
  l'utilisateur courant, pas ceux d'un compte de service tout-puissant.
- **Budget et délai** : plafond d'étapes, de tokens, de temps. Journalisé et
  alarmé.
- **Idempotence** : un agent peut réessayer. Un outil de paiement doit porter une
  clé d'idempotence, sinon un retry facture deux fois.

:::callout{type="warn"}
Le contrôle d'autorisation ne doit **jamais** vivre dans le prompt. « N'utilise
cet outil que pour les administrateurs » est une suggestion, pas une barrière :
une injection de prompt la contourne. La vérification des droits se fait dans le
code de l'outil, de façon déterministe et auditable (renvoi à
`/ia/senior/ai-security`).
:::

## Observer, sinon tu débogues à l'aveugle

Un agent échoue de façons qu'un test unitaire ne capture pas : il choisit le
mauvais outil, boucle, ou s'arrête trop tôt. Trace **chaque étape** — entrée,
outil choisi, arguments, résultat, tokens consommés — avec un identifiant de
trace unique par exécution.

Ces traces servent deux fois : pour comprendre un incident, et comme matière
première pour construire tes jeux d'évaluation (renvoi à `/ia/senior/ai-evals`).

## À retenir

Un agent, c'est une boucle bornée autour d'un modèle outillé. L'essentiel du
travail n'est pas dans le prompt mais dans la **conception des outils** (noms,
descriptions, schémas contraints, erreurs pédagogiques), la **maîtrise du
contexte** et les **garde-fous déterministes**. Commence par un agent unique,
n'ajoute de la structure que quand tu peux prouver qu'elle sert.

:::cheatsheet
- title: "think-act-observe"
  desc: "Le modèle choisit un outil, le runtime l'exécute, le résultat repart au modèle. Jusqu'à la borne."
- title: "stopWhen obligatoire"
  desc: "Borne d'étapes + plafond de tokens + délai. Sans ça, une boucle en erreur brûle le budget."
- title: "L'outil est un prompt"
  desc: "Nom, description et schéma sont ce que le modèle voit. Enum plutôt que string libre."
- title: "Erreurs pédagogiques"
  desc: "Le message d'erreur est relu par le modèle : écris une instruction de correction, pas une stack."
- title: "Contexte quadratique"
  desc: "Chaque tour repaie les précédents. Résume, tronque les résultats, externalise la mémoire."
- title: "Un agent d'abord"
  desc: "Multi-agents = latence et débogage. Beaucoup de sous-agents sont en fait de simples fonctions."
- title: "ToolLoopAgent"
  desc: "L'implémentation prête pour la prod de l'interface Agent. Définir une fois, generate() ou stream()."
- title: "needsApproval"
  desc: "Approbation déclarée sur l'outil, idéalement conditionnée au risque réel plutôt que systématique."
- title: "Droits dans le code"
  desc: "Jamais dans le prompt. Moindre privilège, approbation humaine sur l'irréversible, idempotence."
:::
