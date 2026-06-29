## O que muda

<!-- Resumo curto da mudança e do porquê. -->

## Nota de release (Novidades)

<!--
Escreva uma nota curta e NATURAL, em PT-BR, para o usuário final (não para devs),
na voz de produto do Lume. Vale para PR humana ou de IA — toda PR relevante tem nota.
Em PRs de release, isto vira `release-notes/vX.Y.Z.md` e aparece no painel "Novidades"
do app e no corpo do Release no GitHub.
-->

## Tipo

- [ ] feat — nova funcionalidade
- [ ] fix — correção
- [ ] refactor / chore / docs / ci
- [ ] release — bump de versão (adicione a label `release:patch|minor|major`)

## Checklist

- [ ] `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` limpo
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passa
- [ ] `pnpm build` passa (e `node scripts/check-versions.mjs` se mexeu em versão)
- [ ] Spec atualizada em `.specs/` (se feature não-trivial, >2 arquivos)
- [ ] Sem segredos nem dados pessoais (`brain/`, `vault/`, `.env`) no diff

## Notas

<!-- Screenshots, contexto, follow-ups. -->
