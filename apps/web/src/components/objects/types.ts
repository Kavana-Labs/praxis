import type {
  PraxisDocument,
  PraxisObject,
  PraxisTheme,
} from "@/domain/types";

/**
 * The object renderer contract. A single registry maps each object type to a
 * renderer; the editor canvas, present mode, and thumbnails all render through
 * it, differing only by `mode`. This is the "render" stage of the
 * Author -> Model -> Project -> Render -> Present pipeline.
 */
export type ObjectRenderMode = "edit" | "present" | "thumbnail";

export interface ObjectViewProps<T extends PraxisObject = PraxisObject> {
  object: T;
  mode: ObjectRenderMode;
  document: PraxisDocument;
  theme: PraxisTheme;
  selected?: boolean;
}
