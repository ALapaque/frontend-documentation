---
title: "Internationalisation : dates, devises et nombres avec Intl"
slug: "internationalization"
framework: "web"
level: "medior"
order: 8
duration: 15
prerequisites: []
updated: 2026-05-27
seoTitle: "Intl : formater devises, dates, pluriels et tri par locale"
seoDescription: "L'API Intl du navigateur : NumberFormat (devise, unités, %), DateTimeFormat et le piège des fuseaux en SSR, RelativeTimeFormat, PluralRules, Collator pour trier, et pourquoi réutiliser ses formatters."
ogVariant: "iris"
related:
  - { framework: "web", slug: "fetch" }
---

Formater un prix, une date ou un nombre « à la main » est l'un des bugs les plus tenaces du front : `1234.5` devient `1234.50 €` pour un utilisateur français qui attend `1 234,50 €`, et `03/04` veut dire mars pour un Américain, avril pour un Européen. La règle est simple : **tu ne codes jamais ces règles toi-même**. Le navigateur embarque déjà toute la base CLDR via l'API `Intl` — chaque locale, chaque devise, chaque fuseau. Ton travail est de lui passer la bonne locale et la bonne intention.

## Nombres et devises : Intl.NumberFormat

Un nombre n'a pas une seule représentation : le séparateur décimal, le groupage des milliers, le symbole monétaire et sa position dépendent de la locale. `toFixed` ne connaît rien de tout ça.

:::compare
::bad
```js
// Bricolage : séparateur figé, pas de groupage, symbole mal placé
const prix = `${montant.toFixed(2)} €`; // "1234.50 €"
```
::
::good
```js
const prix = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
}).format(montant); // "1 234,50 €"
```
::
:::

**Pourquoi.** À gauche, `toFixed(2)` produit un point décimal et aucun groupage : c'est une convention anglophone gravée dans le code. En `de-DE` le même montant s'écrit `1.234,50 €`, en `en-US` `$1,234.50`, et le symbole passe parfois devant, parfois derrière. À droite, `Intl.NumberFormat` lit la locale et applique la bonne règle — séparateur, espace insécable de groupage, symbole et position — sans que tu connaisses aucune de ces conventions. La devise est une donnée (`currency: "EUR"`), pas un caractère collé à la fin.

Le même objet couvre les pourcentages et les unités physiques :

```js
new Intl.NumberFormat("fr-FR", { style: "percent" }).format(0.073); // "7 %"
new Intl.NumberFormat("fr-FR", {
  style: "unit",
  unit: "kilometer-per-hour",
}).format(90); // "90 km/h"
```

## Dates et heures : Intl.DateTimeFormat

Pour les dates, le format dépend de la locale, mais un second axe entre en jeu : le **fuseau horaire**. Un `Date` est un instant absolu (un nombre de millisecondes depuis epoch) ; son affichage dépend du fuseau dans lequel tu le projettes.

```js
const quand = new Date("2026-05-27T20:30:00Z");
new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Paris",
}).format(quand); // "27 mai 2026 à 22:30"
```

Sans l'option `timeZone`, `Intl` utilise le fuseau du runtime. C'est exactement là que les choses cassent.

:::callout{type="warn"}
**Le piège du rendu serveur.** En SSR, le serveur tourne presque toujours en UTC ; le navigateur, lui, est à l'heure locale de l'utilisateur. Si tu formates une heure sans `timeZone` explicite, le serveur génère `22:30` et le client `00:30` → **mismatch d'hydratation**, et React/Angular/Vue te le reprochent en console. Deux parades : fixe un `timeZone` explicite des deux côtés (idéal si tu connais le fuseau de l'utilisateur), ou ne formate l'heure que côté client après l'hydratation. Ne laisse jamais le fuseau « par défaut » décider à ta place.
:::

## Le temps relatif : Intl.RelativeTimeFormat

« Il y a 3 jours », « dans 2 heures » : ne construis pas ces chaînes par concaténation, elles ont aussi des règles par langue.

```js
const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
rtf.format(-1, "day");  // "hier"  (numeric:auto remplace "il y a 1 jour")
rtf.format(-3, "day");  // "il y a 3 jours"
rtf.format(2, "hour");  // "dans 2 heures"
```

L'option `numeric: "auto"` autorise les formes idiomatiques (`hier`, `demain`) au lieu du tout-numérique ; à toi de calculer le delta, `Intl` se charge de la formulation.

## Les pluriels : Intl.PluralRules

Le réflexe `n === 1 ? "fichier" : "fichiers"` est faux dès qu'on sort du français et de l'anglais. Le russe, le polonais ou l'arabe ont **trois à six** catégories de pluriel. `Intl.PluralRules` te dit dans quelle catégorie tombe un nombre pour une langue donnée.

```js
const pr = new Intl.PluralRules("ru");
pr.select(1);  // "one"
pr.select(2);  // "few"
pr.select(5);  // "many"

// On mappe la catégorie vers le bon message, jamais le nombre directement :
const messages = { one: "файл", few: "файла", many: "файлов", other: "файла" };
const mot = messages[pr.select(n)];
```

Même en français la frontière n'est pas « 1 » : `0` et `1` sont au singulier (`0 fichier`, `1 fichier`), le reste au pluriel. `PluralRules` encode cette règle pour toi ; tu écris des messages par catégorie, pas un ternaire fragile.

## Trier du texte : Intl.Collator

`Array.prototype.sort()` compare par défaut les **unités de code UTF-16**, pas des lettres. Résultat : les majuscules passent avant les minuscules et les accents finissent en queue de liste.

:::compare
::bad
```js
["éclair", "Zoé", "abricot"].sort();
// ["Zoé", "abricot", "éclair"] — "Z" < "a", "é" rejeté à la fin
```
::
::good
```js
const c = new Intl.Collator("fr");
["éclair", "Zoé", "abricot"].sort(c.compare);
// ["abricot", "éclair", "Zoé"] — ordre alphabétique français
```
::
:::

**Pourquoi.** Le tri par défaut est lexicographique sur des points de code : `"Z"` (90) précède `"a"` (97), et `"é"` (233) arrive après tout l'ASCII. `Intl.Collator` applique l'ordre de collation de la locale — insensible à la casse si tu le demandes (`sensitivity: "base"`), gérant les accents et les digrammes propres à chaque langue. Pour toute liste affichée à un humain, c'est le seul tri correct.

## Réutilise tes formatters

Construire un objet `Intl` est coûteux : il charge et compile les données de la locale. En créer un à chaque ligne d'un tableau, ou à chaque rendu, est un piège de performance classique.

:::callout{type="tip"}
Crée le formatter **une fois**, hors de la boucle ou du composant, et réutilise-le. Un `Intl.NumberFormat` est immuable et réutilisable à l'infini. Dans un composant, mémoïse-le (`useMemo`, un `computed`, ou une constante de module) pour ne pas le reconstruire à chaque rendu. Le gain se mesure dès quelques centaines d'appels.
:::

```js
// Une instance partagée, pas une par appel :
const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
lignes.forEach((l) => afficher(eur.format(l.montant)));
```

## Et demain : Temporal

L'objet `Date` historique est mutable, piégeux sur les fuseaux et limité. `Temporal`, la nouvelle API standard de manipulation du temps, le remplace avec des types explicites (`Temporal.PlainDate`, `Temporal.ZonedDateTime`) et des objets immuables. Il s'intègre directement à `Intl` via `toLocaleString`. Quand il sera disponible partout, il règlera la moitié des bugs de fuseau à la source — mais le formatage, lui, restera le travail d'`Intl`.

## À retenir

:::cheatsheet
- title: "Jamais à la main"
  desc: "Séparateurs, symboles, ordre des dates : règles par locale, déléguées à Intl."
- title: "NumberFormat"
  desc: "Devise (currency), pourcentages (percent) et unités (unit) en une instance."
- title: "DateTimeFormat + timeZone"
  desc: "Fixe timeZone explicitement, sinon SSR (UTC) et client divergent → mismatch d'hydratation."
- title: "RelativeTimeFormat"
  desc: "« hier », « dans 2 h » avec numeric:auto ; calcule le delta, Intl formule."
- title: "PluralRules"
  desc: "n === 1 est faux hors fr/en ; mappe la catégorie (one/few/many…) vers un message."
- title: "Collator pour trier"
  desc: "sort() par défaut compare l'UTF-16 ; Collator donne l'ordre alphabétique de la locale."
- title: "Réutilise l'instance"
  desc: "Construire un formatter coûte cher : crée-le une fois, mémoïse-le, réutilise-le."
:::
