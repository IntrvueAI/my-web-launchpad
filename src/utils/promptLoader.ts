import { getInterviewType } from '@/config/interviewTypes';

// Import all prompts statically to avoid dynamic import issues
import elevenPlusPrompt from '../prompts/academic/11-plus.md?raw';
import logicPuzzlesPrompt from '../prompts/academic/logic-puzzles.md?raw';
import mathsInterviewPrompt from '../prompts/academic/maths-interview.md?raw';
import demoPrompt from '../prompts/demo/demo.md?raw';

// The core script + framework every mini-interview stems from.
import interviewLogicCore from '../prompts/interview-logic.md?raw';

// Static mapping of prompts (the subject-specific specialisations)
const SYSTEM_PROMPTS: Record<string, string> = {
  '11-plus': elevenPlusPrompt,
  'logic-puzzles': logicPuzzlesPrompt,
  'maths-interview': mathsInterviewPrompt,
  'demo': demoPrompt,
};

// Avatar-led mini-interviews that compose from the core interview-logic script.
const MINI_INTERVIEW_TYPES = new Set(['logic-puzzles', 'maths-interview']);

/**
 * Composes the final system prompt for mini-interviews: the shared core script
 * (interview-logic.md) governs structure/flow/scoring; the subject prompt then
 * supplies the interviewer name, intro, and question bank.
 */
const composePrompt = (interviewTypeId: string, specificPrompt: string): string => {
  if (!MINI_INTERVIEW_TYPES.has(interviewTypeId)) return specificPrompt;
  return `${interviewLogicCore}\n\n---\n\n# Subject-specific brief (specialises the core above)\n\n${specificPrompt}`;
};

/**
 * Loads system prompt content for a given interview type
 */
export const loadSystemPrompt = async (interviewTypeId: string): Promise<string> => {
  try {
    const prompt = SYSTEM_PROMPTS[interviewTypeId];

    if (!prompt) {
      console.warn(`Interview type ${interviewTypeId} not found, falling back to 11-plus`);
      return SYSTEM_PROMPTS['11-plus'] || getDefaultPrompt();
    }

    return composePrompt(interviewTypeId, prompt);
    
  } catch (error) {
    console.error(`Failed to load prompt for ${interviewTypeId}:`, error);
    
    // Fallback to 11-plus if loading fails
    if (interviewTypeId !== '11-plus') {
      console.warn('Falling back to 11-plus prompt');
      return SYSTEM_PROMPTS['11-plus'] || getDefaultPrompt();
    }
    
    // If even 11-plus fails, return a basic prompt
    return getDefaultPrompt();
  }
};

/**
 * Get default fallback prompt
 */
const getDefaultPrompt = (): string => {
  return `You are an interview assistant. Please conduct a professional interview and provide helpful feedback.`;
};

/**
 * Preloads all available system prompts for better performance
 */
export const preloadAllPrompts = async (): Promise<void> => {
  // All prompts are already loaded statically, so this is a no-op
  console.log('All system prompts preloaded successfully');
};