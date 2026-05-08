import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getRepos } from '../../repos/factory.js';
import { parseSlug } from '../helpers.js';
import { ensureSlugMatch, parseBody } from './helpers.js';
import { EquipoSchema, PlantillaSchema } from '../../schemas/equipo.js';
import type { Equipo, Plantilla } from '../../types.js';

export const adminSelecciones = new Hono();

adminSelecciones.post('/', async (c) => {
  const body = await parseBody(c, EquipoSchema);
  if (!body) return;
  const existing = await getRepos().equipos.get(body.slug);
  if (existing) throw new HTTPException(409, { message: `Selección ya existe: ${body.slug}` });
  const saved = await getRepos().equipos.upsert(body.slug, body as unknown as Equipo);
  return c.json(saved, 201);
});

adminSelecciones.put('/:slug', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const body = await parseBody(c, EquipoSchema);
  if (!body) return;
  ensureSlugMatch(slug, body.slug);
  const saved = await getRepos().equipos.upsert(slug, { ...body, slug } as unknown as Equipo);
  return c.json(saved);
});

adminSelecciones.delete('/:slug', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const deleted = await getRepos().equipos.delete(slug);
  if (!deleted) throw new HTTPException(404, { message: `Selección no encontrada: ${slug}` });
  return c.body(null, 204);
});

// Plantilla (1 por selección)
adminSelecciones.put('/:slug/plantilla', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const body = await parseBody(c, PlantillaSchema);
  if (!body) return;
  if (body.equipo.slug !== slug) {
    throw new HTTPException(400, { message: `Plantilla.equipo.slug (${body.equipo.slug}) no coincide con :slug (${slug})` });
  }
  const saved = await getRepos().plantillas.upsert(slug, body as unknown as Plantilla);
  return c.json(saved);
});

adminSelecciones.delete('/:slug/plantilla', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const ok = await getRepos().plantillas.delete(slug);
  if (!ok) throw new HTTPException(404, { message: `Plantilla no encontrada para: ${slug}` });
  return c.body(null, 204);
});

// Sub-recursos editoriales (historia, idolos, titulos, partidos, clasicos, estadio)
const SUB_KEYS = ['historia', 'idolos', 'titulos', 'partidos', 'clasicos', 'estadio'] as const;
for (const key of SUB_KEYS) {
  adminSelecciones.put(`/:slug/${key}`, async (c) => {
    const slug = parseSlug(c.req.param('slug'));
    let body: unknown;
    try { body = await c.req.json(); } catch { throw new HTTPException(400, { message: 'Invalid JSON body' }); }
    const saved = await getRepos().subSelecciones.upsert(slug, key, body);
    return c.json(saved);
  });
}
