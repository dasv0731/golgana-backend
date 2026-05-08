import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import { ApiService } from '../../core/api.service';

interface Card { label: string; value: string; href: string; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="head">
      <h1>Dashboard</h1>
      <span class="health" [class.health--ok]="health()?.ok" [class.health--err]="!health()?.ok">
        Backend {{ health()?.ok ? 'online · v' + health()?.version : 'offline' }}
      </span>
    </div>
    <p class="lead">Resumen del contenido publicado. Click en cualquier card para gestionar.</p>

    <div class="grid">
      <a *ngFor="let c of cards()" class="card cell" [routerLink]="c.href">
        <div class="num">{{ c.value }}</div>
        <div class="lab">{{ c.label }}</div>
      </a>
    </div>

    <div class="flash flash--err" *ngIf="error()">{{ error() }}</div>
  `,
  styles: [`
    .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    h1 { margin: 0; font-family: 'Bebas Neue', sans-serif; font-size: 36px; letter-spacing: 0.04em; }
    .lead { color: var(--text-muted); margin: 6px 0 24px; }
    .health { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; padding: 6px 10px; border-radius: 999px; }
    .health--ok  { background: rgba(2,204,116,0.12); color: var(--green-dark); }
    .health--err { background: rgba(220,38,38,0.1); color: var(--danger); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
    .cell { display: block; text-decoration: none; color: var(--text); transition: transform .15s, box-shadow .15s; }
    .cell:hover { transform: translateY(-2px); box-shadow: 0 12px 32px -16px rgba(0,0,0,0.2); }
    .num { font-family: 'Bebas Neue', sans-serif; font-size: 48px; line-height: 1; color: var(--green-dark); }
    .lab { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-muted); margin-top: 6px; }
  `],
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);

  cards = signal<Card[]>([]);
  health = signal<{ ok: boolean; version: string } | null>(null);
  error = signal('');

  ngOnInit(): void {
    this.api.health().pipe(catchError(() => of(null))).subscribe((h) => this.health.set(h));

    forkJoin({
      selecciones: this.api.list<unknown>('selecciones').pipe(catchError(() => of([]))),
      jugadores:   this.api.list<unknown>('jugadores').pipe(catchError(() => of([]))),
      partidos:    this.api.list<unknown>('partidos').pipe(catchError(() => of([]))),
      temas:       this.api.list<unknown>('temas').pipe(catchError(() => of([]))),
      noticias:    this.api.list<unknown>('noticias').pipe(catchError(() => of([]))),
      grupos:      this.api.listGrupos<unknown>('2026').pipe(catchError(() => of([]))),
    }).subscribe({
      next: (r) => {
        this.cards.set([
          { label: 'Selecciones', value: String(r.selecciones.length), href: '/selecciones' },
          { label: 'Jugadores',   value: String(r.jugadores.length),   href: '/jugadores' },
          { label: 'Partidos',    value: String(r.partidos.length),    href: '/partidos' },
          { label: 'Grupos',      value: String(r.grupos.length),      href: '/grupos' },
          { label: 'Temas',       value: String(r.temas.length),       href: '/temas' },
          { label: 'Noticias',    value: String(r.noticias.length),    href: '/noticias' },
        ]);
      },
      error: (e) => this.error.set(`No se pudo cargar el resumen: ${e?.message ?? e}`),
    });
  }
}
