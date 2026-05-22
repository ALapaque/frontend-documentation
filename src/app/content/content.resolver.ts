import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { ContentService } from './content.service';
import { isFramework, isLevel } from '../core/levels';
import type { CompiledModule } from './content.types';

/** Resolves the compiled module for `/{framework}/{level}/{slug}` (or null). */
export const moduleResolver: ResolveFn<CompiledModule | null> = (
  route: ActivatedRouteSnapshot,
) => {
  const framework = route.paramMap.get('framework') ?? '';
  const level = route.paramMap.get('level') ?? '';
  const slug = route.paramMap.get('slug') ?? '';
  if (!isFramework(framework) || !isLevel(level)) return null;
  return inject(ContentService).load(framework, level, slug);
};
