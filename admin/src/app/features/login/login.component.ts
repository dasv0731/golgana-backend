import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { CognitoUser } from 'amazon-cognito-identity-js';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';

type Mode = 'cognito' | 'token' | 'newPassword';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <form class="card" (submit)="submit($event)">
        <div class="title">Golgana Admin</div>

        <ng-container *ngIf="mode === 'cognito'">
          <p class="sub">Login con tu cuenta de Cognito.</p>
          <label>Email / Usuario</label>
          <input class="input" name="username" [(ngModel)]="username" autocomplete="username" required />
          <label>Contraseña</label>
          <input class="input" name="password" [(ngModel)]="password" type="password" autocomplete="current-password" required />
        </ng-container>

        <ng-container *ngIf="mode === 'token'">
          <p class="sub">Pegue el bearer token (<code>ADMIN_API_KEY</code> del backend).</p>
          <label>Token</label>
          <input class="input" name="token" [(ngModel)]="token" type="password" autocomplete="off" required />
        </ng-container>

        <ng-container *ngIf="mode === 'newPassword'">
          <p class="sub">Tu contraseña temporal expiró. Define la nueva.</p>
          <label>Nueva contraseña</label>
          <input class="input" name="newPassword" [(ngModel)]="newPassword" type="password" autocomplete="new-password" minlength="8" required />
        </ng-container>

        <div class="flash flash--err" *ngIf="error">{{ error }}</div>
        <button class="btn" type="submit" [disabled]="loading">{{ loading ? 'Validando…' : (mode === 'newPassword' ? 'Cambiar contraseña' : 'Entrar') }}</button>

        <p class="hint">{{ usesCognito ? 'Producción: AWS Cognito User Pool.' : 'Dev local: bearer estático en localStorage.' }}</p>
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

  usesCognito = this.auth.usesCognito;
  mode: Mode = this.usesCognito ? 'cognito' : 'token';

  username = '';
  password = '';
  token = '';
  newPassword = '';

  pendingUser: CognitoUser | null = null;
  error = '';
  loading = false;

  async submit(e: Event): Promise<void> {
    e.preventDefault();
    this.error = '';
    this.loading = true;

    if (this.mode === 'cognito') {
      const r = await this.auth.loginCognito(this.username.trim(), this.password);
      this.loading = false;
      if (r.ok) {
        this.router.navigate(['/dashboard']);
      } else if (r.newPasswordRequired && r.cognitoUser) {
        this.mode = 'newPassword';
        this.pendingUser = r.cognitoUser;
      } else {
        this.error = r.reason;
      }
      return;
    }

    if (this.mode === 'newPassword' && this.pendingUser) {
      const r = await this.auth.completeNewPassword(this.pendingUser, this.newPassword);
      this.loading = false;
      if (r.ok) this.router.navigate(['/dashboard']);
      else this.error = r.reason;
      return;
    }

    // Modo token (dev local)
    if (!this.token.trim()) { this.loading = false; return; }
    this.auth.setToken(this.token.trim());
    this.api.update('jugadores', '__probe__', {}).subscribe({
      next: () => { this.router.navigate(['/dashboard']); },
      error: (err) => {
        this.loading = false;
        if (err?.status === 400) this.router.navigate(['/dashboard']);
        else if (err?.status === 401) { this.auth.clear(); this.error = 'Token inválido.'; }
        else this.error = `Error de red (${err?.status ?? '?'}).`;
      },
    });
  }
}
