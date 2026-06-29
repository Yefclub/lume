import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Bot, Plus, RefreshCw, Search, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpdateBanner } from "@/components/UpdateBanner";
import { Novidades } from "@/components/Novidades";
import { Chat } from "@/components/Chat";
import { NoteEditor } from "@/components/NoteEditor";
import { createNote, deleteNote, listNotes, readNote, saveNote } from "@/lib/api";
import { rebuildNote } from "@/lib/okf";
import { type OkfNote, TYPE_LABEL, TYPES } from "@/lib/types";
import logo from "@/assets/lume.png";

function App() {
  const [notes, setNotes] = useState<OkfNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(true);
  const [showNovidades, setShowNovidades] = useState(false);
  // compose (centro, editor limpo)
  const [cType, setCType] = useState<string>("note");
  const [cTitle, setCTitle] = useState("");
  const [cBody, setCBody] = useState("");

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

  const selectedNote = notes.find((n) => n.path === selectedPath) ?? null;

  const onDeleteNote = async (path: string) => {
    if (!window.confirm("Apagar esta nota?")) return;
    try {
      await deleteNote(path);
      if (selectedPath === path) setSelectedPath(null);
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const quickCreate = async () => {
    try {
      const note = await createNote(cType, cTitle.trim() || "Sem título");
      if (cBody.trim()) {
        const md = await readNote(note.path);
        await saveNote(note.path, rebuildNote(md, note.title ?? "", [], cBody));
      }
      setCTitle("");
      setCBody("");
      await load();
      setSelectedPath(note.path);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border px-4 py-2">
        <img src={logo} alt="Lume" className="size-8 shrink-0" />
        <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-lg font-bold text-transparent">
          Lume
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant={showChat ? "secondary" : "ghost"} size="sm" onClick={() => setShowChat((v) => !v)}>
            <Bot /> IA
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowNovidades(true)}>
            <Sparkles /> Novidades
          </Button>
        </div>
      </header>

      <UpdateBanner />

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-card/30">
          <div className="space-y-2.5 border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar…"
                className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
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
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-1 overflow-auto p-2">
            <button
              onClick={() => setSelectedPath(null)}
              className="mb-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <Plus className="size-4" /> Nova nota
            </button>
            {filtered.length === 0 && !loading && (
              <p className="px-2 pt-2 text-sm text-muted-foreground">
                {notes.length === 0 ? "Cérebro vazio ✨" : "Nada encontrado."}
              </p>
            )}
            {filtered.map((n) => (
              <motion.div
                layout
                key={n.path}
                className={
                  "group relative rounded-xl border transition-colors " +
                  (selectedPath === n.path
                    ? "border-primary/50 bg-primary/5"
                    : "border-transparent hover:border-border hover:bg-accent/40")
                }
              >
                <button onClick={() => setSelectedPath(n.path)} className="block w-full px-3 py-2.5 text-left">
                  <div className="flex items-center gap-2 pr-5">
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      {TYPE_LABEL[n.type] ?? n.type}
                    </span>
                    <span className="truncate text-sm font-medium">{n.title ?? n.path}</span>
                  </div>
                  {n.description && (
                    <p className="mt-0.5 line-clamp-1 pr-5 text-xs text-muted-foreground">{n.description}</p>
                  )}
                </button>
                <button
                  onClick={() => void onDeleteNote(n.path)}
                  className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
                  aria-label="Excluir nota"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
            <span>{notes.length} nota(s)</span>
            <button onClick={() => void load()} className="flex items-center gap-1 hover:text-foreground">
              <RefreshCw className={"size-3 " + (loading ? "animate-spin" : "")} /> recarregar
            </button>
          </div>
        </aside>

        {/* Centro */}
        <main className="min-w-0 flex-1">
          {error && (
            <div className="m-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <span className="text-muted-foreground">{error}</span>
            </div>
          )}
          {selectedNote ? (
            <NoteEditor
              key={selectedNote.path}
              note={selectedNote}
              onSaved={() => void load()}
              onDeleted={() => {
                setSelectedPath(null);
                void load();
              }}
            />
          ) : (
            /* Editor limpo — comece a digitar */
            <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-8 py-6">
              <div className="mb-3 flex items-center gap-2">
                <select
                  value={cType}
                  onChange={(e) => setCType(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">nova nota</span>
              </div>
              <input
                value={cTitle}
                onChange={(e) => setCTitle(e.target.value)}
                placeholder="Título…"
                className="w-full bg-transparent text-3xl font-bold outline-none placeholder:text-muted-foreground/40"
              />
              <textarea
                value={cBody}
                onChange={(e) => setCBody(e.target.value)}
                placeholder="Comece a escrever… (markdown funciona)"
                className="mt-4 min-h-0 flex-1 resize-none bg-transparent text-base leading-relaxed outline-none placeholder:text-muted-foreground/40"
              />
              <div className="flex justify-end pt-3">
                <Button onClick={() => void quickCreate()} disabled={!cTitle.trim() && !cBody.trim()}>
                  <Plus /> Criar nota
                </Button>
              </div>
            </div>
          )}
        </main>

        {showChat && <Chat onClose={() => setShowChat(false)} />}
      </div>

      <AnimatePresence>
        {showNovidades && <Novidades key="novidades" onClose={() => setShowNovidades(false)} />}
      </AnimatePresence>
    </div>
  );
}

export default App;
