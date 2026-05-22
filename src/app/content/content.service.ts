import { Injectable } from '@angular/core';
import { CATALOGUE } from '../../content/generated/catalogue';
import { MODULE_LOADERS } from '../../content/generated/loaders';
import type { Framework, Level } from '../core/levels';
import { moduleKey, type CompiledModule, type ModuleMeta } from './content.types';

/**
 * Single entry point for compiled content. The catalogue (front-matter only)
 * is bundled eagerly; full module bodies are lazy-loaded per slug via dynamic
 * JSON imports, so each module is its own chunk and SSR resolves it on demand.
 */
@Injectable({ providedIn: 'root' })
export class ContentService {
  readonly catalogue: readonly ModuleMeta[] = CATALOGUE;

  forFramework(framework: Framework): readonly ModuleMeta[] {
    return this.catalogue.filter((m) => m.framework === framework);
  }

  forFrameworkLevel(framework: Framework, level: Level): readonly ModuleMeta[] {
    return this.forFramework(framework).filter((m) => m.level === level);
  }

  meta(framework: Framework, level: Level, slug: string): ModuleMeta | undefined {
    return this.catalogue.find(
      (m) => m.framework === framework && m.level === level && m.slug === slug,
    );
  }

  /** Siblings in the same level, ordered — used for prev/next navigation. */
  siblings(framework: Framework, level: Level): readonly ModuleMeta[] {
    return [...this.forFrameworkLevel(framework, level)].sort((a, b) => a.order - b.order);
  }

  async load(framework: Framework, level: Level, slug: string): Promise<CompiledModule | null> {
    const loader = MODULE_LOADERS[moduleKey(framework, level, slug)];
    if (!loader) return null;
    return (await loader()).default;
  }
}
