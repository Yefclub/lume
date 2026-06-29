import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "motion/react";
import { Sparkles, X } from "lucide-react";
import { getReleaseNotes } from "@/lib/releaseNotes";
import { Button } from "@/components/ui/button";

/** Painel de "Novidades" — renderiza as notas de release em markdown. */
export function Novidades({ onClose }: { onClose: () => void }) {
  const notes = getReleaseNotes();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="max-h-[82vh] w-full max-w-2xl overflow-auto rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="size-5 text-primary" /> Novidades
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X />
          </Button>
        </div>

        <div className="space-y-8 p-6">
          {notes.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem notas de versão ainda.</p>
          )}
          {notes.map((n) => (
            <article key={n.version}>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-sm font-semibold text-primary">
                  v{n.version}
                </span>
                {n.date && <span className="text-xs text-muted-foreground">{n.date}</span>}
              </div>
              <h3 className="mb-1 text-base font-semibold">{n.title}</h3>
              <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-primary">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{n.body}</ReactMarkdown>
              </div>
            </article>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
