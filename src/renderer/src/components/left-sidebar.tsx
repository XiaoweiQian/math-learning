import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area"; // Added
import { Bot } from 'lucide-react'; // Added for AI icon
import { CommentedHighlight } from '../../lib/types'; // Added

type Tab = 'annotations' | 'aiChat';

interface LeftSidebarProps extends React.ComponentProps<typeof Sidebar> {
  highlights: CommentedHighlight[];
  onSelectAiChatTab: () => void; // To switch tab from App.tsx
  onAiAction: (highlight: CommentedHighlight) => void; // Placeholder for AI action
}

export function LeftSidebar({ highlights, onSelectAiChatTab, onAiAction, ...props }: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('annotations');

  const sortedHighlights = [...highlights].sort((a, b) => b.timestamp - a.timestamp);

  // Function to handle AI button click
  const handleAiButtonClick = (highlight: CommentedHighlight) => {
    onAiAction(highlight); // Call the passed-in function
    onSelectAiChatTab(); // Switch to AI Chat tab
    setActiveTab('aiChat'); // Also set local state for immediate UI update
  };


  return (
    <Sidebar collapsible="icon" className="overflow-y-auto" {...props}>
      <SidebarContent className="flex flex-col p-2">
        <div className="flex justify-around mb-4">
          <Button
            variant={activeTab === 'annotations' ? 'secondary' : 'ghost'}
            onClick={() => setActiveTab('annotations')}
            className="flex-1 mr-1"
          >
            注释
          </Button>
          <Button
            variant={activeTab === 'aiChat' ? 'secondary' : 'ghost'}
            onClick={() => {
              setActiveTab('aiChat');
              onSelectAiChatTab(); // Inform App.tsx if needed, or handle locally
            }}
            className="flex-1 ml-1"
          >
            AI 聊天
          </Button>
        </div>

        <div className="flex-grow">
          {activeTab === 'annotations' && (
            <ScrollArea className="h-full w-full rounded-md border p-2">
              {sortedHighlights.length === 0 ? (
                <p className="text-center text-gray-500">暂无注释</p>
              ) : (
                <ul className="space-y-2">
                  {sortedHighlights.map((highlight) => (
                    <li key={highlight.id} className="border p-2 rounded-md relative group">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleAiButtonClick(highlight)}
                        title="AI处理此注释"
                      >
                        <Bot className="h-4 w-4" />
                      </Button>
                      {highlight.comment && (
                        <p className="text-sm font-semibold mb-1">{highlight.comment}</p>
                      )}
                      {highlight.content?.text && (
                        <p className="text-xs text-gray-600 mb-1 truncate">
                          "{highlight.content.text.substring(0, 50)}..."
                        </p>
                      )}
                      {highlight.content?.image && (
                        <img
                          src={highlight.content.image}
                          alt="Area highlight"
                          className="max-w-full h-auto rounded-sm mb-1"
                          style={{ maxHeight: '100px' }} // Limit image height
                        />
                      )}
                      <p className="text-xs text-gray-400">
                        Page {highlight.position.boundingRect.pageNumber}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          )}
          {activeTab === 'aiChat' && (
            <div className="p-2">AI 聊天界面将显示在这里</div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
