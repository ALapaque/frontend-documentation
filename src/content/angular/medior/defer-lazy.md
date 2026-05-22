---
title: "@defer & lazy"
slug: "defer-lazy"
framework: "angular"
level: "medior"
order: 6
duration: 14
prerequisites: ["standalone", "control-flow"]
updated: 2026-05-22
seoTitle: "@defer & lazy — angular"
seoDescription: "Maîtriser @defer : triggers on idle/viewport/interaction/hover/timer, prefetch et les blocs @placeholder/@loading/@error pour différer le code sans casser l'UX."
ogVariant: "gold"
related:
  - framework: "react"
    slug: "suspense-basics"
---

## Ce que @defer change

`@defer` est un bloc de template qui retire son contenu du chunk initial et ne le charge qu'à la demande. Le compilateur découpe automatiquement les composants, directives et pipes référencés dans le bloc en un chunk séparé, chargé via un `import()` dynamique au déclenchement d'un *trigger*.

Contrairement au lazy loading de route, on diffère ici à la granularité d'un fragment de vue : un graphique lourd, un éditeur riche, un widget tiers sous la ligne de flottaison.

```html
@defer (on viewport) {
  <app-heavy-chart [data]="data()" />
} @placeholder {
  <div class="skeleton">Graphique…</div>
}
```

:::callout{type="info"}
Pour que `@defer` produise un chunk, le composant déféré ne doit pas être référencé ailleurs de façon eager (autre template, autre `imports` chargé immédiatement). Sinon il est tiré dans le bundle initial et le `@defer` ne fait plus que masquer l'affichage.
:::

## Les triggers

Le trigger décide *quand* charger. Plusieurs peuvent se combiner (le premier déclenché gagne).

```html
@defer (on idle) { ... }                          <!-- navigateur inactif (défaut) -->
@defer (on viewport) { ... }                      <!-- le placeholder entre dans le viewport -->
@defer (on interaction) { ... }                   <!-- clic/keydown sur le placeholder -->
@defer (on hover) { ... }                          <!-- survol du placeholder -->
@defer (on timer(3s)) { ... }                     <!-- après un délai -->
@defer (when isReady()) { ... }                   <!-- condition booléenne (signal/expression) -->
@defer (on viewport(ref); on timer(5s)) { ... }   <!-- combinaison -->
```

`on viewport`, `on interaction` et `on hover` peuvent cibler un élément de référence explicite : `@defer (on viewport(trigger))` avec `<div #trigger>` ailleurs dans le template.

## Les blocs d'état

`@defer` s'accompagne de blocs optionnels qui couvrent tout le cycle : avant, pendant et en cas d'échec.

```html
@defer (on viewport) {
  <app-comments [postId]="id()" />
} @placeholder (minimum 300ms) {
  <p>Section commentaires</p>
} @loading (after 100ms; minimum 500ms) {
  <app-spinner />
} @error {
  <p>Chargement impossible. <button (click)="retry()">Réessayer</button></p>
}
```

- `@placeholder` : rendu avant tout déclenchement. C'est lui qui occupe la place et sert de cible aux triggers `viewport`/`hover`/`interaction`.
- `@loading` : pendant le téléchargement du chunk. `after` évite le flash sur les chargements rapides, `minimum` évite le flash inverse.
- `@error` : si l'`import()` échoue (réseau coupé, chunk introuvable).

## Prefetch : charger sans afficher

`prefetch` dissocie le chargement du code de son affichage. On peut télécharger le chunk au survol tout en n'affichant le contenu qu'au clic.

```html
@defer (on interaction; prefetch on hover) {
  <app-editor />
} @placeholder {
  <button>Ouvrir l'éditeur</button>
}
```

## Eager vs @defer

:::compare
::bad
```ts
@Component({
  imports: [HeavyChartComponent],
  template: `<app-heavy-chart [data]="data()" />`,
})
export class DashboardComponent {}
```
::
::good
```ts
@Component({
  // pas d'import : @defer gère le chargement
  template: `
    @defer (on viewport) {
      <app-heavy-chart [data]="data()" />
    } @placeholder {
      <div class="skeleton"></div>
    }
  `,
})
export class DashboardComponent {}
```
::
:::

**Pourquoi** : dans la version eager, l'`import` statique de `HeavyChartComponent` (et tout son arbre de dépendances : la lib de charting, ses pipes) est lié au chunk du `DashboardComponent`, donc téléchargé et instancié au premier rendu, même si le graphique n'est jamais vu. Avec `@defer`, le compilateur détecte qu'`HeavyChartComponent` n'est référencé que dans un bloc déféré et le sort dans un chunk distinct ; le navigateur ne le récupère qu'au franchissement du viewport. Le coût (parsing JS, exécution, construction du composant) est repoussé hors du chemin critique du LCP au lieu d'être payé d'avance.

:::callout{type="tip"}
`@defer` ne fonctionne en SSR qu'à condition d'être hydraté correctement : avec l'hydratation incrémentale (`withIncrementalHydration`), le serveur rend le contenu déféré et le client l'hydrate au trigger, sans flash de placeholder.
:::

:::cheatsheet
- title: "on idle / viewport / interaction / hover / timer"
  desc: "Triggers de déclenchement ; combinables, premier déclenché gagne."
- title: "prefetch on <trigger>"
  desc: "Télécharge le chunk en amont, indépendamment de l'affichage."
- title: "@placeholder (minimum t)"
  desc: "Contenu initial, cible des triggers de proximité."
- title: "@loading (after t; minimum t)"
  desc: "Pendant le téléchargement ; lisse les flashs."
:::
