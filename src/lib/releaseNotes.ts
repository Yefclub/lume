import type { ReleaseNote } from "./types";

// Importa, em tempo de build, todos os arquivos de release-notes/ como texto.
// Assim as "Novidades" aparecem no app de forma offline e automática.
const files = import.meta.glob("../../release-notes/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function parse(raw: string, fname: string): ReleaseNote {
  const clean = raw.replace(/^﻿/, "");
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(clean);
  const fm: Record<string, string> = {};
  let body = clean;
  if (m) {
    body = m[2].trim();
    for (const line of m[1].split(/\r?\n/)) {
      const i = line.indexOf(":");
      if (i > 0) {
        fm[line.slice(0, i).trim()] = line
          .slice(i + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
      }
    }
  }
  const version = fm.version || fname.replace(/.*\/v?/, "").replace(/\.md$/, "");
  return { version, date: fm.date || "", title: fm.title || `v${version}`, body };
}

export function getReleaseNotes(): ReleaseNote[] {
  return Object.entries(files)
    .map(([path, raw]) => parse(raw, path))
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
}
