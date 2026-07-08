---
title: "L'IA dans le navigateur : WebGPU, Prompt API, transformers.js"
slug: "browser-ai"
framework: "ia"
level: "senior"
order: 3
duration: 15
prerequisites: ["llm-basics"]
updated: 2026-07-08
seoTitle: "IA locale dans le navigateur — WebGPU, transformers.js, Prompt API de Chrome"
seoDescription: "Faire tourner de l'IA côté client : WebGPU comme socle, transformers.js pour les embeddings et la classification, la Prompt API de Chrome (Gemini Nano), le coût du téléchargement de modèles, et la matrice de décision local vs API."
ogVariant: "crimson"
related:
  - { framework: "ia", slug: "llm-basics" }
  - { framework: "web", slug: "web-platform-2026" }
---

Tout ne mérite pas un appel API. Classifier un avis, calculer des embeddings pour une recherche, transcrire un mémo vocal : des modèles de quelques dizaines de Mo font ça très bien, directement dans l'onglet de l'utilisateur. L'inférence y est **gratuite**, **privée** et **offline**.

Le métier du senior n'est pas de tout faire tourner en local — c'est de savoir **quand** le local est le bon choix, et comment en payer le vrai prix : le téléchargement du modèle.

## Pourquoi local : quatre pour, deux contre

- **Vie privée** : les données ne quittent jamais la machine. Un texte médical, un document RH, un brouillon confidentiel — rien ne transite par un serveur tiers. C'est un argument de conformité, pas juste de confort.
- **Latence** : zéro aller-retour réseau. Une classification en local répond en quelques millisecondes, quand un appel API en coûte 200 à 800.
- **Coût** : zéro facture d'inférence. Un moteur de recherche sémantique utilisé un million de fois par jour coûte la même chose que dix fois : rien.
- **Offline** : une fois le modèle en cache, l'app fonctionne dans le train, en avion, derrière un pare-feu d'entreprise.

Les deux contre-arguments sont tout aussi réels : la **qualité** — un modèle de 50 Mo ne raisonne pas, il classifie et encode ; pour de la génération longue ou du raisonnement, il ne rivalise pas avec un modèle frontier via API — et le **coût de téléchargement initial** : des dizaines à des centaines de Mo à faire descendre avant la première inférence.

## WebGPU : le socle

WebGPU donne au navigateur un accès direct aux capacités de calcul du GPU — là où WebGL détournait une API de rendu 3D et où WASM reste confiné au CPU. Pour l'inférence, l'écart est brutal : les benchmarks de transformers.js montrent des gains allant jusqu'à **10-100×** face au backend WASM selon le modèle et la machine.

Mi-2026, la disponibilité est large : Chrome et Edge le livrent depuis 2023, Firefox depuis la 141 (Windows, puis macOS), Safari depuis la version 26. Environ 80 % des utilisateurs mondiaux l'ont — ce qui veut dire que 20 % ne l'ont pas. La détection reste donc obligatoire :

```ts
async function hasWebGPU(): Promise<boolean> {
  if (!('gpu' in navigator)) return false;
  try {
    return (await navigator.gpu.requestAdapter()) !== null;
  } catch {
    return false;
  }
}
```

**Pourquoi.** La présence de `navigator.gpu` ne suffit pas : l'API peut exister alors qu'aucun adaptateur compatible n'est disponible (pilote bloqué, GPU trop ancien, VM sans accélération). Seul un `requestAdapter()` réussi garantit que l'inférence GPU fonctionnera — et son échec te dit de retomber sur WASM, pas d'abandonner.

## transformers.js : des modèles ONNX en trois lignes

La bibliothèque `@huggingface/transformers` (v3 en 2024 pour le backend WebGPU, v4 aujourd'hui) exécute des modèles ONNX dans le navigateur via ONNX Runtime Web. Plus de 1 000 modèles pré-convertis sont disponibles sur le Hub. L'API `pipeline` masque toute la tuyauterie :

```ts
import { pipeline } from '@huggingface/transformers';

const device = (await hasWebGPU()) ? 'webgpu' : 'wasm';

// Embeddings : recherche sémantique 100 % côté client
const embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
  device,
  dtype: 'q8', // quantifié : ~25 Mo au lieu de ~90
});
const vectors = await embed(
  ['mot de passe oublié', 'réinitialiser mes accès'],
  { pooling: 'mean', normalize: true },
);
```

**Pourquoi.** La recherche sémantique côté client est le cas d'usage front idéal : tu encodes tes documents (une fois, éventuellement au build), tu encodes la requête de l'utilisateur en local, et une similarité cosinus fait le reste — zéro serveur, zéro donnée exfiltrée, latence quasi nulle. La quantification `q8` (voire `q4`) divise la taille par 3-4 pour une perte de qualité marginale sur ces tâches.

Le même schéma couvre la classification de sentiment (`text-classification`, ~65 Mo) et la transcription (`automatic-speech-recognition` avec `whisper-tiny`, ~40 Mo). Bonus non négligeable : les fichiers du modèle sont mis en cache via la Cache API par la bibliothèque elle-même — le deuxième chargement est instantané.

## La Prompt API de Chrome (Gemini Nano)

Chrome embarque un vrai LLM, **Gemini Nano**, exposé aux pages via l'objet global `LanguageModel`. Statut mi-2026, à prendre avec prudence : l'API est disponible en stable pour les extensions Chrome, et déployée courant 2026 pour les sites web (documentée à partir de Chrome 138, généralisée vers la 148) ; certains volets — paramètres d'échantillonnage, entrées multimodales — restent en origin trial. Ce n'est **pas** un standard : ni Safari ni Firefox ne l'implémentent.

```ts
if ('LanguageModel' in self) {
  const status = await LanguageModel.availability(); // 'unavailable' | 'downloadable' | 'downloading' | 'available'
  if (status !== 'unavailable') {
    const session = await LanguageModel.create({
      monitor: (m) => m.addEventListener('downloadprogress', (e) => showProgress(e.loaded)),
    });
    const summary = await session.prompt(`Résume en 3 points :\n${article}`);
    session.destroy();
  }
}
```

**Pourquoi.** Résumé local, reformulation, correction de ton : des tâches courtes où Gemini Nano est correct et où la donnée ne sort pas de la machine. Mais les prérequis matériels sont lourds (ordinateur de bureau, ~22 Go d'espace disque libre, GPU avec plus de 4 Go de VRAM ou 16 Go de RAM) et le modèle se télécharge à la première utilisation. Traite cette API comme une **amélioration progressive** : le chemin nominal reste ton fallback serveur, la Prompt API est le raccourci quand elle est là.

## Le vrai coût : le téléchargement

Les ordres de grandeur : ~25 Mo pour un modèle d'embeddings quantifié, 40-80 Mo pour Whisper tiny/base, plusieurs centaines de Mo pour un petit LLM. La règle est simple : **jamais au chargement initial**. Le modèle se télécharge à la demande, sur une action explicite, avec une barre de progression — et pas du tout si l'utilisateur a activé l'économiseur de données.

:::compare
::bad
```ts
// Import au top-level : 40 Mo imposés à chaque visiteur, avant le premier rendu
import { pipeline } from '@huggingface/transformers';
const whisper = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny');
```
::
::good
```ts
// À la demande, avec progression et respect de Data Saver
async function loadWhisper(onProgress: (pct: number) => void) {
  if ((navigator as any).connection?.saveData) return null; // Data Saver : on s'abstient
  const { pipeline } = await import('@huggingface/transformers');
  return pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny', {
    progress_callback: (p) => onProgress(p.progress ?? 0),
  });
}
```
::
:::

:::callout{type="warn"}
Un modèle en cache n'est pas un modèle acquis pour toujours : le navigateur peut purger la Cache API ou l'OPFS sous pression de stockage. `navigator.storage.persist()` réduit le risque, mais ton code doit toujours savoir re-télécharger proprement.
:::

## Local ou API : la matrice

- **Local** : embeddings et recherche sémantique, classification, transcription, résumés courts, autocomplétion, et tout ce qui touche des **données sensibles** qui ne doivent pas sortir.
- **API** : génération longue où la qualité compte, raisonnement multi-étapes, appels d'outils, tout ce qui dépasse les capacités d'un modèle de poche.
- **Hybride** — le schéma le plus courant en pratique : embeddings calculés en local pour filtrer et classer, puis génération via API sur le contexte réduit. Tu paies l'API seulement là où elle apporte quelque chose.

:::callout{type="info"}
Ne vends pas le local comme « gratuit » à ton équipe produit : le coût a juste changé de colonne. Il est passé de ta facture API à la bande passante, au stockage et à la batterie de l'utilisateur. C'est souvent un bon échange — mais c'est un échange.
:::

## À retenir

:::cheatsheet
- title: "WebGPU"
  desc: "Socle de l'inférence rapide ; large en 2026 mais détecte via requestAdapter(), fallback WASM."
- title: "transformers.js"
  desc: "Modèles ONNX via pipeline() ; device: 'webgpu', cache automatique des poids."
- title: "dtype: 'q8' / 'q4'"
  desc: "Quantification : taille divisée par 3-4, perte marginale sur embeddings et classification."
- title: "Prompt API (LanguageModel)"
  desc: "Gemini Nano dans Chrome ; prérequis matériels lourds, Chrome-only → toujours un fallback serveur."
- title: "Téléchargement"
  desc: "Jamais au chargement initial : à la demande, progress UI, Cache API/OPFS, respect de saveData."
- title: "Local"
  desc: "Embeddings, classification, transcription, résumés courts, données sensibles."
- title: "API / hybride"
  desc: "Génération longue, raisonnement, outils ; hybride courant : embeddings locaux + génération API."
:::
