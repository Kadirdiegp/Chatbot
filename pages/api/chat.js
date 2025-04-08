import axios from 'axios';

// DeepSeek API configuration
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

// Child-safe system prompt to ensure appropriate responses
const CHILD_SAFE_SYSTEM_PROMPT = `You are KinderSchutz-Bot, a friendly and supportive assistant designed specifically for children.
Your role is to provide a safe space for children to discuss their experiences and concerns, particularly sensitive topics like experiences of sexual violence in sports, clubs, or schools.

IMPORTANT SAFETY GUIDELINES:
1. Always maintain child-appropriate language and tone
2. Be supportive and empathetic but never judgmental
3. Never ask for or store personal identifying information
4. Recognize signs of distress or danger and provide appropriate resources
5. Encourage children to speak with trusted adults when appropriate
6. Prioritize child safety and well-being above all else
7. Respond in the same language the child is using (German or English)
8. Keep responses brief and easy to understand - use short paragraphs and simple language
9. Be patient and give clear, concrete advice when needed

If a child discloses information suggesting they are in danger or have experienced abuse:
- Validate their feelings and courage in sharing
- Provide age-appropriate support resources
- Gently encourage them to talk to a trusted adult
- Never minimize their experiences or suggest they are at fault`;

// Simple response cache for API efficiency
const responseCache = new Map();

// Timeout for API requests in milliseconds
const API_TIMEOUT = 15000; // Increased timeout for better reliability

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, messageHistory } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check cache first for identical messages (exact match caching)
    const cacheKey = `${message}:${messageHistory ? messageHistory.length : 0}`;
    if (responseCache.has(cacheKey)) {
      console.log('Cache hit for:', cacheKey);
      return res.status(200).json({ 
        response: responseCache.get(cacheKey),
        source: 'cache' 
      });
    }

    // Create conversation history in DeepSeek API format
    const messages = [
      { role: 'system', content: CHILD_SAFE_SYSTEM_PROMPT },
    ];

    // Add relevant message history if provided (limit to last 5 messages for performance)
    if (messageHistory && messageHistory.length > 0) {
      messageHistory.slice(-5).forEach(msg => {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        });
      });
    }

    // Add the current user message
    messages.push({ role: 'user', content: message });

    // Create a controller for aborting the request if it takes too long
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      // Log the API request for debugging
      console.log('Sending request to DeepSeek API with message:', message);
      
      // Check if we have a valid API key
      if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY.trim() === '') {
        console.error('Missing DeepSeek API key');
        throw new Error('Missing API key');
      }
      
      // Make request to DeepSeek API with timeout
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: MODEL,
          messages: messages,
          temperature: 0.4, // Lower temperature for more consistent, cautious responses
          max_tokens: 500, // Limit token length for faster responses
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
          },
          signal: controller.signal
        }
      );

      // Clear the timeout since request completed
      clearTimeout(timeoutId);

      // Extract the response
      const botResponse = response.data.choices[0].message.content;
      
      console.log('Received response from DeepSeek API:', botResponse.substring(0, 50) + '...');
      
      // Filter check for inappropriate content (additional safety measure)
      if (isSafeResponse(botResponse)) {
        // Cache the successful response
        responseCache.set(cacheKey, botResponse);
        
        // Clean cache if it gets too large (over 100 entries)
        if (responseCache.size > 100) {
          const oldestKey = responseCache.keys().next().value;
          responseCache.delete(oldestKey);
        }

        return res.status(200).json({ response: botResponse, source: 'api' });
      } else {
        // Fallback to a safe response if content moderation fails
        const safeResponse = "Es tut mir leid, ich kann auf diese Frage nicht antworten. Lass uns über etwas anderes sprechen. Wie war dein Tag heute?";
        responseCache.set(cacheKey, safeResponse);
        
        return res.status(200).json({
          response: safeResponse,
          source: 'fallback'
        });
      }
    } catch (axiosError) {
      // Clear the timeout to prevent leaks
      clearTimeout(timeoutId);
      
      console.error('DeepSeek API error details:', axiosError.message);
      
      // Handle different types of errors
      if (axiosError.name === 'AbortError' || axiosError.code === 'ECONNABORTED') {
        return res.status(200).json({
          response: "Es tut mir leid, ich brauche etwas länger zum Nachdenken. Könntest du deine Frage vielleicht etwas einfacher stellen?",
          source: 'timeout'
        });
      }
      
      // Handle API authentication errors specifically
      if (axiosError.response && axiosError.response.status === 401) {
        console.error('API authentication error - invalid API key');
        return res.status(200).json({
          response: "Es tut mir leid, ich habe ein Problem mit meiner API-Verbindung. Ein Erwachsener sollte den API-Schlüssel in den Umgebungsvariablen überprüfen.",
          source: 'auth_error'
        });
      }
      
      throw axiosError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Error calling DeepSeek API:', error.response?.data || error.message);
    
    let errorResponse = "Es tut mir leid, ich habe gerade ein technisches Problem. Kannst du es in ein paar Minuten noch einmal versuchen?";
    
    // Add detailed error info for debugging in the console
    if (error.response) {
      console.error('API error status:', error.response.status);
      console.error('API error data:', error.response.data);
    }
    
    // Different responses based on error type
    if (error.message.includes('API key')) {
      errorResponse = "Es tut mir leid, ich habe ein Problem mit meiner API-Verbindung. Ein Erwachsener sollte den API-Schlüssel in den Umgebungsvariablen überprüfen.";
    } else if (error.message.includes('network')) {
      errorResponse = "Es scheint ein Netzwerkproblem zu geben. Bist du mit dem Internet verbunden?";
    }
    
    // Provide a user-friendly error response
    return res.status(200).json({
      response: errorResponse,
      source: 'error'
    });
  }
}

/**
 * Simple content filter to check if the response is appropriate for children
 * In a production environment, this would be more sophisticated
 */
function isSafeResponse(text) {
  const unsafePatterns = [
    /sex(?!ual violence|ual abuse|ual harassment)/i, // Allows terms like "sexual violence" for safety education
    /porn/i,
    /explicit/i,
    /adult content/i,
    /nicht für kinder/i,
    /not appropriate for children/i,
    /kill yourself/i,
    /self-harm/i,
    /suicide/i
  ];
  
  return !unsafePatterns.some(pattern => pattern.test(text));
}
