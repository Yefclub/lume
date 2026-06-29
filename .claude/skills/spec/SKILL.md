---
name: spec
description: Criar ou editar uma especificação em EARS antes de implementar uma feature não-trivial. Use quando uma feature tocar mais de 2 arquivos, mudar comportamento observável, ou quando faltar clareza sobre os requisitos antes de codar.
---

# Spec — requisitos em EARS antes de implementar

Feature não-trivial (**> 2 arquivos** ou comportamento novo) começa por uma spec curta e testável em **EARS**, salva em `.specs/NNN-slug.md`. Spec primeiro evita retrabalho e vira base de revisão e testes.

## Quando usar
- Antes de implementar qualquer feature que toque mais de 2 arquivos.
- Quando o comportamento esperado não está cristalino.
- Encaminhado pela skill `architect`.

## Onde e como nomear
- Caminho: `.specs/NNN-slug.md` (ex.: `.specs/004-streaming-audio.md`).
- `NNN` = próximo número sequencial (3 dígitos, zero-padded). `slug` = curto, kebab-case.

## EARS — padrões de frase (use estes)
Escreva requisitos como frases EARS, cada uma testável:
- **Ubíquo**: "O sistema DEVE \<comportamento>."
- **Evento**: "QUANDO \<gatilho>, o sistema DEVE \<comportamento>."
- **Estado**: "ENQUANTO \<estado>, o sistema DEVE \<comportamento>."
- **Condicional**: "SE \<condição>, ENTÃO o sistema DEVE \<comportamento>."
- **Opcional**: "ONDE \<feature presente>, o sistema DEVE \<comportamento>."

Cada requisito: uma frase, sem ambiguidade, verificável.

## Estrutura do arquivo
```md
---
spec: 004
title: Streaming de áudio
status: draft        # draft | approved | done
created: 2026-06-28
---

## Contexto
Por que isso existe (1–2 parágrafos).

## Requisitos (EARS)
- QUANDO o usuário inicia uma resposta, o sistema DEVE transmitir tokens via Channel<T>.
- ENQUANTO prefers-reduced-motion está ativo, o sistema DEVE renderizar sem animação de cursor.
- SE a GPU falhar ao carregar o modelo, ENTÃO o sistema DEVE cair para CPU e avisar o usuário.

## Fora de escopo
O que NÃO entra agora.

## Notas técnicas
Camadas afetadas (Rust/React/OKF/SQLite), tools do agente envolvidas.
```

## Passos
1. Reserve o próximo `NNN`; crie `.specs/NNN-slug.md`.
2. Preencha frontmatter (`status: draft`).
3. Escreva o Contexto.
4. Liste os requisitos em EARS (cada um testável).
5. Declare o Fora de escopo e as Notas técnicas.
6. Revise: cada requisito é verificável? Implementação cobre todos? Ao concluir a feature, mude `status` para `done`.

## Checklist
- [ ] Arquivo em `.specs/NNN-slug.md` com `NNN` sequencial.
- [ ] Frontmatter com `spec`, `title`, `status`.
- [ ] Requisitos em frases EARS, cada um testável.
- [ ] Fora de escopo explícito.
- [ ] Notas técnicas apontam as camadas afetadas.
