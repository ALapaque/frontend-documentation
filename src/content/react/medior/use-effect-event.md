---
title: "useEffectEvent"
slug: "use-effect-event"
framework: "react"
level: "medior"
order: 9
duration: 12
prerequisites: ["effects-basics", "hooks-rules"]
updated: 2026-05-23
seoTitle: "React useEffectEvent — events non réactifs dans les effets"
seoDescription: "useEffectEvent (stable en 19.2) : lire les dernières props/state dans un effet sans les ajouter aux dépendances, et sans re-déclencher l'effet."
ogVariant: "gold"
related:
  - { framework: "react", slug: "effects-basics" }
  - { framework: "react", slug: "memo-callback" }
---

`useEffectEvent` est **stable depuis React 19.2** (après un long passage sous le
nom `useEffectEvent` en canary). Il résout un conflit récurrent : un effet a
besoin de **lire** une valeur à jour, mais cette valeur ne doit **pas** faire
partie de ses dépendances, sinon l'effet se re-déclenche pour rien.

## Le problème : réactif vs « juste lu »

Un effet est **réactif** : il se ré-exécute (teardown + setup) quand l'une de ses
dépendances change. C'est voulu pour ce qui définit la connexion — un `roomId`,
une URL. Mais certaines valeurs sont seulement **consultées au moment où un
événement se produit** : un `theme` pour styler une notification, un callback
fourni par le parent. Tu veux la **dernière** valeur, pas re-créer la connexion
quand elle change.

```tsx
function ChatRoom({ roomId, theme }) {
  useEffect(() => {
    const conn = connect(roomId);
    conn.on("connected", () => showToast("Connecté !", theme));
    return () => conn.close();
  }, [roomId, theme]); // theme ici reconnecte à chaque changement de thème
}
```

Changer le thème ferme et rouvre la connexion : effet de bord absurde. Le linter
`react-hooks/exhaustive-deps` t'oblige pourtant à lister `theme`, parce que tu le
lis dans le corps de l'effet.

## La solution : extraire la partie « événement »

`useEffectEvent` enveloppe la logique non réactive. La fonction retournée lit
**toujours les dernières** props/state au moment de son appel, mais **n'est pas
réactive** : tu ne la mets pas dans les deps, et l'effet ne se re-déclenche pas
quand les valeurs qu'elle lit changent.

:::compare
::bad
```tsx
function ChatRoom({ roomId, theme }) {
  useEffect(() => {
    const conn = connect(roomId);
    conn.on("connected", () => showToast("Connecté !", theme));
    return () => conn.close();
  }, [roomId, theme]); // reconnecte à chaque changement de theme
}
```
::
::good
```tsx
function ChatRoom({ roomId, theme }) {
  const onConnected = useEffectEvent(() => {
    showToast("Connecté !", theme); // lit le theme à jour, sans dépendance
  });
  useEffect(() => {
    const conn = connect(roomId);
    conn.on("connected", () => onConnected());
    return () => conn.close();
  }, [roomId]); // reconnecte UNIQUEMENT si roomId change
}
```
::
:::

**Pourquoi.** Le linter exige `theme` dans les deps parce que l'effet le lit
directement : impossible de mentir au tableau de deps sans casser la
correspondance. `useEffectEvent` déplace la lecture hors du périmètre réactif —
`onConnected` est un Effect Event, traité spécialement par React et le plugin
ESLint : il n'a **pas** à figurer dans les deps et capture toujours la valeur la
plus récente. Tu sépares ainsi proprement le **réactif** (`roomId`, qui définit
*quand* reconnecter) du **non réactif** (`theme`, *ce qu'on lit* quand l'event
arrive).

## Ce que ça résout vraiment : la stale closure

Le piège alternatif, c'est de retirer `theme` des deps « à la main ». L'effet ne
reconnecte plus, mais il **fige** la closure : le handler garde le `theme` du
rendu où l'effet a tourné, et affiche un thème périmé après changement. C'est une
**stale closure** classique.

:::callout{type="warn"}
Retirer une valeur des deps pour « éviter de reconnecter » introduit une stale
closure : le code lit la valeur capturée au montage, pas la valeur actuelle. C'est
exactement le bug que `useEffectEvent` élimine — il garantit la **dernière**
valeur sans la rendre réactive.
:::

`useEffectEvent` n'a pas de closure figée : React garde en interne une référence
vers la dernière version de la fonction (re-pointée à chaque rendu via un layout
effect), si bien que l'appel lit le state/props du rendu courant.

## Les règles

- **Appelle un Effect Event uniquement depuis l'intérieur d'un effet** (ou d'un
  handler appelé par l'effet). Pas dans le corps de rendu, pas ailleurs.
- **Ne le passe jamais en prop** ni à un autre hook. Il est local au composant
  qui le déclare ; le sortir casse la garantie « dernière valeur » et son lien
  avec le cycle de vie du rendu.
- **Ne le mets pas dans les deps** d'un `useEffect` — il est déjà non réactif,
  l'ajouter est inutile (et le linter le sait).

### Différence avec `useCallback` et `useRef`

- `useCallback(fn, deps)` produit une **référence stable tant que les deps ne
  changent pas**, mais reste **réactif** : si tu veux la dernière valeur, tu dois
  l'ajouter aux deps, et la référence change alors — ce qui re-déclenche les
  effets qui en dépendent. C'est l'inverse du besoin ici.
- `useRef` + écriture dans un effet permet de bricoler un « toujours à jour »,
  mais c'est du câblage manuel : tu dois maintenir `ref.current = latest` à chaque
  rendu, et tu perds la lisibilité et la vérification du linter. `useEffectEvent`
  fait ça correctement, sans ref exposé.

```tsx
// Workaround manuel pré-19.2 (à ne plus écrire) :
const themeRef = useRef(theme);
useEffect(() => { themeRef.current = theme; }); // tient la ref à jour
useEffect(() => {
  const conn = connect(roomId);
  conn.on("connected", () => showToast("Connecté !", themeRef.current));
  return () => conn.close();
}, [roomId]);
```

**Pourquoi** préférer `useEffectEvent` à ce pattern : la ref manuelle marche mais
elle est **silencieuse pour les outils** — rien ne garantit que tu mets bien la
ref à jour, et `exhaustive-deps` ne peut pas t'aider. L'Effect Event encode
l'intention dans l'API : « ceci est la partie non réactive », ce que React et le
linter comprennent et vérifient.

:::cheatsheet
- title: "À quoi ça sert"
  desc: "Lire la dernière valeur (props/state) dans un effet sans l'ajouter aux deps ni re-déclencher l'effet."
- title: "Réactif vs non réactif"
  desc: "Le réactif (ex. roomId) reste dans les deps ; le non réactif (ex. theme) passe dans l'Effect Event."
- title: "Toujours à jour"
  desc: "Pas de stale closure : l'appel lit le state/props du rendu courant."
- title: "Règles"
  desc: "Appel uniquement dans un effet ; jamais passé en prop ; jamais dans les deps."
- title: "vs useCallback"
  desc: "useCallback reste réactif (deps) ; useEffectEvent est volontairement hors du graphe réactif."
- title: "vs useRef"
  desc: "Remplace le bricolage ref.current = latest, avec support du linter."
:::

:::callout{type="tip"}
Heuristique pour découper un effet : demande-toi *pour chaque valeur lue* — « si
elle change, l'effet doit-il se ré-exécuter ? ». Oui → dépendance. Non, je veux
juste sa dernière valeur → `useEffectEvent`. Ça transforme un débat sur les deps
en une question claire.
:::
