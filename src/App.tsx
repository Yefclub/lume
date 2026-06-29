import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpdateBanner } from "@/components/UpdateBanner";
import { Novidades } from "@/components/Novidades";
import { Chat } from "@/components/Chat";
import { NoteEditor } from "@/components/NoteEditor";
import logo from "@/assets/lume.png";
import { createNote, listNotes } from "@/lib/api";
import { type OkfNote, TYPE_LABEL, TYPES } from "@/lib/types";

function App() {
  const [notes, setNotes] = useState<OkfNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showNovidades, setShowNovidades] = useState(false);
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

  const selectedNote = notes.find((n) => n.path === selectedPath) ?? null;

  const onCreate = async () => {
    try {
      const note = await createNote(newType, newTitle.trim() || "Sem título");
      setNewTitle("");
      await load();
      setSelectedPath(note.path);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b border-border px-5 py-2.5">
        <img src={logo} alt="Lume" className="size-9 shrink-0" />
        <div className="leading-none">
          <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-lg font-bold text-transparent">
            Lume
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setShowChat(true)}>
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
        <aside className="flex w-80 shrink-0 flex-col border-r border-border bg-card/30">
          <div className="space-y-3 border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar no cérebro…"
                className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex gap-1.5">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button size="icon" onClick={() => void onCreate()} aria-label="Criar nota">
                <Plus />
              </Button>
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
            {filtered.length === 0 && !loading && (
              <p className="px-2 pt-4 text-sm text-muted-foreground">
                {notes.length === 0 ? "Cérebro vazio. Crie sua primeira nota acima ✨" : "Nada encontrado."}
              </p>
            )}
            {filtered.map((n) => (
              <motion.button
                layout
                key={n.path}
                onClick={() => setSelectedPath(n.path)}
                whileTap={{ scale: 0.98 }}
                className={
                  "block w-full rounded-xl border px-3 py-2.5 text-left transition-colors " +
                  (selectedPath === n.path
                    ? "border-primary/50 bg-primary/5"
                    : "border-transparent hover:border-border hover:bg-accent/40")
                }
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {TYPE_LABEL[n.type] ?? n.type}
                  </span>
                  <span className="truncate text-sm font-medium">{n.title ?? n.path}</span>
                </div>
                {n.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{n.description}</p>
                )}
              </motion.button>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
            <span>{notes.length} nota(s)</span>
            <button onClick={() => void load()} className="flex items-center gap-1 hover:text-foreground">
              <RefreshCw className={"size-3 " + (loading ? "animate-spin" : "")} /> recarregar
            </button>
          </div>
        </aside>

        {/* Main */}
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
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
              <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BrainCircuit className="size-8" />
              </span>
              <div>
                <p className="font-medium text-foreground">Seu segundo cérebro</p>
                <p className="mt-1 text-sm">
                  Selecione uma nota, crie uma nova, ou converse com a IA sobre o que você anotou.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowChat(true)}>
                <Bot /> Abrir a IA
              </Button>
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
