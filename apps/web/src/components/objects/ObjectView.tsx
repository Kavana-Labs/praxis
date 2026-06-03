import type { FC } from "react";
import type { PraxisObject } from "@/domain/types";
import { OBJECT_RENDERERS } from "./registry";
import type { ObjectViewProps } from "./types";

/**
 * Dispatches an object to its registered renderer. The cast is safe because the
 * registry is keyed by the same discriminant as the object union.
 */
export function ObjectView(props: ObjectViewProps<PraxisObject>) {
  const Renderer = OBJECT_RENDERERS[props.object.type] as FC<ObjectViewProps<PraxisObject>>;
  return <Renderer {...props} />;
}
