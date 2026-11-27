---
title: "Supply chain npm : installer sans se faire piéger"
slug: "npm-supply-chain-security"
framework: "tooling"
level: "medior"
order: 7
duration: 15
prerequisites: ["package-managers"]
updated: 2026-11-27
seoTitle: "Supply chain npm — scripts bloqués, délai de publication, lockfile et CI"
seoDescription: "Comprendre les défenses de npm 12 et pnpm contre les paquets piégés : allowScripts et allowBuilds, minimumReleaseAge, sources git refusées, CI sans secrets. Et quoi faire le jour où une dépendance est compromise."
ogVariant: "gold"
related:
  - { framework: "tooling", slug: "package-managers" }
  - { framework: "tooling", slug: "ci-cd" }
  - { framework: "ia", slug: "ai-assisted-coding" }
  - { framework: "web", slug: "security" }
---

`npm install` n'est pas un simple téléchargement : c'est l'exécution, sur ta
machine et dans ta CI, de code écrit par des centaines d'inconnus. Depuis
septembre 2025, des attaquants en profitent à grande échelle : ils volent un accès
de publication, poussent une version piégée d'un paquet légitime, et laissent
l'installation faire le reste. Les gestionnaires de paquets ont répondu en
changeant leurs **défauts**. Conséquence : un `install` qui passait hier échoue
aujourd'hui, et le réflexe est de tout désactiver. Cet article t'explique ce que
chaque garde-fou bloque, pour que tu le règles au lieu de le couper.

## Anatomie d'une attaque

Les incidents récents suivent le même scénario en quatre temps.

1. **Un accès de publication est volé** : un token npm, un compte de mainteneur,
   ou le pipeline de release lui-même.
2. **Une version piégée est publiée** sous le nom d'un paquet légitime, souvent un
   simple patch. Ton range `^1.2.3` l'accepte sans broncher.
3. **Le code s'exécute à l'installation**, via un script de cycle de vie
   (`preinstall`, `postinstall`, `prepare`) : avant tes tests, avant toute revue.
4. **Le ver se propage.** Le script collecte tokens, clés cloud et variables
   d'environnement, puis republie, piégés, les paquets de sa victime.

Trois cas réels, trois variantes :

- **Shai-Hulud (septembre 2025).** GitHub est alerté le 14 septembre : un ver
  auto-répliquant, entré par des comptes de mainteneurs compromis, injecte des
  scripts `postinstall` malveillants dans des paquets populaires.
- **TanStack (11 mai 2026).** 84 versions malveillantes sur 42 paquets
  `@tanstack/*`, publiées en six minutes. Aucun token npm volé : une PR venue d'un
  fork empoisonne le cache GitHub Actions, puis le code injecté extrait le jeton
  OIDC du runner de release et publie à sa place. La charge arrive par une
  `optionalDependencies` pointant vers un commit git, lancée par son `prepare`.
- **ChainDrop (août 2026).** Microsoft décrit le 4 août plus de 400 paquets
  touchés, d'éditeurs sans lien entre eux. Un hook `preinstall` lance la charge,
  qui s'insère dans les paquets de sa victime, incrémente le patch et republie.

Deux constantes : le code malveillant s'exécute **pendant l'install**, et la
fenêtre est **courte** (pour TanStack, détection publique en 20 à 26 minutes).
D'où deux défenses : n'exécuter aucun script inconnu, attendre avant d'installer.

## Scripts d'installation : bloqués par défaut

Un paquet peut déclarer des scripts que le gestionnaire lance pendant
l'installation. L'usage légitime existe : esbuild met en place son binaire natif
avec un `postinstall`. C'est aussi la porte d'entrée de presque toutes ces attaques.

**npm 12** (8 juillet 2026) inverse donc la logique : aucun script de dépendance
ne tourne sans entrée correspondante dans le champ `allowScripts` du
`package.json` racine. L'install n'échoue pas ; il saute ces scripts et liste à la
fin les paquets concernés. À toi de trancher.

```bash
npm install-scripts ls               # qui attend une décision ?
npm install-scripts approve esbuild  # autorise la version installée
npm install-scripts deny core-js     # refus explicite, conservé
npm rebuild                          # exécute les scripts tout juste approuvés
```

```json package.json
{
  "allowScripts": {
    "esbuild@0.28.2": true,
    "core-js": false
  }
}
```

L'approbation est **épinglée à la version** que tu as relue : à la prochaine
montée de version d'esbuild, son script est de nouveau bloqué jusqu'à ce que tu
réapprouves. C'est le but, pas un défaut d'ergonomie. L'option
`strict-allow-scripts` transforme l'avertissement en erreur : le bon réglage en CI.

:::callout{type="warn"}
**Vérifie `npm -v`.** En novembre 2026, les dernières versions de Node 24 et de
Node 26 (LTS) embarquent encore npm 11, où les scripts de dépendances s'exécutent
par défaut. Le blocage n'arrive qu'après un `npm install -g npm@12`.
:::

**pnpm** applique la même idée avec `allowBuilds`, dans `pnpm-workspace.yaml`. Il
est plus strict : depuis pnpm 11 (avril 2026), `strictDepBuilds` est activé par
défaut et l'install **échoue** (`ERR_PNPM_IGNORED_BUILDS`) tant qu'un script n'a
pas reçu de décision. `pnpm approve-builds` pose la question paquet par paquet.

:::compare
::bad
```yaml pnpm-workspace.yaml
# « L'install échoue, je coupe tout »
dangerouslyAllowAllBuilds: true
minimumReleaseAge: 0
```
::
::good
```yaml pnpm-workspace.yaml
# Une décision par paquet, relue en PR
allowBuilds:
  esbuild: true
  core-js: false
```
::
:::

**Pourquoi.** Une liste d'autorisations fige l'état connu : un paquet qui n'avait
pas de script hier ne peut pas en exécuter un demain parce qu'une version
compromise vient de sortir. `dangerouslyAllowAllBuilds` autorise au contraire
toutes les dépendances, transitives comprises, présentes **et futures**. Idée
reçue à écarter au passage : bloquer les scripts ne rend pas un paquet piégé
inoffensif, son code s'exécute quand même dès que ton build l'importe.

## Délai minimal de publication

Puisqu'une version malveillante est repérée en quelques heures, la parade la plus
rentable est d'**attendre** : refuser toute version publiée depuis moins de N
jours. Quand elle devient éligible, elle a déjà été retirée du registre.

```yaml pnpm-workspace.yaml
minimumReleaseAge: 4320 # en minutes : 3 jours
```

```text .npmrc
min-release-age=3
```

Trois pièges se cachent derrière ces deux lignes.

- **L'unité diffère.** pnpm compte en **minutes**, npm en **jours**. Recopié tel
  quel, un `min-release-age=1440` écarte toute version de moins de quatre ans.
- **Le défaut de pnpm est souple.** Depuis pnpm 11, `minimumReleaseAge` vaut 1440
  (un jour) sans rien configurer, mais si aucune version du range n'a l'âge
  requis, pnpm en installe une trop récente. Dès que tu écris la valeur toi-même,
  `minimumReleaseAgeStrict` s'active et la résolution échoue à la place.
- **npm n'a aucun délai par défaut.** `min-release-age` existe depuis npm 11.10,
  mais reste à `null` tant que tu ne le règles pas.

Le délai retarde aussi les **correctifs de sécurité** : un `npm audit fix` bloqué
par la fenêtre garde la version vulnérable, avertit et sort en erreur. La réponse
n'est pas de supprimer le délai, mais d'exclure le paquet concerné
(`min-release-age-exclude` pour npm, `minimumReleaseAgeExclude` pour pnpm).

Les robots de mise à jour suivent la même logique. Dependabot applique par défaut
un **cooldown de 3 jours** aux mises à jour de version (pas à celles de sécurité),
réglable avec `cooldown.default-days` ou par niveau semver. Renovate propose
l'équivalent avec `"minimumReleaseAge": "3 days"` dans une `packageRules`.

## Lockfile et sources

Le délai protège les **mises à jour**. Au quotidien, c'est le lockfile qui te
protège : tant que tu installes avec `npm ci` ou `pnpm install --frozen-lockfile`,
une version publiée ce matin ne peut pas entrer dans ton arbre (mécanisme décrit
dans l'article **package-managers**, Outils, niveau junior). Corollaire : relis le
diff du lockfile en PR comme du code, c'est par lui que tout arrive.

Reste ce qui contourne le registre. Une dépendance peut pointer vers un dépôt git
ou une URL de tarball : aucun retrait côté registre ne t'en protège, et c'est
exactement le chemin pris par la charge TanStack.

- **npm 12** : `allow-git` et `allow-remote` valent `none` par défaut. La valeur
  `root` n'accepte que les sources déclarées dans **ton** `package.json`.
- **pnpm** : `blockExoticSubdeps` (activé par défaut depuis pnpm 11) réserve ces
  sources à tes dépendances directes ; les transitives passent par le registre.

pnpm ajoute un contrôle de **régression de confiance**, désactivé par défaut. Avec
`trustPolicy: no-downgrade`, l'install échoue si une version offre moins de
garanties que les précédentes, par exemple un paquet publié jusque-là par un
*trusted publisher* et qui arrive soudain sans preuve d'origine. Garde en tête
qu'une preuve d'origine dit **d'où** vient un paquet, pas ce qu'il contient : les
versions TanStack piégées portaient l'identité du pipeline de release légitime.

## Durcir la CI

La CI est la cible idéale : elle installe sans surveillance et détient les
secrets. Le pipeline lui-même est traité dans l'article **ci-cd** (Outils, niveau
senior) ; voici seulement ce qui réduit le butin.

```yaml .github/workflows/ci.yml
permissions:
  contents: read # GITHUB_TOKEN en lecture seule
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version: 24
      - run: npm install -g npm@12
      - run: npm ci --strict-allow-scripts # aucun secrets.* dans ce job
```

- **Permissions minimales, actions épinglées par SHA.** Un jeton en lecture seule
  ne peut ni pousser de commit ni modifier un workflow ; un tag comme `v7` peut
  être déplacé vers un autre commit, pas un SHA.
- **Pas de secrets dans le job qui installe.** ChainDrop capturait toutes les
  variables d'environnement du processus. Déploie depuis un job séparé.
- **Pas de token npm longue durée.** Pour publier, le *trusted publishing* (OIDC)
  remplace le token stocké par un jeton éphémère, propre au workflow. Accorde
  `id-token: write` au seul job de publication.
- **Jamais de code de fork dans `pull_request_target`.** C'est la première marche
  de l'attaque TanStack. Et `permissions: contents: read` n'empêche pas d'écrire
  dans le cache : un job de release ne restaure pas un cache qu'une PR alimente.

## Réagir à un incident

Un avis tombe : telle version de tel paquet est compromise. Dans l'ordre.

1. **Cherche la version dans le lockfile**, transitives comprises : `npm ls
   <paquet>` ou `pnpm why <paquet>` disent quelle version est installée et qui la
   tire. Regarde aussi l'historique git du lockfile et les caches de CI.
2. **Si elle a été installée avec les scripts actifs**, considère la machine ou le
   runner comme compromis.
3. **Fais tourner les secrets depuis une machine saine** : tokens npm et GitHub,
   clés cloud, clés SSH, secrets de CI.
4. **Purge les caches** (npm, CI) et reconstruis depuis un lockfile sain.

:::callout{type="warn"}
`npm audit` ne te sauvera pas ici. Il compare ton arbre à une base de
vulnérabilités **connues** : une version piégée publiée il y a une heure n'y
figure pas encore. `npm audit signatures` vérifie, lui, les signatures du
registre et les attestations de provenance, donc l'origine, pas l'innocuité.
:::

## À retenir

Les attaques de supply chain reposent sur deux leviers : du code qui s'exécute à
l'installation, et quelques heures d'avance sur la détection. npm 12 et pnpm
ferment les deux par défaut. Quand un install échoue, ne coupe pas la protection :
approuve le paquet précis, exclus la version précise. En CI : lockfile gelé, aucun
secret dans le job qui installe, et une rotation de secrets préparée d'avance.

:::cheatsheet
- title: "allowScripts / allowBuilds"
  desc: "Scripts de dépendances bloqués par défaut (npm 12, pnpm). Approuve paquet par paquet, jamais en bloc."
- title: "minimumReleaseAge / min-release-age"
  desc: "Écarte les versions trop récentes. Minutes pour pnpm, jours pour npm : écris la valeur toi-même."
- title: "allow-git / blockExoticSubdeps"
  desc: "Sources git et tarballs par URL refusées par défaut : elles échappent au registre."
- title: "npm ci / --frozen-lockfile"
  desc: "Le lockfile gelé empêche une version publiée ce matin d'entrer. Relis son diff en PR."
- title: "Incident"
  desc: "Chercher la version dans le lockfile, tourner les secrets depuis une machine saine, purger les caches."
:::
