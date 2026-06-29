#!/usr/bin/env node
// Prepara uma release do Lume: calcula a próxima versão a partir da última tag
// estável (ou do package.json) e sincroniza os TRÊS arquivos de versão:
//   package.json · src-tauri/tauri.conf.json · src-tauri/Cargo.toml
//
// Uso: node scripts/prepare-release.mjs <patch|minor|major>
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const bump = process.argv[2];
if (!["patch", "minor", "major"].includes(bump)) {
  console.error("Uso: pnpm release:prepare <patch|minor|major>");
  process.exit(2);
}

const git = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const parse = (v) => {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v);
  return m ? m.slice(1).map(Number) : null;
};
const cmpDesc = (a, b) => {
  const A = parse(a);
  const B = parse(b);
  for (let i = 0; i < 3; i += 1) if (A[i] !== B[i]) return B[i] - A[i];
  return 0;
};
const nextVersion = (v, kind) => {
  const n = [...v];
  if (kind === "major") {
    n[0] += 1;
    n[1] = 0;
    n[2] = 0;
  } else if (kind === "minor") {
    n[1] += 1;
    n[2] = 0;
  } else {
    n[2] += 1;
  }
  return n.join(".");
};

const tags = git(["tag", "--list", "v*"])
  .split("\n")
  .map((t) => t.trim())
  .filter(Boolean)
  .filter(parse);

let base = tags.sort(cmpDesc)[0]?.replace(/^v/, "");
if (!base) base = String(JSON.parse(readFileSync("package.json", "utf8")).version).split("-")[0];

const parsedBase = parse(base);
if (!parsedBase) {
  console.error(`Versão base inválida: ${base}`);
  process.exit(1);
}

const nv = nextVersion(parsedBase, bump);

// Arquivos JSON
for (const file of ["package.json", "src-tauri/tauri.conf.json"]) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  json.version = nv;
  writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
}

// Cargo.toml — apenas a versão do [package] (primeira linha `version = "..."`)
const cargoPath = "src-tauri/Cargo.toml";
const cargo = readFileSync(cargoPath, "utf8").replace(/^version = ".*"/m, `version = "${nv}"`);
writeFileSync(cargoPath, cargo);

console.log(`Release preparada: ${base} -> ${nv} (${bump})`);
console.log("");
console.log("Fluxo solo (main):");
console.log("  cargo update -p lume --manifest-path src-tauri/Cargo.toml  # sincroniza Cargo.lock");
console.log("  git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock");
console.log(`  git commit -m "chore(release): v${nv}"`);
console.log("  git push origin main   # version-main.yml cria a tag e dispara o build dos instaladores");
console.log("");
console.log("Ou via PR de release:");
console.log(`  gh pr create --base main --label release:${bump} --title "release: v${nv}"`);
