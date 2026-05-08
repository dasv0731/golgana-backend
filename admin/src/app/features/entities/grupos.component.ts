import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { JsonEditorComponent } from '../../shared/json-editor.component';
import { PageHeadComponent } from '../../shared/page-head.component';
import { CrudListComponent, Column } from '../../shared/crud-list.component';

interface Grupo {
  slug: string; letra: string;
  selecciones?: Array<{ nombre: string }>;
  edicion?: { slug: string };
}

@Component({
  selector: 'app-grupos',
  standalone: true,
  imports: [CommonModule, FormsModule, JsonEditorComponent, PageHeadComponent, CrudListComponent],
  template: `
    <app-page-head kicker="Mundial 2026" title="Grupos"
      lead="Las 12 llaves del Mundial. La tabla se actualiza después de cada partido finalizado.">
      <input class="input ed-input" [(ngModel)]="edicionSlug" (change)="refresh()" placeholder="Edición · 2026" />
    </app-page-head>

    <div class="layout" [class.layout--editing]="editing()">
      <div class="card">
        <app-crud-list [rows]="rows()" [columns]="columns" (select)="edit($event)" />
      </div>

      <aside class="card editor" *ngIf="editing()">
        <div class="editor__head">
          <strong>Editando: Grupo {{ formData()?.letra }}</strong>
          <button class="btn btn--ghost" (click)="cancel()">Cerrar</button>
        </div>
        <app-json-editor
          label="JSON Grupo"
          [value]="formData()"
          (valueChange)="formData.set($event)"
          (validityChange)="formValid.set($event)"
          [rows]="22" />
        <div class="flash flash--ok" *ngIf="okMsg()">{{ okMsg() }}</div>
        <div class="flash flash--err" *ngIf="errMsg()">{{ errMsg() }}</div>
        <div class="actions">
          <button class="btn" [disabled]="!formValid() || saving()" (click)="save()">
            {{ saving() ? 'Guardando…' : 'Guardar' }}
          </button>
          <button class="btn btn--danger" (click)="remove()">Eliminar</button>
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
    .ed-input { max-width: 160px; }
  `],
})
export class GruposComponent implements OnInit {
  private api = inject(ApiService);

  edicionSlug = '2026';
  rows = signal<Grupo[]>([]);
  formData = signal<Grupo | null>(null);
  formValid = signal(true);
  saving = signal(false);
  okMsg = signal('');
  errMsg = signal('');

  columns: Column<Grupo>[] = [
    { label: 'Letra', key: 'letra', width: '70px' },
    { label: 'Slug', key: 'slug', width: '110px' },
    { label: 'Selecciones', key: (r) => (r.selecciones ?? []).map((s) => s.nombre).join(' · ') },
  ];

  editing(): boolean { return this.formData() != null; }
  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    this.api.listGrupos<Grupo>(this.edicionSlug).pipe(catchError(() => of([]))).subscribe((r) => {
      this.rows.set(r);
    });
  }

  edit(g: Grupo): void { this.formData.set({ ...g }); this.clearMsgs(); }
  cancel(): void { this.formData.set(null); this.clearMsgs(); }
  clearMsgs(): void { this.okMsg.set(''); this.errMsg.set(''); }

  save(): void {
    const data = this.formData();
    if (!data?.slug) return;
    this.saving.set(true); this.clearMsgs();
    this.api.updateGrupo<Grupo>(this.edicionSlug, data.slug, data).subscribe({
      next: () => { this.okMsg.set('Guardado.'); this.saving.set(false); this.refresh(); },
      error: (e) => { this.errMsg.set(e?.error?.error ?? `HTTP ${e?.status}`); this.saving.set(false); },
    });
  }

  remove(): void {
    const data = this.formData();
    if (!data?.slug) return;
    if (!confirm(`Eliminar ${data.slug}?`)) return;
    this.api.deleteGrupo(this.edicionSlug, data.slug).subscribe({
      next: () => { this.okMsg.set('Eliminado.'); this.refresh(); this.cancel(); },
      error: (e) => this.errMsg.set(e?.error?.error ?? `HTTP ${e?.status}`),
    });
  }
}
