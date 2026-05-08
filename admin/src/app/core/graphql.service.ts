import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

interface GqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string; errorType?: string }>;
}

@Injectable({ providedIn: 'root' })
export class GraphqlService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  /** True si la app debe usar GraphQL (AppSync deployado). False → REST local. */
  get isGraphql(): boolean {
    return !!environment.appsyncUrl;
  }

  /** AuthZ: Cognito (admin) tiene prioridad; si no hay token, usa API key (queries públicas). */
  private headers(): Record<string, string> {
    const token = this.auth.token();
    if (token && this.auth.usesCognito) {
      return { Authorization: token, 'Content-Type': 'application/json' };
    }
    return {
      'x-api-key': environment.appsyncApiKey,
      'Content-Type': 'application/json',
    };
  }

  request<T>(query: string, variables?: Record<string, unknown>): Observable<T> {
    return this.http.post<GqlResponse<T>>(
      environment.appsyncUrl,
      { query, variables: variables ?? {} },
      { headers: this.headers() },
    ).pipe(
      map((res) => {
        if (res.errors?.length) {
          const e: Error & { gqlErrors?: typeof res.errors } = new Error(res.errors[0].message);
          e.gqlErrors = res.errors;
          throw e;
        }
        return parseAwsJsonDeep(res.data) as T;
      }),
    );
  }
}

/**
 * AppSync devuelve campos AWSJSON como strings (no parseados).
 * Recorremos la respuesta y parseamos los strings cuyo nombre de propiedad sea `data`.
 * Esto es seguro porque por convención todas las entidades del schema usan `data: AWSJSON`.
 */
function parseAwsJsonDeep(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(parseAwsJsonDeep);
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === 'data' && typeof v === 'string') {
        try { out[k] = JSON.parse(v); } catch { out[k] = v; }
      } else {
        out[k] = parseAwsJsonDeep(v);
      }
    }
    return out;
  }
  return node;
}
