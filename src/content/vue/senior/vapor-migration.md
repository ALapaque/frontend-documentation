---
title: "Migrer vers Vapor mode par îlots"
slug: "vapor-migration"
framework: "vue"
level: "senior"
order: 9
duration: 16
prerequisites: ["vapor-mode"]
updated: 2026-11-27
seoTitle: "Migration Vue Vapor mode — adoption incrémentale par composant sans casser l'app"
seoDescription: "Stratégie de migration vers le Vapor mode de Vue 3.6 : opt-in par composant, cohabitation Vapor et Virtual DOM, ce qui est pris en charge ou non, comment cibler les îlots à fort gain et mesurer, sans big-bang."
ogVariant: "sage"
related:
  - { framework: "vue", slug: "vapor-mode" }
  - { framework: "vue", slug: "perf-strategy" }
---

Vapor compile un composant **sans virtual DOM** : moins de mémoire embarquée, des mises à jour branchées plus directement sur le DOM. Le *quoi* et le *pourquoi* sont détaillés dans [/vue/senior/vapor-mode](/vue/senior/vapor-mode) — ne les répétons pas ici. La seule question qui compte sur une app réelle est ailleurs : *comment l'adopter sans tout réécrire*. Personne ne migre une base entière d'un coup, et ce n'est même pas l'usage prévu. Vapor est conçu pour arriver **par îlots**, composant par composant, dans une application qui reste majoritairement en virtual DOM. Cet article traite cette stratégie d'adoption incrémentale : où l'activer, où s'en abstenir, et comment le prouver par la mesure.

## Le modèle d'adoption : opt-in par composant

Vapor ne s'active pas globalement. Il se déclare **par composant**, via l'attribut `vapor` sur `<script setup>` :

```vue
<script setup vapor>
import { ref } from 'vue'
const total = ref(0)
</script>

<template>
  <output @click="total++">{{ total }}</output>
</template>
```

Le code que tu écris est identique à du Vue classique : refs, `computed`, composables. Seule la **sortie du compilateur** change. Rien à réapprendre côté API. `<script vapor>` est un raccourci de `<script setup vapor>`, et l'attribut peut aussi se poser sur `<template vapor>` : il active alors la compilation Vapor pour tout le SFC, y compris un composant à template seul.

Point clé pour une migration : le runtime racine reste ce qu'il est. Une app v-node classique bootstrappée avec `createApp` peut **héberger** des composants Vapor importés normalement — à condition d'installer `vaporInteropPlugin`, la couche d'interop qui fait dialoguer les deux mondes. Sans ce plugin, pas d'îlot Vapor dans une app `createApp()`. Pour une adoption incrémentale, tu gardes ta racine v-node, tu y ajoutes le plugin et tu y greffes des îlots Vapor.

```ts
import { createApp, vaporInteropPlugin } from 'vue'
import App from './App.vue'
// Racine v-node inchangée. Le plugin active la couche d'interop
// qui monte les composants Vapor importés dans l'arbre.
createApp(App).use(vaporInteropPlugin).mount('#app')
```

Un arbre entièrement Vapor démarre, lui, avec `createVaporApp()`. Cette racine n'embarque pas le runtime virtual DOM : c'est là que le gain de bundle est maximal, mais ce n'est pas le point de départ d'une migration. Tu peux y installer `vaporInteropPlugin` pour accueillir des composants v-node, au prix du runtime virtual DOM qui revient dans le bundle.

```ts
import { createVaporApp } from 'vue'
import App from './App.vue'
// App 100 % Vapor : le runtime virtual DOM n'est pas embarqué.
createVaporApp(App).mount('#app')
```

Migrer se fait naturellement **des feuilles vers la racine** : commence par le composant le plus profond de l'îlot, remonte tant que le sous-arbre reste éligible. Un sous-arbre Vapor contigu limite le nombre de frontières à traverser, alors qu'une migration en damier (un composant sur deux) les multiplie.

### La frontière d'interop et son coût

Une fois le plugin installé, l'interop fonctionne dans les deux sens : un composant Vapor peut rendre un enfant v-node (y compris un composant en Options API), et un composant v-node peut monter un enfant Vapor. La beta a aligné les points qui cassaient auparavant : ordre des hooks `mount`/`update`/`unmount`, gestion des slots, passage du contexte de part et d'autre. Les notes de la RC restent prudentes : l'interop couvre l'usage standard des props, des événements et des slots, pas encore tous les cas limites.

Mais franchir la frontière n'est pas gratuit. Chaque passage Vapor↔v-node réintroduit une part de la machinerie v-node (un wrapper d'interop) pour faire cohabiter les deux modèles de rendu. Certains schémas de réactivité des props et des cas limites de slots se comportent différemment selon le côté de la frontière.

:::callout{type="warn"}
Un composant Vapor isolé au milieu d'enfants v-node ne rapporte quasiment rien : le gain est mangé par les allers-retours d'interop. Un îlot doit être un **sous-arbre Vapor cohérent** — la racine de l'îlot et ses descendants — pas un composant esseulé.
:::

## Ce qui n'est pas (encore) pris en charge

Une migration honnête commence par la liste des exclusions, car elle détermine quels composants sont **éligibles**.

- **Options API** : non pris en charge, et l'équipe a acté que ça ne le sera pas. L'analyse statique dont dépend Vapor n'est pas praticable sur l'Options API (propriétés ajoutées au runtime, réactivité profonde par défaut). Un composant en Options API reste en v-node — c'est un fait structurel, pas un chantier en cours.
- **`app.config.globalProperties`** : indisponible dans un composant Vapor. Tout ce qui dépend du proxy d'instance publique reste côté v-node.
- **`getCurrentInstance()`** : renvoie `null` dans un composant Vapor. Vérifie tes composables et tes bibliothèques, beaucoup s'en servent.
- **`v-memo`** : ignoré, le compilateur t'avertit. Idem pour les événements de cycle de vie par élément (`@vue:xxx`).
- **Refs de template sur un composant** : elles n'exposent pas `$el`, `$props`, `$attrs`, `$slots` ni `$refs`.
- **Suspense** : pas de prise en charge en mode Vapor seul. Il passe par l'interop : un composant Vapor peut vivre dans un `<Suspense>` v-node.
- **Teleport, transitions, `KeepAlive`, composants async, hydratation SSR** : absents des premières alphas, pris en charge depuis l'entrée en beta. Les RC y corrigent encore des cas limites : vérifie la version que tu utilises plutôt que de te fier à un article.
- **Directives personnalisées** : interface différente. Une directive Vapor est une fonction qui reçoit le nœud et un **getter réactif** de la valeur, et peut renvoyer une fonction de nettoyage.

Sont donc éligibles : les composants en `<script setup>` (ou à template seul), sans dépendance aux éléments de cette liste, de préférence des feuilles ou des sous-arbres autonomes que tu peux migrer d'un bloc avec leurs descendants.

## Choisir les îlots

Le gain de Vapor est **proportionnel au nombre de nœuds et à la fréquence des mises à jour**. C'est le seul critère de ciblage qui tient.

:::compare
::bad
```text
Mauvais candidats (gain nul, risque non nul) :
- formulaire statique de 8 champs
- header / footer / page marketing
- modale affichée deux fois par session
```
::
::good
```text
Bons candidats (gain mémoire/CPU réel) :
- liste virtualisée de milliers de lignes
- dashboard temps réel qui se rafraîchit en continu
- tableau de données large, tri/filtre côté client
- vue à fort volume de nœuds mise à jour souvent
```
::
:::

**Pourquoi** : sur peu de nœuds mis à jour rarement, le diff v-node ne coûte rien de mesurable — migrer n'apporte aucun gain et ajoute une frontière d'interop plus le risque d'une fonctionnalité pas encore stable. Sur une grosse liste ou un flux temps réel, en revanche, le coût du diff et de la mémoire des v-nodes domine, et c'est exactement ce que Vapor supprime. Réserve Vapor aux endroits où le profil te montre le rendu comme goulot.

Un raccourci utile pour trier tes écrans : demande-toi combien de nœuds vivent dans le sous-arbre, et à quelle fréquence ils changent. Beaucoup de nœuds et beaucoup de changements égale candidat évident. Peu de l'un ou de l'autre égale statu quo. Ce produit — volume par fréquence — prédit le gain bien mieux que l'intuition « ce composant a l'air lourd ».

## Mesurer : avant / après, pas à l'aveugle

Une migration par îlots se justifie par des chiffres, sinon c'est de la mode.

- **Établis une baseline** sur l'îlot encore en v-node : empreinte mémoire (onglet Memory de Chrome DevTools, heap snapshot), temps de mise à jour (profiler des Vue Devtools, panel Performance), FPS sous interaction.
- **Rejoue le même scénario** une fois l'îlot migré en Vapor : même dataset, même charge, mêmes actions. Compare like-for-like.
- **Interprète** : Vapor déplace le curseur sur la mémoire et le coût des updates DOM. Si ton profil pointe ailleurs — réseau, calcul lourd, réactivité profonde — Vapor ne réglera rien. Dans ce cas, `shallowRef`/`markRaw`/`v-memo` (voir [/vue/senior/perf-strategy](/vue/senior/perf-strategy)) sont souvent la vraie réponse avant même d'envisager Vapor.

:::callout{type="tip"}
Migre **un seul** îlot d'abord, mesure, décide ensuite. Un pilote chiffré vaut mieux qu'une conviction. S'il ne montre pas de gain net, l'îlot n'était pas le bon candidat — l'information est utile.
:::

## Pièges

- **Bibliothèques de composants tierces** : la plupart des UI kits sont encore compilés en v-node. Chaque composant tiers dans un îlot Vapor crée une frontière d'interop. Un tableau « Vapor » truffé de composants d'une bibliothèque tierce v-node perd l'essentiel de son intérêt — vise des îlots que tu contrôles, avec peu de dépendances externes.
- **SSR et hydratation** : l'hydratation Vapor est récente, et les RC y corrigent encore des cas limites. Valide explicitement l'hydratation de tes îlots et surveille les *mismatches* serveur/client. Côté Nuxt, la 4.6 (5 octobre 2026) prend en charge Vapor en mode interop : `vue: { vapor: true }` dans `nuxt.config.ts`, racine en virtual DOM, opt-in par composant ou par page, avec Vue `3.6.0-rc.2` au minimum. Nuxt documente des limitations connues : essaie d'abord sur un projet neuf.
- **Délégation d'événements** : depuis la rc.2, les écouteurs sont attachés directement aux éléments, comme en v-node. La délégation au niveau `document` devient une optimisation explicite, via le modificateur `.delegate` propre à Vapor (`@click.delegate="onClick"`). Un handler délégué ne s'exécute pas si un ancêtre appelle `stopPropagation()`. L'option `compilerOptions.eventDelegation` des beta a été supprimée : retire-la de ta config.
- **`slots.default()` n'est pas un test à blanc** : en Vapor, appeler un slot exécute son rendu — création de nœuds DOM, effets réactifs, adoption du DOM SSR pendant l'hydratation. N'appelle pas un slot pour inspecter son contenu avant de décider quoi rendre : laisse le template s'en charger.
- **Outillage** : Devtools, plugins IDE, règles ESLint, harnais de test — le support de Vapor reste inégal. La sortie compilée diffère de celle des v-nodes, et certains outils de debug supposent un arbre v-node. Les hooks devtools des composants Vapor ne sont arrivés qu'en rc.14 (30 octobre 2026), et Vue Router n'a ajouté son mode Vapor qu'en 5.5.2 (26 novembre 2026).
- **Statut RC** : pas de garantie de stabilité tant que la 3.6 n'est pas stable — la rc.2 a encore introduit une rupture. Épingle la version exacte et relis le changelog à chaque montée.

## Recommandation 2026

En novembre 2026, Vue 3.6 est en **Release Candidate** depuis le 18 juillet (`3.6.0-rc.16` publiée le 20 novembre) et Vapor y est annoncé **feature-complete**. La dernière version stable reste la 3.5 (`3.5.46`), et aucune date de sortie stable n'est annoncée à ce jour. L'équipe Vue recommande pour l'instant deux usages : l'adoption partielle dans une app existante — une page sensible à la perf, par exemple — ou une petite app neuve entièrement en Vapor.

Concrètement : n'attends pas un big-bang et n'en organise pas. Sélectionne un ou deux îlots à fort volume de nœuds et d'updates, migre-les d'un bloc avec leurs descendants, mesure avant/après, et garde tout le reste en v-node. Le modèle d'adoption de Vapor est incrémental par conception — c'est sa force, pas une limitation à contourner. Prototyper sur des îlots ciblés donne un gain réel et un risque borné ; réécrire une app entière sur une fonctionnalité encore en RC donne l'inverse.

## À retenir

Vapor s'adopte **par composant** dans une app qui reste majoritairement v-node, avec `vaporInteropPlugin` installé sur la racine. La frontière d'interop coûte, donc migre des sous-arbres cohérents, pas des composants isolés. Seuls les composants en Composition API + `<script setup>` sont éligibles (pas d'Options API ; Suspense passe par l'interop). Cible les zones à fort volume de nœuds et d'updates, mesure avant/après, et laisse en v-node tout ce qui ne prouve pas son gain. En 2026, c'est un chantier de pilotes chiffrés, pas de migration totale.

:::cheatsheet
- title: "Opt-in par composant"
  desc: "`<script setup vapor>` ; racine createApp + vaporInteropPlugin qui héberge des îlots Vapor."
- title: "Éligibilité"
  desc: "Composition API + script setup. Ni Options API, ni globalProperties, ni v-memo ; getCurrentInstance() renvoie null."
- title: "Frontière d'interop"
  desc: "Vapor↔v-node cohabitent, mais chaque passage a un coût : migre par sous-arbre."
- title: "Bons îlots"
  desc: "Grosses listes, dashboards temps réel, tableaux. Pas les formulaires statiques."
- title: "Mesurer"
  desc: "Baseline v-node, puis même scénario en Vapor : mémoire + temps d'update."
- title: "Pièges"
  desc: "UI kits tiers v-node, hydratation SSR récente, outillage inégal, .delegate en opt-in, statut RC."
- title: "Statut 2026"
  desc: "Novembre 2026 : 3.6.0-rc.16, Vapor feature-complete. Dernière stable : 3.5. Pas de date pour la 3.6."
:::
