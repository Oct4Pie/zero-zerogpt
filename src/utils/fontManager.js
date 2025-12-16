/**
 * Font Manager Utility
 *
 * This module provides font management utilities for PDF font preservation,
 * including standard font detection, fallback mapping, font style detection,
 * and custom font integration for wider Unicode support.
 *
 * @module fontManager
 */

import { createFontInfo } from './pdfTypes';
import {
  loadCustomFont,
  supportsUnicode as fontLoaderSupportsUnicode,
  areFontsLoaded,
  preloadFonts as preloadCustomFonts
} from './fontLoader';

// ============================================================================
// Standard PDF Fonts
// ============================================================================

/**
 * Standard PDF fonts that are available in all PDF viewers
 * These fonts can be referenced by name without embedding
 * @readonly
 */
export const STANDARD_PDF_FONTS = Object.freeze({
  // Helvetica family (sans-serif)
  'Helvetica': 'Helvetica',
  'Helvetica-Bold': 'Helvetica-Bold',
  'Helvetica-Oblique': 'Helvetica-Oblique',
  'Helvetica-BoldOblique': 'Helvetica-BoldOblique',
  
  // Times family (serif)
  'Times-Roman': 'Times-Roman',
  'Times-Bold': 'Times-Bold',
  'Times-Italic': 'Times-Italic',
  'Times-BoldItalic': 'Times-BoldItalic',
  
  // Courier family (monospace)
  'Courier': 'Courier',
  'Courier-Bold': 'Courier-Bold',
  'Courier-Oblique': 'Courier-Oblique',
  'Courier-BoldOblique': 'Courier-BoldOblique',
  
  // Symbol and decorative
  'Symbol': 'Symbol',
  'ZapfDingbats': 'ZapfDingbats'
});

/**
 * List of all standard PDF font names
 * @type {string[]}
 */
export const STANDARD_FONT_NAMES = Object.freeze(Object.keys(STANDARD_PDF_FONTS));

// ============================================================================
// Font Family Detection Patterns
// ============================================================================

/**
 * Regex patterns for detecting font families from font names
 * @readonly
 */
const FONT_FAMILY_PATTERNS = Object.freeze({
  // Sans-serif families
  helvetica: /helvetica|arial|sans[-\s]?serif|swiss|nimbus\s*sans/i,
  arial: /arial|arimo/i,
  verdana: /verdana/i,
  tahoma: /tahoma/i,
  trebuchet: /trebuchet/i,
  calibri: /calibri/i,
  segoe: /segoe/i,
  roboto: /roboto/i,
  opensans: /open\s*sans/i,
  lato: /lato/i,
  
  // Serif families
  times: /times|times\s*new\s*roman|serif|roman|nimbus\s*roman/i,
  georgia: /georgia/i,
  palatino: /palatino/i,
  garamond: /garamond/i,
  cambria: /cambria/i,
  bookman: /bookman/i,
  
  // Monospace families
  courier: /courier|mono|consolas|menlo|monaco|source\s*code|fira\s*code/i,
  
  // CJK families
  cjk: /simsun|simhei|mingliu|heiti|songti|kaiti|fangsong|ms\s*(mincho|gothic)|noto\s*(sans|serif)\s*(cjk|sc|tc|jp|kr)/i
});

/**
 * Regex patterns for detecting font styles from font names
 * @readonly
 */
const FONT_STYLE_PATTERNS = Object.freeze({
  bold: /bold|black|heavy|semibold|demibold|extrabold|ultrabold|\bbd\b|\bw[5-9]\b|\bw[1-9][0-9]+\b/i,
  italic: /italic|oblique|slanted|inclined|\bit\b|\bital\b/i
});

// ============================================================================
// Font Fallback Mapping
// ============================================================================

/**
 * Mapping from detected font families to appropriate fallback fonts
 * @readonly
 */
const FONT_FALLBACK_MAP = Object.freeze({
  // Sans-serif fallbacks to Helvetica
  helvetica: 'Helvetica',
  arial: 'Helvetica',
  verdana: 'Helvetica',
  tahoma: 'Helvetica',
  trebuchet: 'Helvetica',
  calibri: 'Helvetica',
  segoe: 'Helvetica',
  roboto: 'Helvetica',
  opensans: 'Helvetica',
  lato: 'Helvetica',
  
  // Serif fallbacks to Times-Roman
  times: 'Times-Roman',
  georgia: 'Times-Roman',
  palatino: 'Times-Roman',
  garamond: 'Times-Roman',
  cambria: 'Times-Roman',
  bookman: 'Times-Roman',
  
  // Monospace fallbacks to Courier
  courier: 'Courier',
  
  // CJK fonts - fallback to Helvetica (requires embedded font for proper rendering)
  cjk: 'Helvetica'
});

/**
 * Default fallback font when no match is found
 * @type {string}
 */
export const DEFAULT_FALLBACK_FONT = 'Helvetica';

/**
 * Custom fonts that support wider Unicode character sets
 * These fonts can be loaded from CDN and embedded in PDFs
 * @readonly
 */
export const CUSTOM_FONTS = Object.freeze({
  'NotoSans': {
    regular: 'NotoSans-Regular.ttf',
    bold: 'NotoSans-Bold.ttf',
    italic: 'NotoSans-Italic.ttf',
    boldItalic: 'NotoSans-BoldItalic.ttf'
  }
});

/**
 * Preferred custom font for Unicode support
 * @type {string}
 */
export const PREFERRED_UNICODE_FONT = 'NotoSans';

// ============================================================================
// Font Manager Class
// ============================================================================

/**
 * FontManager class for handling font-related operations
 */
class FontManager {
  /**
   * Creates a new FontManager instance
   */
  constructor() {
    /**
     * Cache for font info lookups
     * @type {Map<string, FontInfo>}
     */
    this.fontInfoCache = new Map();
  }

  /**
   * Check if a font name refers to a standard PDF font
   * @param {string} fontName - Font name to check
   * @returns {boolean} True if the font is a standard PDF font
   */
  isStandardFont(fontName) {
    if (!fontName || typeof fontName !== 'string') {
      return false;
    }
    
    // Direct match
    if (STANDARD_PDF_FONTS[fontName]) {
      return true;
    }
    
    // Normalized match (case-insensitive, remove spaces/hyphens)
    const normalized = fontName.replace(/[-\s]/g, '').toLowerCase();
    return STANDARD_FONT_NAMES.some(
      stdFont => stdFont.replace(/[-\s]/g, '').toLowerCase() === normalized
    );
  }

  /**
   * Detect the font family from a font name
   * @param {string} fontName - Font name to analyze
   * @returns {string|null} Detected family key or null
   */
  detectFontFamily(fontName) {
    if (!fontName || typeof fontName !== 'string') {
      return null;
    }
    
    for (const [family, pattern] of Object.entries(FONT_FAMILY_PATTERNS)) {
      if (pattern.test(fontName)) {
        return family;
      }
    }
    
    return null;
  }

  /**
   * Detect font style (normal, bold, italic, bolditalic) from font name
   * @param {string} fontName - Font name to analyze
   * @returns {'normal'|'bold'|'italic'|'bolditalic'} Detected font style
   */
  mapFontStyle(fontName) {
    if (!fontName || typeof fontName !== 'string') {
      return 'normal';
    }
    
    const isBold = FONT_STYLE_PATTERNS.bold.test(fontName);
    const isItalic = FONT_STYLE_PATTERNS.italic.test(fontName);
    
    if (isBold && isItalic) {
      return 'bolditalic';
    } else if (isBold) {
      return 'bold';
    } else if (isItalic) {
      return 'italic';
    }
    
    return 'normal';
  }

  /**
   * Get the appropriate fallback font for a given font name
   * @param {string} fontName - Original font name
   * @returns {string} Fallback font name (a standard PDF font)
   */
  getFallbackFont(fontName) {
    if (!fontName || typeof fontName !== 'string') {
      return DEFAULT_FALLBACK_FONT;
    }
    
    // If it's already a standard font, return appropriate variant
    if (this.isStandardFont(fontName)) {
      return STANDARD_PDF_FONTS[fontName] || fontName;
    }
    
    // Detect font family
    const family = this.detectFontFamily(fontName);
    if (!family) {
      return DEFAULT_FALLBACK_FONT;
    }
    
    // Get base fallback
    const baseFallback = FONT_FALLBACK_MAP[family] || DEFAULT_FALLBACK_FONT;
    
    // Apply style to fallback
    const style = this.mapFontStyle(fontName);
    return this.getStyledFontName(baseFallback, style);
  }

  /**
   * Get the styled variant of a standard font
   * @param {string} baseFontName - Base font name (e.g., 'Helvetica', 'Times-Roman', 'Courier')
   * @param {'normal'|'bold'|'italic'|'bolditalic'} style - Desired style
   * @returns {string} Styled font name
   */
  getStyledFontName(baseFontName, style) {
    // Normalize base font name
    let baseFont = baseFontName;
    if (baseFontName.includes('-')) {
      baseFont = baseFontName.split('-')[0];
    }
    
    // Handle different font families
    switch (baseFont.toLowerCase()) {
      case 'helvetica':
        switch (style) {
          case 'bold': return 'Helvetica-Bold';
          case 'italic': return 'Helvetica-Oblique';
          case 'bolditalic': return 'Helvetica-BoldOblique';
          default: return 'Helvetica';
        }
        
      case 'times':
        switch (style) {
          case 'bold': return 'Times-Bold';
          case 'italic': return 'Times-Italic';
          case 'bolditalic': return 'Times-BoldItalic';
          default: return 'Times-Roman';
        }
        
      case 'courier':
        switch (style) {
          case 'bold': return 'Courier-Bold';
          case 'italic': return 'Courier-Oblique';
          case 'bolditalic': return 'Courier-BoldOblique';
          default: return 'Courier';
        }
        
      default:
        return baseFontName;
    }
  }

  /**
   * Create a FontInfo object from a font name
   * @param {string} fontName - Font name to analyze
   * @param {string} [fontId=''] - Optional font ID
   * @returns {import('./pdfTypes').FontInfo} FontInfo object
   */
  createFontInfoFromName(fontName, fontId = '') {
    // Check cache first
    const cacheKey = `${fontId || fontName}`;
    if (this.fontInfoCache.has(cacheKey)) {
      return this.fontInfoCache.get(cacheKey);
    }
    
    const fontInfo = createFontInfo(fontName);
    fontInfo.id = fontId;
    fontInfo.style = this.mapFontStyle(fontName);
    fontInfo.isEmbedded = false; // Will be determined during extraction
    fontInfo.fallbackFont = this.getFallbackFont(fontName);
    
    // Cache the result
    this.fontInfoCache.set(cacheKey, fontInfo);
    
    return fontInfo;
  }

  /**
   * Parse a PDF internal font name (e.g., 'g_d0_f1') and create FontInfo
   * @param {string} internalFontName - PDF internal font reference
   * @param {string} [displayName=''] - Optional human-readable font name
   * @returns {import('./pdfTypes').FontInfo} FontInfo object
   */
  parsePdfFontReference(internalFontName, displayName = '') {
    const fontInfo = createFontInfo(displayName || 'Unknown');
    fontInfo.id = internalFontName;
    
    // If we have a display name, use it for style detection
    if (displayName) {
      fontInfo.style = this.mapFontStyle(displayName);
      fontInfo.fallbackFont = this.getFallbackFont(displayName);
      
      // Detect if it's a standard font
      if (this.isStandardFont(displayName)) {
        fontInfo.isEmbedded = false;
        fontInfo.name = displayName;
      }
    } else {
      // No display name, use defaults
      fontInfo.style = 'normal';
      fontInfo.fallbackFont = DEFAULT_FALLBACK_FONT;
    }
    
    return fontInfo;
  }

  /**
   * Get standard font variant for pdf-lib
   * @param {'normal'|'bold'|'italic'|'bolditalic'} style - Font style
   * @param {'helvetica'|'times'|'courier'} family - Font family
   * @returns {string} pdf-lib StandardFonts enum key
   */
  getStandardFontKey(style, family = 'helvetica') {
    const familyMap = {
      helvetica: {
        normal: 'Helvetica',
        bold: 'HelveticaBold',
        italic: 'HelveticaOblique',
        bolditalic: 'HelveticaBoldOblique'
      },
      times: {
        normal: 'TimesRoman',
        bold: 'TimesBold',
        italic: 'TimesItalic',
        bolditalic: 'TimesBoldItalic'
      },
      courier: {
        normal: 'Courier',
        bold: 'CourierBold',
        italic: 'CourierOblique',
        bolditalic: 'CourierBoldOblique'
      }
    };
    
    const familyStyles = familyMap[family.toLowerCase()] || familyMap.helvetica;
    return familyStyles[style] || familyStyles.normal;
  }

  /**
   * Clear the font info cache
   */
  clearCache() {
    this.fontInfoCache.clear();
  }

  // ==========================================================================
  // Custom Font Integration Methods
  // ==========================================================================

  /**
   * Get embeddable font bytes for a custom font
   * Uses fontLoader to fetch font from CDN or local cache.
   * Prefer this for Unicode-capable fonts like Noto Sans.
   *
   * @param {string} [fontFamily='NotoSans'] - Font family name
   * @param {'normal'|'bold'|'italic'|'bolditalic'} [style='normal'] - Font style
   * @returns {Promise<Uint8Array|null>} Font bytes or null if unavailable
   *
   * @example
   * const bytes = await fontManager.getEmbeddableFont('NotoSans', 'bold');
   * if (bytes) {
   *   const font = await pdfDoc.embedFont(bytes, { subset: true });
   * }
   */
  async getEmbeddableFont(fontFamily = 'NotoSans', style = 'normal') {
    // Map style to fontLoader weight format
    const weightMap = {
      'normal': 'regular',
      'bold': 'bold',
      'italic': 'italic',
      'bolditalic': 'boldItalic'
    };
    
    const weight = weightMap[style] || 'regular';
    
    try {
      const fontBytes = await loadCustomFont(fontFamily, weight);
      return fontBytes;
    } catch (err) {
      console.warn(`Failed to get embeddable font ${fontFamily}-${style}:`, err.message);
      return null;
    }
  }

  /**
   * Get custom font bytes for embedding using a FontInfo object
   * Automatically maps FontInfo style to the correct font weight.
   *
   * @param {import('./pdfTypes').FontInfo} fontInfo - FontInfo object with style info
   * @returns {Promise<Uint8Array|null>} Font bytes or null if unavailable
   */
  async getEmbeddableFontFromInfo(fontInfo) {
    const style = fontInfo?.style || 'normal';
    return this.getEmbeddableFont(PREFERRED_UNICODE_FONT, style);
  }

  /**
   * Check if a font family supports wider Unicode characters
   * Standard PDF fonts (Helvetica, Times, Courier) only support WinAnsi.
   * Custom fonts like Noto Sans support full Unicode including special spaces.
   *
   * @param {string} fontName - Font family name
   * @returns {boolean} True if the font supports wider Unicode
   */
  supportsUnicode(fontName) {
    // Check custom fonts first
    if (CUSTOM_FONTS[fontName]) {
      return fontLoaderSupportsUnicode(fontName);
    }
    
    // Standard PDF fonts don't support full Unicode
    if (this.isStandardFont(fontName)) {
      return false;
    }
    
    // Unknown fonts - assume limited Unicode support
    return false;
  }

  /**
   * Check if custom fonts are available (loaded in cache)
   * @returns {boolean} True if custom fonts are ready
   */
  hasCustomFontsAvailable() {
    return areFontsLoaded();
  }

  /**
   * Check if a specific custom font is available
   * @param {string} fontFamily - Font family name
   * @returns {boolean} True if the font family is registered
   */
  hasCustomFont(fontFamily) {
    return CUSTOM_FONTS.hasOwnProperty(fontFamily);
  }

  /**
   * Preload custom fonts for faster PDF generation
   * Call this during app initialization for better UX.
   * @returns {Promise<void>}
   */
  async preloadCustomFonts() {
    return preloadCustomFonts();
  }

  /**
   * Get the preferred font for Unicode text
   * Returns custom font name if available, otherwise fallback to standard.
   *
   * @param {string} [desiredFamily] - Desired font family
   * @returns {string} Font name to use for Unicode text
   */
  getPreferredUnicodeFont(desiredFamily) {
    // If a specific family is requested and it supports Unicode, use it
    if (desiredFamily && this.supportsUnicode(desiredFamily)) {
      return desiredFamily;
    }
    
    // Default to Noto Sans for Unicode support
    return PREFERRED_UNICODE_FONT;
  }

  /**
   * Determine the best font to use for a text item
   * Prefers custom Unicode fonts when available, falls back to standard fonts.
   *
   * @param {import('./pdfTypes').FontInfo} fontInfo - Font info from extracted PDF
   * @param {boolean} hasCustomFontsLoaded - Whether custom fonts are available
   * @returns {Object} Font selection result
   * @returns {string} result.fontFamily - Selected font family name
   * @returns {boolean} result.useCustomFont - Whether to use custom font embedding
   * @returns {string} result.fallbackStandardFont - Standard font for fallback
   */
  selectBestFont(fontInfo, hasCustomFontsLoaded = false) {
    const style = fontInfo?.style || 'normal';
    const fallbackStandardFont = this.getStyledFontName(
      fontInfo?.fallbackFont || DEFAULT_FALLBACK_FONT,
      style
    );
    
    if (hasCustomFontsLoaded) {
      return {
        fontFamily: PREFERRED_UNICODE_FONT,
        useCustomFont: true,
        fallbackStandardFont
      };
    }
    
    return {
      fontFamily: fallbackStandardFont,
      useCustomFont: false,
      fallbackStandardFont
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Singleton FontManager instance
 * @type {FontManager}
 */
const fontManager = new FontManager();

// Export singleton methods as module functions for convenience
export const isStandardFont = (fontName) => fontManager.isStandardFont(fontName);
export const getFallbackFont = (fontName) => fontManager.getFallbackFont(fontName);
export const mapFontStyle = (fontName) => fontManager.mapFontStyle(fontName);
export const detectFontFamily = (fontName) => fontManager.detectFontFamily(fontName);
export const getStyledFontName = (baseFontName, style) => fontManager.getStyledFontName(baseFontName, style);
export const createFontInfoFromName = (fontName, fontId) => fontManager.createFontInfoFromName(fontName, fontId);
export const parsePdfFontReference = (internalFontName, displayName) => fontManager.parsePdfFontReference(internalFontName, displayName);
export const getStandardFontKey = (style, family) => fontManager.getStandardFontKey(style, family);
export const clearFontCache = () => fontManager.clearCache();

// New exports for custom font support
export const getEmbeddableFont = (fontFamily, style) => fontManager.getEmbeddableFont(fontFamily, style);
export const supportsUnicode = (fontName) => fontManager.supportsUnicode(fontName);
export const hasCustomFont = (fontFamily) => fontManager.hasCustomFont(fontFamily);
export const hasCustomFontsAvailable = () => fontManager.hasCustomFontsAvailable();
export const preloadFonts = () => fontManager.preloadCustomFonts();
export const getPreferredUnicodeFont = (desiredFamily) => fontManager.getPreferredUnicodeFont(desiredFamily);
export const selectBestFont = (fontInfo, hasCustomFontsLoaded) => fontManager.selectBestFont(fontInfo, hasCustomFontsLoaded);

// Export the class for advanced use cases
export { FontManager };

// Default export is the singleton instance
export default fontManager;