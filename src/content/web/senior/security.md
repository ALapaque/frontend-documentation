---
title: "Sécurité front : XSS, CSP, CORS, CSRF"
slug: "security"
framework: "web"
level: "senior"
order: 3
duration: 16
prerequisites: []
updated: 2026-05-23
seoTitle: "Sécurité front-end : XSS, CSP, CORS, CSRF et clickjacking"
seoDescription: "Comprends les vraies attaques côté navigateur (XSS stocké, réfléchi, DOM-based), CSP avec nonces, CORS et preflight, CSRF et SameSite, clickjacking et frame-ancestors, et le principe : ne jamais faire confiance au client."
ogVariant: "crimson"
related:
  - { framework: "web", slug: "core-web-vitals" }
---

## Le principe fondateur : ne jamais faire confiance au client

Tout ce qui arrive du navigateur est sous le contrôle de l'utilisateur — donc potentiellement de l'attaquant. Le HTML, les cookies, les headers, les payloads JSON, l'ordre des requêtes : tout est modifiable avec les DevTools, un proxy comme Burp, ou un simple `curl`. La validation côté client est une **affaire d'ergonomie**, jamais de sécurité. La règle est sans exception : **toute donnée doit être validée et autorisée côté serveur**, et toute donnée renvoyée vers le navigateur doit être encodée pour le contexte où elle atterrit.

La sécurité front n'est donc pas « le navigateur protège l'utilisateur » mais « comment empêcher que le code de mon origine soit détourné, et que les credentials de mon utilisateur soient utilisés à son insu ». Trois familles couvrent l'essentiel : l'**injection de script** (XSS), l'**abus d'authentification ambiante** (CSRF, CORS mal réglé), et le **détournement d'UI** (clickjacking).

## XSS — exécution de script dans ton origine

Une faille **XSS** (Cross-Site Scripting) permet à un attaquant d'exécuter du JavaScript dans le contexte de ton origine. Comme ce code tourne avec les mêmes droits que le tien, il lit les cookies non-`HttpOnly`, le `localStorage`, fait des requêtes authentifiées, et peut tout exfiltrer. On distingue trois types selon le **chemin** que prend la charge.

- **XSS stocké** : la charge est persistée côté serveur (commentaire, profil, message) puis re-servie telle quelle à d'autres utilisateurs. Le plus grave car il touche tout le monde et persiste.
- **XSS réfléchi** : la charge est dans la requête (paramètre d'URL, champ de recherche) et renvoyée immédiatement dans la réponse. L'attaque passe par un lien piégé.
- **XSS DOM-based** : la charge ne touche jamais le serveur ; c'est du JS côté client qui lit une source contrôlée (`location.hash`, `document.referrer`) et l'écrit dans un *sink* dangereux (`innerHTML`, `document.write`, `eval`). Le serveur ne voit rien — un WAF est aveugle.

### Défense : encoder selon le contexte, pas « nettoyer »

La défense n'est pas de « filtrer les balises » mais d'**encoder la donnée pour le contexte de destination**. Le même `</script>` est inoffensif en contenu texte et explosif dans un attribut JS. La règle simple : pour insérer du texte, utilise `textContent` (jamais `innerHTML`). Pour du HTML riche venant de l'utilisateur, passe par un sanitizer.

:::compare
::bad
```js
// DOM-based XSS : hash contrôlé par l'attaquant → sink innerHTML
const tab = location.hash.slice(1);
document.querySelector('#title').innerHTML = 'Section : ' + tab;
// #<img src=x onerror=alert(document.cookie)>
```
::
::good
```js
const tab = location.hash.slice(1);
document.querySelector('#title').textContent = 'Section : ' + tab;
// ou, pour du HTML riche, sanitize d'abord :
const clean = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
container.innerHTML = clean;
```
::
:::

**Pourquoi.** `innerHTML` invoque le parser HTML : la chaîne est interprétée comme du markup, donc un `<img onerror>` ou un `<svg onload>` déclenche du JS (les balises `<script>` injectées ne s'exécutent pas, mais les *handlers d'événements* sur d'autres balises, si). `textContent` écrit dans un **nœud texte** : le navigateur n'invoque jamais le parser markup, les chevrons restent des caractères littéraux et rien ne s'exécute. Quand tu as vraiment besoin de HTML, un sanitizer (DOMPurify, ou l'API native **`setHTML()`**) parse, applique une *allow-list* d'éléments/attributs et retire tout ce qui est exécutable — une *deny-list* maison est toujours contournable.

### Trusted Types : verrouiller les sinks

**Trusted Types** (généralisé sur les navigateurs Chromium et Firefox en 2026) transforme les sinks dangereux en erreurs : avec `Content-Security-Policy: require-trusted-types-for 'script'`, affecter une `string` brute à `innerHTML` ou `eval` *jette une exception*. Tu dois passer par une *policy* qui produit un type `TrustedHTML`. L'intérêt : tu réduis ta surface XSS DOM-based à un nombre fini de policies auditables, au lieu de devoir auditer chaque `innerHTML` du codebase.

```http
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types default dompurify
```

## CSP — défense en profondeur contre l'exécution

La **Content-Security-Policy** est une couche qui dit au navigateur *quelles sources de script/style/etc. sont autorisées*. Même si un XSS passe, une bonne CSP empêche le script injecté de s'exécuter ou d'exfiltrer. La directive clé est `script-src`. Évite `'unsafe-inline'` et les allow-lists d'URL (contournables via JSONP ou endpoints ouverts sur les CDN). La pratique moderne est une **CSP stricte à base de nonces** :

```http
Content-Security-Policy:
  script-src 'nonce-r4nd0m2026' 'strict-dynamic';
  object-src 'none'; base-uri 'none';
```

Le serveur génère un **nonce aléatoire par réponse** et le pose sur chaque `<script nonce="r4nd0m2026">` légitime. Un script injecté par XSS n'a pas le nonce → bloqué. `'strict-dynamic'` propage la confiance aux scripts chargés par un script déjà fiable (utile pour les bundlers), ce qui évite de maintenir une allow-list. `base-uri 'none'` bloque le détournement des URLs relatives via une balise `<base>` injectée.

:::callout{type="warn"}
Un nonce **doit être unique et imprévisible à chaque réponse**. Le réutiliser (ou le mettre en cache CDN sans le régénérer) revient à n'avoir aucune protection : l'attaquant lit le nonce dans le HTML servi et le recopie sur sa charge. Si tu sers du HTML en cache statique, les nonces sont incompatibles — passe alors à une CSP basée sur des **hashes** des scripts inline connus.
:::

## CORS — qui peut lire mes réponses cross-origin

La **Same-Origin Policy** empêche par défaut un script d'une origine A de **lire** la réponse d'une origine B. **CORS** (Cross-Origin Resource Sharing) est le mécanisme par lequel B *autorise explicitement* A à lire ses réponses, via le header `Access-Control-Allow-Origin`. Point souvent mal compris : CORS ne protège pas B, il **relâche** une restriction du navigateur. Un serveur n'a pas besoin de CORS pour se protéger ; il en a besoin pour *partager*.

Pour les requêtes « non simples » (méthode autre que GET/POST/HEAD, ou headers custom, ou `Content-Type: application/json`), le navigateur envoie d'abord un **preflight** `OPTIONS` qui demande la permission. Le serveur répond avec les méthodes/headers autorisés ; sans réponse correcte, la vraie requête n'est jamais envoyée.

```http
Access-Control-Allow-Origin: https://app.exemple.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST
Access-Control-Allow-Headers: Content-Type
```

:::callout{type="warn"}
`Access-Control-Allow-Origin: *` est **incompatible** avec `Access-Control-Allow-Credentials: true` : le navigateur refuse la combinaison. Pire, renvoyer en écho l'`Origin` de la requête (`ACAO: <origin reçue>`) avec `credentials: true` revient à autoriser **n'importe quelle origine** à lire des réponses authentifiées — une fuite de données massive. Valide chaque origine par rapport à une allow-list serveur.
:::

## CSRF — abus de l'authentification ambiante + SameSite

Le **CSRF** (Cross-Site Request Forgery) exploite le fait que le navigateur **attache automatiquement les cookies** à toute requête vers ton origine, même déclenchée depuis un site tiers. Un `<form>` ou un `fetch` sur un site malveillant peut donc déclencher une action authentifiée (virement, suppression) sur ton domaine, sans jamais lire la réponse — l'effet de bord suffit.

La défense moderne tient en deux couches. D'abord l'attribut **`SameSite`** sur le cookie de session : `SameSite=Lax` (défaut des navigateurs depuis 2020) empêche l'envoi du cookie sur les requêtes cross-site non-navigationnelles ; `SameSite=Strict` est plus dur encore. Ensuite, pour les flux sensibles, un **token anti-CSRF** (synchronizer token ou double-submit) que l'attaquant ne peut pas deviner ni lire (Same-Origin Policy).

```http
Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax; Path=/
```

`HttpOnly` interdit l'accès JS au cookie (limite l'impact d'un XSS), `Secure` le restreint à HTTPS. SameSite ne remplace pas le token : certains scénarios (sous-domaines, redirections top-level GET) restent exposés.

## Clickjacking — frame-ancestors

Le **clickjacking** consiste à charger ton site dans une `<iframe>` invisible superposée à une UI leurre : l'utilisateur croit cliquer sur un bouton anodin mais clique en réalité sur « Confirmer le paiement » de ton app. La défense : interdire l'embarquement via la directive CSP **`frame-ancestors`** (qui remplace l'ancien header `X-Frame-Options`).

```http
Content-Security-Policy: frame-ancestors 'self' https://partenaire.exemple.com
```

`frame-ancestors 'none'` interdit tout embarquement ; `'self'` autorise uniquement ta propre origine. Préfère-la à `X-Frame-Options` : elle gère plusieurs origines et est la source de vérité moderne.

:::cheatsheet
- title: "textContent par défaut"
  desc: "innerHTML invoque le parser HTML ; textContent écrit du texte inerte."
- title: "Sanitize > filtrer"
  desc: "Allow-list (DOMPurify, setHTML) ; jamais de deny-list maison."
- title: "CSP à nonces"
  desc: "script-src 'nonce-...' 'strict-dynamic' ; nonce unique par réponse."
- title: "CORS partage, ne protège pas"
  desc: "Jamais ACAO:* avec credentials ; allow-list serveur des origines."
- title: "SameSite + token"
  desc: "Cookie SameSite=Lax HttpOnly Secure, + token anti-CSRF si sensible."
- title: "frame-ancestors"
  desc: "Bloque le clickjacking ; remplace X-Frame-Options."
- title: "Jamais confiance au client"
  desc: "Validation et autorisation côté serveur, toujours."
:::
