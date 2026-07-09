---
title: "Le design system comme un produit"
slug: "design-system-produit"
framework: "architecture"
level: "senior"
order: 6
duration: 16
prerequisites: ["hexagonal-clean"]
updated: 2026-07-09
seoTitle: "Design system as a product — tokens, gouvernance, versioning et adoption"
seoDescription: "Un design system échoue rarement sur la technique et souvent sur le produit : gouvernance, versioning, adoption, contribution. Traiter ses consommateurs comme des clients, structurer les tokens en couches, et mesurer l'adoption plutôt que le nombre de composants."
ogVariant: "crimson"
related:
  - { framework: "architecture", slug: "hexagonal-clean" }
  - { framework: "css", slug: "custom-properties" }
---

La plupart des design systems ne meurent pas d'un problème technique. Un bouton, un menu, un champ de formulaire accessible : on sait faire, c'est du métier connu. Ils meurent d'un problème de **produit**. Personne ne les adopte, les équipes divergent, chacune réécrit son `<Button>` « juste un peu différent », et la maintenance retombe sur trois personnes débordées qui répondent à des tickets que plus personne ne lit. Le jour où tu arrêtes de voir ton DS comme une **bibliothèque de composants** et où tu le traites comme un **produit interne** avec des clients, une roadmap et un support, tout change. Cet article parle de cette bascule, pas de comment coder un accordéon.

## Le produit, pas la bibliothèque

Une bibliothèque, tu la publies et tu espères. Un produit, tu le pilotes en fonction de gens réels qui l'utilisent. Les équipes qui consomment ton DS — feature teams, apps internes, marketing — ne sont pas des « utilisateurs » abstraits : ce sont tes **clients**. Et un client, ça se garde ou ça part ailleurs (ici, « ailleurs » = réécrire à la main).

Ce recadrage a une conséquence directe sur la métrique. Le nombre de composants livrés ne dit **rien** sur la santé du système. Un DS de 80 composants dont 12 sont réellement utilisés est un échec plus coûteux qu'un DS de 20 composants adoptés partout. La bonne question n'est pas *« combien j'ai livré ? »* mais *« qui utilise quoi, et pourquoi les autres ne l'utilisent pas ? »*.

:::callout{type="tip"}
Traite ton DS comme un produit SaaS interne : il a une **roadmap** visible, un **canal de support** (Slack, issues), une **doc** qui est le vrai point d'entrée, et une **relation client** continue. Si tu n'as pas de doc utilisable, tu n'as pas de produit — tu as un dépôt Git que personne n'ose ouvrir.
:::

La doc n'est pas un livrable annexe : c'est **l'interface principale** de ton produit. La majorité de tes clients ne liront jamais ton code source ; ils liront la page du composant, copieront l'exemple, et partiront. Si cet exemple est faux ou absent, tu génères de la divergence toi-même.

## Les design tokens en couches

Le cœur d'un DS durable, ce ne sont pas les composants, ce sont les **tokens**. Et un système de tokens qui tient dans le temps se structure en **trois couches**, avec une indirection assumée à chaque niveau.

**1. Primitifs** — la palette brute, sans aucune intention. `--blue-600`, `--gray-900`, `--space-4`. Ce sont des valeurs, elles ne veulent rien dire d'autre qu'elles-mêmes.

**2. Sémantiques** — une **intention**, pas une couleur. `--color-action`, `--color-text`, `--space-md`. Cette couche fait le pont entre « ce que ça vaut » et « à quoi ça sert ».

**3. Composant** — consommés par les composants, qui ne touchent **jamais** un primitif directement.

```css
/* 1. Primitifs : des valeurs, aucune intention */
:root {
  --blue-500: #3b82f6;
  --blue-600: #2563eb;
  --gray-50: #f9fafb;
  --gray-900: #111827;
  --space-4: 16px;
}

/* 2. Sémantiques : une intention, résolue selon le contexte */
:root {
  --color-action: var(--blue-600);
  --color-text: var(--gray-900);
  --color-surface: var(--gray-50);
  --space-md: var(--space-4);
}
[data-theme="dark"] {
  --color-action: var(--blue-500);
  --color-text: var(--gray-50);
  --color-surface: var(--gray-900);
}

/* 3. Composant : consomme le sémantique, jamais le primitif */
.button {
  background: var(--color-action);
  color: var(--color-surface);
  padding: var(--space-md);
}
```

**Pourquoi cette indirection ?** Parce qu'elle te permet de rebrancher une marque, un thème ou le dark mode **sans réécrire un seul composant**. Le dark mode ne redéfinit que la couche sémantique ; le `.button` ne sait même pas que le thème a changé. Une marque secondaire ? Tu réassignes `--color-action` sur d'autres primitifs. Le composant reste stable. C'est exactement la mécanique des [custom properties](/css/senior/custom-properties) : la cascade résout l'indirection à l'exécution, sans build.

Côté outillage, la source de vérité n'est pas du CSS écrit à la main : c'est un format neutre, idéalement le **DTCG** (*Design Tokens Community Group*), qu'un outil comme **Style Dictionary** transforme en cibles multiples.

```json
// tokens/color.tokens.json — format DTCG, neutre et versionnable
{
  "color": {
    "action": { "$type": "color", "$value": "{blue.600}" },
    "text":   { "$type": "color", "$value": "{gray.900}" }
  }
}
```

Un seul fichier de tokens génère le CSS pour le web, un fichier TS typé, et les cibles natives si tu en as. La marque et le design pilotent la source ; le code est dérivé. C'est ça, découpler le design du rendu.

## Gouvernance et contribution

Deux modèles de gouvernance existent, et le choix conditionne la survie du produit.

Le modèle **centralisé** : une équipe DS produit tout, les consommateurs demandent. Simple, cohérent, mais il devient vite un **goulot d'étranglement**. Quand une feature team attend trois semaines un `<DatePicker>`, elle en code un elle-même. Tu viens de fabriquer de la divergence par lenteur.

Le modèle **fédéré** : les équipes **contribuent**, les mainteneurs **revoient**. C'est le seul qui passe à l'échelle, à condition d'avoir un processus explicite. Sans processus, le fédéré produit l'anarchie ; avec un processus clair, il produit du débit.

:::callout{type="info"}
Un processus d'ajout de composant tient en quatre étapes visibles de tous :

1. **Besoin** — une équipe ouvre une issue : le cas d'usage, pas la solution.
2. **Tri** — les mainteneurs tranchent : dans le DS, dans un « lab » incubé, ou hors scope.
3. **Contribution** — l'équipe propose, avec tokens, a11y, doc et tests, sur un gabarit fourni.
4. **Revue et promotion** — les mainteneurs garantissent la cohérence, puis publient.
:::

L'objectif n'est pas de tout contrôler, c'est de **garantir la cohérence sans bloquer le débit**. Les mainteneurs ne sont pas des gardiens qui disent non ; ce sont des éditeurs qui font passer une contribution de « ça marche chez nous » à « c'est utilisable par tous ». Rends le chemin de contribution plus rapide que le chemin du fork, et le fork disparaît de lui-même.

## Versioning et diffusion

Ton DS est une **API** que d'autres équipes consomment. Toute la discipline d'une bonne API publique s'applique, à commencer par le **semver**.

- **patch** — correction interne, aucun changement d'usage.
- **minor** — ajout rétrocompatible (nouveau composant, nouvelle prop optionnelle).
- **major** — *breaking change*. Une prop renommée, un token supprimé, un défaut modifié.

Un breaking change n'est pas interdit — figer un DS le tue aussi sûrement que le casser. Mais un breaking change se **livre**, il ne se subit pas. Trois outils rendent une migration acceptable pour tes clients :

```ts
// codemod : renommer <Button variant="primary"> en <Button tone="brand">
// exécuté par les équipes, pas de migration manuelle fichier par fichier
export default function transform(file, api) {
  const j = api.jscodeshift;
  return j(file.source)
    .findJSXElements('Button')
    .find(j.JSXAttribute, { name: { name: 'variant' } })
    .forEach((path) => {
      path.node.name.name = 'tone';
      if (path.node.value?.value === 'primary') path.node.value.value = 'brand';
    })
    .toSource();
}
```

D'abord un **codemod** qui fait la migration à la place des équipes. Ensuite une **dépréciation progressive** : la vieille API marche encore, mais émet un avertissement en dev qui pointe vers le remplacement. Enfin un **changelog** lisible, orienté consommateur : *ce qui change pour toi*, pas *ce que j'ai refactoré*. Réexécuter le codemod doit suffire à passer une major.

## Mesurer l'adoption

Sans mesure, tu pilotes à l'aveugle et tu prends le nombre de composants pour un signe de succès. Ce qu'il faut instrumenter, c'est l'**usage réel**.

- **Taux d'adoption** : part des composants qui viennent du DS vs composants maison, par équipe. Un scan statique de l'AST des imports le donne, branché en CI.
- **Couverture** : quels composants du DS sont réellement importés, et lesquels dorment.
- **Dérive** : détecter les composants maison qui doublonnent un composant du DS. C'est le signal le plus utile — chaque doublon est une conversation à avoir.

:::compare
::bad
```text
DS « livré et oublié »
· métrique = « 62 composants livrés ! »
· aucune idée de qui importe quoi
· les tickets s'empilent, réponse en semaines
· une équipe a forké le Button, personne ne le sait
· la roadmap est dans la tête d'une personne
```
::
::good
```text
DS mesuré et soutenu
· métrique = taux d'adoption par équipe, suivi dans le temps
· un scan CI liste les composants maison qui doublonnent
· support avec canal dédié et délai de réponse annoncé
· la dérive remonte en revue → on va parler à l'équipe
· roadmap publique, les clients votent les priorités
```
::
:::

Le DS de gauche compte ce qu'il produit ; celui de droite mesure ce qu'on en fait. Seul le second sait où investir l'effort du prochain trimestre.

## Les signaux d'échec

:::callout{type="warn"}
Certains signaux disent que la relation client est cassée, pas que la technique est mauvaise :

- **Le fork sauvage** — une équipe a copié ton composant dans son dépôt pour le modifier. Symptôme : ton composant était trop rigide ou la contribution trop lente.
- **« On a réécrit le bouton »** — le composant le plus basique du DS a été refait maison. Si même le bouton ne convient pas, c'est la confiance dans le produit qui manque, pas une prop.
- **Le backlog ignoré** — des demandes de contribution restent sans réponse pendant des semaines. Chaque issue morte enseigne aux équipes à ne plus demander et à coder dans leur coin.

La réponse n'est **jamais** un décret (« interdiction de forker »). Un décret sur un produit interne ne fait que pousser la divergence sous le tapis. La réponse est une **relation** : va comprendre pourquoi l'équipe a forké, corrige la rigidité ou la lenteur qui l'a poussée là, et rends le chemin officiel plus rapide que le contournement. Un DS s'adopte, il ne s'impose pas.
:::

## À retenir

:::cheatsheet
- title: "Un produit, pas une bibliothèque"
  desc: "Les équipes qui consomment sont des clients. Roadmap, support, doc, relation continue."
- title: "L'adoption est la métrique"
  desc: "Pas le nombre de composants livrés. 20 adoptés valent mieux que 80 ignorés."
- title: "Tokens en trois couches"
  desc: "Primitifs → sémantiques → composant. Thème et marque changent sans réécrire l'UI."
- title: "Source neutre, code dérivé"
  desc: "DTCG + Style Dictionary. Le design pilote la source, le CSS/TS est généré."
- title: "Fédéré avec processus"
  desc: "Contributions revues par les mainteneurs. Ni goulot d'étranglement, ni anarchie."
- title: "Versionner comme une API"
  desc: "Semver, codemods, dépréciation progressive, changelog orienté consommateur."
- title: "Mesurer la dérive"
  desc: "Scan CI des imports : taux d'adoption, couverture, doublons maison."
- title: "Répondre par la relation"
  desc: "Fork sauvage ou bouton réécrit ? On comprend et on corrige, on ne décrète pas."
:::
