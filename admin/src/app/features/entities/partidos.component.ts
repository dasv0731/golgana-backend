import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { JsonEditorComponent } from '../../shared/json-editor.component';
import { PageHeadComponent } from '../../shared/page-head.component';
import { CrudListComponent, Column } from '../../shared/crud-list.component';

interface Partido {
  slug: string; estado: string; fecha: string;
  local?: { nombre: string }; visitante?: { nombre: string };
  marcador?: { local: number; visitante: number };
  fase?: { nombre: string };
}

const TEMPLATE = {
  slug: '',
  edicion: { type: 'edicion', slug: '2026', nombre: 'Mundial 2026' },
  fase: { tipo: 'grupos', slug: 'grupos', nombre: 'Fase de grupos · J1' },
  local: { type: 'equipo', slug: '', nombre: '' },
  visitante: { type: 'equipo', slug: '', nombre: '' },
  fecha: '2026-06-12T19:00:00-04:00',
  zonaHoraria: 'America/New_York',
  sede: { type: 'sede', slug: '', nombre: '' },
  estado: 'scheduled',
  seo: { title: '', description: '' },
};

@Component({
  selector: 'app-partidos',
  standalone: true,
  imports: [CommonModule, FormsModule, JsonEditorComponent, PageHeadComponent, CrudListComponent],
  template: `
    <app-page-head kicker="Catálogo" title="Partidos" lead="Estado scheduled/playing/finished controla qué template renderiza el front.">
      <button class="btn" (click)="newOne()">+ Nuevo partido</button>
    </app-page-head>

    <div class="layout" [class.layout--editing]="editing()">
      <div class="card">
        <input class="input" placeholder="Filtrar…" [(ngModel)]="filter" />
        <app-crud-list [rows]="filtered()" [columns]="columns" (select)="edit($event)" />
      </div>

      <aside class="card editor" *ngIf="editing()">
        <div class="editor__head">
          <strong>{{ isNew() ? 'Nuevo' : 'Editando' }}: {{ formData()?.slug || '(sin slug)' }}</strong>
          <button class="btn btn--ghost" (click)="cancel()">Cerrar</button>
        </div>
        <app-json-editor
          label="JSON Partido"
          [value]="formData()"
          (valueChange)="formData.set($event)"
          (validityChange)="formValid.set($event)"
          [rows]="22" />
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
export class PartidosComponent implements OnInit {
  private api = inject(ApiService);

  rows = signal<Partido[]>([]);
  filter = '';
  formData = signal<Partido | null>(null);
  formValid = signal(true);
  isNew = signal(false);
  saving = signal(false);
  okMsg = signal('');
  errMsg = signal('');

  columns: Column<Partido>[] = [
    { label: 'Slug', key: 'slug', width: '260px' },
    { label: 'Local', key: (r) => r.local?.nombre ?? '—' },
    { label: 'Marcador', key: (r) => r.marcador ? `${r.marcador.local} - ${r.marcador.visitante}` : '—', width: '90px' },
    { label: 'Visita', key: (r) => r.visitante?.nombre ?? '—' },
    { label: 'Estado', key: 'estado', width: '90px' },
    { label: 'Fecha', key: (r) => r.fecha?.slice(0, 10) ?? '—', width: '110px' },
  ];

  filtered(): Partido[] {
    const f = this.filter.trim().toLowerCase();
    if (!f) return this.rows();
    return this.rows().filter((r) => r.slug.includes(f));
  }

  editing(): boolean { return this.formData() != null; }
  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    this.api.list<Partido>('partidos').pipe(catchError(() => of([]))).subscribe((r) => {
      this.rows.set(r.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? '')));
    });
  }

  newOne(): void { this.isNew.set(true); this.formData.set({ ...TEMPLATE } as unknown as Partido); this.clearMsgs(); }
  edit(row: Partido): void { this.isNew.set(false); this.formData.set({ ...row }); this.clearMsgs(); }
  cancel(): void { this.formData.set(null); this.clearMsgs(); }
  clearMsgs(): void { this.okMsg.set(''); this.errMsg.set(''); }

  save(): void {
    const data = this.formData();
    if (!data) return;
    this.saving.set(true); this.clearMsgs();
    const op = this.isNew()
      ? this.api.create<Partido>('partidos', data)
      : this.api.update<Partido>('partidos', data.slug, data);
    op.subscribe({
      next: () => { this.okMsg.set('Guardado.'); this.saving.set(false); this.refresh(); this.isNew.set(false); },
      error: (e) => { this.errMsg.set(e?.error?.error ?? `HTTP ${e?.status}`); this.saving.set(false); },
    });
  }

  remove(): void {
    const data = this.formData();
    if (!data?.slug) return;
    if (!confirm(`Eliminar partido "${data.slug}"?`)) return;
    this.api.remove('partidos', data.slug).subscribe({
      next: () => { this.okMsg.set('Eliminado.'); this.refresh(); this.cancel(); },
      error: (e) => this.errMsg.set(e?.error?.error ?? `HTTP ${e?.status}`),
    });
  }
}
