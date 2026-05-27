---
title: "Routing"
slug: "routing"
framework: "react"
level: "medior"
order: 7
duration: 16
prerequisites: ["server-state", "suspense-basics"]
updated: 2026-05-22
seoTitle: "Routing — react"
seoDescription: "TanStack Router (routes type-safe, loaders, search params validés) vs React Router v7 : params, chargement de données et frontières au niveau de la route."
ogVariant: "gold"
related:
  - framework: "vue"
    slug: "router"
  - framework: "angular"
    slug: "routing-basics"
---

Un routeur moderne ne fait pas que mapper une URL à un composant : il déclare où charger les données et où poser les frontières de chargement et d'erreur. Deux acteurs dominent l'écosystème React : TanStack Router, centré sur la sûreté de typage, et React Router v7 (fusion avec Remix), centré sur les loaders et le flux de données.

## Loaders : charger avant de rendre

L'idée commune : associer à chaque route une fonction qui charge les données *pendant* la navigation, pas dans un `useEffect` après le montage. On élimine le waterfall « rendu → effect → fetch → re-rendu ».

```tsx
// TanStack Router : route typée, loader, params validés
const userRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users/$userId",
  loader: ({ params }) => queryClient.ensureQueryData(
    userQuery(params.userId)
  ),
  component: UserPage,
});

function UserPage() {
  const { userId } = userRoute.useParams(); // string, typé
  const user = userRoute.useLoaderData();
  return <h1>{user.name}</h1>;
}
```

`useParams` et `useLoaderData` sont typés *par la définition de la route* : `userId` est connu, pas un `string | undefined` à caster. Le loader peut déléguer à un cache (TanStack Query) pour la déduplication et la revalidation.

## Type-safety : compare

:::compare
::bad
```tsx
// React Router : params non typés, à valider à la main
function UserPage() {
  const { userId } = useParams(); // string | undefined
  const id = userId!;             // assertion risquée
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch(`/u/${id}`).then(r => r.json()).then(setUser);
  }, [id]);
  // navigate("/usrs/" + id)  // typo non détectée
}
```
::
::good
```tsx
// TanStack Router : tout est inféré de l'arbre de routes
function UserPage() {
  const { userId } = userRoute.useParams(); // string
  const user = userRoute.useLoaderData();   // User
  const nav = useNavigate();
  // nav({ to: "/users/$userId", params: { userId } })
  // chemin invalide ou param manquant = erreur de compilation
}
```
::
:::

**Pourquoi** : dans React Router, `useParams` renvoie un `Record<string, string | undefined>` parce que le hook ne connaît pas la route depuis laquelle il est appelé — l'information vit au runtime. D'où les assertions `!`, les fetchs manuels et les liens écrits en chaînes brutes où une faute de frappe ne se voit qu'en production. TanStack Router construit un arbre de routes typé : `to`, `params` et `search` sont vérifiés contre cet arbre à la compilation, et `useLoaderData` connaît le type de retour du loader. Le mécanisme gagnant n'est pas le runtime mais l'inférence : l'URL devient une API typée, les navigations invalides cassent le build au lieu de l'app.

## Search params : état dans l'URL

TanStack Router traite les query params comme de l'état typé et validé (souvent via zod), pas comme des chaînes à parser. C'est l'endroit idéal pour des filtres, tris, pagination : partageables, persistants au refresh, dans l'historique.

```tsx
const listRoute = createRoute({
  path: "/produits",
  validateSearch: z.object({
    page: z.number().catch(1),
    tri: z.enum(["prix", "nom"]).catch("nom"),
  }),
});
// listRoute.useSearch() => { page: number; tri: "prix" | "nom" }
```

## React Router v7

React Router v7 absorbe Remix : loaders, `action` pour les mutations, et un mode framework avec SSR. Son flux de données (loader/action) est mûr et son adoption massive. Le compromis face à TanStack : moins de garanties de types sur params et search, mais un modèle full-stack (form actions, progressive enhancement) plus intégré quand on vise le SSR de bout en bout.

:::callout{type="tip"}
SPA fortement typée, beaucoup de search params structurés : TanStack Router. App full-stack avec SSR, mutations par form actions, migration depuis Remix : React Router v7. Dans les deux cas, délègue le cache de données à TanStack Query plutôt que de tout charger dans le loader.
:::

### Idée reçue : « le loader remplace TanStack Query »

Non : ils répondent à des questions différentes. Le loader décide *quand* charger (au moment de la navigation, en parallèle du rendu) et *où* poser les frontières de la route. TanStack Query décide *comment* gérer le cache : déduplication des requêtes concurrentes, revalidation en arrière-plan, invalidation après mutation, staleness. Un loader qui `fetch` directement recharge tout à chaque visite et ne sait ni dédupliquer ni revalider. Le pattern correct combine les deux : le loader appelle `ensureQueryData`, donc le routeur déclenche le chargement tôt *et* le cache de Query gère le cycle de vie de la donnée. Les voir comme concurrents fait soit dupliquer un cache à la main dans les loaders, soit perdre le préchargement par route.

## À retenir

:::cheatsheet
- title: "Loader > useEffect"
  desc: "Charger pendant la navigation supprime le waterfall rendu→effect→fetch."
- title: "TanStack : type-safe"
  desc: "params, search et to inférés de l'arbre de routes ; erreurs à la compilation."
- title: "Search params typés"
  desc: "validateSearch (zod) : filtres et pagination comme état d'URL validé."
- title: "RR v7 = full-stack"
  desc: "Loaders + actions + SSR, héritage Remix ; types de routes moins stricts."
:::
