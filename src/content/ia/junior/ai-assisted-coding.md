---
title: "Coder avec une IA : de l'autocomplete à l'agent"
slug: "ai-assisted-coding"
framework: "ia"
level: "junior"
order: 2
duration: 14
prerequisites: ["llm-basics"]
updated: 2026-07-08
seoTitle: "Coder avec une IA — autocomplete, chat, agents : pratiques d'équipe 2026"
seoDescription: "Les trois niveaux d'assistance IA au code (autocomplete, chat, agents), où chacun brille, les pièges (code plausible-faux, secrets, dépendances hallucinées), et les pratiques d'équipe qui rendent l'IA fiable : conventions dans le repo, tests, petits diffs."
ogVariant: "sage"
related:
  - { framework: "ia", slug: "llm-basics" }
  - { framework: "architecture", slug: "tdd" }
---

En 2026, la question n'est plus « faut-il coder avec une IA » mais **comment le
faire sans dégrader la codebase** : un outil qui produit du code dix fois plus
vite produit aussi de la dette dix fois plus vite si personne ne relit. Voici
les trois niveaux d'assistance, le piège du code « plausible-faux », les
risques concrets et les pratiques qui rendent l'IA réellement fiable.

## Trois niveaux d'assistance

**L'autocomplete** (style Copilot) complète la ligne ou le bloc en cours.
Force : zéro friction, parfait pour le code mécanique — un `map`, un type, un
test répétitif. Limite : contexte étroit ; il ignore volontiers tes
conventions ou réinvente un utilitaire qui existe déjà.

**Le chat** te laisse poser une question, coller une stack trace, demander un
morceau ciblé. Force : expliquer, débloquer, explorer une API inconnue.
Limite : il ne voit que ce que tu colles, et l'intégration reste à ta charge.

**Les agents** (Claude Code, Cursor et équivalents) travaillent dans le
dépôt : ils lisent plusieurs fichiers, modifient le code, lancent les tests et
itèrent. Force : les tâches transverses — migration, refactor multi-fichiers.
Limite : plus l'autonomie est grande, plus une mauvaise direction fait de
dégâts avant que tu ne la voies. Choisis le niveau selon la tâche.

## Le code plausible-faux

Le piège central : le code généré **compile, passe le linter et semble juste**.
Un LLM optimise la vraisemblance, pas la vérité — il produit exactement le
genre d'erreur qu'une relecture rapide ne voit pas.

:::compare
::bad
```ts
// Regrouper les commandes par jour — généré, compile, "marche"
function jourDe(commande: Order): string {
  return new Date(commande.createdAt).toISOString().slice(0, 10);
}
```
::
::good
```ts
// La date métier est celle du fuseau de l'utilisateur, pas UTC
function jourDe(commande: Order, timeZone: string): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone }).format(new Date(commande.createdAt));
}
```
::
:::

**Pourquoi.** `toISOString()` convertit en UTC : une commande passée le 3 mars
à 00 h 30 à Bruxelles (UTC+1) se retrouve datée du 2 mars. Le code est
idiomatique, les tests écrits en journée passent, et le bug n'apparaît qu'en
production, la nuit. Subtil, silencieux, très convaincant.

La conséquence : **la revue reste obligatoire, et tu es responsable de ce que
tu merges**. « C'est l'IA qui l'a écrit » n'existe pas comme excuse.

## Les pièges concrets

**Les secrets.** Coller un `.env` ou un token dans un prompt, c'est l'exfiltrer
vers un tiers. Utilise des placeholders ; un secret collé par erreur se révoque.

**Les licences.** Un LLM peut restituer du code copyleft vu à l'entraînement.
Pour un long bloc qui « sort de nulle part », questionne la provenance.

**Les dépendances hallucinées et le slopsquatting.** Les LLM inventent des
noms de paquets plausibles — environ un paquet suggéré sur cinq n'existe pas,
selon les études. Des attaquants publient de vrais paquets malveillants sous
ces noms inventés : c'est le **slopsquatting**.

```bash
# Avant d'installer un paquet suggéré par une IA :
npm view nom-du-paquet time.created maintainers
```

**Pourquoi.** Le paquet piégé s'installe sans erreur et son `postinstall` fait
le reste ; seuls l'âge, l'historique et les mainteneurs le trahissent. Trente
secondes contre une compromission de ta machine et de la CI : vite calculé.

**La sur-confiance en sécurité.** Auth, crypto, validation : là où l'erreur
coûte le plus cher, bibliothèque éprouvée et relecture expérimentée décident.

## Rendre l'agent efficace

Un agent est bon dans un dépôt lisible et médiocre dans un dépôt confus : tout
ce qui aide un nouveau collègue — architecture claire, nommage cohérent — aide
l'agent au même titre. Le levier le plus rentable : un **fichier d'instructions
à la racine** (`CLAUDE.md`, `AGENTS.md` selon l'outil), lu à chaque session.

```text CLAUDE.md
# Conventions du projet
- pnpm uniquement ; tests : pnpm test, lint : pnpm lint
- Composants en fonction + hooks, jamais de classe
- Les appels API passent par src/api/, jamais de fetch direct
- Toute nouvelle logique arrive avec ses tests
```

**Pourquoi.** Sans ce fichier, l'agent devine tes conventions à partir de son
entraînement — la moyenne d'internet. Avec, il applique **les tiennes**, et le
cadrage est versionné dans Git au lieu d'être répété dans chaque prompt. Trois
pratiques complètent ce socle :

- **Les tests comme garde-fou.** Une suite solide permet à l'agent de vérifier
  son travail et de s'auto-corriger. Test d'abord, agent ensuite (voir TDD).
- **Demande de PETITS diffs.** « Refactore tout le module » produit un pavé
  irrelisable ; « extrais cette fonction et gère le cas X » produit un diff
  relisable. Si tu ne peux pas relire, c'est trop gros.
- **Itère.** Un résultat à 80 % se corrige par une instruction ciblée ;
  reformuler depuis zéro jette le contexte déjà accumulé.

:::callout{type="tip"}
Ne demande jamais à un agent un diff plus gros que ce que tu accepterais de
relire venant d'un collègue humain.
:::

## Ce que l'IA ne remplace pas

La **compréhension du domaine** : l'IA ne sait pas que dans ton métier une
« commande annulée » reste facturable trente jours. L'**architecture** : elle
optimise localement, pas la cohérence sur deux ans. La **revue** : merger reste
une décision humaine. Et le **goût** : sentir qu'une solution est trop lourde.

:::callout{type="warn"}
Junior + IA sans relecture = dette accélérée. L'IA te rend plus rapide sur ce
que tu sais déjà juger ; sur le reste, plus rapide à produire des erreurs.
Fais relire, et lis du code sans IA régulièrement.
:::

## À retenir

:::cheatsheet
- title: "Trois niveaux"
  desc: "Autocomplete pour le mécanique, chat pour comprendre, agent pour les tâches multi-fichiers délimitées."
- title: "Plausible-faux"
  desc: "Le code généré compile et semble juste ; la revue reste obligatoire, tu es responsable de ce que tu merges."
- title: "Secrets & licences"
  desc: "Jamais de token dans un prompt (sinon révocation) ; questionne la provenance d'un long bloc généré."
- title: "Slopsquatting"
  desc: "Les LLM inventent des noms de paquets, des attaquants les publient : vérifie âge et mainteneurs avant d'installer."
- title: "CLAUDE.md / AGENTS.md"
  desc: "Tes conventions dans un fichier d'instructions versionné : l'agent applique tes règles, pas la moyenne d'internet."
- title: "Petits diffs + tests"
  desc: "Demande des changements relisables, laisse les tests servir de garde-fou, itère au lieu de repartir de zéro."
:::
