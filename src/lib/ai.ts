import { invoke, Channel } from "@tauri-apps/api/core";

export type ModelDef = {
  id: string;
  name: string;
  file: string;
  url: string;
  size_gb: number;
  reasoning: boolean;
};

export type ModelStatus = {
  id: string;
  name: string;
  exists: boolean;
  size_gb: number;
  reasoning: boolean;
};

export type DlEvent =
  | { event: "Progress"; data: { downloaded: number; total: number } }
  | { event: "Done" }
  | { event: "Error"; data: { message: string } };

export type ChatMsg = { role: "user" | "assistant"; content: string };

export const listModels = () => invoke<ModelDef[]>("list_models");

export const modelStatus = (modelId: string) =>
  invoke<ModelStatus>("model_status", { modelId });

export function downloadModel(modelId: string, onEvent: (e: DlEvent) => void) {
  const ch = new Channel<DlEvent>();
  ch.onmessage = onEvent;
  return invoke<void>("download_model", { modelId, onEvent: ch });
}

export function chat(
  modelId: string,
  messages: ChatMsg[],
  reasoning: boolean,
  onToken: (t: string) => void,
) {
  const ch = new Channel<string>();
  ch.onmessage = onToken;
  return invoke<void>("chat", { modelId, messages, reasoning, onToken: ch });
}

/** Separa o bloco de raciocínio `<think>…</think>` do texto da resposta. */
export function splitReasoning(raw: string): {
  reasoning: string;
  answer: string;
  thinking: boolean;
} {
  const open = raw.indexOf("<think>");
  if (open === -1) return { reasoning: "", answer: raw, thinking: false };
  const close = raw.indexOf("</think>");
  if (close === -1)
    return { reasoning: raw.slice(open + 7), answer: "", thinking: true };
  return {
    reasoning: raw.slice(open + 7, close).trim(),
    answer: raw.slice(close + 8).trim(),
    thinking: false,
  };
}
