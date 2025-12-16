/**
 * Mock for pdfjs-dist library
 * Used in unit tests to avoid loading actual PDF files
 * 
 * @module __mocks__/pdfjs-dist
 */

// Mock OPS constants for color and text operations
export const OPS = {
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

// Mock GlobalWorkerOptions
export const GlobalWorkerOptions = {
  workerSrc: ''
};

/**
 * Create a mock PDF page with configurable text content and operator list
 * @param {Object} options - Configuration options
 * @returns {Object} Mock page object
 */
export const createMockPage = (options = {}) => {
  const {
    textItems = [
      { str: 'Hello', transform: [12, 0, 0, 12, 72, 700], width: 30, height: 12, fontName: 'g_d0_f1' },
      { str: 'World', transform: [12, 0, 0, 12, 108, 700], width: 35, height: 12, fontName: 'g_d0_f1' }
    ],
    styles = {
      'g_d0_f1': { fontFamily: 'Helvetica' }
    },
    operatorList = {
      fnArray: [],
      argsArray: []
    },
    viewport = { width: 595, height: 842 }
  } = options;

  return {
    getViewport: jest.fn(() => viewport),
    getTextContent: jest.fn(() => Promise.resolve({
      items: textItems,
      styles
    })),
    getOperatorList: jest.fn(() => Promise.resolve(operatorList))
  };
};

/**
 * Create a mock PDF document with configurable pages
 * @param {Object} options - Configuration options
 * @returns {Object} Mock document object
 */
export const createMockDocument = (options = {}) => {
  const {
    numPages = 1,
    pages = [],
    metadata = { info: { Title: 'Test PDF' } }
  } = options;

  // Generate default pages if not provided
  const mockPages = pages.length > 0 ? pages : [createMockPage()];

  return {
    numPages,
    getPage: jest.fn((pageNum) => {
      const pageIndex = pageNum - 1;
      if (pageIndex >= 0 && pageIndex < mockPages.length) {
        return Promise.resolve(mockPages[pageIndex]);
      }
      return Promise.resolve(mockPages[0]);
    }),
    getMetadata: jest.fn(() => Promise.resolve(metadata))
  };
};

/**
 * Mock getDocument function
 * Returns a promise that resolves to a mock PDF document
 */
export const getDocument = jest.fn((source) => {
  const mockDoc = createMockDocument();
  return {
    promise: Promise.resolve(mockDoc)
  };
});

/**
 * Create a mock operator list with color operations
 * Useful for testing color extraction
 * @param {Array} operations - Array of operations to include
 * @returns {Object} Mock operator list
 */
export const createMockOperatorList = (operations = []) => {
  const fnArray = [];
  const argsArray = [];

  operations.forEach(op => {
    fnArray.push(op.fn);
    argsArray.push(op.args);
  });

  return { fnArray, argsArray };
};

/**
 * Helper to create operator list with RGB color followed by text
 * @param {number} r - Red component (0-1)
 * @param {number} g - Green component (0-1)
 * @param {number} b - Blue component (0-1)
 * @param {number} x - X position
 * @param {number} y - Y position
 * @returns {Object} Mock operator list
 */
export const createColorTextOperatorList = (r, g, b, x, y) => {
  return createMockOperatorList([
    { fn: OPS.beginText, args: [] },
    { fn: OPS.setFillRGBColor, args: [r, g, b] },
    { fn: OPS.setTextMatrix, args: [1, 0, 0, 1, x, y] },
    { fn: OPS.showText, args: ['Test text'] },
    { fn: OPS.endText, args: [] }
  ]);
};

// Default export for compatibility
const pdfjsDistMock = {
  OPS,
  GlobalWorkerOptions,
  getDocument,
  createMockPage,
  createMockDocument,
  createMockOperatorList,
  createColorTextOperatorList
};

export default pdfjsDistMock;