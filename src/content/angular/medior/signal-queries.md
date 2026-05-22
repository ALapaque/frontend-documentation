---
title: "Signal queries & IO"
slug: "signal-queries"
framework: "angular"
level: "medior"
order: 10
duration: 13
prerequisites: ["signals", "data-binding"]
updated: 2026-05-22
seoTitle: "Angular signal queries — input/output/model, viewChild"
seoDescription: "Les API signal de composant : input()/output()/model() et viewChild()/contentChild() en remplacement des décorateurs."
ogVariant: "gold"
related:
  - { framework: "vue", slug: "script-setup" }
  - { framework: "react", slug: "refs-dom" }
---

## Les IO en fonctions, plus en décorateurs

Les entrées/sorties d'un composant ne se déclarent plus avec `@Input` / `@Output`
mais avec des **fonctions de signal** : `input()`, `output()`, `model()`. Le
résultat est typé, réactif, et lisible comme n'importe quel autre signal.

```ts
import { input, output, model } from '@angular/core';

export class Rating {
  // remplace @Input()
  max = input(5);                       // InputSignal<number>
  label = input.required<string>();     // requis : erreur de compilation si absent

  // remplace @Input() + @Output() value/valueChange (two-way)
  value = model(0);                      // ModelSignal<number>

  // remplace @Output()
  rated = output<number>();              // OutputEmitterRef<number>

  pick(n: number) {
    this.value.set(n);   // émet aussi valueChange pour le [(value)]
    this.rated.emit(n);
  }
}
```

:::cheatsheet
- title: "input(default)"
  desc: "Entrée en lecture seule, lue comme un signal `x()`."
- title: "input.required<T>()"
  desc: "Entrée obligatoire, vérifiée à la compilation."
- title: "model(default)"
  desc: "Liaison bidirectionnelle : crée x + xChange pour le [(x)]."
- title: "output<T>()"
  desc: "Émetteur d'événement, remplace @Output() + EventEmitter."
:::

## Les queries comme signaux

`viewChild()`, `viewChildren()`, `contentChild()` et `contentChildren()`
remplacent les décorateurs `@ViewChild` & co. Elles renvoient des **signaux** : tu
les lis dans un `computed` ou un `effect`, et leur valeur devient disponible dès
que la vue est rendue — sans attendre un hook de cycle de vie.

```ts
import { viewChild, viewChildren, effect, computed } from '@angular/core';

export class Editor {
  area = viewChild<ElementRef<HTMLTextAreaElement>>('area');
  rows = viewChildren(RowComponent);

  rowCount = computed(() => this.rows().length);

  constructor() {
    effect(() => {
      this.area()?.nativeElement.focus(); // dispo sans ngAfterViewInit
    });
  }
}
```

:::callout{type="tip"}
Une query signal peut être `required` : `viewChild.required('area')` renvoie un
signal non-nullable et lève si l'élément est absent. Utile quand l'élément est
garanti présent dans le template.
:::

## Décorateur vs signal query

:::compare
::bad
```ts
export class Editor {
  @ViewChild('area') area!: ElementRef<HTMLTextAreaElement>;

  ngAfterViewInit() {
    this.area.nativeElement.focus(); // dispo SEULEMENT après ce hook
  }
  // pour réagir aux changements : QueryList.changes + souscription
}
```
::
::good
```ts
export class Editor {
  area = viewChild.required<ElementRef<HTMLTextAreaElement>>('area');

  constructor() {
    effect(() => this.area().nativeElement.focus()); // réactif, sans hook
  }
}
```
::
:::

**Pourquoi** : avec le décorateur, le champ n'est peuplé qu'au moment précis du
hook `ngAfterViewInit` — y accéder avant donne `undefined`, ce qui force un
ordonnancement manuel par cycle de vie. La query signal expose une *valeur
réactive* : Angular la met à jour quand la vue change, et tout `computed`/`effect`
qui la lit se recalcule automatiquement. Tu ne synchronises plus rien à la main,
et tu te passes de `QueryList.changes` pour observer les enfants dynamiques.

### Idée reçue : « les signal queries, c'est juste les décorateurs renommés »

Non. La différence est sémantique, pas cosmétique. Un décorateur de query
assigne une propriété *à un instant donné* du cycle de vie ; tu dois savoir
*quand* lire (`ngAfterViewInit`, `ngAfterContentInit`) et observer manuellement
les changements via `QueryList`. Une signal query est une valeur **réactive et
toujours à jour** : lisible dans un `computed`/`effect`, recalculée quand l'arbre
de vue change, disponible sans jonglage de hooks. Ce n'est pas le même modèle de
disponibilité.

:::callout{type="warn"}
Ne lis pas une query signal dans le `constructor` *en dehors* d'un contexte
réactif : la vue n'est pas encore créée, tu obtiendras `undefined`. Lis-la dans un
`effect` ou un `computed`, ou après le premier rendu.
:::
