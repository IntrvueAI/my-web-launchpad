import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ClipboardCheck, Compass, Check, Lightbulb, Volume2 } from 'lucide-react';
import type { Mode } from '@/interview/engine/types';
import type { TopicDef } from '@/interview/subjects/types';

export type BriefDelivery = 'read' | 'aloud';

export interface SetupChoice {
  mode: Mode;
  topic?: string;
  /** Present only when the setup offered the choice (Medicine formats with reading time). */
  briefDelivery?: BriefDelivery;
}

const BRIEF_KEY = 'mmi:brief-delivery';
function savedBriefDelivery(): BriefDelivery {
  try {
    return localStorage.getItem(BRIEF_KEY) === 'aloud' ? 'aloud' : 'read';
  } catch {
    return 'read';
  }
}

interface InterviewSetupProps {
  /** The strands available for practice-mode topic selection. */
  topics: TopicDef[];
  onConfirm: (choice: SetupChoice) => void;
  /** Optional reassuring note shown above the setup (paragraphs split by a blank line). */
  note?: string;
  /** When false, skips the Full mock / Topic practice choice entirely — straight into a full mock. */
  allowTopicPractice?: boolean;
  /** Offer the choice between reading each brief first and hearing it aloud (seconds of reading). */
  briefChoice?: { readingSeconds: number };
}

/**
 * Pre-interview setup for engine-driven interviews — the flow diagram's "modefork".
 * Mock samples all strands adaptively; Practice lets the student pick a single strand to drill
 * (and switch any time once live). Mirrors maths-mini-interview-flow.json.
 */
export const InterviewSetup: React.FC<InterviewSetupProps> = ({ topics, onConfirm, note, allowTopicPractice = true, briefChoice }) => {
  const [mode, setMode] = useState<Mode>('mock');
  const [topic, setTopic] = useState<string>(topics[0]?.id ?? '');
  const [brief, setBrief] = useState<BriefDelivery>(savedBriefDelivery);
  const reading = briefChoice
    ? briefChoice.readingSeconds % 60 === 0
      ? `${briefChoice.readingSeconds / 60} minute${briefChoice.readingSeconds === 60 ? '' : 's'}`
      : `${briefChoice.readingSeconds} seconds`
    : '';
  const confirm = () => {
    if (briefChoice) {
      try { localStorage.setItem(BRIEF_KEY, brief); } catch { /* The choice still applies to this interview. */ }
    }
    onConfirm({ mode, topic: mode === 'practice' ? topic : undefined, ...(briefChoice ? { briefDelivery: brief } : {}) });
  };

  const noteParagraphs = (note ?? '').split('\n\n').map((p) => p.trim()).filter(Boolean);

  return (
    <Card className="p-5 md:p-7 shadow-medium max-w-2xl mx-auto">
      {noteParagraphs.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-2 text-amber-800 font-semibold">
            <Lightbulb className="w-5 h-5" />
            A note before you start
          </div>
          <div className="space-y-2 text-sm text-amber-900/90">
            {noteParagraphs.map((p, i) => (
              <p key={i} className={i === noteParagraphs.length - 1 ? 'font-semibold' : ''}>
                {p}
              </p>
            ))}
          </div>
        </div>
      )}

      {!allowTopicPractice ? (
        <>
          <h2 className="text-xl font-bold mb-1">Ready to begin?</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your practice format is ready. Continue to set up your interview.
          </p>
        </>
      ) : (
        <>
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
        </>
      )}

      {briefChoice && (
        <fieldset className="mb-6">
          <legend className="text-sm font-medium mb-2">How should each station start?</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { id: 'read', Icon: BookOpen, title: 'Read the brief first', text: `You get ${reading} to read the brief on screen. Clara then asks you to begin.` },
              { id: 'aloud', Icon: Volume2, title: 'Clara asks it aloud', text: 'No reading time. Clara reads the question to you and you answer straight away, as in some real interviews.' },
            ] as const).map(({ id, Icon, title, text }) => (
              <button
                key={id}
                type="button"
                aria-pressed={brief === id}
                onClick={() => setBrief(id)}
                className={`text-left rounded-lg border-2 p-4 transition-colors ${
                  brief === id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-5 h-5 text-primary" aria-hidden />
                  <span className="font-semibold">{title}</span>
                  {brief === id && <Check className="w-4 h-4 ml-auto text-primary" aria-hidden />}
                </div>
                <p className="text-xs text-muted-foreground">{text}</p>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <Button
        className="w-full min-h-[48px] text-base font-medium"
        size="lg"
        onClick={confirm}
      >
        Continue
      </Button>
    </Card>
  );
};
