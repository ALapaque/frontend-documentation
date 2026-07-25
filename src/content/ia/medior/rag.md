---
title: "RAG : brancher un LLM sur tes données"
slug: "rag"
framework: "ia"
level: "medior"
order: 3
duration: 16
prerequisites: ["ai-sdk"]
updated: 2026-07-25
seoTitle: "RAG expliqué — embeddings, chunking et recherche vectorielle en pratique"
seoDescription: "Le Retrieval-Augmented Generation sans magie : pourquoi retrouver avant de générer, comment découper et vectoriser tes documents, la recherche hybride, le reranking, et les variantes agentic RAG et GraphRAG. Avec les pièges qui font échouer un RAG en production."
ogVariant: "sage"
related:
  - { framework: "ia", slug: "ai-sdk" }
  - { framework: "ia", slug: "llm-basics" }
---

Un LLM ne connaît que ce qu'il a vu à l'entraînement. Il ignore ta documentation
interne, tes tickets, le contrat signé la semaine dernière. Deux mauvaises
réponses à ce problème circulent : réentraîner le modèle (hors de prix, lent) ou
tout coller dans le prompt (impossible dès que le corpus dépasse la fenêtre de
contexte, et ruineux en tokens).

Le **RAG** — *Retrieval-Augmented Generation* — prend la troisième voie :
**retrouver d'abord les quelques passages pertinents, puis les donner au modèle**
au moment de répondre. Le modèle ne mémorise rien ; il lit un extrait qu'on vient
de lui poser sur la table.

## La boucle en quatre temps

Un RAG, dépouillé de son vocabulaire, c'est une recherche documentaire suivie
d'une génération :

1. **Indexation** (hors ligne) : découper les documents, calculer un vecteur par
   morceau, stocker le tout.
2. **Recherche** (à la question) : vectoriser la question, retrouver les morceaux
   les plus proches.
3. **Augmentation** : injecter ces morceaux dans le prompt.
4. **Génération** : le modèle répond *à partir de* ce contexte, et cite ses
   sources.

:::callout{type="info"}
Retiens la conséquence architecturale : **la qualité d'un RAG se joue à l'étape
2, pas à l'étape 4**. Un modèle excellent nourri de mauvais extraits produit une
réponse fausse mais confiante. Quand un RAG déçoit, le coupable est presque
toujours la recherche, pas le LLM.
:::

## Les embeddings : du texte vers des coordonnées

Un **embedding** est un vecteur de plusieurs centaines de nombres qui représente
le *sens* d'un texte. Deux textes de sens proche donnent deux vecteurs proches,
même sans partager un seul mot — « annuler mon abonnement » et « résilier »
tombent au même endroit.

```ts
import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

// Indexation : un vecteur par morceau
const { embeddings } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: morceaux.map((m) => m.texte),
});

// Recherche : un vecteur pour la question
const { embedding: vecteurQuestion } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: 'comment résilier mon offre ?',
});
```

**Pourquoi ça marche.** La « proximité » se mesure par **similarité cosinus** :
l'angle entre deux vecteurs. Un angle faible signifie un sens voisin. C'est ce qui
permet de retrouver un passage qui répond à la question sans en reprendre les
mots — là où une recherche par mots-clés échouerait.

:::callout{type="warn"}
Le modèle d'embedding utilisé à l'indexation et celui utilisé à la recherche
doivent être **identiques**. Deux modèles différents produisent des espaces
vectoriels incomparables : la recherche renverra du bruit. Changer de modèle
impose de **réindexer tout le corpus**.
:::

## Le chunking : là où la plupart des RAG échouent

Découper les documents paraît trivial. C'est le paramètre le plus déterminant.

- **Trop gros** : le vecteur mélange plusieurs sujets, sa position moyenne ne
  représente plus rien, et tu gaspilles du contexte.
- **Trop petit** : le morceau perd le contexte qui le rend compréhensible (un
  « il » sans antécédent, un tarif sans le nom de l'offre).

:::compare
::bad
```ts
// Découpe aveugle tous les 500 caractères :
// coupe au milieu d'une phrase, sépare un titre de son contenu.
const morceaux = texte.match(/.{1,500}/g);
```
::
::good
```ts
// Découpe sur la STRUCTURE, avec recouvrement pour ne pas
// perdre le fil entre deux morceaux voisins.
const morceaux = decouperParSection(texte, {
  taille: 800,
  recouvrement: 150,     // ~15-20 % : la fin d'un morceau ouvre le suivant
  separateurs: ['\n## ', '\n### ', '\n\n'],
});
```
::
:::

**Pourquoi le recouvrement.** Sans lui, une phrase à cheval sur deux morceaux est
tronquée des deux côtés et devient irretrouvable. Avec 15-20 % de recouvrement,
elle apparaît entière dans au moins un morceau.

Garde toujours des **métadonnées** avec chaque morceau (titre du document, URL,
section, date) : elles servent à citer la source et à filtrer.

## La recherche hybride : vecteurs *et* mots-clés

La recherche vectorielle capte le sens mais rate les termes exacts — une
référence produit `XR-4402`, un nom propre, un code d'erreur. La recherche
lexicale (BM25) fait exactement l'inverse.

La **recherche hybride** exécute les deux et fusionne les classements. C'est le
défaut raisonnable en production : elle corrige la faiblesse la plus visible du
RAG naïf, celle qui fait dire « il ne trouve pas alors que le mot est écrit noir
sur blanc ».

Vient ensuite le **reranking** : on récupère large (30-50 candidats), puis un
modèle de *cross-encoding* relit chaque candidat *avec* la question et les
reclasse finement. On ne garde que les 3 à 5 meilleurs pour le prompt.

:::callout{type="tip"}
Ce pipeline en entonnoir — recherche large et rapide, puis reranking précis et
coûteux sur peu de candidats — donne presque toujours un meilleur rapport
qualité/prix qu'une recherche unique très sophistiquée.
:::

## Injecter le contexte, et exiger les citations

```ts
const contexte = passages
  .map((p, i) => `[${i + 1}] (${p.source})\n${p.texte}`)
  .join('\n\n');

const { text } = await generateText({
  model: openai('gpt-5'),
  system:
    "Réponds UNIQUEMENT à partir des passages fournis. " +
    "Cite tes sources avec [n]. Si les passages ne suffisent pas, " +
    "dis-le explicitement au lieu d'inventer.",
  prompt: `Passages :\n${contexte}\n\nQuestion : ${question}`,
});
```

Deux consignes font tout le travail : **numéroter les passages** pour rendre la
citation vérifiable, et **autoriser explicitement le « je ne sais pas »**. Sans
la seconde, le modèle comble les trous — c'est le comportement par défaut d'un
prédicteur de tokens.

## Au-delà du RAG naïf

Trois variantes répondent à des limites précises :

- **Agentic RAG** : au lieu d'une recherche systématique, le modèle **décide**
  s'il doit chercher, avec quels termes, et peut relancer plusieurs recherches
  successives. Utile quand la question demande de croiser plusieurs sources. La
  recherche devient un outil (renvoi à `/ia/senior/ai-agents`).
- **GraphRAG** : le corpus est structuré en graphe de connaissances (entités et
  relations) plutôt qu'en morceaux isolés. Répond mieux aux questions
  transversales (« quels clients sont touchés par ce fournisseur ? ») qu'une
  recherche par similarité, au prix d'une indexation lourde.
- **Contextual retrieval** : avant de vectoriser, on préfixe chaque morceau d'un
  court résumé de son document d'origine. Le morceau devient auto-suffisant, ce
  qui améliore nettement la précision pour un coût d'indexation modeste.

## Ce qui casse en production

:::callout{type="warn"}
Le **contrôle d'accès** est le piège n°1. Si ton index contient des documents à
visibilité variable, la recherche doit filtrer **par les droits de l'utilisateur
courant avant** de composer le prompt. Un RAG qui indexe tout et filtre après
coup fuite des données confidentielles dans la réponse. Le filtrage se fait dans
la requête vectorielle, jamais dans le prompt.
:::

Les autres classiques : un index **périmé** (prévois la réindexation
incrémentale), des documents **dupliqués** qui saturent les 5 places du contexte
avec cinq copies du même paragraphe, et l'absence de **mesure** — sans jeu de
questions/réponses de référence, tu ne sauras pas si ton changement de chunking
a amélioré ou dégradé le système (renvoi à `/ia/senior/ai-evals`).

## À retenir

Un RAG est d'abord un **moteur de recherche**, et accessoirement un LLM. Investis
dans le découpage, la recherche hybride et le reranking avant de changer de
modèle. Impose les citations et le droit de dire « je ne sais pas ». Et filtre
par les droits **avant** la génération, pas après.

:::cheatsheet
- title: "Embedding"
  desc: "Vecteur de sens. Même modèle à l'indexation et à la recherche, sinon réindexation complète."
- title: "Chunking"
  desc: "Découper sur la structure, 15-20 % de recouvrement, métadonnées jointes pour citer et filtrer."
- title: "Recherche hybride"
  desc: "Vectoriel (le sens) + BM25 (les termes exacts, codes, noms propres). Le défaut en production."
- title: "Reranking"
  desc: "Récupérer large (30-50), reclasser finement, ne garder que 3-5 passages dans le prompt."
- title: "Citations obligatoires"
  desc: "Numéroter les passages et autoriser « je ne sais pas » : sans ça, le modèle comble les trous."
- title: "Agentic RAG"
  desc: "Le modèle décide quand et quoi chercher, en plusieurs tours. La recherche devient un outil."
- title: "Droits AVANT génération"
  desc: "Filtrer dans la requête vectorielle selon l'utilisateur. Filtrer après coup fuite des données."
:::
