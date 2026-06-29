---
name: release
description: Cortar uma release do Lume — bump de versão, tag e build dos instaladores (.exe/.dmg/.AppImage) por Actions
---

# Release — Lume

Publica uma versão estável: bumpa os 3 arquivos de versão, gera a tag `vX.Y.Z` e
dispara o build dos instaladores (Windows/macOS/Linux) no GitHub Actions.

## Versão = 3 arquivos em sincronia

`package.json` · `src-tauri/tauri.conf.json` · `src-tauri/Cargo.toml`

Nunca edite à mão — use o script, que valida e sincroniza. O CI (`check-versions`)
falha se divergirem.

## Fluxo solo (direto em `main`)

1. `pnpm release:prepare <patch|minor|major>` — calcula a próxima versão a partir da última tag estável e bumpa os 3 arquivos.
2. `cargo update -p lume --manifest-path src-tauri/Cargo.toml` — sincroniza o `Cargo.lock`.
3. `git commit -m "chore(release): vX.Y.Z"` e `git push origin main`.
4. **`version-main.yml`** detecta a versão nova, cria a tag `vX.Y.Z` e dispara o release (a tag é criada com `GITHUB_TOKEN`, que não auto-dispara workflows — por isso o dispatch explícito, evitando build duplo).
5. **`release.yml`** builda e publica o Release com os instaladores. Acompanhe: `gh run watch`.

## Fluxo via PR (estilo Voxen, opcional)

- `pnpm release:prepare <bump>` numa branch `release/vX.Y.Z`.
- `gh pr create --base main --label release:<bump> --title "release: vX.Y.Z"`.
- O gate **`pr-release-labels`** valida a label única + o bump nos 3 arquivos. Merge → tag → build.

## Verificar / depurar

- `gh run list --workflow release.yml` · `gh run watch <id> --exit-status`
- Assets esperados no Release: `.exe` (NSIS) + `.msi` (Windows), `.dmg` (macOS), `.AppImage` + `.deb` (Linux).
- Build local de instalador: `pnpm tauri build`.

## Notas

- Builds **não assinados** (Fase 0): SmartScreen (Windows) / Gatekeeper (macOS) avisam na 1ª execução. Code signing é follow-up.
- Releases marcados como **pré-release** (`prerelease: true`) até o v1.
