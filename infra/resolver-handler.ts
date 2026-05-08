/**
 * AppSync Lambda resolver · router único.
 *
 * AppSync invoca esta Lambda por cada query/mutation, pasando:
 *   { fieldName, parentTypeName, arguments, identity, ... }
 *
 * Despachamos por (parentTypeName, fieldName) → método del repo.
 *
 * Reuso del backend existente: la fuente de verdad sigue siendo `repos/factory.ts`
 * con `STORAGE_DRIVER=dynamo`. Cero lógica duplicada.
 */
import { getRepos } from '../src/repos/factory.js';
import type { Equipo, Jugador, Partido, Edicion, Torneo, Articulo, Grupo, Plantilla } from '../src/types.js';

interface AppSyncEvent {
  fieldName: string;
  parentTypeName: 'Query' | 'Mutation';
  arguments: Record<string, unknown>;
  identity?: { sub?: string; username?: string; claims?: Record<string, unknown> } | null;
}

const wrapEntity = <T extends { slug: string }>(item: T | null) =>
  item == null ? null : { slug: item.slug, data: item };

const wrapEntityList = <T extends { slug: string }>(items: T[]) =>
  items.map((item) => ({ slug: item.slug, data: item }));

type Handler = (args: Record<string, unknown>) => Promise<unknown>;

function buildHandlers(): Record<string, Handler> {
  const r = getRepos();

  return {
    // ============ Queries ============
    'Query.healthz': async () => ({ ok: true, version: '0.1.0' }),

    'Query.selecciones': async () => wrapEntityList(await r.equipos.list()),
    'Query.seleccion':   async ({ slug }) => wrapEntity(await r.equipos.get(slug as string)),
    'Query.plantilla':   async ({ equipoSlug }) => {
      const data = await r.plantillas.get(equipoSlug as string);
      return data == null ? null : { equipoSlug, data };
    },
    'Query.subSeleccion': async ({ equipoSlug, sub }) => {
      const data = await r.subSelecciones.get(equipoSlug as string, sub as string);
      return data == null ? null : { equipoSlug, sub, data };
    },

    'Query.jugadores': async () => wrapEntityList(await r.jugadores.list()),
    'Query.jugador':   async ({ slug }) => wrapEntity(await r.jugadores.get(slug as string)),

    'Query.partidos': async () => wrapEntityList(await r.partidos.list()),
    'Query.partido':  async ({ slug }) => wrapEntity(await r.partidos.get(slug as string)),
    'Query.calendarioByEdicion': async ({ edicionSlug }) => {
      const all = await r.partidos.list();
      return all
        .filter((p: Partido) => p.edicion?.slug === edicionSlug)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((p) => ({ slug: p.slug, data: p }));
    },
    'Query.goleadoresByEdicion': async ({ edicionSlug }) => {
      const all = await r.partidos.list();
      type Row = { jugador: { slug: string; nombre: string }; equipo: { slug: string; nombre: string }; goles: number; partidos: number };
      const tabla = new Map<string, Row>();
      const partidosSet = new Set<string>();
      for (const p of all as Partido[]) {
        if (p.edicion?.slug !== edicionSlug || p.estado !== 'finished' || !p.goleadores?.length) continue;
        for (const g of p.goleadores) {
          if (g.tipo === 'autogol') continue;
          const key = g.jugador.slug;
          if (!tabla.has(key)) {
            tabla.set(key, { jugador: { slug: g.jugador.slug, nombre: g.jugador.nombre }, equipo: { slug: g.equipo.slug, nombre: g.equipo.nombre }, goles: 0, partidos: 0 });
          }
          const row = tabla.get(key)!;
          row.goles += 1;
          const pidKey = `${key}:${p.slug}`;
          if (!partidosSet.has(pidKey)) { row.partidos += 1; partidosSet.add(pidKey); }
        }
      }
      return Array.from(tabla.values()).sort((a, b) => b.goles - a.goles || a.partidos - b.partidos);
    },

    'Query.torneo':  async ({ slug }) => wrapEntity(await r.torneos.get(slug as string)),
    'Query.edicion': async ({ slug }) => wrapEntity(await r.ediciones.get(slug as string)),
    'Query.grupos':  async ({ edicionSlug }) => {
      const list = await r.grupos.list(edicionSlug as string);
      return list.map((g: Grupo) => ({ edicionSlug, slug: g.slug, data: g }));
    },
    'Query.grupo': async ({ edicionSlug, slug }) => {
      const g = await r.grupos.get(edicionSlug as string, slug as string);
      return g == null ? null : { edicionSlug, slug, data: g };
    },
    'Query.sedesByEdicion': async ({ edicionSlug }) => {
      const e = await r.ediciones.get(edicionSlug as string);
      return (e as Edicion)?.sedes ?? [];
    },

    'Query.temas':    async () => wrapEntityList(await r.temas.list() as Array<{ slug: string }>),
    'Query.tema':     async ({ slug }) => wrapEntity(await r.temas.get(slug as string) as { slug: string } | null),
    'Query.noticias': async () => {
      const list = await r.noticias.list();
      return wrapEntityList(list.sort((a, b) => (b.fechaPublicacion ?? '').localeCompare(a.fechaPublicacion ?? '')));
    },
    'Query.noticia':  async ({ slug }) => wrapEntity(await r.noticias.get(slug as string)),

    // ============ Mutations ============
    'Mutation.upsertSeleccion': async ({ slug, data }) => {
      const saved = await r.equipos.upsert(slug as string, { ...(data as Equipo), slug: slug as string });
      return { slug, data: saved };
    },
    'Mutation.deleteSeleccion': async ({ slug }) => r.equipos.delete(slug as string),
    'Mutation.upsertPlantilla': async ({ equipoSlug, data }) => {
      const saved = await r.plantillas.upsert(equipoSlug as string, data as Plantilla);
      return { equipoSlug, data: saved };
    },
    'Mutation.deletePlantilla': async ({ equipoSlug }) => r.plantillas.delete(equipoSlug as string),
    'Mutation.upsertSubSeleccion': async ({ equipoSlug, sub, data }) => {
      const saved = await r.subSelecciones.upsert(equipoSlug as string, sub as string, data);
      return { equipoSlug, sub, data: saved };
    },

    'Mutation.upsertJugador': async ({ slug, data }) => {
      const saved = await r.jugadores.upsert(slug as string, { ...(data as Jugador), slug: slug as string });
      return { slug, data: saved };
    },
    'Mutation.deleteJugador': async ({ slug }) => r.jugadores.delete(slug as string),

    'Mutation.upsertPartido': async ({ slug, data }) => {
      const saved = await r.partidos.upsert(slug as string, { ...(data as Partido), slug: slug as string });
      return { slug, data: saved };
    },
    'Mutation.deletePartido': async ({ slug }) => r.partidos.delete(slug as string),

    'Mutation.upsertTorneo':  async ({ slug, data }) => {
      const saved = await r.torneos.upsert(slug as string, { ...(data as Torneo), slug: slug as string });
      return { slug, data: saved };
    },
    'Mutation.upsertEdicion': async ({ slug, data }) => {
      const saved = await r.ediciones.upsert(slug as string, { ...(data as Edicion), slug: slug as string });
      return { slug, data: saved };
    },
    'Mutation.deleteEdicion': async ({ slug }) => r.ediciones.delete(slug as string),
    'Mutation.upsertGrupo':   async ({ edicionSlug, slug, data }) => {
      const saved = await r.grupos.upsert(edicionSlug as string, slug as string, { ...(data as Grupo), slug: slug as string });
      return { edicionSlug, slug, data: saved };
    },
    'Mutation.deleteGrupo':   async ({ edicionSlug, slug }) => r.grupos.delete(edicionSlug as string, slug as string),

    'Mutation.upsertTema':    async ({ slug, data }) => {
      const saved = await r.temas.upsert(slug as string, data as { slug: string });
      return { slug, data: saved };
    },
    'Mutation.deleteTema':    async ({ slug }) => r.temas.delete(slug as string),

    'Mutation.upsertNoticia': async ({ slug, data }) => {
      const saved = await r.noticias.upsert(slug as string, { ...(data as Articulo), slug: slug as string });
      return { slug, data: saved };
    },
    'Mutation.deleteNoticia': async ({ slug }) => r.noticias.delete(slug as string),
  };
}

let cachedHandlers: Record<string, Handler> | null = null;
function handlers(): Record<string, Handler> {
  if (!cachedHandlers) cachedHandlers = buildHandlers();
  return cachedHandlers;
}

export const handler = async (event: AppSyncEvent): Promise<unknown> => {
  const key = `${event.parentTypeName}.${event.fieldName}`;
  const fn = handlers()[key];
  if (!fn) throw new Error(`Unknown resolver: ${key}`);
  try {
    return await fn(event.arguments ?? {});
  } catch (err) {
    // AppSync mostrará el error como `errorMessage`
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`[${key}] ${msg}`);
  }
};
