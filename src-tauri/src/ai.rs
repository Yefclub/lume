//! IA local embarcada (llama.cpp via llama-cpp-2).
//!
//! - Registry de modelos leves (Qwen3 4B/1.7B + Gemma 3n).
//! - Download resumível (HTTP Range) com `read_timeout`.
//! - Chat com streaming, formato de prompt por modelo, reasoning toggleável
//!   e `n_threads` = núcleos da CPU (velocidade).

use std::num::NonZeroU32;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager, State};

use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{AddBos, LlamaModel};
use llama_cpp_2::sampling::LlamaSampler;

const MAX_RETRIES: u32 = 20;

#[derive(Clone, Copy, PartialEq)]
enum ChatFormat {
    ChatML,
    Gemma,
}

#[derive(Serialize, Clone)]
pub struct ModelDef {
    id: &'static str,
    name: &'static str,
    file: &'static str,
    url: &'static str,
    size_gb: f32,
    reasoning: bool,
    #[serde(skip)]
    format: ChatFormat,
}

/// Registry — o primeiro é o default.
const MODELS: &[ModelDef] = &[
    ModelDef {
        id: "qwen3-4b",
        name: "Qwen3 4B · equilibrado",
        file: "Qwen3-4B-Q4_K_M.gguf",
        url: "https://huggingface.co/unsloth/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q4_K_M.gguf?download=true",
        size_gb: 2.5,
        reasoning: true,
        format: ChatFormat::ChatML,
    },
    ModelDef {
        id: "qwen3-1.7b",
        name: "Qwen3 1.7B · rápido",
        file: "Qwen3-1.7B-Q4_K_M.gguf",
        url: "https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf?download=true",
        size_gb: 1.1,
        reasoning: true,
        format: ChatFormat::ChatML,
    },
    ModelDef {
        id: "gemma-3n-e4b",
        name: "Gemma 3n E4B · multimodal",
        file: "gemma-3n-E4B-it-Q4_K_M.gguf",
        url: "https://huggingface.co/unsloth/gemma-3n-E4B-it-GGUF/resolve/main/gemma-3n-E4B-it-Q4_K_M.gguf?download=true",
        size_gb: 4.5,
        reasoning: false,
        format: ChatFormat::Gemma,
    },
];

fn model_def(id: &str) -> Result<&'static ModelDef, String> {
    MODELS
        .iter()
        .find(|m| m.id == id)
        .ok_or_else(|| format!("modelo desconhecido: {id}"))
}

#[tauri::command]
pub fn list_models() -> Vec<ModelDef> {
    MODELS.to_vec()
}

pub struct AiState {
    backend: LlamaBackend,
    loaded: Mutex<Option<(String, Arc<LlamaModel>)>>,
}

impl AiState {
    pub fn new() -> Result<Self, String> {
        let backend = LlamaBackend::init().map_err(|e| e.to_string())?;
        Ok(Self {
            backend,
            loaded: Mutex::new(None),
        })
    }
}

fn models_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let d = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("models");
    std::fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    Ok(d)
}

fn model_path(app: &AppHandle, def: &ModelDef) -> Result<PathBuf, String> {
    Ok(models_dir(app)?.join(def.file))
}

#[derive(Serialize)]
pub struct ModelStatus {
    id: String,
    name: String,
    exists: bool,
    size_gb: f32,
    reasoning: bool,
}

#[tauri::command]
pub fn model_status(app: AppHandle, model_id: String) -> Result<ModelStatus, String> {
    let def = model_def(&model_id)?;
    Ok(ModelStatus {
        id: def.id.into(),
        name: def.name.into(),
        exists: model_path(&app, def)?.exists(),
        size_gb: def.size_gb,
        reasoning: def.reasoning,
    })
}

#[derive(Serialize, Clone)]
#[serde(tag = "event", content = "data")]
pub enum DlEvent {
    Progress { downloaded: u64, total: u64 },
    Done,
    Error { message: String },
}

#[tauri::command]
pub async fn download_model(
    app: AppHandle,
    model_id: String,
    on_event: Channel<DlEvent>,
) -> Result<(), String> {
    let def = model_def(&model_id)?;
    let path = model_path(&app, def)?;
    if path.exists() {
        let _ = on_event.send(DlEvent::Done);
        return Ok(());
    }
    let tmp = path.with_extension("part");
    log::info!("iniciando download: {}", def.url);

    match download_with_resume(def.url, &tmp, &on_event).await {
        Ok(()) => {
            tokio::fs::rename(&tmp, &path)
                .await
                .map_err(|e| e.to_string())?;
            log::info!("modelo baixado: {}", path.display());
            let _ = on_event.send(DlEvent::Done);
            Ok(())
        }
        Err(e) => {
            log::error!("download falhou: {e}");
            let _ = on_event.send(DlEvent::Error { message: e.clone() });
            Err(e)
        }
    }
}

/// Download assíncrono, resumível e com `read_timeout` (detecta estol).
async fn download_with_resume(
    url: &str,
    tmp: &std::path::Path,
    on_event: &Channel<DlEvent>,
) -> Result<(), String> {
    use futures_util::StreamExt;
    use tokio::io::AsyncWriteExt;

    let client = reqwest::Client::builder()
        .user_agent("Lume/1.0 (+https://github.com/Yefclub/lume)")
        .connect_timeout(std::time::Duration::from_secs(30))
        .read_timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    let mut last_err = String::new();
    for attempt in 1..=MAX_RETRIES {
        let mut existing = tokio::fs::metadata(tmp).await.map(|m| m.len()).unwrap_or(0);
        let mut req = client.get(url);
        if existing > 0 {
            req = req.header(reqwest::header::RANGE, format!("bytes={existing}-"));
        }
        let resp = match req.send().await {
            Ok(r) => r,
            Err(e) => {
                last_err = e.to_string();
                log::warn!("tentativa {attempt}/{MAX_RETRIES} sem conectar: {last_err}");
                tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                continue;
            }
        };
        let status = resp.status();
        let append = existing > 0 && status == reqwest::StatusCode::PARTIAL_CONTENT;
        if existing > 0 && !append {
            existing = 0;
        }
        if !status.is_success() {
            return Err(format!("HTTP {status}"));
        }

        let total = existing + resp.content_length().unwrap_or(0);
        let mut oo = tokio::fs::OpenOptions::new();
        oo.create(true).write(true);
        if append {
            oo.append(true);
        } else {
            oo.truncate(true);
        }
        let mut file = oo.open(tmp).await.map_err(|e| e.to_string())?;

        let mut downloaded = existing;
        let mut stream = resp.bytes_stream();
        let mut stream_err: Option<String> = None;
        while let Some(item) = stream.next().await {
            match item {
                Ok(chunk) => {
                    if let Err(e) = file.write_all(&chunk).await {
                        stream_err = Some(e.to_string());
                        break;
                    }
                    downloaded += chunk.len() as u64;
                    let _ = on_event.send(DlEvent::Progress { downloaded, total });
                }
                Err(e) => {
                    stream_err = Some(e.to_string());
                    break;
                }
            }
        }
        let _ = file.flush().await;

        match stream_err {
            None => return Ok(()),
            Some(e) => {
                last_err = e;
                log::warn!(
                    "tentativa {attempt}/{MAX_RETRIES} caiu em {downloaded}/{total}: {last_err}"
                );
                tokio::time::sleep(std::time::Duration::from_secs(3)).await;
            }
        }
    }
    Err(format!("falhou após {MAX_RETRIES} tentativas: {last_err}"))
}

#[derive(Deserialize)]
pub struct ChatMsg {
    pub role: String,
    pub content: String,
}

/// Digest do cérebro para dar contexto ao modelo.
fn brain_context(app: &AppHandle, query: &str) -> String {
    let notes = crate::okf::list_brain_notes(app.clone()).unwrap_or_default();
    if notes.is_empty() {
        return String::new();
    }
    let words: Vec<String> = query
        .to_lowercase()
        .split_whitespace()
        .filter(|w| w.len() > 2)
        .map(|s| s.to_string())
        .collect();
    let mut scored: Vec<(usize, &crate::okf::OkfNote)> = notes
        .iter()
        .map(|n| {
            let hay = format!(
                "{} {} {}",
                n.title.clone().unwrap_or_default(),
                n.tags.join(" "),
                n.body
            )
            .to_lowercase();
            let score = words.iter().filter(|w| hay.contains(*w)).count();
            (score, n)
        })
        .collect();
    scored.sort_by_key(|(score, _)| std::cmp::Reverse(*score));

    let mut out = String::from("Notas do \"cérebro\" do usuário (use-as para responder):\n\n");
    for n in &notes {
        out.push_str(&format!(
            "- [{}] {}\n",
            n.note_type,
            n.title.clone().unwrap_or_else(|| n.path.clone())
        ));
    }
    out.push_str("\nConteúdo das notas mais relevantes:\n");
    for (score, n) in scored.iter().take(3) {
        if *score == 0 {
            break;
        }
        out.push_str(&format!(
            "\n## {}\n{}\n",
            n.title.clone().unwrap_or_else(|| n.path.clone()),
            n.body.trim()
        ));
    }
    out
}

fn build_prompt(format: ChatFormat, system: &str, messages: &[ChatMsg], think: bool) -> String {
    match format {
        ChatFormat::ChatML => {
            let mut p = format!("<|im_start|>system\n{system}<|im_end|>\n");
            let last = messages.len().saturating_sub(1);
            for (i, m) in messages.iter().enumerate() {
                let role = if m.role == "assistant" {
                    "assistant"
                } else {
                    "user"
                };
                // Qwen3: desliga o raciocínio com /no_think na última fala do usuário.
                let content = if i == last && role == "user" && !think {
                    format!("{} /no_think", m.content)
                } else {
                    m.content.clone()
                };
                p.push_str(&format!("<|im_start|>{role}\n{content}<|im_end|>\n"));
            }
            p.push_str("<|im_start|>assistant\n");
            p
        }
        ChatFormat::Gemma => {
            let mut p = String::new();
            let mut first_user = true;
            for m in messages {
                let role = if m.role == "assistant" {
                    "model"
                } else {
                    "user"
                };
                let content = if first_user && role == "user" {
                    first_user = false;
                    format!("{system}\n\n{}", m.content)
                } else {
                    m.content.clone()
                };
                p.push_str(&format!("<start_of_turn>{role}\n{content}<end_of_turn>\n"));
            }
            p.push_str("<start_of_turn>model\n");
            p
        }
    }
}

/// Conversa com a IA local. Streama tokens via `on_token`.
#[tauri::command]
pub fn chat(
    app: AppHandle,
    state: State<AiState>,
    model_id: String,
    messages: Vec<ChatMsg>,
    reasoning: bool,
    on_token: Channel<String>,
) -> Result<(), String> {
    let def = model_def(&model_id)?;
    let path = model_path(&app, def)?;
    if !path.exists() {
        return Err("o modelo ainda não foi baixado".into());
    }

    // Carrega/cacheia o modelo por id.
    let model = {
        let mut guard = state.loaded.lock().map_err(|e| e.to_string())?;
        let needs = guard.as_ref().map(|(id, _)| id != def.id).unwrap_or(true);
        if needs {
            log::info!("carregando modelo {}", def.id);
            let m = LlamaModel::load_from_file(&state.backend, &path, &LlamaModelParams::default())
                .map_err(|e| format!("falha ao carregar o modelo: {e}"))?;
            *guard = Some((def.id.to_string(), Arc::new(m)));
        }
        guard.as_ref().unwrap().1.clone()
    };

    let last_user = messages
        .iter()
        .rev()
        .find(|m| m.role == "user")
        .map(|m| m.content.clone())
        .unwrap_or_default();
    let system = format!(
        "Você é o Lume, um assistente pessoal que conversa em PT-BR sobre o \"segundo cérebro\" do usuário. Seja direto, caloroso e útil.\n\n{}",
        brain_context(&app, &last_user)
    );
    let prompt = build_prompt(def.format, &system, &messages, reasoning && def.reasoning);

    let threads = std::thread::available_parallelism()
        .map(|n| n.get() as i32)
        .unwrap_or(4);
    let mut ctx = model
        .new_context(
            &state.backend,
            LlamaContextParams::default()
                .with_n_ctx(NonZeroU32::new(8192))
                .with_n_threads(threads)
                .with_n_threads_batch(threads),
        )
        .map_err(|e| e.to_string())?;

    let tokens = model
        .str_to_token(&prompt, AddBos::Always)
        .map_err(|e| e.to_string())?;
    let mut batch = LlamaBatch::new(8192, 1);
    let last_idx = tokens.len() as i32 - 1;
    for (i, tok) in tokens.iter().enumerate() {
        batch
            .add(*tok, i as i32, &[0], i as i32 == last_idx)
            .map_err(|e| e.to_string())?;
    }
    ctx.decode(&mut batch).map_err(|e| e.to_string())?;

    let stop = match def.format {
        ChatFormat::ChatML => "<|im_end|>",
        ChatFormat::Gemma => "<end_of_turn>",
    };
    let mut sampler = LlamaSampler::greedy();
    let base = tokens.len() as i32;
    let mut decoder = encoding_rs::UTF_8.new_decoder();

    for i in 0..1024i32 {
        let tok = sampler.sample(&ctx, batch.n_tokens() - 1);
        sampler.accept(tok);
        if tok == model.token_eos() {
            break;
        }
        let piece = model
            .token_to_piece(tok, &mut decoder, false, None)
            .map_err(|e| e.to_string())?;
        if piece.contains(stop) {
            break;
        }
        let _ = on_token.send(piece);

        batch.clear();
        batch
            .add(tok, base + i, &[0], true)
            .map_err(|e| e.to_string())?;
        ctx.decode(&mut batch).map_err(|e| e.to_string())?;
    }
    Ok(())
}
