import { MouseEvent } from "react";
import { CommentedHighlight, ViewportHighlight } from "@/lib/types";
import { useHighlightContainerContext } from "@/lib/HighlightContext";
import { usePdfHighlighterContext } from "@/lib/PdfHighlighterContext";
import { TextHighlight } from "./pdf/TextHighlight";
import { AreaHighlight } from "./pdf/AreaHighlight";

interface HighlightContainerProps {
  editHighlight: (
    idToUpdate: string,
    edit: Partial<CommentedHighlight>,
  ) => void;
  onContextMenu?: (
    event: MouseEvent<HTMLDivElement>,
    highlight: ViewportHighlight<CommentedHighlight>,
  ) => void;
}

const HighlightContainer = ({
  editHighlight,
  onContextMenu,
}: HighlightContainerProps) => {
  const {
    highlight,
    viewportToScaled,
    screenshot,
    isScrolledTo,
    highlightBindings,
  } = useHighlightContainerContext<CommentedHighlight>();

  const { toggleEditInProgress } = usePdfHighlighterContext();

  const component = highlight.type === "text" ? (
    <TextHighlight
      isScrolledTo={isScrolledTo}
      highlight={highlight}
      onContextMenu={(event) =>
        onContextMenu && onContextMenu(event, highlight)
      }
    />
  ) : (
    <AreaHighlight
      isScrolledTo={isScrolledTo}
      highlight={highlight}
      onChange={(boundingRect) => {
        const edit = {
          position: {
            boundingRect: viewportToScaled(boundingRect),
            rects: [],
          },
          content: {
            image: screenshot(boundingRect),
          },
        };

        editHighlight(highlight.id, edit);
        toggleEditInProgress(false);
      }}
      bounds={highlightBindings.textLayer}
      onContextMenu={(event) =>
        onContextMenu && onContextMenu(event, highlight)
      }
      onEditStart={() => toggleEditInProgress(true)}
    />
  );


  return (
    component
  );
};

export default HighlightContainer;
