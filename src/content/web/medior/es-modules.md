---
title: "Les modules ES : import, export et code splitting"
slug: "es-modules"
framework: "web"
level: "medior"
order: 5
duration: 15
prerequisites: []
updated: 2026-05-23
seoTitle: "ES Modules : import/export, import() dynamique, type=module et top-level await"
seoDescription: "Maîtriser les ES Modules : exports nommés vs default, modules statiques vs import() dynamique pour le code splitting, type=module (defer, strict, scope), top-level await, import maps et ESM vs CommonJS."
ogVariant: "gold"
related:
  - { framework: "web", slug: "fetch" }
---

Les **ES Modules** (ESM) sont le système de modules natif du langage et du navigateur. Leur trait fondamental, qui explique tout le reste : le graphe de dépendances est **statique et analysable avant exécution**. Le moteur lit les `import`/`export` sans lancer le code, construit le graphe, puis exécute. C'est ce qui rend possibles le tree-shaking, le préchargement et le bundling intelligent.

## import et export : nommés vs default

Un module **exporte** des liaisons et en **importe** d'autres. Deux formes coexistent.

```js
// math.js
export const PI = 3.14159;          // export nommé
export function add(a, b) { return a + b; }
export default function square(x) {  // export par défaut : un seul par module
  return x * x;
}
```

```js
// app.js
import square, { PI, add } from "./math.js";
import { add as addition } from "./math.js"; // renommage
import * as math from "./math.js";            // namespace
```

Les **exports nommés** sont identifiés par leur nom (et donc tree-shakables précisément) ; le **default** est anonyme à l'export et nommé librement à l'import. Préfère les exports nommés : ils donnent des noms stables, des imports auto-complétables et un meilleur tree-shaking.

Point de mécanisme souvent ignoré : les imports sont des **liaisons vivantes** (live bindings), pas des copies. Si un module réassigne une variable exportée, l'importateur voit la nouvelle valeur. En CommonJS, `require` copie la valeur au moment de l'appel.

## Modules statiques vs import() dynamique

L'`import` statique est résolu **avant l'exécution** : il doit être au top-level, sa source est une string littérale, et il bloque l'exécution du module tant que la dépendance n'est pas chargée. L'`import()` dynamique, lui, est une **fonction** qui renvoie une **Promise** et charge à la demande, à l'exécution.

:::compare
::bad
```js
import { Chart } from "./heavy-chart.js"; // 300 Ko chargés au démarrage

button.addEventListener("click", () => {
  render(new Chart()); // alors qu'on n'en a besoin qu'au clic
});
```
::
::good
```js
button.addEventListener("click", async () => {
  const { Chart } = await import("./heavy-chart.js"); // chargé au clic
  render(new Chart());
});
```
::
:::

**Pourquoi.** L'`import` statique fait partie du graphe **résolu au chargement** : le bundler l'inclut dans le bundle initial et le navigateur le télécharge avant que ton app démarre, même si l'utilisateur ne clique jamais. L'`import()` dynamique crée un **point de découpe** (code splitting) : le bundler en fait un chunk séparé, téléchargé seulement quand la Promise est appelée. Tu réduis ainsi le coût d'amorçage. C'est le mécanisme derrière le lazy-loading de routes.

## type="module" : ce que ça change

Charger un script avec `<script type="module">` n'est pas qu'un drapeau de syntaxe : ça modifie trois comportements.

```html
<script type="module" src="/app.js"></script>
```

- **Defer par défaut.** Un module est non-bloquant : il se télécharge en parallèle du parsing HTML et s'exécute après, dans l'ordre du document. Pas besoin de `defer` explicite.
- **Strict mode automatique.** Pas de `this` global, pas de variables implicites, erreurs sur les doublons.
- **Scope propre.** Les variables top-level d'un module sont **locales au module**, pas globales. Deux modules peuvent déclarer `const config` sans collision. Pour partager, on exporte/importe — explicitement.

:::callout{type="info"}
Dans le navigateur, l'`import` statique exige un **spécificateur complet** : `"./math.js"` avec l'extension, pas `"math"`. Les noms nus (`import x from "lodash"`) ne sont résolus que par un bundler ou via une **import map** (voir plus bas).
:::

## Top-level await

Dans un module, tu peux écrire `await` **au niveau supérieur**, sans fonction `async` englobante. Le module devient alors **asynchrone** : tout module qui l'importe attend sa résolution avant de s'exécuter.

```js
// config.js
const res = await fetch("/config.json");
export const config = await res.json();
```

C'est puissant pour l'initialisation (charger une config, attendre une connexion DB), mais ça **propage l'attente** dans le graphe : un top-level await lent en racine retarde tout le reste. À utiliser pour de l'init essentielle, pas pour de la donnée optionnelle.

## Import maps

Une **import map** déclare comment résoudre les spécificateurs nus directement dans le navigateur, sans bundler. Elle associe un nom à une URL.

```html
<script type="importmap">
{
  "imports": {
    "lodash-es": "https://cdn.example.com/lodash-es@4/lodash.js"
  }
}
</script>
<script type="module">
  import { debounce } from "lodash-es"; // résolu via la map
</script>
```

Utile pour servir de l'ESM sans étape de build, ou pour épingler/remplacer une version centralement.

## ESM vs CommonJS en bref

CommonJS (`require`/`module.exports`) est l'ancien système de Node : **synchrone** (require lit et exécute le fichier sur place) et **dynamique** (la résolution se fait à l'exécution, donc pas de tree-shaking statique fiable). ESM est **asynchrone, statique et standard** sur navigateur comme sur Node récent. En 2026, l'ESM est le défaut partout ; on ne croise CommonJS que dans du legacy ou via interop.

:::cheatsheet
- title: "export nommé"
  desc: "plusieurs par module, tree-shakable, à préférer"
- title: "export default"
  desc: "un seul par module, renommé librement à l'import"
- title: "import() dynamique"
  desc: "Promise, à la demande, crée un chunk : code splitting"
- title: "type=module"
  desc: "defer par défaut, strict mode, scope local au module"
- title: "top-level await"
  desc: "await sans async ; rend le module asynchrone, propage l'attente"
- title: "import map"
  desc: "résoudre les noms nus dans le navigateur sans bundler"
:::
