import { Hono } from 'hono';
import { getRepos } from '../../repos/factory.js';
import { notFound, parseSlug } from '../helpers.js';

export const publicSelecciones = new Hono();

publicSelecciones.get('/', async (c) => {
  const list = await getRepos().equipos.list();
  return c.json(list);
});

publicSelecciones.get('/:slug', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const data = await getRepos().equipos.get(slug);
  if (!data) notFound(`Selección no encontrada: ${slug}`);
  return c.json(data);
});

publicSelecciones.get('/:slug/plantilla', async (c) => {
  const slug = parseSlug(c.req.param('slug'));
  const data = await getRepos().plantillas.get(slug);
  if (!data) notFound(`Plantilla no encontrada para: ${slug}`);
  return c.json(data);
});

const SUB_KEYS = ['historia', 'idolos', 'titulos', 'partidos', 'clasicos', 'estadio'] as const;
for (const key of SUB_KEYS) {
  publicSelecciones.get(`/:slug/${key}`, async (c) => {
    const slug = parseSlug(c.req.param('slug'));
    const data = await getRepos().subSelecciones.get(slug, key);
    if (!data) notFound(`${key} no encontrado para: ${slug}`);
    return c.json(data);
  });
}
