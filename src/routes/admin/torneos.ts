import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getRepos } from '../../repos/factory.js';
import { parseSlug } from '../helpers.js';
import { ensureSlugMatch, parseBody } from './helpers.js';
import { TorneoSchema, EdicionSchema, GrupoSchema } from '../../schemas/torneo.js';
import type { Torneo, Edicion, Grupo } from '../../types.js';

export const adminTorneos = new Hono();

// Torneo evergreen
adminTorneos.put('/:slug', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const body = await parseBody(c, TorneoSchema);
  if (!body) return;
  ensureSlugMatch(slug, body.slug);
  const saved = await getRepos().torneos.upsert(slug, { ...body, slug } as unknown as Torneo);
  return c.json(saved);
});

adminTorneos.delete('/:slug', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const ok = await getRepos().torneos.delete(slug);
  if (!ok) throw new HTTPException(404, { message: `Torneo no encontrado: ${slug}` });
  return c.body(null, 204);
});

// Edición Mundial
adminTorneos.put('/mundial/:edicion', async (c) => {
  const edicion = parseSlug(c.req.param('edicion'));
  const body = await parseBody(c, EdicionSchema);
  if (!body) return;
  ensureSlugMatch(edicion, body.slug);
  const saved = await getRepos().ediciones.upsert(edicion, { ...body, slug: edicion } as unknown as Edicion);
  return c.json(saved);
});

adminTorneos.delete('/mundial/:edicion', async (c) => {
  const edicion = parseSlug(c.req.param('edicion'));
  const ok = await getRepos().ediciones.delete(edicion);
  if (!ok) throw new HTTPException(404, { message: `Edición no encontrada: ${edicion}` });
  return c.body(null, 204);
});

// Grupos
adminTorneos.put('/mundial/:edicion/grupos/:slug', async (c) => {
  const edicion = parseSlug(c.req.param('edicion'));
  const slug = parseSlug(c.req.param('slug'));
  const body = await parseBody(c, GrupoSchema);
  if (!body) return;
  ensureSlugMatch(slug, body.slug);
  if (body.edicion.slug !== edicion) {
    throw new HTTPException(400, { message: `Grupo.edicion.slug (${body.edicion.slug}) no coincide con :edicion (${edicion})` });
  }
  const saved = await getRepos().grupos.upsert(edicion, slug, { ...body, slug } as unknown as Grupo);
  return c.json(saved);
});

adminTorneos.delete('/mundial/:edicion/grupos/:slug', async (c) => {
  const edicion = parseSlug(c.req.param('edicion'));
  const slug = parseSlug(c.req.param('slug'));
  const ok = await getRepos().grupos.delete(edicion, slug);
  if (!ok) throw new HTTPException(404, { message: `Grupo no encontrado: ${slug}` });
  return c.body(null, 204);
});
