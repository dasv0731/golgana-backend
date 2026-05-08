import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { getRepos } from '../../repos/factory.js';
import { parseSlug } from '../helpers.js';
import { ensureSlugMatch, parseBody } from './helpers.js';
import { JugadorSchema } from '../../schemas/jugador.js';
import type { Jugador } from '../../types.js';

export const adminJugadores = new Hono();

adminJugadores.post('/', async (c) => {
  const body = await parseBody(c, JugadorSchema);
  if (!body) return;
  const existing = await getRepos().jugadores.get(body.slug);
  if (existing) throw new HTTPException(409, { message: `Jugador ya existe: ${body.slug}` });
  const saved = await getRepos().jugadores.upsert(body.slug, body as unknown as Jugador);
  return c.json(saved, 201);
});

adminJugadores.put('/:slug', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const body = await parseBody(c, JugadorSchema);
  if (!body) return;
  ensureSlugMatch(slug, body.slug);
  const saved = await getRepos().jugadores.upsert(slug, { ...body, slug } as unknown as Jugador);
  return c.json(saved);
});

adminJugadores.delete('/:slug', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const ok = await getRepos().jugadores.delete(slug);
  if (!ok) throw new HTTPException(404, { message: `Jugador no encontrado: ${slug}` });
  return c.body(null, 204);
});
