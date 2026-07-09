---
title: "Temporal : enfin des dates correctes"
slug: "temporal"
framework: "web"
level: "medior"
order: 12
duration: 16
prerequisites: ["internationalization"]
updated: 2026-07-09
seoTitle: "Temporal API — remplacer Date : immutabilité, fuseaux et durées sans piège"
seoDescription: "La Temporal API corrige 25 ans de pièges de Date : objets immuables, types distincts (PlainDate, ZonedDateTime, Duration), gestion explicite des fuseaux et calendriers, arithmétique de dates fiable. Le modèle et le support en 2026."
ogVariant: "iris"
related:
  - { framework: "web", slug: "internationalization" }
---

`Date` est cassé, et pas qu'un peu. L'objet est **muable** (une méthode le modifie sur place, sous ton dos), les **mois sont indexés à partir de 0** (janvier vaut `0`), il ne connaît **qu'un seul fuseau implicite** — celui du navigateur —, l'arithmétique se fait à la main en **millisecondes**, et le parsing de chaînes est **hasardeux** d'un moteur à l'autre. Vingt-cinq ans de contournements. `Temporal` repart de zéro : des objets immuables, des types distincts pour chaque intention, et les fuseaux traités comme des données explicites. C'est la nouvelle API standard du temps en JavaScript, et elle règle les bugs à la source plutôt que par des bibliothèques tierces.

## Pourquoi Date échoue

Deux défauts se combinent dans presque chaque bug de date : la mutation silencieuse et l'indexation des mois. L'exemple ci-dessous veut juste « le mois suivant », il produit une date fausse et abîme la variable d'origine.

:::compare
::bad
```js
const d = new Date(2026, 0, 31);   // 0 = janvier (piège d'indexation)
d.setMonth(d.getMonth() + 1);      // veut février...
// février 2026 n'a pas 31 jours → débordement → 3 mars
// et d a été MUTÉ sur place : la date de départ est perdue
```
::
::good
```js
const d = Temporal.PlainDate.from("2026-01-31");
const suivant = d.add({ months: 1 }); // 2026-02-28 (borné au dernier jour)
// d vaut toujours 2026-01-31 : rien n'a bougé
```
:::

**Pourquoi.** À gauche, `setMonth` écrit dans `d` et le mois `31 février` déborde en mars sans prévenir. À droite, les mois se lisent tels qu'on les écrit (`01` = janvier), `add` **renvoie un nouvel objet** et l'arithmétique de calendrier borne proprement au 28 février. Aucune milliseconde, aucun décompte manuel.

## Immutabilité : chaque opération renvoie un nouvel objet

C'est la règle de base de Temporal : **tout objet est gelé**. `add`, `subtract`, `with` ne modifient jamais l'instance — ils en construisent une nouvelle. L'aliasing accidentel (deux variables qui pointent le même `Date`, l'une en corrompant l'autre) disparaît par construction.

```js
const debut = Temporal.PlainDate.from("2026-07-09");
const fin = debut.add({ days: 30 });   // nouvel objet
const veille = debut.subtract({ days: 1 });

debut.toString(); // "2026-07-09" — jamais touché
```

`with` sert à changer un seul champ sans reconstruire toute la date :

```js
debut.with({ day: 1 }); // "2026-07-01", debut inchangé
```

:::callout{type="tip"}
Puisque rien ne mute, tu peux passer un objet Temporal à travers ton code sans copie défensive. Pas de `new Date(autreDate.getTime())` pour se protéger : l'original ne peut pas changer.
:::

## Les types distincts, et pourquoi ça compte

`Date` mélange tout dans un seul type : un anniversaire, une heure de réveil et un horodatage serveur sont tous des `Date`, donc rien n'empêche de les additionner à tort. Temporal éclate ça en types qui portent chacun une intention précise. Le typage t'interdit de comparer des choses non comparables.

:::callout{type="info"}
- **`Temporal.PlainDate`** — une date seule (`2026-07-09`), sans heure ni fuseau. Un anniversaire, une échéance.
- **`Temporal.PlainTime`** — une heure du mur (`09:30`), sans date ni fuseau. Une heure d'ouverture.
- **`Temporal.PlainDateTime`** — date + heure, mais **toujours sans fuseau**. Ambigu sur la ligne du temps tant qu'on ne le rattache pas à un lieu.
- **`Temporal.ZonedDateTime`** — le seul type **conscient du fuseau** (IANA), donc le seul qui désigne un instant réel avec son heure locale.
- **`Temporal.Instant`** — un point absolu sur la ligne du temps, sans notion de calendrier ni de mur (l'équivalent propre d'un timestamp).
- **`Temporal.Duration`** — une quantité de temps (`P3DT4H` = 3 jours 4 heures), le résultat d'une soustraction.
- **`Temporal.PlainYearMonth`** — un mois (`2026-07`), pour « la facture de juillet » sans jour.
:::

Concrètement, un anniversaire est une `PlainDate` : il tombe le 9 juillet partout dans le monde, il n'a pas de fuseau. Un lancement de produit est une `ZonedDateTime` : c'est un instant précis, vécu à des heures locales différentes selon le pays. Les confondre, c'est le bug de fuseau classique — et Temporal le rend impossible à écrire.

## Fuseaux et calendriers explicites

`ZonedDateTime` embarque un **fuseau IANA** (`Europe/Paris`, `America/New_York`), donc il connaît les changements d'heure. Tu obtiens l'instant courant via `Temporal.Now`, jamais via un fuseau deviné.

```js
const maintenant = Temporal.Now.zonedDateTimeISO("Europe/Paris");
const rdv = Temporal.ZonedDateTime.from("2026-07-09T20:30[Europe/Paris]");
```

Le passage à l'heure d'été (DST) est géré pour toi. En 2026, la France avance ses horloges le 29 mars à 2 h → 3 h : ce jour-là ne dure que 23 heures. L'arithmétique de calendrier garde l'heure du mur cohérente.

```js
const veille = Temporal.ZonedDateTime.from("2026-03-28T12:00[Europe/Paris]");
const lendemain = veille.add({ days: 1 });
// 2026-03-29T12:00+02:00 — l'heure locale reste midi,
// alors que seulement 23 h réelles se sont écoulées ; l'offset passe de +01:00 à +02:00
```

Pour convertir sans risque, on descend à l'`Instant` (le point absolu) puis on remonte dans le fuseau voulu :

```js
const instant = rdv.toInstant();              // point sur la ligne du temps
instant.toZonedDateTimeISO("America/New_York"); // même instant, heure de New York
```

:::callout{type="warn"}
Ne construis jamais un instant à partir d'une `PlainDateTime` sans préciser le fuseau : `2026-07-09T20:30` ne désigne aucun moment réel tant qu'on ne dit pas « à Paris » ou « à Tokyo ». C'est exactement l'ambiguïté que `Date` masquait en te collant d'office le fuseau du navigateur.
:::

Le calendrier aussi est explicite : `ZonedDateTime` et `PlainDate` sont en `iso8601` par défaut, mais gèrent les calendriers non grégoriens (hébraïque, japonais, chinois) via `withCalendar`, sans que tu recodes leurs règles.

## Arithmétique et comparaison

Les deltas ne se calculent plus en millisecondes. `since` et `until` renvoient une **`Duration`** que tu peux exprimer dans l'unité de ton choix.

```js
const a = Temporal.PlainDate.from("2026-07-09");
const b = Temporal.PlainDate.from("2026-12-25");

const d = a.until(b);                        // Duration : P169D
d.days;                                      // 169
a.until(b, { largestUnit: "month" });        // P5M16D
b.since(a);                                  // même écart, sens inverse
```

Pour ordonner ou comparer, chaque type expose une méthode statique **`compare`** (renvoyant `-1`, `0` ou `1`) — il n'existe pas de `Temporal.compare` global, c'est toujours `Type.compare` :

```js
Temporal.PlainDate.compare(a, b);            // -1 (a est avant b)
[b, a].sort(Temporal.PlainDate.compare);     // [a, b]
```

Compare deux `Duration` de la même façon avec `Temporal.Duration.compare`. Le point clé : tu compares des objets du même type, jamais des nombres bruts dont tu aurais oublié l'unité.

## Formatage lisible avec Intl

Temporal ne formate pas lui-même pour un humain : il délègue à `Intl`, exactement comme `Date`. Chaque type expose `toLocaleString`, qui accepte une locale et les options d'`Intl.DateTimeFormat`.

```js
const dt = Temporal.ZonedDateTime.from("2026-07-09T20:30[Europe/Paris]");
dt.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
// "9 juillet 2026 à 20:30"
```

La bonne division du travail : Temporal **modélise et calcule** le temps, `Intl` le **rend lisible** selon la locale. Les règles de séparateurs, de noms de mois et de fuseaux d'affichage restent le domaine d'`Intl` — voir [Internationalisation](/web/medior/internationalization). Le `toString()` d'un objet Temporal, lui, produit une chaîne **ISO 8601** stable (`2026-07-09T20:30:00+02:00[Europe/Paris]`), parfaite pour stocker ou transmettre, jamais pour afficher.

## Support en 2026 et polyfill

Temporal a atteint le **stade 4** de TC39 en mars 2026 : l'API fait désormais partie de **ES2026**, sa forme est figée. Côté navigateurs, l'adoption est réelle mais pas universelle.

- **Firefox** a shippé le premier, dès la version 139 (mai 2025), activé par défaut.
- **Chrome** a suivi avec la version 144 (janvier 2026).
- **Edge** l'expose en beta, **Safari** l'a dans sa Technology Preview — pas encore en stable.
- Sur mobile, seul Firefox le gère nativement pour l'instant.

:::callout{type="warn"}
En clair : tu ne peux pas encore compter sur Temporal natif partout, surtout sur mobile hors Firefox. Vérifie ta cible réelle avant de t'en passer d'un polyfill.
:::

Deux polyfills officiels comblent le manque : **`@js-temporal/polyfill`**, maintenu par les champions de la proposition (la référence), et **`temporal-polyfill`** de l'équipe FullCalendar, plus léger et plus rapide. Les deux détectent l'implémentation native et s'effacent quand elle existe.

:::callout{type="tip"}
Un polyfill de dates ajoute du poids au bundle — pèse-le. Si ton audience est majoritairement sur Chrome et Firefox à jour, un chargement conditionnel (le polyfill uniquement quand `globalThis.Temporal` est absent) évite de servir le code à ceux qui n'en ont pas besoin.
:::

## À retenir

:::cheatsheet
- title: "Date est cassé"
  desc: "Muable, mois indexés à 0, fuseau du navigateur implicite, arithmétique en ms : Temporal reprend tout de zéro."
- title: "Tout est immuable"
  desc: "add, subtract, with renvoient un nouvel objet ; l'original ne bouge jamais. Fini l'aliasing accidentel."
- title: "Un type par intention"
  desc: "PlainDate (anniversaire) ≠ ZonedDateTime (instant réel) ≠ Instant (timestamp) ≠ Duration (écart)."
- title: "ZonedDateTime = le seul avec fuseau"
  desc: "Fuseau IANA explicite, DST géré, conversions sûres en passant par toInstant / toZonedDateTimeISO."
- title: "Deltas via since/until"
  desc: "Renvoient une Duration réglable (largestUnit) ; compare est statique par type, pas de Temporal.compare global."
- title: "Affichage = Intl"
  desc: "toLocaleString délègue à Intl pour l'humain ; toString() produit de l'ISO 8601 pour stocker."
- title: "Support 2026"
  desc: "ES2026, natif dans Firefox 139+ et Chrome 144+, Edge/Safari en cours ; polyfill @js-temporal/polyfill sinon."
:::
