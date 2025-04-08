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

// Debug-Funktion zum Überprüfen des API-Schlüssels (nur für Entwicklung)
function checkApiKey() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('API-Schlüssel fehlt vollständig');
    return false;
  }
  if (apiKey.trim() === '') {
    console.error('API-Schlüssel ist leer');
    return false;
  }
  console.log('API-Schlüssel vorhanden:', apiKey.substring(0, 5) + '...');
  return true;
}

// Verbesserte Fehlerbehandlung für API-Anfragen
const handleApiRequest = async (url, data, headers, signal) => {
  try {
    console.log('API request details:', {
      url,
      model: data.model,
      messagesCount: data.messages.length,
      headers: {
        ...headers,
        'Authorization': 'Bearer sk-***' // Maskierter API-Schlüssel für Logs
      }
    });
    
    return await axios.post(url, data, { headers, signal });
  } catch (error) {
    // Detaillierte Fehlerprotokollierung
    const errorDetails = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    };
    
    console.error('API request error details:', errorDetails);
    
    // Spezifische Fehlerbehandlung für Authentifizierungsprobleme
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('API-Authentifizierungsfehler: Ungültiger API-Schlüssel oder fehlende Berechtigungen');
      throw new Error('API-Authentifizierungsfehler: Bitte überprüfen Sie den API-Schlüssel');
    }
    
    // Spezifische Fehlerbehandlung für Modellprobleme
    if (error.response?.data?.error?.type === 'invalid_request_error' && 
        error.response?.data?.error?.message?.includes('model')) {
      console.error('API-Modellfehler: Das angeforderte Modell ist möglicherweise nicht verfügbar');
      throw new Error('API-Modellfehler: Bitte überprüfen Sie den Modellnamen');
    }
    
    throw error;
  }
};

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Debug: API-Schlüssel überprüfen
  const apiKeyValid = checkApiKey();
  console.log('API-Schlüssel gültig:', apiKeyValid);

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
      const response = await handleApiRequest(
        DEEPSEEK_API_URL,
        {
          model: MODEL,
          messages: messages,
          temperature: 0.4, // Lower temperature for more consistent, cautious responses
          max_tokens: 500, // Limit token length for faster responses
        },
        {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        controller.signal
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
    // Clear timeout to prevent memory leaks
    clearTimeout(timeoutId);
    
    console.error('Error in chat API:', error.message);
    
    // Provide a user-friendly error message
    let errorMessage = 'Es tut mir leid, ich habe ein Problem mit meiner API-Verbindung. Ein Erwachsener sollte den API-Schlüssel in den Umgebungsvariablen überprüfen.';
    
    // Spezifische Fehlermeldungen für verschiedene Fehlertypen
    if (error.message.includes('API-Authentifizierungsfehler')) {
      errorMessage = 'Es tut mir leid, ich habe ein Problem mit meiner API-Verbindung. Der API-Schlüssel scheint ungültig zu sein oder fehlt. Ein Erwachsener sollte den API-Schlüssel in den Umgebungsvariablen überprüfen.';
    } else if (error.message.includes('API-Modellfehler')) {
      errorMessage = 'Es tut mir leid, ich habe ein Problem mit meiner API-Verbindung. Das verwendete Modell scheint nicht verfügbar zu sein. Ein Erwachsener sollte die Konfiguration überprüfen.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Es tut mir leid, ich brauche gerade zu lange, um zu antworten. Bitte versuche es später noch einmal.';
    } else if (error.message.includes('Network Error')) {
      errorMessage = 'Es tut mir leid, ich habe ein Problem mit meiner Internetverbindung. Bitte überprüfe deine Verbindung und versuche es später noch einmal.';
    }
    
    return res.status(500).json({ error: errorMessage });
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
