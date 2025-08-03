import { getInterviewType } from '@/config/interviewTypes';

/**
 * Dynamically loads system prompt content for a given interview type
 */
export const loadSystemPrompt = async (interviewTypeId: string): Promise<string> => {
  try {
    const interviewType = getInterviewType(interviewTypeId);
    
    if (!interviewType) {
      console.warn(`Interview type ${interviewTypeId} not found, falling back to 11-plus`);
      return loadSystemPrompt('11-plus');
    }

    // Dynamic import of markdown files  
    const promptModule = await import(`../prompts/${interviewType.promptFile}?raw`);
    return promptModule.default;
    
  } catch (error) {
    console.error(`Failed to load prompt for ${interviewTypeId}:`, error);
    
    // Fallback to 11-plus if loading fails
    if (interviewTypeId !== '11-plus') {
      console.warn('Falling back to 11-plus prompt');
      return loadSystemPrompt('11-plus');
    }
    
    // If even 11-plus fails, return a basic prompt
    return `You are an interview assistant. Please conduct a professional interview and provide helpful feedback.`;
  }
};

/**
 * Preloads all available system prompts for better performance
 */
export const preloadAllPrompts = async (): Promise<void> => {
  const interviewTypes = ['11-plus', 'ielts'];
  
  try {
    await Promise.all(
      interviewTypes.map(type => loadSystemPrompt(type))
    );
    console.log('All system prompts preloaded successfully');
  } catch (error) {
    console.warn('Some prompts failed to preload:', error);
  }
};