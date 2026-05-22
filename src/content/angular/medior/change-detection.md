---
title: "Change detection"
slug: "change-detection"
framework: "angular"
level: "medior"
order: 3
duration: 17
prerequisites: ["data-binding"]
updated: 2026-05-22
seoTitle: "Change detection Angular — Default vs OnPush"
seoDescription: "Comment Angular décide de re-rendre : Default vs OnPush, et la lecture de l'arbre de détection."
ogVariant: "gold"
related:
  - { framework: "react", slug: "memo-callback" }
  - { framework: "vue", slug: "reactivity-deep" }
---

## Qu'est-ce qu'un cycle de détection ?

Angular maintient un arbre de composants. À chaque « tick », il parcourt cet
arbre et compare les expressions de template à leur valeur précédente. Si ça a
changé, il met à jour le DOM. La question de perf, c'est : **quels composants
sont vérifiés à chaque tick ?**

## Default : tout l'arbre

En stratégie `Default`, un tick vérifie **tout** l'arbre depuis la racine. Pour
une petite app, invisible. Pour une grosse, c'est du travail gâché.

## OnPush : ne vérifier que si nécessaire

`OnPush` dit à Angular : « ne re-vérifie ce composant que si l'une de ces
conditions est vraie ».

:::cheatsheet
- title: "Référence d'@Input change"
  desc: "Une nouvelle référence (pas une mutation) déclenche la vérification."
- title: "Événement dans le composant"
  desc: "Un (click), un (input)… marque le composant comme à vérifier."
- title: "Signal lu dans le template"
  desc: "La lecture d'un signal abonne précisément la vue à ce signal."
- title: "AsyncPipe émet"
  desc: "Un Observable via | async marque le composant."
:::

```ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ user().name }}`,
})
export class Profile {
  readonly user = input.required<User>();
}
```

## Le piège de la mutation

Avec `OnPush`, muter un objet d'`@Input` ne change pas sa référence — la vue ne
se met pas à jour.

:::compare
::bad
```ts
this.user.tags.push('vip'); // même référence → OnPush ne voit rien
```
::
::good
```ts
this.user = { ...this.user, tags: [...this.user.tags, 'vip'] };
```
::
:::

**Pourquoi** : `OnPush` ne déclenche une vérification que si la *référence* d'un `@Input` change. Un `.push()` mute le tableau existant sans créer de nouvel objet — la référence reste identique, donc la comparaison `===` interne d'Angular conclut « rien n'a changé » et la vue ne bouge pas. Le spread produit un nouvel objet, donc une nouvelle référence, qui réveille le composant.

### Idée reçue : « OnPush, c'est risqué »

Au contraire. Combiné aux signals et à l'immutabilité, `OnPush` rend les re-renders
**prévisibles**. La vraie source de bugs, c'est la mutation en place — un
problème que `OnPush` rend visible plutôt qu'il ne le crée.

:::callout{type="tip"}
La cible 2026 : `OnPush` partout + signals. Tu obtiens une détection quasi
chirurgicale, et c'est exactement le modèle vers lequel le mode zoneless tend.
:::
