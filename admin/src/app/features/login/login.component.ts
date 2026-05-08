import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <form class="card" (submit)="submit($event)">
        <div class="title">Golgana Admin</div>
        <p class="sub">Pegue el bearer token (<code>ADMIN_API_KEY</code> del backend).</p>
        <label>Token</label>
        <input class="input" name="token" [(ngModel)]="token" type="password" autocomplete="off" required />
        <div class="flash flash--err" *ngIf="error">{{ error }}</div>
        <button class="btn" type="submit" [disabled]="loading">{{ loading ? 'Validando…' : 'Entrar' }}</button>
        <p class="hint">El token se guarda en <code>localStorage</code>. En producción será reemplazado por login con Cognito.</p>
      </form>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; display: grid; place-items: center; background: linear-gradient(135deg, #000, #0a3d20); padding: 20px; }
    .card { background: #fff; border-radius: 16px; padding: 32px; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .title { font-family: 'Bebas Neue', sans-serif; font-size: 36px; letter-spacing: 0.04em; color: var(--green-dark); }
    .sub { color: var(--text-muted); font-size: 13px; margin: 6px 0 18px; }
    .hint { font-size: 11px; color: var(--text-muted); margin-top: 14px; line-height: 1.4; }
    code { background: rgba(0,0,0,0.05); padding: 1px 6px; border-radius: 3px; font-size: 11px; }
    .btn { width: 100%; padding: 12px; margin-top: 14px; font-size: 14px; }
  `],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);

  token = '';
  error = '';
  loading = false;

  submit(e: Event): void {
    e.preventDefault();
    if (!this.token.trim()) return;
    this.loading = true;
    this.error = '';
    // Set token first, then probe an admin endpoint via interceptor.
    this.auth.setToken(this.token.trim());
    // Probe: PUT a recurso bogus con body inválido — esperamos 400 (válido = autenticado) o 401 (mal token).
    this.api.update('jugadores', '__probe__', {}).subscribe({
      next: () => { this.router.navigate(['/dashboard']); },
      error: (err) => {
        this.loading = false;
        if (err?.status === 400) {
          // Auth OK, body inválido como esperábamos.
          this.router.navigate(['/dashboard']);
        } else if (err?.status === 401) {
          this.auth.clear();
          this.error = 'Token inválido.';
        } else {
          this.error = `Error de red (${err?.status ?? '?'}). ¿El backend está corriendo en :3001?`;
        }
      },
    });
  }
}
