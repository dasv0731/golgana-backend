import type {
  Equipo, Plantilla, Jugador, Partido, Edicion, Grupo, Torneo, Articulo,
} from '../types.js';

/**
 * Generic CRUD repository over identified entities (`slug` is the id).
 * `list()` returns full objects; for performance-sensitive cases each
 * concrete repo can override with a lighter shape if needed.
 */
export interface IRepo<T> {
  list(): Promise<T[]>;
  get(slug: string): Promise<T | null>;
  upsert(slug: string, data: T): Promise<T>;
  delete(slug: string): Promise<boolean>;
}

/** Plantilla vive bajo el namespace del equipo (1 plantilla por equipo+edición). */
export interface IPlantillaRepo {
  get(equipoSlug: string): Promise<Plantilla | null>;
  upsert(equipoSlug: string, data: Plantilla): Promise<Plantilla>;
  delete(equipoSlug: string): Promise<boolean>;
}

/** Sub-recursos editoriales por selección (historia, idolos, titulos, partidos, clasicos, estadio). */
export interface ISubresourceRepo {
  get(equipoSlug: string, key: string): Promise<unknown | null>;
  upsert(equipoSlug: string, key: string, data: unknown): Promise<unknown>;
}

/** Grupos viven dentro de la edición (`<edicion>/grupos/<slug>`). */
export interface IGrupoRepo {
  list(edicionSlug: string): Promise<Grupo[]>;
  get(edicionSlug: string, grupoSlug: string): Promise<Grupo | null>;
  upsert(edicionSlug: string, grupoSlug: string, data: Grupo): Promise<Grupo>;
  delete(edicionSlug: string, grupoSlug: string): Promise<boolean>;
}

export interface Repos {
  equipos: IRepo<Equipo>;
  jugadores: IRepo<Jugador>;
  partidos: IRepo<Partido>;
  ediciones: IRepo<Edicion>;
  torneos: IRepo<Torneo>;
  noticias: IRepo<Articulo>;
  temas: IRepo<unknown>; // schema tema permite passthrough
  plantillas: IPlantillaRepo;
  subSelecciones: ISubresourceRepo;
  grupos: IGrupoRepo;
}
