import React, { useState } from 'react'; // Added useState
import { CommentedHighlight } from '@renderer/lib/types';
import { Input } from "@/components/ui/input"; // Added
import { Button } from "@/components/ui/button"; // Added
import { ScrollArea } from "@/components/ui/scroll-area"; // Added
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Added for better structure

// Removed AiChat.css import if not used, assuming Tailwind will handle styling.
// import "@/assets/AiChat.css"

interface AiChatProps {
  // highlights: Array<CommentedHighlight>; // Removed, as per task description
  selectedAiHighlight: CommentedHighlight | null; // Updated prop name
}

const AiChat = ({ selectedAiHighlight }: AiChatProps) => {
  const [chatInput, setChatInput] = useState('');
  // Placeholder for chat messages - in a real app, this would be more complex
  const [messages, setMessages] = useState([
    { sender: 'ai', text: '你好！我们可以讨论关于这个注释的任何问题。' },
  ]);

  const handleSendMessage = () => {
    if (chatInput.trim() === '') return;
    // Add user message (mock)
    setMessages([...messages, { sender: 'user', text: chatInput.trim() }]);
    // Mock AI response after a short delay
    setTimeout(() => {
      setMessages(prevMessages => [...prevMessages, { sender: 'ai', text: `关于 "${chatInput.trim()}"，这是一个有趣的问题。` }]);
    }, 500);
    setChatInput(''); // Clear input
    console.log('Send message:', chatInput);
  };

  if (!selectedAiHighlight) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>AI 聊天</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">请先从左侧注释列表选择一个注释以开始 AI 对话。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col h-full bg-background">
      {/* Display Highlight Details */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>选中的注释</CardTitle>
          <CardDescription>页码: {selectedAiHighlight.position.boundingRect.pageNumber}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {selectedAiHighlight.comment && (
            <div>
              <h4 className="font-semibold text-sm">评论:</h4>
              <p className="text-sm text-muted-foreground">{selectedAiHighlight.comment}</p>
            </div>
          )}
          {selectedAiHighlight.content.text && (
            <div>
              <h4 className="font-semibold text-sm">文本内容:</h4>
              <p className="text-sm text-muted-foreground bg-accent p-2 rounded-md">"{selectedAiHighlight.content.text}"</p>
            </div>
          )}
          {selectedAiHighlight.content.image && (
            <div>
              <h4 className="font-semibold text-sm">截图:</h4>
              <img
                src={selectedAiHighlight.content.image}
                alt="Highlight screenshot"
                className="max-w-full h-auto rounded-md border"
                style={{ maxHeight: '200px' }} // Limit image height for display
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <div className="flex-grow flex flex-col border rounded-lg overflow-hidden">
        <ScrollArea className="flex-grow p-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`p-2 rounded-lg max-w-[70%] ${
                  msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </ScrollArea>
        <div className="p-2 border-t bg-background flex items-center">
          <Input
            placeholder="输入你的问题..."
            className="flex-grow mr-2"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button onClick={handleSendMessage}>发送</Button>
        </div>
      </div>
    </div>
  );
};

export default AiChat;

