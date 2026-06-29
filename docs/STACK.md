# Stack do LUME

> Versões verificadas em **junho de 2026**. Não altere libs nem versões sem revalidar.

Esta é a stack de crates/libs do núcleo Rust do LUME, organizada por camada da arquitetura (ver `ARCH.md`). A coluna **Maturidade** indica o nível de confiança em produção.

---

## Tabela por camada

| Camada | Tecnologia | Por quê | Maturidade |
|---|---|---|---|
| Frontend | React + shadcn/ui + Tailwind v4 | Ecossistema rico de componentes para UI de IA; decisão do dono do projeto (ver ADR em `DECISIONS.md`) | Estável |
| Frontend ↔ Core (streaming) | `tauri::ipc::Channel<T>` | Streaming de tokens tipado e barato, sem serialização JSON por token; ordenação previsível | Estável |
| Harness de IA | rig-core v0.39.0 | Loop de tool-use, integração de modelos; ~1.37M downloads | Estável (amplo uso) |
| Runtime de modelo (texto) | llama-cpp-2 v0.1.150 | Inferência GGUF com suporte a GBNF (gramática) para saída estrita | Estável |
| Runtime de modelo (áudio) | mistral.rs (`mistralrs`) v0.8.1 | Rust puro; caminho para multimodal/áudio do Gemma 3n | **Validar/prototipar cedo** |
| Transcrição (fala→texto) | whisper-rs v0.16.0 | Whisper.cpp via FFI; bindings maduros | Estável — **puxar do Codeberg** (ver nota) |
| Captura de microfone | cpal | Captura de áudio cross-platform em Rust | Estável |
| GPU: vendor/backend | wgpu | Detecção de adaptador/backend cross-vendor (camada 1 da detecção) | Estável — **não reporta VRAM** (ver nota) |
| VRAM: NVIDIA | nvml-wrapper v0.12.1 | Leitura precisa de VRAM via NVML | Estável |
| VRAM: Windows (qualquer GPU) | crate `windows` (DXGI `QueryVideoMemoryInfo`) | VRAM via DXGI para qualquer GPU no Windows | Estável |
| VRAM: Apple | objc2-metal (`recommendedMaxWorkingSetSize`) | Orçamento de VRAM recomendado pelo Metal | Estável |
| Índice de texto | SQLite FTS5 (BM25) | Busca full-text com ranking BM25, embutida no SQLite | Estável |
| Índice vetorial | sqlite-vec v0.1.0 | KNN vetorial dentro do mesmo SQLite (sem serviço externo) | Nova, porém adotada — pin de versão |
| Embeddings | fastembed-rs v5.17.2 ou GGUF | Geração de embeddings local; opção GGUF para reuso do runtime | Estável |
| Frontmatter | gray_matter / serde_yaml | Parse do YAML frontmatter dos arquivos OKF | Estável |
| Grafo (edges/tags) | petgraph | Estrutura e algoritmos de grafo para navegação do cérebro | Estável |
| Watcher de arquivos | notify + notify-debouncer-full | Detecção de mudanças no diretório OKF com debounce (1-2s) | Estável |
| Banco de dados | rusqlite | Binding SQLite idiomático em Rust | Estável |
| Cripto AEAD | chacha20poly1305 (XChaCha20-Poly1305) | Cifra autenticada por arquivo; nonce estendido (XChaCha) | Estável |
| KDF | argon2 (Argon2id) | Derivação de chave a partir da senha (params OWASP 2026) | Estável |
| Segredos em RAM | secrecy + zeroize | Mantém CEK/senha protegidas e zera a memória ao descartar | Estável |
| Keychain do SO | keyring v4.1.2 | Acesso ao cofre de credenciais do sistema | Estável — **ver limites** em `SECURITY.md` |

---

## Notas importantes por dependência

- **whisper-rs — puxar do Codeberg.** Usar `codeberg.org/tazz4843/whisper-rs`. O espelho no GitHub foi **arquivado em 2025-07-30**; o Codeberg é o repositório ativo.
- **wgpu não reporta VRAM.** O wgpu serve apenas para detectar vendor/backend (camada 1). A leitura de VRAM precisa de APIs específicas por plataforma (camada 2: NVML / DXGI / Metal) — ver issue `gfx-rs/wgpu#2447` e a estratégia de detecção em duas camadas em `MODELS.md`.
- **mistral.rs — validar cedo.** É Rust puro e é o caminho previsto para o áudio do Gemma 3n, mas deve ser prototipado já no início para confirmar viabilidade. (Para áudio de produção, a transcrição usa **Whisper.cpp**, não o encoder nativo do Gemma — ver `MODELS.md`.)
- **sqlite-vec v0.1.0.** Versão inicial; fixar (pin) a versão e acompanhar atualizações.

---

## Descartados e por quê

| Descartado | Motivo |
|---|---|
| **kalosm** | Projeto **morto desde fevereiro de 2025**. Não usar. |
| **rig-llama-cpp** | Imaturo (~215 downloads). Se for usado, fixar versão e validar com cuidado — preferir **llama-cpp-2 direto**. |
| **tauri-plugin-stronghold** | **Depreciado**, será removido no Tauri v3. **Não basear a criptografia nele.** A cripto do LUME é própria (Argon2id + XChaCha20-Poly1305) no Core Rust. |
| Encoder de áudio nativo do **Gemma 3n** | Cap rígido de 30s, "instructional leakage" e sem caminho Rust de produção hoje. Áudio usa Whisper.cpp (ver `MODELS.md`). |
| Eventos JSON do Tauri (para streaming) | Custo de serialização por token e ordenação menos previsível. Usa-se `tauri::ipc::Channel<T>`. |

---

## Referências cruzadas

- Como cada camada se encaixa: `ARCH.md`
- Modelos, quantizações e detecção de GPU/VRAM: `MODELS.md`
- Uso de cripto e gerência de segredos: `SECURITY.md`
- Justificativas de escolha (ADRs): `DECISIONS.md`
