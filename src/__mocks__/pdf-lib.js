/**
 * Mock for pdf-lib library
 * Used in unit tests to avoid creating actual PDFs
 * 
 * @module __mocks__/pdf-lib
 */

/**
 * Mock embedded font object
 * Simulates a font that has been embedded in a PDF document
 */
const createMockFont = (options = {}) => {
  const { name = 'MockFont' } = options;
  return {
    name,
    widthOfTextAtSize: jest.fn((text, size) => {
      // Approximate width: ~0.5 * size * character count
      return text.length * size * 0.5;
    }),
    heightAtSize: jest.fn((size) => size),
    encodeText: jest.fn((text) => text),
    embedFontIn: jest.fn()
  };
};

/**
 * Mock PDF page object
 * Simulates a page in a PDF document
 */
const createMockPage = (options = {}) => {
  const { width = 595, height = 842 } = options;
  
  const drawnTexts = [];
  const drawnImages = [];
  
  return {
    getSize: jest.fn(() => ({ width, height })),
    getWidth: jest.fn(() => width),
    getHeight: jest.fn(() => height),
    drawText: jest.fn((text, options = {}) => {
      drawnTexts.push({ text, ...options });
    }),
    drawImage: jest.fn((image, options = {}) => {
      drawnImages.push({ image, ...options });
    }),
    drawRectangle: jest.fn(),
    drawLine: jest.fn(),
    setFont: jest.fn(),
    setFontSize: jest.fn(),
    setFontColor: jest.fn(),
    // Test helpers
    _getDrawnTexts: () => drawnTexts,
    _getDrawnImages: () => drawnImages
  };
};

/**
 * Mock PDF document object
 * Simulates a PDF document for testing PDF generation
 */
const createMockPDFDocument = () => {
  const pages = [];
  const embeddedFonts = new Map();
  let fontkitRegistered = false;
  
  return {
    // Core methods
    registerFontkit: jest.fn((fontkit) => {
      fontkitRegistered = true;
    }),
    
    embedFont: jest.fn((fontBytes, options = {}) => {
      const mockFont = createMockFont();
      const fontId = `font_${embeddedFonts.size}`;
      embeddedFonts.set(fontId, mockFont);
      return Promise.resolve(mockFont);
    }),
    
    addPage: jest.fn((size) => {
      const page = createMockPage(size);
      pages.push(page);
      return page;
    }),
    
    getPages: jest.fn(() => pages),
    getPageCount: jest.fn(() => pages.length),
    getPage: jest.fn((index) => pages[index]),
    
    save: jest.fn(() => {
      // Return a mock Uint8Array representing PDF bytes
      return Promise.resolve(new Uint8Array([0x25, 0x50, 0x44, 0x46])); // "%PDF"
    }),
    
    setTitle: jest.fn(),
    setAuthor: jest.fn(),
    setSubject: jest.fn(),
    setCreator: jest.fn(),
    setCreationDate: jest.fn(),
    setModificationDate: jest.fn(),
    
    // Test helpers
    _isfontkitRegistered: () => fontkitRegistered,
    _getEmbeddedFonts: () => embeddedFonts,
    _getPages: () => pages
  };
};

/**
 * Mock PDFDocument class
 */
export const PDFDocument = {
  create: jest.fn(() => Promise.resolve(createMockPDFDocument())),
  load: jest.fn((bytes) => Promise.resolve(createMockPDFDocument()))
};

/**
 * Standard PDF fonts available without embedding
 */
export const StandardFonts = {
  Helvetica: 'Helvetica',
  HelveticaBold: 'Helvetica-Bold',
  HelveticaOblique: 'Helvetica-Oblique',
  HelveticaBoldOblique: 'Helvetica-BoldOblique',
  TimesRoman: 'Times-Roman',
  TimesBold: 'Times-Bold',
  TimesItalic: 'Times-Italic',
  TimesBoldItalic: 'Times-BoldItalic',
  Courier: 'Courier',
  CourierBold: 'Courier-Bold',
  CourierOblique: 'Courier-Oblique',
  CourierBoldOblique: 'Courier-BoldOblique',
  Symbol: 'Symbol',
  ZapfDingbats: 'ZapfDingbats'
};

/**
 * RGB color creator function
 * Creates a color object from RGB values (0-1 range)
 * 
 * @param {number} r - Red component (0-1)
 * @param {number} g - Green component (0-1)
 * @param {number} b - Blue component (0-1)
 * @returns {Object} RGB color object
 */
export const rgb = jest.fn((r, g, b) => ({
  type: 'RGB',
  red: r,
  green: g,
  blue: b
}));

/**
 * CMYK color creator function
 * 
 * @param {number} c - Cyan component (0-1)
 * @param {number} m - Magenta component (0-1)
 * @param {number} y - Yellow component (0-1)
 * @param {number} k - Black component (0-1)
 * @returns {Object} CMYK color object
 */
export const cmyk = jest.fn((c, m, y, k) => ({
  type: 'CMYK',
  cyan: c,
  magenta: m,
  yellow: y,
  key: k
}));

/**
 * Grayscale color creator function
 * 
 * @param {number} gray - Gray value (0-1, where 0 is black and 1 is white)
 * @returns {Object} Grayscale color object
 */
export const grayscale = jest.fn((gray) => ({
  type: 'Grayscale',
  gray
}));

/**
 * Page size constants
 */
export const PageSizes = {
  A4: [595.28, 841.89],
  A3: [841.89, 1190.55],
  A5: [419.53, 595.28],
  Letter: [612, 792],
  Legal: [612, 1008]
};

/**
 * Degrees to radians conversion
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
export const degrees = jest.fn((deg) => deg * (Math.PI / 180));

/**
 * Radians to degrees conversion
 * @param {number} radians - Angle in radians
 * @returns {number} Angle in degrees
 */
export const radians = jest.fn((rad) => rad * (180 / Math.PI));

// Helper functions for testing
export const _createMockPDFDocument = createMockPDFDocument;
export const _createMockPage = createMockPage;
export const _createMockFont = createMockFont;

// Default export for compatibility
const pdfLibMock = {
  PDFDocument,
  StandardFonts,
  rgb,
  cmyk,
  grayscale,
  PageSizes,
  degrees,
  radians,
  _createMockPDFDocument,
  _createMockPage,
  _createMockFont
};

export default pdfLibMock;