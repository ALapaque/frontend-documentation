---
title: "Opérateurs RxJS"
slug: "rxjs-operators"
framework: "angular"
level: "medior"
order: 2
duration: 20
prerequisites: ["interceptors-guards"]
updated: 2026-05-22
seoTitle: "Opérateurs RxJS — angular"
seoDescription: "switchMap, mergeMap, concatMap, exhaustMap : comprendre l'aplatissement et choisir le bon opérateur selon le cas réel."
ogVariant: "gold"
related:
  - framework: "react"
    slug: "server-state"
---

## Le problème : un Observable qui en produit d'autres

Quand un événement déclenche une requête, on a un `Observable<Event>` dont chaque émission produit un nouvel `Observable<Response>`. Sans aplatissement on obtient un `Observable<Observable<Response>>` : inexploitable. Les opérateurs *higher-order* aplatissent ce flux en `Observable<Response>`. La seule vraie question est : que faire quand une nouvelle source arrive alors que la précédente n'est pas terminée ?

Les quatre opérateurs répondent différemment à cette question de concurrence.

## switchMap : annuler la précédente

À chaque nouvelle émission source, `switchMap` se désabonne de l'Observable interne en cours et bascule sur le nouveau. Idéal pour le typeahead : seule la dernière frappe compte.

```ts
search = new FormControl('');

results$ = this.search.valueChanges.pipe(
  debounceTime(200),
  switchMap((q) => this.api.search(q ?? '')),
);
```

## exhaustMap : ignorer pendant l'occupation

`exhaustMap` ignore toute nouvelle émission tant que l'Observable interne n'est pas terminé. Parfait pour un bouton de sauvegarde ou de login : les double-clics ne déclenchent pas de requêtes redondantes.

```ts
this.saveClicks$.pipe(
  exhaustMap(() => this.api.save(this.form.value)),
).subscribe();
```

## concatMap et mergeMap : préserver ou paralléliser

`concatMap` met en file d'attente : il attend la fin de l'interne courant avant de traiter le suivant. L'ordre est garanti — utile pour des écritures séquentielles. `mergeMap` lance tout en parallèle sans ordre garanti — utile quand les requêtes sont indépendantes et que la latence prime.

```ts
// Ordre garanti : log d'événements
this.events$.pipe(concatMap((e) => this.api.append(e))).subscribe();

// Parallèle : précharger N ressources
from(ids).pipe(mergeMap((id) => this.api.get(id))).subscribe();
```

## Le piège : subscribe imbriqué

:::compare
::bad
```ts
this.search.valueChanges.subscribe((q) => {
  this.api.search(q).subscribe((res) => {
    this.results = res;
  });
});
```
::
::good
```ts
this.results$ = this.search.valueChanges.pipe(
  switchMap((q) => this.api.search(q)),
);
```
::
:::

**Pourquoi** : le `subscribe` imbriqué crée une souscription interne nouvelle à chaque frappe sans jamais annuler les précédentes. Si la requête pour `"ab"` répond après celle pour `"abc"`, `this.results` finit avec le résultat périmé : c'est une *race condition*. De plus, ces souscriptions internes ne sont pas gérées par le cycle de vie et fuient. `switchMap` résout les deux : il annule (désabonne) l'appel interne en cours dès qu'une nouvelle valeur arrive, garantissant que seul le dernier résultat est émis, et la souscription externe unique se nettoie proprement.

### Idée reçue : « mergeMap est le choix par défaut le plus sûr »

Faux, et c'est même souvent le plus dangereux. `mergeMap` n'impose aucune limite de concurrence par défaut : un flux rapide peut ouvrir des centaines de requêtes simultanées et saturer le serveur ou la connexion. Il ne garantit ni l'ordre, ni l'annulation. Le défaut raisonnable pour une requête déclenchée par l'utilisateur est `switchMap` (on veut le dernier résultat). `mergeMap` ne se justifie que quand les opérations sont vraiment indépendantes et idempotentes — et même là, plafonne la concurrence avec son second argument.

:::cheatsheet
- title: "switchMap"
  desc: "Annule l'interne précédent. Typeahead, recherche, dernier-gagne."
- title: "exhaustMap"
  desc: "Ignore les nouvelles émissions pendant l'occupation. Save, login."
- title: "concatMap"
  desc: "File d'attente, ordre garanti. Écritures séquentielles."
- title: "mergeMap"
  desc: "Parallèle sans ordre. Opérations indépendantes, plafonner la concurrence."
:::
