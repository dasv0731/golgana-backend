import { z } from 'zod';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env') });

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().nonnegative().default(3001),
  ADMIN_API_KEY: z.string().min(1, 'ADMIN_API_KEY required'),
  PUBLIC_API_KEY: z.string().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:4200'),
  STORAGE_DRIVER: z.enum(['json', 'dynamo']).default('json'),
  DATA_DIR: z.string().default('./data'),
  DDB_TABLE_PREFIX: z.string().default('gg-'),

  // Cognito (opcional en local; requerido cuando se valida JWT)
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_REGION: z.string().default('us-east-1'),
  COGNITO_APP_CLIENT_ID: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const corsOrigins = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
