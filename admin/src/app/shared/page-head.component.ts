import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-head',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="head">
      <div>
        <div class="kicker" *ngIf="kicker">{{ kicker }}</div>
        <h1>{{ title }}</h1>
        <p class="lead" *ngIf="lead">{{ lead }}</p>
      </div>
      <div class="actions"><ng-content /></div>
    </header>
  `,
  styles: [`
    .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid var(--divider); }
    .kicker { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--green-dark); margin-bottom: 4px; }
    h1 { margin: 0; font-family: 'Bebas Neue', sans-serif; font-size: 36px; letter-spacing: 0.04em; }
    .lead { color: var(--text-muted); margin: 6px 0 0; max-width: 60ch; }
    .actions { display: flex; gap: 8px; flex-shrink: 0; }
  `],
})
export class PageHeadComponent {
  @Input({ required: true }) title!: string;
  @Input() kicker = '';
  @Input() lead = '';
}
