---
title: "Context & perf"
slug: "context-perf"
framework: "react"
level: "medior"
order: 2
duration: 15
prerequisites: ["lifting-state", "memo-callback", "hooks-rules"]
updated: 2026-05-22
seoTitle: "Context & perf — react"
seoDescription: "Pourquoi tous les consommateurs d'un Context re-rendent quand sa value change, et comment limiter la casse : découper les contextes et mémoïser la value."
ogVariant: "gold"
related:
  - framework: "vue"
    slug: "provide-inject"
  - framework: "angular"
    slug: "dependency-injection"
---

`useContext` résout le « prop drilling » mais introduit un piège de performance discret : un Context n'a pas de sélecteur. Quand sa `value` change, **tous** les composants qui consomment ce Context re-rendent, qu'ils utilisent ou non la partie qui a bougé.

## Le mécanisme du re-rendu

Quand la `value` passée à un `<Context.Provider>` change (au sens d'identité référentielle, `Object.is`), React parcourt l'arbre et re-rend chaque consommateur via `useContext`. Il n'y a pas de comparaison fine champ par champ : c'est tout ou rien sur la valeur entière.

```tsx
const AppContext = createContext<{ user: User; theme: Theme } | null>(null);

function Provider({ children }) {
  const [user, setUser] = useState(initialUser);
  const [theme, setTheme] = useState<Theme>("light");
  // Changer le thème re-rend AUSSI tous les lecteurs de user
  return (
    <AppContext.Provider value={{ user, theme, setUser, setTheme }}>
      {children}
    </AppContext.Provider>
  );
}
```

Un composant qui ne lit que `theme` re-rendra parce que `user` a changé : il consomme la même `value` globale.

## Piège n°1 : la value recréée à chaque rendu

:::compare
::bad
```tsx
function Provider({ children }) {
  const [user, setUser] = useState(initialUser);
  // nouvel objet à CHAQUE rendu du Provider
  return (
    <AppContext.Provider value={{ user, setUser }}>
      {children}
    </AppContext.Provider>
  );
}
```
::
::good
```tsx
function Provider({ children }) {
  const [user, setUser] = useState(initialUser);
  const value = useMemo(() => ({ user, setUser }), [user]);
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
```
::
:::

**Pourquoi** : `{ user, setUser }` est un littéral d'objet, donc une **nouvelle référence à chaque rendu** du Provider. React compare l'ancienne et la nouvelle `value` par identité (`Object.is`) ; deux objets distincts ne sont jamais égaux, donc tous les consommateurs re-rendent même quand `user` n'a pas bougé — par exemple si le Provider re-rend pour une raison externe. Le `useMemo` stabilise la référence : tant que `user` est inchangé, `value` reste le même objet, l'identité est préservée, et React saute la propagation aux consommateurs. C'est de l'identité référentielle, pas une optimisation magique.

## Piège n°2 : un seul gros Context

Regrouper tout l'état applicatif dans un Context unique force des re-rendus croisés. La parade : **découper par fréquence de changement**.

```tsx
// Sépare ce qui change souvent de ce qui est quasi statique
const UserContext = createContext<UserCtx | null>(null);
const ThemeContext = createContext<ThemeCtx | null>(null);
```

Mieux : séparer l'**état** de l'**API de mise à jour**. Le dispatcher (`setUser`, `dispatch`) ne change jamais : on peut le placer dans son propre Context, que les composants n'émettant que des actions consomment sans jamais re-rendre.

## Idée reçue : « useContext provoque des re-rendus, donc c'est lent »

Faux dans sa formulation. Ce n'est pas la **lecture** via `useContext` qui coûte, c'est le **changement de la value** combiné à l'absence de granularité. Lire un Context dont la value est stable ne coûte rien. Le problème survient quand on met dans un seul Context une value mal mémoïsée ou qui mélange des données à fréquences de changement différentes. Context reste un mécanisme de **transport de dépendances**, pas un store optimisé pour des mises à jour fréquentes. Pour de l'état qui mute beaucoup avec beaucoup d'abonnés sélectifs, un store externe (Zustand, Jotai, Redux) avec sélecteurs est l'outil adapté — voir le module d'architecture du state.

## À retenir

:::cheatsheet
- title: "Tout ou rien"
  desc: "Une value qui change re-rend TOUS les consommateurs, sans sélecteur."
- title: "Mémoïser la value"
  desc: "useMemo sur l'objet passé au Provider pour préserver l'identité référentielle."
- title: "Découper"
  desc: "Un Context par fréquence de changement ; séparer état et dispatch."
- title: "Pas un store"
  desc: "Pour des mises à jour fréquentes et sélectives, préférer un store avec sélecteurs."
:::
