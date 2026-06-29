#!/usr/bin/env node
// Garante que os 3 arquivos de versão estão em sincronia. Roda no CI.
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8")).version;
const conf = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")).version;
const cargo = (readFileSync("src-tauri/Cargo.toml", "utf8").match(/^version = "(.*)"/m) || [])[1];

const ok = pkg === conf && pkg === cargo;
console.log(`package.json=${pkg}  tauri.conf.json=${conf}  Cargo.toml=${cargo}  ->  ${ok ? "OK" : "DIVERGENTE"}`);
if (!ok) {
  console.error("Versões divergentes. Rode: pnpm release:prepare <patch|minor|major> (ou alinhe manualmente).");
  process.exit(1);
}
