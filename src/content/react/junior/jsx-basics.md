---
title: "JSX : les bases"
slug: "jsx-basics"
framework: "react"
level: "junior"
order: 1
duration: 10
prerequisites: []
updated: 2026-05-22
seoTitle: "JSX — props, children (Guide Junior React)"
seoDescription: "JSX n'est pas du HTML : props, children et expressions, expliqués depuis zéro."
ogVariant: "sage"
related:
  - { framework: "angular", slug: "data-binding" }
  - { framework: "vue", slug: "template-syntax" }
---

## JSX, c'est des appels de fonction

JSX ressemble à du HTML mais se compile en `createElement`. Une balise est une
expression JavaScript : tu peux la stocker, la retourner, la mapper.

```tsx
const greeting = <h1 className="title">Bonjour</h1>;
// se compile en : jsx('h1', { className: 'title', children: 'Bonjour' })
```

D'où les différences avec HTML : `className` (pas `class`), `htmlFor`, et le
camelCase pour les événements (`onClick`).

## Props : les arguments d'un composant

```tsx
function Avatar({ name, src }: { name: string; src: string }) {
  return <img src={src} alt={name} />;
}

<Avatar name="Ada" src="/ada.png" />;
```

## Children : ce qu'il y a entre les balises

```tsx
function Card({ children }: { children: React.ReactNode }) {
  return <div className="card">{children}</div>;
}

<Card>
  <h2>Titre</h2>
  <p>Contenu</p>
</Card>;
```

:::callout{type="tip"}
Les accolades `{ }` insèrent une **expression** JavaScript, pas une instruction.
`{user.name}` marche ; `{if (x) …}` non. Pour une condition, utilise `{cond &&
<X />}` ou un ternaire.
:::

:::compare
::bad
```tsx
<div class="box" onclick={save}>…</div>
```
::
::good
```tsx
<div className="box" onClick={save}>…</div>
```
::
:::

**Pourquoi** : JSX n'est pas du HTML, c'est du JavaScript. `class` est un mot réservé du langage et les attributs deviennent des clés d'objet passées à `createElement`, suivant le DOM (`className`, `htmlFor`) en camelCase. La forme de gauche ne plante pas toujours mais le handler `onclick` (minuscule) n'est pas reconnu par le système d'événements synthétiques de React : le clic ne déclenche rien.
