/**
 * Font Loader Module
 *
 * Lazy loading and caching for custom font files.
 * Provides functions to load, cache, and embed custom fonts (specifically Noto Sans)
 * for wider Unicode character support in PDF generation.
 *
 * Supports fetching fonts from Google Fonts CDN with graceful fallback.
 *
 * @module fontLoader
 */

// ============================================================================
// Memory Cache
// ============================================================================

/**
 * Memory cache for loaded font bytes
 * @type {Map<string, Uint8Array>}
 */
const fontCache = new Map();

/**
 * Loading promises for fonts currently being loaded (prevents duplicate loads)
 * @type {Map<string, Promise<Uint8Array|null>>}
 */
const loadingPromises = new Map();

/**
 * Flag to track if CDN loading has been attempted and failed
 * @type {boolean}
 */
let cdnLoadFailed = false;

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * @typedef {Object} FontBundle
 * @description Collection of font weights for a font family
 * @property {Uint8Array} regular - Regular weight font bytes
 * @property {Uint8Array|null} bold - Bold weight font bytes (optional)
 * @property {Uint8Array|null} italic - Italic weight font bytes (optional)
 * @property {Uint8Array|null} boldItalic - Bold italic font bytes (optional)
 */

/**
 * @typedef {'regular'|'bold'|'italic'|'boldItalic'} FontWeight
 * @description Available font weights
 */

/**
 * @typedef {Object} FontEmbedResult
 * @description Result of embedding a font into a PDF document
 * @property {boolean} success - Whether embedding was successful
 * @property {Object|null} font - The embedded font object from pdf-lib
 * @property {string|null} error - Error message if embedding failed
 */

// ============================================================================
// CDN Configuration
// ============================================================================

/**
 * Google Fonts CDN URLs for Noto Sans TTF files
 * These URLs point to the actual TTF font files hosted on Google's CDN.
 * Using stable versions with comprehensive Unicode coverage including CJK, symbols, and special characters.
 *
 * @type {Object.<string, Object.<FontWeight, string>>}
 */
const FONT_CDN_URLS = {
  'NotoSans': {
    // Noto Sans Regular (400 weight) - Latin Extended subset
    regular: 'https://fonts.gstatic.com/s/notosans/v36/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A-9a6Vc.ttf',
    // Noto Sans Bold (700 weight) - Latin Extended subset
    bold: 'https://fonts.gstatic.com/s/notosans/v36/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyAaBO9a6Vc.ttf',
    // Noto Sans Italic (400 weight italic) - Latin Extended subset
    italic: 'https://fonts.gstatic.com/s/notosans/v36/o-0kIpQlx3QUlC5A4PNr4C5OaxRsfNNlKbCePevHtVtX57DGjDU1QDce.ttf',
    // Noto Sans Bold Italic (700 weight italic) - Latin Extended subset
    boldItalic: 'https://fonts.gstatic.com/s/notosans/v36/o-0kIpQlx3QUlC5A4PNr4C5OaxRsfNNlKbCePevHtVtX5wvAjDU1QDce.ttf'
  },
  // CJK fonts for Chinese, Japanese, Korean support
  'NotoSansSC': {
    // Noto Sans Simplified Chinese Regular
    regular: 'https://fonts.gstatic.com/s/notosanssc/v37/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYxNbPzS5HE.ttf',
    // Noto Sans Simplified Chinese Bold
    bold: 'https://fonts.gstatic.com/s/notosanssc/v37/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_Fn4BKbPzS5HE.ttf'
  },
  'NotoSansTC': {
    // Noto Sans Traditional Chinese Regular
    regular: 'https://fonts.gstatic.com/s/notosanstc/v36/-nFuOG829Oofr2wohFbTp9ifNAn722rq0MXz76Cy_CpOtma3uNQ.ttf',
    // Noto Sans Traditional Chinese Bold
    bold: 'https://fonts.gstatic.com/s/notosanstc/v36/-nFuOG829Oofr2wohFbTp9ifNAn722rq0MXz76Cy_N5LtmZ3uNQ.ttf'
  },
  'NotoSansJP': {
    // Noto Sans Japanese Regular
    regular: 'https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75vY0rw-oME.ttf',
    // Noto Sans Japanese Bold
    bold: 'https://fonts.gstatic.com/s/notosansjp/v53/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj757N0rw-oME.ttf'
  },
  'NotoSansKR': {
    // Noto Sans Korean Regular
    regular: 'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLTq8H4hfeE.ttf',
    // Noto Sans Korean Bold
    bold: 'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeObv8H4hfeE.ttf'
  },
  // Arabic support
  'NotoSansArabic': {
    // Noto Sans Arabic Regular
    regular: 'https://fonts.gstatic.com/s/notosansarabic/v18/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyGyvu3CBFQLaig.ttf',
    // Noto Sans Arabic Bold
    bold: 'https://fonts.gstatic.com/s/notosansarabic/v18/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCf9m-vu3CBFQLaig.ttf'
  },
  // Hebrew support
  'NotoSansHebrew': {
    // Noto Sans Hebrew Regular
    regular: 'https://fonts.gstatic.com/s/notosanshebrew/v46/or3HQ7v33eiDljA1IufXTtVf7V6RvEEdhQlk0LlGxCyaeNKYZC0sqk3xXGiXd4qtpYRE.ttf',
    // Noto Sans Hebrew Bold
    bold: 'https://fonts.gstatic.com/s/notosanshebrew/v46/or3HQ7v33eiDljA1IufXTtVf7V6RvEEdhQlk0LlGxCyaeNKYZC0sqk3xXGiX0IitpYRE.ttf'
  },
  // Thai support
  'NotoSansThai': {
    // Noto Sans Thai Regular
    regular: 'https://fonts.gstatic.com/s/notosansthai/v25/iJWnBXeUZi_OHPqn4wq6hQ2_hbJ1xyN9wd43SofNWcd1MKVQt_So_9CdU5RtpzF-QRvzzXg.ttf',
    // Noto Sans Thai Bold
    bold: 'https://fonts.gstatic.com/s/notosansthai/v25/iJWnBXeUZi_OHPqn4wq6hQ2_hbJ1xyN9wd43SofNWcd1MKVQt_So_9CdU5Rt0TZ-QRvzzXg.ttf'
  },
  // Symbols and special characters
  'NotoSansSymbols': {
    // Noto Sans Symbols Regular
    regular: 'https://fonts.gstatic.com/s/notosanssymbols/v44/rP2up3q65FkAtHfwd-eIS2brbDN6wkUUji_oNL4B_qdpFhdQw0Q.ttf'
  },
  'NotoSansSymbols2': {
    // Noto Sans Symbols 2 Regular - additional symbols including mathematical operators
    regular: 'https://fonts.gstatic.com/s/notosanssymbols2/v25/I_uyMoGduATTei9eI8daxVHDyfisHr71ypPqfX71-AI.ttf'
  },
  // Math symbols
  'NotoSansMath': {
    // Noto Sans Math Regular - comprehensive math symbols
    regular: 'https://fonts.gstatic.com/s/notosansmath/v15/7Aump_cpkSecTWaHRlH2hyV5UHkG-V048PW0.ttf'
  }
};

/**
 * Font family priority order for Unicode fallback
 * When a character isn't found in the primary font, try these in order
 * @type {string[]}
 */
const UNICODE_FONT_FALLBACK_ORDER = [
  'NotoSans',        // Latin, extended Latin, basic symbols
  'NotoSansSC',      // Simplified Chinese
  'NotoSansTC',      // Traditional Chinese
  'NotoSansJP',      // Japanese
  'NotoSansKR',      // Korean
  'NotoSansArabic',  // Arabic
  'NotoSansHebrew',  // Hebrew
  'NotoSansThai',    // Thai
  'NotoSansSymbols', // Common symbols
  'NotoSansSymbols2',// Additional symbols
  'NotoSansMath'     // Mathematical symbols
];

/**
 * Default font to use when custom fonts are requested
 * @type {string}
 */
const DEFAULT_FONT = 'NotoSans';

/**
 * Timeout for CDN font fetch requests (in milliseconds)
 * @type {number}
 */
const FETCH_TIMEOUT = 10000;

// ============================================================================
// Core Loading Functions
// ============================================================================

/**
 * Load Noto Sans font bytes with caching
 * Fetches from Google Fonts CDN with graceful fallback.
 * Uses lazy loading to avoid main bundle bloat.
 *
 * @param {'regular'|'bold'|'italic'|'boldItalic'} [weight='regular'] - Font weight to load
 * @returns {Promise<Uint8Array|null>} Font bytes or null on failure
 *
 * @example
 * const fontBytes = await loadNotoSansFont('regular');
 * if (fontBytes) {
 *   const font = await pdfDoc.embedFont(fontBytes);
 * }
 */
export async function loadNotoSansFont(weight = 'regular') {
  return loadCustomFont('NotoSans', weight);
}

/**
 * Fetch font from CDN with timeout
 * @private
 * @param {string} url - CDN URL to fetch from
 * @returns {Promise<Uint8Array|null>} Font bytes or null on failure
 */
async function fetchFontFromCDN(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      mode: 'cors',
      cache: 'force-cache' // Use browser cache when available
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Validate that we got actual font data (TTF files start with 0x00010000 or 'OTTO')
    if (bytes.length < 12) {
      throw new Error('Font data too small');
    }
    
    // Check for valid TTF/OTF signature
    const signature = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
    const isTTF = signature === 0x00010000; // TrueType
    const isOTF = bytes[0] === 0x4F && bytes[1] === 0x54 && bytes[2] === 0x54 && bytes[3] === 0x4F; // 'OTTO'
    
    if (!isTTF && !isOTF) {
      throw new Error('Invalid font format - not a valid TTF/OTF file');
    }
    
    return bytes;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Font fetch timed out');
    }
    throw err;
  }
}

/**
 * Load custom font bytes with caching
 * First tries to fetch from Google Fonts CDN, then falls back to local files.
 *
 * @param {string} fontName - Name of the font family (e.g., 'NotoSans')
 * @param {'regular'|'bold'|'italic'|'boldItalic'} [weight='regular'] - Font weight
 * @returns {Promise<Uint8Array|null>} Font bytes or null on failure
 *
 * @example
 * const fontBytes = await loadCustomFont('NotoSans', 'bold');
 */
export async function loadCustomFont(fontName, weight = 'regular') {
  const cacheKey = `${fontName}-${weight}`;
  
  // Check cache first
  if (fontCache.has(cacheKey)) {
    return fontCache.get(cacheKey);
  }
  
  // Check if already loading
  if (loadingPromises.has(cacheKey)) {
    return loadingPromises.get(cacheKey);
  }
  
  // Start loading
  const loadPromise = (async () => {
    try {
      // Try CDN first (unless previously failed for all fonts)
      if (!cdnLoadFailed) {
        const cdnUrls = FONT_CDN_URLS[fontName];
        if (cdnUrls && cdnUrls[weight]) {
          try {
            console.info(`Loading ${fontName}-${weight} from Google Fonts CDN...`);
            const bytes = await fetchFontFromCDN(cdnUrls[weight]);
            if (bytes) {
              console.info(`Successfully loaded ${fontName}-${weight} from CDN (${bytes.length} bytes)`);
              return bytes;
            }
          } catch (cdnErr) {
            console.warn(`CDN fetch failed for ${fontName}-${weight}:`, cdnErr.message);
            // Mark CDN as failed to skip for future requests (network issue)
            if (cdnErr.message.includes('timed out') || cdnErr.message.includes('NetworkError')) {
              cdnLoadFailed = true;
              console.warn('CDN loading disabled due to network issues');
            }
          }
        }
      }
      
      // CDN is the only source - local fonts are not bundled
      console.warn(`Font ${fontName}-${weight} could not be loaded from CDN`);
      return null;
      
    } catch (err) {
      console.warn(`Failed to load font ${fontName}-${weight}:`, err.message);
      return null;
    } finally {
      // Clean up loading promise
      loadingPromises.delete(cacheKey);
    }
  })();
  
  loadingPromises.set(cacheKey, loadPromise);
  
  const bytes = await loadPromise;
  if (bytes) {
    fontCache.set(cacheKey, bytes);
  }
  
  return bytes;
}

/**
 * Get font bytes for a specific font (synchronous cache lookup)
 * Returns cached font bytes or null if not loaded.
 * Use loadCustomFont() to load fonts asynchronously first.
 * 
 * @param {string} fontName - Name of the font family
 * @param {'regular'|'bold'|'italic'|'boldItalic'} [weight='regular'] - Font weight
 * @returns {Uint8Array|null} Font bytes or null if not in cache
 * 
 * @example
 * await loadCustomFont('NotoSans', 'regular');
 * const bytes = getFontBytes('NotoSans', 'regular'); // Now available
 */
export function getFontBytes(fontName, weight = 'regular') {
  const cacheKey = `${fontName}-${weight}`;
  return fontCache.get(cacheKey) || null;
}

// ============================================================================
// Font Embedding Functions
// ============================================================================

/**
 * Embed a custom font into a pdf-lib document
 * Loads the font if not already cached, then embeds it with subsetting.
 * Requires fontkit to be registered on the PDFDocument for custom fonts.
 *
 * @param {Object} pdfDoc - pdf-lib PDFDocument instance (must have fontkit registered)
 * @param {string} [fontName='NotoSans'] - Name of the font family
 * @param {'regular'|'bold'|'italic'|'boldItalic'} [weight='regular'] - Font weight
 * @returns {Promise<FontEmbedResult>} Result object with success status and embedded font
 *
 * @example
 * import fontkit from '@pdf-lib/fontkit';
 *
 * const pdfDoc = await PDFDocument.create();
 * pdfDoc.registerFontkit(fontkit);
 *
 * const result = await embedCustomFont(pdfDoc, 'NotoSans', 'regular');
 * if (result.success) {
 *   page.drawText('Hello', { font: result.font });
 * }
 */
export async function embedCustomFont(pdfDoc, fontName = 'NotoSans', weight = 'regular') {
  try {
    const fontBytes = await loadCustomFont(fontName, weight);
    
    if (!fontBytes) {
      return {
        success: false,
        font: null,
        error: `Font '${fontName}-${weight}' could not be loaded from any source`
      };
    }
    
    // Embed with subsetting to reduce file size
    // Note: fontkit must be registered on pdfDoc for this to work
    const font = await pdfDoc.embedFont(fontBytes, { subset: true });
    
    console.info(`Successfully embedded ${fontName}-${weight} font into PDF`);
    
    return {
      success: true,
      font,
      error: null
    };
  } catch (err) {
    console.error(`Failed to embed font ${fontName}-${weight}:`, err);
    return {
      success: false,
      font: null,
      error: err.message
    };
  }
}

/**
 * Get font bytes for embedding (without actually embedding)
 * Useful when you need the raw bytes for other operations.
 *
 * @param {string} [fontName='NotoSans'] - Name of the font family
 * @param {'regular'|'bold'|'italic'|'boldItalic'} [weight='regular'] - Font weight
 * @returns {Promise<Uint8Array|null>} Font bytes or null if unavailable
 */
export async function getEmbeddableFontBytes(fontName = 'NotoSans', weight = 'regular') {
  return loadCustomFont(fontName, weight);
}

/**
 * Check if a font supports extended Unicode characters
 * Noto Sans supports a wide range of Unicode including special spaces.
 *
 * @param {string} fontName - Name of the font family
 * @returns {boolean} True if the font supports wider Unicode
 */
export function supportsUnicode(fontName) {
  // Noto Sans specifically designed for Unicode support
  const unicodeFonts = ['NotoSans', 'NotoSerif', 'NotoMono'];
  return unicodeFonts.includes(fontName);
}

/**
 * Get the font fallback order for comprehensive Unicode support
 * @returns {string[]} Array of font family names in priority order
 */
export function getUnicodeFontFallbackOrder() {
  return [...UNICODE_FONT_FALLBACK_ORDER];
}

/**
 * Unicode range definitions for determining which font to use
 * Each range maps to a preferred font family
 */
const UNICODE_RANGES = {
  // CJK Unified Ideographs and extensions
  cjk: [
    [0x4E00, 0x9FFF],   // CJK Unified Ideographs
    [0x3400, 0x4DBF],   // CJK Unified Ideographs Extension A
    [0x20000, 0x2A6DF], // CJK Unified Ideographs Extension B
    [0x2A700, 0x2B73F], // CJK Unified Ideographs Extension C
    [0x2B740, 0x2B81F], // CJK Unified Ideographs Extension D
    [0xF900, 0xFAFF],   // CJK Compatibility Ideographs
    [0x2F00, 0x2FDF],   // Kangxi Radicals
  ],
  // Japanese specific
  japanese: [
    [0x3040, 0x309F],   // Hiragana
    [0x30A0, 0x30FF],   // Katakana
    [0x31F0, 0x31FF],   // Katakana Phonetic Extensions
    [0xFF65, 0xFF9F],   // Halfwidth Katakana
  ],
  // Korean specific
  korean: [
    [0xAC00, 0xD7AF],   // Hangul Syllables
    [0x1100, 0x11FF],   // Hangul Jamo
    [0x3130, 0x318F],   // Hangul Compatibility Jamo
    [0xA960, 0xA97F],   // Hangul Jamo Extended-A
    [0xD7B0, 0xD7FF],   // Hangul Jamo Extended-B
  ],
  // Arabic
  arabic: [
    [0x0600, 0x06FF],   // Arabic
    [0x0750, 0x077F],   // Arabic Supplement
    [0x08A0, 0x08FF],   // Arabic Extended-A
    [0xFB50, 0xFDFF],   // Arabic Presentation Forms-A
    [0xFE70, 0xFEFF],   // Arabic Presentation Forms-B
  ],
  // Hebrew
  hebrew: [
    [0x0590, 0x05FF],   // Hebrew
    [0xFB1D, 0xFB4F],   // Hebrew Presentation Forms
  ],
  // Thai
  thai: [
    [0x0E00, 0x0E7F],   // Thai
  ],
  // Mathematical symbols
  math: [
    [0x2200, 0x22FF],   // Mathematical Operators
    [0x2A00, 0x2AFF],   // Supplemental Mathematical Operators
    [0x27C0, 0x27EF],   // Miscellaneous Mathematical Symbols-A
    [0x2980, 0x29FF],   // Miscellaneous Mathematical Symbols-B
    [0x2100, 0x214F],   // Letterlike Symbols
    [0x1D400, 0x1D7FF], // Mathematical Alphanumeric Symbols
  ],
  // General symbols
  symbols: [
    [0x2300, 0x23FF],   // Miscellaneous Technical
    [0x2600, 0x26FF],   // Miscellaneous Symbols
    [0x2700, 0x27BF],   // Dingbats
    [0x2B00, 0x2BFF],   // Miscellaneous Symbols and Arrows
    [0x1F300, 0x1F5FF], // Miscellaneous Symbols and Pictographs
    [0x1F600, 0x1F64F], // Emoticons
    [0x1F680, 0x1F6FF], // Transport and Map Symbols
    [0x1F900, 0x1F9FF], // Supplemental Symbols and Pictographs
  ],
  // Additional symbols (Symbols2 font)
  symbols2: [
    [0x2500, 0x257F],   // Box Drawing
    [0x2580, 0x259F],   // Block Elements
    [0x25A0, 0x25FF],   // Geometric Shapes
    [0x2190, 0x21FF],   // Arrows
    [0x2000, 0x206F],   // General Punctuation (special spaces)
  ],
};

/**
 * Mapping of Unicode range categories to font families
 */
const RANGE_TO_FONT = {
  cjk: 'NotoSansSC',       // Default to Simplified Chinese for CJK
  japanese: 'NotoSansJP',
  korean: 'NotoSansKR',
  arabic: 'NotoSansArabic',
  hebrew: 'NotoSansHebrew',
  thai: 'NotoSansThai',
  math: 'NotoSansMath',
  symbols: 'NotoSansSymbols',
  symbols2: 'NotoSansSymbols2',
};

/**
 * Check if a code point falls within any of the given ranges
 * @param {number} codePoint - Unicode code point
 * @param {Array<[number, number]>} ranges - Array of [start, end] ranges
 * @returns {boolean}
 */
function isInRanges(codePoint, ranges) {
  for (const [start, end] of ranges) {
    if (codePoint >= start && codePoint <= end) {
      return true;
    }
  }
  return false;
}

/**
 * Determine which font family is best for a given character
 * @param {string} char - Single character
 * @returns {string} Font family name
 */
export function getFontForCharacter(char) {
  if (!char || char.length === 0) return 'NotoSans';
  
  const codePoint = char.codePointAt(0);
  
  // Check each Unicode range category
  for (const [category, ranges] of Object.entries(UNICODE_RANGES)) {
    if (isInRanges(codePoint, ranges)) {
      return RANGE_TO_FONT[category] || 'NotoSans';
    }
  }
  
  // Default to NotoSans for Latin and other scripts
  return 'NotoSans';
}

/**
 * Analyze text and determine which fonts are needed
 * @param {string} text - Text to analyze
 * @returns {Set<string>} Set of required font family names
 */
export function getRequiredFontsForText(text) {
  const requiredFonts = new Set(['NotoSans']); // Always include base font
  
  if (!text) return requiredFonts;
  
  for (const char of text) {
    const font = getFontForCharacter(char);
    requiredFonts.add(font);
  }
  
  return requiredFonts;
}

/**
 * Preload all fonts needed for a given text
 * @param {string} text - Text that will be rendered
 * @param {'regular'|'bold'} [weight='regular'] - Font weight to load
 * @returns {Promise<Map<string, Uint8Array>>} Map of font name to bytes
 */
export async function preloadFontsForText(text, weight = 'regular') {
  const requiredFonts = getRequiredFontsForText(text);
  const loadedFonts = new Map();
  
  const loadPromises = [];
  for (const fontName of requiredFonts) {
    loadPromises.push(
      loadCustomFont(fontName, weight)
        .then(bytes => {
          if (bytes) {
            loadedFonts.set(fontName, bytes);
          }
        })
        .catch(err => {
          console.warn(`Failed to preload ${fontName}:`, err.message);
        })
    );
  }
  
  await Promise.all(loadPromises);
  return loadedFonts;
}

/**
 * Get the list of available custom fonts
 * @returns {string[]} Array of available font family names
 */
export function getAvailableFonts() {
  return Object.keys(FONT_CDN_URLS);
}

/**
 * Reset CDN failure flag (for testing or after network recovery)
 */
export function resetCDNStatus() {
  cdnLoadFailed = false;
}

// ============================================================================
// Preloading and Cache Management
// ============================================================================

/**
 * Preload fonts for faster PDF generation
 * Loads the most commonly used font weights into cache.
 * Call this during app initialization for better UX.
 * 
 * @returns {Promise<void>}
 * 
 * @example
 * // In app initialization
 * useEffect(() => {
 *   preloadFonts().then(() => console.log('Fonts ready'));
 * }, []);
 */
export async function preloadFonts() {
  const weights = ['regular', 'bold'];
  
  const loadPromises = weights.map(weight => 
    loadNotoSansFont(weight).catch(err => {
      console.warn(`Preload failed for weight '${weight}':`, err.message);
      return null;
    })
  );
  
  await Promise.all(loadPromises);
  console.info('Font preloading complete');
}

/**
 * Clear the font cache to free memory
 * Useful when fonts are no longer needed or before loading new fonts.
 * 
 * @returns {void}
 * 
 * @example
 * clearFontCache();
 * console.log(areFontsLoaded()); // false
 */
export function clearFontCache() {
  fontCache.clear();
  console.info('Font cache cleared');
}

/**
 * Check if fonts are loaded in cache
 * Returns true if at least the regular weight of the default font is cached.
 * 
 * @returns {boolean} True if fonts are loaded and ready
 * 
 * @example
 * if (!areFontsLoaded()) {
 *   await preloadFonts();
 * }
 */
export function areFontsLoaded() {
  return fontCache.has(`${DEFAULT_FONT}-regular`);
}

/**
 * Get the number of fonts currently cached
 * Useful for debugging and monitoring memory usage.
 * 
 * @returns {number} Number of font variants in cache
 */
export function getCacheSize() {
  return fontCache.size;
}

/**
 * Check if a specific font weight is cached
 * 
 * @param {string} fontName - Font family name
 * @param {'regular'|'bold'|'italic'|'boldItalic'} [weight='regular'] - Font weight
 * @returns {boolean} True if the specific font is cached
 */
export function isFontCached(fontName, weight = 'regular') {
  return fontCache.has(`${fontName}-${weight}`);
}

// ============================================================================
// Default Export
// ============================================================================

/**
 * FontLoader module API
 * @type {Object}
 */
const fontLoaderAPI = {
  loadNotoSansFont,
  loadCustomFont,
  getFontBytes,
  embedCustomFont,
  getEmbeddableFontBytes,
  supportsUnicode,
  getAvailableFonts,
  getUnicodeFontFallbackOrder,
  getFontForCharacter,
  getRequiredFontsForText,
  preloadFontsForText,
  resetCDNStatus,
  preloadFonts,
  clearFontCache,
  areFontsLoaded,
  getCacheSize,
  isFontCached
};

export default fontLoaderAPI;