import { Hono } from 'hono';
import { getRepos } from '../../repos/factory.js';
import { notFound, parseSlug } from '../helpers.js';

export const publicNoticias = new Hono();

publicNoticias.get('/', async (c) => {
  const list = await getRepos().noticias.list();
  list.sort((a, b) => (b.fechaPublicacion ?? '').localeCompare(a.fechaPublicacion ?? ''));
  return c.json(list);
});

publicNoticias.get('/:slug', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const data = await getRepos().noticias.get(slug);
  if (!data) notFound(`Noticia no encontrada: ${slug}`);
  return c.json(data);
});
