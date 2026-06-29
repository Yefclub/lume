---
name: harness
description: Desenhar e depurar o loop de tool-use do agente (rig-core). Use quando for definir/alterar uma tool do agente, ajustar o parsing de tool-calls, a GBNF grammar, o cap de iterações, os critérios de sucesso/falha, ou quando o agente travar/loopar/chamar tool com argumento inválido.
---

# Harness — loop de tool-use (rig-core)

O agente do LUME roda sobre **rig-core**: um loop tool-use com gramática **GBNF** restringindo a saída do modelo, **cap de iterações** e filosofia **"erro-como-dado"** (a falha de uma tool volta como observação para o modelo, não derruba o loop).

## Quando usar
- "Adicionar uma tool nova ao agente" / "o agente não está chamando a tool certa".
- O loop entra em recursão infinita, estoura iterações, ou para cedo demais.
- `str_replace` falha e o agente não sabe se recuperar.
- A saída do modelo não casa com o formato esperado de tool-call.

## Tools do agente (as únicas; não invente outras)
- `read_note` — lê um arquivo OKF.
- `edit_note` — edita via `str_replace` (substituição exata).
- `search` — busca no índice (FTS5 + vetorial).
- `create_goal` — cria/espelha uma meta.
- `link` — cria uma aresta (link markdown) entre dois conceitos.

## Anatomia do loop
1. **Definição de tools**: cada tool tem nome, descrição e schema de argumentos. A descrição é o que o modelo "vê" — seja específico sobre quando usar e o formato exato dos campos.
2. **GBNF grammar**: a saída do modelo é restringida por gramática para que toda tool-call seja sintaticamente válida (nome de tool ∈ conjunto conhecido, JSON de args bem-formado). Isso elimina parsing frágil de texto livre.
3. **Parsing de tool-calls**: extraia `{tool, args}` da saída já restringida; valide args contra o schema antes de executar.
4. **Execução + observação**: rode a tool, capture resultado OU erro, e devolva como mensagem de observação ao modelo.
5. **Cap de iterações**: limite duro de passos por turno. Ao atingir, encerre com falha explícita ("não consegui em N passos") — nunca loop aberto.
6. **Sucesso/falha explícitos**: o turno termina com um sinal claro (resposta final ao usuário = sucesso; cap atingido / tool irrecuperável = falha). Nada de término ambíguo.

## Erro-como-dado (padrão central)
Quando uma tool falha, **não lance exceção para fora do loop**. Retorne o erro como texto de observação para o modelo decidir o próximo passo. Caso mais comum:

- `edit_note`/`str_replace` **não encontra match único**:
  - 0 matches → observação: `"str_replace: nenhum match para <trecho>. Releia o arquivo e refine o old_string."`
  - >1 matches → observação: `"str_replace: <N> matches ambíguos. Inclua mais contexto ao redor para tornar o old_string único."`
  - O modelo então chama `read_note` de novo e tenta um `old_string` melhor. Isso é fluxo normal, não crash.

## Checklist ao mexer no harness
- [ ] Toda tool nova tem descrição clara + schema de args; foi adicionada ao conjunto da GBNF.
- [ ] Args são validados após o parse e antes da execução.
- [ ] Falha de tool vira observação (erro-como-dado), não panic/`?` para fora do loop.
- [ ] Existe cap de iterações e ele encerra com falha explícita.
- [ ] Há um sinal de término inequívoco para sucesso e para falha.
- [ ] `str_replace` trata 0 e >1 matches com mensagens acionáveis.

## Depuração
- Logue cada iteração: índice, tool escolhida, args, resultado/erro resumido.
- Loop infinito → quase sempre o modelo repete a mesma tool-call falha; cheque se a observação de erro é específica o suficiente para mudar a decisão.
- Não casa com a gramática → revise a GBNF e a descrição da tool antes de "consertar" no parser.
