---
title: "Piloter un agent de code : contexte, plan, vérification"
slug: "agentic-coding-workflow"
framework: "ia"
level: "medior"
order: 4
duration: 16
prerequisites: ["ai-assisted-coding"]
updated: 2026-11-27
seoTitle: "Piloter un agent de code — AGENTS.md, plan, hooks, permissions, revue"
seoDescription: "La méthode pour travailler avec un agent de code autonome : fichier d'instructions court, plan écrit avant le code, contrôle exécutable, hooks et permissions pour les règles sans exception, worktrees et sous-agents, revue par risque. Avec les pièges et les idées reçues."
ogVariant: "gold"
related:
  - { framework: "ia", slug: "ai-assisted-coding" }
  - { framework: "architecture", slug: "tdd" }
  - { framework: "ia", slug: "ai-agents" }
  - { framework: "tooling", slug: "npm-supply-chain-security" }
---

Tu sais déjà [ce qu'est un agent de code](/ia/junior/ai-assisted-coding) et pourquoi
il lui faut un fichier d'instructions et de petits diffs. Reste le quotidien : tu
lui confies une tâche de quarante minutes, tu reviens, et le résultat est soit
mergeable, soit à jeter. La différence tient rarement au prompt. Elle tient à ce que
tu as installé **autour** de l'agent : ce qu'il sait, ce qu'il peut exécuter pour se
vérifier, ce qu'il a le droit de toucher, et qui relit.

Les outils convergent : Claude Code, Codex et Gemini CLI documentent chacun un
fichier d'instructions, un mode plan, des hooks et un bac à sable. Cet article
décrit la **méthode** ; les commandes citées en exemple ont été relues dans les docs
officielles en novembre 2026, et elles bougent vite.

## Le fichier d'instructions est un produit

Le format d'abord. **`AGENTS.md`** est un standard ouvert, du simple Markdown,
utilisé par plus de 60 000 projets open source et porté par l'Agentic AI Foundation
(Linux Foundation). Codex, Cursor, Copilot, Zed et d'autres le lisent ; Gemini CLI
et Aider via un réglage. Claude Code le lit s'il ne trouve pas de `CLAUDE.md` ; si
tu as les deux, fais commencer `CLAUDE.md` par l'import `@AGENTS.md`.

Le contenu ensuite. Ce fichier est chargé à **chaque** session : chaque ligne prend
un peu de l'attention de l'agent sur chaque tâche, pertinente ou non. Traite-le
comme un produit au budget serré. Avant chaque ajout : **l'agent pourrait-il le
trouver en lisant le code, et irait-il le chercher ?** Deux oui : la ligne est en
trop.

:::compare
::bad
```text AGENTS.md
# Architecture
Application React avec Vite. Composants dans src/components, hooks
dans src/hooks, pages dans src/pages… (150 lignes de visite guidée)
IMPORTANT : TOUJOURS écrire du code PROPRE. Indentation 2 espaces.
```
::
::good
```text AGENTS.md
# Commandes
- Un seul fichier de test : pnpm vitest run chemin/fichier.test.ts
- Types : pnpm tsc --noEmit · Lint : pnpm lint
# Pièges et décisions
- src/legacy/ est encore en production : ne copie pas ses patterns
- Erreurs : helpers de src/lib/errors.ts, jamais de throw de chaîne
```
::
:::

**Pourquoi.** L'agent lit l'arborescence plus vite que tu ne la décris, et
l'indentation appartient au formateur. Ce qu'il ne devine pas : les commandes
exactes pour se vérifier, les endroits où le code ment, les décisions prises en
réunion, ce que tu as déjà corrigé deux fois. Les majuscules n'aident pas : une
ligne ignorée signale un fichier trop long, ou une règle qui n'est pas à sa place.

Trois choses n'y vont pas :

- **Une règle locale** vit près du code concerné : un `AGENTS.md` imbriqué (le plus
  proche du fichier édité l'emporte) ou une règle filtrée par chemin, comme
  `.claude/rules/` avec `paths:` chez Claude Code ou `.github/instructions/` avec
  `applyTo` chez Copilot.
- **Une procédure longue** (release, runbook) va dans une *skill*, lue au besoin.
- **Une règle sans exception** devient un hook ou une permission. Un **secret** n'a
  rien à faire dans un fichier versionné.

## Explorer, planifier, implémenter

Lancé directement sur « ajoute une limite de débit », l'agent code la première
interprétation plausible. Tu découvres le malentendu quarante minutes plus tard,
dans un diff de 600 lignes. Séparer les phases avance cette découverte au moment où
elle coûte dix lignes à relire.

1. **Explorer.** L'agent lit et propose sans modifier, en *mode plan* (`/plan` dans
   Claude Code et Codex, `gemini --approval-mode=plan`).
2. **Planifier.** Il écrit une spec dans un fichier (`SPEC.md`) : périmètre,
   hors-périmètre, cas limites, et ce que **« terminé »** veut dire. Tu relis ça,
   pas du code. Rien n'est tranché ? Demande-lui de t'interroger d'abord.
3. **Implémenter.** En session neuve, depuis la spec, une tâche à la fois.

La spec sert trois fois : elle cadre le code, survit au changement de session, et
c'est contre elle que tu feras relire le diff. Anthropic le note dans un
[retour d'expérience](https://www.anthropic.com/engineering/harness-design-long-running-apps)
de mars 2026 : sans étape de planification, l'agent voit trop petit — il code sans
spécifier et livre moins.

Dans la spec comme dans le prompt, écris **ce qu'il ne voit pas** : le symptôme,
l'endroit, ce que « corrigé » veut dire, la contrainte. Il sait lire ton code, pas
ta réunion de mardi. Mais le plan n'est pas un rituel : un changement que tu décris
en une phrase et relis en trente secondes se lance directement.

## La boucle de vérification

Un agent s'arrête quand le travail **a l'air** fini. Sans rien à exécuter qui
réponde « passe » ou « échoue », la suite de tests, c'est toi. Donne-lui un contrôle
lisible par une machine :

- les **tests** — idéalement un test rouge écrit avant, comme en
  [TDD](/architecture/medior/tdd) : « terminé » devient « ce test passe » ;
- le **typecheck**, le **lint** et le **build** : rapides, sans ambiguïté ;
- le **rendu** : en front, des tests verts n'empêchent pas une page cassée. Une
  capture comparée à la maquette ou un scénario
  [Playwright](/tooling/medior/playwright) ferme cette boucle-là.

Exige la **preuve** — la commande lancée et sa sortie, pas « tous les tests
passent ». Et relis en premier les tests supprimés, assouplis ou passés en `skip` :
pour faire passer un test, un agent modifie parfois… le test.

### Demandé ou garanti : les hooks

Un prompt ou un fichier d'instructions est **lu par le modèle**, qui décide quoi en
faire. Il suit presque toujours ; « presque » suffit pour une préférence, pas pour
une règle. Un **hook** est un script que l'outil lui-même exécute à un point fixe de
la boucle : avant ou après un appel d'outil, quand l'agent veut s'arrêter. Claude
Code, Codex et Gemini CLI en proposent tous. Exemple chez Claude Code : impossible
de finir tant que le typecheck échoue.

```json .claude/settings.json
{
  "hooks": {
    "Stop": [
      { "hooks": [{ "type": "command", "command": "pnpm tsc --noEmit 1>&2 || exit 2" }] }
    ]
  }
}
```

**Pourquoi ça marche.** Le code de sortie 2 bloque l'arrêt et la sortie d'erreur du
compilateur revient à l'agent, qui corrige et réessaie (un plafond de blocages
consécutifs évite la boucle infinie). La consigne « vérifie les types avant de
finir » marche la plupart du temps ; le hook ne dépend plus de sa mémoire.

Réserve-le aux règles à **zéro** exception — « préfère les exports nommés » en a
plein, elle reste une consigne. Et garde l'ensemble petit : chaque hook se
déclenchera un jour à tort.

## Permissions et isolement

Deux réglages distincts travaillent ensemble : le **bac à sable** (*sandbox*),
frontière technique posée par l'OS ou un conteneur sur les fichiers et le réseau
accessibles aux commandes ; et les **approbations**, qui décident quand l'agent
s'arrête pour demander.

Les deux extrêmes coûtent cher. Tout approuver à la main : au dixième prompt tu
valides sans lire, et rien n'avance sans toi. Tout autoriser : acceptable uniquement
dans un conteneur jetable. Entre les deux, un second modèle peut juger à ta place
les actions sensibles (*auto mode* de Claude Code, *Approve for me* de Codex). C'est
un jugement, pas une règle : tes « jamais » vont dans une règle de refus — un `deny`
sur `Read(./.env)` chez Claude Code — qui tient quel que soit le mode.

:::callout{type="warn"}
Une règle de permission filtre des **appels d'outil**, pas une intention : elle
bloque la lecture directe de `.env`, pas un script qui ouvrirait le fichier. Combine
refus **et** bac à sable, et ne laisse aucun identifiant de production sur la
machine où tourne l'agent.
:::

Ce qu'on n'automatise pas : merge sur la branche principale, déploiement en
production, migration de données, *force push* — tout ce qui ne se défait pas.
Protège-le **hors de l'agent** (protection de branche, CI, approbation humaine) : un
« ne pousse pas » dit dans la conversation peut se perdre. Et ce que l'agent lit —
ticket, page web, README d'une dépendance — peut porter des instructions hostiles :
c'est l'[injection de prompt](/ia/senior/ai-security).

## Sous-agents et sessions parallèles

Un **sous-agent** est une session fille, avec son propre contexte, qui renvoie un
résumé. Idée reçue : déléguer donnerait une meilleure réponse. Non — c'est le même
modèle sur la même tâche. Ce que tu achètes vraiment :

- du **parallélisme** sur des morceaux indépendants ;
- un contexte principal **propre** : la sortie d'une recherche large ou d'une suite
  de tests reste chez le sous-agent ;
- un **regard neuf** aux **outils restreints** : un relecteur en lecture seule, qui
  n'a pas vu le raisonnement.

Le prix se paie en tokens — chaque sous-agent envoie ses propres requêtes, et les
docs de Claude Code comme de Codex préviennent que ces flux consomment plus qu'une
exécution simple — et parfois en temps : un sous-agent neuf reconstruit un contexte
que ta session avait déjà. Demande des résumés courts.

Pour plusieurs **sessions** en parallèle, donne à chacune son checkout, sinon les
modifications se marchent dessus. C'est le rôle des *worktrees* Git, que Claude Code
(`claude -w feature-auth`) et Codex savent créer pour toi :

```bash
git worktree add ../shop-auth -b feature/auth   # un dossier, une branche
git worktree remove ../shop-auth                # une fois la branche mergée
```

Trois pièges : un worktree est un checkout neuf, sans `.env` ni `node_modules` ;
deux serveurs de dev se disputent le même port ; et ce n'est **pas** un bac à sable.
Surtout, le goulot n'est plus l'écriture mais **ta relecture** : cinq agents en
parallèle, ce sont cinq diffs à relire.

## Relire un diff d'agent

Un diff d'agent est propre, cohérent, bien nommé — rien n'accroche l'œil, et c'est
le problème. Relis par **risque**, pas dans l'ordre des fichiers :

1. **Ce qui peut faire mal** : auth, paiement, permissions, migrations, config de
   CI, tests modifiés, `package.json` et lockfile
   ([toute dépendance se vérifie](/tooling/medior/npm-supply-chain-security)).
2. **La logique métier** : les règles que seul ton domaine connaît.
3. **Le mécanique** : renommages, imports, code généré. Un survol suffit.

Ajoute une **revue croisée contre la spec**, par un relecteur qui n'a pas écrit le
code — sous-agent ou seconde session :

```text
Relis le diff par rapport à SPEC.md : chaque exigence est-elle implémentée,
chaque cas limite listé a-t-il un test ? Ne signale que les écarts qui
touchent la correction. Ignore le style.
```

**Pourquoi.** Un agent juge son propre travail avec indulgence ; séparer celui qui
produit de celui qui évalue est le levier qu'Anthropic retient de ses sessions
longues. Et « ignore le style » compte : un relecteur à qui on demande des problèmes
en trouve toujours, et tout corriger empile abstractions et tests de cas
impossibles.

Reste la décision. L'agent résume ce qu'il a fait ; **toi, tu merges**, et tu en
réponds : l'approbation humaine est le seul contrôle qui engage quelqu'un.

## À retenir

:::cheatsheet
- title: "Fichier d'instructions"
  desc: "AGENTS.md / CLAUDE.md court : commandes, pièges, décisions. Ce que l'agent trouve seul dans le code n'y va pas."
- title: "Explorer → planifier → implémenter"
  desc: "Mode plan, spec écrite avec la définition de « terminé », puis session neuve et une tâche relisable à la fois."
- title: "Contrôle exécutable"
  desc: "Tests, types, lint, build, rendu : un résultat passe/échoue, et la sortie de la commande comme preuve."
- title: "Garanti, pas demandé"
  desc: "Zéro exception = hook ou règle de refus, exécutés par l'outil. Bac à sable autour, l'irréversible protégé hors de l'agent."
- title: "Parallélisme et revue"
  desc: "Sous-agents et worktrees coûtent des tokens et ta relecture. Revue par risque, puis contre la spec ; tu merges."
:::
