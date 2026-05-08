import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { JsonEditorComponent } from '../../shared/json-editor.component';
import { PageHeadComponent } from '../../shared/page-head.component';
import { CrudListComponent, Column } from '../../shared/crud-list.component';

interface Equipo {
  slug: string; tipo: string; nombre: string; pais: string; apodo?: string; fifaRank?: number;
}

const TEMPLATE: Equipo = {
  slug: '', tipo: 'seleccion', nombre: '', nombreOficial: '', pais: '',
  escudo: { src: '', alt: '' },
  colores: { primario: '#000', secundario: '#fff' },
  dt: { nombre: '', nacionalidad: '' },
  redes: {},
  rivalidades: [],
  seo: { title: '', description: '' },
  faq: [],
} as unknown as Equipo;

@Component({
  selector: 'app-selecciones',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, JsonEditorComponent, PageHeadComponent, CrudListComponent],
  template: `
    <app-page-head kicker="Catálogo" title="Selecciones" lead="48 selecciones del Mundial 2026 + selecciones que se gestionen para campeonatos barriales.">
      <button class="btn" (click)="newOne()">+ Nueva selección</button>
    </app-page-head>

    <div class="layout" [class.layout--editing]="editing()">
      <div class="card">
        <input class="input" placeholder="Filtrar por nombre o slug…" [(ngModel)]="filter" />
        <app-crud-list
          [rows]="filtered()"
          [columns]="columns"
          (select)="edit($event)"
        />
      </div>

      <aside class="card editor" *ngIf="editing()">
        <div class="editor__head">
          <strong>{{ isNew() ? 'Nueva' : 'Editando' }}: {{ formData()?.slug || '(sin slug)' }}</strong>
          <button class="btn btn--ghost" (click)="cancel()">Cerrar</button>
        </div>

        <a *ngIf="!isNew() && formData()?.slug" class="link"
           [routerLink]="['/selecciones', formData()!.slug, 'plantilla']">→ Editar plantilla</a>

        <app-json-editor
          label="JSON completo del Equipo"
          [value]="formData()"
          (valueChange)="formData.set($event)"
          (validityChange)="formValid.set($event)"
        />

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
    .link { color: var(--green-dark); text-decoration: none; font-size: 13px; }
    .link:hover { text-decoration: underline; }
  `],
})
export class SeleccionesComponent implements OnInit {
  private api = inject(ApiService);

  rows = signal<Equipo[]>([]);
  filter = '';
  formData = signal<Equipo | null>(null);
  formValid = signal(true);
  isNew = signal(false);
  saving = signal(false);
  okMsg = signal('');
  errMsg = signal('');

  columns: Column<Equipo>[] = [
    { label: 'Slug', key: 'slug', width: '180px' },
    { label: 'Nombre', key: 'nombre' },
    { label: 'Tipo', key: 'tipo', width: '90px' },
    { label: 'País', key: 'pais', width: '90px' },
    { label: 'FIFA', key: (r) => r.fifaRank ? `#${r.fifaRank}` : '—', width: '70px' },
  ];

  filtered(): Equipo[] {
    const f = this.filter.trim().toLowerCase();
    if (!f) return this.rows();
    return this.rows().filter((r) => r.slug.includes(f) || r.nombre.toLowerCase().includes(f));
  }

  editing(): boolean { return this.formData() != null; }

  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    this.api.list<Equipo>('selecciones').pipe(catchError(() => of([]))).subscribe((r) => {
      this.rows.set(r.sort((a, b) => a.slug.localeCompare(b.slug)));
    });
  }

  newOne(): void { this.isNew.set(true); this.formData.set({ ...TEMPLATE }); this.clearMsgs(); }
  edit(row: Equipo): void { this.isNew.set(false); this.formData.set({ ...row }); this.clearMsgs(); }
  cancel(): void { this.formData.set(null); this.clearMsgs(); }
  clearMsgs(): void { this.okMsg.set(''); this.errMsg.set(''); }

  save(): void {
    const data = this.formData();
    if (!data) return;
    this.saving.set(true); this.clearMsgs();
    const op = this.isNew()
      ? this.api.create<Equipo>('selecciones', data)
      : this.api.update<Equipo>('selecciones', data.slug, data);
    op.subscribe({
      next: () => { this.okMsg.set('Guardado.'); this.saving.set(false); this.refresh(); this.isNew.set(false); },
      error: (e) => { this.errMsg.set(e?.error?.error ?? `HTTP ${e?.status}`); this.saving.set(false); },
    });
  }

  remove(): void {
    const data = this.formData();
    if (!data?.slug) return;
    if (!confirm(`Eliminar selección "${data.slug}"?`)) return;
    this.api.remove('selecciones', data.slug).subscribe({
      next: () => { this.okMsg.set('Eliminada.'); this.refresh(); this.cancel(); },
      error: (e) => this.errMsg.set(e?.error?.error ?? `HTTP ${e?.status}`),
    });
  }
}
