import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="shell">
      <aside class="side">
        <div class="brand">
          <div class="brand__name">Golgana</div>
          <div class="brand__sub">Admin · v0.1</div>
        </div>
        <nav class="nav">
          <a routerLink="/dashboard" routerLinkActive="is-active">Dashboard</a>
          <div class="nav__group">Catálogos</div>
          <a routerLink="/selecciones" routerLinkActive="is-active">Selecciones</a>
          <a routerLink="/jugadores" routerLinkActive="is-active">Jugadores</a>
          <a routerLink="/partidos" routerLinkActive="is-active">Partidos</a>
          <div class="nav__group">Mundial 2026</div>
          <a routerLink="/edicion-mundial" routerLinkActive="is-active">Edición + sedes</a>
          <a routerLink="/grupos" routerLinkActive="is-active">Grupos</a>
          <div class="nav__group">Editorial</div>
          <a routerLink="/temas" routerLinkActive="is-active">Temas</a>
          <a routerLink="/noticias" routerLinkActive="is-active">Noticias</a>
        </nav>
        <button class="logout" (click)="logout()">Salir</button>
      </aside>
      <main class="main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .shell { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
    .side {
      background: #0a0a0a; color: #fff;
      padding: 22px 16px; display: flex; flex-direction: column; gap: 18px;
    }
    .brand__name { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 0.04em; color: var(--green); }
    .brand__sub { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.5); }
    .nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .nav a {
      color: rgba(255,255,255,0.85); text-decoration: none;
      padding: 9px 12px; border-radius: 6px; font-size: 13px; font-weight: 500;
    }
    .nav a:hover { background: rgba(255,255,255,0.06); }
    .nav a.is-active { background: var(--green); color: #fff; }
    .nav__group { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin: 14px 12px 4px; }
    .logout {
      background: transparent; color: rgba(255,255,255,0.7);
      border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;
      padding: 8px 12px; font-size: 12px; font-weight: 600;
      letter-spacing: 0.06em; text-transform: uppercase;
    }
    .logout:hover { background: rgba(255,255,255,0.06); color: #fff; }
    .main { padding: 28px 32px; max-width: 1280px; width: 100%; }
  `],
})
export class ShellComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.auth.clear();
    this.router.navigate(['/login']);
  }
}
