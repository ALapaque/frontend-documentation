---
title: "Angular 22"
slug: "angular-22"
framework: "angular"
level: "next"
order: 1
duration: 16
prerequisites: ["signals", "signal-forms", "zoneless"]
updated: 2026-06-10
seoTitle: "Angular 22 (juin 2026) — Signal Forms et Resources stables, OnPush par défaut, horizon v23"
seoDescription: "Angular 22 est sorti le 3 juin 2026 : Signal Forms, Resources (httpResource) et Angular ARIA stables, OnPush par défaut, HttpClient en fetch, hydratation incrémentale par défaut, TypeScript 6 requis. Le bilan complet et l'horizon v23."
ogVariant: "iris"
related:
  - { framework: "react", slug: "react-labs" }
  - { framework: "vue", slug: "vue-3-6" }
---

:::callout{type="info"}
Angular 22 est **sorti le 3 juin 2026**. Ce qui était en preview dans la 21 a
franchi le cap : Signal Forms, Resources et Angular ARIA sont **stables**, et
`OnPush` devient la stratégie de détection **par défaut**. Ce module fait le
bilan de ce que la 22 a réellement livré, puis regarde l'horizon v23. Tu peux
migrer une app de prod, en suivant `ng update`.
:::

## L'ère « signal-first » est actée

La 22 ne révolutionne rien : elle **entérine** la direction prise depuis la 17.
Le fil rouge reste les signals, et les API qui étaient en preview ou
expérimentales en 21 ont franchi le cap. Concrètement, le « modèle mental
Angular par défaut » de mi-2026 est : signals partout, détection sans Zone
(défaut depuis la 21), composants **OnPush par défaut**, tests sur Vitest.

## Signal Forms : stables

Entrées en expérimental en 21, les **Signal Forms** sont **stables** en 22.
Le modèle de formulaire est adossé aux signals : la valeur, l'état de validité
et les erreurs sont des signals dérivés. Changer un champ ne re-évalue pas tout
l'arbre du formulaire — seuls les dérivés qui dépendent de ce champ recalculent.

```ts
import { form, required, minLength } from '@angular/forms/signals';

const login = form({ email: '', password: '' }, (f) => {
  required(f.email);
  required(f.password);
  minLength(f.password, 8);
});
// login.email().valid()  ·  login().value()  ·  login().errors()
```

**Pourquoi** ça compte : les Reactive Forms classiques reposaient sur des
`Observable` (`valueChanges`) et un cycle de validation global. Les Signal Forms
remplacent ce flux par de la réactivité fine et synchrone — la validation
devient un `computed`, pas un abonnement RxJS à gérer/désabonner. Les détails
(validation croisée, `validateHttp`, Zod, `submit()`) sont dans le module
[Signal Forms](/angular/medior/signal-forms).

## Resources : stables aussi

L'autre stabilisation majeure : **`resource()`, `rxResource()` et
`httpResource()`** sortent de l'expérimental. C'est la primitive signal pour
les données asynchrones — un signal de requête en entrée, un état
(`value`/`status`/`error`) réactif en sortie, l'annulation des requêtes
obsolètes gérée par le framework.

```ts
const userId = signal('42');
const user = httpResource(() => `/api/users/${userId()}`);
// user.value()  ·  user.isLoading()  ·  user.error()
```

**Pourquoi.** C'était le chaînon manquant : les signals géraient l'état
synchrone, RxJS restait obligatoire pour l'async. Avec Resources stable, le
fetch piloté par signal devient le chemin par défaut — RxJS redevient un choix,
pas une obligation.

## OnPush par défaut

La 22 franchit le pas que la 21 préparait : **`OnPush` est désormais la
stratégie de détection par défaut** des nouveaux composants. L'ancienne
stratégie « CheckAlways » devient l'exception à demander explicitement.

**Pourquoi.** Avec signals + zoneless (le défaut des nouvelles apps depuis la
21), la détection large n'a plus de raison d'être : les signals notifient déjà
précisément quoi re-rendre. OnPush par défaut aligne le framework sur ce que les
équipes faisaient déjà à la main — et rend le coût de rendu prévisible dès le
premier composant généré.

## Vitest par défaut, Karma retiré

Le CLI génère les nouvelles apps avec **Vitest** comme runner par défaut, et
**Karma est retiré**. Une migration `migrate-karma-to-vitest` est fournie pour
l'existant, et les utilitaires `fakeAsync` restent utilisables.

**Pourquoi.** Karma pilotait un vrai navigateur via WebDriver — lent, fragile en
CI, désaligné du pipeline de build moderne. Vitest réutilise la transformation
Vite déjà en place et offre un feedback en millisecondes.

## Les nouveaux défauts qui changent la vie

:::cheatsheet
- title: "HttpClient → fetch"
  desc: "Le client HTTP utilise l'API fetch par défaut (fini XMLHttpRequest)."
- title: "Hydratation incrémentale — défaut"
  desc: "En SSR, les sous-arbres s'hydratent à la demande sans config supplémentaire."
- title: "strictTemplates — défaut"
  desc: "La vérification stricte des templates est activée d'office sur les nouveaux projets."
- title: "@Service"
  desc: "Décorateur raccourci pour @Injectable({ providedIn: 'root' })."
- title: "injectAsync()"
  desc: "Charger un service paresseusement via la DI, sans import eager."
- title: "TypeScript 6 + Node 22 requis"
  desc: "TS ≤ 5.9 n'est plus pris en charge. À vérifier avant ng update."
:::

## Selectorless et @boundary : pas encore

Deux morceaux très attendus **ne sont pas** dans la 22 :

- Le **selectorless** (utiliser un composant dans le template via son import
  TS, sans sélecteur string ni liste `imports`) reste **expérimental**.
- Le bloc **`@boundary`** (frontières d'erreur dans les templates : un composant
  qui plante affiche un fallback au lieu d'emporter la page) est annoncé pour
  **v22.1 ou v23**, en developer preview.

Si tu lis un billet qui annonce l'un des deux comme stable en 22, méfie-toi.

## Le reste

:::cheatsheet
- title: "Signal Forms — STABLE"
  desc: "Formulaires sur signals, validation = computed. Plus de valueChanges RxJS."
- title: "Resources — STABLE"
  desc: "resource(), rxResource(), httpResource() : l'async piloté par signal."
- title: "Angular ARIA — STABLE"
  desc: "@angular/aria sort de developer preview : primitives d'accessibilité prêtes prod."
- title: "OnPush — défaut"
  desc: "La stratégie par défaut des nouveaux composants. CheckAlways devient l'exception."
- title: "Vitest — runner par défaut"
  desc: "Karma retiré ; migration migrate-karma-to-vitest fournie."
- title: "WebMCP — exp."
  desc: "Déclarer des outils IA depuis l'app (declareExperimentalWebMcpTool) ; DevTools pour graphes signals/DI."
:::

## Horizon v23

La v23 (~fin 2026) devrait viser la **stabilisation du selectorless**, le
**`@boundary`** en stable, et la poursuite du nettoyage des reliquats Zone dans
l'écosystème. Le sens de l'histoire ne change pas : moins de RxJS imposé, plus
de signals.

:::callout{type="tip"}
Pour migrer sereinement : vérifie d'abord **TypeScript 6 + Node 22** (c'est le
prérequis bloquant), passe en zoneless si ce n'est pas déjà fait (voir le module
[Zoneless](/angular/senior/zoneless)), bascule tes tests sur Vitest via la
migration fournie, puis migre tes Reactive Forms vers Signal Forms champ par
champ. `ng update` gère l'essentiel des codemods.
:::
