import { useEffect, useRef, useState } from "react";
import { Bot, Download, Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chat, downloadModel, modelStatus, type ChatMsg, type ModelStatus } from "@/lib/ai";

const fmtMB = (b: number) => `${(b / 1024 / 1024).toFixed(0)} MB`;

/** Painel de conversa com a IA local (download do modelo + chat streamado). */
export function Chat({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [got, setGot] = useState(0);
  const [total, setTotal] = useState(0);
  const [dlError, setDlError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    modelStatus().then(setStatus).catch((e) => setDlError(String(e)));
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const onDownload = async () => {
    setDownloading(true);
    setDlError(null);
    try {
      await downloadModel((e) => {
        if (e.event === "Progress") {
          setGot(e.data.downloaded);
          setTotal(e.data.total);
          setProgress(e.data.total ? e.data.downloaded / e.data.total : 0);
        } else if (e.event === "Error") {
          setDlError(e.data.message);
        }
      });
      setStatus(await modelStatus());
    } catch (e) {
      setDlError(String(e));
    } finally {
      setDownloading(false);
    }
  };

  const onSend = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    let acc = "";
    try {
      await chat(next, (tok) => {
        acc += tok;
        setMessages((m) => {
          const c = [...m];
          c[c.length - 1] = { role: "assistant", content: acc };
          return c;
        });
      });
    } catch (e) {
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", content: "⚠️ " + String(e) };
        return c;
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Bot className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold leading-none">IA do Lume</h2>
            <p className="text-xs text-muted-foreground">
              {status?.name ?? "modelo local"} · 100% offline
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
          <X />
        </Button>
      </header>

      {!status ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : !status.exists ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <Bot className="size-10 text-primary" />
          <div>
            <p className="font-medium">Baixe o modelo para ativar a IA</p>
            <p className="text-sm text-muted-foreground">
              {status.name} — roda 100% local, sem nuvem.
            </p>
          </div>
          {dlError && <p className="max-w-md text-sm text-destructive">{dlError}</p>}
          {!downloading ? (
            <Button onClick={() => void onDownload()}>
              <Download /> Baixar modelo
            </Button>
          ) : (
            <div className="w-72">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Baixando…</span>
                <span>
                  {total ? `${fmtMB(got)} / ${fmtMB(total)} (${Math.round(progress * 100)}%)` : fmtMB(got)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="mx-auto w-full max-w-2xl flex-1 space-y-4 overflow-auto p-6">
            {messages.length === 0 && (
              <p className="pt-10 text-center text-sm text-muted-foreground">
                Converse com a IA sobre o seu cérebro. Ex: "o que eu ando estudando?"
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm " +
                    (m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card")
                  }
                >
                  {m.content || <Loader2 className="size-4 animate-spin" />}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-4">
            <div className="mx-auto flex max-w-2xl gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onSend();
                  }
                }}
                placeholder="Pergunte sobre o seu cérebro…"
                disabled={busy}
                className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button onClick={() => void onSend()} disabled={busy || !input.trim()} aria-label="Enviar">
                {busy ? <Loader2 className="animate-spin" /> : <Send />}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
