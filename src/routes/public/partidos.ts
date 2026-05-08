import { Hono } from 'hono';
import { getRepos } from '../../repos/factory.js';
import { notFound, parseSlug } from '../helpers.js';

export const publicPartidos = new Hono();

publicPartidos.get('/', async (c) => {
  const list = await getRepos().partidos.list();
  return c.json(list);
});

publicPartidos.get('/:slug', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const data = await getRepos().partidos.get(slug);
  if (!data) notFound(`Partido no encontrado: ${slug}`);
  return c.json(data);
});
