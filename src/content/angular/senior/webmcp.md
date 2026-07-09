---
title: "WebMCP : exposer ton app aux agents IA"
slug: "webmcp"
framework: "angular"
level: "senior"
order: 13
duration: 15
prerequisites: ["signals", "signal-forms"]
updated: 2026-07-08
seoTitle: "WebMCP dans Angular 22 — declareExperimentalWebMcpTool, formulaires et agents"
seoDescription: "Angular 22 embarque un support expérimental de WebMCP : exposer les capacités d'une page aux agents IA — outils déclarés (declareExperimentalWebMcpTool), formulaires auto-exposés (provideExperimentalWebMcpForms), et les questions de sécurité qui vont avec."
ogVariant: "crimson"
related:
  - { framework: "angular", slug: "angular-22" }
  - { framework: "ia", slug: "mcp" }
---

Un agent IA qui « utilise » ton app fait de l'archéologie : parser le DOM,
deviner que ce `<div>` cliquable ajoute au panier, espérer que le sélecteur
tienne. WebMCP inverse la logique : la page **déclare** ses capacités aux agents, en outils typés.

Angular 22 (sorti le 3 juin 2026) est le premier framework majeur à embarquer
cette piste — en **expérimental**, et le mot compte, on y revient.

## Le problème : les agents pilotent ton UI à l'aveugle

Sans WebMCP, l'agent pilote ta page en aveugle — scraping du DOM, sélecteurs fragiles, clics et saisies simulés :

- **Fragile** : un refactoring de template casse le « parcours » de l'agent, sans qu'aucun de tes tests ne le voie.
- **Lent et coûteux** : chaque étape exige d'interpréter une page entière au lieu d'appeler une fonction.
- **Hasardeux** : « Supprimer » cliqué au lieu de « Modifier », parce que le libellé était ambigu.
- **Hors de ton contrôle** : ta logique métier est contournée dès que l'agent manipule le DOM autrement que prévu.

## WebMCP en deux phrases

WebMCP transpose le modèle [MCP](/ia/senior/mcp) — outils déclarés, entrées
décrites par schéma, résultats structurés — **dans la page**, via la nouvelle API
`navigator.modelContext`. L'agent découvre des outils typés au lieu de deviner des boutons.

Côté navigateurs, la proposition est portée par des ingénieurs de Google et de
Microsoft dans un groupe communautaire du W3C — ce n'est **pas** un standard, ni
même sur la voie de normalisation — et se teste en origin trial Chrome depuis mi-2026.

## declareExperimentalWebMcpTool : déclarer un outil

L'API de base vient de `@angular/core` : tu déclares un outil dans un contexte
d'injection — nom, description pour l'agent, schéma d'entrée, fonction `execute`.

```ts
import { Injectable, inject, declareExperimentalWebMcpTool } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PanierAgentTools {
  constructor() {
    declareExperimentalWebMcpTool({
      name: 'ajouter_au_panier',
      description: 'Ajoute un produit au panier, avec une quantité.',
      inputSchema: {
        type: 'object',
        properties: {
          produitId: { type: 'string' },
          quantite: { type: 'number', minimum: 1, maximum: 10 },
        },
        required: ['produitId', 'quantite'],
      },
      execute: async ({ produitId, quantite }) => {
        await inject(PanierService).ajouter(produitId, quantite);
        return { content: [{ type: 'text', text: `Produit ${produitId} ajouté (×${quantite})` }] };
      },
    });
  }
}
```

**Pourquoi.** L'outil vit avec le contexte d'injection : enregistré à la
création du service ou du composant, désenregistré à sa destruction — et
`execute` tourne dans ce contexte, donc `inject()` y fonctionne. Déclaré dans un
composant, l'outil n'existe que quand celui-ci est à l'écran : utile en contextuel,
mais gare aux collisions de noms s'il est instancié deux fois ; pour du global,
préfère un service `root` ou le provider `provideExperimentalWebMcpTools()`.

## provideExperimentalWebMcpForms : tes formulaires deviennent des outils

Le pont le plus élégant concerne les Signal Forms : active le provider, puis
annote un formulaire avec l'option `experimentalWebMcpTool`.

```ts
import { provideExperimentalWebMcpForms, form, required, max } from '@angular/forms/signals';

// app.config.ts
providers: [provideExperimentalWebMcpForms()],

// dans le composant
model = signal({ email: '', personnes: 1 });
f = form(this.model, (path) => {
  required(path.email);
  max(path.personnes, 8);
}, {
  experimentalWebMcpTool: {
    name: 'reserver_table',
    description: 'Réserve une table : email de contact et nombre de personnes.',
  },
});
```

**Pourquoi.** Angular dérive le schéma JSON de l'outil des valeurs initiales du
modèle et des validateurs, puis déclare l'outil pour toi. L'agent remplit le
formulaire via l'API structurée, mais **la validation reste la tienne** :
`required`, `max`, validation croisée ou serveur, tout s'applique — le formulaire
reste la frontière du métier, pour un humain comme pour un agent. Contrainte :
valeurs initiales concrètes (pas de `null`) et tableaux non vides, sinon pas d'inférence de types.

## Sécurité : la partie sérieuse

:::callout{type="warn"}
Exposer des outils, c'est donner tes droits à un logiciel qui obéit à du texte.
Consentement utilisateur explicite, jamais d'action destructive sans
confirmation humaine, et méfiance absolue envers la prompt injection.
:::

La prompt injection, concrètement : l'agent lit la page, donc un contenu tiers
(avis client, email affiché) peut le manipuler et détourner tes outils. Traite
chaque outil comme une **API publique** : permissions minimales, la lecture avant
l'écriture, autorisations revérifiées côté serveur, aucune capacité que ton UI
n'offre pas déjà. Et `inputSchema` documente sans valider : valide dans `execute`.

## Statut et stratégie d'adoption

Tout est expérimental, des deux côtés. Les API Angular sont préfixées
`Experimental` et peuvent changer **hors versions majeures** ; côté navigateur,
seul Chrome propose l'origin trial (unique agent consommateur à ce jour : Gemini
dans Chrome), et le polyfill `@mcp-b/webmcp-polyfill` permet de développer sans
flag. La bonne posture mi-2026 : prototype sur une feature non critique, mesure
ce que ça change pour un agent réel, suis la spec du groupe W3C et les RFC
Angular — mais ne construis pas de produit dessus.

## À retenir

:::cheatsheet
- title: "WebMCP = MCP dans la page"
  desc: "La page déclare des outils typés via navigator.modelContext ; l'agent appelle au lieu de scraper."
- title: "declareExperimentalWebMcpTool"
  desc: "Outil lié au contexte d'injection : créé et retiré avec lui. Service root pour un outil global."
- title: "provideExperimentalWebMcpForms"
  desc: "Un Signal Form annoté experimentalWebMcpTool devient un outil ; tes validateurs restent maîtres."
- title: "Sécurité : pense API publique"
  desc: "Consentement, confirmation du destructif, prompt injection, permissions minimales — et inputSchema documente sans valider : valide dans execute."
- title: "Expérimental, vraiment"
  desc: "API mouvantes hors majeures, origin trial Chrome. Prototyper oui, livrer non."
:::
