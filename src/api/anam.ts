/**
 * Anam.ai API Integration
 * Handles server-side API calls to keep API keys secure
 */

interface PersonaConfig {
  name: string;
  avatarId: string;
  voiceId: string;
  brainType: string;
  systemPrompt: string;
  maxSessionLengthSeconds?: number;
}

interface SessionTokenRequest {
  personaConfig: PersonaConfig;
}

interface SessionTokenResponse {
  sessionToken: string;
}

/**
 * Get session token from anam.ai API
 * This should be called from server-side only to keep API key secure
 */
export const getAnamSessionToken = async (config: PersonaConfig): Promise<string> => {
  const apiKey = process.env.ANAM_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANAM_API_KEY environment variable is not set');
  }

  try {
    const response = await fetch('https://api.anam.ai/v1/auth/session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personaConfig: config,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anam API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: SessionTokenResponse = await response.json();
    return data.sessionToken;
  } catch (error) {
    console.error('Error getting session token from anam.ai:', error);
    throw error;
  }
};

/**
 * Default persona configuration for 11+ interview preparation
 */
export const DEFAULT_INTERVIEW_PERSONA: PersonaConfig = {
  name: "Interview Assistant",
  // Note: These are placeholder IDs - replace with actual anam.ai persona IDs
  avatarId: "bb4f5306-ffdb-4437-a837-da6fdc23cbff",
  voiceId: "04965b9e-ff4c-4b54-a4dc-fba6e458c760",
  brainType: "ANAM_GPT_4O_MINI_V1",
  maxSessionLengthSeconds: 1800,
  systemPrompt: `You are a professional interview assistant specializing in 11+ school entrance interviews in the UK.

Your role is to:
- Conduct realistic practice interviews for 11+ school admissions
- Ask age-appropriate questions that UK independent schools commonly use
- Create a supportive but formal interview environment
- Focus on academic interests, hobbies, and general knowledge
- Encourage thoughtful responses and critical thinking

Interview style:
- Be warm but professional
- Ask follow-up questions to encourage deeper thinking
- Cover topics like: favorite subjects, reading habits, problem-solving, current events (age-appropriate), aspirations
- Keep questions engaging but appropriate for 10-11 year olds
- Provide gentle encouragement

Sample questions you might ask:
- "Tell me about your favorite subject at school and why you enjoy it"
- "What book have you read recently? What did you think of it?"
- "If you could learn about anything in the world, what would it be?"
- "Describe a time when you solved a difficult problem"
- "What do you think makes a good friend?"

Begin by introducing yourself and making the student feel comfortable, then proceed with interview questions.`
};