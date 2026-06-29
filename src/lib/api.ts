import { invoke } from "@tauri-apps/api/core";
import type { OkfNote } from "./types";

export const listNotes = () => invoke<OkfNote[]>("list_brain_notes");
export const readNote = (path: string) => invoke<string>("read_note", { path });
export const saveNote = (path: string, content: string) =>
  invoke<OkfNote>("save_note", { path, content });
export const createNote = (noteType: string, title: string) =>
  invoke<OkfNote>("create_note", {
    noteType,
    title,
    timestamp: new Date().toISOString(),
  });
export const deleteNote = (path: string) => invoke<void>("delete_note", { path });
export const brainPath = () => invoke<string>("brain_path");
