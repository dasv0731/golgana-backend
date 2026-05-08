import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getRepos } from '../../repos/factory.js';
import { parseSlug } from '../helpers.js';
import { ensureSlugMatch, parseBody } from './helpers.js';
import { PartidoSchema } from '../../schemas/partido.js';
import type { Partido } from '../../types.js';

export const adminPartidos = new Hono();

adminPartidos.post('/', async (c) => {
  const body = await parseBody(c, PartidoSchema);
  if (!body) return;
  const existing = await getRepos().partidos.get(body.slug);
  if (existing) throw new HTTPException(409, { message: `Partido ya existe: ${body.slug}` });
  const saved = await getRepos().partidos.upsert(body.slug, body as unknown as Partido);
  return c.json(saved, 201);
});

adminPartidos.put('/:slug', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const body = await parseBody(c, PartidoSchema);
  if (!body) return;
  ensureSlugMatch(slug, body.slug);
  const saved = await getRepos().partidos.upsert(slug, { ...body, slug } as unknown as Partido);
  return c.json(saved);
});

adminPartidos.delete('/:slug', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const ok = await getRepos().partidos.delete(slug);
  if (!ok) throw new HTTPException(404, { message: `Partido no encontrado: ${slug}` });
  return c.body(null, 204);
});
