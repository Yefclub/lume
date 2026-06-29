# Registro de Decisões Arquiteturais (ADRs) — LUME

> Decisões curtas no formato **Contexto / Decisão / Consequência**. Cada ADR registra uma escolha estrutural e seu trade-off.

---

## ADR-001 — OKF como formato do cérebro

**Contexto.** O cérebro precisa de um formato durável, legível por humanos, versionável e independente de qualquer banco de dados proprietário.

**Decisão.** Adotar o formato **OKF**: um diretório de arquivos `.md` com **frontmatter YAML** (campo `type` obrigatório), tratado como a **única fonte da verdade**. Qualquer índice (SQLite) é derivado e descartável.

**Consequência.** O usuário tem posse total dos dados em texto plano (portável, inspecionável, "à prova de futuro"). Em contrapartida, o conteúdo em disco precisa ser cifrado em repouso (ver `SECURITY.md`), e a busca/relacionamentos exigem um índice derivado reconstruível.

---

## ADR-002 — Tauri em vez de Electron

**Contexto.** O app é desktop, local-first, com um núcleo Rust pesado (cripto + IA). É preciso uma shell desktop que case com esse núcleo.

**Decisão.** Usar **Tauri 2** (webview nativa + backend Rust) em vez de Electron.

**Consequência.** Binário menor, menor consumo de memória, e o núcleo já é Rust — toda a cripto/IA vive no mesmo processo, com fronteira IPC clara entre webview e Core. Custo: depende da webview do SO (variação entre plataformas) em vez de um Chromium embarcado uniforme.

---

## ADR-003 — React + shadcn/ui (e não Svelte)

**Contexto.** A UI terá muitos componentes voltados a IA (chat, streaming, animação de edições). É preciso um ecossistema de componentes rico.

**Decisão.** Usar **React + shadcn/ui + Tailwind v4**. **Decisão do dono do projeto**, motivada pela disponibilidade de componentes de IA prontos.

**Consequência.** Acesso amplo a componentes e exemplos para UIs de IA, acelerando o desenvolvimento da experiência. Trade-off ante **Svelte**: abrir mão de um runtime mais enxuto e de menos boilerplate em favor de ecossistema e familiaridade.

---

## ADR-004 — SQLite como índice derivado

**Contexto.** Busca full-text, busca vetorial (semântica) e navegação por grafo (edges/tags) precisam ser rápidas, mas não devem virar uma segunda fonte da verdade.

**Decisão.** Usar **SQLite** como índice **derivado e descartável**: FTS5 (BM25) para texto, sqlite-vec para KNN vetorial, e uma tabela de edges/tags para o grafo. Reconstruível a partir dos `.md` a qualquer momento.

**Consequência.** Buscas rápidas e embutidas (sem serviço externo), e o índice pode ser apagado/regerado sem perda de dados canônicos. Porém o `.db` é uma cópia em texto plano e precisa da **mesma proteção em repouso** dos `.md` (ver `SECURITY.md`).

---

## ADR-005 — Whisper para áudio (e não o encoder do Gemma 3n)

**Contexto.** A entrada por voz precisa transcrever fala em texto de forma confiável e em produção.

**Decisão.** Usar **Whisper.cpp** (via whisper-rs) para transcrição, **não** o encoder de áudio nativo do Gemma 3n.

**Consequência.** Transcrição sem o cap rígido de 30s, sem "instructional leakage" e com caminho Rust de produção viável. O Gemma 3n permanece como modelo de chat/multimodal padrão; apenas a transcrição é delegada ao Whisper. (Detalhes em `MODELS.md`.)

---

## ADR-006 — Dois modelos: Gemma default + Ornith opt-in

**Contexto.** Há um trade-off entre rodar em qualquer hardware (inclusive sem GPU) e oferecer um agente mais capaz para quem tem GPU.

**Decisão.** Adotar **dois modelos**: **Gemma 3n E4B** como default (chat leve + áudio, ~3 GB, multimodal) e **Ornith-1.0-9B** como **modo agente opt-in** (MIT, GGUF, `<think>`, tool-calling estilo Qwen3, sem áudio), liberado só com **GPU ≥ 8 GB**. A seleção é dirigida pela VRAM detectada.

**Consequência.** Funciona em máquinas modestas (até CPU) e escala para agentes mais fortes conforme a GPU. Custo: manter dois caminhos de modelo e a lógica de detecção de hardware (ver tabela VRAM→modelo em `MODELS.md`).

---

## ADR-007 — Runtime in-process (e não sidecar)

**Contexto.** O runtime de inferência pode rodar embarcado no processo Rust ou como processo separado (sidecar).

**Decisão.** Rodar o runtime de modelo **in-process** (llama-cpp-2 para texto; mistral.rs a validar para áudio do Gemma), dentro do Core Rust.

**Consequência.** Menos latência e sem IPC entre Core e runtime; os segredos/decifragem ficam no mesmo limite de processo já confiável. Trade-off: uma falha do runtime afeta o processo principal, e o acoplamento de versões/builds nativas é mais rígido do que com um sidecar isolável.

---

## Referências cruzadas

- Visão arquitetural e princípios: `ARCH.md`
- Stack e descartados: `STACK.md`
- Modelos e detecção de GPU: `MODELS.md`
- Modelo de ameaça: `SECURITY.md`
