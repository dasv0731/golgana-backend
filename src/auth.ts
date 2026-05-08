import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from './env.js';

function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return m ? m[1].trim() : null;
}

// JWKS cache (Cognito public keys). Solo se inicializa si hay user pool configurado.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (jwks) return jwks;
  if (!env.COGNITO_USER_POOL_ID) return null;
  const url = `https://cognito-idp.${env.COGNITO_REGION}.amazonaws.com/${env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
  jwks = createRemoteJWKSet(new URL(url));
  return jwks;
}

async function validateCognitoJwt(token: string): Promise<{ sub: string; email?: string; username?: string } | null> {
  const set = getJwks();
  if (!set) return null;
  const issuer = `https://cognito-idp.${env.COGNITO_REGION}.amazonaws.com/${env.COGNITO_USER_POOL_ID}`;
  try {
    const { payload } = await jwtVerify(token, set, {
      issuer,
      // El client_id no es claim estándar; lo verificamos sólo si está configurado.
    });
    if (env.COGNITO_APP_CLIENT_ID && payload['client_id'] && payload['client_id'] !== env.COGNITO_APP_CLIENT_ID && payload['aud'] !== env.COGNITO_APP_CLIENT_ID) {
      return null;
    }
    return {
      sub: String(payload.sub),
      email: payload['email'] as string | undefined,
      username: payload['cognito:username'] as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Admin middleware. Estrategia dual:
 *  - Si `COGNITO_USER_POOL_ID` está seteado → valida JWT contra JWKS.
 *  - Si NO → cae al bearer estático (`ADMIN_API_KEY`) para dev local.
 *
 * Esto permite que las plantillas y handlers no sepan dónde corren.
 */
export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const token = extractToken(c.req.header('authorization'));
  if (!token) throw new HTTPException(401, { message: 'Unauthorized' });

  if (env.COGNITO_USER_POOL_ID) {
    const claims = await validateCognitoJwt(token);
    if (!claims) throw new HTTPException(401, { message: 'Unauthorized' });
    c.set('auth', { role: 'admin', user: claims });
    await next();
    return;
  }

  if (token !== env.ADMIN_API_KEY) {
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
