---
title: "Host directives"
slug: "host-directives"
framework: "angular"
level: "senior"
order: 5
duration: 14
prerequisites: ["standalone"]
updated: 2026-05-22
seoTitle: "Host directives — angular"
seoDescription: "La directive composition API : hostDirectives sur @Component/@Directive, exposer inputs et outputs, réutiliser un comportement transverse sans héritage ni wrapper."
ogVariant: "crimson"
related:
  - framework: "vue"
    slug: "composables"
---

## Composition plutôt qu'héritage

Avant Angular 15, partager un comportement entre composants passait par l'héritage (`extends`) ou par un wrapper. L'héritage est rigide (une seule classe parente, couplage fort) ; le wrapper alourdit le DOM. La *directive composition API* applique des directives standalone directement sur l'hôte d'un composant ou d'une autre directive, via `hostDirectives`.

```ts
@Directive({ selector: '[appTooltip]' })
export class TooltipDirective {
  text = input('');
}

@Component({
  selector: 'app-icon-button',
  hostDirectives: [TooltipDirective],
  template: `<button><ng-content /></button>`,
})
export class IconButtonComponent {}
```

`IconButtonComponent` hérite du comportement de `TooltipDirective` sans en hériter au sens OO : la directive est *montée* sur le même élément hôte, comme si on l'avait écrite dans le template.

:::callout{type="info"}
Les host directives doivent être `standalone`. Elles sont instanciées avant le composant hôte, donc disponibles dans son injecteur — un point clé pour composer des comportements qui s'injectent mutuellement.
:::

## Exposer inputs et outputs

Par défaut, les inputs/outputs d'une host directive ne sont **pas** exposés sur l'API publique de l'hôte. Il faut les déclarer explicitement, avec possibilité de renommage.

```ts
@Component({
  selector: 'app-icon-button',
  hostDirectives: [
    {
      directive: TooltipDirective,
      inputs: ['text: tooltip'], // expose `text` sous le nom `tooltip`
    },
    {
      directive: AnalyticsDirective,
      outputs: ['tracked'],
    },
  ],
  template: `<button><ng-content /></button>`,
})
export class IconButtonComponent {}
```

```html
<app-icon-button tooltip="Supprimer" (tracked)="onTracked($event)" />
```

Le contrôle est volontairement opt-in : un comportement interne (gestion du focus) reste caché, seul ce qu'on choisit d'exposer devient public. C'est de l'encapsulation, pas de la fuite d'API.

## Réutiliser un comportement transverse

Cas typique : un comportement « interactif désactivable » réutilisé par boutons, liens, items de menu.

:::compare
::bad
```ts
// Héritage : couplage à une classe de base, pas de multi-héritage
export class DisableableBase {
  disabled = input(false);
  @HostBinding('attr.aria-disabled') get aria() { return this.disabled(); }
}
export class MenuItem extends DisableableBase {}
export class IconButton extends DisableableBase {}
```
::
::good
```ts
@Directive({
  selector: '[appDisableable]',
  host: { '[attr.aria-disabled]': 'disabled()' },
})
export class DisableableDirective {
  disabled = input(false);
}

@Component({ hostDirectives: [{ directive: DisableableDirective, inputs: ['disabled'] }] })
export class MenuItemComponent {}

@Component({ hostDirectives: [{ directive: DisableableDirective, inputs: ['disabled'] }] })
export class IconButtonComponent {}
```
::
:::

**Pourquoi** : l'héritage impose une chaîne unique — un composant ne peut étendre qu'une base, donc combiner « désactivable » + « trackable » + « tooltip » devient impossible sans empiler les classes. `hostDirectives` est de la composition : on applique autant de directives indépendantes que voulu sur le même hôte, chacune testable isolément, chacune avec son propre injecteur et ses host bindings. Le DOM reste plat (pas de wrapper), et le comportement est partagé par référence à la directive plutôt que copié dans une hiérarchie. Ajouter un comportement = ajouter une entrée au tableau, pas refondre une arborescence de classes.

## Idée reçue : « hostDirectives, c'est juste du sucre pour l'héritage »

Non, le modèle d'exécution diffère. Une host directive a son **propre injecteur** au niveau de l'élément, son propre cycle de vie (`ngOnInit`, etc.) et ses propres host bindings, fusionnés avec ceux de l'hôte. Plusieurs host directives peuvent s'injecter mutuellement (ordre de déclaration = ordre d'instanciation). Surtout, elles ne partagent pas le `this` du composant : pas de collision de champs, pas de surcharge accidentelle de méthode comme avec `extends`. C'est de la composition d'instances distinctes montées sur un même DOM, là où l'héritage fusionne tout dans une seule instance.

## Code source

Le mécanisme vit dans le moteur de rendu Ivy :

- Résolution et application des host directives au montage : `packages/core/src/render3/component_ref.ts` et `packages/core/src/render3/di.ts`.
- Le matching et l'ordre d'instanciation (host directives avant la directive hôte) : `packages/core/src/render3/instructions/shared.ts` (`findDirectiveDefMatches`, `instantiateAllDirectives`).
- Le mapping des inputs/outputs exposés (`HostDirectiveBindingMap`) : `packages/core/src/render3/definition.ts`.

L'ordre d'instanciation y est explicite : les host directives sont initialisées avant le composant qui les déclare, ce qui rend valide l'injection d'une host directive dans le constructeur de l'hôte.
