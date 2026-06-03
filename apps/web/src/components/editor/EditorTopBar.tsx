import { Link } from "react-router-dom";
import { Download, House, Play, Redo2, Undo2, Upload } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { FileMenu } from "./FileMenu";
import { PraxisMark } from "./PraxisMark";
import { SaveStatusBadge } from "./SaveStatusBadge";

type EditorTopBarProps = {
  onPresent: () => void;
  onImport: () => void;
  onExport: () => void;
};

function IconButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
    >
      {children}
    </button>
  );
}

export function EditorTopBar({ onPresent, onImport, onExport }: EditorTopBarProps) {
  const title = useEditorStore((s) => s.document.title);
  const setTitle = useEditorStore((s) => s.setTitle);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);

  return (
    <header className="relative flex h-16 items-center gap-1 border-b border-gray-200 bg-white px-3">
      {/* Left cluster */}
      <Link to="/" title="Praxis home" className="mr-1 flex items-center">
        <PraxisMark size={32} />
      </Link>
      <Link
        to="/"
        title="Home"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        <House size={17} />
      </Link>

      <div className="mx-1 h-6 w-px bg-gray-200" />

      <IconButton onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">
        <Undo2 size={17} />
      </IconButton>
      <IconButton onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)">
        <Redo2 size={17} />
      </IconButton>

      <div className="mx-1 h-6 w-px bg-gray-200" />

      <FileMenu />

      {/* Centered title pill */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          spellCheck={false}
          aria-label="Document title"
          className="pointer-events-auto w-[280px] rounded-lg bg-gray-100 px-3 py-1.5 text-center text-sm font-medium text-gray-800 hover:bg-gray-200/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-300 transition-colors"
        />
      </div>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-1">
        <SaveStatusBadge />

        <div className="mx-1 h-6 w-px bg-gray-200" />

        <IconButton onClick={onImport} title="Import JSON">
          <Upload size={17} />
        </IconButton>
        <IconButton onClick={onExport} title="Export JSON">
          <Download size={17} />
        </IconButton>

        <button
          type="button"
          onClick={onPresent}
          className="ml-1 flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          <Play size={15} />
          Present
        </button>
      </div>
    </header>
  );
}
