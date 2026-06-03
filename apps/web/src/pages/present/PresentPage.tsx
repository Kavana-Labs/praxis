import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useEditorBootstrap } from "@/editor/usePersistence";
import { PresentationView } from "@/components/presentation/PresentationView";

/**
 * Present route. Bootstraps the document (so a hard reload at /present still
 * loads the last presentation) and renders Present Mode. Exiting returns to the
 * editor.
 */
export function PresentPage() {
  useEditorBootstrap();
  const navigate = useNavigate();
  const exit = useCallback(() => navigate("/editor"), [navigate]);
  return <PresentationView onExit={exit} />;
}

export default PresentPage;
