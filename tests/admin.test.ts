import { describe, it, expect, afterAll } from 'vitest';
import { createApp } from '../src/app.js';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

const app = createApp();
const KEY = process.env.ADMIN_API_KEY!;

async function fetchAs(method: string, path: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await app.fetch(new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }));
  const text = await res.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { /* */ }
  return { status: res.status, json, text };
}

const TEST_SLUG = 'test-jugador-zzz';

afterAll(async () => {
  // Limpieza por si quedó residual
  try {
    await unlink(resolve(process.cwd(), 'data', 'jugadores', `${TEST_SLUG}.json`));
  } catch { /* ok */ }
});

describe('auth', () => {
  it('PUT /admin/* sin token → 401', async () => {
    const r = await fetchAs('PUT', `/admin/jugadores/${TEST_SLUG}`, {}, undefined);
    expect(r.status).toBe(401);
  });
  it('PUT /admin/* con token incorrecto → 401', async () => {
    const r = await fetchAs('PUT', `/admin/jugadores/${TEST_SLUG}`, {}, 'wrong-token');
    expect(r.status).toBe(401);
  });
});

describe('admin · jugadores · CRUD', () => {
  const jugador = {
    slug: TEST_SLUG,
    nombre: 'Test Player',
    nombreCompleto: 'Test Player Full',
    fechaNacimiento: '2000-01-01',
    nacionalidad: 'Ecuador',
    posicion: 'MED',
    clubActual: { type: 'equipo', slug: 'fc-test', nombre: 'FC Test' },
    trayectoria: [],
    redes: {},
    seo: { title: 'Test', description: 'Test' },
    faq: [],
  };

  it('PUT crea/actualiza el jugador', async () => {
    const r = await fetchAs('PUT', `/admin/jugadores/${TEST_SLUG}`, jugador, KEY);
    expect(r.status).toBe(200);
    const j = r.json as Record<string, unknown>;
    expect(j.slug).toBe(TEST_SLUG);
  });

  it('GET público lo expone', async () => {
    const r = await app.fetch(new Request(`http://localhost/jugadores/${TEST_SLUG}`));
    expect(r.status).toBe(200);
  });

  it('PUT con slug en body distinto al param → 400', async () => {
    const r = await fetchAs('PUT', `/admin/jugadores/${TEST_SLUG}`, { ...jugador, slug: 'otro' }, KEY);
    expect(r.status).toBe(400);
  });

  it('PUT con body inválido → 400', async () => {
    const r = await fetchAs('PUT', `/admin/jugadores/${TEST_SLUG}`, { foo: 'bar' }, KEY);
    expect(r.status).toBe(400);
  });

  it('DELETE remueve el recurso', async () => {
    const r = await fetchAs('DELETE', `/admin/jugadores/${TEST_SLUG}`, undefined, KEY);
    expect(r.status).toBe(204);
    const r2 = await app.fetch(new Request(`http://localhost/jugadores/${TEST_SLUG}`));
    expect(r2.status).toBe(404);
  });

  it('DELETE de algo no existente → 404', async () => {
    const r = await fetchAs('DELETE', `/admin/jugadores/${TEST_SLUG}`, undefined, KEY);
    expect(r.status).toBe(404);
  });
});
