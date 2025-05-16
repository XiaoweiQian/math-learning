import { LeftSidebar } from "@/components/left-sidebar";
import { Separator } from "@/components/ui/separator";
import { MousePointer, Square } from 'lucide-react';
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

import { MouseEvent,useEffect, useRef, useState } from 'react';
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

type HighlightingMode = 'text' | 'rectangle' | 'none';

const PDF_URL = "../src/assets/Abstract_Algeb.pdf";

const getNextId = () => String(Math.random()).slice(2);

const parseIdFromHash = () => {
  return document.location.hash.slice("#highlight-".length);
};


function App(): React.JSX.Element {
  const [highlightingMode, setHighlightingMode] = useState<HighlightingMode>('none');
  const [highlights, setHighlights] = useState<Array<CommentedHighlight>>([]);
  const highlighterUtilsRef = useRef<PdfHighlighterUtils>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuProps | null>(null);

  const toggleHighlightingMode = (mode: HighlightingMode) => {
    console.log('[App.tsx] Toggling highlighting mode to:', mode);
    setHighlightingMode(prevMode => (prevMode === mode ? 'none' : mode));
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
    setHighlights([{ ...highlight, comment, id: getNextId() }, ...highlights]);
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

  const textSelection = (selection: PdfSelection) => {
    addHighlight(selection.makeGhostHighlight(),"");
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-screen">
      <ResizablePanel defaultSize={70} minSize={50}> {/* Left Panel for Sidebar and PDF Viewer */}
        <SidebarProvider>
          <LeftSidebar side="left" />
          <SidebarInset>
            <header className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b bg-background p-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              {/* You can add a title or other header elements here if needed */}
              {/* 在这里或 SidebarTrigger 之后添加新的图标按钮 */}
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
            </header>
            {/* Ensure content area is scrollable and accounts for header height */}
            <div className="h-[calc(100vh-3.5rem)] overflow-y-auto"> {/* Adjust 3.5rem if header height changes */}
              <PdfLoader document={PDF_URL}>
                {(pdfDocument) => (
                  <PdfHighlighter
                    enableAreaSelection={() => highlightingMode === 'rectangle' }
                    pdfDocument={pdfDocument}
                    utilsRef={(_pdfHighlighterUtils) => {
                      highlighterUtilsRef.current = _pdfHighlighterUtils;
                    }}
                    textSelectionColor={highlightingMode === 'text'? "rgba(255, 226, 143, 1)" : undefined}
                    onSelection={(selection)=>textSelection(selection)}


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
      <ResizablePanel  minSize={20}> {/* Right Panel for AI Chat */}
        <AiChat highlights={highlights} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export default App;
