import { HTTPException } from 'hono/http-exception';
import { SlugSchema } from '../schemas/common.js';

export function parseSlug(raw: string | undefined): string {
  const r = SlugSchema.safeParse(raw ?? '');
  if (!r.success) throw new HTTPException(400, { message: `Invalid slug: ${raw}` });
  return r.data;
}

export function notFound(message = 'Not Found'): never {
  throw new HTTPException(404, { message });
}
