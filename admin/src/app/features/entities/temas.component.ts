import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { JsonEditorComponent } from '../../shared/json-editor.component';
import { PageHeadComponent } from '../../shared/page-head.component';
import { CrudListComponent, Column } from '../../shared/crud-list.component';

interface Tema { slug: string; nombre: string; descripcion?: string; }

const TEMPLATE = {
  slug: '', nombre: '', descripcion: '',
  articulos: [], entidadesRelacionadas: [],
  seo: { title: '', description: '' },
};

@Component({
  selector: 'app-temas',
  standalone: true,
  imports: [CommonModule, FormsModule, JsonEditorComponent, PageHeadComponent, CrudListComponent],
  template: `
    <app-page-head kicker="Editorial" title="Temas / Clusters">
      <button class="btn" (click)="newOne()">+ Nuevo tema</button>
    </app-page-head>

    <div class="layout" [class.layout--editing]="editing()">
      <div class="card">
        <input class="input" placeholder="Filtrar…" [(ngModel)]="filter" />
        <app-crud-list [rows]="filtered()" [columns]="columns" (select)="edit($event)" />
      </div>

      <aside class="card editor" *ngIf="editing()">
        <div class="editor__head">
          <strong>{{ isNew() ? 'Nuevo' : 'Editando' }}: {{ formData()?.slug }}</strong>
          <button class="btn btn--ghost" (click)="cancel()">Cerrar</button>
        </div>
        <app-json-editor
          label="JSON Tema"
          [value]="formData()"
          (valueChange)="formData.set($event)"
          (validityChange)="formValid.set($event)" />
        <div class="flash flash--ok" *ngIf="okMsg()">{{ okMsg() }}</div>
        <div class="flash flash--err" *ngIf="errMsg()">{{ errMsg() }}</div>
        <div class="actions">
          <button class="btn" [disabled]="!formValid() || saving()" (click)="save()">
            {{ saving() ? 'Guardando…' : (isNew() ? 'Crear' : 'Guardar') }}
          </button>
          <button class="btn btn--danger" *ngIf="!isNew()" (click)="remove()">Eliminar</button>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    .layout { display: grid; grid-template-columns: 1fr; gap: 16px; }
    .layout--editing { grid-template-columns: 1.4fr 1fr; }
    .editor { position: sticky; top: 20px; height: fit-content; max-height: calc(100vh - 40px); overflow: auto; }
    .editor__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .actions { display: flex; gap: 8px; margin-top: 14px; }
  `],
})
export class TemasComponent implements OnInit {
  private api = inject(ApiService);

  rows = signal<Tema[]>([]);
  filter = '';
  formData = signal<Tema | null>(null);
  formValid = signal(true);
  isNew = signal(false);
  saving = signal(false);
  okMsg = signal('');
  errMsg = signal('');

  columns: Column<Tema>[] = [
    { label: 'Slug', key: 'slug', width: '220px' },
    { label: 'Nombre', key: 'nombre' },
    { label: 'Descripción', key: (r) => (r.descripcion ?? '').slice(0, 100) },
  ];

  filtered(): Tema[] {
    const f = this.filter.trim().toLowerCase();
    if (!f) return this.rows();
    return this.rows().filter((r) => r.slug.includes(f) || r.nombre.toLowerCase().includes(f));
  }

  editing(): boolean { return this.formData() != null; }
  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    this.api.list<Tema>('temas').pipe(catchError(() => of([]))).subscribe((r) => {
      this.rows.set(r.sort((a, b) => a.slug.localeCompare(b.slug)));
    });
  }

  newOne(): void { this.isNew.set(true); this.formData.set({ ...TEMPLATE } as unknown as Tema); this.clearMsgs(); }
  edit(row: Tema): void { this.isNew.set(false); this.formData.set({ ...row }); this.clearMsgs(); }
  cancel(): void { this.formData.set(null); this.clearMsgs(); }
  clearMsgs(): void { this.okMsg.set(''); this.errMsg.set(''); }

  save(): void {
    const data = this.formData();
    if (!data) return;
    this.saving.set(true); this.clearMsgs();
    const op = this.isNew()
      ? this.api.create<Tema>('temas', data)
      : this.api.update<Tema>('temas', data.slug, data);
    op.subscribe({
      next: () => { this.okMsg.set('Guardado.'); this.saving.set(false); this.refresh(); this.isNew.set(false); },
      error: (e) => { this.errMsg.set(e?.error?.error ?? `HTTP ${e?.status}`); this.saving.set(false); },
    });
  }

  remove(): void {
    const data = this.formData();
    if (!data?.slug) return;
    if (!confirm(`Eliminar tema "${data.slug}"?`)) return;
    this.api.remove('temas', data.slug).subscribe({
      next: () => { this.okMsg.set('Eliminado.'); this.refresh(); this.cancel(); },
      error: (e) => this.errMsg.set(e?.error?.error ?? `HTTP ${e?.status}`),
    });
  }
}
