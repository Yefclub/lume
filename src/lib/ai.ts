import { invoke, Channel } from "@tauri-apps/api/core";

export type ModelStatus = {
  name: string;
  file: string;
  exists: boolean;
  path: string;
  url: string;
};

export type DlEvent =
  | { event: "Progress"; data: { downloaded: number; total: number } }
  | { event: "Done" }
  | { event: "Error"; data: { message: string } };

export type ChatMsg = { role: "user" | "assistant"; content: string };

export const modelStatus = () => invoke<ModelStatus>("model_status");

export function downloadModel(onEvent: (e: DlEvent) => void) {
  const ch = new Channel<DlEvent>();
  ch.onmessage = onEvent;
  return invoke<void>("download_model", { onEvent: ch });
}

export function chat(messages: ChatMsg[], onToken: (t: string) => void) {
  const ch = new Channel<string>();
  ch.onmessage = onToken;
  return invoke<void>("chat", { messages, onToken: ch });
}
