---
title: "L'environnement de développement"
slug: "dev-environment"
framework: "tooling"
level: "junior"
order: 3
duration: 14
prerequisites: ["package-managers"]
updated: 2026-05-23
seoTitle: "Env de dev : Node LTS, nvm, .env, EditorConfig (Junior)"
seoDescription: "Maîtriser son environnement : versions de Node avec nvm/fnm/Volta, .editorconfig, variables d'env, TypeScript, et fin du works on my machine."
ogVariant: "sage"
related:
  - { framework: "tooling", slug: "vite" }
  - { framework: "tooling", slug: "package-managers" }
---

## Reproduire la même machine pour tout le monde

Un environnement de dev sain a un seul objectif : que ton poste, celui de tes
collègues et la CI se comportent **identiquement**. Le fléau qu'on combat ici
porte un nom — le « **works on my machine** » — et il vient presque toujours de
trois sources : une version de Node différente, une config d'éditeur différente,
ou des variables d'environnement différentes.

## Node LTS et gestion de versions

Node sort une version **LTS** (Long Term Support) paire tous les ans ; c'est
celle qu'on vise en production pour sa stabilité. Mais tu jongles souvent entre
plusieurs projets exigeant des versions différentes. D'où les **gestionnaires de
versions** : **nvm**, **fnm** (rapide, écrit en Rust) ou **Volta**.

Le fichier `.nvmrc` (ou le champ `volta`) déclare la version attendue **dans le
dépôt** :

```bash .nvmrc
22
```

```json package.json
{
  "engines": {
    "node": ">=22 <23"
  }
}
```

:::callout{type="tip"}
`engines` ne **force** rien par défaut — npm l'ignore sauf si tu actives
`engine-strict`. C'est une **déclaration d'intention** lisible par les humains,
la CI et certains outils. Combine-le toujours avec un `.nvmrc` et un
`fnm use`/`volta install` pour qu'il soit réellement appliqué.
:::

:::compare
::bad
```bash
# Chacun lance le projet avec le Node qu'il avait sous la main
node -v   # toi : v22 ; collègue : v18
# build vert chez toi, rouge chez lui
```
::
::good
```bash
# .nvmrc présent + dépôt configuré
fnm use            # bascule sur la version du .nvmrc
npm ci             # même Node, même lockfile -> même résultat
```
::
:::

**Pourquoi.** Node évolue : une API ajoutée en v22 n'existe pas en v18, et
certaines syntaxes ou comportements de `node_modules` diffèrent d'une majeure à
l'autre. Si chacun exécute le code sur un runtime différent, vous ne testez plus
le même programme. Le `.nvmrc` versionné dans Git transforme « la bonne version
de Node » en une donnée du projet, pas un savoir tribal. Un `fnm use` ou un shell
auto-switch l'applique en une commande, et la CI lit le même fichier.

## EditorConfig : la mise en forme de base, partout

`.editorconfig` est un standard reconnu par quasiment tous les éditeurs. Il fixe
les règles **avant** même que le formateur n'intervienne : fin de ligne,
indentation, encodage.

```ini .editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

Sans lui, un poste sous Windows écrira des fins de ligne `CRLF` et un autre sous
macOS `LF` : chaque sauvegarde produit alors un **diff Git énorme** sur des
fichiers que personne n'a vraiment modifiés. `end_of_line = lf` tranche le débat.

## Variables d'environnement

On ne code **jamais** une URL d'API ou une clé en dur. Ces valeurs changent
entre local, préproduction et production, et certaines sont secrètes. On les
range dans un fichier `.env`.

```bash .env
VITE_API_URL=https://api.local.test
VITE_FEATURE_FLAG=true
```

Côté Vite, on les lit via `import.meta.env`, et **seules** les variables
préfixées par `VITE_` sont exposées au code client :

```ts
const apiUrl = import.meta.env.VITE_API_URL;
```

:::callout{type="warn"}
Le préfixe `VITE_` n'est pas décoratif : il existe précisément pour t'**empêcher**
d'exposer par accident une variable secrète (un token serveur) dans le bundle
envoyé au navigateur. Tout ce qui finit dans `import.meta.env` côté client est
**public**. `.env` (surtout `.env.local`) va dans `.gitignore` ; on commite un
`.env.example` vide comme documentation.
:::

## TypeScript dès le développement

TypeScript ajoute un système de types **vérifié à la compilation**. En dev, ton
éditeur et `tsc --noEmit` te signalent une faute de frappe ou un mauvais type
**avant** l'exécution, là où JavaScript ne crierait qu'au runtime, en prod, chez
l'utilisateur.

Important : le bundler (Vite via Oxc) **transpile** le TS très vite mais
**n'effectue pas** le contrôle de types — il se contente de retirer les
annotations. Garde donc un `tsc --noEmit` (ou ton éditeur) comme garde-fou réel.

## Mémo

:::cheatsheet
- title: ".nvmrc / engines"
  desc: "Verrouille la version de Node attendue par le projet."
- title: "fnm / Volta"
  desc: "Basculent automatiquement vers la bonne version de Node."
- title: ".editorconfig"
  desc: "Indentation, encodage et fins de ligne identiques partout."
- title: ".env + VITE_"
  desc: "Config par environnement ; seul VITE_ est exposé au client."
- title: "tsc --noEmit"
  desc: "Vérifie les types ; le bundler ne le fait pas pour toi."
:::

Mets ces fichiers en place dès le premier commit d'un projet. Cinq minutes de
configuration suppriment des heures de débogage de différences fantômes entre
machines.
