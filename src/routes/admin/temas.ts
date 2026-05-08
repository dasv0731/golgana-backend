import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getRepos } from '../../repos/factory.js';
import { parseSlug } from '../helpers.js';
import { ensureSlugMatch, parseBody } from './helpers.js';
import { TemaSchema } from '../../schemas/editorial.js';

export const adminTemas = new Hono();

adminTemas.post('/', async (c) => {
  const body = await parseBody(c, TemaSchema);
  if (!body) return;
  const existing = await getRepos().temas.get(body.slug);
  if (existing) throw new HTTPException(409, { message: `Tema ya existe: ${body.slug}` });
  const saved = await getRepos().temas.upsert(body.slug, body);
  return c.json(saved, 201);
});

adminTemas.put('/:slug', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const body = await parseBody(c, TemaSchema);
  if (!body) return;
  ensureSlugMatch(slug, body.slug);
  const saved = await getRepos().temas.upsert(slug, { ...body, slug });
  return c.json(saved);
});

adminTemas.delete('/:slug', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const ok = await getRepos().temas.delete(slug);
  if (!ok) throw new HTTPException(404, { message: `Tema no encontrado: ${slug}` });
  return c.body(null, 204);
});
