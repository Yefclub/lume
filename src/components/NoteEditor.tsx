import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteNote, readNote, saveNote } from "@/lib/api";
import { rebuildNote, splitNote } from "@/lib/okf";
import { type OkfNote, TYPE_LABEL } from "@/lib/types";

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={
        "flex size-8 items-center justify-center rounded-md transition-colors [&_svg]:size-4 " +
        (active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent")
      }
    >
      {children}
    </button>
  );
}

export function NoteEditor({
  note,
  onSaved,
  onDeleted,
}: {
  note: OkfNote;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(note.title ?? "");
  const [tags, setTags] = useState<string[]>(note.tags);
  const [tagInput, setTagInput] = useState("");
  const [original, setOriginal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      Placeholder.configure({ placeholder: "Escreva aqui… markdown funciona." }),
    ],
    content: "",
    onUpdate: () => setDirty(true),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none dark:prose-invert focus:outline-none",
      },
    },
  });

  useEffect(() => {
    let cancelled = false;
    setTitle(note.title ?? "");
    setTags(note.tags);
    setError(null);
    readNote(note.path)
      .then((md) => {
        if (cancelled) return;
        setOriginal(md);
        editor?.commands.setContent(splitNote(md).body);
        setDirty(false);
      })
      .catch((e) => setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [note.path, editor]);

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "");
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setDirty(true);
    }
    setTagInput("");
  };
  const removeTag = (t: string) => {
    setTags(tags.filter((x) => x !== t));
    setDirty(true);
  };

  const onSave = async () => {
    if (!editor) return;
    setSaving(true);
    setError(null);
    try {
      const body = (
        editor.storage as unknown as { markdown: { getMarkdown(): string } }
      ).markdown.getMarkdown();
      const md = rebuildNote(original, title.trim() || note.path, tags, body);
      await saveNote(note.path, md);
      setOriginal(md);
      setDirty(false);
      onSaved();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm("Apagar esta nota? Não dá pra desfazer.")) return;
    try {
      await deleteNote(note.path);
      onDeleted();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-2.5">
        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
          {TYPE_LABEL[note.type] ?? note.type}
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => void onSave()} disabled={saving || !dirty}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {dirty ? "Salvar" : "Salvo"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void onDelete()} aria-label="Excluir">
            <Trash2 />
          </Button>
        </div>
      </div>

      {error && (
        <div className="border-b border-destructive/40 bg-destructive/10 px-5 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto px-6 py-5">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          placeholder="Título"
          className="w-full bg-transparent text-2xl font-bold outline-none placeholder:text-muted-foreground/50"
        />

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              #{t}
              <button onClick={() => removeTag(t)} className="hover:text-foreground" aria-label={`Remover ${t}`}>
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder="+ tag"
            className="w-20 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
          />
        </div>

        {editor && (
          <div className="mt-5">
            <div className="sticky top-0 z-10 mb-2 flex flex-wrap gap-0.5 rounded-lg border border-border bg-card/80 p-1 backdrop-blur">
              <ToolbarButton title="Negrito" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
                <Bold />
              </ToolbarButton>
              <ToolbarButton title="Itálico" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
                <Italic />
              </ToolbarButton>
              <ToolbarButton title="Título" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                <Heading2 />
              </ToolbarButton>
              <ToolbarButton title="Lista" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                <List />
              </ToolbarButton>
              <ToolbarButton title="Lista numerada" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                <ListOrdered />
              </ToolbarButton>
              <ToolbarButton title="Citação" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                <Quote />
              </ToolbarButton>
            </div>
            <EditorContent editor={editor} />
          </div>
        )}
      </div>
    </div>
  );
}
