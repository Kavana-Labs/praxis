import { Link } from "react-router-dom";
import {
  Download,
  House,
  PanelLeft,
  PanelRight,
  Play,
  Redo2,
  Undo2,
  Upload,
} from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { FileMenu } from "./FileMenu";
import { PraxisMark } from "./PraxisMark";
import { SaveStatusBadge } from "./SaveStatusBadge";

type EditorTopBarProps = {
  onPresent: () => void;
  onImport: () => void;
  onExport: () => void;
  onToggleSlides: () => void;
  onToggleInspector: () => void;
};

function IconButton({
  onClick,
  disabled,
  title,
  className = "",
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

export function EditorTopBar({
  onPresent,
  onImport,
  onExport,
  onToggleSlides,
  onToggleInspector,
}: EditorTopBarProps) {
  const title = useEditorStore((s) => s.document.title);
  const setTitle = useEditorStore((s) => s.setTitle);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);

  return (
    <header className="relative flex h-14 items-center gap-1 border-b border-gray-200 bg-white px-2 sm:h-16 sm:px-3">
      {/* Left cluster */}
      <IconButton onClick={onToggleSlides} title="Slides" className="lg:hidden">
        <PanelLeft size={18} />
      </IconButton>

      <Link to="/" title="Praxis home" className="flex items-center">
        <PraxisMark size={30} />
      </Link>
      <Link
        to="/"
        title="Home"
        className="hidden h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors md:flex"
      >
        <House size={17} />
      </Link>

      <div className="mx-1 hidden h-6 w-px bg-gray-200 sm:block" />

      <IconButton onClick={undo} disabled={!canUndo} title="Undo (⌘Z)" className="hidden sm:flex">
        <Undo2 size={17} />
      </IconButton>
      <IconButton onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)" className="hidden sm:flex">
        <Redo2 size={17} />
      </IconButton>

      <div className="mx-1 hidden h-6 w-px bg-gray-200 md:block" />

      <div className="hidden md:block">
        <FileMenu />
      </div>

      {/* Title — flexible in flow on mobile, absolutely centered on desktop */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        spellCheck={false}
        aria-label="Document title"
        className="mx-1 min-w-0 flex-1 rounded-lg bg-gray-100 px-3 py-1.5 text-center text-sm font-medium text-gray-800 transition-colors hover:bg-gray-200/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-300 lg:absolute lg:left-1/2 lg:top-1/2 lg:mx-0 lg:w-[280px] lg:flex-none lg:-translate-x-1/2 lg:-translate-y-1/2"
      />

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-1">
        <div className="hidden md:flex">
          <SaveStatusBadge />
        </div>

        <div className="mx-1 hidden h-6 w-px bg-gray-200 md:block" />

        <IconButton onClick={onImport} title="Import JSON" className="hidden md:flex">
          <Upload size={17} />
        </IconButton>
        <IconButton onClick={onExport} title="Export JSON" className="hidden md:flex">
          <Download size={17} />
        </IconButton>

        <button
          type="button"
          onClick={onPresent}
          className="ml-1 flex items-center gap-1.5 rounded-lg bg-brand-500 px-2.5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors sm:px-3.5"
        >
          <Play size={15} />
          <span className="hidden sm:inline">Present</span>
        </button>

        <IconButton onClick={onToggleInspector} title="Properties" className="lg:hidden">
          <PanelRight size={18} />
        </IconButton>
      </div>
    </header>
  );
}
