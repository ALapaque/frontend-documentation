---
title: "Outils : l'horizon 2027"
slug: "tooling-2027"
framework: "tooling"
level: "next"
order: 1
duration: 16
prerequisites: ["vite", "package-managers"]
updated: 2026-11-27
seoTitle: "Outils 2027 — bundled dev mode de Vite, tsrs, pnpm 12, Node 27"
seoDescription: "Ce qui arrive dans l'outillage front-end fin 2026 : bundled dev mode de Vite, tsrs (TypeScript porté en Rust), pnpm 12 réécrit en Rust, npm 12, Node 27 en cadence annuelle et Storybook 11. Quoi adopter maintenant, quoi seulement surveiller."
ogVariant: "iris"
related:
  - { framework: "tooling", slug: "rust-toolchain" }
  - { framework: "tooling", slug: "npm-supply-chain-security" }
  - { framework: "typescript", slug: "typescript-7-1" }
  - { framework: "web", slug: "web-platform-2027" }
---

L'horizon 2026 est derrière toi. Vite 8 tourne sur Rolldown, Oxlint fait du lint
typé, TypeScript 7 est natif et `node fichier.ts` s'exécute sans transpileur. Tout
cela est livré et a son module : `/tooling/medior/vite`,
`/tooling/medior/oxlint-oxfmt`, `/typescript/next/typescript-7`,
`/tooling/senior/node-runtimes`.

Fin 2026, le front s'est déplacé. Ce qui bouge maintenant, ce sont les **derniers
maillons lents** (le serveur de dev des très grosses apps, le typecheck), les
**réglages par défaut**, qui se durcissent, et le **public visé** : des outils
pensés pour être pilotés par un agent autant que par toi. Cet article trie ce qui
est prêt de ce qui ne l'est pas, avec des statuts datés de novembre 2026.

## Vite : le serveur de dev se met à bundler

Le serveur de dev de Vite ne bundle pas : chaque module part dans sa propre
requête HTTP. C'est ce qui l'a rendu rapide, jusqu'à un certain nombre de modules.
À 10 000 modules, le navigateur passe son temps à traiter des requêtes, au
démarrage comme à chaque rechargement — et c'est pire derrière un proxy réseau.

Le **bundled dev mode** (ex « Full Bundle Mode »), arrivé avec Vite 8.1 le 23 juin
2026, sert en développement des fichiers **bundlés par Rolldown**, comme en
production, tout en gardant le HMR.

```ts vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  experimental: {
    bundledDev: true, // ou ponctuellement : vite --experimental-bundle
  },
});
```

Les chiffres de l'annonce : sur une app de test de 10 000 composants React, un
démarrage environ **15× plus rapide** et des rechargements complets **10× plus
rapides**. Sur une vraie base, l'équipe de Linear mesure un rendu à froid jusqu'à
3× plus rapide et 10× moins de requêtes réseau.

:::callout{type="warn"}
**Expérimental en novembre 2026.** Le mode couvre le côté navigateur et les
plugins de base : un plugin tiers peut ne pas fonctionner. Côté SSR, Vite 8.4
(26 novembre 2026) n'apporte qu'une prise en charge « hautement expérimentale »,
fondation pour les méta-frameworks. À essayer sur une grosse app qui démarre
lentement ; sans intérêt sur un projet de quelques centaines de modules.
:::

### Deux défauts à anticiper pour la prochaine majeure

Au 27 novembre 2026, la prochaine majeure n'a ni date ni préversion publiée. Deux
changements de défaut se dessinent pourtant, et tu peux déjà les essayer.

**`server.fs` en liste d'autorisation.** Le serveur de dev sert des fichiers de
ton disque. Si quelqu'un d'autre peut l'atteindre (réseau partagé, `--host`), le
contrôle `server.fs` doit l'empêcher de lire ton `.env`. Jusqu'ici, c'était une
liste de blocage, et chaque bizarrerie du système de fichiers ou du parsing HTTP
devenait un contournement à corriger. Vite 8.4 permet d'inverser la logique.

:::compare
::bad
```ts vite.config.ts
// Défaut actuel, liste de blocage : tout le workspace est servi,
// sauf les fichiers que Vite sait sensibles.
export default defineConfig({ server: { fs: { strict: true } } });
```
::
::good
```ts vite.config.ts
// Opt-in depuis Vite 8.4, liste d'autorisation : seuls les fichiers
// référencés depuis le point d'entrée sont servis.
export default defineConfig({
  server: { fs: { strict: "extended", allow: [] } },
});
```
::
:::

**Pourquoi.** Une liste de blocage doit prévoir chaque attaque. Une liste
d'autorisation ne sert que ce que ton graphe de modules référence, par `import` ou
par un `url()` en CSS, de proche en proche ; `"extended"` étend le contrôle aux
modules chargés par les plugins. L'équipe Vite dit vouloir en faire le défaut de
la prochaine majeure. Active-la maintenant : si un plugin référence un fichier
autrement que par un import, tu obtiens un 403 en dev, et son auteur peut déclarer
le module avec `this.environment.addSafeModule`.

**Lightning CSS comme transformateur par défaut, peut-être.** Aujourd'hui,
Lightning CSS minifie déjà le CSS des builds de production, mais le traitement
lui-même passe par PostCSS. L'équipe Vite « réfléchit » à changer ce défaut à la
prochaine majeure : une intention, pas une décision.

:::callout{type="warn"}
**Expérimental en novembre 2026.** L'option `css.transformer: "lightningcss"`
existe déjà, mais reste expérimentale. Essaie-la sur une branche et fais
l'inventaire de tes plugins PostCSS. Les CSS Modules se règlent alors dans
`css.lightningcss.cssModules`, plus dans `css.modules`.
:::

## tsrs : TypeScript porté en Rust

TypeScript 7 a rendu le compilateur natif en le portant en **Go**
(`/typescript/next/typescript-7`). Le typecheck restait pourtant le maillon le
plus lent de la chaîne. Le 20 octobre 2026, Cloudflare et VoidZero ont annoncé
**tsrs** : un portage Rust du compilateur TypeScript, mené avec Max Schwenk
(Owner.com) et incubé dans le projet Oxc.

- **Ce n'est pas un fork.** L'équipe TypeScript garde la main sur le langage.
  tsrs suit, en remplacement direct du compilateur de TS 7, et vise 100 % de
  conformité avec la 7.1. Ses optimisations remontent vers le code Go.
- **Les chiffres.** Jusqu'à **8× plus rapide** et environ 70 % de mémoire en moins
  que TypeScript 7.0, à nombre égal de workers de vérification.
- **Rust ne sert pas qu'à la vitesse.** Compilé en WebAssembly, il n'embarque pas
  de ramasse-miettes : toute la chaîne TypeScript peut tourner en bac à sable,
  dans un Worker ou dans le navigateur.

```bash
npm install -D tsrs
npx tsrs --noEmit   # vérifie le projet, comme tsc --noEmit
```

Première intégration : depuis le 17 novembre 2026, Oxlint accepte tsrs à la place
de tsgolint pour le lint typé (voir `/tooling/medior/oxlint-oxfmt`). C'est la
réponse au « goulot typecheck » décrit dans `/tooling/senior/rust-toolchain`.

:::callout{type="warn"}
**Bêta en novembre 2026.** Le paquet npm `tsrs` n'existe qu'en préversion
(`7.1.0-beta.tsrs5` au 23 novembre), calée sur un TypeScript 7.1 lui-même en bêta
(`/typescript/next/typescript-7-1`). L'annonce reconnaît des écarts avec le
compilateur officiel, comme l'ordre d'affichage des diagnostics. Garde `tsc` comme
juge en CI ; fais tourner tsrs à côté, dans un job non bloquant, et compare.
:::

## Gestionnaires de paquets : Rust et sécurité par défaut

**pnpm 12** est une réécriture de pnpm en Rust, et elle est **stable** : 12.0.0
publiée le 26 août 2026, tag npm `latest` sur la ligne 12 en novembre. C'est un
exécutable natif : installé par le script autonome, il tourne sans Node. La
montée de version ne doit pas ressembler à une migration : mêmes commandes, mêmes
réglages, même format de lockfile que pnpm 11.

```bash
pnpm self-update   # depuis pnpm 11.10.0 ou plus récent
pnpm peers check   # remplace « pnpm install --resolution-only », supprimé
```

Les différences qui comptent :

- **Deux syntaxes refusées** : `--resolution-only` et `--frozen-lockfile false`
  (utilise `--no-frozen-lockfile`). Cherche-les dans tes scripts de CI.
- **Une clé inconnue dans `pnpm-workspace.yaml` est signalée.** Avant, une faute
  de frappe sur `minimumReleaseAge` désactivait la règle en silence.
- **`node` suit le projet.** Un `node`, `deno` ou `bun` installé globalement par
  pnpm exécute la version épinglée par le projet courant (`devEngines.runtime`).

**npm 12** (8 juillet 2026) bloque par défaut les scripts d'installation des
dépendances et refuse les sources git ou distantes : le détail est dans
`/tooling/medior/npm-supply-chain-security`. Ce qui reste à venir, c'est sa
diffusion. En novembre 2026, Node 26 LTS embarque toujours npm 11, alors que
l'alpha de Node 27 embarque npm 12. Si cela tient jusqu'en avril, le défaut sûr
deviendra celui de toute installation neuve. N'attends pas :
`npm install -g npm@12`, puis remplis `allowScripts`.

## Node 27 : une majeure par an

Node 26 est la dernière ligne de l'ancien modèle (deux majeures par an, seules les
paires en LTS). À partir de la 27 : **une majeure par an**, en avril, et chacune
devient LTS en octobre, pour 30 mois. Le numéro suit l'année (27 en 2027, 28 en
2028). Le rôle de test des versions impaires passe à un **canal alpha**, d'octobre
à mars. Pour Node 27 : alpha ouverte fin octobre 2026, 27.0.0 prévue le 22 avril
2027, LTS le 20 octobre 2027, fin de vie en avril 2030.

Si tu montes de LTS en LTS, presque rien ne change, sinon la numérotation
(`/tooling/senior/node-runtimes`). Le changement vise les **auteurs de
bibliothèques** : les changements cassants sont permis pendant l'alpha. Si tu ne
testes que les LTS, tu découvres la casse en même temps que tes utilisateurs.
Ajoute un job de CI facultatif sur l'alpha, dont les binaires sont publiés sur
nodejs.org/dist.

:::callout{type="warn"}
**Alpha en novembre 2026.** Les alphas sont signées, taguées et testées avec
CITGM, contrairement aux nightlies. Mais l'API peut changer de l'une à l'autre et
leur rythme n'est pas fixe (`v27.0.0-alpha.0.2.0` au 25 novembre). Jamais en
production. Le calendrier n'est pas définitif : la source de vérité est le
`schedule.json` du dépôt nodejs/Release.
:::

## Un outillage pensé pour les agents

Le fil rouge de cette fin d'année : l'utilisateur d'une chaîne d'outils est de
plus en plus souvent un agent de code, qui relance lint, tests et typecheck en
boucle (`/ia/medior/agentic-coding-workflow`). Il lui faut des vérifications
rapides, des commandes sans interface et des outils qui tiennent dans un bac à
sable. pnpm 12, par exemple, crée son store dans le projet quand le bac à sable de
l'agent n'autorise l'écriture que là.

**Storybook 11** en fait son axe principal : tes composants, tes stories et ta
doc sont le contexte qui manque à un agent pour ne pas réinventer un bouton qui
existe déjà.

- Des **skills officielles** (`component-docs`, `write-stories`, `test-stories`,
  `ui-review`), installées à la montée de version. MCP reste pris en charge
  (`/ia/senior/mcp`), mais les skills n'exigent pas d'instance Storybook lancée.
- Une CLI **sans interface**, `storybook tools`, qui se passe du serveur de dev
  quand le navigateur n'est pas nécessaire.
- **CSF 4**, un format de stories typé de bout en bout. CSF 3 reste pris en
  charge et des codemods font la conversion.

```bash
npx storybook@next tools docs list    # composants et docs, avec leurs identifiants
npx storybook@next tools docs show --id "your-component-id"
```

:::callout{type="warn"}
**Release Candidate en novembre 2026.** Storybook 11 est en bêta depuis début
novembre et en RC depuis le 24 : `11.0.0-rc.1` sous le tag npm `next`, alors que
`latest` reste la 10.6. La sortie est visée pour décembre. Essaie
`npx storybook@next upgrade` sur une branche, pas sur `main`.
:::

**Vite+** suit la même pente depuis sa 1.0 (`/tooling/senior/vite-plus`) : une
mineure presque chaque semaine (1.8.0 le 24 novembre 2026), `vpx` qui exécute
directement un fichier TypeScript, le backend tsrs derrière `vp check` depuis la
1.7. En revanche, ce que l'annonce de la 1.0 remettait à plus tard l'est
toujours : le **cache distant** et `vp release` n'apparaissent pas dans la
documentation de la 1.8. Ne bâtis pas la CI d'un monorepo dessus.

## Quoi adopter maintenant, quoi seulement surveiller

| Sujet | Statut en novembre 2026 | Ce que tu fais |
| --- | --- | --- |
| pnpm 12 | Stable | Migrer, après avoir cherché `--resolution-only` en CI |
| npm 12 | Stable, absent de Node 24 et 26 | L'installer, remplir `allowScripts` |
| `server.fs` en liste d'autorisation | Opt-in (Vite 8.4) | L'activer, corriger les 403 |
| Lightning CSS comme transformateur | Expérimental, défaut envisagé | Tester sur une branche |
| Bundled dev mode | Expérimental | Tester si l'app est très grosse |
| tsrs | Bêta | Job non bloquant, à côté de `tsc` |
| Node 27 | Alpha, 27.0.0 en avril 2027 | Bibliothèques : CI sur l'alpha |
| Storybook 11 | Release Candidate | Essayer `@next` sur une branche |
| Vite+ : cache distant, `vp release` | Feuille de route | Attendre |

## À retenir

L'outillage de 2027 ne te demande pas de réécrire ta config : il te demande de
**revoir tes défauts**. Ce qui est stable s'adopte tout de suite. Ce qui est
expérimental se teste sur une branche, à côté de l'outil de référence et jamais à
sa place. Ce qui n'est qu'annoncé ne doit porter aucune décision d'architecture.

:::cheatsheet
- title: "Bundled dev mode"
  desc: "experimental.bundledDev: true. Rolldown bundle aussi en dev : gros gains sur les très grosses apps. Expérimental ; SSR hautement expérimental (Vite 8.4)."
- title: "Défauts de la prochaine majeure de Vite"
  desc: "server.fs en liste d'autorisation (strict: 'extended' + allow: []) : annoncé. Lightning CSS comme transformateur par défaut : seulement envisagé."
- title: "tsrs"
  desc: "TypeScript porté en Rust avec l'équipe TS : jusqu'à 8× TS 7.0, vise la conformité 7.1. Bêta : à côté de tsc, pas à sa place."
- title: "pnpm 12 / npm 12"
  desc: "pnpm 12 : réécriture Rust stable, --resolution-only supprimé. npm 12 : scripts de dépendances bloqués, mais Node 26 livre encore npm 11."
- title: "Node 27"
  desc: "Une majeure par an (avril), toutes LTS (octobre), canal alpha d'octobre à mars. 27.0.0 prévue le 22 avril 2027."
- title: "Outils pour agents"
  desc: "Storybook 11 (RC) : skills, CLI storybook tools, CSF 4. Vite+ : cache distant et vp release encore sur la feuille de route."
:::
