---
title: "BFF et contrats typés de bout en bout"
slug: "bff-contrats-types"
framework: "architecture"
level: "senior"
order: 7
duration: 16
prerequisites: ["ddd"]
updated: 2026-07-09
seoTitle: "BFF et contrats typés — tRPC, OpenAPI, GraphQL : un type du serveur au composant"
seoDescription: "Supprimer la classe de bugs « le back a changé, le front l'ignore » : le pattern Backend For Frontend et les contrats typés de bout en bout (tRPC, OpenAPI codegen, GraphQL). Quand chacun s'impose et comment un BFF par client fait tenir les frontières."
ogVariant: "crimson"
related:
  - { framework: "architecture", slug: "ddd" }
  - { framework: "typescript", slug: "standard-schema" }
---

La frontière entre ton front et ton back est la source d'une **classe entière de bugs**. Le back renomme `firstName` en `first_name`, déplace un champ, change un `number` en `string` — et le front l'apprend **en production**, quand un `undefined` casse un rendu. Rien n'a hurlé à la compilation parce que rien ne reliait vraiment les deux côtés. Deux idées referment cette frontière : un **contrat typé** partagé entre serveur et client, et un **BFF** (Backend For Frontend) qui façonne l'API pour un client précis au lieu de laisser le front recoller les morceaux. Cet article explique quand chacune paie, et pourquoi elles se combinent.

## Le problème : le contrat implicite

Regarde ce que renvoie un `fetch` brut : `any`. Le compilateur ne sait **rien** de la forme réelle. Alors le front fait ce qu'il peut : il **redéclare** un type à la main, une copie du modèle serveur écrite de mémoire. Cette copie est morte dès sa naissance — elle ne saura jamais que le serveur a bougé.

:::compare
::bad
```ts
// Le front redéclare le contrat « à l'aveugle »
type User = {
  id: number;
  firstName: string;   // le back envoie déjà `first_name`…
  email: string;
};

async function getUser(id: number): Promise<User> {
  const res = await fetch(`/api/user/${id}`);
  return res.json(); // Promise<any> castée en User : mensonge typé
}
```
::
::good
```ts
// Le type est DÉRIVÉ de la source (ici une spec OpenAPI)
import type { paths } from './api.generated';
import createClient from 'openapi-fetch';

const api = createClient<paths>({ baseUrl: '/api' });

// Le retour est inféré depuis le contrat ; renommer un champ
// côté serveur casse ici, à la compilation.
const { data } = await api.GET('/user/{id}', { params: { path: { id } } });
```
:::

**Pourquoi c'est grave.** Le `res.json()` de gauche est un `any` maquillé en `User`. Chaque accès à un champ est une hypothèse non vérifiée. La règle senior : **un type que tu écris à la main pour décrire un système que tu ne contrôles pas n'est pas un contrat, c'est un vœu**. Un vrai contrat a **une seule source de vérité**, et les deux côtés en dérivent.

## Les trois familles de contrats typés

Il existe trois manières éprouvées de faire dériver front et back d'une source commune. Elles ne visent pas le même contexte — le critère décisif est **qui parle quel langage**.

### tRPC — les types TS partagés directement

Avec **tRPC**, il n'y a pas de schéma intermédiaire ni d'étape de génération. Le routeur serveur est du TypeScript, et le client **infère ses types directement** depuis le type du routeur. Zéro codegen, feedback quasi instantané : tu renommes une procédure, l'appel côté front devient rouge dans l'éditeur avant même de compiler.

```ts
// serveur — le routeur EST le contrat
export const appRouter = router({
  getUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => userService.byId(input.id)), // retour inféré
});
export type AppRouter = typeof appRouter;

// client — même monorepo, import de type uniquement
const user = await trpc.getUser.query({ id }); // typé de bout en bout
```

La condition est stricte : **back ET front en TypeScript, dans le même repo ou monorepo**. tRPC couple les deux au type-level. C'est un avantage (rien à synchroniser) et une contrainte (pas de consommateur externe, pas d'autre langage).

### OpenAPI + codegen — la spec comme source

Ici la **spec OpenAPI** est la source de vérité, et chaque côté génère à partir d'elle. `openapi-typescript` transforme la spec en types, `openapi-fetch` fournit un client typé qui les consomme. Force décisive : **la spec est agnostique du langage**. Un back en Go, un front en TS, un client Kotlin mobile, un partenaire externe — tous génèrent depuis le même document.

```bash
# étape de build : la spec devient des types
npx openapi-typescript ./openapi.yaml -o ./src/api.generated.ts
```

Le coût : cette étape de génération doit tourner **à chaque changement de spec**, sinon les types mentent à nouveau. Et il faut décider qui possède la spec — écrite à la main en amont (design-first) ou dérivée du code serveur (code-first).

### GraphQL + codegen — le schéma comme contrat

Avec **GraphQL**, le contrat est le **schéma**, et le codegen (GraphQL Code Generator) produit des types **par requête** : chaque `query`/`fragment` devient un type exact de ce que le composant reçoit — ni plus, ni moins. C'est puissant quand l'UI a des besoins de données **fluides** et **hétérogènes**, et quand tu agrèges plusieurs sources.

```ts
const GetUser = graphql(`
  query GetUser($id: ID!) {
    user(id: $id) { id firstName email }
  }
`);
// `data.user` est typé EXACTEMENT sur les champs demandés
```

Le prix : un runtime GraphQL à opérer, un cache client à comprendre, une surface d'attaque (profondeur des requêtes) à borner.

:::callout{type="tip"}
Le critère de choix tient en une phrase. **Tout le monde parle TypeScript et tu possèdes les deux bouts** → tRPC. **Des consommateurs hétérogènes, une API publique, de la gouvernance** → OpenAPI. **Une UI complexe qui agrège des sources et sur-mesure ses données** → GraphQL.
:::

## Le pattern BFF

Un **BFF** est une couche backend dédiée à **un** client. Pas « le backend », mais *un backend par frontend* : un pour le web, un pour le mobile, taillés chacun pour les besoins de leur UI. Sans BFF, le front se retrouve à orchestrer lui-même 5 microservices — appeler `auth`, puis `catalog`, puis `pricing`, recoller les réponses, gérer les erreurs partielles — de la logique d'agrégation qui n'a **rien à faire dans le navigateur**.

```text
                 ┌──────────── BFF web ───────────┐
   navigateur ──▶│ agrège auth + catalog + pricing│──▶ microservices
                 │ façonne UNE réponse pour l'UI  │
                 └────────────────────────────────┘
   mobile ──────▶ BFF mobile (payloads plus légers, autres champs)
```

Le BFF fait deux choses : il **agrège** (un appel du front, plusieurs appels internes) et il **façonne** (il renvoie exactement la forme dont *ce* client a besoin, pas l'union de tous les modèles internes). Bonus décisif pour notre sujet : le BFF est **l'endroit naturel où poser le contrat typé**. C'est ton code, dans ton langage, à la frontière que ton front consomme vraiment.

## Pourquoi les deux ensemble

BFF et contrat typé attaquent le même problème par deux angles complémentaires :

- Le **BFF façonne** — il décide de la forme exacte exposée à un client, il absorbe l'instabilité des services en amont.
- Le **contrat typé verrouille** — il fait qu'un changement de cette forme se **propage comme un type** jusqu'au composant.

Mis bout à bout, tu obtiens **un seul type qui va du handler serveur au composant**. Un champ change dans le BFF ? La procédure tRPC change de type, l'appel côté composant devient rouge, le build échoue. Le bug « le back a changé, le front l'ignore » **n'a plus d'endroit où exister** : il est intercepté à la compilation, pas découvert par un utilisateur.

:::callout{type="info"}
Le BFF est aussi le meilleur point pour **stabiliser** un contrat instable. Si les microservices en amont bougent souvent, le BFF joue le rôle d'**anti-corruption layer** : ses services internes changent, mais la forme qu'il expose au front reste stable. Le front est protégé du chaos en amont.
:::

## Trade-offs (ce que ça coûte vraiment)

Aucune de ces approches n'est gratuite. Le rôle du senior est de nommer le prix avant de signer.

:::callout{type="warn"}
- **tRPC impose le monorepo TS.** Le couplage type-level est sa force et sa laisse : dès qu'un consommateur n'est pas ton TypeScript, tRPC ne s'applique plus. Choisir tRPC, c'est parier que ça restera vrai.
- **OpenAPI a un coût de codegen.** Une étape de build de plus, et le problème récurrent du *« quelqu'un a-t-il réexécuté la génération ? »*. Il faut l'automatiser en CI et vérifier les changements cassants, sinon les types redeviennent des vœux.
- **GraphQL, c'est un runtime à opérer.** Serveur, cache, complexité des requêtes à borner. Sur une UI simple, c'est disproportionné.
- **Un BFF est un service de plus.** À déployer, monitorer, faire évoluer. Il ajoute un saut réseau. Ne le crée pas pour un seul client trivial.
- **Versionner le contrat reste ton travail.** Un contrat public que des tiers consomment ne peut pas casser au gré des refactors : versions, dépréciations, périodes de transition.
:::

Et le piège le plus subtil : **un type n'est pas une validation**. tRPC, OpenAPI ou GraphQL garantissent la cohérence *à la compilation*, mais à l'exécution le serveur peut mentir — bug amont, réponse partielle, cache empoisonné. Le type dit *« ça devrait ressembler à ça »*, il ne vérifie pas que *« ça y ressemble vraiment »*. Il faut **valider au runtime à la frontière** — parser la réponse entrante avec un schéma (voir [Standard Schema](/typescript/standard-schema)) avant de la laisser entrer dans le domaine typé. Le contrat statique et la validation runtime sont **deux garde-fous distincts**, pas l'un l'autre.

## Décider selon le contexte

Le bon choix dépend d'une seule question : **qui consomme, et dans quel langage ?**

:::compare
::bad
```text
« On prend GraphQL, c'est moderne. »
→ un runtime, un cache et une courbe d'apprentissage
  imposés à une app CRUD full-TS de trois écrans.
```
::
::good
```text
Mono-stack TypeScript, API interne → tRPC (BFF-style).
Orga polyglotte / plusieurs clients → OpenAPI + codegen.
UI complexe qui agrège des sources → GraphQL en BFF.
API publique pour des tiers → OpenAPI, versionnée, dès le jour 1.
```
:::

Ces choix ne s'excluent pas. Une architecture 2026 courante est **hybride** : un BFF interne en tRPC (ou GraphQL) pour la vitesse et le zéro-codegen côté produit, **et** une façade OpenAPI versionnée pour l'edge public et les partenaires. Le principe qui tient l'ensemble reste le même : **une source de vérité par frontière, et les deux côtés qui en dérivent** — jamais deux modèles écrits à la main qui prétendent se ressembler.

## À retenir

:::cheatsheet
- title: "Le contrat implicite est un bug qui dort"
  desc: "fetch renvoie any ; un type redéclaré à la main diverge du serveur en silence. Une seule source, deux dérivations."
- title: "tRPC = même monorepo TS"
  desc: "Types partagés directement, zéro codegen, feedback instantané. Condition : back et front en TypeScript, pas de consommateur externe."
- title: "OpenAPI = langages hétérogènes"
  desc: "La spec est la source, chaque langage génère son client. Coût : l'étape de codegen à automatiser en CI."
- title: "GraphQL = UI complexe qui agrège"
  desc: "Le schéma est le contrat, chaque requête est typée exactement. Prix : un runtime et un cache à opérer."
- title: "Le BFF façonne, le contrat verrouille"
  desc: "Un backend par client agrège et taille l'API ; le contrat typé propage tout changement jusqu'au composant."
- title: "Un type n'est pas une validation"
  desc: "Le contrat garantit la compilation, pas l'exécution. Valide la réponse au runtime à la frontière (Standard Schema)."
- title: "Choisir par les consommateurs"
  desc: "Full-TS interne → tRPC. Polyglotte → OpenAPI. UI fluide → GraphQL. Public → OpenAPI versionnée. Hybride assumé."
:::
