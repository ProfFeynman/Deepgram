/**
 * Voice command utilities to detect and execute various browser actions
 * based on natural language voice commands
 */

// Command patterns for various actions
const COMMAND_PATTERNS = {
  // Website opening commands
  open_website: [
    { regex: /\bopen\s+(netflix|amazon|youtube|google|facebook|twitter|instagram)\b/i, action: 'open_website' },
    { regex: /\bgo\s+to\s+(netflix|amazon|youtube|google|facebook|twitter|instagram)\b/i, action: 'open_website' },
    { regex: /\bnavigate\s+to\s+(netflix|amazon|youtube|google|facebook|twitter|instagram)\b/i, action: 'open_website' },
    { regex: /\blaunch\s+(netflix|amazon|youtube|google|facebook|twitter|instagram)\b/i, action: 'open_website' },
  ],
  
  // Search commands
  search: [
    { regex: /\bsearch\s+(?:for\s+)?(.*)/i, action: 'search' },
    { regex: /\blook\s+up\s+(.*)/i, action: 'search' },
    { regex: /\bfind\s+(?:information\s+about\s+)?(.*)/i, action: 'search' },
  ],
  
  // Browser navigation commands
  navigation: [
    { regex: /\b(?:go\s+)?back\b/i, action: 'go_back' },
    { regex: /\b(?:go\s+)?forward\b/i, action: 'go_forward' },
    { regex: /\breload\b/i, action: 'reload' },
    { regex: /\brefresh\b/i, action: 'reload' },
    { regex: /\bclose\s+tab\b/i, action: 'close_tab' },
    { regex: /\bnew\s+tab\b/i, action: 'new_tab' },
  ]
};

// Common website URLs
const WEBSITE_URLS: Record<string, string> = {
  'netflix': 'https://www.netflix.com',
  'amazon': 'https://www.amazon.com',
  'youtube': 'https://www.youtube.com',
  'google': 'https://www.google.com',
  'facebook': 'https://www.facebook.com',
  'twitter': 'https://www.twitter.com',
  'instagram': 'https://www.instagram.com',
};

/**
 * Analyzes transcribed text for voice commands
 * @param transcript The transcribed text to analyze
 * @returns An object with the recognized command and any additional data
 */
export const analyzeTranscript = (transcript: string): { 
  command: string | null; 
  data: any;
  actionTaken: boolean;
} => {
  transcript = transcript.toLowerCase().trim();
  
  // Check for website commands
  for (const pattern of COMMAND_PATTERNS.open_website) {
    const match = transcript.match(pattern.regex);
    if (match && match[1]) {
      const website = match[1].toLowerCase();
      if (WEBSITE_URLS[website]) {
        openWebsite(website);
        return { 
          command: pattern.action, 
          data: { website }, 
          actionTaken: true 
        };
      }
    }
  }
  
  // Check for search commands
  for (const pattern of COMMAND_PATTERNS.search) {
    const match = transcript.match(pattern.regex);
    if (match && match[1]) {
      const searchTerm = match[1].trim();
      if (searchTerm) {
        searchWeb(searchTerm);
        return {
          command: pattern.action,
          data: { searchTerm },
          actionTaken: true
        };
      }
    }
  }
  
  // Check for navigation commands
  for (const pattern of COMMAND_PATTERNS.navigation) {
    const match = transcript.match(pattern.regex);
    if (match) {
      const action = pattern.action;
      executeNavigationCommand(action);
      return {
        command: action,
        data: null,
        actionTaken: true
      };
    }
  }
  
  // No command found
  return { command: null, data: null, actionTaken: false };
};

/**
 * Opens a website in a new tab
 * @param website The name of the website to open
 */
export const openWebsite = (website: string): void => {
  const url = WEBSITE_URLS[website];
  if (url) {
    window.open(url, '_blank');
    console.log(`Opening ${website} at ${url}`);
  }
};

/**
 * Search the web for a term
 * @param searchTerm The term to search for
 */
export const searchWeb = (searchTerm: string): void => {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`;
  window.open(searchUrl, '_blank');
  console.log(`Searching for: ${searchTerm}`);
};

/**
 * Execute a browser navigation command
 * @param action The navigation action to perform
 */
export const executeNavigationCommand = (action: string): void => {
  switch (action) {
    case 'go_back':
      window.history.back();
      console.log('Navigating back');
      break;
    case 'go_forward':
      window.history.forward();
      console.log('Navigating forward');
      break;
    case 'reload':
      window.location.reload();
      console.log('Reloading page');
      break;
    case 'close_tab':
      // This will only work if the tab was opened by JavaScript
      window.close();
      console.log('Attempting to close tab');
      break;
    case 'new_tab':
      window.open('about:blank', '_blank');
      console.log('Opening new tab');
      break;
    default:
      console.log(`Unknown navigation command: ${action}`);
  }
};

/**
 * Adds a custom website to the recognized list
 * @param name The name to recognize in voice commands
 * @param url The URL to open
 */
export const addCustomWebsite = (name: string, url: string): void => {
  name = name.toLowerCase();
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }
  WEBSITE_URLS[name] = url;
  
  // Add to patterns
  const patterns = COMMAND_PATTERNS.open_website;
  
  // We need to create new regex patterns that include the new website name
  // We'll rebuild all patterns with the updated list of websites
  const websiteNames = Object.keys(WEBSITE_URLS).join('|');
  
  // Reset existing patterns for open_website and rebuild with new website names
  COMMAND_PATTERNS.open_website = [
    { regex: new RegExp(`\\bopen\\s+(${websiteNames})\\b`, 'i'), action: 'open_website' },
    { regex: new RegExp(`\\bgo\\s+to\\s+(${websiteNames})\\b`, 'i'), action: 'open_website' },
    { regex: new RegExp(`\\bnavigate\\s+to\\s+(${websiteNames})\\b`, 'i'), action: 'open_website' },
    { regex: new RegExp(`\\blaunch\\s+(${websiteNames})\\b`, 'i'), action: 'open_website' },
  ];
}; 