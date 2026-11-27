---
title: "Vite+ : la toolchain unifiée de VoidZero"
slug: "vite-plus"
framework: "tooling"
level: "senior"
order: 4
duration: 14
prerequisites: ["vite", "monorepo"]
updated: 2026-11-27
seoTitle: "Vite+ (VoidZero) — une seule toolchain : Vite, Vitest, Rolldown, Oxc, tsdown"
seoDescription: "Vite+ regroupe la constellation VoidZero (Vite, Vitest, Rolldown, Oxlint, tsdown) derrière une CLI unique et cohérente. Ce qu'il apporte face à une toolchain assemblée à la main, le modèle OSS/commercial, et son statut fin 2026 : 1.0 stable sous MIT."
ogVariant: "sage"
related:
  - { framework: "tooling", slug: "vite" }
  - { framework: "tooling", slug: "oxlint-oxfmt" }
---

Une chaîne front moderne, ce n'est pas un outil : c'en est cinq ou six. Un dev
server, un bundler, un test runner, un linter, un formateur, un générateur de
types de bibliothèque — chacun avec son binaire, sa config, son rythme de release
et sa version à épingler. Tu passes un temps non nul à câbler ces pièces
ensemble, puis à les garder alignées quand l'une bouge. VoidZero — l'entreprise
fondée autour de Vite par son auteur, Evan You — parie sur l'inverse : une
toolchain **unifiée**, une seule CLI qui orchestre tout le stack derrière une
commande cohérente. C'est **Vite+**.

## Le problème : la toolchain assemblée à la main

Le coût caché d'une chaîne front, ce n'est pas chaque outil pris isolément :
c'est leur **assemblage**. Tu choisis Vite pour le dev, esbuild ou tsup pour la
lib, Vitest pour les tests, ESLint + Prettier pour la qualité. Quatre configs,
quatre matrices de versions, et surtout des **moteurs de bundling qui divergent**
entre les étapes. La classe de bugs « ça marche en dev, ça casse au build » vient
exactement de là : deux moteurs qui ne traitent pas ton TypeScript ou tes imports
à l'identique.

:::compare
::bad
```json
{
  "devDependencies": {
    "vite": "^8.0.0",
    "tsup": "^8.3.0",
    "vitest": "^3.2.0",
    "eslint": "^9.20.0",
    "prettier": "^3.4.0",
    "typescript": "^5.7.0"
  }
}
```
::
::good
```json
{
  "devDependencies": {
    "vite-plus": "^1.8.0"
  }
}
```
::
:::

À gauche, six outils à faire cohabiter : chaque montée de version majeure est un
test de régression sur les cinq autres. À droite, une seule dépendance qui expose
la CLI `vp` et garantit que les briques sont **testées ensemble** avant publication.

## Ce que Vite+ regroupe

Vite+ n'invente pas de nouveaux outils : il **empaquette la constellation
VoidZero** derrière une CLI unique et ajoute la couche qui manquait (runtime,
gestionnaire de paquets, task runner). Concrètement, `vp` orchestre :

- **Vite** (Vite 8) pour le dev server et le build applicatif, via **Rolldown**.
- **Vitest** pour les tests unitaires, transform via Oxc.
- **Oxlint** et **Oxfmt** pour le lint et le format, sur le socle Oxc.
- **tsdown** pour bundler une **bibliothèque** (types `.d.ts` inclus).
- **Vite Task**, un task runner avec cache, pour orchestrer un monorepo.
- La gestion du **runtime Node** (`vp env`) et du **gestionnaire de paquets**
  (`vp install` délègue à celui du projet).

```bash
vp create        # scaffolder un projet
vp install       # installer les dépendances (gestionnaire du projet)
vp dev           # dev server + HMR (Vite 8 / Rolldown)
vp check         # format + lint + typecheck en une passe
vp test          # tests (Vitest)
vp build         # build de prod (Rolldown)
vp pack          # bundler une lib (tsdown)
vp run <task>    # task runner avec cache (monorepo)
vp env           # gérer la version de Node
```

Ces neuf commandes couvrent le cycle local. S'y ajoute `vp migrate`, qui convertit
un projet existant vers Vite+.

:::callout{type="info"}
Le point structurant : un **seul moteur Rust** — Oxc pour le parsing/transform,
Rolldown pour le bundling — alimente le dev, le test, le lint, le format **et**
le build de lib. Là où une chaîne assemblée fait parser ton fichier par quatre
parsers différents, Vite+ le fait passer par la même pile de bout en bout.
:::

## Le pourquoi de l'unification

L'argument n'est pas « une commande plus courte ». Il est architectural.

**Un seul comportement de bundling, du dev à la lib.** Quand ton dev server, ton
build de prod et ton bundler de bibliothèque partagent Rolldown, ils traitent
tes imports, ton TypeScript et ton tree-shaking à l'identique. La faille « works
in dev only » se referme parce qu'il n'y a plus deux moteurs à réconcilier — il
n'y en a qu'un.

**Une config cohérente.** Une seule source de vérité décrit l'alias `@`, la cible
ES, les extensions résolues. Le linter, le bundler et le runner de test lisent la
même intention au lieu de la dupliquer dans quatre fichiers qui dérivent.

**Des mises à jour coordonnées.** VoidZero publie Vite, Vitest, Rolldown et Oxc
testés **ensemble**. Tu montes une version de `vite-plus`, pas six versions dont
tu dois vérifier la compatibilité croisée : le travail d'intégration passe de ta
charge à celle de l'éditeur du stack.

:::callout{type="tip"}
Le gain réel se mesure en **surface de maintenance**, pas en millisecondes. Tu
n'élimines pas six outils rapides pour un outil rapide : tu élimines les **six
frontières** entre eux (versions, configs, sémantiques divergentes). Sur un
monorepo à plusieurs équipes, c'est cette surface qui coûte, pas le wall-clock
d'un build isolé.
:::

## Le modèle OSS/commercial

Ce point demande de la précision, parce que le modèle a **changé** entre
l'annonce et aujourd'hui — et un choix senior se fait sur l'état réel, pas sur le
pitch d'origine.

Les briques de base — **Vite, Vitest, Rolldown, Oxc** — ont toujours été et
restent **open source sous licence MIT**, vendor-agnostic. Ça, ce n'est jamais
en jeu.

Vite+, lui, a d'abord été **annoncé comme un produit commercial** : source
disponible mais licence payante — gratuit pour les individus, l'open source et
les petites structures, tarif annuel pour les startups, sur devis pour
l'entreprise. La logique assumée : « capter une part de la valeur créée à
l'échelle pour les grandes organisations et la réinvestir dans les projets open
source qui font tourner Vite+ ». Un modèle de **financement de l'écosystème** :
les gros payent l'intégration et le support, ce qui finance Vite et consorts.

:::callout{type="warn"}
En juin 2026, **Cloudflare a acquis VoidZero** (l'équipe d'Evan You) et a engagé
un fonds indépendant pour l'écosystème Vite. Dans la foulée, Vite+ est passé
**pleinement open source sous MIT** : les paliers payants annoncés à l'origine ne
décrivent plus le modèle actuel. Si tu lis un article de 2025 sur « le produit
commercial Vite+ », il est daté. La 1.0 de septembre 2026 le confirme : Vite+ est
gratuit et MIT.
:::

Pour un architecte, la leçon n'est pas le prix : c'est la **question de fond**.
Qui finance le tooling que tu poses au centre de ta chaîne ? Le modèle « open
core payant » assumait cette dépendance financière ; l'acquisition par Cloudflare
la déplace vers un acteur d'infrastructure. Dans les deux cas le socle MIT te
protège d'un lock-in dur — mais la trajectoire de l'intégration, elle, dépend
d'un éditeur unique. Un paramètre à intégrer, pas un épouvantail.

## Statut fin 2026 : 1.0 stable

Sois exact sur ce qui est **disponible** aujourd'hui. Après une **beta** annoncée
le 2 juillet 2026, Vite+ **1.0** est sorti le 28 septembre 2026 : stable, sous
licence MIT. En novembre 2026, npm en est à la 1.8. L'annonce de la 1.0 parle de
près de deux millions de téléchargements hebdomadaires et de plus de 2 600 dépôts
publics qui en dépendent.

Depuis la beta, l'outillage autour de `vp` s'est étoffé : `vp migrate` gère aussi
les migrations depuis tsup, `vp hooks` installe les hooks Git et `vp staged` ne
vérifie que les fichiers indexés, et `setup-vp` existe pour GitLab CI/CD en plus
de l'action GitHub.

Le bon réflexe reste un **projet pilote** — un nouveau paquet du monorepo, ou un
service secondaire — sur lequel tu mesures le confort réel (`vp check`, `vp run`
avec cache) et les frictions (plugin ou règle manquante) avant de généraliser.
Sur une base existante, `vp migrate` affiche son plan avant de modifier les
fichiers : lis-le, et lis le guide de migration si le projet est en production.

:::callout{type="warn"}
Une 1.0 stable n'est pas un produit fini. L'annonce le dit elle-même : le cache
distant, `vp release` et `vp docs` sont encore sur la feuille de route. Et la
couverture (règles de lint, cas de build de lib) n'égale pas toujours un outil
dédié mûr. Évalue-le sur un projet réel avant d'en faire le socle d'un monorepo
de production — ne le pose pas par principe parce qu'il vient de l'auteur de
Vite.
:::

## La décision senior : intégrer ou assembler

C'est un arbitrage **build vs buy** classique, transposé au tooling.

**Assembler à la main** te donne le contrôle fin : tu choisis chaque outil, tu
remplaces une brique sans toucher aux autres, tu n'es lié à personne. Le prix : tu
**portes** l'intégration — versions, configs, divergences de moteurs — et cette
charge grandit avec le nombre d'équipes et de paquets.

**Adopter une toolchain intégrée** externalise cette intégration vers l'éditeur du
stack. Le prix : une dépendance à un fournisseur unique et un **risque de
lock-in** sur ses conventions. Le socle MIT l'amortit — tu peux revenir à Vite +
Vitest + Oxlint nus, puisque Vite+ les **enveloppe** plutôt qu'il ne les remplace
— mais la sortie a un coût.

:::callout{type="tip"}
Le critère qui tranche : **où est ta douleur aujourd'hui ?** Si elle est dans la
maintenance de six configs qui dérivent sur un gros monorepo, une toolchain
intégrée attaque exactement ce coût. Si ta chaîne actuelle est stable et que tu
as des besoins pointus (plugins ESLint type-aware, bundler de lib spécifique),
le gain d'intégration ne justifie pas d'échanger un contrôle qui te sert.
:::

Pour un **nouveau** monorepo fin 2026, Vite+ est un point de départ défendable :
1.0 stable, pas de dette de config à migrer, tu démarres sur une pile cohérente.
Pour une base **existante** qui tourne, `vp migrate` abaisse le coût d'entrée,
mais la question reste moins « est-ce mieux » que « le delta de maintenance
justifie-t-il la migration ».

## À retenir

Vite+ n'ajoute pas un outil à ta chaîne : il **supprime les frontières** entre
ceux que tu as déjà. Une CLI, `vp`, un seul moteur Rust (Oxc/Rolldown) du dev au
build de lib, des versions testées ensemble. Le socle — Vite, Vitest, Rolldown,
Oxc — reste MIT ; Vite+ lui-même, d'abord annoncé comme produit commercial, est
devenu open source MIT après l'acquisition de VoidZero par Cloudflare. Statut fin
2026 : **1.0 stable** depuis le 28 septembre, avec `vp migrate` pour l'existant ;
le cache distant et `vp release` restent à venir. La décision reste un arbitrage
build vs buy : intègre quand ta douleur est la maintenance de l'assemblage ;
assemble quand le contrôle fin te sert plus qu'il ne te coûte.

:::cheatsheet
- title: "vp"
  desc: "CLI unique : install, dev, test, build, lint, format, task runner, version de Node."
- title: "Un seul moteur"
  desc: "Oxc (parse/transform) + Rolldown (bundle) du dev au build de lib. Fini le 'works in dev only'."
- title: "vp check"
  desc: "Lint (Oxlint) + format (Oxfmt) + typecheck en une passe."
- title: "vp pack"
  desc: "Bundler une bibliothèque via tsdown, types .d.ts inclus."
- title: "vp run"
  desc: "Task runner avec cache pour orchestrer un monorepo."
- title: "vp migrate"
  desc: "Convertit un projet existant (tsup compris). Affiche son plan avant d'écrire."
- title: "Modèle"
  desc: "Briques MIT (Vite, Vitest, Rolldown, Oxc). Vite+ annoncé commercial, désormais MIT après rachat par Cloudflare."
- title: "Statut 2026"
  desc: "1.0 stable depuis le 28 septembre 2026, MIT. Cache distant et vp release encore à venir."
- title: "Build vs buy"
  desc: "Intègre si ta douleur est la maintenance de l'assemblage ; assemble si le contrôle fin te sert."
:::
