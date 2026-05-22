---
title: "Réactivité avancée"
slug: "reactivity-deep"
framework: "vue"
level: "medior"
order: 4
duration: 17
prerequisites: ["reactivity-basics", "computed-watch"]
updated: 2026-05-22
seoTitle: "Réactivité avancée — vue"
seoDescription: "toRef, toRefs, unref, isRef, isProxy : convertir entre ref et reactive sans casser le tracking, et pourquoi déstructurer un reactive perd la réactivité."
ogVariant: "gold"
related:
  - framework: "react"
    slug: "hooks-rules"
  - framework: "angular"
    slug: "signals"
---

`ref` et `reactive` couvrent 90 % des besoins. Le reste tient dans une poignée d'utilitaires qui permettent de naviguer entre les deux mondes — passer d'une propriété d'objet à une ref, déstructurer sans casser le tracking, ou interroger la nature d'une valeur. Tout repose sur un point : la réactivité de Vue suit des références, pas des valeurs.

## La différence ref vs reactive

`reactive(obj)` enveloppe un objet dans un Proxy : l'accès et la mutation de ses propriétés sont interceptés et trackés. `ref(x)` crée un conteneur `{ value: x }`, lui aussi réactif via getter/setter sur `.value`. Le tracking se déclenche quand on *lit* la propriété trackée pendant l'exécution d'un effet (rendu, computed, watch).

```ts
import { reactive, ref } from 'vue'

const etat = reactive({ x: 1, y: 2 }) // Proxy
const compteur = ref(0)               // { value: 0 } réactif
```

La conséquence est centrale : la réactivité vit dans le Proxy (`etat`) ou dans la ref (`compteur.value`). Sortir une valeur primitive de là, c'est en sortir de tout suivi.

## Déstructurer un reactive casse tout

Déstructurer un objet `reactive` lit ses propriétés une fois et copie les primitives dans des variables locales : le lien avec le Proxy est rompu.

:::compare
::bad
```ts
const etat = reactive({ x: 1, y: 2 })
const { x, y } = etat // x, y = primitives figées
// muter etat.x ne changera plus x
```
::
::good
```ts
import { toRefs } from 'vue'
const etat = reactive({ x: 1, y: 2 })
const { x, y } = toRefs(etat) // x, y = refs liées
// etat.x++ se reflète dans x.value
```
::
:::

**Pourquoi** : le Proxy de `reactive` ne tracke que les accès faits *à travers lui*. Déstructurer évalue `etat.x` immédiatement et stocke la valeur `1` dans une nouvelle variable `x`, déconnectée du Proxy : plus aucune lecture future ne passe par l'intercepteur, donc plus de dépendance enregistrée. `toRefs` convertit chaque propriété en une ref dont le getter/setter délègue au Proxy d'origine : lire `x.value` re-traverse `etat.x` et réenregistre la dépendance, écrire `x.value` mute `etat.x`. La référence vers la source est conservée, le tracking aussi. C'est le pattern obligatoire pour exposer les champs d'un état depuis un composable.

## toRef vs toRefs

`toRefs` transforme toutes les propriétés d'un reactive en refs. `toRef` cible une seule propriété et fonctionne aussi avec une valeur ou un getter.

```ts
import { reactive, toRef, toRefs } from 'vue'

const etat = reactive({ nom: 'Ada', age: 36 })

const nom = toRef(etat, 'nom')   // ref liée à etat.nom
const { age } = toRefs(etat)     // toutes les props en refs

// toRef accepte aussi un getter (3.3+) :
const majuscule = toRef(() => etat.nom.toUpperCase()) // ref en lecture seule
```

`toRef(objet, 'clé')` reste lié même si la propriété n'existe pas encore. La forme getter `toRef(() => ...)` produit une ref dérivée en lecture seule, proche d'un `computed` léger. Utilise `toRef` pour une propriété isolée, `toRefs` pour exposer tout un état d'un coup.

## Interroger et déballer : unref, isRef, isProxy

Quand une API peut recevoir soit une valeur, soit une ref, ces helpers évitent les conditions manuelles.

```ts
import { ref, unref, isRef, isProxy, reactive, readonly } from 'vue'

const r = ref(10)

isRef(r)        // true
unref(r)        // 10  — équivaut à isRef(r) ? r.value : r
unref(42)       // 42  — passe-plat si ce n'est pas une ref

const p = reactive({})
isProxy(p)            // true (reactive)
isProxy(readonly({})) // true (readonly est aussi un proxy)
isProxy(r)            // false (une ref n'est pas un proxy)
```

`unref(x)` renvoie `x.value` si `x` est une ref, sinon `x` : idéal pour normaliser un argument `MaybeRef`. `isRef` discrimine une ref d'une valeur brute. `isProxy` détecte les objets enveloppés par `reactive` ou `readonly` — utile pour savoir si un objet est tracké avant de le manipuler.

:::callout{type="tip"}
Pour typer une API souple, le pattern est `(source: MaybeRefOrGetter<T>)` puis `toValue(source)` (3.3+), qui généralise `unref` aux getters. C'est la signature canonique des composables de VueUse.
:::

### Idée reçue : « toRefs rend chaque propriété indépendamment réactive comme un ref isolé »

Faux. `toRefs` ne crée pas de nouvelle réactivité : il crée des refs *proxy* vers les propriétés du `reactive` d'origine. La source de vérité reste l'objet reactive. Si tu remplaces une clé sur l'objet source par une assignation directe d'une propriété qui n'existait pas au moment du `toRefs`, la ref correspondante ne sera pas créée. Et muter `x.value` mute bien `etat.x` — ce ne sont pas deux états distincts mais deux vues sur le même. Confondre les deux mène à croire qu'on peut détacher une propriété de son état, ce qui n'est pas le cas : on observe et on écrit toujours la même source.

:::cheatsheet
- title: "toRef(obj, 'clé')"
  desc: "Une ref liée à une propriété d'un reactive ; survit à l'absence."
- title: "toRefs(obj)"
  desc: "Toutes les propriétés en refs liées ; pour déstructurer/exposer."
- title: "unref(x) / toValue(x)"
  desc: "Déballe une ref ou un getter ; passe-plat sur une valeur brute."
- title: "isRef(x)"
  desc: "true si x est une ref."
- title: "isProxy(x)"
  desc: "true si x vient de reactive ou readonly."
:::
