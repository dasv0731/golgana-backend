import { readFile, writeFile, readdir, mkdir, unlink, stat } from 'node:fs/promises';
import { resolve, sep, basename, dirname } from 'node:path';

/**
 * Helpers para operar sobre archivos JSON dentro de un DATA_DIR.
 * Toda ruta `relativePath` se valida para no escapar del root (path-traversal).
 */
export class JsonStore {
  private readonly root: string;

  constructor(dataDir: string) {
    this.root = resolve(process.cwd(), dataDir);
  }

  private safe(relative: string): string {
    const full = resolve(this.root, relative);
    if (!(full === this.root || full.startsWith(this.root + sep))) {
      throw new Error(`Path traversal blocked: ${relative}`);
    }
    return full;
  }

  async readJson<T>(relativePath: string): Promise<T | null> {
    const full = this.safe(`${relativePath}.json`);
    try {
      const raw = await readFile(full, 'utf-8');
      return JSON.parse(raw) as T;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') return null;
      throw err;
    }
  }

  async writeJson<T>(relativePath: string, data: T): Promise<void> {
    const full = this.safe(`${relativePath}.json`);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  }

  async deleteJson(relativePath: string): Promise<boolean> {
    const full = this.safe(`${relativePath}.json`);
    try {
      await unlink(full);
      return true;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') return false;
      throw err;
    }
  }

  /**
   * Lista los slugs (basenames sin extensión) de archivos JSON dentro de `relativeDir`.
   * Excluye sub-directorios (los sub-recursos por entidad están bajo carpetas anidadas).
   */
  async listJsonSlugs(relativeDir: string): Promise<string[]> {
    const full = this.safe(relativeDir);
    let entries: string[];
    try {
      entries = await readdir(full);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') return [];
      throw err;
    }
    const slugs: string[] = [];
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;
      const entryPath = resolve(full, entry);
      const st = await stat(entryPath);
      if (!st.isFile()) continue;
      slugs.push(basename(entry, '.json'));
    }
    return slugs.sort();
  }
}
