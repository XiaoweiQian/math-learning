import { CSSProperties, useEffect, useRef, useState } from "react";

import { asElement, getPageFromElement, isHTMLElement } from "@/lib/pdfjs-dom";
import "@/assets/MouseSelection.css";

import { PDFViewer } from "pdfjs-dist/types/web/pdf_viewer";
import { viewportPositionToScaled } from "@/lib/coordinates";
import screenshot from "@/lib/screenshot";
import type { LTWH, LTWHP, ScaledPosition, ViewportPosition } from "@/lib/types";

type Coords = {
  x: number;
  y: number;
};

const getBoundingRect = (start: Coords, end: Coords): LTWH => {
  return {
    left: Math.min(end.x, start.x),
    top: Math.min(end.y, start.y),

    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
};

const getContainerCoords = (
  container: HTMLElement,
  pageX: number,
  pageY: number,
) => {
  const containerBoundingRect = container.getBoundingClientRect();
  return {
    x: pageX - containerBoundingRect.left + container.scrollLeft,
    y: pageY - containerBoundingRect.top + container.scrollTop - window.scrollY,
  };
};

/**
 * The props type for {@link MouseSelection}.
 *
 * @category Component Properties
 * @internal
 */
export interface MouseSelectionProps {
  /**
   * The PDFViewer instance containing this MouseSelection.
   */
  viewer: PDFViewer;

  /**
   * Callback triggered whenever the user stops dragging their mouse and a valid
   * mouse selection is made. In general, this will only be called if a mouse
   * selection is rendered.
   *
   * @param viewportPosition - viewport position of the mouse selection.
   * @param scaledPosition - scaled position of the mouse selection.
   * @param image - PNG screenshot of the mouse selection.
   * @param resetSelection - Callback to reset the current selection.
   * @param event - Mouse event associated with ending the selection.
   */
  onSelection?(
    viewportPosition: ViewportPosition,
    scaledPosition: ScaledPosition,
    image: string,
    resetSelection: () => void,
    event: MouseEvent,
  ): void;

  /**
   * Callback triggered whenever the current mouse selection is reset.
   * This includes when dragging ends but the selection is invalid.
   */
  onReset?(): void;

  /**
   * Callback triggered whenever a new valid mouse selection begins.
   *
   * @param event - mouse event associated with the new selection.
   */
  onDragStart?(event: MouseEvent): void;

  /**
   * Condition to check before any mouse selection starts.
   *
   * @param event - mouse event associated with the new selection.
   * @returns - `True` if mouse selection should start.
   */
  enableAreaSelection(event: MouseEvent): boolean;

  /**
   * Callback whenever the mouse selection area changes.
   *
   * @param isVisible - Whether the mouse selection is rendered (i.e., non-zero area)
   */
  onChange?(isVisible: boolean): void;

  /**
   * Optional style props for the mouse selection rectangle.
   */
  style?: CSSProperties;
}

/**
 * A component that enables the creation of rectangular and interactive mouse
 * selections within a given container. NOTE: This does not disable selection in
 * whatever container the component is placed in. That must be handled through
 * the component's events.
 *
 * @category Component
 * @internal
 */
// Define a threshold for dragging, e.g., 5 pixels.
// The square of the distance is used to avoid Math.sqrt.
const DRAG_THRESHOLD_SQUARED = 25; // 5px * 5px

export const MouseSelection = ({
  viewer,
  onSelection,
  onReset,
  onDragStart,
  enableAreaSelection,
  onChange,
  style,
}: MouseSelectionProps) => {
  const [start, setStart] = useState<Coords | null>(null);
  const [end, setEnd] = useState<Coords | null>(null);
  const [locked, setLocked] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const startTargetRef = useRef<HTMLElement | null>(null);
  const mouseDownCoordsRef = useRef<Coords | null>(null);
  const isDraggingRef = useRef(false);

  const reset = () => {
    onReset && onReset();
    setStart(null);
    setEnd(null);
    setLocked(false);
    isDraggingRef.current = false;
    mouseDownCoordsRef.current = null;
    startTargetRef.current = null;
  };

  // Register event listeners onChange
  useEffect(() => {
    onChange && onChange(Boolean(start && end));
    if (!rootRef.current) return;

    const container = asElement(rootRef.current.parentElement);
    if (!container) return;

    const handleMouseUp = (event: MouseEvent) => {
      const wasDragging = isDraggingRef.current;

      // Clear dragging state immediately, regardless of outcome
      isDraggingRef.current = false;
      mouseDownCoordsRef.current = null;

      if (wasDragging && start && end && startTargetRef.current) {
        const boundingRect = getBoundingRect(start, end);
        const shouldEnd = boundingRect.width >= 1 && boundingRect.height >= 1;

        // Check if mouse up is within the container, might be optional based on desired UX
        // const isTargetInContainer = container.contains(asElement(event.target));

        if (!shouldEnd) { // Removed !isTargetInContainer check, often mouseup can be outside
          reset();
          return;
        }

        setLocked(true);

        const page = getPageFromElement(startTargetRef.current);
        if (!page) {
          reset(); // Should not happen if startTargetRef is valid
          return;
        }

        const pageBoundingRect: LTWHP = {
          ...boundingRect,
          top: boundingRect.top - page.node.offsetTop,
          left: boundingRect.left - page.node.offsetLeft,
          pageNumber: page.number,
        };

        const viewportPosition: ViewportPosition = {
          boundingRect: pageBoundingRect,
          rects: [],
        };

        const scaledPosition = viewportPositionToScaled(
          viewportPosition,
          viewer,
        );

        const image = screenshot(
          pageBoundingRect,
          pageBoundingRect.pageNumber,
          viewer,
        );

        onSelection &&
          onSelection(viewportPosition, scaledPosition, image, reset, event);
        // If onSelection doesn't call reset, the selection remains "locked".
        // A new mousedown will call reset().
      } else if (wasDragging) {
        // Was dragging, but state was inconsistent (e.g., start or end was null)
        reset();
      } else {
        // Not dragging (was a click or very minor movement below threshold)
        // Call onReset to signify that the mouse-down interaction sequence has ended.
        onReset && onReset();
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!mouseDownCoordsRef.current || locked) return;

      const currentMouseCoords = getContainerCoords(
        container,
        event.pageX,
        event.pageY,
      );

      if (!isDraggingRef.current) {
        const dx = currentMouseCoords.x - mouseDownCoordsRef.current.x;
        const dy = currentMouseCoords.y - mouseDownCoordsRef.current.y;
        const distanceSquared = dx * dx + dy * dy;

        if (distanceSquared >= DRAG_THRESHOLD_SQUARED) {
          isDraggingRef.current = true;
          onDragStart && onDragStart(event);
          setStart(mouseDownCoordsRef.current);
          setEnd(currentMouseCoords);
        }
      } else {
        // Already dragging, update the end position
        setEnd(currentMouseCoords);
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return; // Only left mouse button

      // Reset any existing state if a new mousedown occurs
      // This handles cases where a previous selection was locked or an interaction was interrupted.
      if (locked || isDraggingRef.current || start) {
        reset();
      }


      const shouldAttemptSelection =
        enableAreaSelection(event) &&
        isHTMLElement(event.target) &&
        Boolean(asElement(event.target).closest(".page"));

      if (!shouldAttemptSelection) {
        return;
      }

      // Call reset to ensure a clean state before potentially starting a new drag
      // This is important if the previous conditions (locked, isDraggingRef, start) were false
      // but we still want to ensure a clean slate for the new interaction.
      reset();


      startTargetRef.current = asElement(event.target);
      mouseDownCoordsRef.current = getContainerCoords(
        container,
        event.pageX,
        event.pageY,
      );
      // Do NOT setStart, setEnd, or call onDragStart here.
      // setLocked(false) is handled by reset().
    };

    /**
     * Although we register the event listeners on the PdfHighlighter component, we encapsulate
     * them in this separate component to enhance maintainability and prevent unnecessary
     * rerenders of the PdfHighlighter itself. While synthetic events on PdfHighlighter would
     * be preferable, we need to register "mouseup" on the entire document anyway. Therefore,
     * we can't avoid using useEffect. We must re-register all events on state changes, as
     * custom event listeners may otherwise receive stale state.
     */
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mousedown", handleMouseDown);

    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [start, end, enableAreaSelection]);

  return (
    <div className="MouseSelection-container" ref={rootRef}>
      {start && end && (
        <div
          className="MouseSelection"
          style={{ ...getBoundingRect(start, end), ...style }}
        />
      )}
    </div>
  );
};
