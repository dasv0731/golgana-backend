import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { corsOrigins, env } from './env.js';

import { publicSelecciones } from './routes/public/selecciones.js';
import { publicJugadores } from './routes/public/jugadores.js';
import { publicPartidos } from './routes/public/partidos.js';
import { publicTorneos } from './routes/public/torneos.js';
import { publicTemas } from './routes/public/temas.js';
import { publicNoticias } from './routes/public/noticias.js';

import { adminSelecciones } from './routes/admin/selecciones.js';
import { adminJugadores } from './routes/admin/jugadores.js';
import { adminPartidos } from './routes/admin/partidos.js';
import { adminTorneos } from './routes/admin/torneos.js';
import { adminTemas } from './routes/admin/temas.js';
import { adminNoticias } from './routes/admin/noticias.js';

import { requireAdmin, requirePublic } from './auth.js';

export function createApp() {
  const app = new Hono();

  if (env.NODE_ENV !== 'test') app.use('*', logger());
  app.use('*', cors({
    origin: (origin) => (origin && corsOrigins.includes(origin)) ? origin : corsOrigins[0],
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    maxAge: 600,
  }));

  app.get('/healthz', (c) => c.json({ ok: true, version: '0.1.0' }));

  // Public read (lo que consume Nuxt)
  const pub = new Hono();
  pub.use('*', requirePublic);
  pub.route('/selecciones', publicSelecciones);
  pub.route('/jugadores', publicJugadores);
  pub.route('/partidos', publicPartidos);
  pub.route('/torneos', publicTorneos);
  pub.route('/temas', publicTemas);
  pub.route('/noticias', publicNoticias);
  app.route('/', pub);

  // Admin write (lo que consume la futura app Angular)
  const adm = new Hono();
  adm.use('*', requireAdmin);
  adm.route('/selecciones', adminSelecciones);
  adm.route('/jugadores', adminJugadores);
  adm.route('/partidos', adminPartidos);
  adm.route('/torneos', adminTorneos);
  adm.route('/temas', adminTemas);
  adm.route('/noticias', adminNoticias);
  app.route('/admin', adm);

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status);
    }
    if (err instanceof ZodError) {
      return c.json({ error: 'ValidationError', details: err.flatten() }, 400);
    }
    if (env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.error(err);
    }
    return c.json({ error: 'InternalServerError' }, 500);
  });

  app.notFound((c) => c.json({ error: 'NotFound', path: c.req.path }, 404));

  return app;
}
