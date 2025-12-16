/**
 * Color Extraction Utility for PDF Text
 * 
 * This module provides reliable color extraction from PDF pages using the
 * PDF.js getOperatorList() API. This approach is more accurate than the
 * styles.fillColor method which is often undefined.
 * 
 * @module colorExtractor
 */

import * as pdfjsLib from 'pdfjs-dist';
import { createColorInfo } from './pdfTypes';

/**
 * PDF.js OPS constants for color and text operations
 * These are used to parse the operator list returned by getOperatorList()
 */
const OPS = pdfjsLib.OPS || {
  // Color operations
  setFillRGBColor: 110,      // rg command - RGB color
  setFillGray: 109,          // g command - Grayscale
  setFillCMYKColor: 111,     // k command - CMYK color
  setFillColorSpace: 112,    // cs command
  setFillColor: 113,         // sc/scn command
  
  // Text operations
  setTextMatrix: 43,         // Tm command - text positioning
  showText: 45,              // Tj command - show text
  showSpacedText: 46,        // TJ command - show text with spacing
  beginText: 42,             // BT command
  endText: 44,               // ET command
  moveText: 41,              // Td/TD command
  setFont: 40,               // Tf command
  
  // Transform operations
  transform: 12,             // cm command
  save: 10,                  // q command
  restore: 11,               // Q command
};

/**
 * @typedef {Object} ColorMapping
 * @description Maps a text position to its fill color
 * @property {string} positionKey - Position key in format "x_y"
 * @property {import('./pdfTypes').ColorInfo} color - RGB color information
 * @property {number} operatorIndex - Index in operator list where color was set
 */

/**
 * @typedef {Object} TextColorResult
 * @description Result of color extraction for a page
 * @property {Map<string, import('./pdfTypes').ColorInfo>} colorMap - Map of position keys to colors
 * @property {import('./pdfTypes').ColorInfo} defaultColor - Default color if no color found
 * @property {boolean} hasColorData - Whether any color data was extracted
 * @property {number} colorChanges - Number of color changes detected
 */

/**
 * Convert CMYK color values to RGB
 * CMYK uses 0-1 range, output RGB also uses 0-1 range
 * 
 * @param {number} c - Cyan component (0-1)
 * @param {number} m - Magenta component (0-1)
 * @param {number} y - Yellow component (0-1)
 * @param {number} k - Black (key) component (0-1)
 * @returns {import('./pdfTypes').ColorInfo} RGB color
 */
export function cmykToRgb(c, m, y, k) {
  // Standard CMYK to RGB conversion
  // RGB = (1 - C) * (1 - K), etc.
  const r = (1 - c) * (1 - k);
  const g = (1 - m) * (1 - k);
  const b = (1 - y) * (1 - k);
  
  return createColorInfo(
    Math.max(0, Math.min(1, r)),
    Math.max(0, Math.min(1, g)),
    Math.max(0, Math.min(1, b))
  );
}

/**
 * Convert grayscale value to RGB
 * Gray uses 0-1 range (0 = black, 1 = white)
 * 
 * @param {number} gray - Grayscale value (0-1)
 * @returns {import('./pdfTypes').ColorInfo} RGB color
 */
export function grayToRgb(gray) {
  const value = Math.max(0, Math.min(1, gray));
  return createColorInfo(value, value, value);
}

/**
 * Create a position key from X and Y coordinates
 * Used for matching colors to text items by position
 * 
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {string} Position key
 */
export function createPositionKey(x, y) {
  return `${Math.round(x)}_${Math.round(y)}`;
}

/**
 * Extract text colors from a PDF page using the operator list
 * This is the main extraction function that parses PDF rendering commands.
 * 
 * @param {Object} page - PDF.js page object (from pdf.getPage())
 * @returns {Promise<TextColorResult>} Color extraction result with position-to-color mapping
 */
export async function extractTextColors(page) {
  // Default result
  const result = {
    colorMap: new Map(),
    defaultColor: createColorInfo(0, 0, 0), // Default black
    hasColorData: false,
    colorChanges: 0
  };
  
  try {
    // Get the operator list - this contains all rendering commands
    const operatorList = await page.getOperatorList();
    
    if (!operatorList || !operatorList.fnArray || !operatorList.argsArray) {
      console.warn('colorExtractor: Invalid operator list received');
      return result;
    }
    
    // Track current graphics state
    let currentColor = createColorInfo(0, 0, 0); // Start with black
    let currentTextMatrix = [1, 0, 0, 1, 0, 0]; // Identity matrix
    let inTextBlock = false;
    
    // Graphics state stack for save/restore operations
    const graphicsStateStack = [];
    
    const fnArray = operatorList.fnArray;
    const argsArray = operatorList.argsArray;
    
    // Process each operator
    for (let i = 0; i < fnArray.length; i++) {
      const fn = fnArray[i];
      const args = argsArray[i];
      
      try {
        switch (fn) {
          // === Color Operations ===
          
          case OPS.setFillRGBColor:
            // rg command: Set RGB fill color
            // args: [r, g, b] - values are 0-1
            if (args && args.length >= 3) {
              currentColor = createColorInfo(
                args[0] || 0,
                args[1] || 0,
                args[2] || 0
              );
              result.colorChanges++;
              result.hasColorData = true;
            }
            break;
            
          case OPS.setFillGray:
            // g command: Set grayscale fill color
            // args: [gray] - value is 0-1 (0=black, 1=white)
            if (args && args.length >= 1) {
              currentColor = grayToRgb(args[0] || 0);
              result.colorChanges++;
              result.hasColorData = true;
            }
            break;
            
          case OPS.setFillCMYKColor:
            // k command: Set CMYK fill color
            // args: [c, m, y, k] - values are 0-1
            if (args && args.length >= 4) {
              currentColor = cmykToRgb(
                args[0] || 0,
                args[1] || 0,
                args[2] || 0,
                args[3] || 0
              );
              result.colorChanges++;
              result.hasColorData = true;
            }
            break;
            
          case OPS.setFillColorSpace:
          case OPS.setFillColor:
            // Handle generic color space commands
            // These may have varying formats depending on color space
            if (args && args.length >= 3) {
              // Assume RGB if 3+ arguments
              currentColor = createColorInfo(
                args[0] || 0,
                args[1] || 0,
                args[2] || 0
              );
              result.colorChanges++;
              result.hasColorData = true;
            } else if (args && args.length === 1) {
              // Single value - treat as grayscale
              currentColor = grayToRgb(args[0] || 0);
              result.colorChanges++;
              result.hasColorData = true;
            }
            break;
            
          // === Text Operations ===
          
          case OPS.beginText:
            // BT command: Begin text block
            inTextBlock = true;
            break;
            
          case OPS.endText:
            // ET command: End text block
            inTextBlock = false;
            break;
            
          case OPS.setTextMatrix:
            // Tm command: Set text matrix
            // args: [a, b, c, d, e, f] - transformation matrix
            // e, f are the x, y translation components
            if (args && args.length >= 6) {
              currentTextMatrix = [...args];
            }
            break;
            
          case OPS.moveText:
            // Td/TD command: Move text position
            // args: [tx, ty] - translation offset
            if (args && args.length >= 2) {
              // Update translation components of text matrix
              currentTextMatrix[4] += args[0] || 0;
              currentTextMatrix[5] += args[1] || 0;
            }
            break;
            
          case OPS.showText:
          case OPS.showSpacedText:
            // Tj/TJ commands: Draw text
            // Store the current color for this text position
            if (inTextBlock || currentTextMatrix[4] !== 0 || currentTextMatrix[5] !== 0) {
              const posKey = createPositionKey(currentTextMatrix[4], currentTextMatrix[5]);
              result.colorMap.set(posKey, { ...currentColor });
            }
            break;
            
          // === Graphics State Operations ===
          
          case OPS.save:
            // q command: Save graphics state
            graphicsStateStack.push({
              color: { ...currentColor },
              textMatrix: [...currentTextMatrix]
            });
            break;
            
          case OPS.restore:
            // Q command: Restore graphics state
            if (graphicsStateStack.length > 0) {
              const savedState = graphicsStateStack.pop();
              currentColor = savedState.color;
              currentTextMatrix = savedState.textMatrix;
            }
            break;
            
          default:
            // Other operators - no action needed
            break;
        }
      } catch (opErr) {
        // Log but continue processing
        console.warn(`colorExtractor: Error processing operator ${fn}:`, opErr.message);
      }
    }
    
    return result;
    
  } catch (err) {
    console.warn('colorExtractor: Failed to extract colors from page:', err.message);
    return result;
  }
}

/**
 * Match a text item to its extracted color based on position
 * Uses fuzzy matching to find colors near the text position.
 * 
 * @param {Object} textItem - Text item with x and y properties
 * @param {Map<string, import('./pdfTypes').ColorInfo>} colorMap - Map of position keys to colors
 * @param {import('./pdfTypes').ColorInfo} [defaultColor] - Default color if no match found
 * @returns {import('./pdfTypes').ColorInfo} The matched color or default
 */
export function matchColorToTextItem(textItem, colorMap, defaultColor = null) {
  const fallback = defaultColor || createColorInfo(0, 0, 0);
  
  if (!textItem || typeof textItem.x !== 'number' || typeof textItem.y !== 'number') {
    return fallback;
  }
  
  if (!colorMap || colorMap.size === 0) {
    return fallback;
  }
  
  const x = textItem.x;
  const y = textItem.y;
  
  // Try exact match first
  const exactKey = createPositionKey(x, y);
  if (colorMap.has(exactKey)) {
    return colorMap.get(exactKey);
  }
  
  // Try nearby positions (within 3 points tolerance)
  const tolerance = 3;
  for (let dx = -tolerance; dx <= tolerance; dx++) {
    for (let dy = -tolerance; dy <= tolerance; dy++) {
      const nearbyKey = createPositionKey(x + dx, y + dy);
      if (colorMap.has(nearbyKey)) {
        return colorMap.get(nearbyKey);
      }
    }
  }
  
  // No match found - return default
  return fallback;
}

/**
 * Extract colors for all text items on a page and merge the color data
 * This is the main integration function to be called from usePdfHandler.
 * 
 * @param {Object} page - PDF.js page object
 * @param {import('./pdfTypes').TextItem[]} textItems - Array of text items from the page
 * @returns {Promise<import('./pdfTypes').TextItem[]>} Text items with updated color information
 */
export async function extractAndMergeColors(page, textItems) {
  if (!textItems || textItems.length === 0) {
    return textItems;
  }
  
  try {
    // Extract colors from the page operator list
    const colorResult = await extractTextColors(page);
    
    if (!colorResult.hasColorData) {
      // No color data extracted - return items with default black
      console.log('colorExtractor: No color data found, using default black');
      return textItems.map(item => ({
        ...item,
        color: colorResult.defaultColor,
        colorFromOperatorList: false
      }));
    }
    
    console.log(`colorExtractor: Extracted ${colorResult.colorChanges} color changes, ${colorResult.colorMap.size} color positions`);
    
    // Merge colors with text items
    return textItems.map(item => {
      const color = matchColorToTextItem(item, colorResult.colorMap, colorResult.defaultColor);
      return {
        ...item,
        color,
        colorFromOperatorList: true
      };
    });
    
  } catch (err) {
    console.warn('colorExtractor: Failed to extract and merge colors:', err.message);
    // Return items with default black color
    return textItems.map(item => ({
      ...item,
      color: createColorInfo(0, 0, 0),
      colorFromOperatorList: false
    }));
  }
}

/**
 * Check if a color is effectively black (all components near zero)
 * Useful for determining if color extraction was meaningful.
 * 
 * @param {import('./pdfTypes').ColorInfo} color - Color to check
 * @param {number} [threshold=0.01] - Threshold for considering as black
 * @returns {boolean} True if color is effectively black
 */
export function isBlack(color, threshold = 0.01) {
  if (!color) return true;
  return (
    Math.abs(color.r) < threshold &&
    Math.abs(color.g) < threshold &&
    Math.abs(color.b) < threshold
  );
}

/**
 * Check if a color is effectively white (all components near one)
 * 
 * @param {import('./pdfTypes').ColorInfo} color - Color to check
 * @param {number} [threshold=0.01] - Threshold for considering as white
 * @returns {boolean} True if color is effectively white
 */
export function isWhite(color, threshold = 0.01) {
  if (!color) return false;
  return (
    Math.abs(color.r - 1) < threshold &&
    Math.abs(color.g - 1) < threshold &&
    Math.abs(color.b - 1) < threshold
  );
}

/**
 * Compare two colors for equality within a tolerance
 * 
 * @param {import('./pdfTypes').ColorInfo} color1 - First color
 * @param {import('./pdfTypes').ColorInfo} color2 - Second color
 * @param {number} [tolerance=0.01] - Tolerance for comparison
 * @returns {boolean} True if colors are equal within tolerance
 */
export function colorsEqual(color1, color2, tolerance = 0.01) {
  if (!color1 && !color2) return true;
  if (!color1 || !color2) return false;
  
  return (
    Math.abs(color1.r - color2.r) < tolerance &&
    Math.abs(color1.g - color2.g) < tolerance &&
    Math.abs(color1.b - color2.b) < tolerance
  );
}

/**
 * Color extractor module exports
 * @type {Object}
 */
const colorExtractor = {
  extractTextColors,
  matchColorToTextItem,
  extractAndMergeColors,
  cmykToRgb,
  grayToRgb,
  createPositionKey,
  isBlack,
  isWhite,
  colorsEqual
};

export default colorExtractor;