/**
 * The calibrated module catalogue (brief §5). Drives the stub scaffolder.
 * Editing content bodies happens in the .md files, not here — this is only
 * the list + one-line descriptions used for stubs and card copy.
 */
export interface CatalogEntry {
  framework: 'angular' | 'react' | 'vue';
  level: 'junior' | 'medior' | 'senior';
  slug: string;
  title: string;
  desc: string;
  duration: number;
}

const A = 'angular' as const;
const R = 'react' as const;
const V = 'vue' as const;
const J = 'junior' as const;
const M = 'medior' as const;
const S = 'senior' as const;

export const CATALOG: CatalogEntry[] = [
  // Angular — Junior
  { framework: A, level: J, slug: 'lifecycle', title: "Lifecycle d'un composant", desc: 'ngOnInit, ngOnDestroy, afterRender : quand chaque hook s’exécute.', duration: 12 },
  { framework: A, level: J, slug: 'data-binding', title: 'Data binding', desc: 'Les 4 flèches du binding : interpolation, property, event, two-way.', duration: 10 },
  { framework: A, level: J, slug: 'standalone', title: 'Standalone vs NgModule', desc: 'Pourquoi les standalone components, et pourquoi migrer.', duration: 12 },
  { framework: A, level: J, slug: 'control-flow', title: 'Control flow', desc: '@if / @for / @switch face aux anciennes directives structurelles.', duration: 11 },
  { framework: A, level: J, slug: 'forms-basics', title: 'Forms : les bases', desc: 'Reactive vs Template-driven : choisir et démarrer.', duration: 14 },
  { framework: A, level: J, slug: 'routing-basics', title: 'Routing : les bases', desc: 'Routes, lazy loading, paramètres de route.', duration: 13 },

  // Angular — Medior
  { framework: A, level: M, slug: 'signals', title: 'Signals', desc: 'signal() / computed() / effect() et la philosophie réactive.', duration: 18 },
  { framework: A, level: M, slug: 'rxjs-operators', title: 'Opérateurs RxJS', desc: 'switchMap / mergeMap / concatMap / exhaustMap en marble diagrams.', duration: 20 },
  { framework: A, level: M, slug: 'change-detection', title: 'Change detection', desc: 'Default vs OnPush, et la lecture de l’arbre de CD.', duration: 17 },
  { framework: A, level: M, slug: 'interceptors-guards', title: 'Interceptors & Guards', desc: 'Les API fonctionnelles : HttpInterceptorFn, CanActivateFn…', duration: 15 },
  { framework: A, level: M, slug: 'dependency-injection', title: 'Dependency Injection', desc: 'providedIn, InjectionToken, hiérarchie des injecteurs.', duration: 22 },
  { framework: A, level: M, slug: 'defer-lazy', title: '@defer & lazy', desc: 'Triggers, prefetch, lazy loading optimal avec @defer.', duration: 14 },
  { framework: A, level: M, slug: 'cva', title: 'ControlValueAccessor', desc: 'Le CVA démystifié : intégrer un composant aux formulaires.', duration: 16 },

  // Angular — Senior
  { framework: A, level: S, slug: 'signals-rxjs-interop', title: 'Signals ↔ RxJS', desc: 'toSignal, toObservable, rxResource, patterns de migration.', duration: 19 },
  { framework: A, level: S, slug: 'zoneless', title: 'Zoneless', desc: 'Le mode sans zone.js : pièges et migration.', duration: 18 },
  { framework: A, level: S, slug: 'ssr-hydration', title: 'SSR & Hydration', desc: 'Non-destructive hydration, event replay, incremental hydration.', duration: 21 },
  { framework: A, level: S, slug: 'perf-toolkit', title: 'Perf toolkit', desc: 'OnPush + trackBy + defer + signals + SSR : le combo complet.', duration: 20 },
  { framework: A, level: S, slug: 'host-directives', title: 'Host directives', desc: 'La directive composition API.', duration: 14 },
  { framework: A, level: S, slug: 'architecture', title: 'Architecture', desc: 'Feature folders, libs Nx, scoping du state.', duration: 23 },
  { framework: A, level: S, slug: 'testing-strategy', title: 'Stratégie de test', desc: 'Harnesses, marble testing, MSW, Cypress/Playwright/Vitest.', duration: 22 },

  // React — Junior
  { framework: R, level: J, slug: 'jsx-basics', title: 'JSX : les bases', desc: 'JSX, props, children.', duration: 10 },
  { framework: R, level: J, slug: 'state-basics', title: 'State : les bases', desc: 'useState, useReducer.', duration: 12 },
  { framework: R, level: J, slug: 'effects-basics', title: 'Effects : les bases', desc: 'useEffect, dépendances, cleanup.', duration: 14 },
  { framework: R, level: J, slug: 'lifting-state', title: 'Lifting state', desc: 'Faire remonter l’état partagé.', duration: 11 },
  { framework: R, level: J, slug: 'lists-keys', title: 'Listes & clés', desc: 'Les vraies raisons des clés.', duration: 10 },
  { framework: R, level: J, slug: 'forms-basics', title: 'Forms : les bases', desc: 'Controlled vs uncontrolled.', duration: 12 },

  // React — Medior
  { framework: R, level: M, slug: 'hooks-rules', title: 'Règles des hooks', desc: 'Règles des hooks, custom hooks.', duration: 13 },
  { framework: R, level: M, slug: 'context-perf', title: 'Context & perf', desc: 'useContext et ses pièges de re-render.', duration: 15 },
  { framework: R, level: M, slug: 'memo-callback', title: 'memo / useMemo / useCallback', desc: 'Quand mémoïser, et surtout quand ne pas.', duration: 16 },
  { framework: R, level: M, slug: 'suspense-basics', title: 'Suspense', desc: 'Suspense pour le data fetching, Error boundaries.', duration: 15 },
  { framework: R, level: M, slug: 'forms-libs', title: 'Libs de formulaires', desc: 'React Hook Form vs Formik vs resolvers zod.', duration: 17 },
  { framework: R, level: M, slug: 'server-state', title: 'Server state', desc: 'TanStack Query, mutations, cache.', duration: 19 },
  { framework: R, level: M, slug: 'routing', title: 'Routing', desc: 'TanStack Router vs React Router v7.', duration: 16 },

  // React — Senior
  { framework: R, level: S, slug: 'rsc', title: 'React Server Components', desc: 'Modèle mental, frontières client/serveur.', duration: 22 },
  { framework: R, level: S, slug: 'concurrent-features', title: 'Concurrent features', desc: 'Transitions, deferred values, useOptimistic.', duration: 20 },
  { framework: R, level: S, slug: 'compiler', title: 'React Compiler', desc: 'Ce que le compilateur optimise vraiment.', duration: 18 },
  { framework: R, level: S, slug: 'streaming-ssr', title: 'Streaming SSR', desc: 'Streaming, selective hydration.', duration: 19 },
  { framework: R, level: S, slug: 'state-architecture', title: 'Architecture du state', desc: 'Zustand vs Jotai vs Redux Toolkit vs Signals.', duration: 21 },
  { framework: R, level: S, slug: 'perf-profiling', title: 'Profiling perf', desc: 'DevTools Profiler, flame charts, why-did-you-render.', duration: 18 },
  { framework: R, level: S, slug: 'testing-strategy', title: 'Stratégie de test', desc: 'RTL, MSW, Playwright component testing.', duration: 20 },

  // Vue — Junior
  { framework: V, level: J, slug: 'template-syntax', title: 'Syntaxe des templates', desc: 'Interpolation, directives, events.', duration: 10 },
  { framework: V, level: J, slug: 'reactivity-basics', title: 'Réactivité : les bases', desc: 'ref vs reactive.', duration: 12 },
  { framework: V, level: J, slug: 'computed-watch', title: 'computed & watch', desc: 'computed vs watch vs watchEffect.', duration: 13 },
  { framework: V, level: J, slug: 'components-props', title: 'Composants & props', desc: 'Props, emits, slots.', duration: 12 },
  { framework: V, level: J, slug: 'lifecycle', title: 'Lifecycle', desc: 'onMounted, onUnmounted, et les autres.', duration: 11 },
  { framework: V, level: J, slug: 'forms-basics', title: 'Forms : les bases', desc: 'v-model et ses modificateurs.', duration: 12 },

  // Vue — Medior
  { framework: V, level: M, slug: 'composition-vs-options', title: 'Composition vs Options', desc: 'Composition API vs Options API.', duration: 15 },
  { framework: V, level: M, slug: 'composables', title: 'Composables', desc: 'Patterns, conventions, useFetch / useEventListener.', duration: 16 },
  { framework: V, level: M, slug: 'provide-inject', title: 'provide / inject', desc: 'La DI à la Vue, scoped state.', duration: 14 },
  { framework: V, level: M, slug: 'reactivity-deep', title: 'Réactivité avancée', desc: 'toRef, toRefs, unref, isProxy.', duration: 17 },
  { framework: V, level: M, slug: 'pinia', title: 'Pinia', desc: 'Stores, getters, plugins.', duration: 16 },
  { framework: V, level: M, slug: 'router', title: 'Vue Router', desc: 'Vue Router 4, guards, lazy loading.', duration: 15 },
  { framework: V, level: M, slug: 'script-setup', title: '<script setup>', desc: 'Tout ce que ça change.', duration: 13 },

  // Vue — Senior
  { framework: V, level: S, slug: 'reactivity-internals', title: 'Internals de la réactivité', desc: 'Proxies réactifs, dependency tracking.', duration: 20 },
  { framework: V, level: S, slug: 'vapor-mode', title: 'Vapor mode', desc: 'Vue Vapor, le mode no-virtual-DOM.', duration: 19 },
  { framework: V, level: S, slug: 'nuxt-ssr', title: 'Nuxt SSR', desc: 'SSR, ISR, hybrid rendering, server routes.', duration: 21 },
  { framework: V, level: S, slug: 'nitro-h3', title: 'Nitro & H3', desc: 'Le serveur sous Nuxt, déploiement edge.', duration: 18 },
  { framework: V, level: S, slug: 'perf-strategy', title: 'Stratégie de perf', desc: 'Async components, shallowRef, markRaw.', duration: 18 },
  { framework: V, level: S, slug: 'state-architecture', title: 'Architecture du state', desc: 'Patterns Pinia, stores modulaires, persistence.', duration: 19 },
  { framework: V, level: S, slug: 'testing-strategy', title: 'Stratégie de test', desc: 'Vitest, Vue Test Utils, Cypress component testing.', duration: 20 },
];
