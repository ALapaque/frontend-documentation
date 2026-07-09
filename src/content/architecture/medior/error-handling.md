---
title: "Gérer les erreurs comme une architecture"
slug: "error-handling"
framework: "architecture"
level: "medior"
order: 4
duration: 16
prerequisites: ["foundations"]
updated: 2026-07-09
seoTitle: "Architecture de gestion d'erreurs — exceptions vs Result, erreurs typées, résilience"
seoDescription: "Une stratégie d'erreurs cohérente : distinguer erreurs attendues et bugs, exceptions vs type Result, erreurs typées et frontières (error boundaries), retry/fallback, et dégradation côté utilisateur. Arrêter le try/catch au hasard."
ogVariant: "crimson"
related:
  - { framework: "architecture", slug: "foundations" }
  - { framework: "architecture", slug: "hexagonal-clean" }
---

La gestion d'erreurs est trop souvent un `try/catch` posé au hasard, qui avale l'erreur et affiche « une erreur est survenue ». Ça a l'air propre, ça ne l'est pas : tu viens de perdre l'information, et l'utilisateur ne sait pas quoi faire. Une vraie stratégie ne « rattrape » pas — elle **distingue les types d'erreurs** et décide, pour chacun, **où** et **comment** il est traité. C'est une décision d'architecture, pas un réflexe.

## Deux familles d'erreurs

La première question, avant tout code : **est-ce une erreur attendue ou un bug ?** Les deux ne se traitent pas pareil.

:::cheatsheet
- title: "Erreurs attendues"
  desc: "Validation qui échoue, 404, conflit, quota dépassé. Des états normaux du domaine. Elles font partie du contrat."
- title: "Bugs / pannes"
  desc: "Null inattendu, API qui répond du HTML, réseau coupé, division par zéro. Imprévues. Elles remontent."
:::

Une erreur **attendue** est un résultat parmi d'autres : « cet email est déjà pris » n'est pas un incident, c'est une réponse. Tu la modélises, tu l'affiches, la vie continue. Un **bug** est une promesse cassée du code : tu ne veux pas l'« afficher joliment », tu veux qu'il **remonte**, qu'il soit loggué avec son contexte, et corrigé.

**Pourquoi ça compte.** Si tu traites les deux avec le même `catch (e) { toast('erreur') }`, tu masques les bugs (personne ne les voit passer) *et* tu prives l'utilisateur d'un message utile sur les cas attendus. Le mélange est le pire des deux mondes.

## Exceptions vs type `Result`

Deux façons de signaler un échec. `throw` est **implicite** : rien dans la signature ne dit que la fonction peut échouer, l'appelant doit le deviner. Un `Result<T, E>` rend l'échec **explicite** dans le type — impossible de l'ignorer sans que TypeScript proteste.

:::compare
::bad
```ts
// Signature qui ment : « rend un User », en fait elle throw
function findUser(id: string): User {
  const row = db.get(id);
  if (!row) throw new Error('not found'); // invisible à l'appel
  return row;
}

// L'appelant ne sait pas qu'il doit gérer l'absence
const user = findUser(id); // 💥 un jour, en prod
```
::
::good
```ts
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// La signature dit la vérité : ça peut échouer, voici comment
function findUser(id: string): Result<User, 'not_found'> {
  const row = db.get(id);
  if (!row) return { ok: false, error: 'not_found' };
  return { ok: true, value: row };
}

const res = findUser(id);
if (!res.ok) return renderNotFound(); // le compilateur l'exige
use(res.value);
```
::
:::

Le `Result` n'est pas « mieux » partout, c'est un **choix par cas** :

- **Erreur attendue et locale** → `Result`. L'échec fait partie du domaine, l'appelant immédiat sait quoi en faire. Il est forcé de le traiter.
- **Vraiment exceptionnel** → exception. Une panne qui doit traverser dix couches sans que chacune la trimballe à la main : `throw` la fait remonter jusqu'à une frontière qui l'attrape. Encombrer chaque signature d'un `Result` pour un cas qui ne se produit jamais est du bruit.

La règle : **`Result` pour le domaine attendu, exception pour l'exceptionnel.** Pas l'inverse.

## Erreurs typées

`throw new Error('...')` jette une chaîne de caractères déguisée. L'appelant ne peut que faire `catch (e)` et espérer. Modélise plutôt tes erreurs comme une **union discriminée** : le type liste les cas possibles, et le compilateur vérifie l'exhaustivité.

```ts
type AppError =
  | { kind: 'not_found'; entity: string }
  | { kind: 'forbidden'; action: string }
  | { kind: 'validation'; fields: Record<string, string> }
  | { kind: 'conflict'; reason: string };

function toMessage(e: AppError): string {
  switch (e.kind) {
    case 'not_found':  return `${e.entity} introuvable.`;
    case 'forbidden':  return `Action non autorisée : ${e.action}.`;
    case 'validation': return 'Corrige les champs en rouge.';
    case 'conflict':   return e.reason;
    // pas de default : ajoute un cas au type → ce switch ne compile plus
  }
}
```

**Pourquoi.** L'exhaustivité devient une garantie du **type**, pas de ta vigilance. Le jour où tu ajoutes `{ kind: 'rate_limited' }`, tous les `switch` qui traitent `AppError` refusent de compiler tant que tu n'as pas décidé quoi en faire. Un `Error` fourre-tout, lui, laisse passer le nouveau cas en silence.

## Les frontières

Une erreur ne se rattrape pas n'importe où. Elle se rattrape à une **frontière** : un endroit désigné où on la **traduit** vers le vocabulaire de la couche suivante. Entre les frontières, elle voyage sans qu'on la touche.

```text
Adaptateur HTTP   →  traduit 404/500 en AppError du domaine
      ↓
Domaine           →  renvoie un Result<T, AppError>
      ↓
Frontière UI      →  error boundary / middleware : AppError → message + log
```

Chaque couche parle sa langue. La couche data ne connaît que des codes HTTP ; elle les **traduit** en `AppError` avant de les passer au domaine — c'est le renvoi hexagonal (voir [hexagonal & clean](/architecture/senior/hexagonal-clean)). Le domaine ne sait pas ce qu'est un statut 403, il connaît `forbidden`. L'UI ne sait pas ce qu'est un `forbidden` brut, elle connaît un message et un log.

:::callout{type="tip"}
**Ne catch pas trop tôt.** Un `try/catch` autour de chaque `await` est un anti-pattern : tu attrapes une erreur là où tu n'as pas le contexte pour décider quoi en faire, alors tu l'avales. Laisse-la remonter jusqu'à la frontière qui, elle, sait décider : réessayer, afficher, dégrader ou abandonner.
:::

Concrètement, tu as **peu** de frontières : l'*error boundary* React/Vue en haut de l'arbre UI, un middleware d'erreurs côté serveur, la fonction qui enveloppe un appel réseau. Trois ou quatre points, pas cinquante.

## Résilience

Certaines erreurs sont **transitoires** : le réseau a hoqueté, le serveur était saturé une seconde. Les traiter comme fatales est excessif. Quelques mécanismes, à doser :

:::cheatsheet
- title: "Retry + backoff"
  desc: "Réessaie, avec un délai croissant. Uniquement si l'opération est idempotente — sinon tu factures deux fois."
- title: "Timeout"
  desc: "Une requête sans limite de temps peut bloquer l'UI indéfiniment. Coupe et traite comme un échec."
- title: "Fallback"
  desc: "Valeur par défaut, cache périmé, version dégradée. Mieux qu'un écran blanc."
- title: "Circuit breaker"
  desc: "Après N échecs, arrête de marteler le service mort pendant un temps. Évite l'effet avalanche."
:::

Le point critique est l'**idempotence** : réexécuter un `GET` est sans risque, réexécuter un `POST` de paiement peut débiter deux fois. Ne mets de retry automatique que là où réexécuter est **prouvé** sans effet de bord — sinon exige une clé d'idempotence côté serveur.

## Côté utilisateur

L'erreur finit devant quelqu'un. Deux règles : le message est **actionnable**, et il ne **fuite jamais** de détail technique.

:::compare
::bad
```ts
catch (e) {
  toast(String(e)); // « TypeError: cannot read 'id' of undefined »
}
```
::
::good
```ts
catch (e) {
  logger.error('checkout failed', { userId, cartId, requestId, cause: e });
  toast('Le paiement n\'a pas abouti. Réessaie dans un instant.');
}
```
::
:::

Un stack trace à l'écran effraie l'utilisateur et renseigne un attaquant. Vise une **dégradation gracieuse** : si le widget de recommandations tombe, affiche le reste de la page — un module en panne ne doit pas emporter l'application entière.

Et surtout, la contrepartie du message discret côté UI, c'est un log **riche** côté observabilité : le contexte (identifiants, action, `requestId` pour corréler les couches), la cause originale, un identifiant que l'utilisateur peut te communiquer. Le message rassure ; le log te permet de corriger.

:::callout{type="warn"}
**Avaler une erreur en silence est le pire bug possible.** `catch (e) {}` ou `catch (e) { /* on ignore */ }` transforme un incident en mystère : le comportement est faux, rien dans les logs, impossible à reproduire. Si tu attrapes une erreur, tu fais **au moins** l'une de ces trois choses : la logguer avec son contexte, la traduire pour l'utilisateur, ou la relancer. Jamais rien.
:::

## À retenir

:::cheatsheet
- title: "Attendue vs bug"
  desc: "L'attendue fait partie du contrat (on la modélise), le bug remonte (on le loggue et on le corrige)."
- title: "Result pour le domaine"
  desc: "Échec explicite dans la signature, l'appelant est forcé de le traiter. Exception pour l'exceptionnel."
- title: "Erreurs typées"
  desc: "Union discriminée plutôt qu'Error fourre-tout. L'exhaustivité vérifiée par le compilateur."
- title: "Peu de frontières"
  desc: "Chaque couche traduit vers la suivante. Ne catch pas trop tôt, là où tu n'as pas le contexte."
- title: "Résilience dosée"
  desc: "Retry seulement si idempotent, timeout, fallback, circuit breaker. Réseau ≠ fatal."
- title: "Message vs log"
  desc: "Utilisateur : actionnable, sans détail technique. Log : riche, corrélé. Jamais avaler en silence."
:::
