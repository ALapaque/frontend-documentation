---
title: "Réactivité superficielle : shallowRef et markRaw"
slug: "shallow-reactivity"
framework: "vue"
level: "medior"
order: 12
duration: 15
prerequisites: ["reactivity-deep"]
updated: 2026-07-09
seoTitle: "shallowRef, shallowReactive, markRaw — dompter la réactivité profonde de Vue"
seoDescription: "Quand la réactivité profonde de Vue coûte cher : shallowRef, shallowReactive, triggerRef, markRaw et toRaw pour les grosses structures, les instances de classe et l'intégration de bibliothèques externes (carte, éditeur, graphe)."
ogVariant: "sage"
related:
  - { framework: "vue", slug: "reactivity-deep" }
  - { framework: "vue", slug: "perf-strategy" }
---

`ref` et `reactive` construisent un proxy *profond* : dès que Vue rencontre un objet imbriqué, il le re-wrappe récursivement dans son propre Proxy, et ainsi de suite jusqu'aux feuilles. C'est ce qui rend la DX magique — muter `etat.user.address.city` déclenche un rendu sans que tu aies rien câblé. Mais cette conversion récursive a un prix : chaque objet touché devient un Proxy, chaque accès traverse un intercepteur, et la première lecture d'une grosse structure la convertit d'un coup.

Sur un tableau de dix mille lignes, une réponse d'API que tu ne fais que remplacer, ou une instance de classe issue d'une bibliothèque externe, cette profondeur est au mieux inutile, au pire nuisible. Vue expose alors des outils pour dire « arrête-toi ici » : `shallowRef`, `shallowReactive`, `markRaw`, plus `triggerRef` et `toRaw`. Le principe reste le même : réactivité profonde par défaut, superficielle quand tu mesures un coût ou quand tu intègres du non-Vue.

## Le coût de la profondeur

`reactive({ a: { b: { c: 1 } } })` ne crée pas un Proxy, mais trois — un par niveau, à la demande. Tant que la structure est petite, personne ne le remarque. Le problème apparaît sur deux profils :

- **Les grosses structures figées** : une liste de résultats, un cache, un gros JSON. Tu la remplaces en bloc mais tu ne mutes jamais l'intérieur. Payer la conversion récursive de chaque nœud pour un suivi inutilisé est du gaspillage.
- **Les objets non-Vue** : une instance de classe, un client réseau, un objet d'une bibliothèque tierce. Les envelopper dans un Proxy peut casser leur fonctionnement (voir `markRaw`).

```ts
// 10 000 lignes, chacune re-wrappée en Proxy à la première lecture
const lignes = reactive(await fetch('/api/rows').then(r => r.json()))
```

## shallowRef : réactif au remplacement, pas à la mutation

`shallowRef` crée une ref dont **seul le remplacement de `.value`** est suivi. Le contenu, lui, n'est jamais converti : Vue ne touche pas à l'objet stocké.

```ts
import { shallowRef } from 'vue'

const data = shallowRef({ items: [], page: 1 })
data.value = { items: [/* ... */], page: 2 } // ✅ déclenche un rendu
data.value.page = 3                          // ❌ aucun rendu (mutation interne)
```

C'est le bon choix quand tu tiens un gros objet **immuable côté Vue** que tu remplaces en entier : réponse d'API, snapshot d'un store externe, résultat de calcul. Tu gardes la réactivité utile (« la donnée a changé, re-rends ») sans payer la conversion récursive ni les proxies imbriqués.

:::callout{type="tip"}
La règle mentale : `shallowRef` suit l'**identité** de `.value`, pas son **état interne**. Si ton flux consiste à toujours réassigner `.value` avec un nouvel objet (pattern immuable), `shallowRef` te fait gagner la conversion profonde sans rien changer d'autre.
:::

## triggerRef : forcer le déclenchement après une mutation interne

Parfois tu mutes volontairement l'intérieur d'un `shallowRef` — pour éviter de recréer un gros objet à chaque frame, par exemple. Vue ne voit rien, puisqu'il ne suit pas l'intérieur. `triggerRef` force alors un déclenchement manuel :

```ts
import { shallowRef, triggerRef } from 'vue'

const buffer = shallowRef({ points: new Float32Array(1_000_000) })

function pousser(x: number) {
  buffer.value.points[curseur++] = x // mutation interne, non suivie
}
function commit() {
  triggerRef(buffer) // ← « j'ai muté l'intérieur, re-rends maintenant »
}
```

Le pattern est explicite : tu mutes en lot dans une boucle chaude, puis tu déclenches un seul rendu au bon moment. Tu récupères le contrôle fin du timing, au prix d'un déclenchement que tu poses toi-même.

## shallowReactive : réactif au premier niveau seulement

`shallowReactive` est à `reactive` ce que `shallowRef` est à `ref` : les propriétés de **premier niveau** sont suivies, leurs valeurs imbriquées restent brutes. Utile pour un état plat dont les valeurs sont de gros objets opaques que tu remplaces par référence plutôt que tu ne mutes en place.

```ts
import { shallowReactive } from 'vue'

const etat = shallowReactive({
  page: 1,           // suivi
  filtres: { q: '' } // objet brut, non suivi en profondeur
})

etat.page = 2             // ✅ déclenche un rendu
etat.filtres = { q: 'x' } // ✅ remplacement d'une prop de niveau 1
etat.filtres.q = 'x'      // ❌ mutation profonde, non suivie
```

## markRaw : « ne rends jamais ceci réactif »

`markRaw(obj)` pose un drapeau sur un objet pour que Vue **refuse définitivement** de le convertir en Proxy, même s'il se retrouve à l'intérieur d'un `reactive` profond. C'est l'outil décisif pour les instances de bibliothèques externes.

Pourquoi c'est crucial : un Proxy intercepte chaque accès de propriété. Une instance de carte, d'éditeur ou de graphe repose sur des invariants qu'un Proxy casse :

- son `this` interne peut ne plus correspondre à l'objet attendu par ses méthodes ;
- ses champs `#private` (vrais champs privés de classe) lèvent une `TypeError` quand on y accède à travers un Proxy ;
- elle garde souvent des références internes vers elle-même, ce qui provoque des **boucles de conversion** ou des comparaisons d'identité qui échouent.

:::compare
::bad
```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Map } from 'maplibre-gl'
// La carte devient un Proxy profond : this cassé, #private en erreur,
// et Vue tente de suivre des centaines de propriétés internes.
const carte = ref<Map>()
onMounted(() => {
  carte.value = new Map({ container: 'map' })
})
</script>
```
::
::good
```vue
<script setup lang="ts">
import { shallowRef, markRaw, onMounted, onUnmounted } from 'vue'
import { Map } from 'maplibre-gl'
// shallowRef : on suit « la carte existe / a été remplacée », rien de plus.
// markRaw : l'instance ne sera JAMAIS enveloppée dans un Proxy.
const carte = shallowRef<Map>()
onMounted(() => {
  carte.value = markRaw(new Map({ container: 'map' }))
})
onUnmounted(() => {
  carte.value?.remove()
})
</script>
```
::
:::

Le duo `shallowRef(markRaw(instance))` est le pattern canonique pour héberger une instance de carte (Leaflet, MapLibre, Mapbox), un éditeur (CodeMirror, Monaco) ou une instance de graphe dans un composant. `shallowRef` évite le suivi profond, `markRaw` garantit que l'objet reste intact même si un jour il transite par un `reactive`.

:::callout{type="warn"}
`markRaw` est irréversible et non transitif au sens où il protège l'objet marqué, pas forcément les nouveaux objets qu'il crée. Ne marque que ce qui doit rester brut. Et surtout : ne mets jamais un objet `markRaw` là où tu comptes sur la réactivité de son contenu — c'est un contrat « objet opaque », pas une optimisation gratuite.
:::

## toRaw : récupérer l'objet original derrière le Proxy

`toRaw(proxy)` renvoie l'objet brut d'origine que Vue avait enveloppé. Deux usages concrets :

```ts
import { reactive, toRaw } from 'vue'

const etat = reactive({ id: 1 })

// 1. Passer l'objet nu à une API qui n'attend pas un Proxy
//    (structuredClone, postMessage vers un worker, sérialiseur strict).
sauvegarder(toRaw(etat))
// 2. Comparer par identité : un Proxy n'est jamais === à sa source brute.
toRaw(etat) === etat // false, mais toRaw(etat) est bien l'objet d'origine
```

Certaines bibliothèques (IndexedDB via `structuredClone`, workers via `postMessage`, sérialiseurs) refusent un Proxy ou copient des propriétés inattendues. `toRaw` te rend l'objet nu juste avant la frontière avec le monde non-Vue. Ne le stocke pas pour muter dans le dos de Vue — utilise-le ponctuellement, au point de sortie.

## La règle pratique

Le défaut reste la réactivité profonde : simple, prévisible, elle couvre l'immense majorité des cas. Ne bascule en superficiel que pour une raison précise :

- Tu as **mesuré** un coût (conversion d'une grosse structure, rendu lent) → `shallowRef` / `shallowReactive`.
- Tu intègres un objet **non-Vue** dont la réactivité serait inutile ou destructrice → `shallowRef(markRaw(...))`.
- Tu franchis une frontière vers une **API externe** stricte → `toRaw` au point de passage.

Semer des `shallowRef` partout à l'aveugle ne fait qu'ajouter des `triggerRef` manuels et des bugs de rendu manquant. La superficialité est un outil de précision, pas un réglage par défaut.

## À retenir

:::cheatsheet
- title: "Profond par défaut"
  desc: "ref/reactive re-wrappent récursivement tout objet imbriqué ; garde-les tant que tu ne mesures pas de coût."
- title: "shallowRef(x)"
  desc: "Seul le remplacement de .value est réactif ; parfait pour un gros objet qu'on remplace en bloc."
- title: "triggerRef(r)"
  desc: "Force un déclenchement après une mutation interne volontaire d'un shallowRef."
- title: "shallowReactive(obj)"
  desc: "Réactif au premier niveau seulement ; les valeurs imbriquées restent brutes."
- title: "markRaw(obj)"
  desc: "Interdit définitivement la conversion en Proxy ; indispensable pour carte, éditeur, instance de classe."
- title: "shallowRef(markRaw(instance))"
  desc: "Le duo canonique pour héberger une bibliothèque externe sans casser son this ni ses #private."
- title: "toRaw(proxy)"
  desc: "Rend l'objet original avant de le passer à une API externe ou de comparer par identité."
:::
