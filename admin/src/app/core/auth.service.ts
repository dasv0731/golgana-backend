import { Injectable, signal } from '@angular/core';

const KEY = 'gg-admin-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly token = signal<string | null>(typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null);

  setToken(value: string): void {
    localStorage.setItem(KEY, value);
    this.token.set(value);
  }

  clear(): void {
    localStorage.removeItem(KEY);
    this.token.set(null);
  }

  isAuthenticated(): boolean {
    return !!this.token();
  }
}
