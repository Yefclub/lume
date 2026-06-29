# Changelog

O Lume usa os **Releases do GitHub** como changelog principal — cada release estável
traz os instaladores (`.exe`/`.msi`, `.dmg`, `.AppImage`/`.deb`) e as notas geradas
a partir dos commits.

- Releases estáveis seguem **SemVer**: `vX.Y.Z`.
- A versão é mantida em sincronia em três arquivos (`package.json`,
  `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`) — use `pnpm release:prepare`.
- PRs para `main` devem ter exatamente uma label `release:patch`, `release:minor`
  ou `release:major` e já trazer a versão bumpada (validado por CI).
- Ao chegar em `main` com uma versão nova, o workflow **Publish stable release**
  cria a tag `vX.Y.Z`, que dispara o build dos instaladores em
  **Windows / macOS / Linux** e publica o Release.

📦 Downloads e histórico: https://github.com/Yefclub/lume/releases

## Não publicado

Mudanças em desenvolvimento aparecem aqui até virarem uma release estável.

- Fundação (Fase 0): app Tauri + React, parser OKF, UI de listagem, governança e CI.
- Sistema de release/versionamento e build de instaladores por GitHub Actions.
