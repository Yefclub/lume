---
name: research
description: Pesquisa estruturada com trade-offs antes de decisões técnicas. Use quando precisar comparar libs/modelos/abordagens, validar se algo existe/está atual, ou antes de afirmar que uma biblioteca/modelo "não existe" — pesquise primeiro.
---

# Research — decisões com evidência e trade-offs

LUME tem stack opinativa (Rust/Tauri, rig-core, wgpu, SQLite FTS5+sqlite-vec, Gemma 3n / Ornith, Motion+Lucide). Pesquisa aqui serve para **escolher entre opções** ou **validar fatos atuais** — não para reabrir decisões já fixadas sem motivo.

## Quando usar
- Comparar bibliotecas, modelos ou abordagens (precisa de trade-offs).
- Confirmar capacidade/versão/licença de uma dependência.
- **Antes de dizer "essa lib/modelo não existe"** — o conhecimento tem corte temporal; modelos e crates novos surgem rápido. Pesquise primeiro.

## Regra anti-alucinação
Nunca afirme que algo não existe ou que "não dá" a partir de memória só. Modelos locais e crates Rust mudam toda semana. Faça **WebSearch** e, se preciso, **WebFetch** da fonte (docs/repo/crates.io) antes de concluir. Se ainda assim não achar, diga "não encontrei evidência" — não "não existe".

## Passos
1. **Enquadre a pergunta**: qual decisão isso destrava? Quais são os candidatos?
2. **Critérios** (defina antes de pesquisar): licença (precisa ser permissiva, ex. MIT/Apache), funciona offline/local, suporte a Rust/Tauri, manutenção/atividade, performance, tamanho.
3. **Busque**: WebSearch por nome + alternativas; WebFetch das fontes primárias (repo, docs, crates.io, model card). Cheque datas — prefira info recente.
4. **Compare em tabela de trade-offs**:

   | Opção | Licença | Local/Offline | Rust/Tauri | Manutenção | Trade-off chave |
   |---|---|---|---|---|---|

5. **Recomende** uma opção com justificativa ligada aos critérios; registre os descartados e por quê.
6. Se a pesquisa contradiz uma premissa do projeto, sinalize explicitamente em vez de seguir calado.

## Checklist
- [ ] Pergunta enquadrada como decisão.
- [ ] Critérios definidos antes (incl. licença permissiva + offline).
- [ ] Fontes primárias consultadas via WebSearch/WebFetch, com datas conferidas.
- [ ] Tabela de trade-offs preenchida.
- [ ] Recomendação justificada + descartados anotados.
- [ ] Nada afirmado como "inexistente" sem ter pesquisado.
