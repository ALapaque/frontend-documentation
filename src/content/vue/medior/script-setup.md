---
title: "<script setup>"
slug: "script-setup"
framework: "vue"
level: "medior"
order: 7
duration: 13
prerequisites: ["composition-vs-options", "components-props"]
updated: 2026-05-22
seoTitle: "<script setup> — vue"
seoDescription: "<script setup> : sucre de compilation, bindings top-level exposés au template, macros defineProps/defineEmits/defineExpose, et ce qui change face à setup() classique."
ogVariant: "gold"
related:
  - framework: "react"
    slug: "hooks-rules"
  - framework: "angular"
    slug: "standalone"
---

`<script setup>` est la forme par défaut d'un composant Vue 3 moderne. Ce n'est pas une nouvelle API mais un sucre de compilation autour de la fonction `setup()` : le compilateur transforme le contenu du bloc en un `setup()` classique, en supprimant le boilerplate de déclaration et de retour. Résultat : moins de code, meilleur typage, et de meilleures perfs au runtime.

## Le boilerplate disparaît

En `setup()` classique, tout ce qu'on veut utiliser dans le template doit être retourné explicitement. C'est répétitif et facile à oublier.

:::compare
::bad
```vue
<script>
import { ref } from 'vue'
export default {
  setup() {
    const count = ref(0)
    function inc() { count.value++ }
    return { count, inc } // oubli = "count is not defined" au template
  },
}
</script>
```
::
::good
```vue
<script setup>
import { ref } from 'vue'
const count = ref(0)
function inc() { count.value++ }
</script>
```
::
:::

**Pourquoi** : avec `<script setup>`, le compilateur traite chaque déclaration top-level (variable, fonction, import) comme un binding automatiquement exposé au template — il génère le `return` à ta place. La version `setup()` t'oblige à maintenir manuellement la liste des bindings retournés : tout oubli devient une erreur silencieuse au rendu, et le `return` grossit avec le composant. Le sucre élimine cette surface d'erreur. Bonus : le compilateur connaît statiquement les bindings, ce qui lui permet d'inliner le rendu sans passer par un proxy d'instance — d'où un léger gain runtime que `setup()` classique n'a pas.

## Bindings top-level dans le template

Toute liaison déclarée au premier niveau du script est visible dans le template : variables, fonctions, composants importés. Pas d'enregistrement de composant, pas de `components: {}`.

```vue
<script setup>
import Carte from './Carte.vue'   // utilisable directement, sans déclarer
import { ref, computed } from 'vue'

const items = ref([1, 2, 3])
const total = computed(() => items.value.reduce((a, b) => a + b, 0))
</script>

<template>
  <Carte v-for="i in items" :key="i" :valeur="i" />
  <p>Total : {{ total }}</p>
</template>
```

Importer `Carte` suffit pour l'utiliser comme balise : le compilateur résout les composants à partir des bindings du script. Idem pour les directives personnalisées (convention `vNomDirective`).

## Les macros de compilation

`defineProps`, `defineEmits`, `defineModel`, `defineExpose` ne sont pas des fonctions importées : ce sont des macros traitées à la compilation, disponibles uniquement dans `<script setup>`.

```vue
<script setup lang="ts">
// Props typées par génériques — pas d'objet de validation runtime
const props = defineProps<{ label: string; count?: number }>()

const emit = defineEmits<{
  (e: 'update', value: number): void
}>()

// withDefaults pour des valeurs par défaut typées
function inc() { emit('update', (props.count ?? 0) + 1) }
</script>
```

La forme générique `defineProps<{...}>()` donne un typage statique complet sans déclaration runtime redondante. `defineEmits<{...}>()` type le nom de l'évènement et son payload : `emit('updte', ...)` devient une erreur de compilation.

## defineExpose : l'instance est fermée par défaut

Un composant `<script setup>` ne expose rien à son parent via `ref` de template — contrairement à un composant Options où tout le `this` était accessible. Pour exposer délibérément une méthode ou un état, on utilise `defineExpose`.

```vue
<!-- Modale.vue -->
<script setup>
import { ref } from 'vue'
const ouverte = ref(false)
function ouvrir() { ouverte.value = true }

defineExpose({ ouvrir }) // seul 'ouvrir' est visible du parent
</script>
```

```vue
<!-- Parent.vue -->
<script setup>
import { ref } from 'vue'
import Modale from './Modale.vue'
const modale = ref()
// modale.value.ouvrir() fonctionne ; modale.value.ouverte est inaccessible
</script>

<template>
  <Modale ref="modale" />
  <button @click="modale.ouvrir()">Ouvrir</button>
</template>
```

Par défaut l'instance est close : c'est de l'encapsulation. Le parent ne peut atteindre que ce qui est explicitement exposé. Cela force une API publique nette et empêche le parent de dépendre de détails internes.

### Idée reçue : « <script setup> a un coût runtime, ce n'est que du raccourci d'écriture »

L'inverse. `<script setup>` est généralement *plus* rapide que `setup()` classique. Le compilateur connaît tous les bindings de façon statique : il peut générer une fonction de rendu qui référence directement les variables (rendu inliné) au lieu de lire les propriétés sur un objet de contexte renvoyé. Il sait aussi quels composants/directives sont réellement utilisés. Le « sucre » est donc résolu entièrement à la compilation : à l'exécution, il ne reste que du code optimisé, sans surcoût d'abstraction. Le seul vrai compromis : `<script setup>` impose une logique de composant ; pour des cas rares (logique de composant générée dynamiquement), on revient à `setup()` ou à un second bloc `<script>` normal à côté.

:::callout{type="info"}
On peut combiner un `<script setup>` avec un `<script>` classique adjacent, utile pour des options qui ne passent pas par les macros (par ex. `inheritAttrs`, ou exporter des constantes au niveau module).
:::

:::cheatsheet
- title: "Bindings top-level"
  desc: "Variables, fonctions, composants importés exposés au template sans return."
- title: "defineProps / defineEmits"
  desc: "Macros compile-time ; forme générique <{...}> pour le typage TS."
- title: "defineModel"
  desc: "v-model côté composant ; renvoie une ref liée au parent."
- title: "defineExpose"
  desc: "Instance close par défaut ; expose explicitement au parent via ref."
- title: "Gain perf"
  desc: "Rendu inliné, bindings statiques : plus rapide que setup() classique."
:::
