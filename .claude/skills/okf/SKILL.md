---
name: okf
description: Criar, editar e validar arquivos OKF do cérebro (cada conceito = 1 arquivo .md). Use quando for adicionar/alterar uma nota, pessoa, preferência, meta, fato, projeto ou registro diário, ou quando precisar garantir que o frontmatter e os links do grafo estejam corretos.
---

# OKF — Open Knowledge Format

No LUME, o cérebro é uma pasta de arquivos `.md`. **Cada conceito = 1 arquivo.** Os links markdown entre arquivos formam o grafo de conhecimento. Gamificação e progresso NÃO entram aqui — vivem no SQLite.

## Quando usar
- "Adiciona uma nota sobre X" / "registra que eu prefiro Y" / "cria uma meta Z".
- Editar conteúdo de uma nota existente sem corromper o frontmatter.
- Conferir se um arquivo OKF está válido antes de salvar.

## Regra de ouro do frontmatter
Todo arquivo OKF começa com frontmatter YAML e o campo `type` é **obrigatório e não pode ser vazio**.

```md
---
type: note
title: Café especial
created: 2026-06-28
tags: [hobby, cafe]
---

Conteúdo em markdown aqui. Links viram arestas do grafo:
ver [João](../person/joao.md) e a [meta de barista](../goal/virar-barista.md).
```

Tipos sugeridos para `type` (use estes, padronize):
- `note` — nota geral / ideia.
- `person` — uma pessoa.
- `preference` — preferência/gosto do usuário.
- `goal` — meta (espelhada como objetivo no app via `create_goal`).
- `fact` — fato atômico e durável.
- `project` — um projeto em andamento.
- `daily` — registro diário (1 por dia, ex.: `daily/2026-06-28.md`).

## Passos para CRIAR um arquivo
1. Escolha o `type` correto da lista acima. Se nenhum encaixa, prefira `note` em vez de inventar um tipo solto.
2. Defina o caminho por tipo: `<type>/<slug>.md` (ex.: `person/joao.md`, `goal/virar-barista.md`).
3. Escreva o frontmatter com `type` preenchido + metadados úteis (`title`, `created`, `tags`).
4. No corpo, conecte ao grafo com **links markdown relativos** para arquivos existentes que sejam relacionados. Sem link, o nó fica órfão.
5. Salve. Não duplique um conceito que já tem arquivo — em vez disso, edite/linke o existente (use `search` antes).

## Passos para EDITAR um arquivo
1. Leia o arquivo atual (`read_note`).
2. **Edite por substituição exata de string (`str_replace` / `edit_note`). NUNCA reescreva o arquivo inteiro.** Isso preserva frontmatter, histórico e evita corromper YAML.
3. O `old_string` deve casar **exatamente** e ser **único** no arquivo. Se houver ambiguidade, inclua mais contexto ao redor até o match ser único.
4. Nunca remova o campo `type`. Ao mover conteúdo, atualize os links relativos que apontavam para o arquivo.

## Checklist de validação (antes de considerar pronto)
- [ ] Frontmatter abre e fecha com `---`.
- [ ] `type` presente e **não-vazio**, e é um dos tipos padronizados.
- [ ] YAML parseável (sem indentação quebrada, sem aspas mal fechadas).
- [ ] Pelo menos um link markdown relativo se o conceito se relaciona a algo existente.
- [ ] Nenhuma chave de gamificação/XP/streak no frontmatter (isso é SQLite).
- [ ] Edição feita por `str_replace`, não por reescrita total.

## Indexação (contexto, não ação manual)
Ao salvar, o conteúdo é indexado em SQLite **FTS5** (busca textual) + **sqlite-vec** (busca semântica). Bom título e tags melhoram a recuperação. Você não escreve no índice à mão — ele é derivado dos arquivos.
