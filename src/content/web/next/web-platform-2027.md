---
title: "Plateforme web : l'horizon 2027"
slug: "web-platform-2027"
framework: "web"
level: "next"
order: 1
duration: 16
prerequisites: ["popover-dialog", "view-transitions"]
updated: 2026-11-27
seoTitle: "Web 2027 — Baseline cet hiver, interestfor, focusgroup, HTML-in-Canvas, soft navigations"
seoDescription: "Ce qui bascule Baseline fin 2026 (Temporal, popover=hint, closedby, CloseWatcher, View Transitions cross-document) et la vague suivante : interestfor, focusgroup, éléments de capacité, HTML-in-Canvas, appendHTML et soft navigations dans CrUX."
ogVariant: "iris"
related:
  - { framework: "css", slug: "css-2027" }
  - { framework: "tooling", slug: "tooling-2027" }
  - { framework: "web", slug: "popover-dialog" }
  - { framework: "web", slug: "speculation-rules" }
---

Il y a six mois, l'horizon de la plateforme tenait en quatre noms : Temporal, la
Navigation API, les View Transitions cross-document et les Speculation Rules, tous
« livrés dans Chromium, en cours ailleurs ». Fin novembre 2026, la Navigation API est
Baseline depuis janvier, chaque sujet a son module, et les derniers moteurs manquants
sont en bêta. La question change donc : qu'est-ce qui devient utilisable partout **cet
hiver**, et quelle vague se prépare derrière ?

:::callout{type="warn"}
Statuts relevés fin **novembre 2026**. Safari 27.3 et Firefox 162 sont des **bêtas**.
`interestfor`, `focusgroup`, les éléments de capacité, HTML-in-Canvas et `appendHTML()`
sont **expérimentaux** et n'existent que dans Chromium. Tout ce qui suit s'emploie
derrière une détection de fonctionnalité, avec un repli.
:::

## Ce qui devient Baseline cet hiver

Une fonctionnalité devient Baseline « Newly available » le jour où la dernière version
stable de Chrome, Edge, Firefox et Safari la gère. Pour cinq d'entre elles, il ne
manque plus qu'une sortie :

| Fonctionnalité | Déjà en stable | Dernier moteur |
| --- | --- | --- |
| `Temporal` | Firefox 139, Chrome 144 | Safari 27.3 (bêta) |
| `popover="hint"` | Chrome 151, Firefox 153 | Safari 27.3 (bêta) |
| `<dialog closedby>` | Chrome 134, Firefox 141 | Safari 27.3 (bêta) |
| `CloseWatcher` | Chrome 126, Firefox 149 | Safari 27.3 (bêta) |
| `@view-transition` | Chrome 126, Safari 18.2 | Firefox 162 (8 déc. 2026) |

Temporal, `closedby` et les transitions cross-document ont leur module
(`/web/medior/temporal`, `/web/medior/popover-dialog`, `/web/medior/view-transitions`).
Les deux autres noms sont nouveaux dans cette base.

**`popover="hint"`** est le troisième type de popover, pensé pour les infobulles. Un
popover `auto` qui s'ouvre ferme les autres `auto` ; un `hint` ne ferme que les autres
`hint`. Ton menu reste donc ouvert pendant qu'une infobulle apparaît par-dessus.

**`CloseWatcher`** donne à tes composants maison la « demande de fermeture » de la
plateforme : `Échap` au clavier, le geste ou le bouton Retour sur Android. C'est le
mécanisme que `<dialog>` et `popover` utilisent déjà en interne.

```js
const watcher = new CloseWatcher();
watcher.onclose = () => panneau.classList.remove("ouvert");
boutonFermer.onclick = () => watcher.requestClose();   // même chemin qu'Échap
```

Safari 27.3 n'a pas de date de sortie connue ; la version stable est la 27.2 (26
octobre). D'ici là, garde le polyfill de Temporal et le repli JS de `closedby`. Et
« Newly available » ne dit rien des iPhone pas encore mis à jour : regarde tes
statistiques avant de retirer un repli.

## Les Speculation Rules sortent de Chromium

Le préchargement déclaratif était le dernier des quatre chantiers à rester
mono-moteur. Ça bouge, à deux vitesses (la syntaxe est dans
`/web/senior/speculation-rules`) :

- **Safari 27.3** : les données de compatibilité de MDN y inscrivent
  `<script type="speculationrules">` avec `prefetch`, les règles de document (`where`)
  et `eagerness`. Pas `prerender`.
- **Firefox** : en préversion seulement (Nightly), et partiellement — `prefetch` d'une
  liste d'URL, `eagerness` limité à `immediate` et `moderate`.

Pense donc tes règles en deux étages : `prefetch` est celui que les trois moteurs
visent, `prerender` reste un bonus Chromium.

:::callout{type="warn"}
Novembre 2026 : l'arrivée dans Safari 27.3 ne repose que sur les données de
compatibilité. Les notes de la bêta ne citent qu'un correctif sur les « speculative
prefetches ». Vérifie à la sortie stable, et ne compte pas sur Baseline cet hiver :
Firefox n'en est qu'à la préversion.
:::

## HTML déclaratif : la vague suivante

`popover`, puis `command` et `commandfor`, ont montré la méthode : prendre un
comportement que tout le monde recode en JavaScript, et en faire un attribut. Trois
familles suivent la même voie. Toutes sont livrées dans Chrome et Edge, aucune dans
Firefox ni Safari.

### `interestfor` : réagir à l'intérêt, pas au clic

Un clic ouvre un menu. Un survol, un focus clavier ou un appui long expriment autre
chose : de l'**intérêt**. `interestfor` relie un lien ou un bouton à une cible, le plus
souvent un `popover="hint"`.

```html
<a href="/equipe/lea" interestfor="apercu-lea">Léa Martin</a>
<div id="apercu-lea" popover="hint">Développeuse front — 42 articles</div>
```

Le navigateur décide de ce qui compte comme « intérêt » selon le périphérique, et
`Échap` l'annule. Tu n'écris ni `mouseenter`, ni minuterie : le délai se règle en CSS
avec `interest-delay`, et `:interest-source` cible le déclencheur pendant l'intérêt.
Disponible depuis Chrome 142.

### `focusgroup` : les flèches sans roving tabindex

Une barre d'outils accessible n'offre qu'**un seul** arrêt de tabulation ; on circule
ensuite avec les flèches. Ce motif, le *roving tabindex*, se recode en JavaScript dans
chaque projet. `focusgroup` le déclare :

```html
<div focusgroup="toolbar wrap" aria-label="Mise en forme">
  <button type="button">Gras</button>
  <button type="button" focusgroupstart>Italique</button>
  <button type="button">Souligné</button>
</div>
```

**Pourquoi.** Le jeton de comportement (`toolbar`, `tablist`, `radiogroup`, `listbox`,
`menu`, `menubar`) apporte le rôle quand le conteneur n'en a pas, l'arrêt de tabulation
unique, les flèches et la mémoire du dernier élément focalisé. `wrap` boucle en fin de
liste, `inline` ou `block` fixe l'axe, `nomemory` coupe la mémoire, `focusgroupstart`
désigne l'élément d'entrée. Disponible depuis Chrome 150.

### Éléments de capacité : la permission devient un bouton

Une demande de permission lancée par script arrive souvent hors contexte, et un refus
se rattrape mal. Les éléments de capacité inversent la logique : le navigateur dessine
le bouton, et la demande part d'un vrai clic de l'utilisateur.

```html
<geolocation>
  <button id="repli">Utiliser ma position</button>  <!-- si l'élément est inconnu -->
</geolocation>
```

```js
const geo = document.querySelector("geolocation");
geo.addEventListener("location", () => {
  if (geo.position) centrerCarte(geo.position.coords);
  else afficherErreur(geo.error.message);
});
```

La famille grandit vite : `<geolocation>` (Chrome 144), `<usermedia>` (151), `<camera>`
et `<microphone>` (153), puis `<install>` (158), qui propose d'installer une
application web à partir de son manifeste, en parallèle de `navigator.install()`. Pour
ce dernier, Chrome Status recense une position « oppose » de WebKit : ne bâtis pas un
parcours d'installation qui en dépend.

Quatrième dossier, plus avancé : le `<select>` personnalisable (`appearance:
base-select`) est stable dans Chrome et Edge 135+ et dans Safari 27 ; Firefox le garde
derrière deux préférences depuis la 149. Voir `/css/medior/modern-form-styling`.

## Rendu : canvas, transitions locales, HTML en flux

### HTML-in-Canvas

Ce que tu dessines dans un `<canvas>` perd l'accessibilité, la sélection de texte et la
saisie. HTML-in-Canvas dessine de **vrais éléments DOM** dans le canvas, en 2D, WebGL
ou WebGPU.

```html
<canvas id="scene" content="drawable" style="width: 400px; height: 200px">
  <form drawable><label for="nom">Nom :</label> <input id="nom"></form>
</canvas>
```

```js
const canvas = document.querySelector("#scene");
const ctx = canvas.getContext("2d");
canvas.onpaint = () => {            // un descendant drawable a changé
  ctx.reset();
  ctx.drawElementImage(canvas.querySelector("form"), 100, 0);
};
```

En contexte 2D, le navigateur réaligne le test de clic et le focus sur la zone
dessinée : le champ reste saisissable là où tu l'as peint.

:::callout{type="warn"}
Novembre 2026 : Chrome Status et les données de compatibilité de MDN indiquent une
activation par défaut dans Chrome 157 (3 novembre), alors que le billet de l'équipe
Chrome du 29 septembre décrivait un origin trial prolongé jusqu'à Chrome 160. L'API a
été renommée en route (Chrome 150, puis 155 : `layoutsubtree` est devenu
`content="drawable"`). Teste `"drawElementImage" in CanvasRenderingContext2D.prototype`
et garde un rendu de repli.
:::

Côté transitions, `element.startViewTransition()` (Chrome 147+) borne l'animation à un
sous-arbre et permet d'en jouer plusieurs en parallèle. Le module
`/web/medior/view-transitions` en parle ; aucun autre moteur ne l'a livré.

### Insérer du HTML en flux

`innerHTML` et `insertAdjacentHTML` exigent la chaîne complète. Chrome 157 ajoute une
famille cohérente, déjà inscrite dans le standard HTML : `appendHTML()`,
`prependHTML()`, `beforeHTML()`, `afterHTML()`, `replaceWithHTML()`, et leurs versions
`stream…`, qui renvoient un `WritableStream`.

```js
const reponse = await fetch("/fragments/commentaires");
await reponse.body
  .pipeThrough(new TextDecoderStream())
  .pipeTo(liste.streamAppendHTML());   // affiché au fil de l'arrivée
```

Comme `setHTML()`, ces méthodes assainissent le balisage pendant l'analyse ; les
variantes suffixées `Unsafe` ne le font pas (voir `/web/senior/security`). Détecte-les
avec `"streamAppendHTML" in Element.prototype`.

## Mesure : les soft navigations entrent dans CrUX

Dans une SPA, seul le premier chargement compte comme navigation pour les Core Web
Vitals. Les changements de route suivants — les *soft navigations* — restaient
invisibles. Depuis Chrome 151, le navigateur les détecte et émet des entrées dédiées :

```js
if (PerformanceObserver.supportedEntryTypes.includes("soft-navigation")) {
  new PerformanceObserver((liste) => {
    for (const nav of liste.getEntries()) envoyer(nav.name, nav.navigationId);
  }).observe({ type: "soft-navigation", buffered: true });
}
```

Côté CrUX, des variantes expérimentales de LCP, INP et CLS incluant ces navigations
existent depuis le jeu de données de septembre 2026 (publié le 13 octobre). L'équipe
prévoit de les intégrer **à partir de mai 2027**. Sur les données d'octobre, 60,3 % des
origines obtiennent alors de bons Core Web Vitals, une hausse de 7,1 % selon les notes
de version. Si ton site est une SPA, tes chiffres vont donc bouger sans que tu touches
au code : compare dès maintenant ces variantes à tes métriques actuelles (les seuils
restent ceux de `/web/senior/core-web-vitals`).

## Un nouveau rythme : une version toutes les deux semaines

Septembre 2026 a été le premier mois de sorties toutes les deux semaines pour Chrome et
Firefox : Chrome 153 et 154, Firefox 155, 156 et 157 dans le même mois. Deux effets :

- **Les numéros défilent.** Chrome 158 est stable depuis le 17 novembre, la 159 suit le
  8 décembre, comme Firefox 162. Raisonne en Baseline, plus en numéros de version.
- **La bêta dure peu.** Chrome 157 est passé en bêta le 15 octobre et en stable le
  3 novembre. Teste tes parcours critiques sur les canaux bêta en continu.

Dernier repère : **Interop 2027**. L'appel à propositions s'est clos le 23 septembre
2026, la sélection est attendue avant le 17 décembre, et le périmètre sera publié dans
la première moitié de février 2027. C'est lui qui dira lesquels de ces sujets les
moteurs s'engagent à aligner.

## À retenir

L'hiver solde l'horizon précédent : ce qui était « Chromium d'abord » devient Baseline,
une sortie stable après l'autre. La vague suivante — moins de JavaScript de plomberie,
plus d'attributs HTML — n'en est qu'au premier moteur : adopte-la comme une
amélioration progressive, jamais comme un prérequis.

:::cheatsheet
- title: "Baseline cet hiver"
  desc: "Temporal, popover=hint, closedby et CloseWatcher à la sortie stable de Safari 27.3 ; View Transitions cross-document avec Firefox 162 (8 déc. 2026)."
- title: "Speculation Rules"
  desc: "prefetch inscrit pour Safari 27.3 (bêta), préversion partielle dans Firefox ; prerender reste Chromium. Pas Baseline cet hiver."
- title: "interestfor et focusgroup"
  desc: "Infobulles à l'intérêt et navigation aux flèches en attributs HTML. Chrome 142 et 150, expérimental, Chromium seulement."
- title: "Éléments de capacité"
  desc: "<geolocation>, <usermedia>, <camera>, <microphone>, <install> : la permission part d'un bouton du navigateur. Le contenu enfant sert de repli."
- title: "HTML-in-Canvas et appendHTML"
  desc: "Chrome 157 : éléments DOM dessinés dans un canvas, HTML inséré en flux via un WritableStream. Expérimental, détection obligatoire."
- title: "Soft navigations"
  desc: "Mesurées depuis Chrome 151, expérimentales dans CrUX, intégrées aux Core Web Vitals à partir de mai 2027."
:::
