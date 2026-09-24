---
title: "Angular 22"
slug: "angular-22"
framework: "angular"
level: "next"
order: 1
duration: 16
prerequisites: ["signals", "signal-forms", "zoneless"]
updated: 2026-09-24
seoTitle: "Angular 22 — Signal Forms et Resources stables, @boundary en 22.2, cadence annuelle"
seoDescription: "Angular 22 : Signal Forms, Resources et Angular ARIA stables, OnPush par défaut, HttpClient en fetch. Ce que les minors 22.1 et 22.2 ont ajouté (@boundary, Router Resources, RedirectCommand levable), et le passage à une major par an — v23 en juin 2027."
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

## Selectorless et @boundary : où ils en sont

Deux morceaux très attendus **ne sont pas** dans la 22.0 :

- Le **selectorless** (utiliser un composant dans le template via son import
  TS, sans sélecteur string ni liste `imports`) reste **expérimental**.
- Le bloc **`@boundary`** est arrivé depuis, en **22.2** (septembre 2026), en
  developer preview — voir la section suivante.

Si tu lis un billet qui annonce l'un des deux comme stable en 22.0, méfie-toi.

## Ce que les minors ont apporté depuis

La 22.0 n'est pas la fin de l'histoire : deux minors ont livré l'essentiel des
nouveautés de l'année.

**`@boundary` (22.2, developer preview).** Les frontières d'erreur de template :
un composant qui plante affiche un repli au lieu d'emporter la page.

```html
@boundary {
  <app-graphique />
} @error (let err; when estErreurDonnees(err)) {
  <p>Données indisponibles.</p>
} @error {
  <p>Oups : {{ $error.message }}</p>
  <button (click)="$reset()">Réessayer</button>
}
```

Plusieurs blocs `@error` peuvent se succéder, filtrés par `when` ; `$error` porte
l'erreur (aliasable avec `let`), et `$reset()` retente le rendu. C'est l'équivalent
Angular des Error Boundaries de React, mais déclaré dans le template.

**Router Resources (22.2, developer preview).** Le chargement de données de route
piloté par `resource()`, en parallèle au lieu du séquentiel des resolvers — module
dédié : `/angular/medior/router-resources`.

**Le reste, en stable.** `RedirectCommand` peut désormais être **levé** depuis un
guard, un resolver ou une resource ; `withExperimentalAutoCleanupInjectors` se
stabilise en **`withAutoCleanupInjectors`** ; `strictUnclaimedEventNames` signale
les bindings d'événement mal orthographiés (le `(clik)` qui ne disait rien) ; en
Signal Forms, `hidden()` s'utilise sans condition `when`. Côté outillage, le
type-check et le bundling esbuild tournent en parallèle (**~12 %** de build en
moins), et le CLI passe à **Vitest v5**.

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
- title: "@boundary — 22.2 (dev preview)"
  desc: "Frontières d'erreur dans le template : blocs @error filtrés par when, $error et $reset()."
- title: "Cadence annuelle"
  desc: "Une major par an en juin depuis la 22.1 : v23 en juin 2027, support porté à 2 ans."
- title: "WebMCP — exp."
  desc: "Déclarer des outils IA depuis l'app (declareExperimentalWebMcpTool) ; DevTools pour graphes signals/DI."
:::

## Horizon v23 : juin 2027, pas cet automne

:::callout{type="warn"}
**Angular est passé à une version majeure par an.** Annoncé avec la 22.1 (juillet
2026), le nouveau rythme fixe les majors en **juin** : la **v23 sort en juin
2027**, la v24 en juin 2028. En contrepartie, chaque major est **maintenue deux
ans** au lieu de dix-huit mois. Si tu as planifié une montée de version « v23 à
l'automne 2026 » sur l'ancien cycle semestriel, c'est à refaire.
:::

Conséquence pratique : ce sont les **minors**, tous les deux mois environ, qui
portent désormais les nouveautés — la 22.1 et la 22.2 en sont la démonstration.
Surveille-les plutôt que d'attendre la prochaine major.

La v23 poursuivra la consolidation des signals plutôt que l'ouverture de
nouveaux fronts : stabilisation des **Router Resources** et de **`@boundary`**,
tous deux en developer preview depuis la 22.2, et nettoyage des reliquats Zone.

:::callout{type="info"}
Le **selectorless** a glissé encore plus loin : l'équipe le repousse à la v23 ou
la v24 — donc **2027 au plus tôt** — pour donner la priorité à la stabilisation
de l'infrastructure Signals. Ne planifie rien dessus.
:::

Le sens de l'histoire ne change pas : moins de RxJS imposé, plus de signals.

:::callout{type="tip"}
Pour migrer sereinement : vérifie d'abord **TypeScript 6 + Node 22** (c'est le
prérequis bloquant), passe en zoneless si ce n'est pas déjà fait (voir le module
[Zoneless](/angular/senior/zoneless)), bascule tes tests sur Vitest via la
migration fournie, puis migre tes Reactive Forms vers Signal Forms champ par
champ. `ng update` gère l'essentiel des codemods.
:::
