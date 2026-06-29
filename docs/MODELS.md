# Modelos de IA do LUME

> Toda inferência roda **localmente, offline**. A seleção de modelo é dirigida pela GPU detectada na máquina do usuário.

Este documento descreve a estratégia de dois modelos, o mapeamento de VRAM para modelo/quantização/backend, a detecção de GPU em duas camadas e a decisão de áudio (Whisper, não Gemma).

---

## Estratégia de dois modelos

O LUME adota **dois modelos** com papéis distintos. A escolha é automática a partir da GPU detectada, com o modo agente sendo **opt-in**.

### Gemma 3n E4B — **default**

- **Papel:** chat leve do dia a dia + entrada de áudio.
- **Multimodal on-device:** texto + visão + áudio.
- **Recursos:** ~3 GB de VRAM, contexto de 32K, Per-Layer Embeddings e arquitetura MatFormer.
- **Quando:** modelo padrão para todos; em máquinas sem GPU forte roda em CPU (variantes E2B/E4B Q4).

### Ornith-1.0-9B — **modo agente (opt-in)**

- **Papel:** modo agente mais capaz, com raciocínio explícito.
- **Licença:** MIT. Formato GGUF.
- **Recursos:** emite bloco `<think>` (raciocínio), tool-calling estilo Qwen3. **Sem áudio.**
- **Quando:** habilitado **somente com GPU ≥ 8 GB** (Q4_K_M ≈ 5.63 GB). É uma escolha consciente do usuário.

---

## Tabela VRAM → modelo + quantização + backend

A VRAM detectada determina o melhor modelo/quantização. O backend é escolhido pelo vendor da GPU.

| VRAM detectada | Modelo + quantização | Observação |
|---|---|---|
| Sem GPU / < 4 GB | **Gemma E2B/E4B Q4** em **CPU** | Modo somente-CPU |
| 6–8 GB | **Gemma E4B** + libera **Ornith-9B Q4** (Q4_K_M ≈ 5.63 GB) | Modo agente passa a ser opt-in |
| 10–12 GB | **Ornith-9B Q5/Q6** | Mais qualidade no agente |
| 16 GB | **Ornith-9B Q8** | Quantização alta |
| 24 GB | **Ornith-35B-MoE Q4** (≈ 21.2 GB) | Topo de linha |

### Backend ladder (por vendor)

| GPU / vendor | Backend |
|---|---|
| NVIDIA | CUDA |
| AMD | Vulkan |
| Apple | Metal |
| Intel | Vulkan |
| Fallback (vendor desconhecido) | Vulkan |
| Sem GPU | CPU |

---

## Detecção de GPU em duas camadas

A detecção é feita em **duas camadas**, porque a primeira identifica o hardware mas **não** reporta a memória.

### Camada 1 — vendor/backend via `wgpu`

O `wgpu` identifica o adaptador e o vendor (NVIDIA / AMD / Apple / Intel / desconhecido) e orienta a escolha do backend (CUDA / Vulkan / Metal / CPU).

> **`wgpu` não reporta VRAM** (issue `gfx-rs/wgpu#2447`). Por isso é necessária a camada 2.

### Camada 2 — VRAM via API específica de plataforma

A quantidade de VRAM (que decide o modelo/quant na tabela acima) é lida por API nativa:

| Plataforma / GPU | Fonte de VRAM |
|---|---|
| NVIDIA | **nvml-wrapper v0.12.1** (NVML) |
| Windows (qualquer GPU) | crate **`windows`** — DXGI `QueryVideoMemoryInfo` |
| Apple | **objc2-metal** — `recommendedMaxWorkingSetSize` |

Fluxo: `wgpu` diz **qual** GPU e **qual** backend → NVML/DXGI/Metal dizem **quanta** VRAM → a tabela VRAM→modelo decide o que carregar.

---

## Decisão de áudio: Whisper, não Gemma

Embora o Gemma 3n tenha encoder de áudio nativo, **o LUME usa Whisper.cpp** (via whisper-rs) para transcrição.

**Por que não o encoder nativo do Gemma 3n:**

- **Cap rígido de 30s** de áudio por vez.
- **"Instructional leakage"** (vazamento de instruções no fluxo de áudio).
- **Sem caminho Rust de produção hoje.**

**Pipeline de áudio adotado:** captura via **cpal** → transcrição via **Whisper.cpp** (whisper-rs, puxado do Codeberg) → texto entra no harness. O Gemma 3n segue sendo o modelo de chat/multimodal padrão; apenas a **transcrição** é delegada ao Whisper.

---

## Referências cruzadas

- Camadas e fluxo: `ARCH.md`
- Crates de runtime, VRAM e versões: `STACK.md`
- ADRs de áudio (Whisper) e de dois modelos: `DECISIONS.md`
