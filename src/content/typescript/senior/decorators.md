---
title: "Les décorateurs stage-3"
slug: "decorators"
framework: "typescript"
level: "senior"
order: 7
duration: 14
prerequisites: ["generics", "declaration-files"]
updated: 2026-05-23
seoTitle: "Décorateurs stage-3 TypeScript — standard ECMAScript, context, metadata, vs legacy"
seoDescription: "Les décorateurs stage-3 standardisés ECMAScript : signature classe/méthode/accessor, l'objet context, l'absence de décorateurs de paramètres, Symbol.metadata et pourquoi migrer depuis les legacy experimentalDecorators."
ogVariant: "crimson"
related:
  - { framework: "typescript", slug: "generics" }
---

## Deux modèles qui portent le même nom

Le mot « décorateur » recouvre aujourd'hui **deux mécanismes incompatibles**.
Les **legacy decorators**, derrière `experimentalDecorators: true`, datent d'une
ancienne proposition TC39 et de l'écosystème Angular/NestJS. Les **stage-3
decorators** sont la version qui a atteint le stade 3 du comité ECMAScript, est
implémentée nativement par les moteurs JS et activée **par défaut** dans
TypeScript depuis la 5.0 (sans aucun flag). Ce ne sont pas deux dialectes d'une
même idée : leurs signatures, leur modèle d'exécution et leurs capacités
diffèrent. Ce chapitre traite uniquement du **standard**.

L'idée commune reste : un décorateur est une fonction qui **enveloppe ou observe**
une déclaration (classe, méthode, accesseur, champ) au moment où elle est définie,
pour en modifier le comportement ou l'enregistrer quelque part.

## La signature d'un décorateur stage-3

La rupture majeure : un décorateur standard reçoit la **valeur décorée** et un
objet **`context`**, et ne touche **plus** au descripteur de propriété comme le
faisait le legacy. Sa forme dépend de ce qu'il décore.

```ts
// Décorateur de classe : reçoit le constructeur + un context
type ClassDecorator = (
  value: Function,
  context: ClassDecoratorContext
) => Function | void;

// Décorateur de méthode : reçoit la méthode + son context
type MethodDecorator = (
  value: Function,
  context: ClassMethodDecoratorContext
) => Function | void;

// Décorateur d'accessor : reçoit { get, set } + son context
type AccessorDecorator = (
  value: { get?: Function; set?: Function },
  context: ClassAccessorDecoratorContext
) => void;
```

Le retour est significatif : si le décorateur **renvoie une nouvelle fonction**,
elle **remplace** la déclaration d'origine. Renvoyer `void` laisse la déclaration
intacte (cas de l'observation/enregistrement pur).

```ts
function log(value: Function, context: ClassMethodDecoratorContext) {
  const nom = String(context.name);
  return function (this: unknown, ...args: unknown[]) {
    console.log(`appel ${nom}`);
    return value.call(this, ...args); // on enveloppe l'originale
  };
}

class Service {
  @log fetch(id: string) { /* ... */ }
}
```

## L'objet `context`: le cœur du nouveau modèle

`context` remplace les multiples arguments hétérogènes du legacy par **un seul
objet uniforme et typé**. Il porte le `kind` (`"class"`, `"method"`, `"field"`,
`"getter"`, `"setter"`, `"accessor"`), le `name`, des booléens (`static`,
`private`), et — surtout — `addInitializer`, un mécanisme propre pour exécuter du
code à l'instanciation sans bricoler le constructeur.

```ts
function bound(value: Function, context: ClassMethodDecoratorContext) {
  context.addInitializer(function (this: any) {
    // s'exécute par instance, après la création : lie la méthode
    this[context.name] = value.bind(this);
  });
}

class Bouton {
  @bound onClick() { return this; } // `this` reste l'instance même détaché
}
```

`addInitializer` est la réponse standard à un besoin que le legacy résolvait par
des hacks de descripteur : il offre un **point d'extension explicite** dans le
cycle de vie de la déclaration.

## L'absence de décorateurs de paramètres

Piège majeur lors d'une migration : **les décorateurs de paramètres n'existent
pas** en stage-3. Le legacy permettait `constructor(@Inject(X) x: X)` — pilier de
l'injection de dépendances d'Angular et NestJS. Le standard a délibérément retiré
cette capacité (elle pose des problèmes de modèle de données et d'ordre
d'évaluation), avec une proposition séparée encore en amont.

:::callout{type="warn"}
Si ton framework repose sur l'injection par paramètre (`@Inject`, `@Param`,
`@Body`), il dépend encore des **legacy decorators** et de `emitDecoratorMetadata`.
Tu ne peux **pas** simplement basculer `experimentalDecorators: false` : le code
cesserait de compiler. La migration de tels frameworks attend soit leur portage
vers le standard, soit la proposition séparée sur les paramètres. Vérifie la
compatibilité de ton stack avant de toucher au flag.
:::

## Metadata via `Symbol.metadata`

Le standard apporte un canal de **métadonnées** intégré, sans dépendre de
`reflect-metadata`. Chaque `context` expose un objet `metadata` partagé pour la
classe ; il est ensuite accessible au runtime via `Class[Symbol.metadata]`. C'est
le remplaçant standardisé de `emitDecoratorMetadata`.

```ts
function serialisable(_: unknown, context: ClassFieldDecoratorContext) {
  // on enregistre le champ dans les metadata partagées de la classe
  (context.metadata.champs ??= []) as string[];
  (context.metadata.champs as string[]).push(String(context.name));
}

class Entite {
  @serialisable id = "";
  @serialisable nom = "";
}

console.log(Entite[Symbol.metadata]?.champs); // ["id", "nom"]
```

:::callout{type="info"}
`Symbol.metadata` est récent ; selon ta cible, il faut le **polyfill**
(`Symbol.metadata ??= Symbol("metadata")`) ou activer la lib correspondante dans
`tsconfig`. Le mécanisme étant standardisé, les outils convergent vers ce canal
unique au lieu des conventions propriétaires de `reflect-metadata` — un même
objet `metadata` est visible par tous les décorateurs d'une classe et survit
jusqu'au runtime.
:::

## Pourquoi migrer depuis les legacy

:::compare
::bad
```ts
// Legacy : signature couplée au descripteur, dépend d'un flag expérimental
function log(target: any, key: string, desc: PropertyDescriptor) {
  const orig = desc.value;
  desc.value = function (...a: any[]) { console.log(key); return orig.apply(this, a); };
  return desc; // on mute le PropertyDescriptor
}
```
::
::good
```ts
// Stage-3 : standard, pas de flag, signature uniforme value + context
function log(value: Function, context: ClassMethodDecoratorContext) {
  return function (this: unknown, ...a: unknown[]) {
    console.log(String(context.name));
    return value.call(this, ...a);
  };
}
```
::
:::

**Pourquoi.** Les legacy manipulent le `PropertyDescriptor` — une mécanique
spécifique à TypeScript et à un brouillon TC39 **abandonné**. Ce modèle n'a jamais
été standardisé, donc aucun moteur JS ne l'exécute nativement : il faut
transpiler, et le comportement peut diverger du futur standard. Les stage-3
décrivent l'API que TC39 a **réellement** retenue : `value` + `context`, retour
qui remplace, `addInitializer` pour le cycle de vie. À terme les moteurs les
exécutent sans transpilation, le typage est plus précis (chaque `context` connaît
son `kind`), et tu écris contre une cible **stable** plutôt qu'expérimentale. La
migration libère ton code d'un flag déprécié et d'une sémantique vouée à
disparaître — au prix de réécrire les signatures et d'abandonner les décorateurs
de paramètres.

:::cheatsheet
- title: "stage-3 vs legacy"
  desc: "Standard ECMAScript, défaut depuis TS 5.0 ; legacy = experimentalDecorators, modèle abandonné."
- title: "(value, context)"
  desc: "Signature uniforme : la déclaration décorée + un objet context typé."
- title: "retour du décorateur"
  desc: "Renvoyer une fonction REMPLACE la déclaration ; renvoyer void l'observe sans la changer."
- title: "context.kind / name / static"
  desc: "Métadonnées de la déclaration, typées selon ce qui est décoré."
- title: "context.addInitializer"
  desc: "Exécute du code à l'instanciation (ex. bind d'une méthode), sans toucher le constructeur."
- title: "pas de décorateurs de paramètres"
  desc: "Retirés du standard : l'injection par @Inject reste sur les legacy."
- title: "Symbol.metadata"
  desc: "Canal de métadonnées standard partagé par classe, lu via Class[Symbol.metadata]."
- title: "migrer"
  desc: "Quitter un flag expérimental + descripteurs pour une API stable exécutée nativement."
:::
