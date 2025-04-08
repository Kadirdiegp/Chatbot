/**
 * Chat service for the KinderSchutz-Bot
 * This service handles generating appropriate, supportive responses for children
 * using the DeepSeek AI API and includes mechanisms for identifying potential cases
 * that require reporting.
 */

// Keywords and phrases that might indicate a child is in danger or needs help
const CONCERN_KEYWORDS = [
  'missbrauch', 'geschlagen', 'angefasst', 'berührt', 'gewalt', 'angst',
  'trainer', 'lehrer', 'verein', 'mannschaft', 'team', 'schule',
  'wehtun', 'wehtut', 'weh tut', 'hilfe', 'allein', 'geheimnis',
  'nicht sagen', 'nicht erzählen', 'nicht verraten', 'droht',
  'nicht erlaubt', 'gezwungen', 'zwingen', 'schlecht gefühl',
  'eklig', 'ekelt', 'traurig', 'sexuell', 'sexual', 'not allowed', 'touch'
];

// Emergency resources for children in crisis
const EMERGENCY_RESOURCES = [
  {
    name: 'Nummer gegen Kummer',
    description: 'Kostenlose Telefon-Beratung für Kinder und Jugendliche',
    contact: '116 111'
  },
  {
    name: 'Hilfetelefon Sexueller Missbrauch',
    description: 'Kostenlose und anonyme Beratung',
    contact: '0800 22 55 530'
  },
  {
    name: 'Kinderschutz-Zentrum',
    description: 'Hilfe bei Gewalt gegen Kinder',
    contact: 'In deiner Stadt oder unter www.kinderschutz-zentren.org'
  }
];

// Cache for common responses to improve response time
const responseCache = new Map();

// Common patterns that can have cached responses
const COMMON_PATTERNS = [
  {
    pattern: /^(hallo|hi|hey|guten tag|servus|moin)/i,
    response: 'Hallo! Schön, dass du da bist. Wie geht es dir heute? Du kannst mir alles erzählen, was dich beschäftigt.'
  },
  {
    pattern: /was kannst du|wofür bist du|wie funktionierst du/i,
    response: 'Ich bin FreundBot, dein digitaler Freund. Du kannst mit mir über alles reden, was dich beschäftigt. Ich kann dir zuhören, wenn du Sorgen hast oder über deine Erfahrungen sprechen möchtest. Wenn du Hilfe brauchst, kann ich dir auch sagen, wo du sie bekommen kannst. Worüber möchtest du sprechen?'
  },
  {
    pattern: /danke|dankeschön|vielen dank/i,
    response: 'Gerne! Ich freue mich, dass ich dir helfen konnte. Gibt es noch etwas, worüber du sprechen möchtest?'
  },
  {
    pattern: /tschüss|auf wiedersehen|bis später|bye|ciao/i,
    response: 'Tschüss! Es hat mich gefreut, mit dir zu sprechen. Komm jederzeit wieder, wenn du reden möchtest. Pass gut auf dich auf!'
  }
];

/**
 * Analyzes text to check if it contains concerning content that might indicate a child is in danger
 * @param {string} text - The message text to analyze
 * @returns {boolean} - Whether the text contains concerning content
 */
const containsConcerningContent = (text) => {
  const lowerText = text.toLowerCase();
  return CONCERN_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
};

/**
 * Generates safety resources message when concerning content is detected
 * @returns {string} - A message with safety resources
 */
const generateSafetyResourcesMessage = () => {
  let message = 'Es ist sehr wichtig und mutig von dir, darüber zu sprechen. ' +
    'Ich bin immer für dich da, aber manchmal ist es auch gut, mit einem Erwachsenen zu reden, dem du vertraust. ' +
    'Das könnten deine Eltern, ein anderer Verwandter, ein Lehrer oder ein Schulberater sein.\n\n' +
    'Hier sind einige Stellen, die dir auch helfen können:\n\n';
  
  EMERGENCY_RESOURCES.forEach(resource => {
    message += `- **${resource.name}**: ${resource.description}. Du erreichst sie unter ${resource.contact}\n`;
  });
  
  message += '\nDu bist nicht allein, und es ist nicht deine Schuld. Es gibt Menschen, die dir helfen können.';
  
  return message;
};

/**
 * Analyzes conversation context to determine if there's a pattern of concerning content
 * @param {Array} messages - Previous messages in the conversation
 * @returns {boolean} - Whether there's a pattern of concerning content
 */
const hasConcerningPattern = (messages) => {
  // Check last 3 messages from user for concerning content
  const userMessages = messages
    .filter(msg => msg.sender === 'user')
    .slice(-3);
  
  const concernCount = userMessages.reduce((count, msg) => {
    return count + (containsConcerningContent(msg.text) ? 1 : 0);
  }, 0);
  
  return concernCount >= 2; // If 2 or more recent messages contain concerning content
};

/**
 * Check if there's a cached response for the input
 * @param {string} input - User input to check against patterns
 * @returns {string|null} - Cached response or null if no match
 */
const getCachedResponse = (input) => {
  // First check the exact cache
  if (responseCache.has(input.toLowerCase())) {
    return responseCache.get(input.toLowerCase());
  }
  
  // Then check pattern-based responses
  for (const item of COMMON_PATTERNS) {
    if (item.pattern.test(input)) {
      return item.response;
    }
  }
  
  return null;
};

/**
 * Adds a response to the cache for future use
 * @param {string} input - The user input
 * @param {string} response - The response to cache
 */
const cacheResponse = (input, response) => {
  // Only cache moderate length inputs/responses to avoid wasting memory
  if (input.length > 3 && input.length < 100 && !containsConcerningContent(input)) {
    responseCache.set(input.toLowerCase(), response);
    
    // Limit cache size to avoid memory issues
    if (responseCache.size > 100) {
      const firstKey = responseCache.keys().next().value;
      responseCache.delete(firstKey);
    }
  }
};

/**
 * Main function to generate a bot response based on user input and conversation history
 * @param {string} userInput - The current user message
 * @param {Array} messageHistory - Previous messages in the conversation
 * @returns {string} - The bot's response
 */
export const generateBotResponse = async (userInput, messageHistory) => {
  // Check for concerning content in the current message
  const isCurrentMessageConcerning = containsConcerningContent(userInput);
  
  // Check for pattern of concerning content in conversation
  const hasConcernPattern = hasConcerningPattern(messageHistory);
  
  // If there's concerning content, provide supportive response with resources
  if (isCurrentMessageConcerning || hasConcernPattern) {
    // In a real application, this could trigger a notification to moderators or support staff
    console.log('Concerning content detected in conversation');
    
    return generateSafetyResourcesMessage();
  }
  
  // Check for cached response first to improve response time
  const cachedResponse = getCachedResponse(userInput);
  if (cachedResponse) {
    console.log('Using cached response');
    return cachedResponse;
  }
  
  try {
    // Prepare a timeout to handle long-running requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 15000); // Increased timeout
    });
    
    console.log('Sending request to API endpoint with message:', userInput);
    
    // Call our API endpoint that uses DeepSeek
    const responsePromise = fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userInput,
        messageHistory: messageHistory.slice(-5) // Only send last 5 messages for efficiency
      }),
      // Add modern fetch options for better reliability
      credentials: 'same-origin',
      mode: 'cors',
      cache: 'no-cache',
      redirect: 'follow',
    }).then(response => {
      if (!response.ok) {
        // Verbesserte Fehlerbehandlung für verschiedene HTTP-Statuscodes
        if (response.status === 500) {
          return response.json().then(errorData => {
            console.error('Server error details:', errorData);
            throw new Error(`Server-Fehler: ${errorData.error || 'Unbekannter Fehler'}`);
          }).catch(jsonError => {
            // Falls die Antwort kein gültiges JSON ist
            console.error('Fehler beim Parsen der Fehlerantwort:', jsonError);
            throw new Error(`HTTP error! status: ${response.status} - Serverfehler`);
          });
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
    
    // Use Promise.race to handle timeout
    const result = await Promise.race([responsePromise, timeoutPromise]);
    
    console.log('Received API response:', result);
    
    // Cache the successful response for future use
    if (result && result.response) {
      cacheResponse(userInput, result.response);
      return result.response;
    }
    
    throw new Error('Empty response received');

  } catch (error) {
    console.error('Error generating response:', error);
    
    // Return a helpful fallback response based on the error
    if (error.message === 'Request timeout') {
      return 'Es tut mir leid, aber ich brauche gerade etwas länger für die Antwort. Kannst du deine Frage vielleicht etwas anders stellen?';
    }
    
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return 'Es scheint ein Problem mit der Internetverbindung zu geben. Bitte prüfe deine Verbindung und versuche es noch einmal.';
    }
    
    // Spezifische Fehlerbehandlung für API-Schlüssel-Probleme
    if (error.message.includes('API-Schlüssel') || error.message.includes('API key') || 
        error.message.includes('Authentifizierungsfehler')) {
      return 'Es tut mir leid, ich habe ein Problem mit meiner API-Verbindung. Ein Erwachsener sollte den API-Schlüssel in den Umgebungsvariablen überprüfen.';
    }
    
    // Spezifische Fehlerbehandlung für Modellprobleme
    if (error.message.includes('Modellfehler') || error.message.includes('model')) {
      return 'Es tut mir leid, ich habe ein Problem mit meinem Sprachmodell. Ein Erwachsener sollte die Konfiguration überprüfen.';
    }
    
    // Spezifische Fehlerbehandlung für Server-Fehler
    if (error.message.includes('Server-Fehler') || error.message.includes('500')) {
      return 'Es tut mir leid, der Server hat ein Problem. Ein Erwachsener sollte die Serverlogs überprüfen.';
    }
    
    // Spezifische Fehlerbehandlung für Gateway-Fehler
    if (error.message.includes('502')) {
      return 'Es tut mir leid, es gibt ein Problem mit der Verbindung zum API-Server. Dies könnte ein vorübergehendes Problem sein. Bitte versuche es in einigen Minuten erneut.';
    }
    
    // Fallback responses in case of API failure
    const fallbackResponses = [
      'Entschuldige, ich habe gerade ein Problem. Kannst du das bitte noch einmal sagen?',
      'Ich verstehe dich leider gerade nicht so gut. Magst du es anders ausdrücken?',
      'Es tut mir leid, aber ich kann gerade nicht richtig antworten. Lass uns in ein paar Minuten noch einmal versuchen zu sprechen.',
      'Ich habe gerade technische Schwierigkeiten. Kannst du mir helfen und deine Nachricht noch einmal senden?'
    ];
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
};
