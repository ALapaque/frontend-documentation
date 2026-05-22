---
title: "Dependency Injection"
slug: "dependency-injection"
framework: "angular"
level: "medior"
order: 5
duration: 22
prerequisites: ["lifecycle"]
updated: 2026-05-22
seoTitle: "Angular Dependency Injection — Guide complet Medior"
seoDescription: "providedIn, InjectionToken, hiérarchie des injecteurs : le système de DI d'Angular sans zone d'ombre."
ogVariant: "gold"
related:
  - { framework: "vue", slug: "provide-inject" }
  - { framework: "react", slug: "context-perf" }
---

## Le problème que la DI résout

Sans DI, un composant fabrique lui-même ses dépendances : il connaît leur
constructeur, leur configuration, leur cycle de vie. Couplage fort, test
impossible. La DI **inverse** ce contrôle : tu déclares ce dont tu as besoin,
Angular te le fournit.

:::compare
::bad
```ts
export class OrderList {
  private api = new OrderApi(new HttpClient(/* ... */));
}
```
::
::good
```ts
export class OrderList {
  private api = inject(OrderApi);
}
```
::
:::

## `inject()` plutôt que le constructeur

La fonction `inject()` remplace l'injection par constructeur. Elle marche dans
les composants, services, guards, intercepteurs et resolvers — partout où il y a
un *contexte d'injection*.

```ts
@Injectable({ providedIn: 'root' })
export class OrderApi {
  private http = inject(HttpClient);
  list() {
    return this.http.get<Order[]>('/api/orders');
  }
}
```

## La hiérarchie des injecteurs

Un injecteur cherche un provider chez lui, puis remonte vers son parent jusqu'à
la racine. C'est ce qui permet de **scoper** une instance à un sous-arbre.

:::cheatsheet
- title: "providedIn: 'root'"
  desc: "Singleton global, tree-shakable. Le défaut — prends-le en cas de doute."
- title: "providers: [X] (composant)"
  desc: "Une instance neuve par instance du composant et ses enfants."
- title: "providedIn: 'platform'"
  desc: "Partagé entre plusieurs apps Angular d'une même page."
:::

## InjectionToken : injecter ce qui n'est pas une classe

Pour de la config, une string ou une interface, il n'y a pas de classe à
injecter. On crée un jeton typé.

```ts
export const API_URL = new InjectionToken<string>('API_URL');

// bootstrap
providers: [{ provide: API_URL, useValue: 'https://api.example.com' }];

// usage
const url = inject(API_URL);
```

### Idée reçue : « `providedIn: 'root'` fuit en mémoire »

Non. Un service `'root'` est un singleton tree-shakable : s'il n'est jamais
injecté, il **disparaît du bundle**. La fuite vient d'abonnements non nettoyés,
pas du scope.

:::callout{type="warn"}
`inject()` ne peut être appelé que dans un contexte d'injection (initialisation
de champ, constructeur, factory). L'appeler dans un `setTimeout` ou un handler
lève `NG0203`. Capture la dépendance à l'init, pas à l'usage.
:::

## Pour aller plus loin (Senior)

`runInInjectionContext()` pour ré-ouvrir un contexte, `EnvironmentInjector`
pour la DI hors composant, et les `inject(X, { optional: true, skipSelf: true })`
pour piloter finement la résolution hiérarchique.
