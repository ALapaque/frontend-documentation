export type Level = 'junior' | 'medior' | 'senior';
export type Framework = 'angular' | 'react' | 'vue';

export interface LevelMeta {
  readonly id: Level;
  readonly label: string;
  /** CSS custom property holding the level color. */
  readonly colorVar: `var(--level-${Level})`;
  readonly promise: string;
}

export const LEVELS: readonly Level[] = ['junior', 'medior', 'senior'] as const;

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
};

export const FRAMEWORKS: readonly Framework[] = ['angular', 'react', 'vue'] as const;

export const FRAMEWORK_LABEL: Record<Framework, string> = {
  angular: 'Angular',
  react: 'React',
  vue: 'Vue',
};

export function isLevel(value: string): value is Level {
  return (LEVELS as readonly string[]).includes(value);
}

export function isFramework(value: string): value is Framework {
  return (FRAMEWORKS as readonly string[]).includes(value);
}
