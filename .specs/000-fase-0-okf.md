# Fase 0 — Fundação OKF (spec EARS)

> Especificação no formato **EARS** ("Quando `<gatilho>`, o sistema deve `<resposta>`") da **Fase 0** do LUME, já implementada: o parser do formato OKF, os comandos de leitura do cérebro e a UI React que lista as notas.

**Status:** implementada.
**Escopo:** parser OKF, comando `list_brain_notes`, comando `parse_okf_str` e a UI React de listagem.
**Fora de escopo:** cifragem, indexação SQLite, IA/harness, áudio (fases posteriores).

---

## Conceitos

- **OKF** — arquivo `.md` com **frontmatter YAML** no topo. O campo **`type` é obrigatório**.
- **Cérebro** — diretório de notas OKF. Na Fase 0, a referência é o diretório de exemplo **`brain.example/`**.
- O frontmatter é parseado com gray_matter/serde_yaml; a fonte da verdade são os próprios arquivos.

---

## Requisitos — Parser OKF

**REQ-OKF-01 — Frontmatter YAML válido.**
Quando o sistema recebe o conteúdo de um arquivo OKF com frontmatter YAML válido, o sistema deve extrair o frontmatter e o corpo (body) da nota separadamente.

**REQ-OKF-02 — Campo `type` obrigatório.**
Quando o sistema parseia um arquivo OKF cujo frontmatter **não contém** o campo `type`, o sistema deve rejeitar o parse e retornar um erro indicando que `type` é obrigatório.

**REQ-OKF-03 — Frontmatter malformado.**
Quando o sistema encontra frontmatter YAML sintaticamente inválido, o sistema deve retornar um erro de parse descritivo, sem derrubar o processo.

**REQ-OKF-04 — Corpo da nota.**
Quando o frontmatter é parseado com sucesso, o sistema deve preservar o corpo markdown restante como conteúdo da nota.

---

## Requisitos — Comando `parse_okf_str`

**REQ-PARSE-01 — Parse de string.**
Quando o frontend invoca `parse_okf_str` com uma string de conteúdo OKF, o sistema deve parsear essa string e retornar a nota estruturada (frontmatter + corpo).

**REQ-PARSE-02 — Erro propagado à UI.**
Quando `parse_okf_str` recebe conteúdo inválido (frontmatter malformado ou sem `type`), o sistema deve retornar um erro à UI em vez de um resultado parcial.

---

## Requisitos — Comando `list_brain_notes`

**REQ-LIST-01 — Varredura recursiva.**
Quando o frontend invoca `list_brain_notes`, o sistema deve varrer o diretório **`brain.example/` recursivamente** e retornar a lista de notas OKF encontradas.

**REQ-LIST-02 — Aplicar o parser a cada nota.**
Quando `list_brain_notes` encontra um arquivo OKF, o sistema deve parseá-lo com o parser OKF para extrair seu frontmatter (incluindo `type`).

**REQ-LIST-03 — Nota inválida não quebra a listagem.**
Quando um arquivo individual falha no parse (ex.: sem `type`), o sistema deve continuar a varredura das demais notas em vez de abortar a listagem inteira.

**REQ-LIST-04 — Diretório vazio.**
Quando `brain.example/` não contém nenhuma nota OKF, o sistema deve retornar uma lista vazia (não um erro).

---

## Requisitos — UI React (listagem)

**REQ-UI-01 — Carregar a lista.**
Quando a tela de notas é aberta, o sistema deve invocar `list_brain_notes` e exibir as notas retornadas.

**REQ-UI-02 — Exibir a lista.**
Quando a lista de notas é recebida, a UI deve renderizar cada nota (com seu `type`/identificação) usando os componentes React + shadcn.

**REQ-UI-03 — Estado vazio.**
Quando a lista retornada está vazia, a UI deve exibir um estado vazio claro em vez de uma tela em branco.

**REQ-UI-04 — Estado de erro.**
Quando a invocação de `list_brain_notes` falha, a UI deve exibir uma mensagem de erro legível.

---

## Critérios de aceite

- [ ] Um arquivo OKF com frontmatter válido e `type` presente é parseado em frontmatter + corpo.
- [ ] Um arquivo OKF **sem** `type` é rejeitado com erro explícito (REQ-OKF-02).
- [ ] Frontmatter YAML malformado retorna erro de parse descritivo, sem panic (REQ-OKF-03).
- [ ] `parse_okf_str` retorna a nota estruturada para conteúdo válido e erro para conteúdo inválido.
- [ ] `list_brain_notes` percorre `brain.example/` **recursivamente** e retorna todas as notas OKF.
- [ ] Uma nota inválida no diretório **não** interrompe a listagem das demais (REQ-LIST-03).
- [ ] Diretório sem notas resulta em **lista vazia**, não erro (REQ-LIST-04).
- [ ] A UI React lista as notas via `list_brain_notes`, com estados de **vazio** e **erro** tratados.

---

## Referências cruzadas

- Formato OKF e princípio "OKF = verdade": `../docs/ARCH.md`
- ADR do formato OKF: `../docs/DECISIONS.md` (ADR-001)
- Crates de frontmatter (gray_matter/serde_yaml): `../docs/STACK.md`
