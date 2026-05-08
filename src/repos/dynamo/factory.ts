import {
  GetCommand, PutCommand, DeleteCommand, ScanCommand, QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  Equipo, Plantilla, Jugador, Partido, Edicion, Grupo, Torneo, Articulo,
} from '../../types.js';
import type { Repos, IRepo, IPlantillaRepo, ISubresourceRepo, IGrupoRepo } from '../interfaces.js';
import { getDocClient, tableName, TABLES } from './client.js';

/**
 * Cada item se guarda con shape: { slug: <string>, data: <objeto completo> }
 * (o las claves compuestas según la entidad).
 *
 * Ventajas: el JSON shape del front se preserva 1:1 dentro de `data`,
 * sin necesidad de aplanar atributos.
 */

const ALLOWED_SUB_KEYS = ['historia', 'idolos', 'titulos', 'partidos', 'clasicos', 'estadio'];

function makeEntityRepo<T extends { slug: string }>(suffix: string): IRepo<T> {
  const table = tableName(suffix);
  return {
    async list() {
      const c = getDocClient();
      const out: T[] = [];
      let exclusiveStartKey: Record<string, unknown> | undefined;
      do {
        const r = await c.send(new ScanCommand({ TableName: table, ExclusiveStartKey: exclusiveStartKey }));
        for (const item of (r.Items ?? [])) {
          if (item['data']) out.push(item['data'] as T);
        }
        exclusiveStartKey = r.LastEvaluatedKey;
      } while (exclusiveStartKey);
      return out;
    },
    async get(slug) {
      const c = getDocClient();
      const r = await c.send(new GetCommand({ TableName: table, Key: { slug } }));
      return (r.Item?.['data'] as T) ?? null;
    },
    async upsert(slug, data) {
      const c = getDocClient();
      await c.send(new PutCommand({ TableName: table, Item: { slug, data } }));
      return data;
    },
    async delete(slug) {
      const c = getDocClient();
      const existed = await c.send(new GetCommand({ TableName: table, Key: { slug } }));
      if (!existed.Item) return false;
      await c.send(new DeleteCommand({ TableName: table, Key: { slug } }));
      return true;
    },
  };
}

function makePlantillaRepo(): IPlantillaRepo {
  const table = tableName(TABLES.plantillas);
  return {
    async get(equipoSlug) {
      const c = getDocClient();
      const r = await c.send(new GetCommand({ TableName: table, Key: { equipoSlug } }));
      return (r.Item?.['data'] as Plantilla) ?? null;
    },
    async upsert(equipoSlug, data) {
      const c = getDocClient();
      await c.send(new PutCommand({ TableName: table, Item: { equipoSlug, data } }));
      return data;
    },
    async delete(equipoSlug) {
      const c = getDocClient();
      const existed = await c.send(new GetCommand({ TableName: table, Key: { equipoSlug } }));
      if (!existed.Item) return false;
      await c.send(new DeleteCommand({ TableName: table, Key: { equipoSlug } }));
      return true;
    },
  };
}

function makeSubresourceRepo(): ISubresourceRepo {
  const table = tableName(TABLES.subSelecciones);
  return {
    async get(equipoSlug, key) {
      if (!ALLOWED_SUB_KEYS.includes(key)) throw new Error(`Invalid sub-resource: ${key}`);
      const c = getDocClient();
      const r = await c.send(new GetCommand({ TableName: table, Key: { equipoSlug, sub: key } }));
      return r.Item?.['data'] ?? null;
    },
    async upsert(equipoSlug, key, data) {
      if (!ALLOWED_SUB_KEYS.includes(key)) throw new Error(`Invalid sub-resource: ${key}`);
      const c = getDocClient();
      await c.send(new PutCommand({ TableName: table, Item: { equipoSlug, sub: key, data } }));
      return data;
    },
  };
}

function makeGrupoRepo(): IGrupoRepo {
  const table = tableName(TABLES.grupos);
  return {
    async list(edicionSlug) {
      const c = getDocClient();
      const r = await c.send(new QueryCommand({
        TableName: table,
        KeyConditionExpression: 'edicionSlug = :e',
        ExpressionAttributeValues: { ':e': edicionSlug },
      }));
      const items = (r.Items ?? [])
        .map((i) => i['data'] as Grupo)
        .filter((g): g is Grupo => Boolean(g));
      return items.sort((a, b) => a.letra.localeCompare(b.letra));
    },
    async get(edicionSlug, grupoSlug) {
      const c = getDocClient();
      const r = await c.send(new GetCommand({
        TableName: table,
        Key: { edicionSlug, slug: grupoSlug },
      }));
      return (r.Item?.['data'] as Grupo) ?? null;
    },
    async upsert(edicionSlug, grupoSlug, data) {
      const c = getDocClient();
      await c.send(new PutCommand({
        TableName: table,
        Item: { edicionSlug, slug: grupoSlug, data },
      }));
      return data;
    },
    async delete(edicionSlug, grupoSlug) {
      const c = getDocClient();
      const existed = await c.send(new GetCommand({
        TableName: table,
        Key: { edicionSlug, slug: grupoSlug },
      }));
      if (!existed.Item) return false;
      await c.send(new DeleteCommand({
        TableName: table,
        Key: { edicionSlug, slug: grupoSlug },
      }));
      return true;
    },
  };
}

export function buildDynamoRepos(): Repos {
  return {
    equipos:        makeEntityRepo<Equipo>(TABLES.equipos),
    jugadores:      makeEntityRepo<Jugador>(TABLES.jugadores),
    partidos:       makeEntityRepo<Partido>(TABLES.partidos),
    ediciones:      makeEntityRepo<Edicion>(TABLES.ediciones),
    torneos:        makeEntityRepo<Torneo>(TABLES.torneos),
    noticias:       makeEntityRepo<Articulo>(TABLES.noticias),
    temas:          makeEntityRepo<{ slug: string }>(TABLES.temas),
    plantillas:     makePlantillaRepo(),
    subSelecciones: makeSubresourceRepo(),
    grupos:         makeGrupoRepo(),
  };
}
