import { getInterviewType } from '@/config/interviewTypes';

// Import all prompts statically to avoid dynamic import issues
import elevenPlusPrompt from '../prompts/academic/11-plus.md?raw';
import logicPuzzlesPrompt from '../prompts/academic/logic-puzzles.md?raw';
import demoPrompt from '../prompts/demo/demo.md?raw';

// Static mapping of prompts
const SYSTEM_PROMPTS: Record<string, string> = {
  '11-plus': elevenPlusPrompt,
  'logic-puzzles': logicPuzzlesPrompt,
  'demo': demoPrompt,
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

    return prompt;
    
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