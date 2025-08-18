/**
 * AnnotatedTranscript Component
 * 
 * This component displays interview transcripts with interactive annotations.
 * It highlights specific parts of the conversation based on categories like
 * strengths, grammar issues, fluency problems, and lexical usage.
 * 
 * Features:
 * - Flexible quote matching with punctuation tolerance
 * - Visual distinction between student and interviewer messages
 * - Interactive tooltips showing detailed feedback
 * - Support for multiple annotation categories with color coding
 * 
 * The component automatically formats student responses as chat bubbles
 * to make them easily distinguishable from interviewer questions.
 */

import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnnotationCategory, Annotation } from '@/types/interview';
import { ANNOTATION_STYLES, ANNOTATION_LEGEND } from '@/constants/feedback';

interface AnnotatedTranscriptProps {
  /** The full interview transcript text */
  transcript: string;
  /** Array of annotations to highlight in the transcript */
  annotations: Annotation[];
}

/**
 * Escapes special regex characters in a string
 * @param s - String to escape
 * @returns Escaped string safe for regex use
 */

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Builds a flexible regex pattern that matches quotes with tolerance for
 * punctuation and whitespace variations between words
 * @param quote - The quote text to create a pattern for
 * @returns Regex pattern or null if invalid
 */
const buildFlexiblePattern = (quote: string) => {
  const words = quote.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (words.length === 0) return null;
  // \W+ matches any non-word (punctuation/space). Use global and case-insensitive flags.
  return new RegExp(words.join('\\W+'), 'gi');
};

/**
 * Main AnnotatedTranscript component
 * Renders transcript with highlighted annotations and speaker differentiation
 */
export const AnnotatedTranscript: React.FC<AnnotatedTranscriptProps> = ({ transcript, annotations }) => {
  // Filter and sort annotations by quote length (longest first for better matching)
  const sorted = [...(annotations || [])]
    .filter(a => a && a.quote && a.quote.trim().length > 2)
    .sort((a, b) => b.quote.length - a.quote.length);

  /**
   * Renders the transcript with visual chat bubbles for student responses
   * and applies annotations as interactive tooltips
   */
  const renderTranscriptWithBubbles = () => {
    // Split transcript into lines first
    const lines = transcript.split('\n');
    
    return lines.map((line, lineIndex) => {
      const isStudentLine = line.trim().startsWith('Student:');
      
      // Apply annotations to this specific line
      const lineAnnotations = (annotations || []).filter(ann => {
        if (typeof ann.start === 'number' && typeof ann.end === 'number') {
          // Check if annotation falls within this line's character range
          const lineStart = lines.slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0);
          const lineEnd = lineStart + line.length;
          return ann.start >= lineStart && ann.end <= lineEnd;
        }
        // For quote-based annotations, check if quote exists in this line
        return line.includes(ann.quote);
      });

      // Create highlighted content for this line
      const renderLineWithHighlights = (lineText: string) => {
        if (lineAnnotations.length === 0) return lineText;

        let nodes: React.ReactNode[] = [lineText];
        const sortedLineAnnotations = [...lineAnnotations]
          .filter(a => a && a.quote && a.quote.trim().length > 2)
          .sort((a, b) => b.quote.length - a.quote.length);

        sortedLineAnnotations.forEach((ann, idx) => {
          const regex = buildFlexiblePattern(ann.quote);
          if (!regex) return;

          const next: React.ReactNode[] = [];
          
          // Process each existing node
          nodes.forEach((node) => {
            // Skip non-string nodes (already processed annotations)
            if (typeof node !== 'string') { 
              next.push(node); 
              return; 
            }
            
            const text = node as string;
            let lastIndex = 0;
            let match: RegExpExecArray | null;
            
            // Find and replace all matches in this text node
            while ((match = regex.exec(text)) !== null) {
              const start = match.index;
              const end = start + match[0].length;
              
              // Add text before the match
              if (start > lastIndex) {
                next.push(text.slice(lastIndex, start));
              }
              
              // Create annotated span with tooltip
              const matched = text.slice(start, end);
              next.push(
                <TooltipProvider key={`line-${lineIndex}-ann-${idx}-${start}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={ANNOTATION_STYLES[ann.category]}>
                        {matched}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="text-sm font-medium capitalize mb-1">
                        {ann.category}
                      </div>
                      <p className="text-sm mb-1">{ann.explanation}</p>
                      {ann.suggestion && (
                        <p className="text-sm text-muted-foreground">
                          Suggestion: {ann.suggestion}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
              
              lastIndex = end;
              
              // Prevent infinite loops on zero-length matches
              if (regex.lastIndex === start) {
                regex.lastIndex++;
              }
            }
            
            // Add remaining text after all matches
            if (lastIndex < text.length) {
              next.push(text.slice(lastIndex));
            }
          });
          
          nodes = next;
        });

        return nodes;
      };

      const lineContent = renderLineWithHighlights(line);

      // Render student lines with chat bubble styling
      if (isStudentLine) {
        return (
          <div 
            key={lineIndex} 
            className="bg-muted/50 border border-muted rounded-lg px-4 py-3 my-2 ml-4 mr-8 shadow-sm"
          >
            {lineContent}
          </div>
        );
      }

      // Render interviewer lines with simple styling
      return (
        <div key={lineIndex} className="py-1">
          {lineContent}
        </div>
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* Annotation Legend */}
      <div className="flex flex-wrap gap-3 text-sm">
        {ANNOTATION_LEGEND.map(({ category, label, colorClass }) => (
          <span key={category} className="inline-flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${colorClass}`}></span>
            {label}
          </span>
        ))}
      </div>

      {/* Transcript Content */}
      <div className="leading-relaxed text-sm text-foreground/90">
        {renderTranscriptWithBubbles()}
      </div>
    </div>
  );
};

export default AnnotatedTranscript;
