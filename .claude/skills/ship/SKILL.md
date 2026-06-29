---
name: ship
description: Fluxo de entrega de mudança — branch, commit (Conventional Commits), push, PR, CI, review e merge via gh CLI. Use quando uma mudança estiver pronta para virar PR ou quando o usuário pedir para "abrir PR", "subir", "mandar pra revisão" ou "fazer merge".
---

# Ship — branch → PR → CI → review → merge

Padroniza a entrega de mudanças no LUME usando **git** + **gh CLI**, com **Conventional Commits**. Nunca commitar direto na branch padrão.

## Quando usar
- Mudança pronta para revisão/integração.
- "Abre um PR" / "sobe isso" / "manda pra review" / "faz o merge".

## Passos

### 1. Branch
- Se estiver na branch padrão (`main`), **crie uma branch antes** de commitar:
  `git switch -c <tipo>/<slug>` (ex.: `feat/streaming-audio`, `fix/webkitgtk-blackscreen`).

### 2. Commit (Conventional Commits)
- Formato: `tipo(escopo opcional): descrição no imperativo`.
- Tipos: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`.
- Exemplos: `feat(agent): adiciona tool link`, `fix(gpu): fallback p/ CPU quando VRAM < 8GB`.
- Commits pequenos e coesos. Só commite quando o usuário pedir.
- Encerre a mensagem do commit com:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

### 3. Push + PR
- `git push -u origin <branch>`.
- `gh pr create` com título em Conventional Commit e corpo descrevendo: o quê, por quê, como testar, e a spec relacionada (`.specs/NNN-...`) se houver.
- Encerre o corpo do PR com:
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

### 4. CI
- Acompanhe com `gh pr checks`. CI deve passar (build Rust/Tauri, lint, testes).
- CI vermelho → investigue a causa real e corrija; **não** burle hooks nem desabilite checagens sem o usuário pedir.

### 5. Review
- Peça revisão. Para auto-revisão técnica use a skill `review-pr` ou o agente `code-reviewer`.
- Responda comentários e itere na mesma branch.

### 6. Merge
- Só após CI verde + review aprovado.
- `gh pr merge` conforme a política do repo (squash quando fizer sentido). Apague a branch após o merge.

## Checklist
- [ ] Não está commitando na branch padrão (branch criada).
- [ ] Mensagens em Conventional Commits + trailer Co-Authored-By.
- [ ] PR com o quê/por quê/como testar (+ spec se houver) + trailer do Claude Code.
- [ ] CI verde (`gh pr checks`), sem burlar hooks.
- [ ] Review aprovado antes do merge.
