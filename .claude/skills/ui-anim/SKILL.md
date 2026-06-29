---
name: ui-anim
description: Padrões de animação e streaming performáticos no webview (React/shadcn + Tauri). Use quando for animar UI, adicionar transições/microinterações, fazer streaming de tokens/áudio para a tela, ou investigar jank/tela preta de animação em algum dos webviews.
---

# UI & Animation — performático nos 3 webviews

Tauri 2 usa o webview nativo de cada OS: **WebView2** (Windows), **WKWebView** (macOS), **WebKitGTK** (Linux). O que é suave num pode travar no outro. Animação aqui é disciplina, não enfeite.

## Quando usar
- Adicionar/ajustar qualquer animação, transição ou microinteração.
- Streaming de tokens do modelo ou de áudio para a UI.
- Jank, frame drop, ou tela preta em animação num webview específico.

## Regras invioláveis
1. **Anime apenas `transform` e `opacity`.** Nada de animar `width`, `height`, `top`, `left`, `box-shadow`, `background` (forçam layout/paint). Use `transform: translate/scale/rotate` e `opacity`.
2. **`prefers-reduced-motion` é obrigatório.** Sempre forneça caminho sem movimento (corte/instantâneo) quando o usuário pede menos animação. Não é opcional.
3. **Bibliotecas fixas (não troque):** **Motion** (motion.dev, MIT) para animação e **Lucide** para ícones. Não adicione outra lib de animação.
4. **Teste nos 3 engines.** Uma animação só está "pronta" depois de validada em WebView2, WKWebView e WebKitGTK.

## Caveat crítico — Linux + NVIDIA + WebKitGTK
Compositing acelerado no **WebKitGTK** com **GPU NVIDIA** pode causar **tela preta / artefatos / travamento**. Ao animar:
- Mantenha animações simples e baratas (transform/opacity puros) — reduz a chance de acionar o bug.
- Saiba que o sintoma "funciona no Windows/Mac, tela preta no Linux" geralmente é esse combo, não seu código.
- Documente/teste explicitamente esse cenário antes de dar como concluído.

## Streaming para a UI
- Use **`Channel<T>`** (Tauri) para enviar tokens/chunks de áudio do Rust para o front de forma incremental — não acumule tudo e envie de uma vez.
- Atualize o DOM em lotes/`requestAnimationFrame` para não disparar reflow a cada token.
- O cursor/indicador de "digitando" deve ser `opacity`/`transform` apenas.

## Passos
1. Decida o efeito em termos de `transform`/`opacity` só. Se exige outra propriedade, repense.
2. Implemente com Motion; ícones com Lucide.
3. Adicione o ramo `prefers-reduced-motion` (sem movimento).
4. Para dados ao vivo, ligue via `Channel<T>` e agrupe updates no rAF.
5. Teste nos 3 webviews — em especial Linux+NVIDIA+WebKitGTK.

## Checklist
- [ ] Só `transform`/`opacity` animados.
- [ ] `prefers-reduced-motion` tratado.
- [ ] Motion + Lucide (sem libs extras).
- [ ] Streaming via `Channel<T>`, updates em lote/rAF.
- [ ] Validado em WebView2, WKWebView e WebKitGTK (incl. NVIDIA no Linux).
