import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { cmdMoveObjectTo, cmdSetObjectBounds } from "@/domain/commands";
import {
  isCornerHandle,
  minSizeForType,
  moveBounds,
  resizeBounds,
  screenDeltaToLogical,
  type ResizeHandle,
} from "@/domain/geometry";
import type { Bounds, PraxisObject } from "@/domain/types";
import { useEditorStore } from "@/stores/editor-store";
import { useUiStore } from "@/stores/ui-store";

/**
 * The canvas interaction controller: pointer-driven drag and resize on top of
 * the centralized geometry module. One controller per canvas; object frames
 * call `startDrag`, selection handles call `startResize`.
 *
 * Design rules that keep the canvas stable:
 *  - A gesture only starts after the pointer moves DRAG_THRESHOLD_PX screen
 *    pixels, so a click can never nudge an object.
 *  - Geometry is always recomputed from the gesture's original bounds plus the
 *    total pointer delta (never accumulated per event) — no drift, no jitter.
 *  - Live updates are coalesced to one store commit per animation frame and
 *    collapse into a single undo entry via the store's transform session.
 *  - Escape aborts the gesture and restores the pre-gesture document.
 */

const DRAG_THRESHOLD_PX = 4;

/** Types whose corner handles preserve aspect ratio by default. */
const ASPECT_DEFAULT_TYPES: ReadonlySet<PraxisObject["type"]> = new Set([
  "image",
  "artifact",
]);

type GestureTarget = {
  bounds: Bounds;
  type: PraxisObject["type"];
};

type Gesture = {
  kind: "drag" | "resize";
  handle: ResizeHandle | null;
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  shiftKey: boolean;
  /** Original bounds per object id (drag can move a multi-selection). */
  targets: Map<string, GestureTarget>;
  /** The object whose handles are active (resize) / that was grabbed (drag). */
  primaryId: string;
  started: boolean;
  raf: number | null;
};

export type ObjectInteraction = {
  startDrag: (
    e: ReactPointerEvent,
    objectIds: string[],
    primaryId: string,
  ) => void;
  startResize: (
    e: ReactPointerEvent,
    objectId: string,
    handle: ResizeHandle,
  ) => void;
};

type Controller = ObjectInteraction & { dispose: () => void };

function createController(scaleRef: RefObject<number>): Controller {
  let gesture: Gesture | null = null;

  const applyFrame = () => {
    const g = gesture;
    if (!g) return;
    g.raf = null;
    const scale = scaleRef.current || 1;
    const delta = screenDeltaToLogical(
      g.lastX - g.startX,
      g.lastY - g.startY,
      scale,
    );

    const store = useEditorStore.getState();
    if (g.kind === "drag") {
      store.transformLive((doc) => {
        for (const [id, target] of g.targets) {
          const next = moveBounds(target.bounds, delta.x, delta.y);
          cmdMoveObjectTo(doc, id, next.x, next.y);
        }
      });
    } else if (g.handle) {
      const target = g.targets.get(g.primaryId);
      if (!target) return;
      const lockAspect =
        g.shiftKey ||
        (ASPECT_DEFAULT_TYPES.has(target.type) && isCornerHandle(g.handle));
      const aspect =
        lockAspect && target.bounds.height > 0
          ? target.bounds.width / target.bounds.height
          : null;
      const next = resizeBounds(target.bounds, g.handle, delta.x, delta.y, {
        min: minSizeForType(target.type),
        aspect,
      });
      store.transformLive((doc) => cmdSetObjectBounds(doc, g.primaryId, next));
    }
  };

  const scheduleFrame = () => {
    if (!gesture || gesture.raf != null) return;
    gesture.raf = requestAnimationFrame(applyFrame);
  };

  const onPointerMove = (e: PointerEvent) => {
    const g = gesture;
    if (!g || e.pointerId !== g.pointerId) return;
    g.lastX = e.clientX;
    g.lastY = e.clientY;
    g.shiftKey = e.shiftKey;

    if (!g.started) {
      const dist = Math.hypot(e.clientX - g.startX, e.clientY - g.startY);
      if (dist < DRAG_THRESHOLD_PX) return;
      g.started = true;
      useEditorStore.getState().beginTransform();
      useUiStore
        .getState()
        .setInteraction(g.kind === "drag" ? "dragging" : "resizing");
      document.body.classList.add(
        g.kind === "drag" ? "praxis-dragging" : "praxis-resizing",
      );
    }
    scheduleFrame();
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    finish(/* commit */ true);
  };

  const onPointerCancel = (e: PointerEvent) => {
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    finish(/* commit */ false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || !gesture) return;
    e.preventDefault();
    e.stopPropagation();
    finish(/* commit */ false);
  };

  const attach = () => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKeyDown, true);
  };

  const detach = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
    window.removeEventListener("keydown", onKeyDown, true);
  };

  const finish = (commit: boolean) => {
    const g = gesture;
    if (!g) return;
    if (g.raf != null) {
      cancelAnimationFrame(g.raf);
      g.raf = null;
    }
    if (g.started) {
      if (commit) {
        applyFrame(); // settle at the final pointer position
        useEditorStore.getState().endTransform();
      } else {
        useEditorStore.getState().cancelTransform();
      }
      useUiStore.getState().setInteraction("idle");
      document.body.classList.remove("praxis-dragging", "praxis-resizing");
    }
    gesture = null;
    detach();
  };

  const begin = (
    e: ReactPointerEvent,
    kind: Gesture["kind"],
    handle: ResizeHandle | null,
    objectIds: string[],
    primaryId: string,
  ) => {
    if (gesture) return; // one gesture at a time
    const doc = useEditorStore.getState().document;
    const targets = new Map<string, GestureTarget>();
    for (const id of objectIds) {
      const obj = doc.objects[id];
      if (!obj || obj.locked) continue;
      targets.set(id, {
        bounds: { x: obj.x, y: obj.y, width: obj.width, height: obj.height },
        type: obj.type,
      });
    }
    if (!targets.has(primaryId)) return;

    gesture = {
      kind,
      handle,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      shiftKey: e.shiftKey,
      targets,
      primaryId,
      started: false,
      raf: null,
    };
    attach();
  };

  return {
    startDrag: (e, objectIds, primaryId) => {
      if (e.button !== 0) return;
      begin(e, "drag", null, objectIds, primaryId);
    },
    startResize: (e, objectId, handle) => {
      if (e.button !== 0) return;
      begin(e, "resize", handle, [objectId], objectId);
    },
    dispose: () => finish(/* commit */ true),
  };
}

export function useObjectInteraction(
  scaleRef: RefObject<number>,
): ObjectInteraction {
  const controllerRef = useRef<Controller | null>(null);
  controllerRef.current ??= createController(scaleRef);

  useEffect(() => {
    const controller = controllerRef.current;
    return () => controller?.dispose();
  }, []);

  return controllerRef.current;
}
