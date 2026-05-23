---
title: "Liens et navigation"
slug: "links-navigation"
framework: "web"
level: "junior"
order: 5
duration: 12
prerequisites: ["html-semantics"]
updated: 2026-05-23
seoTitle: "Liens et navigation web : href, target blank et tabnabbing"
seoDescription: "Maîtriser le lien hypertexte : URL relatives et absolues, ancres, target blank et rel noopener contre le tabnabbing, prefetch/preload, navigation SPA et accessibilité."
ogVariant: "sage"
related:
  - { framework: "web", slug: "html-semantics" }
---

Le lien hypertexte est la brique fondatrice du web : c'est lui qui relie les pages entre elles et qui donne son nom à la *toile*. Une seule balise, `<a>`, porte tout ça. Pourtant, derrière sa simplicité apparente se cachent des règles de sécurité, d'accessibilité et de performance qu'un débutant ignore souvent. Comprendre comment le navigateur résout une URL, ce que `target="_blank"` ouvre vraiment, et ce qui distingue une navigation classique d'une navigation d'application change ta façon de structurer un site.

## L'ancre et son href

Un lien n'existe que par son attribut `href` (*hypertext reference*) : c'est lui qui transforme du texte en lien cliquable et focusable au clavier. Sans `href`, une balise `<a>` n'est qu'un conteneur inerte, absente de l'ordre de tabulation et invisible pour l'arbre d'accessibilité en tant que lien.

```html
<a href="/contact">Nous contacter</a>
```

Quand l'utilisateur active ce lien, le navigateur déclenche une **navigation** : il résout l'URL, envoie une requête HTTP, reçoit un nouveau document et remplace la page. C'est le comportement natif, gratuit, qui gère l'historique, le bouton retour, le clic du milieu pour ouvrir dans un onglet, et le menu contextuel. Tout ça, tu n'as pas à le réimplémenter.

## URL relatives et absolues

Le navigateur doit transformer ton `href` en une adresse complète : c'est la **résolution d'URL**, et elle dépend de l'URL de la page courante. Une URL **absolue** précise tout (`https://site.fr/blog/article`) ; une URL **relative** se calcule par rapport à l'emplacement actuel.

```html
<a href="https://exemple.fr/aide">Absolue : adresse complète</a>
<a href="/aide">Racine : depuis le domaine, où qu'on soit</a>
<a href="aide">Relative : à côté de la page courante</a>
<a href="../aide">Relative : remonte d'un dossier</a>
```

**Pourquoi.** Un `href` commençant par `/` part toujours de la racine du domaine : robuste, il fonctionne depuis n'importe quelle page. Un `href` sans `/` initial est résolu par rapport au **dossier** de l'URL courante ; depuis `/blog/2026/`, écrire `aide` vise `/blog/2026/aide`, pas `/aide`. C'est la source d'innombrables liens cassés. Pour les liens internes, préfère le chemin absolu depuis la racine (`/aide`) : il ne dépend pas de l'endroit d'où on clique.

## Ouvrir dans un nouvel onglet en sécurité

`target="_blank"` ouvre le lien dans un nouvel onglet. Mais cette commodité ouvre historiquement une faille : la page ouverte reçoit une référence vers la tienne via `window.opener` et peut rediriger ton onglet d'origine vers une page de phishing pendant que l'utilisateur regarde ailleurs. C'est le **tabnabbing**.

:::compare
::bad
```html
<a href="https://site-externe.fr" target="_blank">Voir le partenaire</a>
```
::
::good
```html
<a href="https://site-externe.fr" target="_blank"
   rel="noopener noreferrer">Voir le partenaire</a>
```
::
:::

**Pourquoi.** `rel="noopener"` casse le lien `window.opener` : la nouvelle page ne peut plus toucher à ton onglet, ce qui neutralise le tabnabbing et isole aussi les processus (meilleure perf). `rel="noreferrer"` va plus loin en n'envoyant pas l'en-tête `Referer`, donc le site cible ne sait pas d'où vient le visiteur. En 2026, les navigateurs appliquent déjà `noopener` par défaut sur les `target="_blank"`, mais l'écrire explicitement reste la bonne pratique : tu ne dépends pas du comportement par défaut et tu ajoutes `noreferrer` quand la confidentialité l'exige.

:::callout{type="warn"}
N'abuse pas de `target="_blank"`. Ouvrir de force un nouvel onglet retire à l'utilisateur le contrôle de son bouton retour et désoriente les lecteurs d'écran. Réserve-le aux cas justifiés (documents, sites tiers depuis un formulaire en cours), et signale-le dans le texte du lien quand c'est utile (« ouvre dans un nouvel onglet »).
:::

## Ancres et fragments

Un `href` qui commence par `#` vise un **fragment** de la page courante : le navigateur cherche l'élément dont l'`id` correspond et y défile sans recharger.

```html
<a href="#tarifs">Aller aux tarifs</a>
...
<section id="tarifs">…</section>
```

Le fragment apparaît dans l'URL (`/page#tarifs`), ce qui rend la position **partageable** et navigable au bouton retour. Cas particulier : `href="#top"` ou `href="#"` remonte en haut, mais `#` seul est à éviter (il pollue l'historique). Pour un sommaire ou un lien d'évitement (*skip link*), les fragments sont le mécanisme natif idéal.

## Précharger avec rel

L'attribut `rel` ne sert pas qu'à la sécurité : il pilote aussi des **indices de performance** qui disent au navigateur d'anticiper. Ils ne changent rien à l'affichage, seulement au moment où les ressources sont récupérées.

```html
<!-- récupère une ressource critique de CETTE page, tôt -->
<link rel="preload" href="/police.woff2" as="font" crossorigin />

<!-- pré-télécharge une page que l'utilisateur ira probablement voir -->
<link rel="prefetch" href="/etape-2" />
```

**Pourquoi.** `preload` est impératif : « j'ai besoin de cette ressource pour la page actuelle, va la chercher en priorité » — utile pour une police ou une image LCP. `prefetch` est spéculatif et basse priorité : « l'utilisateur ira sans doute là ensuite, profite des temps morts pour la charger d'avance ». Quand il clique, la page suivante est déjà en cache et s'affiche presque instantanément. Le navigateur reste maître : il peut ignorer un `prefetch` si la connexion est lente ou en mode économie de données.

## Navigation full-page vs SPA

Par défaut, chaque clic sur un `<a>` provoque une navigation **full-page** : le serveur renvoie un document complet, le navigateur jette l'ancienne page et reconstruit tout. C'est simple et robuste. Une **SPA** (*Single Page Application*) intercepte le clic en JavaScript, appelle `e.preventDefault()`, charge seulement les données via `fetch`, met à jour une partie du DOM et réécrit l'URL avec l'**History API** (`history.pushState`).

```js
lien.addEventListener("click", (e) => {
  e.preventDefault();                 // on annule la navigation native
  history.pushState({}, "", "/profil"); // change l'URL sans recharger
  afficherVue("/profil");             // on rend la nouvelle vue soi-même
});
```

L'avantage : pas de rechargement, des transitions fluides, un état conservé. Le coût : tu dois **réimplémenter à la main** ce que le navigateur faisait gratuitement (bouton retour via l'événement `popstate`, focus à déplacer, titre de page, indicateurs de chargement, accessibilité des changements de vue). Une SPA mal faite casse le retour arrière et perd le focus. Garde en tête que les frameworks modernes encapsulent cette logique dans un *routeur* : tu utilises un `<Link>` qui fait tout ça correctement à ta place.

## L'accessibilité des liens

Un lien est lu hors contexte par les lecteurs d'écran, qui peuvent en lister tous les liens d'un coup. Son texte doit donc se suffire à lui-même.

:::compare
::bad
```html
<p>Pour en savoir plus, <a href="/guide">cliquez ici</a>.</p>
```
::
::good
```html
<p>Consulte notre <a href="/guide">guide de démarrage complet</a>.</p>
```
::
:::

**Pourquoi.** Sorti de sa phrase, « cliquez ici » ne dit rien : une liste de liens remplie de « ici », « lire la suite », « en savoir plus » est inutilisable pour qui navigue de lien en lien. Le texte du lien *est* son nom accessible : il doit décrire la **destination**. Évite aussi de coller l'URL brute comme texte (illisible à l'oral) et n'utilise pas le mot « lien » dedans (le rôle est déjà annoncé). Un bon texte de lien est explicite, unique et concis.

:::callout{type="tip"}
Distingue toujours lien et bouton selon l'intention. Ça **mène** quelque part (une URL, une autre page, un fragment) → `<a href>`. Ça **fait** quelque chose sur la page (ouvrir une modale, soumettre) → `<button>`. Un `<a>` sans `href` réel ou un `<button>` qui navigue cassent le clic du milieu, le menu contextuel et l'annonce du rôle.
:::

## À retenir

:::cheatsheet
- title: "href obligatoire"
  desc: "Sans href, l'ancre n'est ni focusable ni un vrai lien ; il porte la navigation native."
- title: "URL relative vs absolue"
  desc: "Le / initial part de la racine du domaine ; sans /, c'est relatif au dossier courant."
- title: "target=_blank + rel"
  desc: "Ajoute rel=noopener noreferrer pour bloquer le tabnabbing et masquer le referer."
- title: "Fragments #id"
  desc: "href=#id défile vers l'élément correspondant sans recharger, position partageable."
- title: "preload vs prefetch"
  desc: "preload = ressource critique de la page ; prefetch = page probable, basse priorité."
- title: "Full-page vs SPA"
  desc: "Le clic recharge tout par défaut ; une SPA intercepte et réécrit l'URL via History API."
- title: "Texte de lien explicite"
  desc: "Le texte est le nom accessible : il doit décrire la destination hors contexte."
:::
