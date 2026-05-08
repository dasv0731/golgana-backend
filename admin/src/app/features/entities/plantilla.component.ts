import { Component, OnInit, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { JsonEditorComponent } from '../../shared/json-editor.component';
import { PageHeadComponent } from '../../shared/page-head.component';

@Component({
  selector: 'app-plantilla',
  standalone: true,
  imports: [CommonModule, JsonEditorComponent, PageHeadComponent],
  template: `
    <app-page-head
      [kicker]="'Selección · ' + slug"
      title="Plantilla"
      lead="Lista de convocados, cuerpo técnico, altas y bajas. Estructura completa según types/api.ts → Plantilla.">
      <button class="btn btn--ghost" (click)="back()">← Volver a selecciones</button>
    </app-page-head>

    <div class="card">
      <app-json-editor
        label="Plantilla (JSON)"
        [value]="formData()"
        (valueChange)="formData.set($event)"
        (validityChange)="formValid.set($event)"
        [rows]="32"
      />

      <div class="flash flash--ok" *ngIf="okMsg()">{{ okMsg() }}</div>
      <div class="flash flash--err" *ngIf="errMsg()">{{ errMsg() }}</div>

      <div class="actions">
        <button class="btn" [disabled]="!formValid() || saving()" (click)="save()">
          {{ saving() ? 'Guardando…' : 'Guardar plantilla' }}
        </button>
        <button class="btn btn--danger" (click)="remove()" *ngIf="exists()">Eliminar plantilla</button>
      </div>
    </div>
  `,
  styles: [`
    .actions { display: flex; gap: 8px; margin-top: 14px; }
  `],
})
export class PlantillaComponent implements OnInit {
  @Input({ required: true }) slug!: string;

  private api = inject(ApiService);
  private router = inject(Router);

  formData = signal<unknown>(null);
  formValid = signal(true);
  exists = signal(false);
  saving = signal(false);
  okMsg = signal('');
  errMsg = signal('');

  ngOnInit(): void {
    this.api.getPlantilla<unknown>(this.slug).pipe(catchError(() => of(null))).subscribe((p) => {
      if (p) {
        this.exists.set(true);
        this.formData.set(p);
      } else {
        this.exists.set(false);
        this.formData.set({
          equipo: { type: 'equipo', slug: this.slug, nombre: '' },
          jugadores: [],
          cuerpoTecnico: [],
        });
      }
    });
  }

  save(): void {
    this.saving.set(true); this.okMsg.set(''); this.errMsg.set('');
    this.api.updatePlantilla(this.slug, this.formData()).subscribe({
      next: () => { this.okMsg.set('Plantilla guardada.'); this.saving.set(false); this.exists.set(true); },
      error: (e) => { this.errMsg.set(e?.error?.error ?? `HTTP ${e?.status}`); this.saving.set(false); },
    });
  }

  remove(): void {
    if (!confirm(`Eliminar plantilla de ${this.slug}?`)) return;
    this.api.deletePlantilla(this.slug).subscribe({
      next: () => { this.okMsg.set('Eliminada.'); this.exists.set(false); },
      error: (e) => this.errMsg.set(e?.error?.error ?? `HTTP ${e?.status}`),
    });
  }

  back(): void { this.router.navigate(['/selecciones']); }
}
