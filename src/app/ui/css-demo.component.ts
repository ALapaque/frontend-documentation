import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { DemoKind } from '../content/content.types';
import { LayoutDemoComponent } from './demo/layout-demo.component';
import { PositionDemoComponent } from './demo/position-demo.component';
import { TransitionDemoComponent } from './demo/transition-demo.component';
import { TransformDemoComponent } from './demo/transform-demo.component';
import { UnitsDemoComponent } from './demo/units-demo.component';
import { ColorDemoComponent } from './demo/color-demo.component';
import { ScrollDemoComponent } from './demo/scroll-demo.component';

/** Dispatches a `:::demo{kind=...}` content block to its interactive component. */
@Component({
  selector: 'app-css-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LayoutDemoComponent,
    PositionDemoComponent,
    TransitionDemoComponent,
    TransformDemoComponent,
    UnitsDemoComponent,
    ColorDemoComponent,
    ScrollDemoComponent,
  ],
  template: `
    @switch (kind()) {
      @case ('flexbox') {
        <app-layout-demo kind="flexbox" />
      }
      @case ('grid') {
        <app-layout-demo kind="grid" />
      }
      @case ('positioning') {
        <app-position-demo />
      }
      @case ('transitions') {
        <app-transition-demo />
      }
      @case ('transforms') {
        <app-transform-demo />
      }
      @case ('units') {
        <app-units-demo />
      }
      @case ('colors') {
        <app-color-demo />
      }
      @case ('scroll') {
        <app-scroll-demo />
      }
    }
  `,
})
export class CssDemoComponent {
  readonly kind = input.required<DemoKind>();
}
