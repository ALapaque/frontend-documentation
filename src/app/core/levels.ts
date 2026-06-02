export type Level = 'junior' | 'medior' | 'senior' | 'next';
export type JsFramework = 'angular' | 'react' | 'vue';
export type Fundamental = 'web' | 'css' | 'typescript' | 'tooling' | 'architecture';
/** A content section: the three JS frameworks plus the platform fundamentals. */
export type Framework = JsFramework | Fundamental;

export interface LevelMeta {
  readonly id: Level;
  readonly label: string;
  /** CSS custom property holding the level color. */
  readonly colorVar: `var(--level-${Level})`;
  readonly promise: string;
}

export const LEVELS: readonly Level[] = ['junior', 'medior', 'senior', 'next'] as const;

export const LEVEL_META: Record<Level, LevelMeta> = {
  junior: {
    id: 'junior',
    label: 'Junior',
    colorVar: 'var(--level-junior)',
    promise: 'On explique le concept comme une première fois.',
  },
  medior: {
    id: 'medior',
    label: 'Medior',
    colorVar: 'var(--level-medior)',
    promise: 'Bases acquises — pièges, perfs, idées reçues.',
  },
  senior: {
    id: 'senior',
    label: 'Senior',
    colorVar: 'var(--level-senior)',
    promise: 'Implémentation, architecture, trade-offs.',
  },
  next: {
    id: 'next',
    label: 'Next',
    colorVar: 'var(--level-next)',
    promise: 'Ce qui arrive dans la prochaine version majeure.',
  },
};

/** The three JS frameworks, used for the main nav and landing cards. */
export const FRAMEWORKS: readonly JsFramework[] = ['angular', 'react', 'vue'] as const;
/** Platform fundamentals — top-level sections that share the level model. */
export const FUNDAMENTALS: readonly Fundamental[] = ['web', 'css', 'typescript', 'tooling', 'architecture'] as const;
/** Every content section (frameworks + fundamentals). */
export const SECTIONS: readonly Framework[] = [...FRAMEWORKS, ...FUNDAMENTALS];

export const FRAMEWORK_LABEL: Record<Framework, string> = {
  angular: 'Angular',
  react: 'React',
  vue: 'Vue',
  web: 'Web',
  css: 'CSS',
  typescript: 'TypeScript',
  tooling: 'Outils',
  architecture: 'Architecture',
};

export function isLevel(value: string): value is Level {
  return (LEVELS as readonly string[]).includes(value);
}

export function isFramework(value: string): value is Framework {
  return (SECTIONS as readonly string[]).includes(value);
}

export function isFundamental(value: string): value is Fundamental {
  return (FUNDAMENTALS as readonly string[]).includes(value);
}
