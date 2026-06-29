/** Espelha okf::OkfNote do core Rust (campo `type` via serde rename). */
export type OkfNote = {
  path: string;
  type: string;
  title: string | null;
  description: string | null;
  tags: string[];
  timestamp: string | null;
  body: string;
};

/** Uma nota de release (Novidades), lida de release-notes/*.md. */
export type ReleaseNote = {
  version: string;
  date: string;
  title: string;
  body: string;
};

export const TYPE_LABEL: Record<string, string> = {
  note: "Nota",
  person: "Pessoa",
  preference: "Gosto",
  goal: "Meta",
  fact: "Fato",
  project: "Projeto",
  daily: "Diário",
};

export const TYPES = ["note", "daily", "goal", "preference", "person", "fact", "project"] as const;
