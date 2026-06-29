# Arquitetura do LUME

> **LUME** — seu segundo cérebro pessoal, 100% local e offline. Rust + Tauri 2 + React/shadcn. Formato OKF. IA executada inteiramente na sua máquina.

Este documento descreve a arquitetura em camadas, o fluxo de dados ponta a ponta e os princípios estruturais que guiam todas as decisões de design.

---

## Visão geral em camadas

O LUME é estritamente dividido entre uma **camada de apresentação** (webview, sem segredos) e um **núcleo Rust** (toda a criptografia, todos os segredos, toda a IA). A fronteira entre os dois é a IPC do Tauri.

```
+---------------------------------------------------------------------------+
|                        FRONTEND  (webview Tauri)                          |
|                                                                           |
|   React + shadcn/ui + Tailwind v4                                         |
|   - Lista de notas, editor, painel de chat, animacoes de IA              |
|   - Streaming de tokens via  tauri::ipc::Channel<T>  (NUNCA eventos JSON) |
|   - SEM segredos, SEM chaves, SEM cripto                                  |
+----------------------------------+----------------------------------------+
                                   |
                          IPC Tauri (commands)
                       Channel<T> para streaming
                                   |
+----------------------------------v----------------------------------------+
|                          CORE  (Rust)                                      |
|   TODA a cripto, TODOS os segredos e a CEK vivem aqui.                     |
|                                                                           |
|   +-------------------------+      +--------------------------------+      |
|   |  Harness de IA          |      |  Runtime de modelo             |      |
|   |  rig-core               |<---->|  texto: llama-cpp-2 (GGUF)     |      |
|   |  - loop tool-use        |      |        GBNF p/ saida estrita   |      |
|   |    LIMITADO             |      |  audio: mistral.rs (Gemma 3n)  |      |
|   |  - GBNF (gramatica)     |      |  transcricao: whisper-rs       |      |
|   +-----------+-------------+      +--------------------------------+      |
|               |                                                            |
|               | le/edita o cerebro via TOOLS (str_replace)                |
|               v                                                            |
|   +-------------------------+      +--------------------------------+      |
|   |  Indice SQLite          |      |  Storage OKF cifrado           |      |
|   |  (DERIVADO/descartavel) |<-----|  (FONTE DA VERDADE)            |      |
|   |  - FTS5 BM25 (texto)    |reidx |  - diretorio de arquivos .md   |      |
|   |  - sqlite-vec KNN (vet) |      |  - frontmatter YAML (type)     |      |
|   |  - edges/tags (grafo)   |      |  - XChaCha20-Poly1305 p/ arq.  |      |
|   +-------------------------+      +----------------+---------------+      |
|               ^                                     |                      |
|               |              watcher (notify,       |                      |
|               +----- reindexa  debounce 1-2s) ------+                      |
+---------------------------------------------------------------------------+
```

---

## Fluxo ponta a ponta

O caminho de uma interação completa, da fala do usuário até a UI animar:

1. **Entrada** — o usuário fala ou digita.
2. **Áudio → texto** — se for fala, o áudio capturado (cpal) passa por **Whisper** (whisper-rs) e vira texto.
3. **Harness lê o cérebro** — o harness de IA (rig-core) roda um loop de tool-use **limitado**, usando ferramentas para ler as notas relevantes do cérebro (busca FTS5/BM25, KNN vetorial via sqlite-vec, navegação por edges/tags).
4. **IA edita OKF** — a IA aplica edições nos arquivos OKF por meio de uma ferramenta de edição (`str_replace`), escrevendo direto nos `.md` (a fonte da verdade).
5. **Watcher reindexa** — o watcher (notify + notify-debouncer-full, debounce de 1-2s) detecta a mudança no diretório e reconstrói o índice SQLite derivado.
6. **UI anima** — a UI recebe os tokens em streaming via `tauri::ipc::Channel<T>` e anima as mudanças (nota nova, edição, etc.).

```
usuario fala/digita
        |
        v
 (audio) Whisper ----> texto
        |
        v
 harness le o cerebro via tools (FTS5 / sqlite-vec / edges)
        |
        v
 IA edita arquivos OKF  (str_replace nos .md)
        |
        v
 watcher (notify, debounce 1-2s) reindexa o SQLite
        |
        v
 UI anima  (streaming via Channel<T>)
```

---

## Os 3 princípios estruturais

### 1. OKF é a verdade; SQLite é índice descartável

Os arquivos OKF (`.md` com frontmatter YAML) são a **única fonte da verdade**. O banco SQLite — com FTS5 (BM25), KNN vetorial (sqlite-vec) e a tabela de edges/tags — é um **índice derivado e descartável**, reconstruível a qualquer momento a partir dos `.md`. Se o `.db` for apagado ou corromper, ele é regerado pela varredura do diretório. Nenhum dado canônico vive somente no índice.

> Consequência de segurança: como o `.db` é uma **cópia em texto plano** do conteúdo dos `.md`, ele exige **a mesma proteção em repouso** que os arquivos OKF (ver `SECURITY.md`).

### 2. Toda cripto e todo segredo ficam no Core Rust

A webview **nunca** vê chaves, senhas ou a CEK (Content Encryption Key). Toda criptografia (XChaCha20-Poly1305), derivação de chave (Argon2id) e gerência de segredos em RAM (secrecy + zeroize) acontecem no núcleo Rust. O frontend é tratado como uma superfície potencialmente hostil: recebe apenas dados já decifrados e sob demanda, através da IPC.

### 3. Streaming por canal tipado, não por eventos JSON

O streaming de tokens e atualizações de UI usa **`tauri::ipc::Channel<T>`**, não o sistema de eventos com payloads JSON. O canal tipado é mais barato (sem serialização JSON por token), preserva os tipos e dá uma ordenação previsível para a animação progressiva da resposta da IA.

---

## Referências cruzadas

- Tecnologias e maturidade de cada camada: `STACK.md`
- Estratégia de modelos e detecção de GPU: `MODELS.md`
- Modelo de ameaça (at-rest + IA como canal de exfiltração): `SECURITY.md`
- Registro de decisões arquiteturais: `DECISIONS.md`
