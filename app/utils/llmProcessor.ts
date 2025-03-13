import OpenAI from 'openai';

// Define the available functions for the LLM to call
const functionDefinitions = [
  {
    name: 'openWebsite',
    description: 'Opens a specified website in a new browser tab',
    parameters: {
      type: 'object',
      properties: {
        website: {
          type: 'string',
          description: 'The name of the website to open (e.g., netflix, youtube, google)',
        },
        customUrl: {
          type: 'string',
          description: 'A custom URL to open if the website is not in the predefined list',
        }
      },
      required: ['website']
    }
  },
  {
    name: 'searchWeb',
    description: 'Performs a search query on Google',
    parameters: {
      type: 'object',
      properties: {
        searchTerm: {
          type: 'string',
          description: 'The search query to look up',
        }
      },
      required: ['searchTerm']
    }
  },
  {
    name: 'browserAction',
    description: 'Performs a browser navigation action',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['go_back', 'go_forward', 'reload', 'new_tab', 'close_tab'],
          description: 'The browser action to perform',
        }
      },
      required: ['action']
    }
  }
];

// Define the OpenAI client
let openaiClient: OpenAI | null = null;

/**
 * Initializes the OpenAI client
 * @param apiKey The OpenAI API key
 */
export const initializeOpenAI = (apiKey: string) => {
  openaiClient = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true // Only use this in development
  });
};

/**
 * Process the transcription with LLM using function calling
 * @param transcript The transcribed text from Deepgram
 * @returns Details about the detected command and parameters
 */
export const processTranscriptionWithLLM = async (transcript: string) => {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized. Call initializeOpenAI first.');
  }
  
  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a voice command interpreter. Your job is to analyze the user's spoken text and determine if they're trying to:
            1. Open a website (e.g., "open Netflix", "go to YouTube", "I want to check Facebook")
            2. Search the web (e.g., "search for cats", "look up pasta recipes", "I need information about Mars")
            3. Control the browser (e.g., "go back", "refresh the page", "open a new tab")
            
            If you detect such a command, call the appropriate function with the necessary parameters.
            If you're uncertain or the text doesn't contain a clear command, don't call any function.`
        },
        {
          role: 'user',
          content: transcript
        }
      ],
      functions: functionDefinitions,
      function_call: 'auto',
    });

    const responseMessage = response.choices[0].message;
    
    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);
      
      return {
        commandDetected: true,
        functionName,
        args: functionArgs
      };
    }
    
    return {
      commandDetected: false
    };
  } catch (error) {
    console.error('Error processing with LLM:', error);
    return {
      commandDetected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}; 