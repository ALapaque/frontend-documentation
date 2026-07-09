---
title: "Standard Schema : un contrat pour tous les validateurs"
slug: "standard-schema"
framework: "typescript"
level: "senior"
order: 9
duration: 14
prerequisites: ["declaration-files"]
updated: 2026-07-09
seoTitle: "Standard Schema — l'interface commune de Zod, Valibot et ArkType"
seoDescription: "Standard Schema est une interface minimale que Zod, Valibot, ArkType et d'autres implémentent, pour qu'un outil accepte n'importe quel validateur sans adaptateur. Comment lire la spec (~standard) et écrire du code générique sur les schémas."
ogVariant: "iris"
related:
  - { framework: "typescript", slug: "declaration-files" }
  - { framework: "typescript", slug: "generics" }
---

## Le problème : un adaptateur par validateur

Chaque bibliothèque de validation a sa propre API. Zod valide avec
`schema.parse(input)`, Valibot avec `v.parse(schema, input)`, ArkType en
appelant directement le type. Aucun terrain commun. Un outil qui voulait
simplement « accepter un schéma » — routeur, bibliothèque de formulaire, couche
RPC — devait donc écrire **un adaptateur par bibliothèque**, puis un de plus à
chaque nouveau validateur : une explosion combinatoire M outils × N validateurs.

Standard Schema casse ce produit. C'est le **contrat minimal commun** que ces
bibliothèques implémentent toutes, pour qu'un outil branche n'importe laquelle
sans adaptateur. On passe de M × N à M + N : chaque validateur expose le contrat
une fois, chaque outil le consomme une fois.

:::compare
::bad
```ts
// L'outil connaît chaque validateur : un switch, une dépendance, un import par bibliothèque.
import { z } from "zod";
import * as v from "valibot";
import { Type } from "arktype";

function parse(schema: unknown, input: unknown) {
  if (schema instanceof z.ZodType) return schema.parse(input);
  if (v.isOfKind?.("schema", schema)) return v.parse(schema, input);
  if (schema instanceof Type) return schema(input);
  throw new Error("validateur inconnu"); // et Effect Schema ? encore une branche…
}
```
::
::good
```ts
// L'outil ne connaît que le contrat. Zéro import de validateur, zéro switch.
import type { StandardSchemaV1 } from "@standard-schema/spec";

function parse<T extends StandardSchemaV1>(schema: T, input: unknown) {
  return schema["~standard"].validate(input); // marche pour tout validateur conforme
}
```
::
:::

## La spec : la propriété `~standard`

Toute la spécification tient dans **une seule propriété**. Un schéma conforme
expose un champ `~standard` qui décrit comment le valider, sans rien révéler de
son implémentation. Le préfixe `~` n'est pas décoratif : il trie la propriété en
fin d'alphabet et la plupart des éditeurs la masquent de l'autocomplétion, si
bien que l'API publique de la bibliothèque reste propre.

```ts
interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": {
    readonly version: 1;      // version de la spec — sert à la faire évoluer
    readonly vendor: string;  // bibliothèque d'origine : "zod", "valibot", "arktype"…
    readonly validate: (      // le cœur : renvoie { value } ou { issues }
      input: unknown,
    ) => Result<Output> | Promise<Result<Output>>;
    readonly types?: { input: Input; output: Output }; // fantôme : types uniquement
  };
}

type Result<Output> =
  | { readonly value: Output; readonly issues?: undefined }                 // succès
  | { readonly issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> }; // échec
```

Quatre membres. `version` verrouille le numéro de contrat, `vendor` identifie la
bibliothèque. `validate` fait le travail : il prend une valeur `unknown` et
renvoie un résultat **discriminé** — soit `{ value }` (succès, `issues` absent),
soit `{ issues }` (échec, `message` et `path` par problème), en synchrone ou en
`Promise`. `types` est un champ **fantôme** : aucune valeur à l'exécution, il
existe seulement pour que le compilateur retrouve les types d'entrée et de sortie.

:::callout{type="info"}
`validate` ne **lance jamais** d'exception sur une entrée invalide. Un échec est
une valeur de retour (`{ issues }`), pas un `throw`. C'est délibéré : l'outil
consommateur décide quoi faire des problèmes — les remonter, les formater, les
ignorer — au lieu de subir un `try/catch` imposé par le validateur.
:::

## Valider avec n'importe quel schéma

Une fonction générique conforme fait trois choses : elle accepte tout `T extends
StandardSchemaV1`, elle appelle `~standard.validate`, et elle **infère** le type
de sortie via `StandardSchemaV1.InferOutput`, qui lit la propriété fantôme
`types` — sans savoir si c'est du Zod ou du Valibot.

```ts
import type { StandardSchemaV1 } from "@standard-schema/spec";

async function parse<T extends StandardSchemaV1>(
  schema: T,
  input: unknown,
): Promise<StandardSchemaV1.InferOutput<T>> {
  const result = await schema["~standard"].validate(input); // sync ou async : on await

  if (result.issues) {
    // result rétréci à { issues } : value n'existe pas ici
    throw new Error(result.issues.map((i) => i.message).join("\n"));
  }
  return result.value; // rétréci à { value }, typé InferOutput<T>
}
```

L'appel se type tout seul : `parse(z.object({ id: z.string() }), body)` renvoie
`Promise<{ id: string }>`, `parse(valibotSchema, body)` le type inféré par
Valibot — **le même code** pour les deux. Tu écris ta logique une fois, elle gère
tout validateur présent et futur.

## Qui l'implémente, qui le consomme

La spec a deux faces. Côté **producteur**, les bibliothèques exposent `~standard`
sur leurs schémas : Zod (depuis la 3.24, natif en v4), Valibot (1.0), ArkType
(2.0), Effect Schema… Aucune n'a changé son API publique — elles ont ajouté une
propriété. Côté **consommateur**, les outils typent leur entrée avec
`StandardSchemaV1` plutôt qu'avec un validateur précis : tRPC (v11), TanStack
Form et TanStack Router, Hono, oRPC. Résultat : tu choisis **ton** validateur,
l'outil s'y plie.

:::callout{type="tip"}
Le paquet `@standard-schema/spec` ne contient **que des types**, zéro code à
l'exécution. L'importer avec `import type` n'ajoute pas une ligne à ton bundle.
:::

## Le pourquoi : découpler l'outil du validateur

L'intérêt profond n'est pas de taper moins de code d'adaptateur, c'est de
**découpler** qui produit le schéma de qui le consomme. Avant, choisir tRPC
pouvait t'imposer Zod, adopter une bibliothèque de formulaire pouvait t'enfermer
dans son validateur maison : le couplage remontait la chaîne de dépendances.

Avec Standard Schema, l'outil ne dépend plus d'un validateur mais d'un
**contrat**. Trois gains : la **liberté de choix** (Valibot pour son
tree-shaking, ArkType pour sa syntaxe, Zod pour son écosystème — l'outil s'en
moque), la **réduction des dépendances** (un outil typé contre
`@standard-schema/spec` n'embarque aucun validateur, c'est toi qui apportes le
tien), et la **migration incrémentale** (passer de Zod à Valibot ne touche que
tes schémas, pas tes formulaires ni tes routes, puisqu'ils parlent au contrat).

## Écrire une bibliothèque contre Standard Schema

Si **toi** publies un outil qui reçoit des schémas — client HTTP typé, parseur de
variables d'environnement, routeur — type ton paramètre avec `StandardSchemaV1`,
pas avec `z.ZodType` : tu gagnes tout l'écosystème d'un coup, sans imposer de
validateur à tes utilisateurs.

:::compare
::bad
```ts
import type { ZodType, infer as zInfer } from "zod";

// Ta bibliothèque force Zod sur tous tes utilisateurs.
export function defineRoute<S extends ZodType>(
  schema: S,
  handler: (input: zInfer<S>) => Response,
) { /* ... */ }
```
::
::good
```ts
import type { StandardSchemaV1 as S1 } from "@standard-schema/spec";

// Ta bibliothèque accepte Zod, Valibot, ArkType… au choix de l'utilisateur.
export function defineRoute<S extends S1>(
  schema: S,
  handler: (input: S1.InferOutput<S>) => Response,
) { /* ... */ }
```
::
:::

**Pourquoi.** Typer contre Zod te lie à Zod : ta bibliothèque suit ses versions,
tes utilisateurs héritent de sa taille de bundle, et ceux qui préfèrent Valibot
sont exclus. Typer contre `StandardSchemaV1` inverse le rapport — c'est
l'utilisateur qui apporte son validateur. La règle pour du code de bibliothèque :
**dépends du contrat, jamais du fournisseur**.

## À retenir

Standard Schema est une interface minimale — la propriété `~standard`
(`version`, `vendor`, `validate`, `types`) — que Zod, Valibot, ArkType et
d'autres implémentent, pour qu'un outil accepte n'importe quel validateur sans
adaptateur. Consomme-la avec `schema["~standard"].validate(input)`, infère la
sortie avec `StandardSchemaV1.InferOutput`, et côté bibliothèque type tes entrées
contre le contrat, pas contre un validateur précis.

:::cheatsheet
- title: "~standard"
  desc: "Propriété unique du contrat. Préfixe ~ pour la cacher de l'autocomplétion. Membres : version, vendor, validate, types."
- title: "~standard.validate(input)"
  desc: "Valide une entrée unknown. Renvoie { value } (succès) ou { issues } (échec, message + path). Jamais de throw ; peut être async."
- title: "Result discriminé"
  desc: "issues absent = value typé, issues présent = échec. Rétréci par if (result.issues)."
- title: "StandardSchemaV1.InferOutput<T>"
  desc: "Infère le type de sortie via la propriété fantôme types, sans connaître la bibliothèque."
- title: "@standard-schema/spec"
  desc: "Types purs, zéro runtime. Importe avec import type, aucun poids dans le bundle."
- title: "Producteurs / consommateurs"
  desc: "Produisent : Zod, Valibot, ArkType, Effect Schema. Consomment : tRPC, TanStack, Hono, oRPC."
- title: "Code de bibliothèque"
  desc: "Type contre StandardSchemaV1, pas contre z.ZodType : dépends du contrat, jamais du fournisseur."
:::
