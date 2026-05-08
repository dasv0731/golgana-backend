import { Injectable, signal } from '@angular/core';
import {
  CognitoUserPool, CognitoUser, AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { environment } from '../../environments/environment';

const KEY = 'gg-admin-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly token = signal<string | null>(typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null);

  private pool: CognitoUserPool | null = environment.cognito ? new CognitoUserPool({
    UserPoolId: environment.cognito.userPoolId,
    ClientId: environment.cognito.clientId,
  }) : null;

  /** True si la app debe usar Cognito (producción). False en dev local con bearer estático. */
  get usesCognito(): boolean { return !!this.pool; }

  /** Set token directamente (modo dev: el usuario pega el ADMIN_API_KEY). */
  setToken(value: string): void {
    localStorage.setItem(KEY, value);
    this.token.set(value);
  }

  /** Login Cognito (modo prod). Devuelve true si OK; mensaje si falla. */
  loginCognito(username: string, password: string): Promise<{ ok: true } | { ok: false; reason: string; newPasswordRequired?: boolean; cognitoUser?: CognitoUser }> {
    return new Promise((resolve) => {
      if (!this.pool) return resolve({ ok: false, reason: 'Cognito no configurado' });
      const user = new CognitoUser({ Username: username, Pool: this.pool });
      const auth = new AuthenticationDetails({ Username: username, Password: password });
      user.authenticateUser(auth, {
        onSuccess: (session: CognitoUserSession) => {
          const idToken = session.getIdToken().getJwtToken();
          this.setToken(idToken);
          resolve({ ok: true });
        },
        onFailure: (err) => {
          resolve({ ok: false, reason: err?.message ?? 'Login falló' });
        },
        newPasswordRequired: () => {
          resolve({ ok: false, reason: 'Tu contraseña temporal expiró. Cambia la contraseña.', newPasswordRequired: true, cognitoUser: user });
        },
      });
    });
  }

  /** Completar challenge NEW_PASSWORD_REQUIRED (cuando admin se crea con `--temporary-password`). */
  completeNewPassword(user: CognitoUser, newPassword: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    return new Promise((resolve) => {
      user.completeNewPasswordChallenge(newPassword, {}, {
        onSuccess: (session: CognitoUserSession) => {
          this.setToken(session.getIdToken().getJwtToken());
          resolve({ ok: true });
        },
        onFailure: (err) => resolve({ ok: false, reason: err?.message ?? 'No se pudo cambiar la contraseña' }),
      });
    });
  }

  clear(): void {
    localStorage.removeItem(KEY);
    this.token.set(null);
    if (this.pool) {
      const current = this.pool.getCurrentUser();
      if (current) current.signOut();
    }
  }

  isAuthenticated(): boolean {
    return !!this.token();
  }
}
