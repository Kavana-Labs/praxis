import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Download,
  House,
  MonitorUp,
  PanelLeft,
  PanelRight,
  Play,
  Redo2,
  Undo2,
  Upload,
} from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { useUiStore } from "@/stores/ui-store";
import { FileMenu } from "./FileMenu";
import { PraxisMark } from "./PraxisMark";
import { SaveStatusBadge } from "./SaveStatusBadge";

/**
 * Document title field: edits a local draft, commits one history entry on
 * blur or Enter, and cancels cleanly on Escape.
 */
function DocumentTitleInput() {
  const title = useEditorStore((s) => s.document.title);
  const [draft, setDraft] = useState<string | null>(null);
  // Ref, not state: blur() fires synchronously inside the Escape handler,
  // before any state update lands.
  const cancelled = useRef(false);

  // If the title changes underneath an idle field (undo, import), drop the
  // draft — done during render (React's reset-state-on-prop-change pattern).
  const [lastTitle, setLastTitle] = useState(title);
  if (lastTitle !== title) {
    setLastTitle(title);
    setDraft(null);
  }

  const commit = (value: string) => {
    const next = value.trim();
    if (next && next !== title) {
      useEditorStore.getState().setTitle(next);
    }
    setDraft(null);
  };

  return (
    <input
      value={draft ?? title}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        if (cancelled.current) {
          cancelled.current = false;
          setDraft(null);
          return;
        }
        commit(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur(); // commits via onBlur
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelled.current = true;
          setDraft(null);
          e.currentTarget.blur();
        }
      }}
      spellCheck={false}
      aria-label="Document title"
      title="Rename presentation"
      className="mx-1 min-w-0 flex-1 rounded-lg bg-gray-100 px-3 py-1.5 text-center text-sm font-medium text-gray-800 transition-colors hover:bg-gray-200/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-300 lg:absolute lg:left-1/2 lg:top-1/2 lg:mx-0 lg:w-[280px] lg:flex-none lg:-translate-x-1/2 lg:-translate-y-1/2"
    />
  );
}

/** Subtle readout of the slide viewport's fit scale. */
function ZoomIndicator() {
  const scale = useUiStore((s) => s.canvasScale);
  return (
    <span
      className="hidden w-12 text-center text-xs tabular-nums text-gray-400 lg:inline"
      title="Slide zoom (fits the window)"
      aria-label={`Slide zoom ${Math.round(scale * 100)} percent`}
    >
      {Math.round(scale * 100)}%
    </span>
  );
}

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
      aria-label={title}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-30 ${className}`}
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
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const isMac =
    typeof navigator !== "undefined" && /Mac|iP/.test(navigator.platform);
  const mod = isMac ? "⌘" : "Ctrl+";

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

      <IconButton
        onClick={undo}
        disabled={!canUndo}
        title={`Undo (${mod}Z)`}
        className="hidden sm:flex"
      >
        <Undo2 size={17} />
      </IconButton>
      <IconButton
        onClick={redo}
        disabled={!canRedo}
        title={`Redo (${mod}⇧Z)`}
        className="hidden sm:flex"
      >
        <Redo2 size={17} />
      </IconButton>

      <div className="mx-1 hidden h-6 w-px bg-gray-200 md:block" />

      <div className="hidden md:block">
        <FileMenu />
      </div>

      {/* Title — flexible in flow on mobile, absolutely centered on desktop */}
      <DocumentTitleInput />

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-1">
        <ZoomIndicator />
        <div className="hidden md:flex">
          <SaveStatusBadge />
        </div>

        <div className="mx-1 hidden h-6 w-px bg-gray-200 md:block" />

        <IconButton
          onClick={() => useUiStore.getState().openImportModal()}
          title="Import presentation (PowerPoint or Google Slides)"
          className="hidden md:flex"
        >
          <MonitorUp size={17} />
        </IconButton>
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
