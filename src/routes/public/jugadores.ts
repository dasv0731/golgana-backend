import { Hono } from 'hono';
import { getRepos } from '../../repos/factory.js';
import { notFound, parseSlug } from '../helpers.js';

export const publicJugadores = new Hono();

publicJugadores.get('/', async (c) => {
  const list = await getRepos().jugadores.list();
  return c.json(list);
});

publicJugadores.get('/:slug', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const data = await getRepos().jugadores.get(slug);
  if (!data) notFound(`Jugador no encontrado: ${slug}`);
  return c.json(data);
});
