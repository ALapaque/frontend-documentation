---
title: "Tester un composant Angular avec Vitest"
slug: "component-testing"
framework: "angular"
level: "medior"
order: 15
duration: 15
prerequisites: ["signals", "dependency-injection"]
updated: 2026-11-27
seoTitle: "Tester un composant Angular avec Vitest — TestBed, signals et zoneless"
seoDescription: "Écrire le test d'un composant Angular en 2026 : ng test sur Vitest, TestBed et await fixture.whenStable() en zoneless, inputs signal, model() et outputs par bindings, HttpTestingController, RouterTestingHarness, fake timers à la place de fakeAsync, et migration depuis Karma."
ogVariant: "gold"
related:
  - { framework: "angular", slug: "testing-strategy" }
  - { framework: "tooling", slug: "vitest" }
  - { framework: "angular", slug: "zoneless" }
  - { framework: "angular", slug: "async-resource" }
---

Tu sais déjà *quoi* tester et à quel niveau : c'est l'objet de
[Stratégie de test](/angular/senior/testing-strategy). Reste le geste de base,
écrire le test d'un composant — et ce geste a changé. `detectChanges()` après
chaque ligne, `fakeAsync` pour le temps : ces réflexes datent de Karma et de
zone.js. Un projet créé aujourd'hui tourne sur **Vitest**, en **zoneless**, avec
des composants à **signals**, et ses tests s'écrivent autrement.

## `ng test` aujourd'hui

Depuis Angular 21, le CLI configure les nouveaux projets avec le builder
`@angular/build:unit-test` : **Vitest** exécute les tests dans Node et **jsdom**
simule le DOM, sans navigateur à lancer. Karma reste pris en charge, mais la 22.3
(novembre 2026) déprécie l'option `testRunner` des schematics.

```bash
ng test                       # watch en local, passe unique si CI=true
ng test --browsers=chromium   # vrai navigateur, via @vitest/browser-playwright
```

Le builder active les **globals** de Vitest : `describe`, `it`, `expect` et `vi`
s'utilisent sans import — le runner lui-même est détaillé dans
[Vitest](/tooling/medior/vitest). jsdom n'a ni mise en page ni rendu : réserve le
mode navigateur (paquets `@vitest/browser-playwright` et `playwright` à
installer) aux suites qui en dépendent, Node restant le défaut le plus rapide.

## TestBed et ComponentFixture

Le composant fil rouge : un sélecteur de quantité, avec une entrée requise, un
`model()` et une sortie.

```ts quantite.ts
@Component({
  selector: 'app-quantite',
  template: `
    <span class="valeur">{{ quantite() }}</span>
    <button type="button" (click)="ajouter()" [disabled]="quantite() >= max()">+</button>
  `,
})
export class Quantite {
  readonly max = input.required<number>();
  readonly quantite = model(1);
  readonly limiteAtteinte = output<number>();

  ajouter() {
    this.quantite.update((q) => q + 1);
    if (this.quantite() === this.max()) this.limiteAtteinte.emit(this.max());
  }
}
```

```ts quantite.spec.ts
it('affiche la quantité initiale', async () => {
  const fixture = TestBed.createComponent(Quantite);
  fixture.componentRef.setInput('max', 5);   // entrée requise : avant le 1er rendu
  await fixture.whenStable();                // attend le rendu planifié par Angular
  expect(fixture.nativeElement.querySelector('.valeur').textContent).toBe('1');
});
```

`TestBed.createComponent()`, importé de `@angular/core/testing`, instancie le
composant mais **ne rend rien de façon synchrone** : `await fixture.whenStable()`
attend qu'Angular ait terminé, rendu compris. `TestBed` est **zoneless par
défaut**, même si zone.js est chargé. Sans dépendance à remplacer, pas besoin de
`configureTestingModule()`, et `compileComponents()` ne sert qu'avec `@defer`.

:::compare
::bad
```ts
plus.click();
fixture.detectChanges();      // force un cycle, demandé ou non par le composant
expect(valeur.textContent).toBe('2');
```
::
::good
```ts
plus.click();
await fixture.whenStable();   // Angular rend seulement s'il a été prévenu
expect(valeur.textContent).toBe('2');
```
::
:::

**Pourquoi.** `detectChanges()` déclenche un cycle au moment où *toi* tu le
décides. En production, c'est le composant qui doit prévenir Angular — signal
modifié, événement lié (voir [Zoneless](/angular/senior/zoneless)). `whenStable()`
reproduit ce contrat : sans notification, rien n'est rendu et l'assertion échoue.
Convertir une suite existante n'est pas rentable pour autant, dit la doc Angular.

## Piloter un composant signal

`setInput()` suffit pour une valeur fixe. Pour jouer le rôle du parent — changer
une entrée en cours de route, écouter une sortie, lier un `model()` — passe à la
création des **bindings**, importés de `@angular/core`.

```ts
it('écrit dans le model et prévient à la limite', async () => {
  const max = signal(2);
  const quantite = signal(1);
  const limiteAtteinte = vi.fn();
  const fixture = TestBed.createComponent(Quantite, {
    bindings: [
      inputBinding('max', max),                          // [max]="max()"
      twoWayBinding('quantite', quantite),               // [(quantite)]="quantite"
      outputBinding('limiteAtteinte', limiteAtteinte),   // (limiteAtteinte)="…"
    ],
  });
  await fixture.whenStable();
  fixture.nativeElement.querySelector('button').click();
  await fixture.whenStable();

  expect(quantite()).toBe(2);                       // le model a écrit côté parent
  expect(limiteAtteinte).toHaveBeenCalledWith(2);
});
```

Un `max.set(10)` suivi d'un `await fixture.whenStable()` met l'entrée à jour,
comme le ferait un template parent. Pour simuler une saisie, affecte
`champ.value` puis émets `champ.dispatchEvent(new Event('input'))` : Angular ne
lit la valeur qu'à l'événement. Pour du Material ou du CDK, préfère un **harness**.

## Dépendances

Un service injecté se remplace par un double fourni au `TestBed` — la mécanique
est celle de l'[injection de dépendances](/angular/medior/dependency-injection).
Configure **avant** `createComponent()`, qui fige le module de test ; l'option
`providersFile` du builder partage des providers entre tous les fichiers.

### HTTP : répondre avant d'attendre

```ts
TestBed.configureTestingModule({ providers: [provideHttpClientTesting()] });
const http = TestBed.inject(HttpTestingController);
const fixture = TestBed.createComponent(ListeCommandes);  // lit un httpResource

TestBed.tick();                                  // rendu + effets : la requête part
http.expectOne('/api/commandes').flush([{ id: 1, total: 42 }]);
await fixture.whenStable();                      // réponse propagée jusqu'au DOM
expect(fixture.nativeElement.textContent).toContain('42');
http.verify();                                   // aucune requête oubliée
```

`HttpClient` est fourni par l'environnement de test ; `provideHttpClientTesting()`
le branche sur un faux backend. **Le piège** : `whenStable()` attend aussi les
requêtes en cours. Placé avant le `flush()`, il ne se résout jamais et le test
finit en timeout. `TestBed.tick()` émet la requête : réponds, puis attends.

### Routeur et directives

```ts
TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
const harness = await RouterTestingHarness.create();
await harness.navigate(['commandes', 42], DetailCommande);
expect(harness.routeNativeElement?.textContent).toContain('42');
```

`RouterTestingHarness` navigue pour de vrai dans un `RouterOutlet` de test ; le
second argument lève une erreur si un autre composant s'active. `navigate()`
(mêmes commandes et options que `Router.navigate`) date de la 22.3, en complément
de `navigateByUrl()`. Depuis la 22.2, une directive se teste sans hôte factice :
`TestBed.createDirective(Surligne, { tagName: 'p' })` renvoie une `DirectiveFixture`.

## Le temps : fake timers, plus `fakeAsync`

`fakeAsync` et `tick()` reposent sur zone.js ; Angular ne les recommande plus : en
zoneless, l'horloge simulée du runner prend le relais. Exemple : une `Recherche`
dont le champ écrit dans un signal `terme`. `debounced(terme, 300)` le stabilise,
puis un `resource()` appelle `api.chercher()` — sauf si le terme est vide.

```ts
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('attend la fin de la frappe avant de chercher', async () => {
  const chercher = vi.fn().mockResolvedValue([{ id: 1, nom: 'Angular' }]);
  TestBed.configureTestingModule({
    providers: [{ provide: CatalogueApi, useValue: { chercher } }],
  });
  const fixture = TestBed.createComponent(Recherche);
  await vi.runAllTimersAsync();                   // premier rendu

  const champ: HTMLInputElement = fixture.nativeElement.querySelector('input');
  champ.value = 'ang';
  champ.dispatchEvent(new Event('input'));
  await vi.advanceTimersByTimeAsync(200);
  expect(chercher).not.toHaveBeenCalled();        // encore dans la fenêtre de 300 ms
  await vi.advanceTimersByTimeAsync(200);
  expect(chercher).toHaveBeenCalledWith('ang');
});
```

Sous fake timers, le cycle qu'Angular planifie est lui-même un timer figé : c'est
`vi.runAllTimersAsync()` ou une avance d'horloge qui déclenche le rendu. Avance
avec de la marge plutôt qu'à la milliseconde : entre la frappe et le départ du
délai, Angular intercale son propre cycle.

:::callout{type="warn"}
**Novembre 2026.** `debounced()` est **expérimental** depuis la 22.0 et l'est
toujours en 22.3 : sa signature peut changer. La technique de test n'en dépend
pas — tout ce qui repose sur `setTimeout` ou `setInterval` se pilote pareil.
:::

## Migrer une suite Karma

```bash
ng update @angular/cli --name migrate-karma-to-vitest   # 1. la configuration
ng g @schematics/angular:refactor-jasmine-vitest        # 2. le code des specs
```

La première commande bascule la cible `test` sur `@angular/build:unit-test` et
remplace les types Jasmine par `vitest/globals`. Ses limites : applications
uniquement, builder `application` obligatoire, et un `karma.conf.js` personnalisé
reste à migrer à la main. La seconde réécrit les specs (`spyOn` devient
`vi.spyOn`, `jasmine.createSpy` devient `vi.fn`) et laisse un TODO là où elle ne
sait pas convertir. En attendant, `fakeAsync` reste utilisable sous Vitest avec
le polyfill `zone.js/plugins/vitest-patch` sur la cible de test.

:::callout{type="warn"}
**Novembre 2026.** Le guide officiel qualifie toujours cette migration
d'**expérimentale**, et `refactor-jasmine-vitest` porte encore l'étiquette
`[EXPERIMENTAL]` dans le CLI 22.3. Commite avant, relis le diff, traite chaque TODO.
:::

## À retenir

Un test de composant moderne tient en trois gestes : créer la fixture, agir comme
un parent ou un utilisateur, puis **attendre Angular** au lieu de le forcer. Pour
HTTP et le temps, demande-toi qui tient l'horloge — et réponds avant d'attendre.

:::cheatsheet
- title: "await fixture.whenStable()"
  desc: "Attend le rendu planifié par Angular. Remplace les detectChanges() en rafale ; TestBed est zoneless par défaut."
- title: "bindings à la création"
  desc: "inputBinding, twoWayBinding (model) et outputBinding jouent le parent ; setInput() pour une valeur fixe."
- title: "HTTP : flush puis whenStable"
  desc: "whenStable() attend les requêtes en cours. TestBed.tick(), expectOne().flush(), puis seulement await."
- title: "Fake timers Vitest"
  desc: "vi.useFakeTimers() + advanceTimersByTimeAsync() / runAllTimersAsync() à la place de fakeAsync et tick()."
- title: "ng test et migration"
  desc: "Vitest + jsdom par défaut, --browsers pour un vrai navigateur. Karma : migrate-karma-to-vitest puis refactor-jasmine-vitest."
:::
