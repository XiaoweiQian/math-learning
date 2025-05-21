import { CSSProperties, MouseEvent as ReactMouseEvent } from "react"; // Aliased MouseEvent

import { getPageFromElement } from "@/lib/pdfjs-dom";

import "@/assets/AreaHighlight.css";

import { Rnd } from "react-rnd";
import type { LTWHP, ViewportHighlight } from "@/lib/types";

/**
 * The props type for {@link AreaHighlight}.
 *
 * @category Component Properties
 */
export interface AreaHighlightProps {
  /**
   * The highlight to be rendered as an {@link AreaHighlight}.
   */
  highlight: ViewportHighlight;

  /**
   * A callback triggered whenever the highlight area is either finished
   * being moved or resized.
   *
   * @param rect - The updated highlight area.
   */
  onChange?(rect: LTWHP): void;

  /**
   * Has the highlight been auto-scrolled into view? By default, this will render the highlight red.
   */
  isScrolledTo?: boolean;

  /**
   * react-rnd bounds on the highlight area. This is useful for preventing the user
   * moving the highlight off the viewer/page.  See [react-rnd docs](https://github.com/bokuweb/react-rnd).
   */
  bounds?: string | Element;

  /**
   * A callback triggered whenever a context menu is opened on the highlight area.
   *
   * @param event - The mouse event associated with the context menu.
   */
  onContextMenu?(event: ReactMouseEvent<HTMLDivElement>): void; // Updated to ReactMouseEvent

  /**
   * Event called whenever the user tries to move or resize an {@link AreaHighlight}.
   */
  onEditStart?(): void;

  /**
   * Custom styling to be applied to the {@link AreaHighlight} component.
   */
  style?: CSSProperties;
}

/**
 * Renders a resizeable and interactive rectangular area for a highlight.
 *
 * @category Component
 */
export const AreaHighlight = ({
  highlight,
  onChange,
  isScrolledTo,
  bounds,
  onContextMenu,
  onEditStart,
  style, // This is the style prop passed to AreaHighlight, not the one for Rnd directly
}: AreaHighlightProps) => {
  const highlightClass = isScrolledTo ? "AreaHighlight--scrolledTo" : "";

  const { color, type, position } = highlight;
  // Default color for area/underline if not provided, though it should always be.
  const highlightColor = color || 'rgba(0, 0, 255, 0.7)'; // Default blue with opacity

  const underlineThickness = 3; // px

  let appliedStyle: CSSProperties = {
    // Base styles for the Rnd component itself will be minimal,
    // the visual styling is applied to its child or via its own style prop.
  };

  let defaultPositionAndSize = {
    x: position.boundingRect.left,
    y: position.boundingRect.top,
    width: position.boundingRect.width,
    height: position.boundingRect.height,
  };

  if (type === 'underline') {
    appliedStyle.background = highlightColor;
    appliedStyle.height = `${underlineThickness}px`;
    // Adjust default position and size for Rnd
    defaultPositionAndSize.y = position.boundingRect.top + position.boundingRect.height - underlineThickness;
    defaultPositionAndSize.height = underlineThickness;
  } else { // 'area' or other types
    // Attempt to make color semi-transparent for background if it's not already rgba
    let backgroundColor = highlightColor;
    if (highlightColor.startsWith('#') && highlightColor.length === 7) {
      backgroundColor = `${highlightColor}4D`; // Approx 30% opacity for hex
    } else if (highlightColor.startsWith('rgb(')) {
      backgroundColor = highlightColor.replace('rgb(', 'rgba(').replace(')', ', 0.3)');
    } else if (highlightColor.startsWith('rgba(')) {
      // If alpha is 1 or not specified at the end, change it
      if (!highlightColor.match(/,\s*[0-9.]+\s*\)$/) || highlightColor.match(/,\s*1\s*\)$/)) {
         backgroundColor = highlightColor.replace(/,\s*1\s*\)$|(\)$)/, ', 0.3)');
      }
    }
    appliedStyle.background = backgroundColor;
    appliedStyle.border = `1px solid ${highlightColor}`;
  }
  
  // Merge with any externally passed style
  appliedStyle = { ...appliedStyle, ...style };


  // Generate key based on position. This forces a remount (and a defaultpos update)
  // whenever highlight position changes (e.g., when updated, scale changes, etc.)
  const key = `${position.boundingRect.pageNumber}-${defaultPositionAndSize.x}-${defaultPositionAndSize.y}-${defaultPositionAndSize.width}-${defaultPositionAndSize.height}-${type}-${color}`;


  const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    // The outer div is mainly for context menu and initial mouse down, Rnd handles its own appearance.
    <div
      className={`AreaHighlight ${highlightClass}`}
      onContextMenu={onContextMenu}
      onMouseDown={handleMouseDown} 
      style={{ // Ensure this div itself doesn't mess with layout if Rnd is absolutely positioned
        position: 'absolute', 
        left: defaultPositionAndSize.x, 
        top: defaultPositionAndSize.y,
        width: defaultPositionAndSize.width,
        height: defaultPositionAndSize.height,
      }}
    >
      <Rnd
        className="AreaHighlight__part"
        style={appliedStyle} // Apply the calculated style to Rnd
        onDragStop={(_, data) => {
          const newRect: LTWHP = {
            ...position.boundingRect, // keep original pageNumber and other potential fields
            top: data.y,
            left: data.x,
            width: defaultPositionAndSize.width, // Keep original width on drag
            height: defaultPositionAndSize.height, // Keep original height on drag (especially for underlines)
          };
          if (type === 'underline') {
            newRect.height = underlineThickness; // Ensure underline height is maintained
          }
          onChange && onChange(newRect);
        }}
        onResizeStop={(_mouseEvent, _direction, ref, _delta, newPosition) => {
          let newRect: LTWHP = {
            top: newPosition.y,
            left: newPosition.x,
            width: ref.offsetWidth,
            height: ref.offsetHeight,
            pageNumber: getPageFromElement(ref)?.number || position.boundingRect.pageNumber,
          };
          if (type === 'underline') {
            // For underlines, maintain fixed height and adjust top if resizing from bottom
            // The Rnd component might make it difficult to only resize width,
            // but we can enforce the height in the data we send back.
            newRect.height = underlineThickness;
            // If resizing changes y, it means top edge moved. We want underline at bottom of original selection.
            // This part is tricky with Rnd. For now, we ensure height is fixed.
            // User might still "move" it vertically with resize handles.
          }
          onChange && onChange(newRect);
        }}
        onDragStart={onEditStart}
        onResizeStart={onEditStart}
        default={defaultPositionAndSize}
        key={key}
        bounds={bounds}
        onClick={(event: Event) => {
          event.stopPropagation();
          event.preventDefault();
        }}
        enableResizing={ type !== 'underline' ? undefined : { // Disable all resize handles for underline except left/right
          top: false,
          right: true,
          bottom: false,
          left: true,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false,
        }}
      />
    </div>
  );
};
