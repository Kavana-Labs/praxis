import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Code,
  Italic,
  Link2,
  List,
  ListOrdered,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TextObject } from "@/domain/types";
import { useEditorStore } from "@/stores/editor-store";
import { FloatingEditorBar } from "./FloatingEditorBar";

/**
 * Inline rich-text editor (ProseMirror via Tiptap). The whole editing session
 * is recorded as a single undo step using the store's transient transform
 * machinery (begin on mount, live updates per keystroke, commit on unmount).
 * Tiptap keeps its own in-session undo stack; the document store never sees
 * intermediate states as history entries.
 *
 * The formatting bar renders in screen space (portal), so it stays a constant
 * size at any canvas scale and is never clipped by the slide frame.
 */

type ToolbarButtonProps = {
  active?: boolean;
  onClick: () => void;
  title: string;
  icon: LucideIcon;
};

function ToolbarButton({ active, onClick, title, icon: Icon }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => {
        e.preventDefault(); // keep the text editor focused
        onClick();
      }}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
        active ? "bg-brand-100 text-brand-600" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      <Icon size={15} />
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-0.5 my-1 w-px self-stretch bg-gray-200" />;
}

export function TextObjectEditor({ object }: { object: TextObject }) {
  const beginTransform = useEditorStore((s) => s.beginTransform);
  const endTransform = useEditorStore((s) => s.endTransform);
  const updateObjectLive = useEditorStore((s) => s.updateObjectLive);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: object.html || "<p></p>",
    autofocus: "end",
    onUpdate: ({ editor }) => {
      updateObjectLive(object.id, { html: editor.getHTML() });
    },
    editorProps: {
      attributes: {
        class: "praxis-richtext-editor",
        style:
          "font-family: inherit; font-size: 22px; line-height: 1.5; outline: none; min-height: 100%;",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Escape") {
          // editing → selected (the object stays selected)
          useEditorStore.getState().setEditingObject(null);
          return true;
        }
        return false;
      },
    },
  });

  // One undo step per editing session.
  useEffect(() => {
    beginTransform();
    return () => endTransform();
  }, [beginTransform, endTransform]);

  if (!editor) return null;

  const setLink = () => {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("Link URL");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div
      ref={wrapperRef}
      style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}
    >
      <FloatingEditorBar anchorRef={wrapperRef}>
        <ToolbarButton
          title="Bold"
          icon={Bold}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          title="Italic"
          icon={Italic}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          title="Underline"
          icon={UnderlineIcon}
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          title="Strikethrough"
          icon={Strikethrough}
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <ToolbarDivider />
        <ToolbarButton
          title="Inline code"
          icon={Code}
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />
        <ToolbarButton
          title="Bullet list"
          icon={List}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          title="Numbered list"
          icon={ListOrdered}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarDivider />
        <ToolbarButton
          title="Link"
          icon={Link2}
          active={editor.isActive("link")}
          onClick={setLink}
        />
      </FloatingEditorBar>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "8px 10px",
          color: "#0f172a",
          textAlign: object.align ?? "left",
        }}
      >
        <EditorContent editor={editor} style={{ height: "100%" }} />
      </div>
    </div>
  );
}
