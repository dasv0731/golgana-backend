import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { env } from '../../env.js';

let cached: DynamoDBDocumentClient | null = null;

export function getDocClient(): DynamoDBDocumentClient {
  if (cached) return cached;
  const region = process.env.AWS_REGION ?? 'us-east-1';
  const ddb = new DynamoDBClient({ region });
  cached = DynamoDBDocumentClient.from(ddb, {
    marshallOptions: { removeUndefinedValues: true, convertClassInstanceToMap: true },
  });
  return cached;
}

/**
 * Mapeo entidad → tabla DynamoDB. Prefijo configurable vía DDB_TABLE_PREFIX
 * (ej. `gg-` para deploy de prueba o `golgana-` en futuro).
 */
export function tableName(suffix: string): string {
  const prefix = env.DDB_TABLE_PREFIX ?? 'gg-';
  return `${prefix}${suffix}`;
}

export const TABLES = {
  equipos:       'equipos',
  jugadores:     'jugadores',
  partidos:      'partidos',
  ediciones:     'ediciones',
  torneos:       'torneos',
  temas:         'temas',
  noticias:      'noticias',
  plantillas:    'plantillas',
  grupos:        'grupos',
  subSelecciones: 'sub-selecciones',
} as const;
