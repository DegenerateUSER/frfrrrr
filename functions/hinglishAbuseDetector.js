import fs from 'fs';
import path from 'path';

export async function AbuseDetector(text,severityvalue) {
  function loadAbuseList(filepath) {
  try {
    const abuseMap = new Map();
    const regexPatterns = [];
    const data = fs.readFileSync(filepath, 'utf-8').split('\n');
    
    data.forEach((line, index) => {
      // Skip header row
      if (index === 0 && line.toLowerCase().includes('word')) return;
      
      const parts = line.split(',');
      if (parts.length >= 3) {
        const word = parts[0]?.trim().toLowerCase();
        const severity = parseInt(parts[2]?.trim());
        const regexPattern = parts[3]?.trim();
        
        if (word && !isNaN(severity)) {
          // Store word with severity
          abuseMap.set(word, severity);
          
          // Store regex pattern if available
          if (regexPattern) {
            try {
              regexPatterns.push({
                word: word,
                pattern: new RegExp(regexPattern, 'gi'),
                severity: severity
              });
            } catch (err) {
              console.error(`Invalid regex pattern for "${word}": ${regexPattern}`);
            }
          }
        }
      }
    });
    
    console.log(`Loaded ${abuseMap.size} words and ${regexPatterns.length} regex patterns from abuse list`);
    return { abuseMap, regexPatterns };
  } catch (error) {
    console.error(`Error loading abuse list: ${error.message}`);
    // Return empty structures to avoid errors when the file isn't found
    return { abuseMap: new Map(), regexPatterns: [] };
  }
}

// Enhance the normalizeWord function to handle Hinglish text better
function normalizeWord(word) {
  // Convert to lowercase and remove non-alphanumeric characters
  // Keep hindi characters by removing the current filter
  return word.toLowerCase().replace(/[^\p{L}0-9]/gu, '');
}

// Improve the abuse detection to catch variations and obfuscation attempts
function detectAbuse(text, abuseMap, regexPatterns, severityThreshold) {
  const words = text.split(/\s+/);
  const detected = [];
  const detectedWords = new Set(); // Track already detected words to avoid duplicates
  
  // 1. REGEX PATTERN MATCHING (Most powerful - checks entire text)
  regexPatterns.forEach(({ word, pattern, severity }) => {
    if (severity >= severityThreshold) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        matches.forEach(match => {
          const key = `${word}-${match}`;
          if (!detectedWords.has(key)) {
            detected.push({ 
              word: word,
              severity,
              original: match,
              method: 'regex'
            });
            detectedWords.add(key);
          }
        });
      }
    }
  });
  
  // 2. WORD-BY-WORD ANALYSIS
  words.forEach(word => {
    const normalized = normalizeWord(word);
    
    // Direct match
    if (abuseMap.has(normalized)) {
      const severity = abuseMap.get(normalized);
      if (severity >= severityThreshold) {
        const key = `${normalized}-direct`;
        if (!detectedWords.has(key)) {
          detected.push({ word: normalized, severity, original: word, method: 'direct' });
          detectedWords.add(key);
        }
      }
      return; // Skip further checks for this word
    }
    
    // Check for common obfuscation techniques
    // Character substitutions (like @ for a, 0 for o, etc.)
    const deobfuscated = normalized
      .replace(/0/g, 'o')
      .replace(/1/g, 'i')
      .replace(/3/g, 'e')
      .replace(/4/g, 'a')
      .replace(/5/g, 's')
      .replace(/8/g, 'b')
      .replace(/\$/g, 's')
      .replace(/@/g, 'a');
      
    if (abuseMap.has(deobfuscated)) {
      const severity = abuseMap.get(deobfuscated);
      if (severity >= severityThreshold) {
        const key = `${deobfuscated}-deobfuscated`;
        if (!detectedWords.has(key)) {
          detected.push({ 
            word: deobfuscated, 
            severity,
            original: word,
            method: 'deobfuscated'
          });
          detectedWords.add(key);
        }
      }
    }
    
    // Check if the word contains any abuse words (substring match)
    for (const [abuseWord, severity] of abuseMap.entries()) {
      if (severity >= severityThreshold && 
          normalized.length > 4 && // Only consider longer words
          abuseWord.length > 3 && // Only consider significant abuse words
          normalized.includes(abuseWord)) {
        const key = `${abuseWord}-contained`;
        if (!detectedWords.has(key)) {
          detected.push({ 
            word: abuseWord, 
            severity,
            original: word,
            method: 'contained'
          });
          detectedWords.add(key);
        }
        break; // Found one match, no need to check more
      }
    }
  });

  return detected;
}

// Create a default abuse map and regex patterns
let defaultAbuseMap;
let defaultRegexPatterns;
try {
  const filePath = path.join(process.cwd(), 'functions/data', 'hinglish_abuse.csv');
  const { abuseMap, regexPatterns } = loadAbuseList(filePath);
  defaultAbuseMap = abuseMap;
  defaultRegexPatterns = regexPatterns;
} catch (error) {
  console.error('Failed to load default abuse list:', error);
  defaultAbuseMap = new Map();
  defaultRegexPatterns = [];
}

// Export the functions
// export { loadAbuseList, normalizeWord, detectAbuse, defaultAbuseMap, defaultRegexPatterns };

// Main detection logic
  const inputText = text;
  const results = detectAbuse(inputText, defaultAbuseMap, defaultRegexPatterns, severityvalue);
  
  if (results.length > 0) {
    console.log(`⚠️ Abusive words detected:`);
    results.forEach(entry => {
      console.log(` - ${entry.word} (severity ${entry.severity}) [${entry.method}] matched: "${entry.original}"`);
    });
    return true

  } else {
    console.log("✅ No severe abuse detected.");
    return false
  }

}
