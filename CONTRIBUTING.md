# Contribuindo com o LUME

Obrigado por considerar contribuir com o **LUME** — seu segundo cérebro pessoal,
100% local e offline, construído com Rust + Tauri 2 e React/shadcn, usando o
formato OKF (Open Knowledge Format).

Este guia descreve como preparar seu ambiente, o fluxo de trabalho esperado e
os padrões de qualidade do projeto.

---

## Princípio fundamental: privacidade primeiro

O LUME roda **100% local e offline**. A IA é executada na sua máquina e seus
dados nunca saem do seu computador.

> **NUNCA** envie dados sensíveis para o repositório. O cérebro real
> (`brain/`), o cofre cifrado (`vault/`) e quaisquer arquivos `*.lume` são
> ignorados pelo `.gitignore` e devem permanecer apenas na sua máquina. Use o
> diretório de exemplo `brain.example/` (conteúdo fictício) para demonstrações,
> testes e documentação.

---

## Pré-requisitos

Antes de começar, garanta que você tem instalado:

- **Rust** 1.96 ou superior (`rustup`, `cargo`)
- **Node.js** 24 ou superior
- **pnpm** 10 ou superior

Você também precisará das dependências de sistema do
[Tauri 2](https://v2.tauri.app/start/prerequisites/) para a sua plataforma
(WebView, toolchain de build nativa, etc.).

---

## Configuração do ambiente

Clone o repositório e instale as dependências do front-end:

```bash
pnpm install
```

As dependências de Rust são resolvidas automaticamente pelo Cargo na primeira
compilação.

---

## Rodando em modo de desenvolvimento

Para iniciar o app em modo de desenvolvimento (com hot reload do front-end e
recompilação do back-end Rust):

```bash
pnpm tauri dev
```

---

## Testes, lint e formatação

Antes de abrir um Pull Request, **rode lint e testes** e garanta que tudo passa:

```bash
# Testes do back-end (Rust)
cargo test --manifest-path src-tauri/Cargo.toml

# Lint do Rust (sem warnings)
cargo clippy

# Formatação do Rust
cargo fmt

# Build do front-end
pnpm build
```

Mantenha o código formatado com `cargo fmt` e livre de warnings do `cargo
clippy`.

---

## Fluxo spec-driven (EARS)

O LUME segue um fluxo **spec-driven** para mudanças não triviais.

> Toda *feature* que toca **mais de 2 arquivos** exige uma especificação escrita
> **antes do código**, no diretório `.specs/`, com o nome no formato
> `NNN-slug.md` (por exemplo, `.specs/001-busca-semantica.md`).

A especificação deve ser escrita no formato **EARS** (Easy Approach to
Requirements Syntax). Exemplos de padrões EARS:

- **Ubíquo:** "O sistema deve `<resposta>`."
- **Dirigido a evento:** "Quando `<gatilho>`, o sistema deve `<resposta>`."
- **Dirigido a estado:** "Enquanto `<estado>`, o sistema deve `<resposta>`."
- **Condicional/indesejado:** "Se `<condição>`, então o sistema deve
  `<resposta>`."
- **Opcional:** "Onde `<feature incluída>`, o sistema deve `<resposta>`."

Correções pequenas e mudanças que tocam até 2 arquivos não exigem spec, mas
descreva claramente a motivação no PR.

---

## Conventional Commits

Use o padrão [Conventional Commits](https://www.conventionalcommits.org/) nas
mensagens de commit. Exemplos:

```
feat: adiciona busca semântica no cérebro
fix: corrige indexação de notas vazias
docs: atualiza guia de contribuição
refactor: extrai parser OKF para módulo dedicado
test: cobre casos de borda do cofre cifrado
chore: atualiza dependências do Tauri
```

---

## Pull Requests

1. Crie um *branch* a partir de `main`.
2. Se a mudança tocar mais de 2 arquivos, escreva primeiro a spec em `.specs/`.
3. Implemente a mudança seguindo Conventional Commits.
4. **Rode lint e testes localmente** (`cargo clippy`, `cargo fmt`,
   `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm build`).
5. Abra o Pull Request **contra a branch `main`**, descrevendo o que mudou e
   por quê. Referencie a spec, se houver.

PRs com lint ou testes falhando não serão aceitos. Garanta que nenhum dado
pessoal ou sensível foi incluído.

---

## Código de Conduta

Ao participar deste projeto, você concorda em seguir nosso
[Código de Conduta](./CODE_OF_CONDUCT.md).

Obrigado por contribuir!
