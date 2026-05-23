import { Injectable, signal } from '@angular/core';

/**
 * Tracks which module the user is navigating to/from, so the hub card and the
 * article header can share a `view-transition-name` and morph into each other.
 * Only one element may carry a given name at capture time, so exactly one card
 * (the one matching `activeKey`) is named at any moment.
 */
@Injectable({ providedIn: 'root' })
export class MorphService {
  readonly activeKey = signal<string | null>(null);
}
