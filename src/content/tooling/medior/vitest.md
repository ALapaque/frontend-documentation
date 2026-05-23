---
title: "Vitest : tester à la vitesse de Vite"
slug: "vitest"
framework: "tooling"
level: "medior"
order: 2
duration: 14
prerequisites: ["vite"]
updated: 2026-05-23
seoTitle: "Vitest — mocks, watch, coverage, ESM/TS natif (Medior)"
seoDescription: "Vitest en 2026 : compatible Jest mais ESM/TS/JSX natif via Oxc, vi.fn(), mode watch, coverage, jsdom/happy-dom. Le pourquoi du mécanisme."
ogVariant: "gold"
related:
  - { framework: "tooling", slug: "vite" }
  - { framework: "tooling", slug: "linting-formatting" }
---

## Pourquoi un test runner adossé à Vite

Tester du front, c'est exécuter du code qui utilise `import`, du TypeScript, du
JSX, et qui suppose un environnement navigateur (`document`, `window`). Un runner
doit donc résoudre les modules, transpiler, et simuler le DOM. **Jest** faisait
tout ça, mais avec sa propre pipeline : son propre transformeur, sa propre
résolution de modules, sa propre config — souvent **différentes** de celles de
ton bundler. D'où la plaie classique : ça compile en dev, mais Jest plante sur un
`import` ESM.

**Vitest** retourne le problème : il **réutilise la config et le pipeline de
Vite**. Le même `vite.config.ts`, les mêmes alias, les mêmes plugins, le même
moteur de transformation (Oxc en Rust). Si Vite sait charger ton code, Vitest
aussi — sans config dupliquée.

:::callout{type="info"}
Vitest expose une API **compatible Jest** (`describe`, `it`/`test`, `expect`,
`beforeEach`…). La migration depuis Jest est en grande partie un remplacement de
`jest.fn` par `vi.fn` et de la config. Le savoir Jest existant reste valable.
:::

## Anatomie d'un test

```ts cart.test.ts
import { describe, it, expect } from 'vitest';
import { addItem } from './cart';

describe('addItem', () => {
  it('ajoute un produit au panier', () => {
    const cart = addItem([], { id: 'a', qty: 1 });
    expect(cart).toHaveLength(1);
    expect(cart[0]).toEqual({ id: 'a', qty: 1 });
  });
});
```

`describe` regroupe, `it` (alias `test`) déclare un cas, `expect(...).matcher()`
pose l'assertion. Le fichier est transpilé par Oxc à la volée : pas d'étape de
build préalable, le TS et le JSX passent nativement.

## Mocks et `vi.fn()`

Un **mock** remplace une dépendance réelle par une version contrôlable, pour
isoler l'unité testée (couper un appel réseau, figer le temps, vérifier qu'une
fonction a bien été appelée).

```ts
import { vi, it, expect } from 'vitest';

it('appelle le callback une fois par item', () => {
  const onAdd = vi.fn();              // spy : enregistre les appels
  process([1, 2, 3], onAdd);
  expect(onAdd).toHaveBeenCalledTimes(3);
  expect(onAdd).toHaveBeenLastCalledWith(3);
});

// Mock d'un module entier
vi.mock('./api', () => ({ fetchUser: vi.fn().mockResolvedValue({ id: 1 }) }));
```

`vi.fn()` crée une fonction-espion qui mémorise chaque appel (arguments, valeur
de retour) tout en pouvant simuler un comportement (`mockReturnValue`,
`mockResolvedValue`). `vi.mock(path)` intercepte un import : Vitest **hisse** cet
appel en haut du module et substitue le module avant que ton code ne l'importe.

## L'environnement DOM : jsdom vs happy-dom

Node n'a pas de `document`. Pour tester du code qui touche au DOM, Vitest charge
un environnement simulé. Deux choix, configurés par `environment`.

:::compare
::bad
```ts
// environment: 'node' — pas de DOM
it('rend le bouton', () => {
  document.body.innerHTML = '<button>OK</button>';
  // ReferenceError: document is not defined
});
```
::
::good
```ts
// vitest.config.ts -> test: { environment: 'happy-dom' }
it('rend le bouton', () => {
  document.body.innerHTML = '<button>OK</button>';
  expect(document.querySelector('button')?.textContent).toBe('OK');
});
```
::
:::

**Pourquoi.** `jsdom` et `happy-dom` réimplémentent les API du navigateur **en
JavaScript** pour qu'elles existent dans Node. `jsdom` est le plus complet et
conforme aux specs ; `happy-dom` est plus léger et plus rapide mais couvre moins
de cas exotiques. Tu choisis selon le besoin : DOM riche et conforme → jsdom ;
vitesse sur des composants simples → happy-dom. Pour de la logique pure sans DOM,
reste sur `node` : aucun environnement à monter, donc tests plus rapides.

## Mode watch et coverage

```bash
vitest            # mode watch par défaut : relance les tests impactés
vitest run        # une seule passe (pour la CI)
vitest --coverage # rapport de couverture
```

En **watch**, Vitest réutilise le graphe de modules de Vite pour ne relancer que
les tests **affectés** par le fichier que tu viens de sauvegarder — pas toute la
suite. La **coverage** mesure quelles lignes/branches sont exécutées par les tests
(via le provider `v8`, qui s'appuie sur l'instrumentation native de V8 plutôt que
sur une transformation du code source).

:::callout{type="tip"}
Vise une couverture **utile**, pas un pourcentage. 100 % de lignes couvertes peut
ne tester aucune branche d'erreur. Configure des seuils (`coverage.thresholds`)
sur les branches plutôt que sur les lignes pour un signal honnête.
:::

## Pourquoi Vitest plutôt que Jest en 2026

:::cheatsheet
- title: "Pipeline partagé"
  desc: "Même config/transform que Vite : zéro divergence dev vs test."
- title: "ESM/TS/JSX natif"
  desc: "Transpilé par Oxc (Rust), pas de Babel ni de ts-jest à câbler."
- title: "Vitesse"
  desc: "Watch intelligent, workers parallèles, transform native."
- title: "API Jest-compatible"
  desc: "describe/it/expect/vi.fn — migration quasi mécanique."
- title: "in-source testing"
  desc: "Tests dans le fichier source via import.meta.vitest (optionnel)."
:::

**Pourquoi.** Le coût caché de Jest, c'est la **double pipeline** : maintenir une
config de transformation séparée de celle du bundler, et payer la transpilation
Babel/ts-jest à chaque run. Vitest supprime ce coût en empruntant la pipeline
Vite (Oxc en natif) et son graphe de modules pour un watch chirurgical. Résultat :
une seule source de vérité pour la résolution de modules, et des suites qui
tournent nettement plus vite — décisif quand la CI exécute des milliers de tests.
