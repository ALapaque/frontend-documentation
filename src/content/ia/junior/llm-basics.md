---
title: "Comprendre les LLM, côté produit"
slug: "llm-basics"
framework: "ia"
level: "junior"
order: 1
duration: 13
prerequisites: []
updated: 2026-07-08
seoTitle: "Les LLM expliqués aux devs frontend — tokens, contexte, latence, limites"
seoDescription: "Ce qu'un dev frontend doit comprendre des LLM pour intégrer une feature IA : tokens et fenêtre de contexte, température, latence et streaming, hallucinations, et quand (ne pas) mettre un LLM dans une feature."
ogVariant: "sage"
related:
  - { framework: "ia", slug: "ai-assisted-coding" }
  - { framework: "ia", slug: "chat-streaming-ui" }
---

L'IA générative est passée en trois ans du stade de démo impressionnante à celui de brique produit
standard, au même titre qu'une base de données. Résumé automatique, assistant intégré, extraction de données : la feature « IA » est devenue un ticket ordinaire.

Ton rôle de dev frontend n'est pas d'entraîner un modèle — c'est de l'intégrer intelligemment.
Pour ça, il faut comprendre ce qu'un LLM fait vraiment, ce qu'il coûte, pourquoi il est lent, et où il se trompe.

## Un LLM prédit des tokens : démystifier

Un LLM (**Large Language Model**) fait une seule chose : prédire le prochain **token** (un fragment
de mot) le plus probable, compte tenu de tout ce qui précède. Il recommence, token après token,
jusqu'à former la réponse. Pas de base de connaissances consultée en direct, pas de « compréhension » au sens humain — un modèle statistique entraîné sur d'énormes corpus de texte.

Trois conséquences produit découlent directement de ce mécanisme :

- **Plausible ≠ vrai.** Le modèle optimise la vraisemblance du texte, pas sa véracité.
- **Le format de sortie se demande et se valide.** JSON, liste, longueur : contrains, puis vérifie côté client — jamais supposé.
- **Il ne sait rien de ton application.** Tout ce qu'il « sait » de ton produit, c'est toi qui le lui envoies dans le prompt.

## Tokens, contexte et coûts

Tout ce qui entre et sort d'un LLM est mesuré en **tokens** — en gros 3 à 4 caractères par
token en anglais, un peu plus dense en français. Deux chiffres pilotent toute intégration :

- **La fenêtre de contexte** : le volume maximal de tokens (prompt + réponse) traité en un
  appel. Mi-2026, l'ordre de grandeur va de ~200 000 tokens à 1 million selon les modèles.
- **Le prix**, facturé au million de tokens, avec un tarif d'entrée et un tarif de sortie —
  la sortie coûte typiquement 3 à 5 fois plus cher que l'entrée.

La taille des prompts est donc un sujet frontend : chaque caractère que ton code envoie à
l'API se paie, à chaque requête.

:::compare
::bad
```ts
// Tout l'historique + tout le document, à chaque message
const prompt = buildPrompt(fullChatHistory, fullDocumentText, question);
```
::
::good
```ts
// Contexte trié : les derniers échanges + les sections pertinentes
const prompt = buildPrompt(
  lastMessages(history, 10),
  relevantSections(doc, question),
  question,
);
```
::
:::

**Pourquoi.** L'API est sans état : tout le contexte repart à chaque appel. Un chat qui
renvoie l'intégralité de l'historique voit son coût et sa latence croître à chaque message.
Trier ce que tu envoies est le premier levier d'optimisation, avant de changer de modèle.

## Température et déterminisme

Le modèle ne choisit pas toujours *le* token le plus probable : il tire au sort parmi les
candidats probables. La **température** règle ce hasard — proche de 0, il prend quasi
systématiquement le plus probable ; plus elle monte, plus il explore. C'est pour ça que la même question donne des réponses différentes.

```ts
// Extraction structurée : tu veux la même sortie pour la même entrée
const extraction = { temperature: 0, prompt: "Extrais {nom, email} en JSON…" };

// Rédaction assistée : la variété est une qualité, pas un bug
const brainstorm = { temperature: 0.9, prompt: "Propose 5 accroches…" };
```

**Pourquoi.** Une température basse stabilise la sortie — indispensable pour l'extraction ou
la classification, que tes tests doivent pouvoir rejouer. Mais même à 0, le déterminisme
n'est **pas garanti** : ne construis jamais une logique qui exige une sortie identique à
l'octet près. Note aussi que certains modèles récents n'exposent plus ce réglage : le pilotage passe alors uniquement par le prompt.

## Latence et streaming

Un LLM génère token par token — il ne peut pas livrer la fin de la réponse avant d'en avoir
produit le début. D'où deux métriques distinctes :

- **TTFT** (time to first token) : le délai avant le premier mot. C'est lui qui fait l'impression de réactivité.
- **Le débit** : les tokens par seconde une fois la génération lancée.

Une réponse longue peut prendre plusieurs dizaines de secondes. Sans streaming, ton
utilisateur fixe un spinner tout ce temps ; avec, il lit dès le premier mot. Le streaming
(souvent en SSE) n'est pas un raffinement, c'est le standard UX des interfaces IA.
L'implémentation côté front est couverte dans [l'article dédié au chat streamé](/ia/medior/chat-streaming-ui).

## Hallucinations et limites

Une **hallucination** est une réponse fausse énoncée avec l'aplomb d'une réponse juste : API
inventée, chiffre erroné, référence inexistante. Ce n'est pas un bug qu'un correctif fera disparaître —
c'est la conséquence directe du mécanisme de prédiction. La question produit n'est pas « comment l'empêcher » mais « comment la contenir » :

- **Ancrer sur des sources** (RAG) : fournir les documents pertinents dans le prompt et exiger que la réponse s'appuie dessus.
- **Afficher des citations** : lier chaque affirmation à sa source, pour que l'utilisateur puisse vérifier.
- **Contraindre la sortie** : schéma JSON, valeurs d'enum, validation côté client — tout ce qui réduit l'espace d'erreur.
- **Garder un humain dans la boucle** dès que l'action a des conséquences : l'IA propose, l'utilisateur valide.

## Vocabulaire de survie

:::cheatsheet
- title: "Prompt système"
  desc: "Instructions invisibles pour l'utilisateur qui cadrent le rôle, le ton et les limites du modèle."
- title: "RAG"
  desc: "Retrieval-Augmented Generation : chercher les documents pertinents et les injecter dans le prompt avant de répondre."
- title: "Embeddings"
  desc: "Vecteurs numériques qui représentent le sens d'un texte ; la brique de la recherche sémantique derrière le RAG."
- title: "Fine-tuning"
  desc: "Ré-entraîner partiellement un modèle sur tes données. Coûteux et rarement nécessaire : bon prompt + RAG suffisent le plus souvent."
- title: "Agent"
  desc: "LLM en boucle qui appelle des outils (recherche, API, code) et enchaîne les étapes jusqu'à finir la tâche."
:::

## Quand (ne pas) mettre un LLM dans une feature

:::callout{type="warn"}
Un LLM est probabiliste, lent et payant à l'appel. Si la tâche se résout par du code
déterministe (regex, calcul, règle métier), le code gagne : plus rapide, moins cher,
testable. L'IA se justifie quand l'entrée est floue ou qu'il n'existe pas UNE bonne réponse.
:::

**Bons candidats** — l'à-peu-près a de la valeur : synthèse et reformulation, extraction
depuis du texte libre (emails, tickets), classification floue, rédaction assistée avec relecture humaine.

**Mauvais candidats** — l'erreur coûte plus que la feature ne rapporte : calculs exacts
(prix, taxes — le modèle « écrit » des chiffres, il ne calcule pas), décisions critiques sans
validation humaine, données temps réel sans outils connectés (le modèle a une date de coupure de connaissances).

## À retenir

:::cheatsheet
- title: "Prédiction, pas compréhension"
  desc: "Un LLM produit le texte le plus plausible. Plausible ≠ vrai : valide toujours la sortie."
- title: "Tout se paie en tokens"
  desc: "Facturation au million de tokens, sortie 3 à 5 fois plus chère. Trier le contexte envoyé = premier levier de coût."
- title: "Température selon l'usage"
  desc: "Basse pour l'extraction et la classification, haute pour la créativité. Déterminisme jamais garanti."
- title: "Streaming par défaut"
  desc: "TTFT court + affichage progressif : le standard UX des interfaces IA. Pas de spinner de 20 secondes."
- title: "Contenir les hallucinations"
  desc: "Sources (RAG), citations, sortie contrainte, humain dans la boucle pour les actions à conséquences."
- title: "LLM seulement si le flou a de la valeur"
  desc: "Code déterministe pour l'exact ; LLM pour la synthèse, l'extraction et la classification floue."
:::
