---
title: "WCAG 2.2 et European Accessibility Act : ce que la conformité exige"
slug: "wcag-22-eaa"
framework: "web"
level: "medior"
order: 13
duration: 16
prerequisites: ["html-semantics", "forms"]
updated: 2026-11-27
seoTitle: "WCAG 2.2 et EAA — les critères de conformité traduits en code"
seoDescription: "Qui est concerné par l'European Accessibility Act, comment il renvoie à EN 301 549 et au RGAA, et les six critères A et AA ajoutés par WCAG 2.2 traduits en CSS et en HTML. Avec une méthode d'audit et les limites d'axe en CI."
ogVariant: "gold"
related:
  - { framework: "web", slug: "accessibility" }
  - { framework: "web", slug: "forms" }
  - { framework: "web", slug: "passkeys" }
  - { framework: "tooling", slug: "playwright" }
---

Depuis le 28 juin 2025, l'accessibilité d'une boutique en ligne ou d'une appli
bancaire n'est plus une bonne pratique : c'est une obligation légale dans toute
l'Union européenne. Le juriste parle d'« EAA », l'auditeur d'« EN 301 549 », le
ticket de « WCAG 2.2 AA », et personne ne dit quoi changer dans le code. Cet article
relie les trois, puis traduit en CSS et en HTML les six critères ajoutés par la 2.2.
Les bases (ARIA, focus, contraste) sont dans `/web/senior/accessibility`.

:::callout{type="info"}
Cet article n'est pas un avis juridique. Dates et seuils viennent de la directive et
des documents du W3C, relus en novembre 2026. Pour savoir si **ton** service est
concerné, fais valider l'analyse par un juriste.
:::

## L'EAA : qui est concerné, qui ne l'est pas

L'**European Accessibility Act** (EAA) est la directive (UE) 2019/882. Elle vise des
produits (ordinateurs, terminaux de paiement, liseuses) et des **services fournis
aux consommateurs après le 28 juin 2025** : services bancaires, livres numériques,
communications électroniques, accès aux médias audiovisuels, transport de voyageurs
et **commerce électronique**. Ce dernier est défini largement : tout service fourni
à distance, par un site ou une application mobile, en vue de conclure un contrat
avec un consommateur.

Un site qui vend à des particuliers entre donc dans le champ, sous peine de
sanctions fixées par chaque État membre (article 30). Le texte prévoit quatre
exceptions, et aucune n'est un chèque en blanc.

- **Microentreprise de services** : moins de 10 personnes **et** un chiffre
  d'affaires annuel ou un total de bilan qui ne dépasse pas 2 millions d'euros.
- **Contenus exclus** : médias préenregistrés et fichiers bureautiques publiés avant
  le 28 juin 2025, contenus de tiers que tu ne finances, ne développes ni ne
  contrôles, archives figées depuis cette date, cartes en ligne (sous condition).
- **Charge disproportionnée** (article 14) : à évaluer, à **documenter**, puis à
  réévaluer quand le service change et au moins tous les cinq ans.
- **Contrats en cours** (article 32) : un contrat de service conclu avant le 28 juin
  2025 peut se poursuivre tel quel jusqu'à son terme, au plus cinq ans après.

### De la directive aux critères testables

La directive ne cite ni WCAG ni numéro de version. Son annexe I demande des sites et
des applications perceptibles, utilisables, compréhensibles et robustes : les quatre
principes de WCAG. Le pont technique passe par trois documents.

| Document | Rôle | État en novembre 2026 |
| --- | --- | --- |
| **WCAG 2.2** | Les critères testables | Recommandation W3C, édition du 12 décembre 2024 |
| **EN 301 549** | La norme européenne harmonisée, qui embarque WCAG | V3.2.1 (2021) reprend WCAG 2.1 ; V4.1.1 (septembre 2026) s'aligne sur WCAG 2.2 |
| **RGAA** | Le référentiel français, déjà imposé au secteur public et aux entreprises d'au moins 250 M€ de chiffre d'affaires en France | Version 4.1.2, 106 critères ; version 5 annoncée pour fin 2026 |

:::callout{type="warn"}
**Novembre 2026 : deux textes en mouvement.** Respecter une norme harmonisée donne
une présomption de conformité (article 15), mais seulement une fois sa référence
publiée au Journal officiel de l'UE : l'avant-propos de la V4.1.1 le rappelle.
Vérifie cette publication avant de t'en prévaloir. Côté français, le RGAA 5, qui
intégrera WCAG 2.2, est encore en rédaction : la version 4.1.2 reste en vigueur.
:::

En pratique, vise **WCAG 2.2 niveau AA**, c'est-à-dire tous les critères A et AA. Le
W3C l'écrit : un contenu conforme à WCAG 2.2 l'est aussi à WCAG 2.1 et 2.0.

## Ce que WCAG 2.2 ajoute

WCAG 2.2 ajoute **neuf critères** à la 2.1 et en retire un (4.1.1 Analyse
syntaxique, obsolète). Trois sont de niveau AAA, six entrent dans ta cible A et AA.

| Critère | Niveau | Ce qu'il exige |
| --- | --- | --- |
| 2.4.11 Focus non masqué (minimum) | AA | L'élément qui reçoit le focus clavier n'est jamais entièrement caché par ton contenu |
| 2.5.7 Mouvements de glissement | AA | Toute action par glisser se fait aussi par un simple pointage |
| 2.5.8 Taille de la cible (minimum) | AA | Une cible de pointeur mesure au moins 24 × 24 px CSS |
| 3.2.6 Aide cohérente | A | Un mécanisme d'aide répété garde la même place d'une page à l'autre |
| 3.3.7 Saisie redondante | A | Une information déjà donnée dans un processus n'est pas redemandée |
| 3.3.8 Authentification accessible (minimum) | AA | Pas de test cognitif pour se connecter, sauf aide ou alternative |

Ces intitulés sont ceux de la traduction française autorisée (mise à jour le 22
septembre 2026). Clavier, pointeur, charge cognitive : aucun ne se règle avec ARIA.

## Chaque critère en code

### Focus non masqué : `scroll-padding`

Tu tabules vers un lien en bas de page : le navigateur le fait défiler dans la zone
visible et le pose sous ta barre de cookies fixe. Avec Maj+Tab, il atterrit sous
l'en-tête collant. L'élément a le focus, mais personne ne le voit.

```css
html {
  scroll-padding-top: 5rem;    /* hauteur de l'en-tête collant + une marge */
  scroll-padding-bottom: 4rem; /* hauteur de la barre fixe du bas + une marge */
}
```

`scroll-padding` réduit la zone que le navigateur considère comme visible quand il
amène un élément à l'écran : c'est la technique C43 du W3C. Le critère AA n'échoue
que si le composant est **entièrement** caché : une barre de cookies non modale qui
le recouvre en entier est un échec documenté. Rends-la modale ou réserve sa place.

### Pointeur : cibles de 24 px, alternative au glisser

```css
/* La zone cliquable fait 24 px, même si l'icône en fait 16 */
.icon-button { min-inline-size: 24px; min-block-size: 24px; }
```

**Taille de cible.** Le seuil se mesure en pixels CSS sur la zone cliquable, pas sur
le dessin. Exceptions principales : le lien dans une phrase, le contrôle natif non
redimensionné, et la petite cible isolée, quand un cercle de 24 px centré sur elle
ne croise ni une autre cible ni le cercle d'une voisine trop petite. Idée reçue :
« il faut 44 px ». C'est le seuil du critère 2.5.5, de niveau AAA.

**Glisser.** Le piège : croire qu'un raccourci clavier suffit. Le critère exige une
alternative **au pointeur**, sans glisser, car un écran tactile n'a pas de clavier.
Liste triable : boutons monter et descendre. Carrousel : précédent et suivant. Un
`<input type="range">` natif non modifié est hors champ : il relève du navigateur.

### Authentification : pas de test cognitif à la connexion

Retenir un mot de passe, recopier un code, résoudre un puzzle : ce sont des **tests
de fonction cognitive**. WCAG ne les admet qu'avec une aide ou une alternative ; au
niveau AA, la reconnaissance d'objets reste tolérée.

:::compare
::bad
```html
<input type="password" name="password" onpaste="return false" />
<p>Recopie les caractères déformés de l'image :</p>
<input type="text" name="captcha" />
```
::
::good
```html
<label for="email">E-mail</label>
<input id="email" type="email" name="email" autocomplete="username" />
<label for="password">Mot de passe</label>
<input id="password" type="password" name="password"
       autocomplete="current-password" />
```
::
:::

**Pourquoi.** À gauche, tout force la mémoire ou la recopie : le collage est bloqué
(échec documenté F109) et le CAPTCHA impose une transcription. À droite,
`autocomplete` laisse le gestionnaire de mots de passe remplir les champs et le
collage reste possible : c'est le « mécanisme d'aide » que le critère accepte. Même
règle pour un code à usage unique : il doit pouvoir se coller ou se remplir seul
(`autocomplete="one-time-code"`). Les méthodes sans mémoire passent aussi : lien de
connexion par e-mail, ou passkeys (voir `/web/senior/passkeys`).

### Saisie redondante et aide cohérente

**Saisie redondante.** Dans un même processus (un tunnel de commande), une
information déjà saisie est préremplie ou proposée au choix : la case « Identique à
l'adresse de livraison » est un classique. Idée reçue : « le navigateur remplit tout
seul, donc c'est bon ». Non : le W3C précise que c'est au site de fournir la donnée.
Exceptions : une ressaisie exigée par la sécurité, une donnée qui n'est plus valide.

**Aide cohérente.** Le critère n'oblige pas à proposer une aide. Mais si un lien de
contact, un chat ou une FAQ apparaît sur plusieurs pages, il garde le même ordre par
rapport au reste du contenu. Place-le dans le gabarit partagé, jamais page par page.

## Auditer : échantillon, WCAG-EM 2.0, déclaration

Tu n'audites pas 10 000 pages, mais un **échantillon représentatif**, avec une
méthode que tu peux montrer. Le W3C a publié **WCAG-EM 2.0** le 23 juillet 2026, sous
forme de note : un guide, pas une norme. Elle couvre désormais les applications et
tient en cinq étapes : définir le périmètre, explorer le produit, sélectionner un
échantillon, l'évaluer, rapporter les résultats.

Pour l'échantillon, le RGAA donne une base concrète : accueil, contact, mentions
légales, page « accessibilité », plan du site, aide, authentification ; au moins une
page par type de service ; des pages d'aspect distinct (tableaux, formulaires,
médias) ; des pages tirées au hasard pour au moins 10 % de l'échantillon. Et surtout
**toutes les pages d'un processus** : le tunnel entier, pas son premier écran.

L'audit débouche sur un document public. Pour l'EAA, l'annexe V demande que les
conditions générales, ou un document équivalent, expliquent comment le service
satisfait aux exigences. Le RGAA, lui, impose une **déclaration d'accessibilité** à
trois états : conformité totale (tous les critères), partielle (au moins 50 %),
non-conformité (moins de 50 %, ou aucun audit valide). Déclare l'état réel : face à
un écart, la directive attend des mesures correctives (article 13).

## Automatiser sans se mentir

`/web/senior/accessibility` pose la règle : un outil automatique ne détecte qu'une
partie des critères. Avec WCAG 2.2, l'écart se creuse. Le test à brancher en CI avec
Playwright (voir `/tooling/medior/playwright`) :

```ts
import { test, expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

test("aucune violation axe sur le panier", async ({ page }) => {
  await page.goto("/panier");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

Trois pièges, relus dans la documentation d'axe-core 4.14 :

- **Le tag `wcag22aa` doit être explicite.** Les règles WCAG 2.2 d'axe sont
  désactivées par défaut. Sans lui, « zéro violation » ne dit rien de la 2.2.
- **Ce tag n'active qu'une règle : `target-size`.** Sur les six nouveaux critères,
  axe en teste un. Les cinq autres lui échappent.
- **`violations` n'est pas tout.** axe range dans `results.incomplete` ce qu'il n'a
  pas su trancher. Lis aussi ce tableau.

Le reste se vérifie à la main, gabarit par gabarit : tabule avec les barres collantes
affichées, refais chaque glisser au simple clic, connecte-toi avec un gestionnaire de
mots de passe, traverse le tunnel en notant chaque champ redemandé.

## WCAG 3 : un brouillon de travail, pas une cible

:::callout{type="warn"}
**Novembre 2026.** WCAG 3.0 (« W3C Accessibility Guidelines ») est un *Working
Draft*, mis à jour le 10 septembre 2026. Le W3C le décrit comme un brouillon
incomplet qui va changer, et n'attend pas de standard finalisé avant quelques années.
:::

Ne l'inscris donc ni dans un contrat ni dans une déclaration : le document précise
lui-même qu'il ne se cite que comme un travail en cours. Et ne gèle rien en
l'attendant. Selon le W3C, WCAG 2 ne sera pas déprécié avant plusieurs années après
la finalisation de WCAG 3, et la meilleure préparation reste de satisfaire WCAG 2.2.

## À retenir

:::cheatsheet
- title: "EAA = directive (UE) 2019/882"
  desc: "Services aux consommateurs fournis après le 28 juin 2025. Microentreprises de services exemptées ; charge disproportionnée à documenter."
- title: "Cible : WCAG 2.2 niveau AA"
  desc: "Conforme 2.2 = conforme 2.1 et 2.0. EN 301 549 V4.1.1 s'aligne dessus, le RGAA 5 l'intégrera. WCAG 3 n'est qu'un brouillon."
- title: "Six critères A et AA en plus"
  desc: "Focus non masqué, glisser, cible de 24 px, aide cohérente, saisie redondante, authentification accessible."
- title: "scroll-padding / 24 px / autocomplete"
  desc: "Dégage le focus des barres collantes, agrandis la zone cliquable, laisse le gestionnaire de mots de passe et le collage travailler."
- title: "Audit par échantillon, axe en renfort"
  desc: "WCAG-EM 2.0 en cinq étapes, processus complets inclus. axe exige le tag wcag22aa et ne teste que target-size : le reste se vérifie à la main."
:::
