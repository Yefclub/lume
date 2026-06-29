---
name: gpu-model-setup
description: Detectar a GPU e escolher modelo, quantização e backend de inferência local. Use quando for implementar/ajustar a detecção de hardware, decidir qual modelo carregar por VRAM, configurar fallback para CPU, ou expor ao usuário o device detectado e as camadas offloaded.
---

# GPU & Model Setup — inferência 100% local

LUME roda IA **inteiramente local**. A escolha de modelo/quant/backend depende do hardware detectado. Nada de chamada de rede para inferência.

## Quando usar
- Implementar/ajustar a detecção de GPU e VRAM.
- "Qual modelo carregar nessa máquina?" / configurar quantização e offload.
- Garantir fallback gracioso para CPU.
- Mostrar ao usuário o que foi detectado (device + camadas na GPU).

## Detecção de hardware
- **Vendor/adapter da GPU**: via **wgpu** (nome do adapter, vendor, backend).
- **VRAM**: wgpu **não reporta VRAM**. Use APIs por plataforma:
  - NVIDIA → **nvml-wrapper**.
  - Windows (genérico) → **DXGI** (`DXGI_ADAPTER_DESC`).
  - macOS → **objc2-metal** (Metal device / recommended working set).
- Combine: wgpu diz *quem* é a GPU; nvml/DXGI/metal dizem *quanta* VRAM.

## Modelos disponíveis (não invente outros)
- **Gemma 3n E4B** — modelo **default**. Multimodal, lida com **áudio**. É o que roda na maioria das máquinas e sempre o fallback.
- **Ornith-1.0-9B** — modelo do **agente**, **opt-in**, exige **GPU com ≥8 GB de VRAM**. Mais capaz no loop tool-use; não force em hardware fraco.

## Tabela VRAM → modelo/backend
| VRAM detectada | Escolha sugerida | Backend |
|---|---|---|
| Sem GPU / falha na detecção | Gemma 3n E4B (quant) | **CPU** |
| < 8 GB | Gemma 3n E4B | GPU parcial (offload de algumas camadas) + resto CPU |
| ≥ 8 GB | Ornith-1.0-9B (se usuário optou) senão Gemma 3n E4B | GPU (offload máximo possível) |

- Quantização: prefira a maior precisão que **caiba na VRAM com folga** (deixe margem para contexto/KV-cache); caso não caiba, desça a quant ou reduza camadas offloaded.
- Sempre que em dúvida, **degrade para Gemma 3n E4B / CPU** em vez de falhar.

## Passos
1. Detecte adapter via wgpu; detecte VRAM via nvml/DXGI/metal conforme a plataforma.
2. Aplique a tabela: escolha modelo + quant + nº de camadas a offload.
3. Se Ornith-1.0-9B foi pedido mas VRAM < 8 GB → não carregue; explique e use Gemma.
4. Carregue; meça quantas camadas realmente foram para a GPU.
5. **Exponha ao usuário**: device detectado (vendor + nome), VRAM, modelo escolhido, quant e **camadas offloaded vs. total**. Transparência é requisito.
6. Em qualquer erro de GPU (driver, OOM) → fallback CPU automático + aviso claro.

## Checklist
- [ ] Vendor por wgpu; VRAM por nvml/DXGI/metal (nunca confie em wgpu p/ VRAM).
- [ ] Ornith-1.0-9B só com ≥8 GB e opt-in; senão Gemma 3n E4B.
- [ ] Margem de VRAM para KV-cache/contexto considerada na quant.
- [ ] Fallback CPU funciona e é comunicado.
- [ ] UI mostra device + camadas offloaded ao usuário.
