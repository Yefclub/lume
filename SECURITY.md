# Política de Segurança

## Versões suportadas

Projeto em desenvolvimento inicial (Fase 0). Correções de segurança se aplicam apenas à branch `main`.

## Reportar uma vulnerabilidade

**Não abra uma issue pública** para falhas de segurança.

Use o canal privado **"Report a vulnerability"** dos GitHub Security Advisories:
👉 https://github.com/Yefclub/lume/security/advisories/new

Ou entre em contato pelo perfil **@Yefclub**. Você receberá uma confirmação e, quando corrigido, crédito (se desejar).

## Modelo de ameaça (resumo)

Lume é **100% local**. O modelo de ameaça técnico completo está em [`docs/SECURITY.md`](docs/SECURITY.md). Pontos-chave:

- **Dados em repouso:** XChaCha20-Poly1305 com chave derivada por Argon2id; a chave só existe em RAM (`secrecy` + `zeroize`).
- **A IA como vetor:** o LLM roda com _egress lockdown_ (offline por padrão) e o markdown é sanitizado antes de renderizar, para mitigar _prompt-injection_ embutido nas próprias notas.
- **Limites conhecidos:** o keychain do SO **não** protege contra malware rodando como o mesmo usuário — a proteção real é a senha (Argon2id) + trancar o cofre quando ocioso.
- **Higiene:** o cérebro real (`brain/`), o cofre (`vault/`) e segredos **nunca** entram no repositório.
