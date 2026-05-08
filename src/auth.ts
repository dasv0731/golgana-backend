import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { env } from './env.js';

/**
 * Bearer middleware para fase 1.
 *
 * En deploy a AWS se reemplaza la implementación interna por validación
 * de JWT contra Cognito (mismo header `Authorization: Bearer <jwt>`),
 * sin tocar handlers ni el shape de las responses.
 */
function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return m ? m[1].trim() : null;
}

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const token = extractToken(c.req.header('authorization'));
  if (!token || token !== env.ADMIN_API_KEY) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  c.set('auth', { role: 'admin' });
  await next();
};

/** Public read. Si PUBLIC_API_KEY está definido se exige; si no, abierto. */
export const requirePublic: MiddlewareHandler = async (c, next) => {
  if (!env.PUBLIC_API_KEY) {
    await next();
    return;
  }
  const token = extractToken(c.req.header('authorization'));
  if (!token || token !== env.PUBLIC_API_KEY) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  await next();
};
