import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Brain, ChevronDown, Download, Loader2, PanelRightClose, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import logo from "@/assets/lume.png";
import {
  chat,
  downloadModel,
  listModels,
  modelStatus,
  splitReasoning,
  type ChatMsg,
  type ModelDef,
  type ModelStatus,
} from "@/lib/ai";

const LS_MODEL = "lume.model";
const LS_REASON = "lume.reasoning";
const LS_CHAT = "lume.chat";
const fmtGB = (g: number) => `${g.toFixed(1)} GB`;

function Reasoning({ text, thinking }: { text: string; thinking: boolean }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (!thinking) setOpen(false);
  }, [thinking]);
  if (!text) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/40 text-xs">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 font-medium text-muted-foreground"
      >
        <Brain className={"size-3.5 " + (thinking ? "animate-pulse text-primary" : "")} />
        {thinking ? "Pensando…" : "Raciocínio"}
        <ChevronDown className={"ml-auto size-3.5 transition-transform " + (open ? "" : "-rotate-90")} />
      </button>
      {open && (
        <div className="max-h-40 overflow-auto whitespace-pre-wrap border-t border-border/60 px-2.5 py-1.5 text-muted-foreground/80">
          {text}
        </div>
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex gap-1 py-1">
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.2s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.1s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
    </span>
  );
}

export function Chat({ onClose }: { onClose: () => void }) {
  const [models, setModels] = useState<ModelDef[]>([]);
  const [modelId, setModelId] = useState<string>(() => localStorage.getItem(LS_MODEL) || "");
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [reasoning, setReasoning] = useState<boolean>(() => localStorage.getItem(LS_REASON) === "1");
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dlError, setDlError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_CHAT) || "[]");
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listModels()
      .then((m) => {
        setModels(m);
        setModelId((cur) => cur || m[0]?.id || "");
      })
      .catch((e) => setDlError(String(e)));
  }, []);
  useEffect(() => {
    if (!modelId) return;
    localStorage.setItem(LS_MODEL, modelId);
    setStatus(null);
    modelStatus(modelId).then(setStatus).catch((e) => setDlError(String(e)));
  }, [modelId]);
  useEffect(() => localStorage.setItem(LS_REASON, reasoning ? "1" : "0"), [reasoning]);
  useEffect(() => localStorage.setItem(LS_CHAT, JSON.stringify(messages)), [messages]);
  useEffect(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), [messages]);

  const model = models.find((m) => m.id === modelId);

  const onDownload = async () => {
    setDownloading(true);
    setDlError(null);
    try {
      await downloadModel(modelId, (e) => {
        if (e.event === "Progress") setProgress(e.data.total ? e.data.downloaded / e.data.total : 0);
        else if (e.event === "Error") setDlError(e.data.message);
      });
      setStatus(await modelStatus(modelId));
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
      await chat(modelId, next, reasoning && !!model?.reasoning, (tok) => {
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
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-border bg-card/20">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <img src={logo} alt="" className="size-6 shrink-0" />
        <select
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · {fmtGB(m.size_gb)}
            </option>
          ))}
        </select>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" onClick={() => setMessages([])} aria-label="Limpar conversa">
            <Trash2 />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar painel">
          <PanelRightClose />
        </Button>
      </header>

      {model?.reasoning && (
        <button
          onClick={() => setReasoning(!reasoning)}
          className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/30"
        >
          <Brain className="size-3.5" />
          Raciocínio {reasoning ? "(mais lento)" : ""}
          <span className={"ml-auto flex h-5 w-9 items-center rounded-full transition-colors " + (reasoning ? "bg-primary" : "bg-muted")}>
            <span className={"block size-4 rounded-full bg-white shadow transition-transform " + (reasoning ? "translate-x-4" : "translate-x-0.5")} />
          </span>
        </button>
      )}

      {!status ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : !status.exists ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <img src={logo} alt="" className="size-14" />
          <div>
            <p className="text-sm font-medium text-foreground">Baixe o {status.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {fmtGB(status.size_gb)} · 100% local. Retoma sozinho se cair.
            </p>
          </div>
          {dlError && <p className="text-xs text-destructive">{dlError}</p>}
          {!downloading ? (
            <Button onClick={() => void onDownload()}>
              <Download /> Baixar modelo
            </Button>
          ) : (
            <div className="w-full max-w-[260px]">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Baixando…</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 space-y-5 overflow-auto p-3.5">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                <img src={logo} alt="" className="size-12 opacity-80" />
                <p className="font-medium text-foreground">Converse com o seu cérebro</p>
                <p>A IA lê suas notas para responder.</p>
              </div>
            )}
            {messages.map((m, i) => {
              if (m.role === "user") {
                return (
                  <Message key={i} align="end">
                    <MessageContent>
                      <Bubble variant="default" align="end">
                        <BubbleContent className="whitespace-pre-wrap">{m.content}</BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                );
              }
              const { reasoning: think, answer, thinking } = splitReasoning(m.content);
              const showBubble = answer || !think;
              return (
                <Message key={i} align="start">
                  <MessageAvatar>
                    <img src={logo} alt="" className="size-7" />
                  </MessageAvatar>
                  <MessageContent>
                    <Reasoning text={think} thinking={thinking} />
                    {showBubble && (
                      <Bubble variant="outline" align="start">
                        <BubbleContent>
                          {answer ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-pre:my-2">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
                            </div>
                          ) : (
                            <TypingDots />
                          )}
                        </BubbleContent>
                      </Bubble>
                    )}
                  </MessageContent>
                </Message>
              );
            })}
          </div>
          <div className="p-2.5">
            <div className="flex items-end gap-1.5 rounded-2xl border border-input bg-background p-1.5 focus-within:ring-2 focus-within:ring-ring">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onSend();
                  }
                }}
                rows={1}
                placeholder="Pergunte sobre o seu cérebro…"
                disabled={busy}
                className="max-h-32 min-h-[2.25rem] flex-1 resize-none bg-transparent px-2.5 py-2 text-sm outline-none"
              />
              <Button size="icon" className="rounded-xl" onClick={() => void onSend()} disabled={busy || !input.trim()} aria-label="Enviar">
                {busy ? <Loader2 className="animate-spin" /> : <Send />}
              </Button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
