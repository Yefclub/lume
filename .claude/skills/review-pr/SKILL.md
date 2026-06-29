---
name: review-pr
description: Revisão técnica de um PR focada em Rust/Tauri/React. Use quando for revisar um pull request ou um diff antes do merge, avaliando correção, segurança e simplicidade no idioma do projeto LUME.
---

# Review-PR — revisão técnica (Rust/Tauri/React)

Revisão objetiva e honesta de PR no LUME. Foco em **correção**, **segurança** e **simplicidade** — não em estilo subjetivo. Para uma passada autônoma e brutalmente honesta, delegue ao agente `code-reviewer`.

## Quando usar
- Revisar um PR aberto ou um diff local antes de integrar.
- Segunda opinião técnica sobre uma mudança.

## O que ler
- `gh pr diff <n>` (ou o diff local). Leia o diff inteiro; abra arquivos vizinhos quando o contexto for necessário para julgar correção.
- A spec relacionada (`.specs/NNN-...`) se existir — o PR cumpre os requisitos EARS?

## Eixos de revisão

### 1. Correção (prioridade máxima)
- A lógica faz o que a spec/descrição diz? Casos de borda?
- **Rust**: `unwrap`/`expect`/`panic!` em caminho de produção; `Result`/`?` tratados; `unsafe` justificado; sem deadlock/`.await` segurando lock.
- **Erro-como-dado** no harness: falha de tool vira observação, não panic para fora do loop (ver skill `harness`).
- **Tauri**: comandos (`#[tauri::command]`) validam input; streaming usa `Channel<T>`.
- **React**: dependências de `useEffect` corretas; sem estado derivado redundante; sem race em chamadas assíncronas.

### 2. Segurança
- Cripto: **XChaCha20** para conteúdo, **Argon2id** para derivação de chave de senha — parâmetros sãos, nonce nunca reusado, segredos não logados.
- Tudo continua **local** (sem exfiltração / chamada de rede indevida para inferência).
- Sem path traversal ao ler/escrever arquivos OKF; input do usuário tratado.

### 3. Simplicidade / idioma
- Menos código resolve? Reaproveita padrões existentes em vez de inventar?
- Respeita a fronteira de dados: OKF = arquivo `.md` com `type`; gamificação/índice = SQLite (nada de XP no frontmatter).
- **UI**: anima só `transform`/`opacity`, trata `prefers-reduced-motion`, Motion+Lucide (ver skill `ui-anim`).

## Como reportar
- Agrupe por severidade: **Bloqueante** / **Deveria corrigir** / **Nit**.
- Para cada achado: arquivo:linha, o problema, o porquê e a correção sugerida.
- Seja direto e específico; aponte o que está certo também quando relevante.

## Checklist
- [ ] Correção e casos de borda avaliados (Rust/Tauri/React).
- [ ] Sem `unwrap`/panic em produção; erros tratados; erro-como-dado no harness.
- [ ] Cripto correta (XChaCha20/Argon2id), nada vaza, tudo local.
- [ ] Fronteira OKF (arquivo+`type`) vs SQLite respeitada.
- [ ] UI: transform/opacity + reduced-motion.
- [ ] Achados agrupados por severidade com correção sugerida.
