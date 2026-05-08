import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { GraphqlService } from './graphql.service';

export type EntityName =
  | 'selecciones' | 'jugadores' | 'partidos' | 'temas' | 'noticias';

interface Node<T> { slug: string; data: T; }
interface Plantilla<T> { equipoSlug: string; data: T; }
interface Grupo<T> { edicionSlug: string; slug: string; data: T; }

/** Mapping (entity, operation) → GraphQL field name. */
const GQL_FIELDS: Record<EntityName, { list: string; one: string; upsert: string; del: string }> = {
  selecciones: { list: 'selecciones', one: 'seleccion', upsert: 'upsertSeleccion', del: 'deleteSeleccion' },
  jugadores:   { list: 'jugadores',   one: 'jugador',   upsert: 'upsertJugador',   del: 'deleteJugador' },
  partidos:    { list: 'partidos',    one: 'partido',   upsert: 'upsertPartido',   del: 'deletePartido' },
  temas:       { list: 'temas',       one: 'tema',      upsert: 'upsertTema',      del: 'deleteTema' },
  noticias:    { list: 'noticias',    one: 'noticia',   upsert: 'upsertNoticia',   del: 'deleteNoticia' },
};

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private gql = inject(GraphqlService);
  private base = environment.apiUrl;

  // ============================================================
  // Public reads (lecturas)
  // ============================================================
  list<T>(entity: EntityName): Observable<T[]> {
    if (this.gql.isGraphql) {
      const f = GQL_FIELDS[entity].list;
      const q = `query Q { ${f} { slug data } }`;
      return this.gql.request<{ [k: string]: Node<T>[] }>(q).pipe(
        map((r) => r[f].map((n) => n.data)),
      );
    }
    return this.http.get<T[]>(`${this.base}/${entity}`);
  }

  get<T>(entity: EntityName, slug: string): Observable<T> {
    if (this.gql.isGraphql) {
      const f = GQL_FIELDS[entity].one;
      const q = `query Q($slug: ID!) { ${f}(slug: $slug) { slug data } }`;
      return this.gql.request<{ [k: string]: Node<T> | null }>(q, { slug }).pipe(
        map((r) => {
          if (!r[f]) throw new Error(`Not found: ${entity}/${slug}`);
          return r[f]!.data;
        }),
      );
    }
    return this.http.get<T>(`${this.base}/${entity}/${slug}`);
  }

  getPlantilla<T>(slug: string): Observable<T> {
    if (this.gql.isGraphql) {
      const q = `query Q($s: ID!) { plantilla(equipoSlug: $s) { equipoSlug data } }`;
      return this.gql.request<{ plantilla: Plantilla<T> | null }>(q, { s: slug }).pipe(
        map((r) => {
          if (!r.plantilla) throw new Error(`Plantilla no encontrada: ${slug}`);
          return r.plantilla.data;
        }),
      );
    }
    return this.http.get<T>(`${this.base}/selecciones/${slug}/plantilla`);
  }

  getEdicion<T>(edicion: string): Observable<T> {
    if (this.gql.isGraphql) {
      const q = `query Q($s: ID!) { edicion(slug: $s) { slug data } }`;
      return this.gql.request<{ edicion: Node<T> | null }>(q, { s: edicion }).pipe(
        map((r) => {
          if (!r.edicion) throw new Error(`Edición no encontrada: ${edicion}`);
          return r.edicion.data;
        }),
      );
    }
    return this.http.get<T>(`${this.base}/torneos/mundial/${edicion}`);
  }

  listGrupos<T>(edicion: string): Observable<T[]> {
    if (this.gql.isGraphql) {
      const q = `query Q($s: ID!) { grupos(edicionSlug: $s) { slug data } }`;
      return this.gql.request<{ grupos: Grupo<T>[] }>(q, { s: edicion }).pipe(
        map((r) => r.grupos.map((g) => g.data)),
      );
    }
    return this.http.get<T[]>(`${this.base}/torneos/mundial/${edicion}/grupos`);
  }

  getGrupo<T>(edicion: string, slug: string): Observable<T> {
    if (this.gql.isGraphql) {
      const q = `query Q($e: ID!, $s: ID!) { grupo(edicionSlug: $e, slug: $s) { slug data } }`;
      return this.gql.request<{ grupo: Grupo<T> | null }>(q, { e: edicion, s: slug }).pipe(
        map((r) => {
          if (!r.grupo) throw new Error(`Grupo no encontrado: ${slug}`);
          return r.grupo.data;
        }),
      );
    }
    return this.http.get<T>(`${this.base}/torneos/mundial/${edicion}/grupos/${slug}`);
  }

  health(): Observable<{ ok: boolean; version: string }> {
    if (this.gql.isGraphql) {
      const q = `query Q { healthz }`;
      return this.gql.request<{ healthz: { ok: boolean; version: string } }>(q).pipe(
        map((r) => r.healthz ?? { ok: false, version: '' }),
      );
    }
    return this.http.get<{ ok: boolean; version: string }>(`${this.base}/healthz`);
  }

  // ============================================================
  // Admin writes (mutations)
  // ============================================================
  create<T>(entity: EntityName, body: T & { slug: string }): Observable<T> {
    if (this.gql.isGraphql) {
      const f = GQL_FIELDS[entity].upsert;
      const m = `mutation M($s: ID!, $d: AWSJSON!) { ${f}(slug: $s, data: $d) { slug data } }`;
      return this.gql.request<{ [k: string]: Node<T> }>(m, { s: body.slug, d: JSON.stringify(body) }).pipe(
        map((r) => r[f].data),
      );
    }
    return this.http.post<T>(`${this.base}/admin/${entity}`, body);
  }

  update<T>(entity: EntityName, slug: string, body: T): Observable<T> {
    if (this.gql.isGraphql) {
      const f = GQL_FIELDS[entity].upsert;
      const m = `mutation M($s: ID!, $d: AWSJSON!) { ${f}(slug: $s, data: $d) { slug data } }`;
      return this.gql.request<{ [k: string]: Node<T> }>(m, { s: slug, d: JSON.stringify(body) }).pipe(
        map((r) => r[f].data),
      );
    }
    return this.http.put<T>(`${this.base}/admin/${entity}/${slug}`, body);
  }

  remove(entity: EntityName, slug: string): Observable<void> {
    if (this.gql.isGraphql) {
      const f = GQL_FIELDS[entity].del;
      const m = `mutation M($s: ID!) { ${f}(slug: $s) }`;
      return this.gql.request<{ [k: string]: boolean }>(m, { s: slug }).pipe(map(() => undefined));
    }
    return this.http.delete<void>(`${this.base}/admin/${entity}/${slug}`);
  }

  updatePlantilla<T>(slug: string, body: T): Observable<T> {
    if (this.gql.isGraphql) {
      const m = `mutation M($s: ID!, $d: AWSJSON!) { upsertPlantilla(equipoSlug: $s, data: $d) { equipoSlug data } }`;
      return this.gql.request<{ upsertPlantilla: Plantilla<T> }>(m, { s: slug, d: JSON.stringify(body) }).pipe(
        map((r) => r.upsertPlantilla.data),
      );
    }
    return this.http.put<T>(`${this.base}/admin/selecciones/${slug}/plantilla`, body);
  }

  deletePlantilla(slug: string): Observable<void> {
    if (this.gql.isGraphql) {
      const m = `mutation M($s: ID!) { deletePlantilla(equipoSlug: $s) }`;
      return this.gql.request<{ deletePlantilla: boolean }>(m, { s: slug }).pipe(map(() => undefined));
    }
    return this.http.delete<void>(`${this.base}/admin/selecciones/${slug}/plantilla`);
  }

  updateEdicion<T>(edicion: string, body: T): Observable<T> {
    if (this.gql.isGraphql) {
      const m = `mutation M($s: ID!, $d: AWSJSON!) { upsertEdicion(slug: $s, data: $d) { slug data } }`;
      return this.gql.request<{ upsertEdicion: Node<T> }>(m, { s: edicion, d: JSON.stringify(body) }).pipe(
        map((r) => r.upsertEdicion.data),
      );
    }
    return this.http.put<T>(`${this.base}/admin/torneos/mundial/${edicion}`, body);
  }

  updateGrupo<T>(edicion: string, slug: string, body: T): Observable<T> {
    if (this.gql.isGraphql) {
      const m = `mutation M($e: ID!, $s: ID!, $d: AWSJSON!) { upsertGrupo(edicionSlug: $e, slug: $s, data: $d) { slug data } }`;
      return this.gql.request<{ upsertGrupo: Grupo<T> }>(m, { e: edicion, s: slug, d: JSON.stringify(body) }).pipe(
        map((r) => r.upsertGrupo.data),
      );
    }
    return this.http.put<T>(`${this.base}/admin/torneos/mundial/${edicion}/grupos/${slug}`, body);
  }

  deleteGrupo(edicion: string, slug: string): Observable<void> {
    if (this.gql.isGraphql) {
      const m = `mutation M($e: ID!, $s: ID!) { deleteGrupo(edicionSlug: $e, slug: $s) }`;
      return this.gql.request<{ deleteGrupo: boolean }>(m, { e: edicion, s: slug }).pipe(map(() => undefined));
    }
    return this.http.delete<void>(`${this.base}/admin/torneos/mundial/${edicion}/grupos/${slug}`);
  }
}
