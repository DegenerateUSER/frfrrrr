import fs from 'fs';
import path from 'path';

export async function AbuseDetector(text,severityvalue) {
  function loadAbuseList(filepath) {
  try {
    const abuseMap = new Map();
    const data = fs.readFileSync(filepath, 'utf-8').split('\n');
    data.forEach(line => {
      const [word, meaning, severityStr] = line.split(',');
      if (word && severityStr) {
        abuseMap.set(word.trim().toLowerCase(), parseInt(severityStr.trim()));
      }
    });
    console.log(`Loaded ${abuseMap.size} words from abuse list`);
    return abuseMap;
  } catch (error) {
    console.error(`Error loading abuse list: ${error.message}`);
    // Return an empty map to avoid errors when the file isn't found
    return new Map();
  }
}

// Enhance the normalizeWord function to handle Hinglish text better
function normalizeWord(word) {
  // Convert to lowercase and remove non-alphanumeric characters
  // Keep hindi characters by removing the current filter
  return word.toLowerCase().replace(/[^\p{L}0-9]/gu, '');
}

// Improve the abuse detection to catch variations and obfuscation attempts
function detectAbuse(text, abuseMap, severityThreshold) {
  const words = text.split(/\s+/);
  const detected = [];
  
  // Process each word in the text
  words.forEach(word => {
    const normalized = normalizeWord(word);
    
    // Direct match
    if (abuseMap.has(normalized)) {
      const severity = abuseMap.get(normalized);
      if (severity >= severityThreshold) {
        detected.push({ word: normalized, severity, original: word });
      }
      return; // Skip further checks for this word
    }
    
    // Check for common obfuscation techniques
    // 1. Check for character substitutions (like @ for a, 0 for o, etc.)
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
        detected.push({ 
          word: deobfuscated, 
          severity,
          original: word,
          obfuscated: true 
        });
      }
    }
    
    // 2. Check if the word contains any abuse words (substring match)
    for (const [abuseWord, severity] of abuseMap.entries()) {
      if (severity >= severityThreshold && 
          normalized.length > 4 && // Only consider longer words
          abuseWord.length > 3 && // Only consider significant abuse words
          normalized.includes(abuseWord)) {
        detected.push({ 
          word: abuseWord, 
          severity,
          original: word,
          contained: true 
        });
        break; // Found one match, no need to check more
      }
    }
  });

  return detected;
}

// Create a default abuse map
let defaultAbuseMap;
try {
  const filePath = path.join(process.cwd(), 'functions/data', 'hinglish_abuse.csv');
  defaultAbuseMap = loadAbuseList(filePath);
} catch (error) {
  console.error('Failed to load default abuse list:', error);
  defaultAbuseMap = new Map();
}

// Export the functions
// export { loadAbuseList, normalizeWord, detectAbuse, defaultAbuseMap };

// If this file is run directly (not imported), run the example

  const inputText = text;
  const results = detectAbuse(inputText, defaultAbuseMap , severityvalue);
  
  if (results.length > 0) {
    console.log(`⚠️ Abusive words detected:`);
    results.forEach(entry => {
      console.log(` - ${entry.word} (severity ${entry.severity})`);
    });
    return true

  } else {
    console.log("✅ No severe abuse detected.");
    return false
  }

}