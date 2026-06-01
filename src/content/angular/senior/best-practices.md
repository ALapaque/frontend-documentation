---
title: "Best practices Angular 2026"
slug: "best-practices"
framework: "angular"
level: "senior"
order: 9
duration: 18
prerequisites: ["signals", "change-detection", "dependency-injection"]
updated: 2026-06-01
seoTitle: "Best practices Angular 2026 — nommage, structure, signals, OnPush, perf, a11y"
seoDescription: "Les habitudes qui tiennent à l'échelle en Angular : nommage, structure par feature, OnPush par défaut, signals en source de vérité, effets ciblés, tests pragmatiques, accessibilité, performance et les anti-patterns à éviter."
ogVariant: "iris"
related:
  - { framework: "react", slug: "best-practices" }
  - { framework: "vue", slug: "best-practices" }
---

Les *best practices* qui durent ne sont pas une liste de règles arbitraires : ce sont des **habitudes qui rendent le code refactorable**. Voici celles qui paient en Angular en 2026 — l'ère signal-first, zoneless, standalone. Le fil rouge : moins de magie, plus d'explicite.

## Nommage

- **Composants** en `PascalCase`, fichier en `kebab-case.component.ts`. La classe est un nom, pas une action : `UserProfile`, pas `ShowUser`. Le sélecteur reprend l'identité : `app-user-profile`.
- **Services** : suffixe `Service` (`UserService`, `AuthService`). Le verbe vit dans les méthodes (`auth.login()`, pas `loginService.do()`).
- **Signals** : nom du sujet, pas du type. `count`, pas `countSignal`. La lecture `count()` indique déjà que c'est réactif.
- **Booléens** : `isLoading`, `hasAccess`, `canEdit`. Préfixe verbal explicite.
- **Inputs/outputs** : `value` / `valueChange`, pas `data` / `onChange`. Le couple `change` rend le two-way binding via `[(value)]` lisible.

## Structure : par feature, pas par type

```text
src/app/
├── core/                     # cross-cutting : auth, http, errors
├── features/
│   ├── checkout/
│   │   ├── checkout.component.ts
│   │   ├── checkout.service.ts
│   │   ├── checkout.store.ts
│   │   └── ui/             # composants présentationnels du feature
│   └── catalog/
└── ui/                       # design system partagé, sans logique métier
```

**Pourquoi.** Un dossier `components/` qui contient tout finit en cimetière : on n'ose plus rien renommer, peur de casser un import lointain. Un dossier par feature **co-localise** la logique liée — supprimer la feature = supprimer le dossier. Refactor proof.

## OnPush par défaut, point

Tout composant déclare `changeDetection: ChangeDetectionStrategy.OnPush`. C'est le seul mode compatible zoneless (le défaut d'Angular 21), et il **rend les bugs de détection visibles** : si un binding ne se rafraîchit pas, c'est que tu n'as pas notifié — la cause est locale, pas mystérieuse.

```ts
@Component({
  selector: 'app-foo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `…`,
})
```

## Signals comme source de vérité

L'état lu par le template est **toujours** un signal. Les champs nus n'existent pas dans le code de vue.

:::compare
::bad
```ts
export class UserCard {
  user: User | null = null;       // muet : le template ne sait pas quand ça change
  loading = false;
  ngOnInit() { this.fetch(); }
}
```
::
::good
```ts
export class UserCard {
  protected readonly user = signal<User | null>(null);
  protected readonly loading = signal(false);
  protected readonly displayName = computed(() => this.user()?.name ?? '…');
}
```
::
:::

**Pourquoi.** Sous zoneless, un champ muet ne déclenche aucune re-vue — la classe et le DOM divergent silencieusement. Avec un signal, la propagation est garantie, et `computed` exprime la dérivation sans manuel `updateValueAndValidity()` ou recalcul.

## Effets ciblés, jamais dans le constructeur

`effect()` ne sert qu'aux **side-effects** (logger, persister, synchroniser une lib non-Angular). Toute logique de dérivation va dans `computed`. Et tu n'écris pas un `effect` à l'intérieur d'un autre effect — ça se voit en revue.

```ts
// ✓ effect = side-effect explicite
effect(() => {
  const u = this.user();
  if (u) telemetry.set('user_id', u.id);
});
```

`afterNextRender` / `afterRender` pour les besoins DOM (mesurer un élément, lib tierce qui touche le DOM) — pas `ngAfterViewInit`.

## Boundaries : public, privé, et l'API d'un composant

- Champs lus dans le template : `protected` (visible au template, pas à l'extérieur du composant)
- État interne pas lu dans le template : `private` (vraiment privé)
- Inputs/outputs : `readonly` + types stricts. Pas de `any` d'entrée.
- Émettre via `output<T>()`, pas via `EventEmitter` (l'API moderne)

```ts
export class Counter {
  readonly initial = input(0);            // Input requis ? input.required<number>()
  readonly changed = output<number>();
  protected readonly count = signal(this.initial());
}
```

## Tests : tester le contrat, pas l'implémentation

Trois choses suffisent dans 80 % des cas :
1. **Services** — TestBed minimal, mock HTTP, assertions sur ce que le service expose. Pas sur ses internals.
2. **Composants** — `ComponentFixture` + `whenStable()` en zoneless, click → DOM. Pas de snapshot.
3. **Pure functions** (validators, formatters) — tests unitaires nus, sans TestBed.

Vitest est le runner par défaut depuis Angular 22 — adopte-le, Karma est retiré. Voir le module [testing-strategy](/angular/senior/testing-strategy).

## Accessibilité par défaut

- HTML sémantique d'abord (`<button>`, pas `<div (click)>`)
- `aria-label` sur les boutons icon-only
- Focus visible (`:focus-visible`, jamais `outline: none` sans remplacement)
- `cdkTrapFocus` pour les modales, restauration du focus à la fermeture

C'est moins cher de le faire dès le départ que de retravailler après audit.

## Performance : habitudes pas chères

:::cheatsheet
- title: "OnPush partout"
  desc: "Le seul mode compatible zoneless ; rend les dépendances explicites."
- title: "@for track"
  desc: "Toujours une expression de track stable (l'id, pas l'index)."
- title: "Lazy via @defer"
  desc: "Charger un sous-arbre quand il est visible (on viewport)."
- title: "Pas de subscribe() qui écrit un champ"
  desc: "AsyncPipe, ou conversion en signal via toSignal()."
- title: "input signals"
  desc: "input() au lieu de @Input — déjà réactif, pas de ngOnChanges."
- title: "Pas d'appel de méthode dans le template"
  desc: "{{ user().name }} oui ; {{ getName() }} non — il rerun à chaque cycle."
:::

## Anti-patterns

:::callout{type="warn"}
- **`any` partout pour aller vite** — l'inférence du compilateur disparaît, les tests laissent passer du n'importe quoi.
- **Logique métier dans les composants** — le service existe pour ça. Le composant orchestre, il ne calcule pas.
- **`document.querySelector`** dans un composant — `viewChild` / `ElementRef` injecté, point.
- **Subscriptions qui n'ont pas de takeUntilDestroyed** — fuite mémoire. Ou mieux : `AsyncPipe` / `toSignal()`.
- **Un seul gros module store global** — un `signal`/`store` par feature, composables.
:::

## À retenir

:::cheatsheet
- title: "OnPush + signals"
  desc: "Les deux par défaut. Zoneless ne pardonne pas l'état mutable nu."
- title: "Structure par feature"
  desc: "Co-localisation > taxonomie par type."
- title: "Effects = side-effects"
  desc: "Dérivation ? computed. Pas effect."
- title: "Inputs strictement typés"
  desc: "input.required<T>() ; pas de any d'entrée."
- title: "Tests sur le contrat"
  desc: "Service mocké, vue cliquée, helpers purs. Pas de snapshot DOM."
- title: "A11y dès le départ"
  desc: "Sémantique, focus visible, aria-label, trap dans les modales."
:::
