//! Formato OKF (Open Knowledge Format) + armazenamento do cérebro.
//!
//! Cada conceito é um arquivo markdown com YAML frontmatter; `type` é
//! obrigatório (mandato OKF). O cérebro real vive em
//! `<app_data_dir>/brain/` — fonte de verdade. Na primeira execução o
//! diretório é semeado com exemplos.

use serde::{Deserialize, Serialize};
use std::path::{Component, Path, PathBuf};
use tauri::{AppHandle, Manager};

/// Uma nota OKF: frontmatter tipado + corpo markdown.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OkfNote {
    /// Caminho relativo ao diretório do cérebro (identidade do conceito).
    pub path: String,
    #[serde(rename = "type")]
    pub note_type: String,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub timestamp: Option<String>,
    pub body: String,
}

#[derive(Debug, Default, Deserialize)]
struct Frontmatter {
    #[serde(rename = "type")]
    note_type: Option<String>,
    title: Option<String>,
    description: Option<String>,
    #[serde(default)]
    tags: Vec<String>,
    timestamp: Option<String>,
}

// ----- Parsing -----------------------------------------------------------

fn split_frontmatter(raw: &str) -> Result<(&str, &str), String> {
    let raw = raw.strip_prefix('\u{feff}').unwrap_or(raw);
    let after = raw
        .strip_prefix("---")
        .ok_or("arquivo OKF deve começar com frontmatter delimitado por '---'")?;
    let after = after.trim_start_matches(['\r', '\n']);
    let close = after
        .find("\n---")
        .ok_or("frontmatter YAML não foi fechado com '---'")?;
    Ok((
        &after[..close],
        after[close + 4..].trim_start_matches(['\r', '\n']),
    ))
}

/// Parseia o conteúdo bruto de um arquivo OKF.
pub fn parse_okf(raw: &str, path: &str) -> Result<OkfNote, String> {
    let (fm_str, body) = split_frontmatter(raw)?;
    let fm: Frontmatter =
        serde_yaml::from_str(fm_str).map_err(|e| format!("frontmatter YAML inválido: {e}"))?;
    let note_type = fm
        .note_type
        .filter(|s| !s.trim().is_empty())
        .ok_or("campo 'type' é obrigatório e não pode ser vazio (OKF)")?;
    Ok(OkfNote {
        path: path.to_string(),
        note_type,
        title: fm.title,
        description: fm.description,
        tags: fm.tags,
        timestamp: fm.timestamp,
        body: body.to_string(),
    })
}

// ----- Armazenamento (app data dir) --------------------------------------

/// Diretório do cérebro (`<app_data_dir>/brain`). Começa VAZIO — o app vem
/// com dados limpos (sem notas de exemplo pré-cadastradas).
fn brain_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("não foi possível resolver o diretório de dados: {e}"))?
        .join("brain");
    std::fs::create_dir_all(&base).map_err(|e| e.to_string())?;
    Ok(base)
}

/// Garante que `rel` é um caminho relativo seguro (sem `..`, sem raiz).
fn safe_rel(rel: &str) -> Result<PathBuf, String> {
    let p = Path::new(rel);
    if rel.is_empty() || !p.components().all(|c| matches!(c, Component::Normal(_))) {
        return Err(format!("caminho inválido: {rel}"));
    }
    if p.extension().and_then(|s| s.to_str()) != Some("md") {
        return Err("o caminho deve terminar em .md".to_string());
    }
    Ok(p.to_path_buf())
}

fn type_folder(t: &str) -> &'static str {
    match t {
        "person" => "people",
        "preference" => "preferences",
        "goal" => "goals",
        "fact" => "facts",
        "project" => "projects",
        "daily" => "daily",
        _ => "notes",
    }
}

fn slugify(s: &str) -> String {
    let mut out = String::new();
    let mut prev_dash = false;
    for ch in s.chars() {
        if ch.is_alphanumeric() {
            out.extend(ch.to_lowercase());
            prev_dash = false;
        } else if !prev_dash {
            out.push('-');
            prev_dash = true;
        }
    }
    let trimmed = out.trim_matches('-').to_string();
    if trimmed.is_empty() {
        "nota".to_string()
    } else {
        trimmed
    }
}

// ----- Comandos ----------------------------------------------------------

/// Lê recursivamente todas as notas OKF válidas do cérebro.
#[tauri::command]
pub fn list_brain_notes(app: AppHandle) -> Result<Vec<OkfNote>, String> {
    let base = brain_dir(&app)?;
    let mut notes = Vec::new();
    for entry in walkdir::WalkDir::new(&base)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let p = entry.path();
        if p.extension().and_then(|s| s.to_str()) == Some("md") {
            let raw = std::fs::read_to_string(p).map_err(|e| e.to_string())?;
            let rel = p
                .strip_prefix(&base)
                .unwrap_or(p)
                .to_string_lossy()
                .replace('\\', "/");
            if let Ok(note) = parse_okf(&raw, &rel) {
                notes.push(note);
            }
        }
    }
    notes.sort_by(|a, b| b.timestamp.cmp(&a.timestamp).then(a.path.cmp(&b.path)));
    Ok(notes)
}

/// Conteúdo bruto (markdown completo) de uma nota.
#[tauri::command]
pub fn read_note(app: AppHandle, path: String) -> Result<String, String> {
    let rel = safe_rel(&path)?;
    let full = brain_dir(&app)?.join(rel);
    std::fs::read_to_string(full).map_err(|e| e.to_string())
}

/// Salva (sobrescreve) uma nota; valida que continua sendo OKF válido.
#[tauri::command]
pub fn save_note(app: AppHandle, path: String, content: String) -> Result<OkfNote, String> {
    let note = parse_okf(&content, &path)?; // valida antes de gravar
    let rel = safe_rel(&path)?;
    let full = brain_dir(&app)?.join(rel);
    if let Some(parent) = full.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&full, content).map_err(|e| e.to_string())?;
    Ok(note)
}

/// Cria uma nota nova (esqueleto) e retorna ela. `timestamp` ISO vem do front.
#[tauri::command]
pub fn create_note(
    app: AppHandle,
    note_type: String,
    title: String,
    timestamp: String,
) -> Result<OkfNote, String> {
    if note_type.trim().is_empty() {
        return Err("type é obrigatório".to_string());
    }
    let base = brain_dir(&app)?;
    let folder = type_folder(&note_type);
    let slug = slugify(&title);
    let mut rel = format!("{folder}/{slug}.md");
    let mut n = 2;
    while base.join(&rel).exists() {
        rel = format!("{folder}/{slug}-{n}.md");
        n += 1;
    }
    let safe_title = title.replace(['\n', '\r'], " ");
    let content = format!(
        "---\ntype: {note_type}\ntitle: {safe_title}\ntags: []\ntimestamp: {timestamp}\n---\n\n# {safe_title}\n\n"
    );
    let full = base.join(&rel);
    if let Some(parent) = full.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&full, &content).map_err(|e| e.to_string())?;
    parse_okf(&content, &rel)
}

/// Apaga uma nota.
#[tauri::command]
pub fn delete_note(app: AppHandle, path: String) -> Result<(), String> {
    let rel = safe_rel(&path)?;
    let full = brain_dir(&app)?.join(rel);
    std::fs::remove_file(full).map_err(|e| e.to_string())
}

/// Caminho absoluto do diretório do cérebro (para exibir na UI).
#[tauri::command]
pub fn brain_path(app: AppHandle) -> Result<String, String> {
    Ok(brain_dir(&app)?.to_string_lossy().to_string())
}

/// Parseia uma string OKF avulsa (útil p/ validar antes de gravar).
#[tauri::command]
pub fn parse_okf_str(content: String) -> Result<OkfNote, String> {
    parse_okf(&content, "<inline>")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parseia_nota_valida() {
        let raw = "---\ntype: goal\ntitle: Teste\ntags: [a, b]\n---\n\nCorpo aqui.";
        let note = parse_okf(raw, "g.md").expect("deveria parsear");
        assert_eq!(note.note_type, "goal");
        assert_eq!(note.title.as_deref(), Some("Teste"));
        assert_eq!(note.tags, vec!["a", "b"]);
        assert_eq!(note.body.trim(), "Corpo aqui.");
    }

    #[test]
    fn rejeita_sem_type() {
        assert!(parse_okf("---\ntitle: x\n---\ny", "x.md").is_err());
    }

    #[test]
    fn rejeita_sem_frontmatter() {
        assert!(parse_okf("só corpo", "x.md").is_err());
    }

    #[test]
    fn safe_rel_bloqueia_traversal() {
        assert!(safe_rel("../escapa.md").is_err());
        assert!(safe_rel("/abs.md").is_err());
        assert!(safe_rel("ok/nota.md").is_ok());
        assert!(safe_rel("sem-extensao").is_err());
    }

    #[test]
    fn slug_normaliza() {
        assert_eq!(slugify("Minha Nota Nova!"), "minha-nota-nova");
        assert_eq!(slugify("  "), "nota");
    }
}
