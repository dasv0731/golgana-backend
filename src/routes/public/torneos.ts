import { Hono } from 'hono';
import { getRepos } from '../../repos/factory.js';
import { notFound, parseSlug } from '../helpers.js';
import type { Edicion, Partido, Sede } from '../../types.js';

export const publicTorneos = new Hono();

/** GET /torneos/:slug — torneo evergreen */
publicTorneos.get('/:slug', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const t = await getRepos().torneos.get(slug);
  if (!t) notFound(`Torneo no encontrado: ${slug}`);
  return c.json(t);
});

/** GET /torneos/mundial — listado de ediciones (campeones, etc.) */
publicTorneos.get('/mundial', async (c) => {
  const t = await getRepos().torneos.get('mundial');
  if (!t) notFound('Torneo mundial no encontrado');
  return c.json(t);
});

/** GET /torneos/mundial/:edicion — la edición */
publicTorneos.get('/mundial/:edicion', async (c) => {
  const edicion = parseSlug(c.req.param('edicion'));
  const e = await getRepos().ediciones.get(edicion);
  if (!e) notFound(`Edición no encontrada: ${edicion}`);
  return c.json(e);
});

/** GET /torneos/mundial/:edicion/grupos — los 12 grupos */
publicTorneos.get('/mundial/:edicion/grupos', async (c) => {
  const edicion = parseSlug(c.req.param('edicion'));
  const grupos = await getRepos().grupos.list(edicion);
  return c.json(grupos);
});

/** GET /torneos/mundial/:edicion/grupos/:slug */
publicTorneos.get('/mundial/:edicion/grupos/:slug', async (c) => {
  const edicion = parseSlug(c.req.param('edicion'));
  const slug = parseSlug(c.req.param('slug'));
  const g = await getRepos().grupos.get(edicion, slug);
  if (!g) notFound(`Grupo no encontrado: ${slug}`);
  return c.json(g);
});

/** GET /torneos/mundial/:edicion/calendario — todos los partidos de esa edición */
publicTorneos.get('/mundial/:edicion/calendario', async (c) => {
  const edicion = parseSlug(c.req.param('edicion'));
  const partidos = await getRepos().partidos.list();
  const filtrados = partidos.filter((p: Partido) => p.edicion?.slug === edicion);
  filtrados.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return c.json(filtrados);
});

/** GET /torneos/mundial/:edicion/sedes */
publicTorneos.get('/mundial/:edicion/sedes', async (c) => {
  const edicion = parseSlug(c.req.param('edicion'));
  const e = await getRepos().ediciones.get(edicion);
  if (!e) notFound(`Edición no encontrada: ${edicion}`);
  return c.json((e as Edicion).sedes ?? [] as Sede[]);
});

/** GET /torneos/mundial/:edicion/goleadores — derivado de goleadores en partidos finalizados */
publicTorneos.get('/mundial/:edicion/goleadores', async (c) => {
  const edicion = parseSlug(c.req.param('edicion'));
  const partidos = await getRepos().partidos.list();
  type Row = { jugador: { slug: string; nombre: string }; equipo: { slug: string; nombre: string }; goles: number; partidos: number };
  const tabla = new Map<string, Row>();
  const partidosSet = new Set<string>();
  for (const p of partidos as Partido[]) {
    if (p.edicion?.slug !== edicion) continue;
    if (p.estado !== 'finished' || !p.goleadores?.length) continue;
    for (const g of p.goleadores) {
      if (g.tipo === 'autogol') continue;
      const key = g.jugador.slug;
      if (!tabla.has(key)) {
        tabla.set(key, { jugador: { slug: g.jugador.slug, nombre: g.jugador.nombre }, equipo: { slug: g.equipo.slug, nombre: g.equipo.nombre }, goles: 0, partidos: 0 });
      }
      const r = tabla.get(key)!;
      r.goles += 1;
      const pidKey = `${key}:${p.slug}`;
      if (!partidosSet.has(pidKey)) {
        r.partidos += 1;
        partidosSet.add(pidKey);
      }
    }
  }
  return c.json(Array.from(tabla.values()).sort((a, b) => b.goles - a.goles || a.partidos - b.partidos));
});
