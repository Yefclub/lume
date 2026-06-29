//! IA local embarcada (llama.cpp via llama-cpp-2).
//!
//! - Baixa um modelo GGUF para `app_data_dir/models` (com progresso).
//! - Carrega o modelo (cache em estado) e gera respostas em streaming,
//!   injetando o contexto do "cérebro" do usuário no prompt.

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

// Modelo padrão: Gemma 3n E4B, quantizado Q4_K_M (texto).
const MODEL_NAME: &str = "Gemma 3n E4B (Q4_K_M)";
const MODEL_FILE: &str = "gemma-3n-E4B-it-Q4_K_M.gguf";
const MODEL_URL: &str =
    "https://huggingface.co/unsloth/gemma-3n-E4B-it-GGUF/resolve/main/gemma-3n-E4B-it-Q4_K_M.gguf?download=true";

pub struct AiState {
    backend: LlamaBackend,
    model: Mutex<Option<Arc<LlamaModel>>>,
}

impl AiState {
    pub fn new() -> Result<Self, String> {
        let backend = LlamaBackend::init().map_err(|e| e.to_string())?;
        Ok(Self {
            backend,
            model: Mutex::new(None),
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

fn model_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(models_dir(app)?.join(MODEL_FILE))
}

#[derive(Serialize)]
pub struct ModelStatus {
    name: String,
    file: String,
    exists: bool,
    path: String,
    url: String,
}

#[tauri::command]
pub fn model_status(app: AppHandle) -> Result<ModelStatus, String> {
    let p = model_path(&app)?;
    Ok(ModelStatus {
        name: MODEL_NAME.into(),
        file: MODEL_FILE.into(),
        exists: p.exists(),
        path: p.to_string_lossy().into(),
        url: MODEL_URL.into(),
    })
}

#[derive(Serialize, Clone)]
#[serde(tag = "event", content = "data")]
pub enum DlEvent {
    Progress { downloaded: u64, total: u64 },
    Done,
    Error { message: String },
}

const MAX_RETRIES: u32 = 20;

/// Baixa o modelo GGUF com progresso, **resumível** (HTTP Range) e com retry.
/// Em falha de rede mantém o `.part` para retomar de onde parou.
#[tauri::command]
pub async fn download_model(app: AppHandle, on_event: Channel<DlEvent>) -> Result<(), String> {
    let path = model_path(&app)?;
    if path.exists() {
        let _ = on_event.send(DlEvent::Done);
        return Ok(());
    }
    let tmp = path.with_extension("part");
    log::info!("iniciando download do modelo: {MODEL_URL}");

    match download_with_resume(&tmp, &on_event).await {
        Ok(()) => {
            tokio::fs::rename(&tmp, &path)
                .await
                .map_err(|e| e.to_string())?;
            log::info!("modelo baixado com sucesso: {}", path.display());
            let _ = on_event.send(DlEvent::Done);
            Ok(())
        }
        Err(e) => {
            log::error!("download do modelo falhou: {e}");
            let _ = on_event.send(DlEvent::Error { message: e.clone() });
            Err(e)
        }
    }
}

/// Download assíncrono, resumível (HTTP Range), com `read_timeout` que detecta
/// estol de conexão (não trava para sempre) — retoma do `.part`.
async fn download_with_resume(
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
        let mut req = client.get(MODEL_URL);
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
            existing = 0; // servidor ignorou o Range: recomeça
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

/// Monta um digest do cérebro para dar contexto ao modelo.
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

    let mut out = String::from(
        "Notas do \"cérebro\" do usuário (use-as para responder; cite os títulos quando relevante):\n\n",
    );
    for n in &notes {
        out.push_str(&format!(
            "- [{}] {}{}\n",
            n.note_type,
            n.title.clone().unwrap_or_else(|| n.path.clone()),
            if n.tags.is_empty() {
                String::new()
            } else {
                format!(" (tags: {})", n.tags.join(", "))
            }
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

/// Conversa com a IA local. Streama tokens via `on_token`.
#[tauri::command]
pub fn chat(
    app: AppHandle,
    state: State<AiState>,
    messages: Vec<ChatMsg>,
    on_token: Channel<String>,
) -> Result<(), String> {
    let path = model_path(&app)?;
    if !path.exists() {
        return Err("o modelo ainda não foi baixado".into());
    }

    // Carrega o modelo uma vez (cache no estado).
    let model = {
        let mut guard = state.model.lock().map_err(|e| e.to_string())?;
        if guard.is_none() {
            let m = LlamaModel::load_from_file(&state.backend, &path, &LlamaModelParams::default())
                .map_err(|e| format!("falha ao carregar o modelo: {e}"))?;
            *guard = Some(Arc::new(m));
        }
        guard.as_ref().unwrap().clone()
    };

    // Prompt no template do Gemma; o system entra na 1ª fala do usuário.
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

    let mut prompt = String::new();
    let mut first_user = true;
    for m in &messages {
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
        prompt.push_str(&format!("<start_of_turn>{role}\n{content}<end_of_turn>\n"));
    }
    prompt.push_str("<start_of_turn>model\n");

    let mut ctx = model
        .new_context(
            &state.backend,
            LlamaContextParams::default().with_n_ctx(NonZeroU32::new(4096)),
        )
        .map_err(|e| e.to_string())?;

    let tokens = model
        .str_to_token(&prompt, AddBos::Always)
        .map_err(|e| e.to_string())?;

    let mut batch = LlamaBatch::new(4096, 1);
    let last_idx = tokens.len() as i32 - 1;
    for (i, tok) in tokens.iter().enumerate() {
        batch
            .add(*tok, i as i32, &[0], i as i32 == last_idx)
            .map_err(|e| e.to_string())?;
    }
    ctx.decode(&mut batch).map_err(|e| e.to_string())?;

    let mut sampler = LlamaSampler::greedy();
    let base = tokens.len() as i32;
    let mut decoder = encoding_rs::UTF_8.new_decoder();

    for i in 0..512i32 {
        let tok = sampler.sample(&ctx, batch.n_tokens() - 1);
        sampler.accept(tok);
        if tok == model.token_eos() {
            break;
        }
        let piece = model
            .token_to_piece(tok, &mut decoder, false, None)
            .map_err(|e| e.to_string())?;
        if piece.contains("<end_of_turn>") {
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
