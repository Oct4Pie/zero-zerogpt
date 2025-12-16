/**
 * PDF Types and Data Structures
 * 
 * This module defines the data structures used for PDF font preservation
 * and layout maintenance in Zero-ZeroGPT.
 * 
 * @module pdfTypes
 */

// ============================================================================
// Text Item Types
// ============================================================================

/**
 * @typedef {Object} TextItem
 * @description Individual text item extracted from PDF with full positioning and font information
 * @property {string} text - The text string content
 * @property {number} x - X position from left edge (PDF points)
 * @property {number} y - Y position from bottom edge (PDF points)
 * @property {number} width - Text width in PDF points
 * @property {number} height - Text height in PDF points (approximate)
 * @property {number} fontSize - Font size derived from transform matrix
 * @property {string} fontName - Internal font reference ID (e.g., 'g_d0_f1')
 * @property {'normal'|'bold'|'italic'|'bolditalic'} fontStyle - Detected font style
 * @property {number} pageIndex - Zero-based page index
 * @property {number[]} transform - 6-element transformation matrix [scaleX, skewX, skewY, scaleY, translateX, translateY]
 * @property {Object} color - Text color information
 * @property {number} color.r - Red component (0-1)
 * @property {number} color.g - Green component (0-1)
 * @property {number} color.b - Blue component (0-1)
 * @property {number} charOffsetStart - Start index in concatenated text string
 * @property {number} charOffsetEnd - End index in concatenated text string (exclusive)
 */

/**
 * Creates a default TextItem object
 * @returns {TextItem}
 */
export function createTextItem() {
  return {
    text: '',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    fontSize: 12,
    fontName: '',
    fontStyle: 'normal',
    pageIndex: 0,
    transform: [1, 0, 0, 1, 0, 0],
    color: { r: 0, g: 0, b: 0 },
    charOffsetStart: 0,
    charOffsetEnd: 0
  };
}

// ============================================================================
// Page Layout Types
// ============================================================================

/**
 * @typedef {Object} PageMargins
 * @description Page margin measurements
 * @property {number} top - Top margin in PDF points
 * @property {number} right - Right margin in PDF points
 * @property {number} bottom - Bottom margin in PDF points
 * @property {number} left - Left margin in PDF points
 */

/**
 * @typedef {Object} PageLayout
 * @description Layout information for a single PDF page
 * @property {number} width - Page width in PDF points (1 point = 1/72 inch)
 * @property {number} height - Page height in PDF points
 * @property {PageMargins} margins - Page margin measurements
 * @property {number} pageIndex - Zero-based page index
 */

/**
 * Creates a default PageLayout object
 * @param {number} [pageIndex=0] - Zero-based page index
 * @returns {PageLayout}
 */
export function createPageLayout(pageIndex = 0) {
  return {
    width: 595.28,  // A4 width in points
    height: 841.89, // A4 height in points
    margins: {
      top: 72,      // 1 inch default margins
      right: 72,
      bottom: 72,
      left: 72
    },
    pageIndex
  };
}

// ============================================================================
// Font Information Types
// ============================================================================

/**
 * @typedef {Object} FontInfo
 * @description Font information extracted from PDF
 * @property {string} name - Font family name (e.g., 'Helvetica', 'Times-Roman')
 * @property {'normal'|'bold'|'italic'|'bolditalic'} style - Detected font style
 * @property {boolean} isEmbedded - Whether the font is embedded in the PDF
 * @property {string} fallbackFont - Fallback font to use when original is unavailable
 * @property {string} [id] - Internal font ID (e.g., 'g_d0_f1')
 * @property {string|null} [embeddedData] - Base64-encoded embedded font data if extractable
 */

/**
 * Creates a default FontInfo object
 * @param {string} [name='Helvetica'] - Font family name
 * @returns {FontInfo}
 */
export function createFontInfo(name = 'Helvetica') {
  return {
    name,
    style: 'normal',
    isEmbedded: false,
    fallbackFont: 'Helvetica',
    id: '',
    embeddedData: null
  };
}

// ============================================================================
// Document Metadata Types
// ============================================================================

/**
 * @typedef {Object} DocumentMetadata
 * @description PDF document metadata
 * @property {string|null} title - Document title
 * @property {string|null} author - Document author
 * @property {string|null} subject - Document subject
 * @property {string|null} creator - Creating application
 * @property {Date|null} creationDate - Document creation date
 * @property {Date|null} modificationDate - Last modification date
 */

/**
 * Creates a default DocumentMetadata object
 * @returns {DocumentMetadata}
 */
export function createDocumentMetadata() {
  return {
    title: null,
    author: null,
    subject: null,
    creator: null,
    creationDate: null,
    modificationDate: null
  };
}

// ============================================================================
// Extracted PDF Data Types
// ============================================================================

/**
 * @typedef {Object} ExtractedPdfData
 * @description Complete extracted PDF data with layout and font information
 * @property {TextItem[]} textItems - All text items from all pages
 * @property {PageLayout[]} pageLayouts - Layout information for each page
 * @property {DocumentMetadata} metadata - Document metadata
 * @property {Map<string, FontInfo>} fonts - Map of font ID to FontInfo
 * @property {string} fileName - Original PDF filename
 * @property {number} pageCount - Total number of pages
 */

/**
 * Creates a default ExtractedPdfData object
 * @param {string} [fileName=''] - Original PDF filename
 * @returns {ExtractedPdfData}
 */
export function createExtractedPdfData(fileName = '') {
  return {
    textItems: [],
    pageLayouts: [],
    metadata: createDocumentMetadata(),
    fonts: new Map(),
    fileName,
    pageCount: 0
  };
}

// ============================================================================
// Text Block Types (for grouped text)
// ============================================================================

/**
 * @typedef {Object} TextBlockBounds
 * @description Bounding box for a text block
 * @property {number} x - Left edge X position
 * @property {number} y - Bottom edge Y position
 * @property {number} width - Block width
 * @property {number} height - Block height
 */

/**
 * @typedef {Object} TextBlock
 * @description Grouped text block (paragraph, heading, or line)
 * @property {'paragraph'|'heading'|'line'} type - Block type classification
 * @property {TextItem[]} items - All text items in this block
 * @property {TextBlockBounds} bounds - Bounding box
 * @property {string} text - Concatenated text content
 * @property {string} fontId - Dominant font ID in block
 * @property {number} fontSize - Average/dominant font size
 */

/**
 * Creates a default TextBlock object
 * @returns {TextBlock}
 */
export function createTextBlock() {
  return {
    type: 'paragraph',
    items: [],
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    text: '',
    fontId: '',
    fontSize: 12
  };
}

// ============================================================================
// PDF Generation Options Types
// ============================================================================

/**
 * @typedef {Object} PdfGenerationOptions
 * @description Options for PDF generation with layout preservation
 * @property {boolean} preserveLayout - Preserve original layout positions
 * @property {boolean} preserveFonts - Preserve original fonts (use fallbacks if unavailable)
 * @property {boolean} preservePageSize - Preserve original page sizes
 * @property {'helvetica'|'times'|'courier'|'custom'} fallbackFontFamily - Fallback font family
 * @property {Uint8Array|null} customFallbackFontBytes - Custom fallback font bytes
 * @property {boolean} relativePositioning - Maintain relative positioning if absolute fails
 * @property {'draft'|'standard'|'high'} quality - Output quality level
 */

/**
 * Creates default PDF generation options
 * @returns {PdfGenerationOptions}
 */
export function createPdfGenerationOptions() {
  return {
    preserveLayout: true,
    preserveFonts: true,
    preservePageSize: true,
    fallbackFontFamily: 'helvetica',
    customFallbackFontBytes: null,
    relativePositioning: true,
    quality: 'standard'
  };
}

// ============================================================================
// Standard Page Sizes
// ============================================================================

/**
 * Standard page sizes in PDF points (1 point = 1/72 inch)
 * @readonly
 * @enum {{width: number, height: number}}
 */
export const PAGE_SIZES = Object.freeze({
  A4: { width: 595.28, height: 841.89 },      // 210 x 297 mm
  A3: { width: 841.89, height: 1190.55 },     // 297 x 420 mm
  A5: { width: 419.53, height: 595.28 },      // 148 x 210 mm
  LETTER: { width: 612, height: 792 },         // 8.5 x 11 in
  LEGAL: { width: 612, height: 1008 },         // 8.5 x 14 in
  TABLOID: { width: 792, height: 1224 }        // 11 x 17 in
});

/**
 * Detect page size name from dimensions
 * @param {number} width - Page width in points
 * @param {number} height - Page height in points
 * @param {number} [tolerance=5] - Tolerance in points for matching
 * @returns {string|null} Page size name or null if not a standard size
 */
export function detectPageSize(width, height, tolerance = 5) {
  for (const [name, size] of Object.entries(PAGE_SIZES)) {
    if (
      Math.abs(width - size.width) <= tolerance &&
      Math.abs(height - size.height) <= tolerance
    ) {
      return name;
    }
    // Check rotated (landscape) orientation
    if (
      Math.abs(width - size.height) <= tolerance &&
      Math.abs(height - size.width) <= tolerance
    ) {
      return `${name}_LANDSCAPE`;
    }
  }
  return null;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse a PDF.js transform matrix to extract position and font size
 * @param {number[]} transform - 6-element transformation matrix
 * @returns {{x: number, y: number, fontSize: number, rotation: number}}
 */
export function parseTransform(transform) {
  if (!transform || transform.length < 6) {
    return { x: 0, y: 0, fontSize: 12, rotation: 0 };
  }
  
  const [scaleX, skewX, , scaleY, translateX, translateY] = transform;
  
  return {
    x: translateX,
    y: translateY,
    fontSize: Math.abs(scaleY),
    rotation: Math.atan2(skewX, scaleX) * (180 / Math.PI)
  };
}

/**
 * Invert Y coordinate from PDF coordinate system (bottom-up) to screen coordinates (top-down)
 * @param {number} y - Y position in PDF coordinates
 * @param {number} pageHeight - Page height in PDF points
 * @param {number} [itemHeight=0] - Height of the item (optional adjustment)
 * @returns {number} Y position in screen coordinates
 */
export function invertYCoordinate(y, pageHeight, itemHeight = 0) {
  return pageHeight - y - itemHeight;
}

/**
 * Convert PDF points to millimeters
 * @param {number} points - Value in PDF points
 * @returns {number} Value in millimeters
 */
export function pointsToMm(points) {
  return points * 0.352778;
}

/**
 * Convert millimeters to PDF points
 * @param {number} mm - Value in millimeters
 * @returns {number} Value in PDF points
 */
export function mmToPoints(mm) {
  return mm * 2.83465;
}

/**
 * Convert PDF points to inches
 * @param {number} points - Value in PDF points
 * @returns {number} Value in inches
 */
export function pointsToInches(points) {
  return points / 72;
}

/**
 * Convert inches to PDF points
 * @param {number} inches - Value in inches
 * @returns {number} Value in PDF points
 */
export function inchesToPoints(inches) {
  return inches * 72;
}

// ============================================================================
// Color Types (for Color Preservation feature)
// ============================================================================

/**
 * @typedef {Object} ColorInfo
 * @description RGB color information with optional alpha channel
 * @property {number} r - Red component (0-1 range)
 * @property {number} g - Green component (0-1 range)
 * @property {number} b - Blue component (0-1 range)
 * @property {number} [a] - Alpha/opacity component (0-1 range, optional)
 */

/**
 * Creates a default ColorInfo object (black)
 * @param {number} [r=0] - Red component (0-1)
 * @param {number} [g=0] - Green component (0-1)
 * @param {number} [b=0] - Blue component (0-1)
 * @param {number} [a=1] - Alpha component (0-1)
 * @returns {ColorInfo}
 */
export function createColorInfo(r = 0, g = 0, b = 0, a = 1) {
  return { r, g, b, a };
}

/**
 * @typedef {Object} TextItemWithColor
 * @description Extended TextItem with reliable color information from operator list extraction
 * @extends TextItem
 * @property {string} text - The text string content
 * @property {number} x - X position from left edge (PDF points)
 * @property {number} y - Y position from bottom edge (PDF points)
 * @property {number} width - Text width in PDF points
 * @property {number} height - Text height in PDF points
 * @property {number} fontSize - Font size derived from transform matrix
 * @property {string} fontName - Internal font reference ID
 * @property {'normal'|'bold'|'italic'|'bolditalic'} fontStyle - Detected font style
 * @property {number} pageIndex - Zero-based page index
 * @property {number[]} transform - 6-element transformation matrix
 * @property {ColorInfo} color - Text color information (reliable, from operator list)
 * @property {number} charOffsetStart - Start index in concatenated text string
 * @property {number} charOffsetEnd - End index in concatenated text string
 * @property {boolean} colorFromOperatorList - True if color was extracted from operator list (reliable)
 */

// ============================================================================
// Column Detection Types (for Multi-Column Layout feature)
// ============================================================================

/**
 * @typedef {Object} ColumnInfo
 * @description Detected column in a page layout
 * @property {number} index - Zero-based column index (left to right)
 * @property {number} id - Unique identifier for this column
 * @property {number} x - Left edge X position (PDF points), alias for leftBound
 * @property {number} leftBound - Left edge X position (PDF points)
 * @property {number} rightBound - Right edge X position (PDF points)
 * @property {number} width - Column width in PDF points
 * @property {number} gapToNext - Gap to next column (0 if last column)
 * @property {import('./pdfTypes').TextItem[]} textItems - Text items assigned to this column
 */

/**
 * Creates a default ColumnInfo object
 * @param {number} [index=0] - Column index
 * @param {number} [x=0] - Left edge X position
 * @param {number} [width=0] - Column width
 * @returns {ColumnInfo}
 */
export function createColumnInfo(index = 0, x = 0, width = 0) {
  return {
    index,
    id: index,
    x,
    leftBound: x,
    rightBound: x + width,
    width,
    gapToNext: 0,
    textItems: []
  };
}

/**
 * @typedef {Object} ColumnLayout
 * @description Multi-column layout information for a page
 * @property {number} pageNumber - One-based page number
 * @property {number} columnCount - Number of detected columns (1-4)
 * @property {ColumnInfo[]} columns - Column definitions
 * @property {number} gutterWidth - Average gap between columns in PDF points
 * @property {boolean} isMultiColumn - True if more than 1 column detected
 */

/**
 * Creates a default single-column layout
 * @param {number} pageWidth - Page width in PDF points
 * @param {number} [pageNumber=1] - One-based page number
 * @returns {ColumnLayout}
 */
export function createDefaultColumnLayout(pageWidth, pageNumber = 1) {
  return {
    pageNumber,
    columnCount: 1,
    columns: [{
      index: 0,
      id: 0,
      x: 0,
      leftBound: 0,
      rightBound: pageWidth,
      width: pageWidth,
      gapToNext: 0,
      textItems: []
    }],
    gutterWidth: 0,
    isMultiColumn: false
  };
}

// ============================================================================
// Font Embedding Types (for Custom Font Embedding feature)
// ============================================================================

/**
 * @typedef {Object} FontEmbedConfig
 * @description Configuration for embedding a custom font into a PDF
 * @property {string} fontName - Name of the font family (e.g., 'NotoSans')
 * @property {Uint8Array|null} fontBytes - Font file bytes (TTF format)
 * @property {string} fallbackFont - Fallback standard font if embedding fails (e.g., 'Helvetica')
 * @property {'regular'|'bold'|'italic'|'bolditalic'} [style='regular'] - Font style/weight
 * @property {boolean} [subset=true] - Whether to subset the font (reduces file size)
 */

/**
 * Creates a default FontEmbedConfig object
 * @param {string} [fontName='NotoSans'] - Font family name
 * @param {Uint8Array|null} [fontBytes=null] - Font file bytes
 * @param {string} [fallbackFont='Helvetica'] - Fallback font name
 * @returns {FontEmbedConfig}
 */
export function createFontEmbedConfig(fontName = 'NotoSans', fontBytes = null, fallbackFont = 'Helvetica') {
  return {
    fontName,
    fontBytes,
    fallbackFont,
    style: 'regular',
    subset: true
  };
}

/**
 * @typedef {Object} ColumnDetectionConfig
 * @description Configuration options for column detection algorithm
 * @property {number} minColumnWidth - Minimum column width in PDF points (default: 100)
 * @property {number} minGutterWidth - Minimum gap to consider as column break (default: 20)
 * @property {number} maxColumns - Maximum number of columns to detect (default: 4)
 * @property {number} minItemsPerColumn - Minimum text items for valid column (default: 5)
 */

/**
 * Creates default column detection configuration
 * @returns {ColumnDetectionConfig}
 */
export function createColumnDetectionConfig() {
  return {
    minColumnWidth: 100,
    minGutterWidth: 20,
    maxColumns: 4,
    minItemsPerColumn: 5
  };
}

// ============================================================================
// Text Layout Types (for Text Overflow Solution)
// ============================================================================

/**
 * @typedef {Object} TextMeasurement
 * @description Result of measuring text dimensions
 * @property {number} width - Total text width in PDF points
 * @property {number} height - Text height in PDF points
 * @property {number} charCount - Number of characters
 * @property {number[]} charWidths - Width of each character
 */

/**
 * Creates a default TextMeasurement
 * @returns {TextMeasurement}
 */
export function createTextMeasurement() {
  return {
    width: 0,
    height: 0,
    charCount: 0,
    charWidths: []
  };
}

/**
 * @typedef {Object} LayoutConstraints
 * @description Page constraints for text layout
 * @property {number} maxWidth - Maximum allowed width
 * @property {number} leftMargin - Left margin position
 * @property {number} rightMargin - Right margin position (distance from right edge)
 * @property {number} pageWidth - Total page width
 * @property {number} pageHeight - Total page height
 */

/**
 * Creates LayoutConstraints from a PageLayout
 * @param {PageLayout} pageLayout - Page layout information
 * @returns {LayoutConstraints}
 */
export function createLayoutConstraints(pageLayout) {
  const margins = pageLayout?.margins || { left: 72, right: 72, top: 72, bottom: 72 };
  return {
    maxWidth: (pageLayout?.width || 595.28) - (margins.left || 72) - (margins.right || 72),
    leftMargin: margins.left || 72,
    rightMargin: margins.right || 72,
    pageWidth: pageLayout?.width || 595.28,
    pageHeight: pageLayout?.height || 841.89
  };
}

/**
 * @typedef {Object} WrappedLine
 * @description A single line of wrapped text
 * @property {string} text - Text content for this line
 * @property {number} width - Width of this line in points
 * @property {number} startCharIndex - Start index in original text
 * @property {number} endCharIndex - End index in original text (exclusive)
 */

/**
 * Creates a default WrappedLine
 * @param {string} [text=''] - Text content
 * @returns {WrappedLine}
 */
export function createWrappedLine(text = '') {
  return {
    text,
    width: 0,
    startCharIndex: 0,
    endCharIndex: text.length
  };
}

/**
 * @typedef {Object} TextLayoutResult
 * @description Result of text layout with overflow handling
 * @property {'normal'|'wrapped'|'scaled'|'truncated'} strategy - Strategy used
 * @property {WrappedLine[]} lines - Lines to render
 * @property {number} fontSize - Final font size (may be scaled)
 * @property {number} totalHeight - Total height of all lines
 * @property {boolean} overflow - True if text was modified to fit
 */

/**
 * Creates a default TextLayoutResult
 * @param {string} [text=''] - Original text
 * @param {number} [fontSize=12] - Font size
 * @returns {TextLayoutResult}
 */
export function createTextLayoutResult(text = '', fontSize = 12) {
  return {
    strategy: 'normal',
    lines: [{
      text,
      width: 0,
      startCharIndex: 0,
      endCharIndex: text.length
    }],
    fontSize,
    totalHeight: fontSize * 1.2,
    overflow: false
  };
}

/**
 * @typedef {Object} TextLayoutOptions
 * @description Options for text layout
 * @property {'wrap'|'scale'|'truncate'} [overflowStrategy='wrap'] - How to handle overflow
 * @property {number} [lineHeight=1.2] - Line height multiplier
 * @property {number} [minFontSize=6] - Minimum font size for scaling
 * @property {boolean} [preserveWhitespace=false] - Preserve leading/trailing whitespace
 */

/**
 * Creates default TextLayoutOptions
 * @returns {TextLayoutOptions}
 */
export function createTextLayoutOptions() {
  return {
    overflowStrategy: 'wrap',
    lineHeight: 1.2,
    minFontSize: 6,
    preserveWhitespace: false
  };
}