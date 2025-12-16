/**
 * Text Layout Engine
 * 
 * Provides text measurement, wrapping, and overflow handling for PDF generation.
 * Works with pdf-lib fonts to accurately measure text width and handle overflow.
 * 
 * This module solves the PDF text overflow problem by:
 * 1. Measuring text width before rendering
 * 2. Breaking text at word/character boundaries
 * 3. Handling CJK text with character-level wrapping
 * 4. Providing scaling and truncation strategies
 * 
 * @module textLayoutEngine
 */

// ============================================================================
// Type Definitions (JSDoc)
// ============================================================================

/**
 * @typedef {Object} TextMeasurement
 * @property {number} width - Total text width in PDF points
 * @property {number} height - Text height in PDF points
 * @property {number} charCount - Number of characters
 * @property {number[]} charWidths - Width of each character
 */

/**
 * @typedef {Object} LayoutConstraints
 * @property {number} maxWidth - Maximum allowed width
 * @property {number} leftMargin - Left margin position
 * @property {number} rightMargin - Right margin position (distance from right edge)
 * @property {number} pageWidth - Total page width
 * @property {number} [pageHeight] - Total page height
 */

/**
 * @typedef {Object} WrappedLine
 * @property {string} text - Text content for this line
 * @property {number} width - Width of this line in points
 * @property {number} startCharIndex - Start index in original text
 * @property {number} endCharIndex - End index in original text (exclusive)
 */

/**
 * @typedef {Object} TextLayoutResult
 * @property {'normal'|'wrapped'|'scaled'|'truncated'} strategy - Strategy used
 * @property {WrappedLine[]} lines - Lines to render
 * @property {number} fontSize - Final font size (may be scaled)
 * @property {number} totalHeight - Total height of all lines
 * @property {boolean} overflow - True if text was modified to fit
 */

/**
 * @typedef {Object} TextLayoutOptions
 * @property {'wrap'|'scale'|'truncate'} [overflowStrategy='wrap'] - How to handle overflow
 * @property {number} [lineHeight=1.2] - Line height multiplier
 * @property {number} [minFontSize=6] - Minimum font size for scaling
 * @property {boolean} [preserveWhitespace=false] - Preserve leading/trailing whitespace
 */

// ============================================================================
// CJK Detection
// ============================================================================

/**
 * Check if text contains CJK (Chinese, Japanese, Korean) characters
 * CJK text requires character-level wrapping instead of word-level wrapping
 * 
 * @param {string} text - Text to check
 * @returns {boolean} True if text contains CJK characters
 */
export function containsCJK(text) {
  if (!text) return false;
  
  // CJK Unicode ranges:
  // - CJK Unified Ideographs: U+4E00-U+9FFF (Chinese/Japanese Kanji)
  // - CJK Unified Ideographs Extension A: U+3400-U+4DBF
  // - Hiragana: U+3040-U+309F (Japanese)
  // - Katakana: U+30A0-U+30FF (Japanese)
  // - Hangul Syllables: U+AC00-U+D7AF (Korean)
  // - Bopomofo: U+3100-U+312F (Chinese phonetic)
  // - CJK Symbols and Punctuation: U+3000-U+303F
  const cjkRegex = /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u3100-\u312F\u3000-\u303F]/;
  return cjkRegex.test(text);
}

// ============================================================================
// Text Measurement
// ============================================================================

/**
 * Measure the width of text using a pdf-lib font
 * 
 * @param {string} text - Text to measure
 * @param {Object} font - pdf-lib embedded font object with widthOfTextAtSize method
 * @param {number} fontSize - Font size in points
 * @returns {TextMeasurement} Measurement result
 */
export function measureText(text, font, fontSize) {
  // Validate inputs
  if (!text || typeof text !== 'string') {
    return { width: 0, height: 0, charCount: 0, charWidths: [] };
  }
  
  if (!font || typeof font.widthOfTextAtSize !== 'function') {
    console.error('measureText: Invalid font object - missing widthOfTextAtSize method');
    // Return estimate based on font size
    const estimatedWidth = text.length * fontSize * 0.6;
    return {
      width: estimatedWidth,
      height: fontSize * 1.2,
      charCount: text.length,
      charWidths: Array(text.length).fill(fontSize * 0.6)
    };
  }
  
  if (typeof fontSize !== 'number' || fontSize <= 0) {
    console.warn('measureText: Invalid fontSize, using default 12');
    fontSize = 12;
  }
  
  try {
    // Measure total width
    const width = font.widthOfTextAtSize(text, fontSize);
    
    // Get height - pdf-lib fonts may have heightAtSize method
    let height;
    if (typeof font.heightAtSize === 'function') {
      height = font.heightAtSize(fontSize);
    } else {
      // Fallback estimate
      height = fontSize * 1.2;
    }
    
    // Measure individual characters for precise wrapping
    const chars = [...text]; // Properly handle Unicode (including emoji, CJK)
    const charWidths = [];
    
    for (const char of chars) {
      try {
        charWidths.push(font.widthOfTextAtSize(char, fontSize));
      } catch (charErr) {
        // Character not in font glyph table - estimate width
        // CJK characters are typically wider than Latin
        const isCJKChar = containsCJK(char);
        charWidths.push(fontSize * (isCJKChar ? 1.0 : 0.6));
      }
    }
    
    return { width, height, charCount: chars.length, charWidths };
  } catch (err) {
    console.error('measureText: Measurement failed', err);
    // Return safe defaults
    const chars = [...text];
    return {
      width: chars.length * fontSize * 0.6,
      height: fontSize * 1.2,
      charCount: chars.length,
      charWidths: Array(chars.length).fill(fontSize * 0.6)
    };
  }
}

/**
 * Calculate available width for text at a given position
 * 
 * @param {number} x - Text X position
 * @param {LayoutConstraints} constraints - Page constraints
 * @returns {number} Available width in points
 */
export function calculateAvailableWidth(x, constraints) {
  if (!constraints || typeof constraints.pageWidth !== 'number') {
    console.warn('calculateAvailableWidth: Invalid constraints');
    return 500; // Default reasonable width
  }
  
  const rightBoundary = constraints.pageWidth - (constraints.rightMargin || 0);
  return Math.max(0, rightBoundary - x);
}

/**
 * Check if text fits within available space
 * 
 * @param {string} text - Text to check
 * @param {Object} font - pdf-lib font object
 * @param {number} fontSize - Font size
 * @param {number} availableWidth - Available width
 * @returns {boolean} True if text fits
 */
export function textFits(text, font, fontSize, availableWidth) {
  if (!text || availableWidth <= 0) return true;
  
  const measurement = measureText(text, font, fontSize);
  return measurement.width <= availableWidth;
}

// ============================================================================
// Text Wrapping
// ============================================================================

/**
 * Wrap text by word boundaries (for Latin text with spaces)
 * 
 * @param {string} text - Text to wrap
 * @param {Object} font - pdf-lib font object
 * @param {number} fontSize - Font size
 * @param {number} maxWidth - Maximum line width
 * @returns {WrappedLine[]} Array of wrapped lines
 */
function wrapByWords(text, font, fontSize, maxWidth) {
  const words = text.split(/(\s+)/); // Keep spaces as separate tokens
  const lines = [];
  let currentLine = '';
  let currentWidth = 0;
  let startIndex = 0;
  let charIndex = 0;
  
  for (const word of words) {
    if (!word) continue;
    
    let wordWidth;
    try {
      wordWidth = font.widthOfTextAtSize(word, fontSize);
    } catch (err) {
      wordWidth = word.length * fontSize * 0.6;
    }
    
    if (currentWidth + wordWidth <= maxWidth) {
      // Word fits on current line
      currentLine += word;
      currentWidth += wordWidth;
    } else {
      // Word doesn't fit
      if (currentLine.length > 0) {
        // Save current line
        lines.push({
          text: currentLine,
          width: currentWidth,
          startCharIndex: startIndex,
          endCharIndex: charIndex
        });
        startIndex = charIndex;
        currentLine = '';
        currentWidth = 0;
      }
      
      // Check if single word fits on a new line
      if (wordWidth <= maxWidth) {
        currentLine = word;
        currentWidth = wordWidth;
      } else {
        // Word is too long - break it by character
        const brokenLines = wrapByCharacters(word, font, fontSize, maxWidth, null);
        for (let i = 0; i < brokenLines.length - 1; i++) {
          lines.push({
            text: brokenLines[i].text,
            width: brokenLines[i].width,
            startCharIndex: startIndex + brokenLines[i].startCharIndex,
            endCharIndex: startIndex + brokenLines[i].endCharIndex
          });
        }
        // Keep last broken piece as current line
        if (brokenLines.length > 0) {
          const lastBroken = brokenLines[brokenLines.length - 1];
          currentLine = lastBroken.text;
          currentWidth = lastBroken.width;
        }
      }
    }
    charIndex += word.length;
  }
  
  // Add final line
  if (currentLine.length > 0) {
    lines.push({
      text: currentLine,
      width: currentWidth,
      startCharIndex: startIndex,
      endCharIndex: charIndex
    });
  }
  
  return lines.length > 0 ? lines : [{ text: '', width: 0, startCharIndex: 0, endCharIndex: 0 }];
}

/**
 * Wrap text by individual characters (for CJK or long words)
 * 
 * @param {string} text - Text to wrap
 * @param {Object} font - pdf-lib font object
 * @param {number} fontSize - Font size
 * @param {number} maxWidth - Maximum line width
 * @param {number[]|null} precomputedWidths - Pre-computed character widths (optional)
 * @returns {WrappedLine[]} Array of wrapped lines
 */
function wrapByCharacters(text, font, fontSize, maxWidth, precomputedWidths) {
  const lines = [];
  let currentLine = '';
  let currentWidth = 0;
  let startIndex = 0;
  
  const chars = [...text]; // Properly handle Unicode
  
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    let charWidth;
    
    if (precomputedWidths && precomputedWidths[i] !== undefined) {
      charWidth = precomputedWidths[i];
    } else {
      try {
        charWidth = font.widthOfTextAtSize(char, fontSize);
      } catch (err) {
        charWidth = fontSize * (containsCJK(char) ? 1.0 : 0.6);
      }
    }
    
    if (currentWidth + charWidth <= maxWidth) {
      // Character fits
      currentLine += char;
      currentWidth += charWidth;
    } else {
      // Character doesn't fit
      if (currentLine.length > 0) {
        lines.push({
          text: currentLine,
          width: currentWidth,
          startCharIndex: startIndex,
          endCharIndex: startIndex + currentLine.length
        });
        startIndex = startIndex + currentLine.length;
      }
      // Start new line with current character
      currentLine = char;
      currentWidth = charWidth;
    }
  }
  
  // Add final line
  if (currentLine.length > 0) {
    lines.push({
      text: currentLine,
      width: currentWidth,
      startCharIndex: startIndex,
      endCharIndex: startIndex + currentLine.length
    });
  }
  
  return lines.length > 0 ? lines : [{ text: '', width: 0, startCharIndex: 0, endCharIndex: 0 }];
}

/**
 * Break text into multiple lines that fit within width constraint
 * 
 * Algorithm:
 * 1. Try to break at word boundaries first (spaces) for Latin text
 * 2. If a single word is too long, break at character level
 * 3. Handle CJK text with character-level wrapping
 * 
 * @param {string} text - Text to wrap
 * @param {Object} font - pdf-lib font for measurement
 * @param {number} fontSize - Font size in points
 * @param {number} maxWidth - Maximum line width in points
 * @returns {WrappedLine[]} Array of lines
 */
export function wrapText(text, font, fontSize, maxWidth) {
  // Handle edge cases
  if (!text) {
    return [{ text: '', width: 0, startCharIndex: 0, endCharIndex: 0 }];
  }
  
  if (maxWidth <= 0) {
    console.warn('wrapText: maxWidth must be positive');
    return [{ text: '', width: 0, startCharIndex: 0, endCharIndex: 0 }];
  }
  
  // Measure full text
  const measurement = measureText(text, font, fontSize);
  
  // If it fits, return as single line
  if (measurement.width <= maxWidth) {
    return [{
      text,
      width: measurement.width,
      startCharIndex: 0,
      endCharIndex: text.length
    }];
  }
  
  // Need to wrap - analyze text type
  const hasWordBoundaries = /\s/.test(text);
  const isCJK = containsCJK(text);
  
  if (hasWordBoundaries && !isCJK) {
    // Word-based wrapping for Latin text
    return wrapByWords(text, font, fontSize, maxWidth);
  } else {
    // Character-based wrapping for CJK or text without spaces
    return wrapByCharacters(text, font, fontSize, maxWidth, measurement.charWidths);
  }
}

// ============================================================================
// Font Scaling
// ============================================================================

/**
 * Calculate scaled font size to fit text within width
 * 
 * @param {string} text - Text to fit
 * @param {Object} font - pdf-lib font for measurement
 * @param {number} originalFontSize - Original font size in points
 * @param {number} targetWidth - Target width to fit within
 * @param {number} [minFontSize=6] - Minimum allowed font size
 * @returns {{fontSize: number, fits: boolean}} Scaled size and fit status
 */
export function calculateScaledFontSize(text, font, originalFontSize, targetWidth, minFontSize = 6) {
  if (!text || targetWidth <= 0) {
    return { fontSize: originalFontSize, fits: true };
  }
  
  let originalWidth;
  try {
    originalWidth = font.widthOfTextAtSize(text, originalFontSize);
  } catch (err) {
    originalWidth = text.length * originalFontSize * 0.6;
  }
  
  // Already fits
  if (originalWidth <= targetWidth) {
    return { fontSize: originalFontSize, fits: true };
  }
  
  // Calculate required scaling factor
  const scaleFactor = targetWidth / originalWidth;
  const scaledSize = Math.floor(originalFontSize * scaleFactor);
  
  if (scaledSize >= minFontSize) {
    return { fontSize: scaledSize, fits: true };
  }
  
  // Can't scale small enough - return minimum
  return { fontSize: minFontSize, fits: false };
}

// ============================================================================
// Text Truncation
// ============================================================================

/**
 * Truncate text to fit within width, adding ellipsis
 * 
 * @param {string} text - Text to truncate
 * @param {Object} font - pdf-lib font object
 * @param {number} fontSize - Font size
 * @param {number} maxWidth - Maximum width
 * @returns {{text: string, width: number, endIndex: number}} Truncated result
 */
function truncateToFit(text, font, fontSize, maxWidth) {
  const ellipsis = '…';
  let ellipsisWidth;
  
  try {
    ellipsisWidth = font.widthOfTextAtSize(ellipsis, fontSize);
  } catch (err) {
    ellipsisWidth = fontSize * 0.6;
  }
  
  const targetWidth = maxWidth - ellipsisWidth;
  
  if (targetWidth <= 0) {
    return { text: ellipsis, width: ellipsisWidth, endIndex: 0 };
  }
  
  const chars = [...text];
  let currentWidth = 0;
  let truncatedText = '';
  
  for (let i = 0; i < chars.length; i++) {
    let charWidth;
    try {
      charWidth = font.widthOfTextAtSize(chars[i], fontSize);
    } catch (err) {
      charWidth = fontSize * (containsCJK(chars[i]) ? 1.0 : 0.6);
    }
    
    if (currentWidth + charWidth > targetWidth) {
      return {
        text: truncatedText + ellipsis,
        width: currentWidth + ellipsisWidth,
        endIndex: i
      };
    }
    truncatedText += chars[i];
    currentWidth += charWidth;
  }
  
  // Text fits without truncation
  return { text, width: currentWidth, endIndex: text.length };
}

// ============================================================================
// Main Layout Function
// ============================================================================

/**
 * Layout text with overflow handling
 * 
 * Main entry point for the layout engine. Determines the best strategy
 * to render text within constraints.
 * 
 * @param {string} text - Text to layout
 * @param {Object} font - pdf-lib font object
 * @param {number} fontSize - Original font size in points
 * @param {LayoutConstraints} constraints - Page constraints
 * @param {TextLayoutOptions} [options={}] - Layout options
 * @returns {TextLayoutResult} Layout result with rendering instructions
 */
export function layoutText(text, font, fontSize, constraints, options = {}) {
  const {
    overflowStrategy = 'wrap',
    lineHeight = 1.2,
    minFontSize = 6
  } = options;
  
  try {
    // Handle empty text
    if (!text) {
      return {
        strategy: 'normal',
        lines: [{ text: '', width: 0, startCharIndex: 0, endCharIndex: 0 }],
        fontSize,
        totalHeight: 0,
        overflow: false
      };
    }
    
    // Calculate available width from constraints
    // For layoutText, we use the full maxWidth from constraints
    const availableWidth = constraints.maxWidth || 
      (constraints.pageWidth - (constraints.leftMargin || 0) - (constraints.rightMargin || 0));
    
    if (availableWidth <= 0) {
      console.warn('layoutText: No available width');
      return {
        strategy: 'normal',
        lines: [{ text, width: 0, startCharIndex: 0, endCharIndex: text.length }],
        fontSize,
        totalHeight: fontSize * lineHeight,
        overflow: true
      };
    }
    
    // Measure text
    const measurement = measureText(text, font, fontSize);
    
    // Check if it fits
    if (measurement.width <= availableWidth) {
      return {
        strategy: 'normal',
        lines: [{
          text,
          width: measurement.width,
          startCharIndex: 0,
          endCharIndex: text.length
        }],
        fontSize,
        totalHeight: measurement.height,
        overflow: false
      };
    }
    
    // Text overflows - apply strategy
    switch (overflowStrategy) {
      case 'scale': {
        const scaled = calculateScaledFontSize(text, font, fontSize, availableWidth, minFontSize);
        if (scaled.fits) {
          const scaledMeasurement = measureText(text, font, scaled.fontSize);
          return {
            strategy: 'scaled',
            lines: [{
              text,
              width: scaledMeasurement.width,
              startCharIndex: 0,
              endCharIndex: text.length
            }],
            fontSize: scaled.fontSize,
            totalHeight: scaledMeasurement.height,
            overflow: true
          };
        }
        // Fall through to wrap if scaling doesn't work
      }
      // eslint-disable-next-line no-fallthrough
      
      case 'wrap':
      default: {
        const wrappedLines = wrapText(text, font, fontSize, availableWidth);
        let lineHeightPx;
        try {
          lineHeightPx = (typeof font.heightAtSize === 'function' 
            ? font.heightAtSize(fontSize) 
            : fontSize * 1.2) * lineHeight;
        } catch (err) {
          lineHeightPx = fontSize * lineHeight;
        }
        
        return {
          strategy: 'wrapped',
          lines: wrappedLines,
          fontSize,
          totalHeight: wrappedLines.length * lineHeightPx,
          overflow: true
        };
      }
      
      case 'truncate': {
        const truncated = truncateToFit(text, font, fontSize, availableWidth);
        return {
          strategy: 'truncated',
          lines: [{
            text: truncated.text,
            width: truncated.width,
            startCharIndex: 0,
            endCharIndex: truncated.endIndex
          }],
          fontSize,
          totalHeight: measurement.height,
          overflow: true
        };
      }
    }
  } catch (err) {
    console.error('layoutText: Layout failed, returning single-line fallback', err);
    // Return a safe fallback that at least renders something
    return {
      strategy: 'normal',
      lines: [{ text, width: 0, startCharIndex: 0, endCharIndex: text.length }],
      fontSize,
      totalHeight: fontSize * 1.2,
      overflow: true
    };
  }
}

// ============================================================================
// Convenience Function for usePdfGenerator Integration
// ============================================================================

/**
 * Layout text at a specific X position with overflow handling
 * This is a convenience wrapper for integration with usePdfGenerator.js
 * 
 * @param {string} text - Text to layout
 * @param {Object} font - pdf-lib font object
 * @param {number} fontSize - Font size in points
 * @param {number} x - X position where text will be placed
 * @param {LayoutConstraints} constraints - Page constraints
 * @param {TextLayoutOptions} [options={}] - Layout options
 * @returns {TextLayoutResult} Layout result
 */
export function layoutTextAtPosition(text, font, fontSize, x, constraints, options = {}) {
  // Calculate available width from X position to right margin
  const availableWidth = calculateAvailableWidth(x, constraints);
  
  // Create adjusted constraints with calculated max width
  const adjustedConstraints = {
    ...constraints,
    maxWidth: availableWidth
  };
  
  return layoutText(text, font, fontSize, adjustedConstraints, options);
}

// ============================================================================
// Module Exports
// ============================================================================

const textLayoutEngine = {
  measureText,
  calculateAvailableWidth,
  textFits,
  wrapText,
  calculateScaledFontSize,
  layoutText,
  layoutTextAtPosition,
  containsCJK
};

export default textLayoutEngine;