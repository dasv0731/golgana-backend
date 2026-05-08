import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Column<T> { label: string; key: keyof T | ((row: T) => string); width?: string; }

@Component({
  selector: 'app-crud-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <table class="table">
      <thead>
        <tr>
          <th *ngFor="let c of columns" [style.width]="c.width || 'auto'">{{ c.label }}</th>
          <th style="width:120px;text-align:right">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let row of rows" (click)="select.emit(row)" class="row">
          <td *ngFor="let c of columns">{{ render(c, row) }}</td>
          <td class="actions">
            <button class="btn btn--ghost" (click)="$event.stopPropagation(); select.emit(row)">Editar</button>
          </td>
        </tr>
        <tr *ngIf="!rows.length"><td [attr.colspan]="columns.length + 1" class="empty">Sin datos</td></tr>
      </tbody>
    </table>
  `,
  styles: [`
    .row { cursor: pointer; }
    .actions { text-align: right; }
    .empty { text-align: center; padding: 28px; color: var(--text-muted); font-style: italic; }
  `],
})
export class CrudListComponent<T> {
  @Input({ required: true }) rows: T[] = [];
  @Input({ required: true }) columns: Column<T>[] = [];
  @Output() select = new EventEmitter<T>();

  render(c: Column<T>, row: T): string {
    const v = typeof c.key === 'function' ? c.key(row) : (row as Record<string, unknown>)[c.key as string];
    if (v == null) return '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }
}
