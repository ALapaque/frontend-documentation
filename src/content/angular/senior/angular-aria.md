---
title: "Angular ARIA : les primitives d'accessibilité headless"
slug: "angular-aria"
framework: "angular"
level: "senior"
order: 10
duration: 15
prerequisites: ["signals", "host-directives"]
updated: 2026-07-08
seoTitle: "Angular ARIA — primitives headless stables en v22 : menu, combobox, listbox"
seoDescription: "Angular ARIA (@angular/aria) est stable depuis la v22 : des primitives d'accessibilité headless (combobox, listbox, menu, tabs…) qui gèrent clavier, focus et rôles ARIA sans imposer de style — le chaînon entre WAI-ARIA et ton design system."
ogVariant: "crimson"
related:
  - { framework: "web", slug: "accessibility" }
  - { framework: "angular", slug: "best-practices" }
---

Rendre accessible un widget riche — combobox, menu, tabs — est notoirement difficile. Les patterns du WAI-ARIA Authoring Practices Guide exigent une chorégraphie précise : flèches, `Home`/`End`, typeahead, gestion du focus (roving tabindex ou `aria-activedescendant`), rôles et états ARIA synchronisés à chaque interaction. La plupart des implémentations « maison » en couvrent 30 % et échouent au premier passage de lecteur d'écran.

C'est exactement le trou que comble **Angular ARIA** (`@angular/aria`), stable depuis Angular 22 (sorti le 3 juin 2026) : une collection de directives *headless* qui implémentent ces patterns — clavier, focus, attributs ARIA — sans imposer un pixel de style. Le chaînon manquant entre la spec WAI-ARIA et ton design system.

## Headless : le comportement sans l'apparence

Un UI kit stylé (Material, PrimeNG…) vend un paquet indivisible : comportement **et** apparence. Dès que ta charte graphique s'éloigne du thème, tu passes ton temps à surcharger du CSS que tu n'as pas écrit. À l'inverse, une primitive headless ne rend rien : elle se pose sur *ton* markup, y injecte rôles, attributs et gestion clavier, et te laisse 100 % du rendu.

Le découpage est rationnel : le comportement d'un listbox est un standard (l'APG le spécifie, il est identique partout), alors que son apparence est propre à chaque produit. Mutualiser le premier, garder la main sur la seconde — c'est le même pari que Radix ou Headless UI côté React/Vue, ici en directives Angular natives, réactives par signals.

:::callout{type="info"}
`@angular/aria` s'installe séparément (`npm install @angular/aria`) et prolonge le travail du CDK (`a11y`, listbox expérimental). Les directives sont standalone : tu les ajoutes aux `imports` du composant, ou tu les composes dans les tiens via `hostDirectives`.
:::

## Ce que couvre @angular/aria

Chaque pattern vit dans son entrée secondaire et s'applique par attribut :

- **Listbox** — `import { Listbox, Option } from '@angular/aria/listbox'` : sélecteurs `ngListbox` / `ngOption`, sélection simple ou multiple (`multi`), `orientation`, `selectionMode` (`'follow'` ou `'explicit'`).
- **Combobox** — `import { Combobox, ComboboxPopup } from '@angular/aria/combobox'` : `ngCombobox` coordonne un déclencheur (input, bouton) avec un popup `ngComboboxPopup` ; base des patterns select, multiselect et autocomplete (`ngSelect`, `ngMultiselect`, `ngAutocomplete`).
- **Menu / Menubar** — `ngMenu`, `ngMenubar` : menus déroulants, sous-menus imbriqués, raccourcis clavier.
- **Tabs** — `ngTabs` : onglets avec activation automatique ou manuelle, conformes au pattern APG.
- **Accordion, Tree, Grid, Toolbar** — `ngAccordion`, `ngTree`, `ngGrid`, `ngToolbar` : panneaux repliables, arborescences, navigation bidimensionnelle cellule par cellule, groupes de contrôles.

## Exemple concret : un listbox complet

:::compare
::bad
```html
<!-- Listbox « maison » : clavier partiel, aucun état ARIA -->
<ul class="tags" (keydown.arrowdown)="next()" (keydown.arrowup)="prev()">
  @for (tag of tags; track tag) {
    <li (click)="toggle(tag)" [class.on]="isSelected(tag)">{{ tag }}</li>
  }
</ul>
```
::
::good
```ts
import { Component, signal } from '@angular/core';
import { Listbox, Option } from '@angular/aria/listbox';

@Component({
  selector: 'app-tag-picker',
  imports: [Listbox, Option],
  template: `
    <span id="tags-label">Étiquettes</span>
    <ul ngListbox [multi]="true" [(value)]="selected" aria-labelledby="tags-label">
      @for (tag of tags; track tag) {
        <li ngOption [value]="tag" [label]="tag">{{ tag }}</li>
      }
    </ul>
  `,
})
export class TagPickerComponent {
  tags = ['Angular', 'A11y', 'Signals', 'SSR'];
  selected = signal<string[]>(['Angular']);
}
```
::
:::

**Pourquoi.** La version « maison » oublie `role="listbox"`, `aria-selected`, `Home`/`End`, le typeahead (taper `s` saute à « SSR »), la gestion du focus… La directive `ngListbox` pose tout cela sur *ton* `<ul>` : rôles et états ARIA tenus à jour, navigation clavier complète conforme à l'APG, focus géré pour toi (y compris le mode `aria-activedescendant` utilisé dans un combobox). Toi, tu ne fournis que le markup et le style — et les attributs posés par la directive deviennent tes hooks CSS :

```css
[ngoption][aria-selected='true'] { background: var(--accent); }
[ngoption]:focus-visible { outline: 2px solid var(--focus-ring); }
```

## Intégration avec les signals

Les primitives sont signal-first : leurs entrées d'état sont des `model()`, donc bindables en `[(...)]` directement sur tes propres signals. Sur `ngCombobox`, `value: ModelSignal<string>` et `expanded: ModelSignal<boolean>` se branchent sur ton état, et le filtrage reste chez toi, en pur `computed` :

```ts
query = signal('');
expanded = signal(false);
filtered = computed(() =>
  this.tags.filter(t => t.toLowerCase().includes(this.query().toLowerCase()))
);
```

```html
<input ngCombobox [(value)]="query" [(expanded)]="expanded" placeholder="Filtrer…" />
```

**Pourquoi.** Aucun pont impératif, aucun `EventEmitter` à réconcilier : la primitive écrit dans tes signals, tes `computed` en dérivent la liste filtrée, le template se met à jour. L'état du widget (valeur saisie, popup ouvert, sélection) vit dans *ton* graphe réactif — traçable, testable, sérialisable — pas enfermé dans un composant boîte noire.

:::callout{type="tip"}
Comme ce sont des directives standalone, tu peux les enrouler une bonne fois dans les composants de ton design system via `hostDirectives`, en n'exposant que les inputs utiles (`multi`, `value`…). Tes équipes consomment `<ds-listbox>`, l'accessibilité est câblée en dessous.
:::

## Ce que ça ne remplace pas

Angular ARIA fournit le *comportement* des widgets riches, rien d'autre. Restent à ta charge :

- **La sémantique HTML de base.** Un lien reste un `<a>`, un formulaire garde ses `<label>`. ARIA est un dernier recours : pas de `ngListbox` là où un `<select>` natif suffit.
- **Le style des états.** Focus visible, contraste du survol et de la sélection : la primitive pose `aria-selected`, à toi de le rendre perceptible.
- **Les tests réels.** Un audit axe ou un test unitaire ne remplace pas dix minutes avec NVDA ou VoiceOver sur le parcours complet.

:::callout{type="warn"}
Headless signifie que l'accessibilité *visuelle* t'appartient. Une primitive parfaitement conforme côté clavier et lecteur d'écran, mais dont le focus est invisible (`outline: none` sans alternative) ou dont l'option active ne se distingue pas, reste inaccessible. La directive gère la mécanique ; le contrat visuel de WCAG (focus visible, contrastes) est dans ton CSS.
:::

## À retenir

:::cheatsheet
- title: "@angular/aria (stable v22)"
  desc: "Primitives headless des patterns WAI-ARIA APG : clavier, focus, rôles et états gérés, zéro style imposé."
- title: "ngListbox / ngOption"
  desc: "Sélection simple ou multiple sur ton markup ; [(value)], multi, selectionMode ; attributs ARIA comme hooks CSS."
- title: "ngCombobox + ngComboboxPopup"
  desc: "Coordonne déclencheur et popup ; base de select, multiselect et autocomplete ; [(value)] et [(expanded)] en signals."
- title: "Signal-first"
  desc: "Les états sont des model() : branche tes signals en [(...)], dérive le filtrage en computed, l'état reste dans ton graphe."
- title: "Toujours à ta charge"
  desc: "HTML sémantique d'abord, focus visible et contrastes en CSS, vérification au lecteur d'écran."
:::
