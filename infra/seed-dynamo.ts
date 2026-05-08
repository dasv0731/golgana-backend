/**
 * Seed: copia los JSON de data/ a las 10 tablas DynamoDB.
 *
 * Uso:
 *   AWS_PROFILE=polla AWS_REGION=us-east-1 \
 *   STORAGE_DRIVER=dynamo DDB_TABLE_PREFIX=gg- \
 *   ADMIN_API_KEY=irrelevant \
 *   npm run seed:dynamo
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const region = process.env.AWS_REGION ?? 'us-east-1';
const prefix = process.env.DDB_TABLE_PREFIX ?? 'gg-';
const dataDir = resolve(process.cwd(), process.env.DATA_DIR ?? './data');

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
});

async function listJsonFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    const out: string[] = [];
    for (const e of entries) {
      const full = join(dir, e);
      const st = await stat(full);
      if (st.isFile() && e.endsWith('.json')) out.push(full);
    }
    return out;
  } catch {
    return [];
  }
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T;
}

async function batchWrite(table: string, items: Record<string, unknown>[]): Promise<void> {
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    await client.send(new BatchWriteCommand({
      RequestItems: { [table]: chunk.map((Item) => ({ PutRequest: { Item } })) },
    }));
    process.stdout.write(`  · ${table}: ${Math.min(i + 25, items.length)}/${items.length}\r`);
  }
  process.stdout.write('\n');
}

async function seedSimple(suffix: string, dirRel: string): Promise<void> {
  const files = await listJsonFiles(join(dataDir, dirRel));
  if (!files.length) return;
  console.log(`▸ ${prefix}${suffix} (${files.length})`);
  const items: Record<string, unknown>[] = [];
  for (const f of files) {
    const data = await readJson<{ slug?: string }>(f);
    const slug = data.slug ?? basename(f, '.json');
    items.push({ slug, data });
  }
  await batchWrite(`${prefix}${suffix}`, items);
}

async function seedEdiciones(): Promise<void> {
  // ediciones del Mundial: torneos/mundial/<edicion>.json
  const dir = join(dataDir, 'torneos/mundial');
  const files = await listJsonFiles(dir);
  if (!files.length) return;
  console.log(`▸ ${prefix}ediciones (${files.length})`);
  const items: Record<string, unknown>[] = [];
  for (const f of files) {
    const data = await readJson<{ slug?: string }>(f);
    const slug = data.slug ?? basename(f, '.json');
    items.push({ slug, data });
  }
  await batchWrite(`${prefix}ediciones`, items);
}

async function seedTorneos(): Promise<void> {
  const f = join(dataDir, 'torneos/mundial.json');
  try {
    const data = await readJson<{ slug?: string }>(f);
    const slug = data.slug ?? 'mundial';
    console.log(`▸ ${prefix}torneos (1)`);
    await batchWrite(`${prefix}torneos`, [{ slug, data }]);
  } catch { /* skip */ }
}

async function seedGrupos(): Promise<void> {
  const dir = join(dataDir, 'torneos/mundial/2026/grupos');
  const files = await listJsonFiles(dir);
  if (!files.length) return;
  console.log(`▸ ${prefix}grupos (${files.length})`);
  const items: Record<string, unknown>[] = [];
  for (const f of files) {
    const data = await readJson<{ slug?: string }>(f);
    const slug = data.slug ?? basename(f, '.json');
    items.push({ edicionSlug: '2026', slug, data });
  }
  await batchWrite(`${prefix}grupos`, items);
}

async function seedPlantillas(): Promise<void> {
  // selecciones/<slug>/plantilla.json
  const seleccionesDir = join(dataDir, 'selecciones');
  const entries = await readdir(seleccionesDir);
  const items: Record<string, unknown>[] = [];
  for (const e of entries) {
    const full = join(seleccionesDir, e);
    const st = await stat(full);
    if (!st.isDirectory()) continue;
    const plantillaFile = join(full, 'plantilla.json');
    try {
      const data = await readJson<unknown>(plantillaFile);
      items.push({ equipoSlug: e, data });
    } catch { /* selección sin plantilla */ }
  }
  if (!items.length) return;
  console.log(`▸ ${prefix}plantillas (${items.length})`);
  await batchWrite(`${prefix}plantillas`, items);
}

async function seedSubResources(): Promise<void> {
  const seleccionesDir = join(dataDir, 'selecciones');
  const entries = await readdir(seleccionesDir);
  const SUB_KEYS = ['historia', 'idolos', 'titulos', 'partidos', 'clasicos', 'estadio'];
  const items: Record<string, unknown>[] = [];
  for (const e of entries) {
    const full = join(seleccionesDir, e);
    const st = await stat(full);
    if (!st.isDirectory()) continue;
    for (const key of SUB_KEYS) {
      const f = join(full, `${key}.json`);
      try {
        const data = await readJson<unknown>(f);
        items.push({ equipoSlug: e, sub: key, data });
      } catch { /* skip */ }
    }
  }
  if (!items.length) return;
  console.log(`▸ ${prefix}sub-selecciones (${items.length})`);
  await batchWrite(`${prefix}sub-selecciones`, items);
}

async function main(): Promise<void> {
  console.log(`Seed Dynamo · prefix="${prefix}" · region=${region} · data=${dataDir}\n`);
  await seedSimple('equipos',   'selecciones');
  await seedSimple('jugadores', 'jugadores');
  await seedSimple('partidos',  'partidos');
  await seedSimple('temas',     'temas');
  await seedSimple('noticias',  'noticias');
  await seedTorneos();
  await seedEdiciones();
  await seedGrupos();
  await seedPlantillas();
  await seedSubResources();
  console.log('\n✅ Seed completo.');
}

main().catch((err) => {
  console.error('❌ Seed falló:', err);
  process.exit(1);
});
