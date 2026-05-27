---
title: "Plateforme web : l'horizon 2026"
slug: "web-platform-2026"
framework: "web"
level: "next"
order: 1
duration: 14
prerequisites: ["history-routing", "internationalization"]
updated: 2026-05-27
seoTitle: "Web 2026 — Temporal, Navigation API, View Transitions cross-document, Speculation Rules"
seoDescription: "Ce qui arrive côté plateforme web mi-2026 : l'API Temporal qui remplace Date, la Navigation API qui succède à History, les View Transitions cross-document et les Speculation Rules pour une navigation instantanée."
ogVariant: "iris"
related:
  - { framework: "css", slug: "css-2026" }
  - { framework: "tooling", slug: "tooling-2026" }
---

:::callout{type="info"}
Quatre chantiers de la plateforme web mûrissent en 2026 : **Temporal** (dates), la
**Navigation API** (routing), les **View Transitions cross-document** et les
**Speculation Rules**. Aucun n'exige de framework — ce sont des primitives du
navigateur. Statut : déjà livrés dans Chromium, en cours côté Firefox/Safari ;
emploie-les avec un repli ou un polyfill jusqu'à ce que Baseline les valide.
:::

## Temporal : enfin un remplaçant à `Date`

`Date` traîne trente ans de pièges : mois indexés à zéro, mutabilité, pas de
fuseau autre que local et UTC, parsing imprévisible. **Temporal** (TC39, en cours
de déploiement navigateur) propose des objets **immuables** et explicites.

```js
// Aujourd'hui à Tokyo, demain, formaté pour la locale
const maintenant = Temporal.Now.zonedDateTimeISO("Asia/Tokyo");
const demain = maintenant.add({ days: 1 });
demain.toLocaleString("fr-FR", { dateStyle: "full" });
```

```js
// Une durée, calculée sans bricolage de millisecondes
const sejour = Temporal.PlainDate.from("2026-07-01")
  .until("2026-07-14");        // P13D
```

**Pourquoi.** Temporal sépare les concepts que `Date` mélangeait : `PlainDate`
(une date sans heure), `PlainTime`, `ZonedDateTime` (instant + fuseau IANA),
`Duration`. Chaque opération renvoie un nouvel objet — fini les mutations
surprises. Le formatage reste l'affaire d'`Intl` (voir le module sur
l'internationalisation) ; Temporal fournit la valeur, `Intl` l'affiche.

:::callout{type="warn"}
Tant que tous les navigateurs cibles ne l'ont pas, charge le polyfill officiel
(`@js-temporal/polyfill`) plutôt que de tester `globalThis.Temporal` à la main.
Le polyfill suit la spec et disparaîtra naturellement quand Baseline couvrira l'API.
:::

## Navigation API : la succession de History

`history.pushState` n'a jamais exposé proprement l'interception d'une navigation :
on bricolait des écouteurs de clics. La **Navigation API** centralise tout dans un
seul événement annulable.

```js
navigation.addEventListener("navigate", (e) => {
  if (!e.canIntercept || e.hashChange) return;
  e.intercept({
    async handler() {
      const url = new URL(e.destination.url);
      await afficherVue(url.pathname);   // ton routeur SPA
    },
  });
});
```

**Pourquoi.** Un seul point d'entrée gère liens, boutons précédent/suivant et
navigations programmatiques, avec l'URL de destination, l'état et la possibilité
d'`intercept()` pour rendre la vue. C'est la fondation sur laquelle les routeurs
SPA se reposeront — voir le module `history-routing` pour ce qu'on faisait avant.

## View Transitions cross-document

Les View Transitions same-document (SPA) sont déjà là ; l'étape 2026, ce sont les
transitions **cross-document** : animer le passage entre **deux pages** d'un site
multi-pages classique, sans framework, juste en CSS.

```css
@view-transition { navigation: auto; }

/* Cet élément garde son identité d'une page à l'autre */
.hero { view-transition-name: hero; }
```

**Pourquoi.** Le navigateur fait un instantané de l'ancienne page, charge la
nouvelle, et anime les éléments partageant un `view-transition-name`. Un site
statique ou rendu serveur obtient des transitions fluides d'app — sans JavaScript
de routing. C'est dégradant : sans support, la navigation reste instantanée.

## Speculation Rules : navigation instantanée

On peut indiquer au navigateur de **précharger ou prérendre** les pages que
l'utilisateur va probablement visiter, via une déclaration JSON.

```html
<script type="speculationrules">
{ "prerender": [{ "where": { "selector_matches": "a.nav" }, "eagerness": "moderate" }] }
</script>
```

**Pourquoi.** `eagerness` (`conservative`/`moderate`/`eager`) laisse le navigateur
arbitrer entre instantanéité et gaspillage de bande passante. Couplé aux View
Transitions cross-document, on obtient une navigation MPA qui rivalise avec une SPA.

## À retenir

:::cheatsheet
- title: "Temporal"
  desc: "Dates immuables et explicites (PlainDate, ZonedDateTime, Duration). Remplace Date ; polyfill en attendant Baseline."
- title: "Navigation API"
  desc: "Un événement navigate annulable avec intercept() ; successeur de history.pushState pour les routeurs SPA."
- title: "View Transitions cross-document"
  desc: "@view-transition + view-transition-name : transitions animées entre pages MPA, sans framework."
- title: "Speculation Rules"
  desc: "Prefetch/prerender déclaratif en JSON avec eagerness ; navigation quasi instantanée."
- title: "Statut"
  desc: "Livrés dans Chromium, en cours Firefox/Safari. Emploie avec repli/polyfill jusqu'à Baseline."
:::
