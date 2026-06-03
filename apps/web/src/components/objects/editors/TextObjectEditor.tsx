import { useEffect } from "react";
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
import type { TextObject } from "@/domain/types";
import { useEditorStore } from "@/stores/editor-store";

/**
 * Inline rich-text editor (ProseMirror via Tiptap). The whole editing session is
 * recorded as a single undo step using the store's transient transform
 * machinery (begin on mount, live updates per keystroke, commit on unmount).
 */
export function TextObjectEditor({ object }: { object: TextObject }) {
  const beginTransform = useEditorStore((s) => s.beginTransform);
  const endTransform = useEditorStore((s) => s.endTransform);
  const updateObjectLive = useEditorStore((s) => s.updateObjectLive);

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
        style: `font-family: inherit; font-size: 22px; line-height: 1.5; outline: none; height: 100%; text-align: ${object.align ?? "left"};`,
      },
    },
  });

  // One undo step per editing session.
  useEffect(() => {
    beginTransform();
    return () => endTransform();
  }, [beginTransform, endTransform]);

  if (!editor) return null;

  const Btn = ({
    active,
    onClick,
    title,
    children,
  }: {
    active?: boolean;
    onClick: () => void;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`flex h-8 w-8 items-center justify-center rounded-md ${
        active ? "bg-brand-100 text-brand-600" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );

  const Divider = () => <span className="mx-0.5 my-1 w-px self-stretch bg-gray-200" />;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        className="praxis-rt-toolbar"
        style={{
          position: "absolute",
          top: -48,
          left: 0,
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: 4,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          boxShadow: "0 10px 30px rgba(15,23,42,0.14)",
        }}
      >
        <Btn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </Btn>
        <Btn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </Btn>
        <Btn title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={15} />
        </Btn>
        <Btn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={15} />
        </Btn>
        <Divider />
        <Btn title="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code size={15} />
        </Btn>
        <Btn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={15} />
        </Btn>
        <Btn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={15} />
        </Btn>
        <Divider />
        <Btn
          title="Link"
          active={editor.isActive("link")}
          onClick={() => {
            if (editor.isActive("link")) {
              editor.chain().focus().unsetLink().run();
              return;
            }
            const url = window.prompt("Link URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
        >
          <Link2 size={15} />
        </Btn>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "8px 10px",
          color: "#0f172a",
        }}
      >
        <EditorContent editor={editor} style={{ height: "100%" }} />
      </div>
    </div>
  );
}
