---
title: "L'event loop : tâches, microtâches et rendu"
slug: "event-loop"
framework: "javascript"
level: "medior"
order: 1
duration: 16
prerequisites: ["promises-async-await"]
updated: 2026-11-27
seoTitle: "Event loop JavaScript — tâches, microtâches, rendu et scheduler.yield()"
seoDescription: "L'ordre d'exécution de setTimeout, then et await enfin expliqué : pile d'appels, tâches et microtâches, place du rendu et lien avec l'INP. Avec scheduler.yield() pour découper une tâche longue."
ogVariant: "gold"
related:
  - { framework: "javascript", slug: "promises-async-await" }
  - { framework: "web", slug: "core-web-vitals" }
  - { framework: "web", slug: "observers" }
  - { framework: "angular", slug: "zoneless" }
---

Tu écris un `setTimeout(fn, 0)`, un `.then()` et un `await` dans la même fonction :
dans quel ordre s'exécutent-ils ? Et pourquoi ton « Chargement… » ne s'affiche-t-il
jamais avant le gros calcul qui le suit ? Les deux questions ont la même réponse :
l'**event loop**, la boucle qui décide ce que le thread principal exécute ensuite,
et à quel moment le navigateur a le droit de peindre.

[L'INP](/web/senior/core-web-vitals), [les Observers](/web/medior/observers) et le
[zoneless d'Angular](/angular/senior/zoneless) supposent ce modèle connu. On le
démonte ici pièce par pièce, idées reçues comprises.

## Une seule pile, et on va jusqu'au bout

JavaScript exécute ton code sur un seul thread, avec une seule **pile d'appels**.
Tant qu'elle n'est pas vide, rien d'autre ne passe. C'est la garantie
*run-to-completion* : une fonction n'est jamais interrompue en plein milieu. Pas de
verrou, pas de variable modifiée dans ton dos. Mais cette garantie a un prix.

```js
button.addEventListener("click", () => {
  statusEl.textContent = "Calcul en cours…"; // le DOM change, pas l'écran
  const total = sumAllRows(rows); // 800 ms : la pile reste occupée
  statusEl.textContent = `Total : ${total}`;
});
```

L'utilisateur ne verra jamais « Calcul en cours… » : le DOM a changé, mais le
navigateur ne peint qu'une fois la pile rendue. Pendant 800 ms, les clics s'empilent
et les animations JavaScript se figent. L'event loop est ce qui alimente la pile :
dès qu'elle est vide, il choisit le prochain morceau de code à y pousser.

## Deux files, deux règles

Ce « prochain morceau » vient de deux familles de files, aux règles différentes.

- **Les tâches** (*tasks*, parfois appelées « macrotâches ») : l'exécution d'un
  `<script>`, un callback de `setTimeout`, la distribution d'un événement, un
  `message`, l'arrivée d'une réponse réseau. La boucle en prend **une seule** par
  tour.
- **Les microtâches** (*microtasks*) : les réactions de promesses (`then`, `catch`,
  `finally`, la suite d'un `await`), `queueMicrotask(fn)` et les callbacks de
  `MutationObserver`. Leur file est vidée **en entier** dès que la pile est vide, y
  compris les microtâches ajoutées pendant ce vidage.

Un tour de boucle, en version simplifiée :

```text
1. prendre UNE tâche, l'exécuter jusqu'au bout
2. vider TOUTE la file de microtâches
3. si l'écran attend une image : rendu (rAF, style, layout, paint)
4. recommencer
```

Première idée reçue : `setTimeout(fn, 0)` ne veut pas dire « dans 0 ms », mais « dans
une prochaine tâche, pas avant ». `fn` passera après la tâche en cours, après toutes
ses microtâches, et après les tâches que le navigateur juge plus urgentes. Au-delà
de cinq timers imbriqués, la spécification impose en plus un délai minimal de 4 ms.

## Devine l'ordre

```js
async function load() {
  console.log("load : début");
  await null;
  console.log("load : suite");
}

console.log("script : début");
setTimeout(() => console.log("timeout"), 0);
load();
Promise.resolve().then(() => console.log("then"));
console.log("script : fin");
```

Sortie : `script : début`, `load : début`, `script : fin`, `load : suite`, `then`,
`timeout`. Le script est une tâche, il va jusqu'au bout. La pile est alors vide : les
microtâches passent, dans leur ordre d'enregistrement. Le timer attend son tour.

### Ce que `await` fait réellement

Deux idées reçues tombent avec cet exercice.

- **Une fonction `async` ne démarre pas « plus tard ».** Tout ce qui précède le
  premier `await` s'exécute de façon synchrone, dans la pile de l'appelant.
- **`await` ne rend pas la main au navigateur.** Il enveloppe la valeur dans une
  promesse, sort de la fonction et enregistre la suite comme réaction de cette
  promesse : une microtâche. `await x; next()` se comporte comme
  `Promise.resolve(x).then(next)`. Si la valeur est déjà là, ni timer, ni clic, ni
  rendu ne passent entre l'avant et l'après.

Autre subtilité : la règle est « dès que la pile est vide », pas « après chaque
tâche ». Lors d'un vrai clic, les microtâches passent entre deux écouteurs. Avec
`button.click()`, ton script est encore sur la pile : elles attendent la fin de tous
les écouteurs. Un clic simulé dans un test ne reproduit donc pas l'ordre réel.

## Où s'insère le rendu

Le navigateur ne peint ni après chaque ligne, ni après chaque tâche. Il dispose
d'**occasions de rendu**, calées sur le rafraîchissement de l'écran : une toutes les
16,7 ms à 60 Hz, aucune tant que l'onglet est caché. Quand une occasion se présente
et que la pile est vide, il déroule toujours le même ordre : événements `resize` et
`scroll`, callbacks `requestAnimationFrame`, style et layout (avec les callbacks
`ResizeObserver`), callbacks `IntersectionObserver`, puis paint. Trois conséquences :

- **`requestAnimationFrame` passe avant le paint, pas après.** C'est l'endroit pour
  écrire dans le DOM juste avant l'image, pas pour attendre que l'écran soit à jour.
- **Dix mutations dans une tâche, un seul rendu.** Style et layout ne sont calculés
  qu'une fois, sauf si tu forces un layout synchrone en lisant `offsetHeight` ou
  `getBoundingClientRect()` entre deux écritures.
- **Une tâche de 200 ms saute une douzaine d'images.** Aucune occasion de rendu
  n'est honorée tant que la pile est occupée.

### Le lien avec l'INP

L'[INP](/web/senior/core-web-vitals) mesure le temps entre une interaction et le
paint suivant. Relues avec l'event loop, ses trois phases deviennent mécaniques :
l'*input delay* est la tâche déjà en cours quand le clic arrive, le *processing
time* tes écouteurs et leurs microtâches, le *presentation delay* le rendu. Une
tâche est dite longue au-delà de 50 ms : c'est autant d'*input delay* en puissance.

## Céder la main

Tu ne peux pas toujours aller plus vite, mais tu peux rendre la pile en cours de
route. Céder la main (*yield*), c'est finir la tâche et planifier la suite dans une
**nouvelle tâche** : entre les deux, le navigateur traite les clics et peut peindre.

:::compare
::bad
```js
button.addEventListener("click", async () => {
  statusEl.textContent = "Calcul en cours…";
  await Promise.resolve(); // microtâche : aucun rendu entre les deux
  render(sumAllRows(rows));
});
```
::
::good
```js
function yieldToMain() {
  if (globalThis.scheduler?.yield) return scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0)); // repli
}

button.addEventListener("click", async () => {
  statusEl.textContent = "Calcul en cours…";
  await yieldToMain(); // nouvelle tâche : le rendu peut passer
  render(sumAllRows(rows));
});
```
::
:::

**Pourquoi.** `await Promise.resolve()` reprend dans une microtâche, donc dans le
même tour de boucle : le navigateur voit toujours un seul bloc de 800 ms.
`scheduler.yield()` renvoie une promesse réglée par une nouvelle tâche. Mieux que
`setTimeout`, qui te renvoie derrière les timers déjà en attente : ta suite passe
avant les tâches `scheduler.postTask()` de même priorité (`user-visible` ici).

:::callout{type="warn"}
**Novembre 2026.** `scheduler.yield()` est disponible dans Chrome et Edge 129 et
dans Firefox 142, mais **toujours absent de Safari**, tout comme
`scheduler.postTask()`. Ne l'appelle jamais sans test de présence : le repli
`setTimeout` reste obligatoire.
:::

### Découper une boucle

Céder à chaque itération coûte une tâche par élément ; ne jamais céder gèle la page.
Le bon compromis est un budget de temps, qui s'adapte tout seul à la machine.

```js
async function importRows(rows) {
  let lastYield = performance.now();
  for (const row of rows) {
    processRow(row);
    if (performance.now() - lastYield > 50) {
      await yieldToMain();
      lastYield = performance.now();
    }
  }
}
```

Le revers : la garantie *run-to-completion* s'arrête à chaque `await`. Entre deux
morceaux, l'utilisateur a pu cliquer ailleurs et tes données changer : revalide ton
état après la pause. Et si le calcul pèse plusieurs secondes de CPU, le découper ne
fait que l'étaler : sors-le dans un Web Worker.

## Pièges

### Famine par microtâches

```js
function loop() {
  queueMicrotask(loop); // ou Promise.resolve().then(loop)
}
loop(); // onglet gelé, aussi sûrement qu'avec while (true)
```

La file de microtâches se vide « en entier », et chaque microtâche en ajoute une :
la boucle ne passe jamais à l'étape suivante. Plus de rendu, plus de clic, plus de
timer. Avec `setTimeout(loop)`, la même récursion laisse la page vivante.

### `await` dans une boucle

```js
for (const id of ids) {
  results.push(await getProduct(id));
}
```

Ce `await` n'aère pas forcément la boucle. Si `getProduct` répond depuis un cache en
mémoire, chaque itération ne coûte qu'une microtâche : 10 000 produits forment une
seule tâche longue, sans aucun rendu. Ce qui compte, c'est ce que tu attends : une
promesse réglée par une tâche (réseau, timer, `scheduler.yield()`) rend la main, une
valeur déjà prête non. Et quand les appels partent vraiment sur le réseau, ils
s'enchaînent ici un par un : s'ils sont indépendants, lance-les ensemble (voir
[Promesses et async/await](/javascript/junior/promises-async-await)).

### Node.js en bref

Même langage, autre boucle : pas de rendu, des phases (timers, entrées/sorties,
`setImmediate`) et une file de plus, celle de `process.nextTick()`. En CommonJS, elle
est vidée avant les microtâches : `nextTick` passe devant `then`. À la racine d'un
module ES, c'est l'inverse : il s'évalue déjà pendant le vidage des microtâches.
Node.js classe `process.nextTick()` en *Legacy* et recommande `queueMicrotask()`.

## À retenir

:::cheatsheet
- title: "Run-to-completion"
  desc: "Une pile, un thread : tant qu'une fonction tourne, ni clic, ni timer, ni rendu."
- title: "Tâche ou microtâche"
  desc: "Une tâche par tour (script, timer, événement), puis toutes les microtâches (then, await, queueMicrotask, MutationObserver) dès que la pile est vide. Une microtâche qui en replanifie une autre gèle l'onglet."
- title: "await"
  desc: "Synchrone jusqu'au premier await, la suite reprend en microtâche. Attendre une valeur déjà prête ne laisse passer aucun rendu."
- title: "Rendu"
  desc: "Entre deux tâches, au rythme de l'écran : rAF, style, layout, paint. rAF passe avant le paint, pas après."
- title: "Céder la main"
  desc: "scheduler.yield() (Chrome 129, Firefox 142, pas Safari) avec repli setTimeout, et un budget de 50 ms par morceau."
:::
