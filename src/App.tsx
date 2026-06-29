import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  FileText,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpdateBanner } from "@/components/UpdateBanner";
import { Novidades } from "@/components/Novidades";
import { Chat } from "@/components/Chat";
import { createNote, deleteNote, listNotes, readNote, saveNote } from "@/lib/api";
import { type OkfNote, TYPE_LABEL, TYPES } from "@/lib/types";

function App() {
  const [notes, setNotes] = useState<OkfNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [showNovidades, setShowNovidades] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [newType, setNewType] = useState<string>("note");
  const [newTitle, setNewTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setNotes(await listNotes());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => s.add(t)));
    return [...s].sort();
  }, [notes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (activeTag && !n.tags.includes(activeTag)) return false;
      if (!q) return true;
      return (
        (n.title ?? "").toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)) ||
        n.type.toLowerCase().includes(q)
      );
    });
  }, [notes, search, activeTag]);

  const openNote = useCallback(async (path: string) => {
    setSelected(path);
    setEditorError(null);
    try {
      setDraft(await readNote(path));
      setDirty(false);
    } catch (e) {
      setEditorError(String(e));
    }
  }, []);

  const onSave = async () => {
    if (!selected) return;
    setSaving(true);
    setEditorError(null);
    try {
      await saveNote(selected, draft);
      setDirty(false);
      await load();
    } catch (e) {
      setEditorError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!selected || !window.confirm("Apagar esta nota? Não dá pra desfazer.")) return;
    try {
      await deleteNote(selected);
      setSelected(null);
      setDraft("");
      await load();
    } catch (e) {
      setEditorError(String(e));
    }
  };

  const onCreate = async () => {
    try {
      const note = await createNote(newType, newTitle.trim() || "Sem título");
      setNewTitle("");
      await load();
      await openNote(note.path);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <BrainCircuit className="size-5" />
          </span>
          <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-xl font-bold text-transparent">
            Lume
          </span>
          <div className="relative ml-3 max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar no cérebro…"
              className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowChat(true)}>
            <Bot /> IA
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowNovidades(true)}>
            <Sparkles /> Novidades
          </Button>
          <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} aria-label="Recarregar">
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </header>

      <UpdateBanner />

      {error && (
        <div className="mx-auto mt-4 flex w-full max-w-5xl items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span className="text-muted-foreground">{error}</span>
        </div>
      )}

      <main className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-4 overflow-hidden px-6 py-4 md:grid-cols-[320px_1fr]">
        {/* Coluna lista */}
        <aside className="flex min-h-0 flex-col gap-3">
          <div className="flex gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void onCreate()}
              placeholder="Nova nota…"
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button size="icon" onClick={() => void onCreate()} aria-label="Criar nota">
              <Plus />
            </Button>
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTag(activeTag === t ? null : t)}
                  className={
                    "rounded-full border px-2 py-0.5 text-xs transition-colors " +
                    (activeTag === t
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40")
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          <div className="min-h-0 flex-1 space-y-1.5 overflow-auto pr-1">
            {filtered.length === 0 && (
              <p className="px-1 pt-2 text-sm text-muted-foreground">Nenhuma nota.</p>
            )}
            {filtered.map((n) => (
              <button
                key={n.path}
                onClick={() => void openNote(n.path)}
                className={
                  "block w-full rounded-lg border px-3 py-2 text-left transition-all " +
                  (selected === n.path
                    ? "border-primary/50 bg-primary/5"
                    : "border-border hover:border-primary/30 hover:bg-accent/40")
                }
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {TYPE_LABEL[n.type] ?? n.type}
                  </span>
                  <span className="truncate text-sm font-medium">{n.title ?? n.path}</span>
                </div>
                {n.tags.length > 0 && (
                  <div className="mt-1 truncate text-xs text-muted-foreground">#{n.tags.join(" #")}</div>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Coluna editor */}
        <section className="flex min-h-0 flex-col rounded-xl border border-border bg-card">
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
              <FileText className="size-8 opacity-40" />
              <p className="text-sm">Selecione uma nota à esquerda ou crie uma nova.</p>
              <p className="text-xs">
                {notes.length} nota(s) no cérebro · edição em markdown (OKF)
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                <span className="truncate text-sm text-muted-foreground">{selected}</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => void onSave()} disabled={saving || !dirty}>
                    {saving ? <RefreshCw className="animate-spin" /> : <Save />}
                    Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void onDelete()} aria-label="Excluir">
                    <Trash2 />
                  </Button>
                </div>
              </div>
              {editorError && (
                <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
                  {editorError}
                </div>
              )}
              <textarea
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setDirty(true);
                }}
                spellCheck={false}
                className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed outline-none"
              />
              <div className="flex items-center gap-1.5 border-t border-border px-4 py-2 text-xs text-muted-foreground">
                <Tag className="size-3" />
                edite o frontmatter YAML + o corpo · <code>type</code> é obrigatório
              </div>
            </>
          )}
        </section>
      </main>

      {showChat && <Chat onClose={() => setShowChat(false)} />}
      {showNovidades && <Novidades onClose={() => setShowNovidades(false)} />}
    </div>
  );
}

export default App;
