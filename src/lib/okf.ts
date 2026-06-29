/** Separa o frontmatter YAML do corpo markdown de uma nota OKF. */
export function splitNote(md: string): { fm: string; body: string } {
  const clean = md.replace(/^﻿/, "");
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(clean);
  if (!m) return { fm: "", body: clean.trim() };
  return { fm: m[1], body: m[2].trim() };
}

/**
 * Reconstrói o markdown da nota atualizando `title`, `tags` e o corpo,
 * preservando todos os outros campos do frontmatter (type, timestamp, mood…).
 */
export function rebuildNote(
  originalMd: string,
  title: string,
  tags: string[],
  body: string,
): string {
  const { fm } = splitNote(originalMd);
  const tagsYaml = `[${tags.map((t) => t.trim()).filter(Boolean).join(", ")}]`;
  const lines = fm.split(/\r?\n/);
  let hasTitle = false;
  let hasTags = false;
  const out = lines.map((l) => {
    if (/^title\s*:/.test(l)) {
      hasTitle = true;
      return `title: ${title}`;
    }
    if (/^tags\s*:/.test(l)) {
      hasTags = true;
      return `tags: ${tagsYaml}`;
    }
    return l;
  });
  if (!hasTitle) out.push(`title: ${title}`);
  if (!hasTags) out.push(`tags: ${tagsYaml}`);
  const newFm = out.filter((l, i) => l.trim() !== "" || i < out.length).join("\n");
  return `---\n${newFm}\n---\n\n${body.trim()}\n`;
}
