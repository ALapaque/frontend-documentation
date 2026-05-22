---
title: "Interceptors & Guards"
slug: "interceptors-guards"
framework: "angular"
level: "medior"
order: 4
duration: 15
prerequisites: ["dependency-injection"]
updated: 2026-05-22
seoTitle: "Interceptors & Guards — angular"
seoDescription: "Les API fonctionnelles HttpInterceptorFn et CanActivateFn : inject() dans une fonction, enregistrement avec withInterceptors."
ogVariant: "gold"
related:
  - framework: "react"
    slug: "routing"
---

## Des fonctions, plus des classes

Depuis Angular 15, interceptors et guards sont des fonctions. Un `HttpInterceptorFn` reçoit la requête et le `next`, un `CanActivateFn` reçoit la route et l'état, et `inject()` fonctionne dans leur corps car ils s'exécutent dans un contexte d'injection. Moins de cérémonie qu'une classe, et la composition devient triviale.

## HttpInterceptorFn

Un interceptor transforme la requête ou la réponse. Ici, on ajoute un en-tête d'auth.

```ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;
  return next(authReq);
};
```

L'enregistrement passe par `withInterceptors`. L'ordre du tableau définit l'ordre d'exécution.

```ts
provideHttpClient(
  withInterceptors([authInterceptor, errorInterceptor]),
)
```

## CanActivateFn

Un guard autorise ou bloque l'accès à une route. Il peut retourner un `boolean`, une `UrlTree` (redirection) ou un `Observable`/`Promise` de ceux-ci.

```ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};
```

```ts
{ path: 'admin', canActivate: [authGuard], loadComponent: () => ... }
```

## Classe vs fonctionnel

:::compare
::bad
```ts
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}
  canActivate() {
    return this.auth.isLoggedIn() || this.router.createUrlTree(['/login']);
  }
}
```
::
::good
```ts
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() || router.createUrlTree(['/login']);
};
```
::
:::

**Pourquoi** : la version classe oblige à déclarer un `@Injectable`, à implémenter une interface et à passer par le constructeur pour l'injection ; le guard est alors un service à part entière, enregistré et résolu par le système de DI. La version fonctionnelle est juste une fonction exécutée dans un contexte d'injection, ce qui permet `inject()` à la volée sans constructeur. Elle se compose directement (on peut écrire `roleGuard('admin')` qui retourne un `CanActivateFn`), se tree-shake mieux car il n'y a pas de classe-service à conserver, et se teste en l'appelant dans `TestBed.runInInjectionContext`. Les guards de type classe sont d'ailleurs dépréciés.

### Idée reçue : « inject() ne marche que dans un constructeur »

Faux. `inject()` fonctionne partout où existe un *contexte d'injection actif* : le corps d'une factory, l'initialiseur d'un champ de classe, et précisément l'exécution d'un interceptor ou d'un guard fonctionnel. Le framework crée ce contexte avant d'appeler la fonction. La règle réelle n'est pas « dans un constructeur » mais « pendant la construction/résolution gérée par Angular ». En dehors (par exemple dans un callback asynchrone arbitraire), `inject()` lève une erreur — il faut alors capturer la dépendance plus tôt ou utiliser `runInInjectionContext`.

:::cheatsheet
- title: "HttpInterceptorFn"
  desc: "(req, next) => next(modifiedReq). Auth, logging, retry."
- title: "withInterceptors([...])"
  desc: "Enregistre les interceptors ; l'ordre du tableau = ordre d'exécution."
- title: "CanActivateFn"
  desc: "Retourne boolean | UrlTree | Observable/Promise des deux."
- title: "inject() dans la fonction"
  desc: "Disponible car exécuté dans un contexte d'injection."
:::
