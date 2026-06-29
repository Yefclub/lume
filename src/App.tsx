import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { BrainCircuit, RefreshCw, Tag, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Espelha okf::OkfNote do core Rust (campo `type` via serde rename). */
type OkfNote = {
  path: string;
  type: string;
  title: string | null;
  description: string | null;
  tags: string[];
  timestamp: string | null;
  body: string;
};

const TYPE_LABEL: Record<string, string> = {
  note: "Nota",
  person: "Pessoa",
  preference: "Gosto",
  goal: "Meta",
  fact: "Fato",
  project: "Projeto",
  daily: "Diário",
};

function App() {
  const [notes, setNotes] = useState<OkfNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<OkfNote[]>("list_brain_notes", { dir: null });
      setNotes(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <BrainCircuit className="size-6" />
            </span>
            <div>
              <h1 className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-2xl font-bold leading-none text-transparent">
                Lume
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Segundo cérebro local · formato OKF
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
            {loading ? "Lendo…" : "Recarregar"}
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-8">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">Não foi possível ler o cérebro</p>
              <p className="mt-1 text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {!error && notes.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">
            Nenhuma nota OKF encontrada em <code>brain.example/</code>.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {notes.map((note) => (
            <article
              key={note.path}
              className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {TYPE_LABEL[note.type] ?? note.type}
                </span>
                {note.timestamp && (
                  <span className="text-xs text-muted-foreground">
                    {note.timestamp.slice(0, 10)}
                  </span>
                )}
              </div>
              <h2 className="font-semibold leading-tight">
                {note.title ?? note.path}
              </h2>
              {note.description && (
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                  {note.description}
                </p>
              )}
              {note.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Tag className="size-3 text-muted-foreground" />
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>

        <footer className="mt-10 text-center text-xs text-muted-foreground">
          Fase 0 · parser OKF em Rust · {notes.length} nota(s) carregada(s)
        </footer>
      </section>
    </main>
  );
}

export default App;
