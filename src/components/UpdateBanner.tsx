import { useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Download, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Phase = "idle" | "downloading" | "ready" | "installing";

/**
 * Verifica updates ao abrir, baixa em segundo plano automaticamente e só
 * instala quando o usuário clica em "Atualizar agora" (depois relança o app).
 */
export function UpdateBanner() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const up = await check();
        if (!up || cancelled) return;
        setUpdate(up);
        setPhase("downloading");
        let total = 0;
        let got = 0;
        await up.download((e) => {
          if (e.event === "Started") total = e.data.contentLength ?? 0;
          else if (e.event === "Progress") {
            got += e.data.chunkLength;
            setProgress(total ? got / total : 0);
          }
        });
        if (!cancelled) setPhase("ready");
      } catch {
        // Sem updater (modo dev) ou offline — silencioso.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!update || phase === "idle") return null;

  return (
    <div className="border-b border-primary/30 bg-primary/10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-6 py-2.5 text-sm">
        <Sparkles className="size-4 shrink-0 text-primary" />
        <span className="font-medium">Nova versão {update.version} disponível</span>
        {phase === "downloading" && (
          <span className="text-muted-foreground">baixando… {Math.round(progress * 100)}%</span>
        )}
        {phase === "ready" && <span className="text-muted-foreground">baixada, pronta para instalar</span>}
        <div className="ml-auto">
          {phase === "ready" && (
            <Button
              size="sm"
              onClick={async () => {
                setPhase("installing");
                await update.install();
                await relaunch();
              }}
            >
              <Download /> Atualizar agora
            </Button>
          )}
          {phase === "installing" && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <RefreshCw className="size-4 animate-spin" /> instalando…
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
