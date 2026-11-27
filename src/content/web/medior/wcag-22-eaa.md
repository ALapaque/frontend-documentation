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
relie les trois, puis traduit en CSS et en HTML les six critères que WCAG 2.2 ajoute
à ta cible. Les bases (arbre d'accessibilité, ARIA, focus, contraste) sont dans
`/web/senior/accessibility` : on ne les reprend pas ici.

:::callout{type="info"}
Cet article n'est pas un avis juridique. Les dates et les seuils viennent du texte
de la directive et des documents du W3C, relus en novembre 2026. Pour savoir si
**ton** service est concerné, fais valider l'analyse par un juriste.
:::

## L'EAA : qui est concerné, qui ne l'est pas

L'**European Accessibility Act** (EAA) est la directive (UE) 2019/882. Elle vise des
produits (ordinateurs, terminaux de paiement, liseuses) et, surtout pour toi, des
**services fournis aux consommateurs après le 28 juin 2025** :

- le **commerce électronique** : tout service fourni à distance, par un site ou une
  application mobile, en vue de conclure un contrat avec un consommateur ;
- les services bancaires aux consommateurs ;
- les livres numériques et leurs logiciels de lecture ;
- les communications électroniques et l'accès aux médias audiovisuels ;
- le transport de voyageurs : sites, applications, billets électroniques.

Un site qui vend à des particuliers entre donc dans le champ, sauf exception. Le
texte en prévoit quatre, et aucune n'est un chèque en blanc.

- **Microentreprise de services** : moins de 10 personnes **et** un chiffre
  d'affaires annuel ou un total de bilan qui ne dépasse pas 2 millions d'euros.
- **Contenus exclus** : médias préenregistrés et fichiers bureautiques publiés avant
  le 28 juin 2025, contenus de tiers que tu ne finances, ne développes ni ne
  contrôles, archives non modifiées depuis cette date, cartes en ligne (sous
  condition).
- **Charge disproportionnée** (article 14) : une dérogation que tu dois évaluer,
  **documenter**, conserver cinq ans et réévaluer quand le service change, au moins
  tous les cinq ans.
- **Contrats en cours** (article 32) : un contrat de service conclu avant le 28 juin
  2025 peut se poursuivre sans modification jusqu'à son terme, au plus tard cinq ans
  après cette date.

Les sanctions sont fixées par chaque État membre (article 30) : lis le texte de
transposition du pays où tu vends.

### De la directive aux critères testables

La directive ne cite ni WCAG ni numéro de version. Son annexe I demande des sites et
des applications perceptibles, utilisables, compréhensibles et robustes : les quatre
principes de WCAG. Le pont technique passe par trois documents.

| Document | Rôle | État en novembre 2026 |
| --- | --- | --- |
| **WCAG 2.2** | Les critères testables | Recommandation W3C, édition du 12 décembre 2024 |
| **EN 301 549** | La norme européenne qui embarque WCAG | V3.2.1 (2021) reprend WCAG 2.1 ; V4.1.1 (septembre 2026) s'aligne sur WCAG 2.2 |
| **RGAA** | Le référentiel français : critères et tests | Version 4.1.2, 106 critères ; version 5 annoncée pour fin 2026 |

L'article 15 de la directive donne une **présomption de conformité** aux services
qui respectent une norme harmonisée dont la référence est publiée au Journal
officiel de l'UE. En France, le RGAA s'impose déjà au secteur public et aux
entreprises qui réalisent au moins 250 millions d'euros de chiffre d'affaires dans
le pays.

:::callout{type="warn"}
**Novembre 2026 : deux textes en mouvement.** L'ETSI a publié l'EN 301 549 V4.1.1 en
septembre 2026. Son avant-propos le précise : la présomption de conformité à la
directive ne joue qu'une fois sa référence citée au Journal officiel de l'UE.
Vérifie cette citation avant de t'en prévaloir. Côté français, le RGAA 5, qui
intégrera WCAG 2.2, est encore en rédaction : la version 4.1.2 reste en vigueur.
:::

En pratique, vise **WCAG 2.2 niveau AA**, c'est-à-dire tous les critères A et AA. Le
W3C l'écrit noir sur blanc : un contenu conforme à WCAG 2.2 l'est aussi à WCAG 2.1
et 2.0. Tu couvres la norme d'hier et celle qui arrive.

## Ce que WCAG 2.2 ajoute

WCAG 2.2 ajoute **neuf critères** à la 2.1 et en retire un (4.1.1 Analyse
syntaxique, devenu obsolète). Trois sont de niveau AAA. Les six autres entrent dans
ta cible :

| Critère | Niveau | Ce qu'il exige |
| --- | --- | --- |
| 2.4.11 Focus non masqué (minimum) | AA | L'élément qui reçoit le focus clavier n'est jamais entièrement caché par ton contenu |
| 2.5.7 Mouvements de glissement | AA | Toute action par glisser se fait aussi par un simple pointage |
| 2.5.8 Taille de la cible (minimum) | AA | Une cible de pointeur mesure au moins 24 × 24 px CSS |
| 3.2.6 Aide cohérente | A | Un mécanisme d'aide répété garde la même place d'une page à l'autre |
| 3.3.7 Saisie redondante | A | Une information déjà donnée dans un processus n'est pas redemandée |
| 3.3.8 Authentification accessible (minimum) | AA | Pas de test cognitif pour se connecter, sauf aide ou alternative |

Les intitulés sont ceux de la traduction française autorisée, mise à jour le 22
septembre 2026. Ces critères parlent de clavier, de pointeur et de charge cognitive :
aucun ne se règle avec un attribut ARIA.

## Chaque critère en code

### Focus non masqué : `scroll-padding`

Tu tabules vers un lien en bas de page : le navigateur le fait défiler dans la zone
visible et le pose sous ta barre de cookies fixe. En remontant avec Maj+Tab, il
atterrit sous l'en-tête collant. L'élément a le focus, mais personne ne le voit.

:::compare
::bad
```css
.site-header { position: sticky; top: 0; block-size: 4.5rem; }
.cookie-bar { position: fixed; bottom: 0; block-size: 3.5rem; }
/* Rien d'autre : le focus se glisse sous les deux barres */
```
::
::good
```css
.site-header { position: sticky; top: 0; block-size: 4.5rem; }
.cookie-bar { position: fixed; bottom: 0; block-size: 3.5rem; }

html {
  scroll-padding-top: 5rem;    /* hauteur de l'en-tête + une marge */
  scroll-padding-bottom: 4rem; /* hauteur de la barre fixe + une marge */
}
```
::
:::

**Pourquoi.** Quand le focus part hors écran, le navigateur amène l'élément au bord
de la zone visible, sans savoir que tes barres recouvrent ce bord. `scroll-padding`
réduit la zone qu'il considère comme visible : c'est la technique C43 du W3C. Le
critère AA n'échoue que si le composant est **entièrement** caché. Une barre de
cookies non modale qui recouvre le focus est un échec documenté : rends-la modale
(voir `/web/medior/popover-dialog`) ou réserve sa place avec `scroll-padding`.

### Taille de cible : 24 px au minimum

```css
.icon-button {
  display: inline-grid;
  place-items: center;
  min-inline-size: 24px; /* la zone cliquable, pas le dessin */
  min-block-size: 24px;
}
.icon-button svg { inline-size: 16px; block-size: 16px; }
```

Le seuil se mesure en **pixels CSS** sur la zone cliquable : une icône de 16 px passe
si son bouton en fait 24. Les exceptions sont précises, pas extensibles :

- **Espacement** : une cible plus petite passe si un cercle de 24 px de diamètre,
  centré sur elle, ne croise ni une autre cible ni le cercle d'une autre petite cible.
- **En ligne** : un lien dans une phrase, contraint par la hauteur de ligne.
- **Contrôle natif** : une case à cocher dont tu n'as pas modifié la taille.

Idée reçue : « il faut 44 px ». 44 × 44 px est le seuil du critère 2.5.5, de niveau
AAA. Un bon objectif pour le tactile, mais pas l'exigence AA.

### Glisser-déposer : une alternative au simple pointage

```html
<li>
  <span class="handle" aria-hidden="true">⠿</span>
  Livraison express
  <button type="button" aria-label="Monter Livraison express">↑</button>
  <button type="button" aria-label="Descendre Livraison express">↓</button>
</li>
```

Le piège : croire qu'un raccourci clavier suffit. Le critère exige une alternative
**au pointeur**, sans glisser, parce qu'un écran tactile n'a pas de clavier. Liste
triable : boutons monter et descendre. Carrousel : boutons précédent et suivant.
Curseur maison : un clic sur la piste déplace la poignée. Un `<input type="range">`
natif non modifié est hors champ, son comportement relève du navigateur.

### Authentification : pas de test cognitif à la connexion

Retenir un mot de passe, recopier un code, résoudre un puzzle : ce sont des **tests
de fonction cognitive**. WCAG ne les interdit pas, il exige une aide ou une
alternative.

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

<label for="otp">Code reçu par SMS</label>
<input id="otp" name="otp" inputmode="numeric" autocomplete="one-time-code" />
```
::
:::

**Pourquoi.** À gauche, tout force la mémoire ou la recopie : le collage est bloqué
(échec documenté F109) et le CAPTCHA à texte déformé impose une transcription. À
droite, `autocomplete` laisse le gestionnaire de mots de passe remplir les champs et
le collage reste possible : c'est le « mécanisme d'aide » que le critère accepte. Un
code à usage unique qu'il faut recopier à la main n'est pas conforme ; s'il se colle
ou se remplit seul, il l'est. Les méthodes sans mémoire passent aussi : lien de
connexion par e-mail, ou passkeys (voir `/web/senior/passkeys`). Au niveau AA, un
CAPTCHA de reconnaissance d'objets reste toléré.

### Saisie redondante et aide cohérente

```html
<fieldset>
  <legend>Adresse de facturation</legend>
  <label>
    <input type="checkbox" name="billing-same" checked />
    Identique à l'adresse de livraison
  </label>
</fieldset>
```

**Saisie redondante.** Dans un même processus (un tunnel de commande), une
information déjà saisie est préremplie ou proposée au choix. Idée reçue : « le
navigateur a son remplissage automatique, donc c'est bon ». Non : le W3C précise que
c'est au site de fournir la donnée. Exceptions : la sécurité (confirmer un mot de
passe), une donnée devenue invalide, une ressaisie essentielle.

**Aide cohérente.** Le critère n'oblige pas à proposer une aide. Mais si un lien de
contact, un chat ou une FAQ apparaît sur plusieurs pages, il garde le même ordre par
rapport au reste du contenu. Côté code : place-le dans le gabarit partagé (en-tête
ou pied de page), jamais page par page.

## Auditer : échantillon, WCAG-EM 2.0, déclaration

Tu n'audites pas 10 000 pages. Tu audites un **échantillon représentatif**, avec une
méthode que tu peux montrer. Le W3C a publié **WCAG-EM 2.0** le 23 juillet 2026, sous
forme de note : un guide, pas une norme, qui n'ajoute aucune exigence à WCAG. Elle
couvre désormais les applications, plus seulement les sites, en cinq étapes : définir
le périmètre, explorer le produit, sélectionner un échantillon, l'évaluer, rapporter
les résultats.

Pour l'échantillon, le RGAA donne une base concrète :

- accueil, contact, mentions légales, page « accessibilité », plan du site, aide,
  authentification ;
- au moins une page par type de service, recherche comprise ;
- **toutes les pages d'un processus** : le tunnel de commande entier, pas son
  premier écran ;
- des pages d'aspect distinct (tableaux, formulaires, médias) ;
- des pages tirées au hasard, pour au moins 10 % de l'échantillon.

L'audit débouche sur un document public. Pour l'EAA, l'annexe V demande que les
conditions générales, ou un document équivalent, décrivent le service et expliquent
comment il satisfait aux exigences. Le RGAA appelle ce document la **déclaration
d'accessibilité** et fixe trois états : conformité totale (tous les critères),
partielle (au moins 50 %), non-conformité (moins de 50 %, ou aucun audit valide).

:::callout{type="tip"}
Écris « partiellement conforme » si c'est le cas, avec la liste des écarts et un
calendrier de correction. En cas de non-conformité, la directive demande des mesures
correctives et une information des autorités nationales (article 13).
:::

## Automatiser sans se mentir

`/web/senior/accessibility` pose la règle : un outil automatique ne détecte qu'une
partie des critères. Avec WCAG 2.2, l'écart se creuse. Le test à brancher en CI avec
Playwright (`/tooling/medior/playwright`) :

```ts
import { test, expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

const pages = ["/", "/panier", "/connexion"];

for (const path of pages) {
  test(`aucune violation axe sur ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
```

Trois pièges, relus dans la documentation d'axe-core 4.14 :

- **Le tag `wcag22aa` doit être explicite.** Les règles WCAG 2.2 d'axe sont
  désactivées par défaut. Sans ce tag, « zéro violation » ne dit rien de la 2.2.
- **Ce tag n'active qu'une règle : `target-size`.** Sur les six nouveaux critères,
  axe en teste un. Les cinq autres lui échappent.
- **`violations` n'est pas tout.** axe range dans `results.incomplete` ce qu'il n'a
  pas su trancher, et `target-size` y atterrit souvent. Lis ce tableau.

Le reste se vérifie à la main, gabarit par gabarit : tabule avec les barres collantes
affichées, refais chaque glisser au simple clic, connecte-toi avec un gestionnaire de
mots de passe, traverse le tunnel en notant chaque champ redemandé, compare la place
de l'aide sur trois pages.

## WCAG 3 : un brouillon de travail, pas une cible

:::callout{type="warn"}
**Novembre 2026.** WCAG 3.0 (« W3C Accessibility Guidelines ») est un *Working
Draft*, dont la dernière version date du 10 septembre 2026. Le W3C le décrit comme
un brouillon incomplet qui va changer, et n'attend pas de standard finalisé avant
quelques années.
:::

Deux conséquences. Ne l'inscris ni dans un contrat ni dans une déclaration : le
document précise lui-même qu'il ne doit être cité que comme un travail en cours. Et
ne gèle rien en l'attendant : selon le W3C, WCAG 3 ne remplacera pas WCAG 2, qui ne
sera pas déprécié avant plusieurs années après sa finalisation. Son conseil tient en
une ligne : la meilleure préparation à WCAG 3, c'est de satisfaire WCAG 2.2
maintenant.

## À retenir

:::cheatsheet
- title: "EAA = directive (UE) 2019/882"
  desc: "Services aux consommateurs fournis après le 28 juin 2025. Microentreprises de services exemptées ; charge disproportionnée à documenter."
- title: "Cible : WCAG 2.2 niveau AA"
  desc: "Recommandation W3C. Conforme 2.2 = conforme 2.1 et 2.0. EN 301 549 V4.1.1 s'aligne dessus, le RGAA 5 l'intégrera."
- title: "Six critères A et AA en plus"
  desc: "Focus non masqué, glisser, cible de 24 px, aide cohérente, saisie redondante, authentification accessible."
- title: "scroll-padding / 24 px / autocomplete"
  desc: "Dégage le focus des barres collantes, agrandis la zone cliquable, laisse le gestionnaire de mots de passe et le collage travailler."
- title: "Audit par échantillon"
  desc: "WCAG-EM 2.0 en cinq étapes, processus complets inclus, résultat publié dans une déclaration honnête."
- title: "axe en CI avec le tag wcag22aa"
  desc: "Une seule règle 2.2 (target-size). Le reste se vérifie au clavier et à la main ; WCAG 3 n'est qu'un brouillon."
:::
