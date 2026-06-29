# AGENTS.md

Guia para agentes de código (Claude Code, Codex e afins) trabalhando no **Lume**.

As regras completas vivem em **[`CLAUDE.md`](CLAUDE.md)** — leia-o primeiro. Resumo do que mais importa:

- **Projeto:** app desktop Rust + Tauri 2 + React; segundo cérebro pessoal **100% local/offline**. Não é web/SaaS.
- **Dados:** o cérebro é um bundle **OKF** (Markdown + frontmatter; `type` obrigatório). OKF é a **fonte de verdade**; o SQLite é índice **derivado/descartável**.
- **IA:** Gemma 3n E4B (default + áudio) e Ornith-1.0-9B (agente opt-in). Editar notas por substituição exata de string.
- **Segurança:** cripto e segredos só no Core Rust; LLM com egress lockdown; sanitizar markdown antes de renderizar; nunca commitar `brain/`, `vault/` ou segredos.
- **Build:** `pnpm install` · `pnpm tauri dev` · `cargo test/clippy --manifest-path src-tauri/Cargo.toml` · `pnpm build`.
- **Processo:** PT-BR; features >2 arquivos exigem spec EARS em `.specs/`; Conventional Commits; identidade de commit = GitHub noreply (sem vínculo corporativo).

Skills e subagentes em [`.claude/`](.claude/).
