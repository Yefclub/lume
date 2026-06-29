## O que muda

<!-- Resumo curto da mudança e do porquê. -->

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
