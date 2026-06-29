# Skills do LUME

Fluxos reutilizáveis para tarefas recorrentes no LUME (Rust + Tauri 2 + React/shadcn, IA 100% local, formato OKF). Cada skill descreve **quando usar** e os **passos**. Invoque pelo nome quando o gatilho natural aparecer.

| Skill | Quando usar | Trigger natural |
|---|---|---|
| `okf` | Criar/editar/validar arquivos OKF do cérebro (1 conceito = 1 `.md`, `type` obrigatório). | "adiciona uma nota", "registra que eu prefiro X", "cria uma meta", "guarda esse fato" |
| `harness` | Desenhar/depurar o loop de tool-use (rig-core): tools, GBNF, cap de iterações, erro-como-dado. | "o agente não chama a tool certa", "está loopando", "str_replace falhou", "adicionar uma tool" |
| `gpu-model-setup` | Detecção de GPU/VRAM + escolha de modelo/quant/backend e fallback CPU. | "qual modelo carregar", "detectar GPU", "configurar inferência", "está sem VRAM" |
| `ui-anim` | Animação/streaming performáticos no webview (transform/opacity, reduced-motion, 3 engines). | "anima isso", "transição", "streaming de tokens", "tela preta no Linux", "está travando" |
| `architect` | Discovery + scaffolding de um módulo novo; definir fronteira Rust/React/dados. | "quero construir X", "vamos adicionar o módulo Y", "onde isso encaixa" |
| `spec` | Spec EARS em `.specs/NNN-slug.md` antes de feature não-trivial (>2 arquivos). | "antes de implementar", "escreve a spec", "quais os requisitos" |
| `research` | Pesquisa estruturada com trade-offs (WebSearch/WebFetch); validar libs/modelos antes de afirmar. | "compara as opções", "essa lib existe?", "qual a melhor abordagem", "tem modelo novo pra isso?" |
| `ship` | Branch → PR → CI → review → merge via gh CLI, Conventional Commits. | "abre um PR", "sobe isso", "manda pra review", "faz o merge" |
| `review-pr` | Revisão técnica de PR (correção, segurança, simplicidade) para Rust/Tauri/React. | "revisa esse PR", "dá uma olhada nesse diff", "isso está bom pra mergear?" |
| `release` | Cortar uma release: bump de versão (3 arquivos), tag e build dos instaladores. | "corta uma release", "publica nova versão", "gera o .exe", "bump de versão" |
| `changelog` | Resumir a atividade p/ notas de release ou status. | "o que mudou", "monta o changelog", "resumo da semana" |

> **Skills são vivos.** Depois de executar uma skill, peça feedback ao usuário e **edite o `SKILL.md`** para incorporar o que funcionou melhor. Eles devem evoluir com o projeto, não enrijecer.

Agentes relacionados (em `../agents/`): `code-reviewer` (revisor técnico brutalmente honesto) e `spec-author` (escreve specs EARS).
