<div align="center">

# ✨ Lume

**Seu segundo cérebro, 100% local — onde uma IA lê e edita o que você pensa.**

_Lume — luz para o conhecimento._

`Rust` · `Tauri 2` · `React` · `OKF` · `IA on-device` · `offline-first`

</div>

---

## O que é

**Lume** é um app de desktop leve onde uma **IA local** conversa com você, **lê** e **edita** o seu "segundo cérebro": notas, diário, gostos, pessoas, metas e fatos sobre você. Tudo fica **no seu computador** — sem nuvem, sem conta, sem vazamento.

O cérebro é guardado no **OKF (Open Knowledge Format)** do Google: um diretório de arquivos **Markdown + frontmatter YAML**, legível por humanos e por IA, versionável e portátil. A IA não fala com um banco proprietário — ela edita os mesmos arquivos `.md` que você pode abrir em qualquer editor.

> **Status:** 🚧 Fase 0 (fundação). O parser OKF e a listagem de notas já funcionam. Veja as [decisões](docs/DECISIONS.md) e as [specs](.specs/).

## Pilares

- 🔒 **100% local / offline** — seus dados nunca saem da máquina.
- 🪶 **Leve e rápido** — Tauri usa o webview do SO; binário de poucos MB, não centenas (vs Electron).
- 🧠 **IA no centro** — modelos on-device leem e editam o cérebro via um harness de _tool-use_.
- 🎙️ **Áudio** — fale e o Lume transcreve (Whisper local) e registra no cérebro.
- 🔎 **Busca, tags, filtros, metas** — índice híbrido (full-text + semântico + grafo de links).
- 🎮 **Gamificação** — streaks, XP e conquistas para criar o hábito.
- 🎨 **Bonito e animado** — shadcn/ui + Tailwind v4 + ícones e animações respeitando `prefers-reduced-motion`.

## Os modelos

| Modelo | Papel | Quando |
|---|---|---|
| **Gemma 3n E4B** | Padrão — chat leve sobre o cérebro **+ transcrição de áudio** (multimodal, ~3 GB) | Sempre |
| **Ornith-1.0-9B** | Modo "agente" — edições multi-passo com raciocínio (`<think>`, tool-calling) | Opt-in, GPU ≥ 8 GB |

A **GPU é detectada automaticamente** e o modelo/quantização/backend são escolhidos sozinhos (com fallback para CPU). Detalhes em [docs/MODELS.md](docs/MODELS.md).

## Rodando localmente

Pré-requisitos: **Rust** 1.96+, **Node** 24+, **pnpm** 10+ (e as [dependências de sistema do Tauri](https://v2.tauri.app/start/prerequisites/)).

```bash
pnpm install
pnpm tauri dev      # app desktop em modo dev
```

Outros comandos:

```bash
pnpm build                                           # checa tipos + build do front
cargo test   --manifest-path src-tauri/Cargo.toml    # testes do core Rust
cargo clippy --manifest-path src-tauri/Cargo.toml    # lint
```

## Estrutura

```
lume/
├── src/                  # frontend React + shadcn/ui + Tailwind v4
├── src-tauri/            # core Rust (parser OKF, comandos, futura cripto/harness/índice)
│   └── src/okf.rs        # parser do formato OKF
├── brain.example/        # cérebro de exemplo (1 arquivo por type)
├── docs/                 # ARCH · STACK · MODELS · SECURITY · DECISIONS
├── .specs/               # specs EARS por feature
└── .claude/              # skills, agents e hooks do Claude Code
```

## Documentação

- [Arquitetura](docs/ARCH.md) · [Stack](docs/STACK.md) · [Modelos & GPU](docs/MODELS.md) · [Segurança](docs/SECURITY.md) · [Decisões (ADRs)](docs/DECISIONS.md)

## Segurança

Lume guarda dados pessoais sensíveis. Criptografia em repouso (XChaCha20-Poly1305 + Argon2id), a IA roda com _egress lockdown_ e o markdown é sanitizado antes de renderizar. Política de reporte em [SECURITY.md](SECURITY.md).

## Licença

[MIT](LICENSE) © 2026 Yefclub
