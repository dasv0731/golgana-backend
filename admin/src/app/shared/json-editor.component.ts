import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-json-editor',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <label>{{ label }}</label>
    <textarea
      class="textarea"
      [rows]="rows"
      [(ngModel)]="text"
      (ngModelChange)="onChange()"
      [class.invalid]="!!error"
    ></textarea>
    <div class="err" *ngIf="error">⚠ {{ error }}</div>
  `,
  styles: [`
    .textarea.invalid { border-color: var(--danger); outline-color: var(--danger); }
    .err { color: var(--danger); font-size: 12px; margin-top: 4px; }
  `],
})
export class JsonEditorComponent implements OnChanges {
  @Input() label = 'JSON';
  @Input() rows = 14;
  @Input({ required: true }) value: unknown = null;
  // Tipado abierto: cada consumidor puede atar a un signal<T | null>.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() valueChange = new EventEmitter<any>();
  @Output() validityChange = new EventEmitter<boolean>();

  text = '';
  error = '';

  ngOnChanges(): void {
    this.text = JSON.stringify(this.value ?? null, null, 2);
    this.error = '';
    this.validityChange.emit(true);
  }

  onChange(): void {
    try {
      const parsed = this.text.trim() === '' ? null : JSON.parse(this.text);
      this.error = '';
      this.valueChange.emit(parsed);
      this.validityChange.emit(true);
    } catch (e) {
      this.error = (e as Error).message;
      this.validityChange.emit(false);
    }
  }
}
