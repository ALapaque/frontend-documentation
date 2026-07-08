---
title: "Construire une UI de chat streaming"
slug: "chat-streaming-ui"
framework: "ia"
level: "medior"
order: 1
duration: 16
prerequisites: ["llm-basics"]
updated: 2026-07-08
seoTitle: "UI de chat streaming — SSE, ReadableStream, markdown progressif, abort, a11y"
seoDescription: "Construire une interface de chat IA robuste : streamer la réponse (SSE ou fetch + ReadableStream), rendre le markdown progressivement, gérer les états et l'interruption (AbortController), l'auto-scroll intelligent et l'accessibilité (aria-live)."
ogVariant: "gold"
related:
  - { framework: "web", slug: "fetch" }
  - { framework: "ia", slug: "ai-sdk" }
---

Le chat IA est devenu un composant aussi banal qu'un formulaire de login. Le faire *bien* est un vrai sujet d'ingénierie front : un flux de tokens qui arrive pendant plusieurs secondes, du markdown à moitié écrit, un utilisateur qui veut lire, interrompre, relancer. Rien de tout ça n'est géré par le navigateur tout seul.

Cet article est framework-agnostique : les exemples sont en TS vanilla, tu les transposes tels quels dans Angular, React ou Vue. Ce qui compte, ce sont les mécanismes — transport, machine d'états, interruption, rendu progressif, scroll, accessibilité.

## Recevoir un flux : SSE ou ReadableStream

Deux transports dominent. Les *Server-Sent Events* (`EventSource`) : simples, reconnexion automatique, mais limités au GET, sans corps ni en-têtes personnalisés. Et le fetch streamé : tu lis `response.body` chunk par chunk. C'est lui qui domine en 2026, parce qu'un chat envoie l'historique en POST, ajoute un token d'auth, et doit pouvoir s'interrompre.

```ts
const res = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages }),
});
const reader = res.body!.getReader();
const decoder = new TextDecoder();
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  onToken(decoder.decode(value, { stream: true }));
}
```

**Pourquoi.** `getReader()` te donne la main sur chaque chunk réseau dès son arrivée, sans attendre la fin de la réponse. L'option `{ stream: true }` du `TextDecoder` est indispensable : un caractère multi-octets (é, emoji) peut être coupé entre deux chunks, et sans elle tu affiches des `�`. Si ton serveur envoie des événements SSE sérialisés (`data: {...}\n\n`) plutôt que du texte brut, ajoute un découpage par ligne avant de parser.

## L'état d'une conversation

Une réponse IA traverse des états distincts. Modélise-les explicitement au lieu d'empiler des booléens.

```ts
type ChatStatus = "idle" | "submitted" | "streaming" | "done" | "error";
```

`submitted` ≠ `streaming` : entre l'envoi et le premier token, il y a le TTFT (*time to first token*), souvent 300 ms à 2 s. Pendant `submitted`, tu affiches un indicateur d'attente (« … ») ; dès le premier chunk, tu passes en `streaming` et l'indicateur laisse place au texte. Fusionner les deux donne soit un blanc gênant, soit un indicateur qui clignote au milieu du texte. Range ce statut au niveau de la conversation, pas du message : un seul flux actif à la fois, c'est ce qui rend l'interruption et le retry simples à raisonner.

## Stop : AbortController obligatoire

Un chat sans bouton stop fonctionnel est cassé. Et « stop » ne veut pas dire cacher l'UI : il faut couper la requête, côté navigateur et côté serveur. Branche l'abort sur le bouton stop **et** sur la navigation ou le démontage du composant.

:::compare
::bad
```ts
async function send(messages: Message[]) {
  const res = await fetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages }), // pas de signal
  });
  // le bouton stop ne fait que masquer la zone :
  // le flux continue et les tokens sont facturés
}
```
::
::good
```ts
let controller: AbortController | null = null;

async function send(messages: Message[]) {
  controller?.abort();               // une seule requête active
  controller = new AbortController();
  const res = await fetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
    signal: controller.signal,
  });
}
stopButton.onclick = () => controller?.abort();
cleanup(() => controller?.abort()); // démontage / navigation
```
::
:::

**Pourquoi.** Sans `signal`, la connexion reste ouverte : le modèle continue de générer (et de facturer), et les chunks arrivent dans un composant qui n'existe plus — fuite mémoire et erreurs fantômes. Avec le signal, `reader.read()` rejette avec un `AbortError` que tu traites comme une fin normale (garde le texte partiel, passe en `done`), pas comme une erreur à afficher.

## Markdown progressif sans clignotement

Le piège classique : re-parser tout le markdown et remplacer tout le HTML à chaque chunk. Résultat : clignotement, sélection de texte perdue, images rechargées, coût CPU qui grimpe avec la longueur de la réponse. La stratégie robuste : bufferiser le texte brut, figer les blocs terminés et ne re-parser que la partie *instable* — la fin.

```ts
function splitStable(md: string): { stable: string; tail: string } {
  const cut = md.lastIndexOf("\n\n");
  if (cut === -1) return { stable: "", tail: md };
  const stable = md.slice(0, cut);
  const fences = (stable.match(/^```/gm) ?? []).length;
  if (fences % 2 !== 0) return { stable: "", tail: md }; // fence ouverte
  return { stable, tail: md.slice(cut) };
}
```

**Pourquoi.** Un paragraphe suivi d'une ligne vide ne changera plus : son HTML est rendu une fois pour toutes. Seule la queue est re-parsée à chaque chunk — coût constant au lieu de quadratique. Le test sur les fences évite le pire cas : couper au milieu d'un bloc de code ouvert et rendre la suite comme du texte. Tant qu'une fence est ouverte, soit tu ne coupes pas, soit tu la fermes virtuellement pour l'affichage. Des libs de streaming markdown font ce travail pour toi ; vérifie juste qu'elles gèrent ce cas de la fence incomplète.

## L'auto-scroll qui ne vole pas la main

Suivre le bas de la conversation, oui — mais seulement si l'utilisateur y était déjà. S'il est remonté relire un passage, chaque token qui le ramène de force en bas est une agression.

```ts
const NEAR_BOTTOM = 80; // tolérance en px
let follow = true;
list.addEventListener("scroll", () => {
  follow = list.scrollHeight - list.scrollTop - list.clientHeight < NEAR_BOTTOM;
});
function onToken(text: string) {
  appendToDom(text);
  if (follow) list.scrollTop = list.scrollHeight;
}
```

**Pourquoi.** Le seuil de tolérance évite qu'un pixel d'écart désactive le suivi. Dès que l'utilisateur remonte, `follow` passe à `false` et le flux continue sans le déranger ; affiche alors un bouton « reprendre le fil » qui remet `follow` à `true` et redescend. C'est le même contrat qu'un terminal : le scroll appartient à l'utilisateur.

## Accessibilité

Une zone qui se remplit toute seule est invisible pour un lecteur d'écran si tu ne la déclares pas.

```html
<div role="log" aria-live="polite" aria-busy="true"><!-- réponse --></div>
<button type="button">Arrêter la génération</button>
```

**Pourquoi.** `aria-live="polite"` annonce le contenu sans interrompre l'utilisateur, et `aria-busy` repasse à `false` en fin de flux. Mais surtout : n'annonce **pas** chaque token — le lecteur d'écran répéterait la phrase entière à chaque mutation. Alimente la zone live par phrases ou blocs terminés (le découpage `stable` de la section markdown sert aussi à ça). Côté focus : à l'envoi, le champ de saisie garde le focus, pas de saut arbitraire. Et le bouton stop est un vrai `<button>` atteignable au clavier, pas un `div` cliquable.

:::callout{type="warn"}
Ne mets jamais `aria-live` sur le conteneur qui reçoit les tokens bruts. Utilise une zone d'annonce séparée (visuellement masquée si besoin), alimentée par blocs stabilisés.
:::

## Optimistic UI

Le message de l'utilisateur s'affiche immédiatement, avant toute réponse réseau — attendre le serveur pour montrer son propre texte donne une UI qui semble en panne. Ajoute le message à la liste avec un statut `pending`, lance la requête, puis réconcilie : en succès, il devient définitif ; en erreur, marque-le `failed` avec un bouton « réessayer » qui renvoie le même contenu sans le dupliquer dans l'historique. Garde le texte saisi tant que l'envoi n'a pas réussi : vider le champ puis perdre la requête, c'est perdre le travail de l'utilisateur.

## À retenir

:::cheatsheet
- title: "fetch + ReadableStream"
  desc: "POST, en-têtes, abort : le transport de référence. TextDecoder avec { stream: true }."
- title: "Machine d'états"
  desc: "idle → submitted → streaming → done/error. submitted couvre le TTFT avec un indicateur."
- title: "AbortController partout"
  desc: "Bouton stop, navigation, démontage. AbortError = fin normale, on garde le texte partiel."
- title: "Markdown par blocs stabilisés"
  desc: "Fige les blocs terminés, re-parse seulement la queue, ferme les code fences incomplètes."
- title: "Scroll conditionnel"
  desc: "Suis le bas seulement si l'utilisateur y était (seuil en px) ; sinon bouton « reprendre le fil »."
- title: "a11y par blocs"
  desc: "aria-live polite alimenté par phrases, jamais token par token ; stop accessible clavier ; message utilisateur optimiste avec retry."
:::
