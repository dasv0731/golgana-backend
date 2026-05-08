import { Hono } from 'hono';
import { getRepos } from '../../repos/factory.js';
import { notFound, parseSlug } from '../helpers.js';

export const publicTemas = new Hono();

publicTemas.get('/', async (c) => {
  const list = await getRepos().temas.list();
  return c.json(list);
});

publicTemas.get('/:slug', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const data = await getRepos().temas.get(slug);
  if (!data) notFound(`Tema no encontrado: ${slug}`);
  return c.json(data);
});
