import { getInterviewType } from '@/config/interviewTypes';

// Dynamic import for prompts - automatically discovers prompt files
const promptModules = import.meta.glob('../prompts/**/*.md', { 
  as: 'raw',
  eager: true 
});

/**
 * Dynamically loads system prompt content for any interview type
 * Automatically discovers prompts based on file structure
 */
export const loadSystemPrompt = async (interviewTypeId: string): Promise<string> => {
  try {
    const interviewType = getInterviewType(interviewTypeId);
    
    if (!interviewType) {
      console.warn(`Interview type ${interviewTypeId} not found, falling back to default`);
      return getDefaultPrompt();
    }

    // Construct the expected prompt file path
    const promptPath = `../prompts/${interviewType.promptFile}`;
    
    // Look for the prompt in our dynamically loaded modules
    const prompt = promptModules[promptPath];
    
    if (!prompt) {
      console.warn(`Prompt file not found for ${interviewTypeId} at ${promptPath}, falling back to default`);
      return getDefaultPrompt();
    }

    return prompt;
    
  } catch (error) {
    console.error(`Failed to load prompt for ${interviewTypeId}:`, error);
    return getDefaultPrompt();
  }
};

/**
 * Get available prompt files (for development/debugging)
 */
export const getAvailablePrompts = (): string[] => {
  return Object.keys(promptModules);
};

/**
 * Preloads all available system prompts for better performance
 */
export const preloadAllPrompts = async (): Promise<void> => {
  console.log(`Preloaded ${Object.keys(promptModules).length} system prompts successfully`);
};

/**
 * Get default fallback prompt
 */
const getDefaultPrompt = (): string => {
  return `You are a professional interview assistant. Please conduct a thorough interview and provide constructive feedback based on the candidate's responses.`;
};

/**
 * Validates that a prompt file exists for an interview type
 */
export const validatePromptExists = (interviewTypeId: string): boolean => {
  const interviewType = getInterviewType(interviewTypeId);
  if (!interviewType) return false;
  
  const promptPath = `../prompts/${interviewType.promptFile}`;
  return promptPath in promptModules;
};