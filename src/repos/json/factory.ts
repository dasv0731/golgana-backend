import type {
  Equipo, Plantilla, Jugador, Partido, Edicion, Grupo, Torneo, Articulo,
} from '../../types.js';
import type { Repos, IRepo, IPlantillaRepo, ISubresourceRepo, IGrupoRepo } from '../interfaces.js';
import { JsonStore } from './base.js';

const ALLOWED_SUB_KEYS = ['historia', 'idolos', 'titulos', 'partidos', 'clasicos', 'estadio'];

function makeEntityRepo<T>(store: JsonStore, dir: string): IRepo<T> {
  return {
    async list() {
      const slugs = await store.listJsonSlugs(dir);
      const out: T[] = [];
      for (const s of slugs) {
        const item = await store.readJson<T>(`${dir}/${s}`);
        if (item) out.push(item);
      }
      return out;
    },
    async get(slug) {
      return store.readJson<T>(`${dir}/${slug}`);
    },
    async upsert(slug, data) {
      await store.writeJson(`${dir}/${slug}`, data);
      return data;
    },
    async delete(slug) {
      return store.deleteJson(`${dir}/${slug}`);
    },
  };
}

function makePlantillaRepo(store: JsonStore): IPlantillaRepo {
  return {
    async get(equipoSlug) {
      return store.readJson<Plantilla>(`selecciones/${equipoSlug}/plantilla`);
    },
    async upsert(equipoSlug, data) {
      await store.writeJson(`selecciones/${equipoSlug}/plantilla`, data);
      return data;
    },
    async delete(equipoSlug) {
      return store.deleteJson(`selecciones/${equipoSlug}/plantilla`);
    },
  };
}

function makeSubresourceRepo(store: JsonStore): ISubresourceRepo {
  return {
    async get(equipoSlug, key) {
      if (!ALLOWED_SUB_KEYS.includes(key)) throw new Error(`Invalid sub-resource: ${key}`);
      return store.readJson(`selecciones/${equipoSlug}/${key}`);
    },
    async upsert(equipoSlug, key, data) {
      if (!ALLOWED_SUB_KEYS.includes(key)) throw new Error(`Invalid sub-resource: ${key}`);
      await store.writeJson(`selecciones/${equipoSlug}/${key}`, data);
      return data;
    },
  };
}

function makeGrupoRepo(store: JsonStore): IGrupoRepo {
  return {
    async list(edicionSlug) {
      const slugs = await store.listJsonSlugs(`torneos/mundial/${edicionSlug}/grupos`);
      const out: Grupo[] = [];
      for (const s of slugs) {
        const g = await store.readJson<Grupo>(`torneos/mundial/${edicionSlug}/grupos/${s}`);
        if (g) out.push(g);
      }
      return out.sort((a, b) => a.letra.localeCompare(b.letra));
    },
    async get(edicionSlug, grupoSlug) {
      return store.readJson<Grupo>(`torneos/mundial/${edicionSlug}/grupos/${grupoSlug}`);
    },
    async upsert(edicionSlug, grupoSlug, data) {
      await store.writeJson(`torneos/mundial/${edicionSlug}/grupos/${grupoSlug}`, data);
      return data;
    },
    async delete(edicionSlug, grupoSlug) {
      return store.deleteJson(`torneos/mundial/${edicionSlug}/grupos/${grupoSlug}`);
    },
  };
}

/**
 * Las ediciones del Mundial viven en `torneos/mundial/<slug>.json` (no en `ediciones/<slug>.json`).
 * Repo dedicado que respeta esa convención.
 */
function makeEdicionRepo(store: JsonStore): IRepo<Edicion> {
  const dir = 'torneos/mundial';
  return {
    async list() {
      const slugs = await store.listJsonSlugs(dir);
      const out: Edicion[] = [];
      for (const s of slugs) {
        const e = await store.readJson<Edicion>(`${dir}/${s}`);
        if (e) out.push(e);
      }
      return out;
    },
    async get(slug) { return store.readJson<Edicion>(`${dir}/${slug}`); },
    async upsert(slug, data) { await store.writeJson(`${dir}/${slug}`, data); return data; },
    async delete(slug) { return store.deleteJson(`${dir}/${slug}`); },
  };
}

export function buildJsonRepos(dataDir: string): Repos {
  const store = new JsonStore(dataDir);
  return {
    equipos:   makeEntityRepo<Equipo>(store, 'selecciones'),
    jugadores: makeEntityRepo<Jugador>(store, 'jugadores'),
    partidos:  makeEntityRepo<Partido>(store, 'partidos'),
    ediciones: makeEdicionRepo(store),
    torneos:   makeEntityRepo<Torneo>(store, 'torneos'),
    noticias:  makeEntityRepo<Articulo>(store, 'noticias'),
    temas:     makeEntityRepo<unknown>(store, 'temas'),
    plantillas:    makePlantillaRepo(store),
    subSelecciones: makeSubresourceRepo(store),
    grupos:    makeGrupoRepo(store),
  };
}
