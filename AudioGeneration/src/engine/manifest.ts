/** Add or update one rendered lesson in manifest.json (read by the player app). */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { ModuleConfig } from '../curriculum/types.js';
import { Manifest } from '../types.js';

const pad2 = (n: number) => String(n).padStart(2, '0');

export function moduleName(module: string): string {
  const m = module.match(/^module(\d+)$/);
  return m ? `Module ${m[1]}` : module;
}

export function upsertLessonInto(manifest: Manifest, config: ModuleConfig, n: number, title: string, storagePath: string): Manifest {
  let lang = manifest.languages.find((l) => l.id === config.language);
  if (!lang) {
    lang = { id: config.language, name: config.languageName, levels: [] };
    manifest.languages.push(lang);
    manifest.languages.sort((a, b) => a.id.localeCompare(b.id));
  }
  let level = lang.levels.find((l) => l.id === config.module);
  if (!level) {
    level = { id: config.module, name: moduleName(config.module), lessons: [] };
    lang.levels.push(level);
    lang.levels.sort((a, b) => a.id.localeCompare(b.id));
  }
  const id = `lesson${pad2(n)}`;
  const entry = { id, title: `Lesson ${n} · ${title}`, storagePath };
  const i = level.lessons.findIndex((l) => l.id === id);
  if (i >= 0) level.lessons[i] = entry; else level.lessons.push(entry);
  level.lessons.sort((a, b) => a.id.localeCompare(b.id));
  return manifest;
}

export function upsertLesson(path: string, config: ModuleConfig, n: number, title: string, storagePath: string): void {
  const manifest: Manifest = existsSync(path) ? JSON.parse(readFileSync(path, 'utf-8')) : { languages: [] };
  writeFileSync(path, JSON.stringify(upsertLessonInto(manifest, config, n, title, storagePath), null, 2) + '\n');
}
