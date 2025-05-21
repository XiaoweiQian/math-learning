import { LeftSidebar } from "@/components/left-sidebar";
import { Separator } from "@/components/ui/separator";
import { MousePointer, Square, Underline } from 'lucide-react'; // Added Underline
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"; // Assuming this is the correct path after shadcn add

import { MouseEvent, useEffect, useRef, useState } from 'react';
import HighlightContainer from './components/HighlightContainer';
import { CommentedHighlight, GhostHighlight, PdfSelection, Tip, ViewportHighlight } from '@/lib/types';
import { PdfHighlighterUtils } from './lib/PdfHighlighterContext';
import { PdfLoader } from './components/pdf/PdfLoader';
import { PdfHighlighter } from './components/pdf/PdfHighlighter';
import { Highlight } from '@/lib/types';
import AiChat from "./components/AiChat"; // Import the AiChat component
import ContextMenu, { ContextMenuProps } from "./components/ContextMenu";
import CommentForm from "./components/CommentForm";
import { Button } from "./components/ui/button";

// Updated HighlightingMode type
type HighlightingMode = 'text' | 'rectangle' | 'underline' | 'none';

const PDF_URL = "../src/assets/Abstract_Algeb.pdf";

// Predefined colors
const PREDEFINED_COLORS = [
  'rgba(255, 173, 173, 0.7)', // Pastel Red
  'rgba(255, 214, 165, 0.7)', // Pastel Orange
  'rgba(253, 255, 182, 0.7)', // Pastel Yellow
  'rgba(202, 255, 191, 0.7)', // Pastel Green
  'rgba(155, 246, 255, 0.7)', // Pastel Blue
  'rgba(160, 196, 255, 0.7)'  // Pastel Indigo
];

const getNextId = () => String(Math.random()).slice(2);

const parseIdFromHash = () => {
  return document.location.hash.slice("#highlight-".length);
};


function App(): React.JSX.Element {
  const [highlightingMode, setHighlightingMode] = useState<HighlightingMode>('none');
  const [highlights, setHighlights] = useState<Array<CommentedHighlight>>([]);
  const [selectedColor, setSelectedColor] = useState<string>(PREDEFINED_COLORS[2]); // Default to Pastel Yellow

  // Add a new state for the selected highlight for AI processing
  const [selectedAiHighlight, setSelectedAiHighlight] = useState<CommentedHighlight | null>(null);
  const highlighterUtilsRef = useRef<PdfHighlighterUtils>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuProps | null>(null);
  // Add a ref for LeftSidebar to control its active tab
  // Note: This is a simplified approach. A more robust solution might involve a shared state/context.
  // However, the LeftSidebar itself manages its activeTab state internally based on user clicks.
  // We need a way to tell LeftSidebar to switch to 'aiChat' tab when the AI button on an annotation is clicked.
  // The `onSelectAiChatTab` prop passed to LeftSidebar will be used for this.

  const toggleHighlightingMode = (mode: HighlightingMode) => {
    console.log('[App.tsx] Toggling highlighting mode to:', mode);
    // If the current mode is 'none', or if a different mode is clicked, switch to that mode.
    // If the same mode button is clicked again, switch to 'none'.
    setHighlightingMode(prevMode => {
      if (prevMode === mode) {
        return 'none'; // Toggle off if same mode is clicked
      }
      return mode; // Switch to new mode
    });
  };



  // Click listeners for context menu
  useEffect(() => {
    const handleClick = () => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [contextMenu]);

  const getHighlightById = (id: string) => {
    return highlights.find((highlight) => highlight.id === id);
  };


  // Scroll to highlight based on hash in the URL
  const scrollToHighlightFromHash = () => {
    const highlight = getHighlightById(parseIdFromHash());

    if (highlight && highlighterUtilsRef.current) {
      highlighterUtilsRef.current.scrollToHighlight(highlight);
    }
  };


  // Hash listeners for autoscrolling to highlights
  useEffect(() => {
    window.addEventListener("hashchange", scrollToHighlightFromHash);

    return () => {
      window.removeEventListener("hashchange", scrollToHighlightFromHash);
    };
  }, [scrollToHighlightFromHash]);


  const handleContextMenu = (
    event: MouseEvent<HTMLDivElement>,
    highlight: ViewportHighlight<CommentedHighlight>,
  ) => {
    event.preventDefault();

    setContextMenu({
      xPos: event.clientX,
      yPos: event.clientY,
      deleteHighlight: () => deleteHighlight(highlight),
      editComment: () => editComment(highlight),
    });
  };

  const addHighlight = (highlight: GhostHighlight, comment: string) => {
    console.log("Saving highlight", highlight);
    let type: 'text' | 'area' = 'text'; // Default type
    if (highlightingMode === 'rectangle' || highlightingMode === 'underline') {
      type = 'area';
    }

    const newHighlight: CommentedHighlight = {
      ...highlight,
      comment,
      id: getNextId(),
      timestamp: Date.now(),
      color: selectedColor, // Save selected color
      type: type, // Save highlight type based on mode
    };
    setHighlights([newHighlight, ...highlights]);
    // Optionally reset mode after highlight is added, or keep it for multiple highlights
    // setHighlightingMode('none'); 
  };


  const deleteHighlight = (highlight: ViewportHighlight | Highlight) => {
    console.log("Deleting highlight", highlight);
    setHighlights(highlights.filter((h) => h.id != highlight.id));
  };


  // Open comment tip and update highlight with new user input
  const editComment = (highlight: ViewportHighlight<CommentedHighlight>) => {
    if (!highlighterUtilsRef.current) return;

    const editCommentTip: Tip = {
      position: highlight.position,
      content: (
        <CommentForm
          placeHolder={highlight.comment}
          onSubmit={(input) => {
            editHighlight(highlight.id, { comment: input });
            highlighterUtilsRef.current!.setTip(null);
            highlighterUtilsRef.current!.toggleEditInProgress(false);
          }}
        ></CommentForm>
      ),
    };

    highlighterUtilsRef.current.setTip(editCommentTip);
    highlighterUtilsRef.current.toggleEditInProgress(true);
  };


  const editHighlight = (
    idToUpdate: string,
    edit: Partial<CommentedHighlight>,
  ) => {
    console.log(`Editing highlight ${idToUpdate} with `, edit);
    setHighlights(
      highlights.map((highlight) =>
        highlight.id === idToUpdate ? { ...highlight, ...edit } : highlight,
      ),
    );
  };

  const textSelection = (selection: PdfSelection, isArea: boolean) => {
    let ghostHighlight = selection.makeGhostHighlight();
    
    // Determine type based on current mode
    let type: 'text' | 'area' = 'text';
    if (highlightingMode === 'rectangle' || highlightingMode === 'underline') {
        type = 'area';
    } else if (highlightingMode === 'text') {
        type = 'text';
    }
    // If isArea is true from PdfHighlighter, it's definitely an area
    if (isArea) type = 'area';


    // For underline, we might want to make the highlight very thin.
    // This logic might be better placed in AreaHighlight.tsx when rendering,
    // but we can also adjust the position data here if necessary.
    // For now, we just mark its type correctly and use the selected color.
    if (type === 'area' && highlightingMode === 'underline') {
      // Potentially adjust highlight.position.boundingRect.height here if needed,
      // or add a sub-type/flag for underline to be handled by rendering component.
      // For now, simply ensuring type is 'area' and color is stored.
      console.log("Creating underline-intended area highlight");
    }
    
    addHighlight({ ...ghostHighlight, type }, "");
  };

  // Function to be called by LeftSidebar to switch its tab to AI Chat
  // This function will be passed as a prop to LeftSidebar
  // The LeftSidebar will also need an internal way to set its activeTab
  const handleSelectAiChatTab = () => {
    // The LeftSidebar component itself will handle setting its activeTab state.
    // This function is more of a notification or could be used if App.tsx
    // needed to orchestrate something else when this happens.
    // For now, we can log it.
    console.log('[App.tsx] Instructing LeftSidebar to select AI Chat tab.');
    // If LeftSidebar's activeTab was controlled by App.tsx, we would set it here.
    // e.g., setLeftSidebarActiveTab('aiChat');
  };

  // Function to handle the AI action on a highlight
  const handleAiAction = (highlight: CommentedHighlight) => {
    console.log('[App.tsx] AI action triggered for highlight:', highlight);
    setSelectedAiHighlight(highlight); // Store the selected highlight
    // The LeftSidebar's handleAiButtonClick will call onSelectAiChatTab to switch.
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-screen">
      <ResizablePanel defaultSize={70} minSize={50}> {/* Left Panel for Sidebar and PDF Viewer */}
        <SidebarProvider>
          <LeftSidebar
            side="left"
            highlights={highlights}
            onSelectAiChatTab={handleSelectAiChatTab}
            onAiAction={handleAiAction}
          />
          <SidebarInset>
            <header className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b bg-background p-4 flex-wrap">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              
              <Button
                variant={highlightingMode === 'text' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => toggleHighlightingMode('text')}
                title="文本选择高亮"
              >
                <MousePointer className="h-4 w-4" />
              </Button>
              <Button
                variant={highlightingMode === 'rectangle' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => toggleHighlightingMode('rectangle')}
                title="矩形选择高亮"
              >
                <Square className="h-4 w-4" />
              </Button>
              <Button
                variant={highlightingMode === 'underline' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => toggleHighlightingMode('underline')}
                title="下划线高亮"
              >
                <Underline className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="mx-2 h-4" />

              <div className="flex items-center gap-1">
                {PREDEFINED_COLORS.map((color) => (
                  <Button
                    key={color}
                    variant="outline"
                    size="icon"
                    className={`h-6 w-6 p-0 ${selectedColor === color ? 'ring-2 ring-ring ring-offset-2' : ''}`}
                    onClick={() => setSelectedColor(color)}
                    title={`选择颜色: ${color}`}
                  >
                    <div
                      className="h-4 w-4 rounded-sm"
                      style={{ backgroundColor: color }}
                    />
                  </Button>
                ))}
              </div>
            </header>
            {/* Ensure content area is scrollable and accounts for header height */}
            <div className="h-[calc(100vh-5rem)] overflow-y-auto"> {/* Adjust 3.5rem if header height changes, might need more for two rows */}
              <PdfLoader document={PDF_URL}>
                {(pdfDocument) => (
                  <PdfHighlighter
                    enableAreaSelection={(isAreaSelection) => {
                      if (highlightingMode === 'rectangle' || highlightingMode === 'underline') return true;
                      return false;
                    }}
                    pdfDocument={pdfDocument}
                    utilsRef={(_pdfHighlighterUtils) => {
                      highlighterUtilsRef.current = _pdfHighlighterUtils;
                    }}
                    textSelectionColor={highlightingMode === 'text' ? selectedColor : undefined}
                    onSelection={(selection, isArea) => textSelection(selection, isArea)}
                    highlights={highlights}
                  >
                    <HighlightContainer
                      editHighlight={editHighlight}
                      onContextMenu={handleContextMenu}
                    />
                  </PdfHighlighter>
                )}
              </PdfLoader>
            </div>
            {contextMenu && <ContextMenu {...contextMenu} />}

          </SidebarInset>
        </SidebarProvider>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel minSize={20}> {/* Right Panel for AI Chat */}
        <AiChat highlights={highlights} selectedAiHighlight={selectedAiHighlight} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export default App;
