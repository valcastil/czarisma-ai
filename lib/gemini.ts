import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini AI client
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

// Debug: Log the API key status (without exposing the key)
console.log('Gemini API Key Status:', API_KEY ? 'Present' : 'Missing');
console.log('API Key Length:', API_KEY.length);

let genAI: GoogleGenerativeAI | null = null;

/**
 * Initialize Gemini AI
 */
export const initializeGemini = () => {
  if (!API_KEY) {
    console.warn('Gemini API key not found. AI features will be disabled.');
    return null;
  }
  
  if (!genAI) {
    genAI = new GoogleGenerativeAI(API_KEY);
  }
  
  return genAI;
};

/**
 * Get Gemini model instance
 */
export const getGeminiModel = (modelName: string = 'gemini-2.5-flash') => {
  const ai = initializeGemini();
  if (!ai) return null;
  
  return ai.getGenerativeModel({ model: modelName });
};

/**
 * Generate AI insights for charisma entries
 */
export const generateCharismaInsights = async (
  charismaType: string,
  emotions: string[],
  notes?: string
): Promise<string> => {
  try {
    const model = getGeminiModel();
    if (!model) {
      return 'AI insights are currently unavailable. Please add your Gemini API key.';
    }

    const prompt = `As a charisma and emotional intelligence coach, provide brief, actionable insights (2-3 sentences) for someone who experienced:
- Charisma type: ${charismaType}
- Emotions: ${emotions.join(', ')}
${notes ? `- Additional context: ${notes}` : ''}

Focus on positive reinforcement and growth opportunities.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating Gemini insights:', error);
    return 'Unable to generate insights at this time.';
  }
};

/**
 * Generate personalized charisma tips
 */
export const generateCharismaTips = async (
  topCharisma: string,
  preferredEmotions: string[]
): Promise<string[]> => {
  try {
    const model = getGeminiModel();
    if (!model) {
      return ['AI tips are currently unavailable.'];
    }

    const prompt = `As a charisma coach, provide 3 specific, actionable tips for someone whose top charisma trait is "${topCharisma}" and who frequently experiences emotions like: ${preferredEmotions.join(', ')}.

Format as a numbered list (1., 2., 3.) with each tip being one concise sentence.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the response into an array
    const tips = text
      .split('\n')
      .filter(line => line.match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(tip => tip.length > 0);
    
    return tips.length > 0 ? tips : ['Keep tracking your charisma journey!'];
  } catch (error) {
    console.error('Error generating charisma tips:', error);
    return ['Unable to generate tips at this time.'];
  }
};

/**
 * Analyze conversation message and suggest improvements
 */
export const analyzeMessage = async (message: string): Promise<{
  sentiment: string;
  suggestions: string[];
}> => {
  try {
    const model = getGeminiModel();
    if (!model) {
      return {
        sentiment: 'neutral',
        suggestions: ['AI analysis is currently unavailable.']
      };
    }

    const prompt = `Analyze this message for emotional tone and provide brief communication suggestions:
"${message}"

Respond in this exact JSON format:
{
  "sentiment": "positive/neutral/negative",
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to parse JSON response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          sentiment: parsed.sentiment || 'neutral',
          suggestions: parsed.suggestions || []
        };
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
    }
    
    return {
      sentiment: 'neutral',
      suggestions: ['Message sent successfully!']
    };
  } catch (error) {
    console.error('Error analyzing message:', error);
    return {
      sentiment: 'neutral',
      suggestions: []
    };
  }
};

/**
 * Generate journal prompts based on user's charisma journey
 */
export const generateJournalPrompts = async (
  recentCharismaTypes: string[]
): Promise<string[]> => {
  try {
    const model = getGeminiModel();
    if (!model) {
      return ['What made you feel charismatic today?'];
    }

    const prompt = `Based on someone who has been tracking these charisma types: ${recentCharismaTypes.join(', ')}, generate 3 thoughtful journal prompts to help them reflect on their charisma journey.

Format as a numbered list (1., 2., 3.) with each prompt being a clear question.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const prompts = text
      .split('\n')
      .filter(line => line.match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(prompt => prompt.length > 0);
    
    return prompts.length > 0 ? prompts : [
      'What made you feel charismatic today?',
      'How did others respond to your energy?',
      'What would you like to improve tomorrow?'
    ];
  } catch (error) {
    console.error('Error generating journal prompts:', error);
    return ['What made you feel charismatic today?'];
  }
};
