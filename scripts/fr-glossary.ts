/**
 * Glossaire de cohérence FR — source de vérité des choix terminologiques.
 *
 * Chaque règle décrit une forme PROSCRITE (anglicisme, variante orthographique
 * ou vouvoiement) et la forme CANONIQUE à employer. `scripts/lint-content.ts`
 * applique ces règles à la prose des fichiers `src/content/**­/*.md` (le code,
 * le code inline, les URLs et les clés techniques de front-matter sont ignorés).
 *
 * Sévérités :
 *   - `error` : fait échouer la CI (régression à corriger avant merge).
 *   - `warn`  : signalé seulement (forme souvent fautive, mais faux positifs
 *               possibles — on ne bloque pas).
 *
 * Les `pattern` DOIVENT porter le drapeau `g`.
 */
export interface Rule {
  /** Identifiant court, affiché dans le rapport. */
  id: string;
  /** Motif global ; chaque correspondance est un signalement. */
  pattern: RegExp;
  /** Explication + forme canonique à employer. */
  message: string;
  severity: 'error' | 'warn';
}

export const RULES: Rule[] = [
  // ---- Anglicismes / faux amis ------------------------------------------
  {
    id: 'librairie',
    pattern: /\blibrairies?\b/gi,
    message: 'anglicisme : utilise « bibliothèque » (une librairie vend des livres).',
    severity: 'error',
  },
  {
    id: 'support',
    pattern: /\bsupport[eé]\w*\b/gi,
    message: 'anglicisme probable : préférer « prend en charge » / « gère ».',
    severity: 'warn',
  },

  // ---- Orthographe / variantes ------------------------------------------
  {
    id: 'evenement',
    // Forme proscrite « évènement » (accent grave) -> canonique « événement ».
    pattern: /[Éé]vènements?/g,
    message: 'orthographe : utilise « événement » (accent aigu sur les deux e).',
    severity: 'error',
  },
  {
    id: 'reexecut',
    pattern: /ré-exécut\w*/gi,
    message: 'orthographe : « réexécuter » s\'écrit sans trait d\'union.',
    severity: 'error',
  },
  {
    id: 'clef',
    pattern: /\bclefs?\b/gi,
    message: 'variante : utilise « clé » (forme retenue dans tout le corpus).',
    severity: 'error',
  },

  // ---- Tutoiement (le corpus tutoie le lecteur) -------------------------
  {
    id: 'vouvoiement-pronom',
    // « vous » sauf dans « rendez-vous ».
    pattern: /(?<!rendez-)\bvous\b/gi,
    message: 'vouvoiement : le corpus tutoie le lecteur — utilise « tu ».',
    severity: 'error',
  },
  {
    id: 'vouvoiement-possessif',
    pattern: /\b(votre|vos)\b/gi,
    message: 'vouvoiement : utilise « ton / ta / tes ».',
    severity: 'error',
  },
  {
    id: 'vouvoiement-verbe',
    // Verbe en -ez (impératif / 2ᵉ pers. pluriel), hors quelques noms communs.
    pattern: /\b(?!assez\b|chez\b|nez\b|rez\b|raz\b|fez\b|merguez\b)[a-zàâäçéèêëîïôöûüù]+ez\b/gi,
    message: 'vouvoiement probable (verbe en -ez) : emploie la 2ᵉ personne du singulier.',
    severity: 'warn',
  },
];
