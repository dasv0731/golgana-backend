import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();

async function get(path: string) {
  const res = await app.fetch(new Request(`http://localhost${path}`));
  const text = await res.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text };
}

describe('public · selecciones', () => {
  it('GET /selecciones/ecuador → 200 con shape de Equipo', async () => {
    const r = await get('/selecciones/ecuador');
    expect(r.status).toBe(200);
    const e = r.json as Record<string, unknown>;
    expect(e.slug).toBe('ecuador');
    expect(e.tipo).toBe('seleccion');
    expect(e.nombre).toBe('Ecuador');
    expect(Array.isArray(e.estadisticasDestacadas)).toBe(true);
  });

  it('GET /selecciones/no-existe → 404', async () => {
    const r = await get('/selecciones/no-existe');
    expect(r.status).toBe(404);
  });

  it('GET /selecciones/ecuador/plantilla → 26 jugadores', async () => {
    const r = await get('/selecciones/ecuador/plantilla');
    expect(r.status).toBe(200);
    const p = r.json as { jugadores: unknown[] };
    expect(p.jugadores.length).toBe(26);
  });
});

describe('public · jugadores', () => {
  it('GET /jugadores/moises-caicedo → 200', async () => {
    const r = await get('/jugadores/moises-caicedo');
    expect(r.status).toBe(200);
    const j = r.json as Record<string, unknown>;
    expect(j.slug).toBe('moises-caicedo');
  });
  it('GET /jugadores/no-existe → 404', async () => {
    expect((await get('/jugadores/no-existe')).status).toBe(404);
  });
});

describe('public · partidos', () => {
  it('GET /partidos/ecuador-vs-uzbekistan-j1 → 200', async () => {
    const r = await get('/partidos/ecuador-vs-uzbekistan-j1');
    expect(r.status).toBe(200);
    const p = r.json as Record<string, unknown>;
    expect(p.estado).toBe('scheduled');
  });
});

describe('public · torneos · mundial', () => {
  it('GET /torneos/mundial/2026 → edicion con 16 sedes', async () => {
    const r = await get('/torneos/mundial/2026');
    expect(r.status).toBe(200);
    const e = r.json as { sedes: unknown[]; ano: number };
    expect(e.ano).toBe(2026);
    expect(e.sedes.length).toBe(16);
  });

  it('GET /torneos/mundial/2026/grupos → 12 grupos ordenados A..L', async () => {
    const r = await get('/torneos/mundial/2026/grupos');
    expect(r.status).toBe(200);
    const arr = r.json as Array<{ letra: string }>;
    expect(arr.length).toBe(12);
    expect(arr[0].letra).toBe('A');
    expect(arr[11].letra).toBe('L');
  });

  it('GET /torneos/mundial/2026/grupos/grupo-d → con tabla', async () => {
    const r = await get('/torneos/mundial/2026/grupos/grupo-d');
    expect(r.status).toBe(200);
    const g = r.json as { letra: string; tabla: unknown[] };
    expect(g.letra).toBe('D');
    expect(g.tabla.length).toBe(4);
  });

  it('GET /torneos/mundial/2026/sedes → 16 sedes', async () => {
    const r = await get('/torneos/mundial/2026/sedes');
    expect(r.status).toBe(200);
    expect((r.json as unknown[]).length).toBe(16);
  });

  it('GET /torneos/mundial/2026/calendario → partidos de 2026 ordenados', async () => {
    const r = await get('/torneos/mundial/2026/calendario');
    expect(r.status).toBe(200);
    const arr = r.json as Array<{ fecha: string }>;
    expect(arr.length).toBeGreaterThan(0);
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i].fecha >= arr[i - 1].fecha).toBe(true);
    }
  });

  it('GET /torneos/mundial/2026/goleadores → tabla derivada', async () => {
    const r = await get('/torneos/mundial/2026/goleadores');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.json)).toBe(true);
  });
});

describe('healthz', () => {
  it('GET /healthz → ok', async () => {
    const r = await get('/healthz');
    expect(r.status).toBe(200);
    const j = r.json as { ok: boolean };
    expect(j.ok).toBe(true);
  });
});
