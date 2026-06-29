//! Parser do formato OKF (Open Knowledge Format).
//!
//! Cada conceito do "cérebro" é um arquivo markdown com YAML frontmatter;
//! o campo `type` é obrigatório (mandato OKF). Estes arquivos são a
//! **fonte de verdade** — o índice SQLite (Fase 1) é derivado/descartável.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Uma nota OKF: frontmatter tipado + corpo markdown.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OkfNote {
    /// Caminho relativo ao diretório do cérebro (identidade do conceito).
    pub path: String,
    /// Campo OKF obrigatório.
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
    /// Corpo markdown abaixo do frontmatter.
    pub body: String,
}

/// Subconjunto tipado do frontmatter que o Lume entende hoje.
/// Campos extras no YAML são ignorados (continuam editáveis no arquivo).
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

/// Separa o bloco de frontmatter YAML do corpo markdown.
fn split_frontmatter(raw: &str) -> Result<(&str, &str), String> {
    let raw = raw.strip_prefix('\u{feff}').unwrap_or(raw); // remove BOM se houver
    let after = raw
        .strip_prefix("---")
        .ok_or("arquivo OKF deve começar com frontmatter delimitado por '---'")?;
    let after = after.trim_start_matches(['\r', '\n']);
    let close = after
        .find("\n---")
        .ok_or("frontmatter YAML não foi fechado com '---'")?;
    let fm = &after[..close];
    let body = after[close + 4..].trim_start_matches(['\r', '\n']);
    Ok((fm, body))
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

/// Resolve o diretório do cérebro. Em `tauri dev` o cwd é `src-tauri/`,
/// então `../brain.example` aponta para a raiz do repo.
fn resolve_brain_dir(dir: Option<String>) -> Result<PathBuf, String> {
    if let Some(d) = dir {
        let p = PathBuf::from(d);
        return if p.is_dir() {
            Ok(p)
        } else {
            Err(format!("diretório não encontrado: {}", p.display()))
        };
    }
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    for cand in ["../brain.example", "brain.example"] {
        let p = cwd.join(cand);
        if p.is_dir() {
            return Ok(p);
        }
    }
    Err("diretório do cérebro não encontrado (passe `dir` ou crie `brain.example/`)".to_string())
}

/// Lê recursivamente todos os `.md` válidos do diretório do cérebro.
#[tauri::command]
pub fn list_brain_notes(dir: Option<String>) -> Result<Vec<OkfNote>, String> {
    let base = resolve_brain_dir(dir)?;
    let mut notes = Vec::new();
    for entry in walkdir::WalkDir::new(&base)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let p: &Path = entry.path();
        if p.extension().and_then(|s| s.to_str()) == Some("md") {
            let raw = std::fs::read_to_string(p).map_err(|e| e.to_string())?;
            let rel = p
                .strip_prefix(&base)
                .unwrap_or(p)
                .to_string_lossy()
                .replace('\\', "/");
            // Notas inválidas são puladas no MVP; Fase 1 reporta erros na UI.
            if let Ok(note) = parse_okf(&raw, &rel) {
                notes.push(note);
            }
        }
    }
    notes.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(notes)
}

/// Parseia uma string OKF avulsa (útil p/ a IA validar antes de gravar).
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
        let raw = "---\ntitle: Sem tipo\n---\nx";
        assert!(parse_okf(raw, "x.md").is_err());
    }

    #[test]
    fn rejeita_sem_frontmatter() {
        assert!(parse_okf("só corpo", "x.md").is_err());
    }
}
