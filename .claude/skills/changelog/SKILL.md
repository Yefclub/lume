---
name: changelog
description: Resumir a atividade do projeto para notas de release ou status executivo
---

# Changelog / Notas de Release — Lume

O changelog principal são os **Releases do GitHub**. Use esta skill para montar as
notas de uma release ou um resumo do que mudou.

## Coletar

```bash
PREV=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -n "$PREV" ]; then
  git log "$PREV..HEAD" --pretty='- %s (%h)'
else
  git log --pretty='- %s (%h)'
fi
gh pr list --state merged --base main --limit 30 --json number,title,labels,mergedAt
```

## Categorizar (Conventional Commits)

- ✨ **Funcionalidades** — `feat:`
- 🐛 **Correções** — `fix:`
- ♻️ **Melhorias** — `refactor:` / `perf:`
- 🔧 **Infra / CI** — `chore:` / `ci:`
- 📝 **Docs** — `docs:`

## Saída

Markdown agrupado por categoria, do mais relevante ao menos. O `release.yml` já injeta
notas automáticas no Release; use esta skill para **enriquecer** essas notas ou para um
resumo de status ("o que fizemos essa semana").
