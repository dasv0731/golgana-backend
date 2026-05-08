import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { JsonEditorComponent } from '../../shared/json-editor.component';
import { PageHeadComponent } from '../../shared/page-head.component';

@Component({
  selector: 'app-edicion-mundial',
  standalone: true,
  imports: [CommonModule, FormsModule, JsonEditorComponent, PageHeadComponent],
  template: `
    <app-page-head kicker="Mundial 2026" title="Edición + sedes"
      lead="Datos generales de la edición: fechas, formato, fases, 16 sedes, FAQ y SEO. Las sedes viven adentro del JSON.">
    </app-page-head>

    <div class="card">
      <label>Slug edición</label>
      <input class="input" [(ngModel)]="edicionSlug" (change)="load()" placeholder="2026" />
      <p class="hint">Permite editar otras ediciones (2030, …) cambiando este slug.</p>

      <app-json-editor
        label="JSON Edición (incluye sedes)"
        [value]="formData()"
        (valueChange)="formData.set($event)"
        (validityChange)="formValid.set($event)"
        [rows]="32" />

      <div class="flash flash--ok" *ngIf="okMsg()">{{ okMsg() }}</div>
      <div class="flash flash--err" *ngIf="errMsg()">{{ errMsg() }}</div>

      <div class="actions">
        <button class="btn" [disabled]="!formValid() || saving()" (click)="save()">
          {{ saving() ? 'Guardando…' : 'Guardar edición' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .actions { display: flex; gap: 8px; margin-top: 14px; }
    .hint { font-size: 11px; color: var(--text-muted); margin: 4px 0 12px; }
  `],
})
export class EdicionMundialComponent implements OnInit {
  private api = inject(ApiService);

  edicionSlug = '2026';
  formData = signal<unknown>(null);
  formValid = signal(true);
  saving = signal(false);
  okMsg = signal('');
  errMsg = signal('');

  ngOnInit(): void { this.load(); }

  load(): void {
    this.okMsg.set(''); this.errMsg.set('');
    this.api.getEdicion<unknown>(this.edicionSlug).pipe(catchError(() => of(null))).subscribe((e) => {
      if (e) this.formData.set(e);
      else this.formData.set({
        slug: this.edicionSlug,
        torneo: { type: 'torneo', slug: 'mundial', nombre: 'Mundial' },
        ano: parseInt(this.edicionSlug, 10) || new Date().getFullYear(),
        fechaInicio: '', fechaFin: '', estado: 'upcoming',
        participantes: [], formato: { tipoFase: 'grupos', descripcion: '' },
        fases: [], sedes: [],
        seo: { title: '', description: '' }, faq: [],
      });
    });
  }

  save(): void {
    this.saving.set(true); this.okMsg.set(''); this.errMsg.set('');
    this.api.updateEdicion(this.edicionSlug, this.formData()).subscribe({
      next: () => { this.okMsg.set('Edición guardada.'); this.saving.set(false); },
      error: (e) => { this.errMsg.set(e?.error?.error ?? `HTTP ${e?.status}`); this.saving.set(false); },
    });
  }
}
