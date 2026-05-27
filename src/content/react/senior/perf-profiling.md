---
title: "Profiling perf"
slug: "perf-profiling"
framework: "react"
level: "senior"
order: 6
duration: 18
prerequisites: ["memo-callback", "context-perf"]
updated: 2026-05-22
seoTitle: "Profiling perf — react"
seoDescription: "Mesurer avant d'optimiser : React DevTools Profiler, flame charts et ranked charts, why-did-you-render pour traquer les rendus gâchés et leur cause."
ogVariant: "crimson"
related:
  - framework: "vue"
    slug: "perf-strategy"
  - framework: "angular"
    slug: "perf-toolkit"
---

La règle d'or de la perf React : mesurer avant d'optimiser. Saupoudrer des `memo` au jugé dégrade la lisibilité sans garantie de gain, et peut même coûter (comparaison de props à chaque rendu). Le Profiler dit *où* le temps part et *pourquoi* un composant a re-rendu ; why-did-you-render dit *quelle prop* a cassé la mémoïsation.

## React DevTools Profiler

Onglet Profiler des React DevTools : on enregistre une interaction, on obtient un commit par mise à jour, avec la durée de rendu de chaque composant. Active « Record why each component rendered » dans les réglages : chaque composant affiche alors sa raison de re-rendu (props changées, state, hook, parent re-rendu).

- **Flame chart** : l'arbre des composants pour un commit, largeur = temps de rendu. Lire la hiérarchie et repérer le sous-arbre coûteux.
- **Ranked chart** : les composants triés par durée, à plat. Va droit au plus cher du commit.
- **Commits** : la barre de commits en haut ; les pics colorés signalent les mises à jour lourdes.

```tsx
// Mesure programmatique d'un sous-arbre
<Profiler id="Liste" onRender={(id, phase, actualDuration) => {
  // phase: "mount" | "update", actualDuration en ms
  if (actualDuration > 16) log({ id, phase, actualDuration });
}}>
  <Liste items={items} />
</Profiler>
```

`actualDuration > 16` cible ce qui dépasse un budget de 60 fps. Le `<Profiler>` programmatique sert à instrumenter un chemin chaud en CI ou en prod-like, sans ouvrir les DevTools.

## Le rendu gâché : compare

:::compare
::bad
```tsx
function Parent() {
  const [n, setN] = useState(0);
  // nouvelle fonction + nouvel objet à CHAQUE rendu du Parent
  return (
    <Enfant
      onClick={() => doStuff()}
      config={{ mode: "dark" }}
    />
  );
}
const Enfant = memo(function Enfant({ onClick, config }) {
  return <Lourd onClick={onClick} config={config} />;
});
```
::
::good
```tsx
function Parent() {
  const [n, setN] = useState(0);
  const onClick = useCallback(() => doStuff(), []);
  const config = useMemo(() => ({ mode: "dark" }), []);
  return <Enfant onClick={onClick} config={config} />;
}
const Enfant = memo(function Enfant({ onClick, config }) {
  return <Lourd onClick={onClick} config={config} />;
});
```
::
:::

**Pourquoi** : `memo` compare les props par identité (`Object.is`) pour décider de sauter le re-rendu. Dans la mauvaise version, `() => doStuff()` et `{ mode: "dark" }` sont recréés à chaque rendu du `Parent` : nouvelles références, donc `memo` voit des props « changées » et re-rend `Enfant` (et `Lourd`) inutilement à chaque incrément de `n`, alors que rien de pertinent n'a bougé. C'est un *rendu gâché* : du travail de réconciliation sans changement de sortie. `useCallback`/`useMemo` stabilisent les références sur des dépendances vides, `memo` retrouve l'égalité et saute le sous-arbre. Le mécanisme est l'identité référentielle des props, pas le `memo` seul — `memo` sans props stables ne sert à rien.

## why-did-you-render

`@welldone-software/why-did-you-render` (ou le React Compiler ESLint en amont) loggue en dev *pourquoi* un composant suivi a re-rendu, en pointant la prop dont l'identité a changé alors que sa valeur est égale. C'est l'outil qui transforme « ça re-rend trop » en « cette prop `config` est un objet recréé ligne 14 ».

```tsx
if (process.env.NODE_ENV === "development") {
  const wdyr = require("@welldone-software/why-did-you-render");
  wdyr(React, { trackAllPureComponents: true });
}
```

:::callout{type="warn"}
N'optimise jamais à l'aveugle. Ouvre le Profiler, identifie le commit lent, lis la raison du re-rendu, puis cible. Beaucoup de re-rendus sont bénins (composants peu coûteux) : optimiser un composant rapide ajoute du code et de la comparaison pour zéro gain. Le React Compiler (voir `compiler`) automatise une grande partie de la mémoïsation : avant d'ajouter `useMemo`/`useCallback` à la main, vérifie s'il est actif.
:::

## Code source

Le Profiler s'appuie sur le mode profiling de React (`react-dom/profiling`) qui enregistre `actualDuration`/`baseDuration` par fiber via le scheduler. Composant `<Profiler>` : `react.dev/reference/react/Profiler`. L'extension : dépôt `facebook/react`, `packages/react-devtools-shared` et `packages/react-devtools-extensions`. Le commentaire « how DevTools computes commit durations » et l'API `unstable_Profiler` documentent les phases. why-did-you-render : `welldone-software/why-did-you-render`. Pour comprendre quand React saute un rendu, lire `bailoutOnAlreadyFinishedWork` et la comparaison de props de `memo` dans `packages/react-reconciler/src/ReactFiberBeginWork.js`.

## À retenir

:::cheatsheet
- title: "Mesurer d'abord"
  desc: "Profiler + 'why each component rendered' avant tout memo ; pas d'optimisation à l'aveugle."
- title: "Flame vs ranked"
  desc: "Flame = hiérarchie et sous-arbre coûteux ; ranked = top des composants les plus lents."
- title: "Rendu gâché"
  desc: "memo + props recréées (objet/fonction inline) = re-rendu inutile ; stabiliser les références."
- title: "why-did-you-render"
  desc: "Pointe la prop dont l'identité change à valeur égale ; transforme un soupçon en cause."
:::
