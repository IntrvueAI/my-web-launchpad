import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Compass, Check } from 'lucide-react';
import type { Mode } from '@/interview/engine/types';
import type { TopicDef } from '@/interview/subjects/types';

export interface SetupChoice {
  mode: Mode;
  topic?: string;
}

interface InterviewSetupProps {
  /** The strands available for practice-mode topic selection. */
  topics: TopicDef[];
  onConfirm: (choice: SetupChoice) => void;
}

/**
 * Pre-interview setup for engine-driven interviews — the flow diagram's "modefork".
 * Mock samples all strands adaptively; Practice lets the student pick a single strand to drill
 * (and switch any time once live). Mirrors maths-mini-interview-flow.json.
 */
export const InterviewSetup: React.FC<InterviewSetupProps> = ({ topics, onConfirm }) => {
  const [mode, setMode] = useState<Mode>('mock');
  const [topic, setTopic] = useState<string>(topics[0]?.id ?? '');

  return (
    <Card className="p-5 md:p-7 shadow-medium max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-1">How would you like to practise?</h2>
      <p className="text-sm text-muted-foreground mb-5">
        You can switch topics any time once you've started.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={() => setMode('mock')}
          className={`text-left rounded-lg border-2 p-4 transition-colors ${
            mode === 'mock' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/40'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <span className="font-semibold">Full mock</span>
            {mode === 'mock' && <Check className="w-4 h-4 ml-auto text-primary" />}
          </div>
          <p className="text-xs text-muted-foreground">
            A structured run that samples every topic and adapts the difficulty as you go.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setMode('practice')}
          className={`text-left rounded-lg border-2 p-4 transition-colors ${
            mode === 'practice' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/40'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-5 h-5 text-primary" />
            <span className="font-semibold">Topic practice</span>
            {mode === 'practice' && <Check className="w-4 h-4 ml-auto text-primary" />}
          </div>
          <p className="text-xs text-muted-foreground">
            Low-pressure. Pick one topic to drill — switch whenever you like.
          </p>
        </button>
      </div>

      {mode === 'practice' && (
        <div className="mb-6">
          <p className="text-sm font-medium mb-2">Choose a topic to start with</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topics.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTopic(t.id)}
                className={`text-left rounded-md border p-3 transition-colors ${
                  topic === t.id ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t.label}</span>
                  {topic === t.id && <Badge variant="secondary" className="ml-auto text-[10px]">Selected</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{t.blurb}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <Button
        className="w-full min-h-[48px] text-base font-medium"
        size="lg"
        onClick={() => onConfirm({ mode, topic: mode === 'practice' ? topic : undefined })}
      >
        Continue
      </Button>
    </Card>
  );
};
