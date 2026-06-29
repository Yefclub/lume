---
name: architect
description: Discovery e scaffolding de novos módulos do app. Use quando o pedido for "quero construir X", "adicionar a feature/módulo Y", ou quando algo novo precisa de um lugar e um esqueleto na arquitetura antes de sair codando.
---

# Architect — discovery e scaffolding de módulos

LUME é **Rust + Tauri 2** no core e **React + shadcn** no front, com cérebro em arquivos **OKF** e índice **SQLite (FTS5 + sqlite-vec)**. Antes de construir algo novo, entenda onde encaixa e crie um esqueleto coerente.

## Quando usar
- "Quero construir X" / "vamos adicionar o módulo Y".
- Uma feature nova que não tem lugar óbvio na estrutura atual.
- Precisa decidir fronteira Rust (core/comandos Tauri) vs. React (UI) vs. dados (OKF/SQLite).

## Passos

### 1. Discovery (antes de qualquer arquivo)
- Releia o pedido e reformule o objetivo em 1 frase.
- Mapeie o existente: procure módulos/pastas relacionados no core Rust e no front. Reaproveite padrões já presentes (não crie um estilo novo).
- Defina as fronteiras:
  - **Core Rust**: lógica, acesso a arquivos OKF, índice, inferência, comandos Tauri (`#[tauri::command]`).
  - **Front React/shadcn**: telas, estado de UI, animações (ver skill `ui-anim`).
  - **Dados**: o que vira arquivo OKF (`type` correto, ver skill `okf`) vs. o que vira linha no SQLite (gamificação/índice/estado).
- Liste as tools do agente envolvidas, se houver (`read_note`/`edit_note`/`search`/`create_goal`/`link`).

### 2. Decisão de spec
- Se a feature toca **mais de 2 arquivos** ou é não-trivial → **pare e use a skill `spec`** (EARS) antes de scaffolding.
- Se é pequena e local → siga direto para o esqueleto.

### 3. Scaffolding
- Crie a estrutura mínima seguindo as convenções já vistas no discovery:
  - módulo Rust + registro do(s) comando(s) Tauri;
  - componente(s) React no padrão shadcn;
  - contrato de dados (campos OKF e/ou tabela SQLite).
- Defina a **interface entre as camadas** primeiro (assinatura dos comandos Tauri, shape do payload). Implemente o miolo depois.
- Stubs com `// TODO` explícitos são aceitáveis; deixe o caminho feliz desenhado.

### 4. Handoff
- Resuma: o que foi criado, a fronteira Rust/React/dados, e o próximo passo de implementação.
- Aponte para as skills relevantes (`okf`, `harness`, `gpu-model-setup`, `ui-anim`).

## Checklist
- [ ] Objetivo reformulado em 1 frase.
- [ ] Padrões existentes mapeados e reaproveitados.
- [ ] Fronteira Core Rust / React / Dados (OKF vs SQLite) definida.
- [ ] >2 arquivos? → spec EARS antes (skill `spec`).
- [ ] Interface entre camadas (comandos Tauri/payload) definida antes do miolo.
