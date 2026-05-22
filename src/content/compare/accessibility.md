---
title: "Accessibilité"
lead: "Le framework ne rend pas accessible — voici ce qu'il vous donne, et ce qui reste à vous."
updated: 2026-05-22
seoTitle: "Accessibilité — Angular vs React vs Vue"
seoDescription: "Gestion du focus, live regions, liaisons ARIA et routing accessible : ce que chaque framework facilite (ou pas)."
related:
  - { framework: "angular", slug: "forms-basics" }
  - { framework: "react", slug: "forms-basics" }
  - { framework: "vue", slug: "forms-basics" }
---

## Vue d'ensemble

| Critère | Angular | React | Vue |
| --- | --- | --- | --- |
| Helpers natifs | CDK a11y (riche) | Aucun | Aucun |
| Focus trap | `cdkTrapFocus` | Manuel / lib | Manuel / lib |
| Annonce live | `LiveAnnouncer` | `aria-live` à la main | vue-announcer / `aria-live` |
| Focus au routing | `withNavigationErrorHandler` / manuel | Manuel sur changement de route | Manuel + `nextTick` |
| Sémantique / ARIA | À vous | À vous | À vous |

## La vérité partagée

Aucun framework ne vous rend accessible. La **sémantique HTML**, les rôles ARIA,
le contraste, l'ordre de tabulation et les libellés sont **votre travail** dans
les trois cas. Le framework n'aide que sur la mécanique : déplacer le focus,
annoncer un changement, piéger le focus dans une modale. C'est là que les
écarts d'outillage apparaissent.

## Focus et annonce après une action

:::tri{title="Déplacer le focus + annoncer un résultat"}
::angular
```ts
export class SearchResults {
  private announcer = inject(LiveAnnouncer);
  private heading = viewChild<ElementRef>('heading');

  async onSearch(query: string) {
    const results = await this.api.search(query);
    this.heading()?.nativeElement.focus();
    this.announcer.announce(`${results.length} résultats`, 'polite');
  }
}
// template : <h2 #heading tabindex="-1">Résultats</h2>
```
::
::react
```tsx
function SearchResults() {
  const heading = useRef<HTMLHeadingElement>(null);
  const [msg, setMsg] = useState('');

  async function onSearch(query: string) {
    const results = await api.search(query);
    heading.current?.focus();
    setMsg(`${results.length} résultats`);
  }

  return (
    <>
      <h2 ref={heading} tabIndex={-1}>Résultats</h2>
      <p aria-live="polite" className="sr-only">{msg}</p>
    </>
  );
}
```
::
::vue
```vue
<script setup lang="ts">
import { ref, nextTick } from 'vue';

const heading = ref<HTMLElement>();
const msg = ref('');

async function onSearch(query: string) {
  const results = await api.search(query);
  msg.value = `${results.length} résultats`;
  await nextTick();
  heading.value?.focus();
}
</script>

<template>
  <h2 ref="heading" tabindex="-1">Résultats</h2>
  <p aria-live="polite" class="sr-only">{{ msg }}</p>
</template>
```
::
:::

## Le focus au changement de route

:::callout{type="warn"}
Dans une SPA, la navigation ne déplace **pas** le focus par défaut — le lecteur
d'écran reste muet et le clavier reprend en haut de page. À chaque changement de
route, déplacez le focus sur le `<h1>` (ou un conteneur `tabindex="-1"`) et
annoncez le nouveau titre. Aucun des trois frameworks ne le fait pour vous.
:::

Angular a un avantage net ici via le **CDK a11y** : `FocusTrap`, `LiveAnnouncer`,
`FocusMonitor` et `cdkAriaLive` couvrent les cas durs sans dépendance externe.
React et Vue n'offrent rien en natif : on s'appuie sur des `ref` pour le focus,
des régions `aria-live` à la main, et des libs (`react-aria`, `vue-announcer`,
`focus-trap`).

## Verdict

L'accessibilité reste à **90 % de la discipline** : sémantique, ARIA, contraste,
tests au clavier et au lecteur d'écran — identiques partout. Sur les 10 %
mécaniques, **Angular prend l'avantage** grâce au CDK a11y, batteries incluses.
React et Vue obligent à assembler des libs, mais le résultat peut être tout aussi
bon. Quel que soit le stack : déplacez le focus à chaque navigation, annoncez les
changements asynchrones via `aria-live`, et **testez avec un vrai lecteur
d'écran**. Le framework facilite ou non — il ne décide jamais à votre place.
