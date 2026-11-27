---
title: "Les décorateurs standard TC39"
slug: "decorators"
framework: "typescript"
level: "senior"
order: 7
duration: 14
prerequisites: ["generics", "declaration-files"]
updated: 2026-11-27
seoTitle: "Décorateurs standard TC39 en TypeScript — context, metadata, vs legacy"
seoDescription: "Les décorateurs standard TC39, revenus au stade 2.7 en mai 2026 et exécutés uniquement par transpilation : signature classe/méthode/accessor, l'objet context, l'absence de décorateurs de paramètres, Symbol.metadata et quand migrer depuis les legacy experimentalDecorators."
ogVariant: "crimson"
related:
  - { framework: "typescript", slug: "generics" }
---

## Deux modèles qui portent le même nom

Le mot « décorateur » recouvre aujourd'hui **deux mécanismes incompatibles**.
Les **legacy decorators**, derrière `experimentalDecorators: true`, datent d'une
ancienne proposition TC39 et de l'écosystème Angular/NestJS. Les **décorateurs
standard** suivent la proposition TC39 actuelle : c'est le modèle activé **par
défaut** dans TypeScript depuis la 5.0 (sans aucun flag). Aucun moteur JS ne les
exécute nativement : ils ne tournent que par transpilation (TypeScript 5.0+,
Babel). Ce ne sont pas deux dialectes d'une même idée : leurs signatures, leur
modèle d'exécution et leurs capacités diffèrent. Ce chapitre traite uniquement
du **standard**.

:::callout{type="warn"}
Statut en novembre 2026 : tu liras partout « stage-3 decorators », mais la
proposition n'est **plus au stade 3**. Elle y était depuis mars 2022 sans
qu'aucun moteur ne livre d'implémentation. Le 19 mai 2026, le comité TC39 l'a
ramenée au **stade 2.7**, avec sa proposition jumelle Decorator Metadata
(`Symbol.metadata`). Deux conséquences : la sémantique peut encore évoluer, et
l'exécution native n'est pas pour demain. Ce que TypeScript compile depuis la
5.0 reste valable, mais ce n'est pas une cible figée.
:::

L'idée commune reste : un décorateur est une fonction qui **enveloppe ou observe**
une déclaration (classe, méthode, accesseur, champ) au moment où elle est définie,
pour en modifier le comportement ou l'enregistrer quelque part.

## La signature d'un décorateur standard

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

## L'objet `context` : le cœur du nouveau modèle

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
pas** dans le standard. Le legacy permettait `constructor(@Inject(X) x: X)` — pilier de
l'injection de dépendances d'Angular et NestJS. Le standard a délibérément retiré
cette capacité (elle pose des problèmes de modèle de données et d'ordre
d'évaluation), avec une proposition séparée encore en amont.

:::callout{type="warn"}
Si ton framework repose sur l'injection par paramètre (`@Inject`, `@Param`,
`@Body`), il dépend encore des **legacy decorators** et de `emitDecoratorMetadata`.
Tu ne peux **pas** simplement basculer `experimentalDecorators: false` : le code
cesserait de compiler. La migration de tels frameworks attend soit leur portage
vers le standard, soit la proposition séparée sur les paramètres. Vérifie la
compatibilité de ta pile technique avant de toucher au flag.
:::

## Metadata via `Symbol.metadata`

La proposition jumelle **Decorator Metadata** (elle aussi au stade 2.7) apporte
un canal de **métadonnées** intégré, sans dépendre de `reflect-metadata`. Chaque
`context` expose un objet `metadata` partagé pour la classe ; il est ensuite
accessible au runtime via `Class[Symbol.metadata]`. C'est le remplaçant prévu
de `emitDecoratorMetadata`.

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
`tsconfig`. L'intérêt du mécanisme : un canal unique, décrit par la proposition,
au lieu des conventions propriétaires de `reflect-metadata` — un même objet
`metadata` est visible par tous les décorateurs d'une classe et survit jusqu'au
runtime.
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
// Standard TC39 : pas de flag, signature uniforme value + context
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
spécifique à TypeScript et à un brouillon TC39 **abandonné**. Ce modèle ne sera
jamais standardisé : il reste lié à un flag expérimental, et son comportement
diverge de ce que TC39 prépare. Les décorateurs standard décrivent l'API que le
comité fait avancer : `value` + `context`, retour qui remplace, `addInitializer`
pour le cycle de vie. Le typage est plus précis (chaque `context` connaît son
`kind`) et tu n'as plus de flag à activer.

Ne survends pas l'argument pour autant. En novembre 2026, les décorateurs
standard ne s'exécutent eux aussi que transpilés, et le retour au stade 2.7
signifie que leur sémantique peut encore bouger avant d'arriver dans les
moteurs. Écris le code neuf et tes propres bibliothèques contre le standard ;
ne lance pas une réécriture massive au nom d'une « cible stable » qui ne l'est
pas encore — d'autant que tu y perds les décorateurs de paramètres.

:::cheatsheet
- title: "standard vs legacy"
  desc: "Proposition TC39 (stade 2.7 depuis mai 2026), défaut depuis TS 5.0 ; legacy = experimentalDecorators, modèle abandonné."
- title: "(value, context)"
  desc: "Signature uniforme : la déclaration décorée + un objet context typé."
- title: "retour du décorateur"
  desc: "Renvoyer une fonction REMPLACE la déclaration ; renvoyer void l'observe sans la changer."
- title: "context.kind / name / static"
  desc: "Métadonnées de la déclaration, typées selon ce qui est décoré."
- title: "context.addInitializer"
  desc: "Exécute du code à l'instanciation (ex. bind d'une méthode), sans toucher le constructeur."
- title: "pas de décorateurs de paramètres"
  desc: "Absents de la proposition standard : l'injection par @Inject reste sur les legacy."
- title: "Symbol.metadata"
  desc: "Canal de métadonnées de la proposition Decorator Metadata, partagé par classe, lu via Class[Symbol.metadata]."
- title: "migrer"
  desc: "Quitter un flag expérimental + descripteurs pour le modèle TC39. Toujours transpilé, sémantique pas encore figée."
:::
