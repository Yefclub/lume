import { X } from "lucide-react";
import { getReleaseNotes } from "@/lib/releaseNotes";
import { Button } from "@/components/ui/button";

/** Painel de "Novidades" — lê as notas de release embutidas no app. */
export function Novidades({ onClose }: { onClose: () => void }) {
  const notes = getReleaseNotes();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">✨ Novidades</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X />
          </Button>
        </div>

        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem notas de versão ainda.</p>
        ) : (
          <div className="space-y-6">
            {notes.map((n) => (
              <article key={n.version} className="border-b border-border pb-5 last:border-0">
                <div className="flex items-baseline gap-2">
                  <span className="rounded bg-primary/15 px-2 py-0.5 text-sm font-semibold text-primary">
                    v{n.version}
                  </span>
                  {n.date && <span className="text-xs text-muted-foreground">{n.date}</span>}
                </div>
                <h3 className="mt-2 font-semibold">{n.title}</h3>
                <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {n.body}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
