import { mkdirSync } from "node:fs";

export function ensureDirSync(dir: string) {
  mkdirSync(dir, { recursive: true });
}

export function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

export function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
