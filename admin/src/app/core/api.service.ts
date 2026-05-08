import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type EntityName =
  | 'selecciones' | 'jugadores' | 'partidos' | 'temas' | 'noticias';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ----- Public reads (sin auth) -----
  list<T>(entity: EntityName): Observable<T[]> {
    return this.http.get<T[]>(`${this.base}/${entity}`);
  }
  get<T>(entity: EntityName, slug: string): Observable<T> {
    return this.http.get<T>(`${this.base}/${entity}/${slug}`);
  }
  // Nested: /selecciones/:slug/plantilla y subrecursos
  getPlantilla<T>(slug: string): Observable<T> {
    return this.http.get<T>(`${this.base}/selecciones/${slug}/plantilla`);
  }

  // Mundial helpers
  getEdicion<T>(edicion: string): Observable<T> {
    return this.http.get<T>(`${this.base}/torneos/mundial/${edicion}`);
  }
  listGrupos<T>(edicion: string): Observable<T[]> {
    return this.http.get<T[]>(`${this.base}/torneos/mundial/${edicion}/grupos`);
  }
  getGrupo<T>(edicion: string, slug: string): Observable<T> {
    return this.http.get<T>(`${this.base}/torneos/mundial/${edicion}/grupos/${slug}`);
  }

  // ----- Admin writes (Bearer agregado por interceptor) -----
  create<T>(entity: EntityName, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}/admin/${entity}`, body);
  }
  update<T>(entity: EntityName, slug: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}/admin/${entity}/${slug}`, body);
  }
  remove(entity: EntityName, slug: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/${entity}/${slug}`);
  }

  // Plantilla
  updatePlantilla<T>(slug: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}/admin/selecciones/${slug}/plantilla`, body);
  }
  deletePlantilla(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/selecciones/${slug}/plantilla`);
  }

  // Edición Mundial
  updateEdicion<T>(edicion: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}/admin/torneos/mundial/${edicion}`, body);
  }

  // Grupos
  updateGrupo<T>(edicion: string, slug: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}/admin/torneos/mundial/${edicion}/grupos/${slug}`, body);
  }
  deleteGrupo(edicion: string, slug: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/torneos/mundial/${edicion}/grupos/${slug}`);
  }

  // Healthz (para dashboard)
  health(): Observable<{ ok: boolean; version: string }> {
    return this.http.get<{ ok: boolean; version: string }>(`${this.base}/healthz`);
  }
}
