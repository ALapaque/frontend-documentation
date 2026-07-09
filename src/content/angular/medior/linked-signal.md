---
title: "linkedSignal : l'état dérivé inscriptible"
slug: "linked-signal"
framework: "angular"
level: "medior"
order: 12
duration: 13
prerequisites: ["signals"]
updated: 2026-07-08
seoTitle: "linkedSignal Angular — état local qui se réinitialise quand sa source change"
seoDescription: "linkedSignal comble le trou entre computed (lecture seule) et signal (déconnecté) : un état local inscriptible qui se resynchronise quand sa source change. Le pattern sélection-dans-une-liste, l'option computation avec previous, et les pièges."
ogVariant: "gold"
related:
  - { framework: "angular", slug: "signals" }
  - { framework: "angular", slug: "signal-forms" }
---

Entre `computed` — dérivé, toujours cohérent, mais en **lecture seule** — et
`signal` — inscriptible, mais **déconnecté** du reste de l'application — il
manquait un chaînon : un état local que tu peux modifier librement, et qui se
**resynchronise** quand sa source change. C'est `linkedSignal`, introduit en
Angular 19 et stable depuis la 20 — en 2026, un réflexe aussi naturel que
`computed`.

Le besoin revient partout : une sélection dans une liste, une page courante,
un brouillon éditable. Chaque fois qu'un état local doit *suivre* une donnée
venue d'ailleurs sans lui être asservi en permanence, c'est lui.

## Le problème type : la sélection dans une liste

Un composant reçoit une liste via `input()` et laisse l'utilisateur choisir un
élément. Quand la liste change (nouvelle recherche, autre parent), la sélection
doit repartir sur une valeur cohérente — pas pointer vers un élément disparu.

:::compare
::bad
```ts
export class TrackPicker {
  readonly tracks = input.required<Track[]>();
  readonly selected = signal<Track | undefined>(undefined);

  constructor() {
    // Anti-pattern : un effect qui réécrit un signal
    effect(() => this.selected.set(this.tracks()[0]));
  }
}
```
::
::good
```ts
import { linkedSignal } from '@angular/core';

export class TrackPicker {
  readonly tracks = input.required<Track[]>();
  readonly selected = linkedSignal(() => this.tracks()[0]);

  choose(track: Track) {
    this.selected.set(track); // inscriptible, comme un signal ordinaire
  }
}
```
::
:::

**Pourquoi.** La version `effect` marche… par accident. L'effet s'exécute
*après* la propagation du changement : il existe un instant où `tracks()` a
changé mais où `selected()` pointe encore vers l'ancienne liste, et une vue qui
lit les deux peut rendre cet état incohérent. `linkedSignal` recalcule sa
valeur dans la **même passe réactive** que sa source, comme un `computed` —
aucun état intermédiaire — tout en restant inscriptible via `set`/`update`.

## L'API : forme courte, forme longue

La forme courte prend une seule fonction : tout signal lu dedans devient une
source, et chaque changement recalcule la valeur (en écrasant une éventuelle
écriture manuelle).

```ts
readonly selected = linkedSignal(() => this.tracks()[0]);
```

La forme longue sépare la `source` suivie du calcul, et donne accès à
`previous` pour préserver intelligemment l'état :

```ts
readonly selected = linkedSignal<Track[], Track | undefined>({
  source: this.tracks,
  computation: (tracks, previous) =>
    // garde la sélection si l'élément existe encore, sinon repars du premier
    tracks.find((t) => t.id === previous?.value?.id) ?? tracks[0],
});
```

**Pourquoi.** `previous` porte deux champs : `previous.source` (l'ancienne
valeur de la source) et `previous.value` (la dernière valeur du `linkedSignal`,
écritures manuelles comprises). C'est la clé de la resynchronisation *fine* :
au lieu d'écraser la sélection à chaque rafraîchissement de la liste, tu la
conserves tant qu'elle reste valide. `previous` vaut `undefined` au premier
calcul — d'où l'optional chaining.

:::callout{type="info"}
Comme `signal` et `computed`, la forme longue accepte une option `equal` pour
personnaliser la comparaison des valeurs *produites* — utile quand la
computation renvoie des objets.
:::

## linkedSignal, computed ou effect + set ?

| Besoin | Outil |
| --- | --- |
| Valeur dérivée, jamais modifiée à la main | `computed` |
| État indépendant de toute source | `signal` |
| État inscriptible qui se réinitialise quand une source change | `linkedSignal` |
| Effet de bord (log, DOM impératif, API tierce) | `effect` |

Le combo `effect` + `set` est le faux ami : il *semble* équivalent, mais il
propage deux fois (la source déclenche un premier passage, l'écriture de
l'effet un second), il expose un état intermédiaire incohérent entre les deux,
et il dépend du timing d'ordonnancement des effets. `linkedSignal` est évalué
paresseusement à la lecture, dans le même graphe réactif que `computed` :
une seule propagation, jamais d'état fantôme.

:::callout{type="tip"}
Test rapide : si tu n'écris jamais dedans, c'est un `computed`. Si tu te
surprends à vouloir un `effect` qui appelle `set`, c'est presque toujours un
`linkedSignal` qui manque.
:::

## Cas réels

```ts
// 1. Un champ éditable qui se réinitialise quand l'entité change
readonly user = input.required<User>();
readonly nameDraft = linkedSignal(() => this.user().name);

// 2. Une pagination qui revient à 1 quand le filtre change
readonly filter = signal('');
readonly page = linkedSignal({ source: this.filter, computation: () => 1 });

// 3. Un brouillon local resynchronisé quand la version serveur bouge
readonly serverNote = input.required<Note>();
readonly draft = linkedSignal(() => structuredClone(this.serverNote()));
```

**Pourquoi.** Trois variations du même motif. Le cas 2 est instructif : la
computation **ignore** la valeur de la source — `filter` ne sert qu'à
déclencher le retour à la page 1, pendant que `page.set(n)` reste libre entre
deux changements de filtre. Le cas 3 clone la donnée serveur pour que le
brouillon soit éditable sans muter l'original.

## Pièges

:::callout{type="warn"}
`linkedSignal` est un outil d'état **local** au composant. N'en fais pas le
fourre-tout d'un état partagé : dès que plusieurs composants lisent ou
écrivent la même donnée, remonte-la dans un service (signal + méthodes, ou
store) — sinon chaque instance dérive sa propre copie divergente.
:::

Deux autres points de vigilance. La **computation doit rester pure** : pas
d'appel HTTP, pas d'écriture d'autres signaux — et tout signal lu dedans est
suivi, donc une lecture « au passage » ajoute une source de reset involontaire.
Et attention aux **objets** : la comparaison est référentielle par défaut, donc
une source qui émet un nouvel objet au contenu identique déclenche quand même
le recalcul (et perd l'écriture manuelle) — fournis `equal`, ou stabilise la
référence en amont.

## À retenir

:::cheatsheet
- title: "linkedSignal(fn)"
  desc: "Forme courte : signal inscriptible recalculé quand un signal lu dans fn change."
- title: "{ source, computation }"
  desc: "Forme longue : sépare la source suivie du calcul de la nouvelle valeur."
- title: "previous.source / previous.value"
  desc: "Ancienne source et dernière valeur (écritures comprises) — resynchronisation fine."
- title: "vs computed"
  desc: "computed = dérivé pur en lecture seule ; linkedSignal = dérivé + set/update."
- title: "vs effect + set"
  desc: "Anti-pattern : double propagation, état intermédiaire, timing fragile."
- title: "Pièges"
  desc: "État local uniquement, computation pure, égalité référentielle → option equal."
:::
