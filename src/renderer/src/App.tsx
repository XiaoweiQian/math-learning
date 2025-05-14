import { LeftSidebar } from "@/components/left-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import { useRef, useState } from 'react';
import HighlightContainer from './components/HighlightContainer';
import { CommentedHighlight } from '@/lib/types';
import { PdfHighlighterUtils } from './lib/PdfHighlighterContext';
import { PdfLoader } from './components/pdf/PdfLoader';
import { PdfHighlighter } from './components/pdf/PdfHighlighter';
import { Highlight} from '@/lib/types';

const PDF_URL = "../src/assets/Abstract_Algeb.pdf";

function App(): React.JSX.Element {

  const [highlights, setHighlights] = useState<Array<Highlight>>([]);

  // Refs for PdfHighlighter utilities
  const highlighterUtilsRef = useRef<PdfHighlighterUtils>(null);

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

  return (
    <>
      <SidebarProvider>
        <LeftSidebar side="left"/>
        <SidebarInset>
          <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </header>

          <div className="h-screen">
          <PdfLoader document={PDF_URL}>
            {(pdfDocument) => (
              <PdfHighlighter
                pdfDocument={pdfDocument}
                utilsRef={(_pdfHighlighterUtils) => {
                  highlighterUtilsRef.current = _pdfHighlighterUtils;
                }}
                highlights={highlights}
              >
                <HighlightContainer
                    editHighlight={editHighlight}
                    //onContextMenu={handleContextMenu}
                />
              </PdfHighlighter>
            )}
          </PdfLoader>
          </div>
        </SidebarInset>
      </SidebarProvider>

    </>
  )
}

export default App
