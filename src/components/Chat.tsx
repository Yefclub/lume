import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Download, Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chat, downloadModel, modelStatus, type ChatMsg, type ModelStatus } from "@/lib/ai";

const fmtGB = (b: number) => `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;

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
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-amber-500/10 text-primary">
            <Bot className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold leading-none">IA do Lume</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
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
          <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Bot className="size-8" />
          </span>
          <div>
            <p className="font-medium text-foreground">Baixe o modelo para ativar a IA</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {status.name} — roda 100% local, sem nuvem. Download retoma sozinho se cair.
            </p>
          </div>
          {dlError && <p className="max-w-md text-sm text-destructive">{dlError}</p>}
          {!downloading ? (
            <Button size="lg" onClick={() => void onDownload()}>
              <Download /> Baixar modelo
            </Button>
          ) : (
            <div className="w-80">
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                <span>Baixando…</span>
                <span>{total ? `${fmtGB(got)} / ${fmtGB(total)} · ${Math.round(progress * 100)}%` : fmtGB(got)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full bg-primary"
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ ease: "linear", duration: 0.2 }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="mx-auto w-full max-w-2xl flex-1 space-y-4 overflow-auto p-6">
            {messages.length === 0 && (
              <div className="pt-16 text-center text-sm text-muted-foreground">
                <p>Converse com a IA sobre o seu cérebro.</p>
                <p className="mt-1 text-xs">Ela lê suas notas para responder.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm " +
                    (m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card")
                  }
                >
                  {m.content ? (
                    m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-pre:my-2">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    )
                  ) : (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                </div>
              </motion.div>
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
                className="h-11 flex-1 rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button size="lg" onClick={() => void onSend()} disabled={busy || !input.trim()} aria-label="Enviar">
                {busy ? <Loader2 className="animate-spin" /> : <Send />}
              </Button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
