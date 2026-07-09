---
title: "HttpClient : parler à une API"
slug: "http-client"
framework: "angular"
level: "junior"
order: 7
duration: 13
prerequisites: ["standalone"]
updated: 2026-07-08
seoTitle: "HttpClient Angular pour débutants — provideHttpClient, GET/POST typés, erreurs"
seoDescription: "Les bases du client HTTP d'Angular : provideHttpClient() (adossé à fetch depuis la v22), requêtes GET et POST typées, gestion d'erreurs propre, et le lien vers httpResource et les interceptors quand tu montes en puissance."
ogVariant: "sage"
related:
  - { framework: "web", slug: "fetch" }
  - { framework: "angular", slug: "interceptors-guards" }
---

Presque toutes les applications passent leur temps à parler à une API : récupérer une liste d'utilisateurs, envoyer un formulaire, supprimer un enregistrement. Angular fournit son propre client HTTP pour ça : `HttpClient`. Il est typé (TypeScript sait ce que renvoie l'API), testable, et branché sur l'injection de dépendances comme le reste du framework.

Sous le capot, depuis Angular 22, `HttpClient` s'appuie sur l'API `fetch` du navigateur par défaut — fini le vieux `XMLHttpRequest`. Pour toi, rien ne change dans le code : c'est un détail d'implémentation, avec de meilleures perfs en prime côté serveur (SSR).

## Brancher le client

`HttpClient` n'est pas disponible d'office : tu l'actives une fois pour toute l'application avec `provideHttpClient()` dans `app.config.ts`.

```ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()],
};
```

Ensuite, tu l'injectes avec `inject(HttpClient)` — de préférence dans un **service**, pas directement dans le composant.

**Pourquoi.** Le composant s'occupe d'afficher, le service s'occupe de récupérer les données. Cette séparation rend l'appel réutilisable par d'autres composants, et surtout testable : dans un test, tu remplaces le service entier par une fausse version, sans toucher au réseau.

## Un GET typé

Tu déclares une interface qui décrit la réponse de l'API, puis tu passes ce type à `http.get<T>()`.

```ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id: number;
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users');
  }
}
```

`get()` ne renvoie pas directement les données mais un **Observable** : un flux auquel on s'abonne, et qui émettra la réponse quand elle arrivera. Pas besoin de plonger dans RxJS pour l'instant — retiens juste que tant que personne ne s'abonne, la requête ne part pas.

Côté composant, le plus simple aujourd'hui est de convertir ce flux en signal avec `toSignal()`, qui s'abonne (et se désabonne) pour toi.

```ts
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UserService } from './user.service';

@Component({
  selector: 'app-user-list',
  template: `
    @for (user of users(); track user.id) {
      <p>{{ user.name }}</p>
    } @empty {
      <p>Chargement…</p>
    }
  `,
})
export class UserListComponent {
  private userService = inject(UserService);
  users = toSignal(this.userService.getUsers(), { initialValue: [] });
}
```

:::callout{type="info"}
L'alternative historique est le `AsyncPipe` dans le template : `@for (user of users$ | async)`. Il fait la même chose (abonnement et désabonnement automatiques), mais côté template plutôt que côté classe.
:::

## POST, PUT, DELETE

Écrire des données suit exactement le même schéma : la méthode HTTP change, et le corps de la requête (le *body*) est typé lui aussi.

```ts
createUser(payload: Omit<User, 'id'>): Observable<User> {
  return this.http.post<User>('/api/users', payload);
}

updateUser(id: number, changes: Partial<User>): Observable<User> {
  return this.http.put<User>(`/api/users/${id}`, changes);
}

deleteUser(id: number): Observable<void> {
  return this.http.delete<void>(`/api/users/${id}`);
}
```

Chaque méthode accepte aussi un objet d'options, dont les deux plus courantes : `params` pour la query string, `headers` pour les en-têtes.

```ts
this.http.get<User[]>('/api/users', {
  params: { page: 2, sort: 'name' },   // → /api/users?page=2&sort=name
  headers: { 'X-App-Version': '1.4' },
});
```

## Gérer les erreurs

Une API peut répondre 404, 500, ou ne pas répondre du tout. `HttpClient` transforme tout ça en `HttpErrorResponse` dans le canal d'erreur de l'Observable. Le pattern simple : intercepter l'erreur dans le service avec `catchError` et renvoyer une valeur de repli.

```ts
import { catchError, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

getUsers(): Observable<User[]> {
  return this.http.get<User[]>('/api/users').pipe(
    catchError((err: HttpErrorResponse) => {
      console.error(`GET /api/users a échoué (${err.status})`);
      return of([]); // valeur de repli : liste vide
    }),
  );
}
```

**Pourquoi.** Sans `catchError`, l'erreur remonte jusqu'au composant et le flux s'arrête net : ton `toSignal()` reste figé sur la dernière valeur. En rattrapant l'erreur dans le service, tu décides d'une réponse de secours et l'interface reste utilisable.

:::callout{type="tip"}
Répéter `catchError` dans chaque méthode devient vite pénible. À l'échelle d'une vraie application, on centralise la gestion d'erreurs (et l'ajout du token d'authentification) dans des [interceptors](/angular/medior/interceptors-guards) : une fonction qui voit passer toutes les requêtes.
:::

## fetch brut vs service HttpClient

:::compare
::bad
```ts
export class UserListComponent {
  users: any[] = [];

  async ngOnInit() {
    const res = await fetch('/api/users');
    this.users = await res.json(); // any : aucune vérification de type
  }
}
```
::
::good
```ts
export class UserListComponent {
  private userService = inject(UserService);
  users = toSignal(this.userService.getUsers(), { initialValue: [] });
}
```
::
:::

**Pourquoi.** Le `fetch` brut dans le composant cumule les problèmes : la réponse est `any` (une faute de frappe dans `user.name` passe inaperçue), un 404 ne lève même pas d'erreur (`fetch` ne rejette que sur panne réseau), rien n'annule la requête si le composant est détruit, et le test du composant doit simuler le réseau entier. Le service + `HttpClient` règle les quatre points d'un coup — tout en utilisant `fetch` en interne.

## Et la suite

Pour la **lecture** de données pilotée par un signal (recharger quand un id change, exposer `isLoading` et `error` sans plomberie), la primitive `httpResource()` fait tout ça nativement : c'est le sujet de [resource() & httpResource()](/angular/medior/async-resource). Et pour tout ce qui est transversal — token d'authentification, gestion d'erreurs globale, retries — direction les [interceptors](/angular/medior/interceptors-guards).

## À retenir

:::cheatsheet
- title: "provideHttpClient()"
  desc: "Active le client dans app.config.ts ; adossé à fetch par défaut depuis la v22."
- title: "inject(HttpClient) dans un service"
  desc: "Jamais dans le composant : séparation affichage/données, testabilité."
- title: "get<User[]>('/api/users')"
  desc: "Le type générique décrit la réponse ; renvoie un Observable (un flux auquel on s'abonne)."
- title: "toSignal() ou AsyncPipe"
  desc: "S'abonnent et se désabonnent pour toi ; pas de subscribe manuel à gérer."
- title: "post/put/delete + options"
  desc: "Body typé en 2e argument ; params et headers dans l'objet d'options."
- title: "catchError + valeur de repli"
  desc: "Rattrape l'HttpErrorResponse dans le service pour que l'UI reste vivante."
- title: "Aller plus loin"
  desc: "httpResource() pour la lecture réactive, interceptors pour l'auth et les erreurs globales."
:::
