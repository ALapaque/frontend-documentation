---
title: "Les patterns UX de l'IA"
slug: "ai-ux-patterns"
framework: "ia"
level: "senior"
order: 1
duration: 15
prerequisites: ["chat-streaming-ui"]
updated: 2026-07-08
seoTitle: "UX de l'IA — streaming, interruption, citations, human-in-the-loop, feedback"
seoDescription: "Les patterns d'interface qui rendent une feature IA digne de confiance : affordances de streaming, interruption toujours disponible, citations et sources, human-in-the-loop avant les actions, boucles de feedback, et honnêteté sur l'incertitude."
ogVariant: "crimson"
related:
  - { framework: "ia", slug: "chat-streaming-ui" }
  - { framework: "web", slug: "accessibility" }
---

Mi-2026, brancher un LLM sur une zone de texte prend une après-midi. La différence entre la démo qui impressionne en réunion et la feature que tes utilisateurs adoptent au quotidien ne se joue presque jamais dans le choix du modèle : elle se joue dans l'interface autour. Latence perçue, droit à l'interruption, sources vérifiables, confirmation avant les actions, honnêteté sur ce que le système ne sait pas — c'est ça qui fabrique la confiance.

Cet article recense les patterns d'interaction qui séparent le gadget de l'outil fiable. Aucun framework requis : ce sont des décisions de design que tu prends en tant que dev, souvent en quelques lignes.

## Montrer que ça travaille

La métrique UX numéro un d'une feature IA, c'est le **TTFT** (time to first token) : le délai avant le premier signe de vie. Sous une seconde, l'utilisateur reste engagé ; au-delà de trois, il doute que ça marche. Optimise d'abord ça (stream dès le premier token, réponse du modèle non bufférisée côté serveur) avant de penser au reste.

Pendant l'attente, sois **honnête**. Une barre de progression sur une génération LLM est un mensonge : tu ne connais pas la durée. Affiche plutôt les étapes réelles du pipeline — c'est informatif, et ça absorbe la latence bien mieux qu'un pourcentage inventé.

:::compare
::bad
```text
// Faux progrès : le pourcentage est inventé,
// il stagne à 87 % puis saute à 100 %.
[████████████████░░░] 87 % — Analyse en cours…
```
::
::good
```text
// Étapes réelles du pipeline, cochées au fur et à mesure.
✓ Recherche dans 12 documents
✓ 3 passages pertinents trouvés
◌ Rédaction de la réponse…
```
::
:::

Le streaming mot à mot n'est pas obligatoire partout. Il excelle pour la prose longue (l'utilisateur lit pendant que ça génère). Pour un résultat court ou structuré — une classification, un prix extrait, un tableau — préfère un squelette de chargement puis **une réponse d'un bloc** : regarder un JSON ou trois mots apparaître caractère par caractère, c'est du bruit visuel sans bénéfice.

## L'interruption est un droit

Pendant toute génération, un bouton **Stop doit rester visible et fonctionnel** — pas un spinner décoratif, un vrai arrêt câblé de bout en bout : `AbortController` côté client, annulation du stream côté serveur (tu arrêtes aussi de payer des tokens). Si l'utilisateur voit dès la deuxième phrase que la réponse part dans le mur, le forcer à attendre trente secondes est une petite humiliation à chaque usage.

Deux corollaires :

- **Éditer et renvoyer.** Permets de modifier un message déjà envoyé et de relancer, ou de régénérer la dernière réponse. L'itération sur le prompt est le mode d'usage normal, pas un cas limite.
- **Ne bloque jamais l'UI.** Pendant la génération, tout le reste doit rester utilisable : scroller, sélectionner, copier, ouvrir un autre fil. Et si l'utilisateur remonte pour relire, suspends l'auto-scroll au lieu de lui voler la vue.

## Citations et sources

Une affirmation sans source oblige l'utilisateur à choisir entre confiance aveugle et vérification manuelle — les deux tuent l'usage. Les citations changent le contrat : la réponse devient **vérifiable**, donc utilisable dans un contexte professionnel.

Concrètement : relie chaque affirmation à sa source avec des marqueurs inline (`[1]`, `[2]`), un survol ou un panneau qui montre le passage exact, et un lien profond vers le document d'origine — pas juste « Sources » en vrac en bas de réponse. Si ton pipeline est du RAG, tu as déjà les passages : les afficher est un travail d'UI, pas de modèle.

Et quand la recherche ne trouve rien, la bonne réponse est **« je ne sais pas »**, dit franchement, avec une piste de reformulation. Une invention plausible détruit plus de confiance que cent aveux d'ignorance.

:::compare
::bad
```text
// Aucune source ne couvre le sujet, mais le modèle brode.
La politique de remboursement prévoit un délai de 30 jours
pour tous les articles électroniques.
```
::
::good
```text
Je n'ai rien trouvé sur le remboursement des articles
électroniques dans la base documentaire.
→ Reformuler avec « retour produit » ?
→ Contacter le support
```
::
:::

## Human-in-the-loop

Dès que l'IA peut **agir** — envoyer un mail, modifier des données, déclencher un paiement — la règle est simple : préview obligatoire avant toute action irréversible. Le pattern canonique s'appelle **draft, confirm, execute** : le modèle produit un brouillon (le mail complet, le diff des données modifiées), l'humain valide ou corrige, le système exécute. La confirmation doit montrer *exactement* ce qui va se passer, pas un résumé — un diff avant/après vaut mieux qu'un « 3 champs seront modifiés ».

Pense la **granularité des permissions** par type d'action, pas en tout-ou-rien : lecture auto-approuvée, écriture avec confirmation, suppression jamais autonome. Ajoute un « toujours autoriser cette action » en opt-in par action précise. Un unique interrupteur « mode autonome » global, c'est le design qui finit dans la presse.

:::callout{type="warn"}
Attention à la fatigue de confirmation : si tu demandes une validation pour tout, l'utilisateur clique « OK » sans lire au bout de deux jours, et ta barrière de sécurité devient décorative. Réserve la confirmation aux actions à conséquences réelles, et rends le brouillon éditable directement dans la préview.
:::

## Le feedback qui sert

Des boutons 👍/👎 posés sur chaque réponse ne valent rien en soi. Ils n'ont de valeur que si tu **fermes la boucle** : capter le vote *avec son contexte* (prompt utilisateur, réponse, version du prompt système, documents récupérés), analyser les échecs régulièrement, itérer sur les prompts ou le retrieval, et mesurer si le taux remonte. Un 👎 stocké dans une table que personne ne lit, c'est du théâtre de feedback.

Sur un 👎, propose une précision optionnelle et fermée (« Incorrect / Hors sujet / Trop long ») — jamais un formulaire libre obligatoire, sinon tu n'auras aucun signal du tout.

Le signal le plus riche est souvent **implicite** :

- **Copie de la réponse, insertion du brouillon** → succès probable.
- **Régénération ou réécriture immédiate du prompt** → échec, plus fiable qu'un 👎 jamais cliqué.
- **Distance d'édition** sur un brouillon inséré : si l'utilisateur réécrit 80 % du texte proposé, ta feature ne l'aide pas, quoi qu'en disent les votes.

## Honnêteté sur l'incertitude

Un LLM produit le vrai et le faux avec le même aplomb. Ton interface doit compenser, pas amplifier :

- **Formulations calibrées.** Demande au modèle (via le prompt système) de qualifier ce qui est incertain : « d'après le document X… », « je n'ai pas trouvé de source pour… ». Bannis le ton d'oracle sur des données faibles.
- **Fallbacks explicites.** Quand un outil ou la génération échoue, dis-le tel quel et propose la suite : réessayer, reformuler. Et ne perds **jamais** le texte que l'utilisateur avait tapé — une erreur qui efface le prompt est impardonnable.
- **Pas de déguisement.** N'habille pas l'IA en humain : pas de faux prénom d'agent du support, pas de « en train d'écrire… » simulé pour imiter un collègue. L'AI Act européen impose de toute façon cette transparence pour les systèmes conversationnels à partir d'août 2026 — mais c'était déjà la bonne pratique avant d'être la loi.
- **L'erreur avec grâce.** Retry automatique discret sur les erreurs transitoires, message actionnable sinon. « Une erreur est survenue » sans issue de secours, c'est un cul-de-sac.

## Generative UI, avec prudence

Le pattern qui monte : au lieu de texte, le modèle renvoie une **description structurée d'interface** — une carte produit, un formulaire pré-rempli, un mini-tableau comparatif — que ton front rend avec ses propres composants. Bien fait, c'est spectaculaire : la réponse devient actionnable au lieu d'être un pavé à lire.

Le garde-fou non négociable : le modèle choisit dans un **vocabulaire de composants fini et validé**, il ne génère jamais de HTML ou de JSX arbitraire. Concrètement, il produit du JSON contraint (tool calling ou sortie structurée), tu le valides contre un schéma strict (Zod ou équivalent), et chaque type mappe vers un composant que tu as écrit, testé et rendu accessible. Sortie invalide ? Fallback texte, jamais de rendu partiel bricolé.

:::callout{type="info"}
Du HTML libre généré par le modèle, c'est trois problèmes d'un coup : une surface d'injection (le contenu vient d'un système influençable par l'utilisateur), une accessibilité imprévisible, et un design system contourné. Un enum de dix composants couvre 95 % des besoins et reste auditable.
:::

## À retenir

:::cheatsheet
- title: "TTFT d'abord"
  desc: "Premier token sous la seconde ; étapes réelles affichées, jamais de faux pourcentage."
- title: "Stream quand ça se lit"
  desc: "Mot à mot pour la prose longue ; un bloc pour les résultats courts ou structurés."
- title: "Stop toujours visible"
  desc: "Annulation réelle (client + serveur), éditer/renvoyer possible, UI jamais bloquée."
- title: "Cité ou avoué"
  desc: "Chaque affirmation liée à sa source ; « je ne sais pas » plutôt qu'une invention."
- title: "Draft, confirm, execute"
  desc: "Préview exacte avant toute action irréversible ; permissions par type d'action."
- title: "Ferme la boucle"
  desc: "👍/👎 + contexte + analyse + itération. Copie = succès, réécriture immédiate = échec."
- title: "Honnête par design"
  desc: "Incertitude formulée, erreurs avec issue de secours, jamais d'IA déguisée en humain."
- title: "Generative UI bornée"
  desc: "JSON validé par schéma vers des composants finis ; jamais de HTML arbitraire."
:::
