import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface ChatHistoryProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages,
  isStreaming
}) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <Card className="h-64 md:h-80 lg:h-96">
      <CardHeader className="pb-3 px-3 md:px-6">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span className="truncate">Interview Conversation</span>
          {isStreaming && (
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-52 md:h-68 lg:h-80 px-3 md:px-4" ref={scrollAreaRef}>
          {messages.length > 0 ? (
            <div className="space-y-3 md:space-y-4 pb-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex w-full",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] md:max-w-[80%] rounded-lg px-3 py-2 text-xs md:text-sm break-words",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <div className="font-medium text-xs mb-1 opacity-70">
                      {message.role === 'user' ? 'You' : 'Interviewer'}
                    </div>
                    <div className="leading-relaxed">
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full px-4">
              <p className="text-xs md:text-sm text-muted-foreground/50 italic text-center">
                {isStreaming 
                  ? 'Conversation will appear here...' 
                  : 'Start interview to see conversation history'
                }
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};