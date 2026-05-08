import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ZodTypeAny, z } from 'zod';

export async function parseBody<T extends ZodTypeAny>(c: Context, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: 'Invalid JSON body' });
  }
  const r = schema.safeParse(body);
  if (!r.success) {
    // Devuelve directamente con detalles vía onError handler de Hono.
    throw new HTTPException(400, {
      message: 'ValidationError',
      cause: r.error,
    });
  }
  return r.data;
}

export function ensureSlugMatch(paramSlug: string, bodySlug: string | undefined): void {
  if (bodySlug && bodySlug !== paramSlug) {
    throw new HTTPException(400, {
      message: `Slug mismatch: param=${paramSlug} body=${bodySlug}`,
    });
  }
}
