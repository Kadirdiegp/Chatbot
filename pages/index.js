import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  Avatar, 
  Chip,
  IconButton,
  CircularProgress,
  Grow,
  Fade,
  Zoom,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
  Tooltip,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import PsychologyIcon from '@mui/icons-material/Psychology';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SchoolIcon from '@mui/icons-material/School';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { generateBotResponse } from '../src/services/chatService';

// Quick response suggestions for children who might not know what to say
const QUICK_RESPONSES = [
  { text: "Ich brauche Hilfe", icon: <HelpOutlineIcon fontSize="small" /> },
  { text: "Ich fühle mich nicht gut", icon: <SentimentVeryDissatisfiedIcon fontSize="small" /> },
  { text: "Etwas Komisches ist passiert", icon: <PsychologyIcon fontSize="small" /> },
  { text: "Ich habe Angst", icon: <ChildCareIcon fontSize="small" /> },
  { text: "Ich wurde geärgert", icon: <SentimentVeryDissatisfiedIcon fontSize="small" /> },
  { text: "Ich bin glücklich", icon: <SentimentSatisfiedAltIcon fontSize="small" /> }
];

// Vorgefertigte Antworten für verschiedene Situationen
const PREPARED_RESPONSES = {
  schule: [
    "Ich habe Probleme mit einem Lehrer",
    "Andere Kinder ärgern mich in der Schule",
    "Ich verstehe den Unterricht nicht",
    "Ich fühle mich unwohl in der Schule"
  ],
  familie: [
    "Meine Eltern streiten sich oft",
    "Ich fühle mich zu Hause nicht sicher",
    "Ich vermisse jemanden in meiner Familie",
    "Ich habe Angst nach Hause zu gehen"
  ],
  gefühle: [
    "Ich bin oft traurig",
    "Ich habe Angst",
    "Ich fühle mich allein",
    "Ich bin wütend und weiß nicht warum"
  ],
  sport: [
    "Etwas merkwürdiges ist im Training passiert",
    "Mein Trainer macht mir Angst",
    "Ich will nicht mehr zum Training gehen",
    "Jemand hat mich unangenehm berührt"
  ]
};

// Speech synthesis for accessibility
let speechSynthesis;
let voices = [];

export default function Home() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { 
      id: '1', 
      sender: 'bot', 
      text: 'Hallo! Ich bin KinderSchutz-Bot. Du kannst mit mir über alles reden, was dich beschäftigt. Wie geht es dir heute?',
      isRead: false
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [typingDots, setTypingDots] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [error, setError] = useState(null); // For error handling
  const [anchorEl, setAnchorEl] = useState(null); // For dropdown menu
  const [currentCategory, setCurrentCategory] = useState(null); // Selected category for prepared responses
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      speechSynthesis = window.speechSynthesis;
      
      // Get all available voices
      const getVoices = () => {
        voices = speechSynthesis.getVoices();
      };
      
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = getVoices;
      }
      
      getVoices();
    }
    
    // Scroll to bottom when messages load
    scrollToBottom();
    
    // Focus input field
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    return () => {
      // Clean up speech synthesis
      if (speechSynthesis) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, typingText, currentCategory]);

  // Simulate typing animation
  useEffect(() => {
    let typingTimer;
    let dotsTimer;
    
    if (isTyping) {
      // Animate typing dots
      dotsTimer = setInterval(() => {
        setTypingDots(prev => {
          if (prev.length >= 3) return '';
          return prev + '.';
        });
      }, 400);
    } else {
      clearInterval(dotsTimer);
      setTypingDots('');
      setTypingText('');
    }
    
    return () => {
      clearInterval(dotsTimer);
      clearTimeout(typingTimer);
    };
  }, [isTyping]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (input.trim() === '') return;
    
    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      isRead: true
    };
    
    // Update messages with user message
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setShowSuggestions(false);

    // Set loading and typing indicators
    setIsLoading(true);
    setIsTyping(true);
    
    try {
      // Artificial typing delay for better user experience
      setTypingText('Ich denke nach');
      
      // Throttle API requests for children's expectations
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Call the API via our chat service
      const response = await generateBotResponse(userMessage.text, messages);
      
      // Clear any previous errors
      setError(null);
      
      // Simulate typing for better UX
      // For children, it helps to see the bot is "thinking"
      const words = response.split(' ');
      const typingSpeed = 20; // ms per character
      
      // Slow reveal of response, character by character
      let visibleResponse = '';
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, words[i].length * typingSpeed));
        visibleResponse += (i > 0 ? ' ' : '') + words[i];
        setTypingText(visibleResponse);
      }
      
      // Add the full bot response to the messages
      const botMessage = {
        id: Date.now().toString(),
        sender: 'bot',
        text: response,
        isRead: false
      };
      
      // Short delay before showing full message
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update messages with bot response
      setMessages(prevMessages => [...prevMessages, botMessage]);
      
      // Entfernen der automatischen Vorlesefunktion:
      // Nur auf Benutzeranfrage vorlesen (über das Icon-Klick)
      // if (typeof window !== 'undefined' && window.speechSynthesis) {
      //   setTimeout(() => {
      //     speakMessage(response);
      //   }, 300);
      // }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setError('Es gab ein Problem mit der Verbindung. Bitte versuche es später erneut.');
      
      // Add an error message from the bot
      const errorMessage = {
        id: Date.now().toString(),
        sender: 'bot',
        text: 'Es tut mir leid, ich habe gerade ein technisches Problem. Kannst du es in ein paar Minuten noch einmal versuchen?',
        isRead: false,
        isError: true
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      // Reset UI state
      setIsLoading(false);
      setIsTyping(false);
      setTypingText('');
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle quick response selection
  const handleQuickResponse = (text) => {
    setInput(text);
    
    // Focus on input to allow immediate sending or editing
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle prepared response selection
  const handlePreparedResponse = (text) => {
    setInput(text);
    setCurrentCategory(null);
    setAnchorEl(null);
    
    // Focus on input to allow immediate sending or editing
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle menu opening
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Handle menu closing
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle category selection
  const handleCategorySelect = (category) => {
    setCurrentCategory(category);
    handleMenuClose();
  };

  // Text to speech for accessibility
  const speakMessage = (text) => {
    // Stop any current speaking
    if (speechSynthesis) {
      speechSynthesis.cancel();
    }
    
    // Don't speak if speech synthesis not available
    if (!speechSynthesis) {
      console.log('Speech synthesis not available');
      return;
    }
    
    // Set speaking state
    setIsSpeaking(true);
    
    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a German voice
    const germanVoice = voices.find(voice => voice.lang.includes('de'));
    if (germanVoice) {
      utterance.voice = germanVoice;
    }
    
    // Set pitch and rate for a child-friendly voice
    utterance.pitch = 1.1; // Slightly higher for a friendlier tone
    utterance.rate = 0.9;  // Slightly slower for better comprehension
    
    // Set event handlers
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    // Speak
    speechSynthesis.speak(utterance);
  };

  const avatarStyles = (sender) => ({
    bgcolor: sender === 'bot' ? '#9c27b0' : '#3f51b5',
    color: 'white'
  });

  return (
    <Container 
      maxWidth="sm" 
      sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        p: isMobile ? 1 : 2,
        background: 'transparent'
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 1,
        px: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            sx={{ 
              bgcolor: 'primary.main', 
              width: 36, 
              height: 36, 
              mr: 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <PsychologyIcon />
          </Avatar>
          <Typography 
            variant="h6" 
            component="h1" 
            sx={{ fontWeight: 600, fontSize: isMobile ? '1.1rem' : '1.25rem' }}
          >
            KinderSchutz-Bot
          </Typography>
        </Box>
        
        {messages.length > 0 && messages[messages.length - 1].sender === 'bot' && (
          <Tooltip title="Vorlesen" arrow>
            <IconButton 
              color={isSpeaking ? "secondary" : "primary"} 
              size="small"
              onClick={() => speakMessage(messages[messages.length - 1].text)}
              disabled={isLoading || isTyping}
            >
              <VolumeUpIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      
      <Paper 
        elevation={0} 
        sx={{ 
          flexGrow: 1, 
          mb: 2, 
          overflow: 'auto',
          borderRadius: 3,
          background: 'transparent',
          boxShadow: 'none'
        }}
      >
        <List sx={{ p: 1 }}>
          {messages.map((message) => (
            <ListItem 
              key={message.id} 
              sx={{ 
                mb: 1,
                alignItems: 'flex-start'
              }}
            >
              <Grow in={true} style={{ transformOrigin: message.sender === 'user' ? 'right' : 'left' }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    width: '100%'
                  }}
                >
                  {message.sender === 'bot' && (
                    <Avatar 
                      sx={{ 
                        ...avatarStyles(message.sender),
                        mr: 1,
                        mt: 0.5
                      }}
                    >
                      <PsychologyIcon />
                    </Avatar>
                  )}
                  
                  <Paper 
                    elevation={1}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      maxWidth: '85%',
                      bgcolor: message.sender === 'user' ? 'primary.light' : '#f0f0ff',
                      color: message.sender === 'user' ? 'white' : 'text.primary',
                      position: 'relative',
                      '&::after': message.sender === 'user' ? {
                        content: '""',
                        position: 'absolute',
                        right: -8,
                        top: 10,
                        border: '8px solid transparent',
                        borderLeft: '8px solid #9c27b0',
                        borderRightWidth: 0,
                      } : {
                        content: '""',
                        position: 'absolute',
                        left: -8,
                        top: 10,
                        border: '8px solid transparent',
                        borderRight: '8px solid #f0f0ff',
                        borderLeftWidth: 0,
                      }
                    }}
                  >
                    <Typography variant="body1">
                      {message.text}
                    </Typography>
                  </Paper>
                  
                  {message.sender === 'user' && (
                    <Avatar 
                      sx={{ 
                        ...avatarStyles(message.sender),
                        ml: 1,
                        mt: 0.5
                      }}
                    >
                      <ChildCareIcon />
                    </Avatar>
                  )}
                </Box>
              </Grow>
            </ListItem>
          ))}
          
          {isTyping && (
            <ListItem sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <Avatar 
                  sx={{ 
                    ...avatarStyles('bot'),
                    mr: 1,
                    mt: 0.5
                  }}
                >
                  <PsychologyIcon />
                </Avatar>
                <Paper 
                  elevation={1}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    bgcolor: '#f0f0ff',
                    position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      left: -8,
                      top: 10,
                      border: '8px solid transparent',
                      borderRight: '8px solid #f0f0ff',
                      borderLeftWidth: 0,
                    }
                  }}
                >
                  <Typography variant="body1">
                    {typingText}<span>{typingDots}</span>
                  </Typography>
                </Paper>
              </Box>
            </ListItem>
          )}
          
          <div ref={messagesEndRef} />
        </List>
      </Paper>
      
      {showSuggestions && messages.length === 1 && (
        <Fade in={true}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Du kannst mit einem dieser Sätze beginnen:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {QUICK_RESPONSES.map((response, index) => (
                <Chip
                  key={index}
                  icon={response.icon}
                  label={response.text}
                  onClick={() => handleQuickResponse(response.text)}
                  color="primary"
                  variant="outlined"
                  sx={{ 
                    borderRadius: '12px',
                    '&:hover': {
                      bgcolor: 'rgba(63, 81, 181, 0.1)',
                    }
                  }}
                />
              ))}
            </Box>
          </Box>
        </Fade>
      )}
      
      {currentCategory && (
        <Fade in={true}>
          <Paper 
            elevation={0} 
            sx={{ 
              mb: 2, 
              p: 2, 
              borderRadius: 3,
              background: 'transparent',
              border: '1px solid #e0e0ff'
            }}
          >
            <Typography variant="subtitle2" color="primary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              {currentCategory === 'schule' && <SchoolIcon fontSize="small" />}
              {currentCategory === 'familie' && <FamilyRestroomIcon fontSize="small" />}
              {currentCategory === 'gefühle' && <SentimentSatisfiedAltIcon fontSize="small" />}
              {currentCategory === 'sport' && <ChildCareIcon fontSize="small" />}
              Wähle einen Satz:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {PREPARED_RESPONSES[currentCategory].map((text, index) => (
                <Chip
                  key={index}
                  label={text}
                  onClick={() => handlePreparedResponse(text)}
                  color="primary"
                  variant="outlined"
                  size="medium"
                  sx={{ 
                    justifyContent: 'flex-start', 
                    borderRadius: '12px',
                    py: 1,
                    '&:hover': {
                      bgcolor: 'rgba(63, 81, 181, 0.1)',
                    }
                  }}
                />
              ))}
            </Box>
          </Paper>
        </Fade>
      )}
      
      <Paper 
        elevation={0} 
        component="form" 
        sx={{ 
          p: 1.5, 
          display: 'flex', 
          alignItems: 'center',
          borderRadius: 3,
          background: 'transparent',
          border: '1px solid rgba(0, 0, 0, 0.12)'
        }}
      >
        <Tooltip title="Vorgefertigte Antworten" arrow>
          <IconButton
            color="primary"
            onClick={handleMenuOpen}
            size="medium"
            sx={{ mr: 1 }}
          >
            <MoreVertIcon />
          </IconButton>
        </Tooltip>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            elevation: 3,
            sx: { borderRadius: 2, width: 200 }
          }}
        >
          <MenuItem onClick={() => handleCategorySelect('schule')}>
            <SchoolIcon fontSize="small" sx={{ mr: 1 }} /> Schule
          </MenuItem>
          <MenuItem onClick={() => handleCategorySelect('familie')}>
            <FamilyRestroomIcon fontSize="small" sx={{ mr: 1 }} /> Familie
          </MenuItem>
          <MenuItem onClick={() => handleCategorySelect('gefühle')}>
            <SentimentSatisfiedAltIcon fontSize="small" sx={{ mr: 1 }} /> Gefühle
          </MenuItem>
          <MenuItem onClick={() => handleCategorySelect('sport')}>
            <ChildCareIcon fontSize="small" sx={{ mr: 1 }} /> Sport & Freizeit
          </MenuItem>
        </Menu>
        
        <TextField
          fullWidth
          placeholder="Schreibe deine Nachricht..."
          variant="outlined"
          value={input}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          inputRef={inputRef}
          size="small"
          sx={{ 
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              '&.Mui-focused': {
                '& > fieldset': { borderColor: '#9c27b0' }
              }
            }
          }}
        />
        
        <IconButton 
          sx={{ ml: 1 }} 
          onClick={handleSendMessage} 
          disabled={isLoading || input.trim() === ''}
          color="primary"
          size="medium"
        >
          {isLoading ? 
            <CircularProgress size={24} /> : 
            <SendIcon sx={{ transform: 'rotate(-20deg)' }} />
          }
        </IconButton>
      </Paper>
    </Container>
  );
}
