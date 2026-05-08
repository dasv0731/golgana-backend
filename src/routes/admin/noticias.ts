import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getRepos } from '../../repos/factory.js';
import { parseSlug } from '../helpers.js';
import { ensureSlugMatch, parseBody } from './helpers.js';
import { ArticuloSchema } from '../../schemas/editorial.js';
import type { Articulo } from '../../types.js';

export const adminNoticias = new Hono();

adminNoticias.post('/', async (c) => {
  const body = await parseBody(c, ArticuloSchema);
  if (!body) return;
  const existing = await getRepos().noticias.get(body.slug);
  if (existing) throw new HTTPException(409, { message: `Noticia ya existe: ${body.slug}` });
  const saved = await getRepos().noticias.upsert(body.slug, body as unknown as Articulo);
  return c.json(saved, 201);
});

adminNoticias.put('/:slug', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const body = await parseBody(c, ArticuloSchema);
  if (!body) return;
  ensureSlugMatch(slug, body.slug);
  const saved = await getRepos().noticias.upsert(slug, { ...body, slug } as unknown as Articulo);
  return c.json(saved);
});

adminNoticias.delete('/:slug', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const ok = await getRepos().noticias.delete(slug);
  if (!ok) throw new HTTPException(404, { message: `Noticia no encontrada: ${slug}` });
  return c.body(null, 204);
});
