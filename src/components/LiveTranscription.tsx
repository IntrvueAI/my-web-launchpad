import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import DOMPurify from 'dompurify';

interface LiveTranscriptionProps {
  transcription: string;
  isStreaming: boolean;
}

export const LiveTranscription: React.FC<LiveTranscriptionProps> = ({
  transcription,
  isStreaming
}) => {
  // Sanitize transcription content to prevent XSS
  const sanitizedTranscription = transcription 
    ? DOMPurify.sanitize(transcription, { 
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      })
    : '';

  return (
    <Card className="h-48">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Live Transcription
          {isStreaming && (
            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-32">
          {sanitizedTranscription ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {sanitizedTranscription}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/50 italic">
              {isStreaming ? 'Listening...' : 'Start interview to see live transcription'}
            </p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};