#!/usr/bin/env bash
# PostToolUse (Lume): quando um arquivo .rs é editado, formata e checa o crate.
# Saída com exit 2 devolve o erro ao Claude para auto-correção imediata.
#
# Parsing do payload sem jq (jq pode não estar instalado): extrai file_path
# do JSON entregue no stdin pelo Claude Code.
set -u

payload="$(cat)"
file="$(printf '%s' "$payload" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

case "$file" in
  *.rs)
    # fmt é instantâneo e idempotente
    cargo fmt --manifest-path src-tauri/Cargo.toml >/dev/null 2>&1 || true
    # check é incremental (rápido após a 1ª vez)
    if ! err="$(cargo check --manifest-path src-tauri/Cargo.toml --quiet 2>&1)"; then
      echo "❌ cargo check falhou após editar ${file}:" >&2
      printf '%s\n' "$err" | tail -40 >&2
      exit 2
    fi
    ;;
esac

exit 0
