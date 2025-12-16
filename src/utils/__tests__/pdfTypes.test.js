/**
 * Unit tests for pdfTypes module
 * Tests factory functions, type utilities, and conversion functions
 * 
 * @module __tests__/pdfTypes.test
 */

import {
  createTextItem,
  createPageLayout,
  createFontInfo,
  createDocumentMetadata,
  createExtractedPdfData,
  createTextBlock,
  createPdfGenerationOptions,
  createColorInfo,
  createColumnInfo,
  createDefaultColumnLayout,
  createFontEmbedConfig,
  createColumnDetectionConfig,
  parseTransform,
  invertYCoordinate,
  pointsToMm,
  mmToPoints,
  pointsToInches,
  inchesToPoints,
  detectPageSize,
  PAGE_SIZES
} from '../pdfTypes';

describe('pdfTypes', () => {
  // =========================================================================
  // Factory Functions Tests
  // =========================================================================
  
  describe('createTextItem()', () => {
    test('creates default text item with correct structure', () => {
      const item = createTextItem();
      
      expect(item).toHaveProperty('text', '');
      expect(item).toHaveProperty('x', 0);
      expect(item).toHaveProperty('y', 0);
      expect(item).toHaveProperty('width', 0);
      expect(item).toHaveProperty('height', 0);
      expect(item).toHaveProperty('fontSize', 12);
      expect(item).toHaveProperty('fontName', '');
      expect(item).toHaveProperty('fontStyle', 'normal');
      expect(item).toHaveProperty('pageIndex', 0);
      expect(item).toHaveProperty('transform');
      expect(item).toHaveProperty('color');
      expect(item).toHaveProperty('charOffsetStart', 0);
      expect(item).toHaveProperty('charOffsetEnd', 0);
    });

    test('creates text item with default black color', () => {
      const item = createTextItem();
      expect(item.color).toEqual({ r: 0, g: 0, b: 0 });
    });

    test('creates text item with identity transform matrix', () => {
      const item = createTextItem();
      expect(item.transform).toEqual([1, 0, 0, 1, 0, 0]);
    });

    test('creates independent objects (no shared references)', () => {
      const item1 = createTextItem();
      const item2 = createTextItem();
      
      item1.text = 'modified';
      item1.color.r = 1;
      
      expect(item2.text).toBe('');
      expect(item2.color.r).toBe(0);
    });
  });

  describe('createPageLayout()', () => {
    test('creates default page layout with A4 dimensions', () => {
      const layout = createPageLayout();
      
      expect(layout.width).toBeCloseTo(595.28, 2);
      expect(layout.height).toBeCloseTo(841.89, 2);
      expect(layout.pageIndex).toBe(0);
    });

    test('creates page layout with specified page index', () => {
      const layout = createPageLayout(5);
      expect(layout.pageIndex).toBe(5);
    });

    test('creates page layout with default 1-inch margins', () => {
      const layout = createPageLayout();
      
      expect(layout.margins.top).toBe(72);
      expect(layout.margins.right).toBe(72);
      expect(layout.margins.bottom).toBe(72);
      expect(layout.margins.left).toBe(72);
    });

    test('handles negative page index', () => {
      // Edge case: negative page index should still be accepted
      const layout = createPageLayout(-1);
      expect(layout.pageIndex).toBe(-1);
    });
  });

  describe('createColorInfo()', () => {
    test('creates default black color with alpha', () => {
      const color = createColorInfo();
      
      expect(color.r).toBe(0);
      expect(color.g).toBe(0);
      expect(color.b).toBe(0);
      expect(color.a).toBe(1);
    });

    test('creates color with specified RGB values', () => {
      const color = createColorInfo(0.5, 0.25, 0.75);
      
      expect(color.r).toBe(0.5);
      expect(color.g).toBe(0.25);
      expect(color.b).toBe(0.75);
      expect(color.a).toBe(1);
    });

    test('creates color with specified alpha', () => {
      const color = createColorInfo(1, 0, 0, 0.5);
      expect(color.a).toBe(0.5);
    });

    test('handles boundary values (0 and 1)', () => {
      const black = createColorInfo(0, 0, 0, 0);
      const white = createColorInfo(1, 1, 1, 1);
      
      expect(black).toEqual({ r: 0, g: 0, b: 0, a: 0 });
      expect(white).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    });

    // Note: Function does not validate range, so extreme values are accepted
    test('accepts values outside 0-1 range (no validation)', () => {
      const color = createColorInfo(2, -1, 0.5);
      expect(color.r).toBe(2);
      expect(color.g).toBe(-1);
    });
  });

  describe('createColumnInfo()', () => {
    test('creates default column info', () => {
      const column = createColumnInfo();
      
      expect(column.index).toBe(0);
      expect(column.id).toBe(0);
      expect(column.x).toBe(0);
      expect(column.leftBound).toBe(0);
      expect(column.rightBound).toBe(0);
      expect(column.width).toBe(0);
      expect(column.gapToNext).toBe(0);
      expect(column.textItems).toEqual([]);
    });

    test('creates column with specified parameters', () => {
      const column = createColumnInfo(1, 100, 200);
      
      expect(column.index).toBe(1);
      expect(column.id).toBe(1);
      expect(column.x).toBe(100);
      expect(column.leftBound).toBe(100);
      expect(column.rightBound).toBe(300);
      expect(column.width).toBe(200);
    });

    test('calculates rightBound correctly from x + width', () => {
      const column = createColumnInfo(0, 50, 150);
      expect(column.rightBound).toBe(200); // 50 + 150
    });
  });

  describe('createDefaultColumnLayout()', () => {
    test('creates single column layout for page width', () => {
      const layout = createDefaultColumnLayout(595);
      
      expect(layout.columnCount).toBe(1);
      expect(layout.isMultiColumn).toBe(false);
      expect(layout.gutterWidth).toBe(0);
    });

    test('creates layout with correct page number', () => {
      const layout = createDefaultColumnLayout(595, 3);
      expect(layout.pageNumber).toBe(3);
    });

    test('creates column spanning full page width', () => {
      const layout = createDefaultColumnLayout(612);
      
      expect(layout.columns).toHaveLength(1);
      expect(layout.columns[0].leftBound).toBe(0);
      expect(layout.columns[0].rightBound).toBe(612);
      expect(layout.columns[0].width).toBe(612);
    });
  });

  describe('createFontInfo()', () => {
    test('creates default Helvetica font info', () => {
      const font = createFontInfo();
      
      expect(font.name).toBe('Helvetica');
      expect(font.style).toBe('normal');
      expect(font.isEmbedded).toBe(false);
      expect(font.fallbackFont).toBe('Helvetica');
    });

    test('creates font info with specified name', () => {
      const font = createFontInfo('Times-Roman');
      expect(font.name).toBe('Times-Roman');
    });
  });

  describe('createFontEmbedConfig()', () => {
    test('creates default Noto Sans config', () => {
      const config = createFontEmbedConfig();
      
      expect(config.fontName).toBe('NotoSans');
      expect(config.fontBytes).toBeNull();
      expect(config.fallbackFont).toBe('Helvetica');
      expect(config.style).toBe('regular');
      expect(config.subset).toBe(true);
    });

    test('creates config with custom parameters', () => {
      const bytes = new Uint8Array([1, 2, 3]);
      const config = createFontEmbedConfig('CustomFont', bytes, 'Courier');
      
      expect(config.fontName).toBe('CustomFont');
      expect(config.fontBytes).toBe(bytes);
      expect(config.fallbackFont).toBe('Courier');
    });
  });

  describe('createColumnDetectionConfig()', () => {
    test('creates default detection config', () => {
      const config = createColumnDetectionConfig();
      
      expect(config.minColumnWidth).toBe(100);
      expect(config.minGutterWidth).toBe(20);
      expect(config.maxColumns).toBe(4);
      expect(config.minItemsPerColumn).toBe(5);
    });
  });

  // =========================================================================
  // Transform and Coordinate Functions
  // =========================================================================

  describe('parseTransform()', () => {
    test('extracts position from transform matrix', () => {
      const transform = [12, 0, 0, 12, 100, 500];
      const result = parseTransform(transform);
      
      expect(result.x).toBe(100);
      expect(result.y).toBe(500);
      expect(result.fontSize).toBe(12);
    });

    test('handles rotation in transform', () => {
      // 45 degree rotation
      const skewX = Math.sin(45 * Math.PI / 180);
      const scaleX = Math.cos(45 * Math.PI / 180);
      const transform = [scaleX, skewX, -skewX, scaleX, 0, 0];
      const result = parseTransform(transform);
      
      expect(result.rotation).toBeCloseTo(45, 1);
    });

    test('handles null transform gracefully', () => {
      const result = parseTransform(null);
      
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.fontSize).toBe(12);
      expect(result.rotation).toBe(0);
    });

    test('handles empty array gracefully', () => {
      const result = parseTransform([]);
      
      expect(result.fontSize).toBe(12);
    });

    test('handles short array gracefully', () => {
      const result = parseTransform([1, 2, 3]);
      expect(result.fontSize).toBe(12);
    });

    test('uses absolute value for fontSize (handles negative scale)', () => {
      const transform = [12, 0, 0, -12, 100, 500];
      const result = parseTransform(transform);
      
      expect(result.fontSize).toBe(12);
    });
  });

  describe('invertYCoordinate()', () => {
    test('converts PDF Y to screen Y', () => {
      const pageHeight = 842;
      const pdfY = 700;
      const result = invertYCoordinate(pdfY, pageHeight);
      
      expect(result).toBe(142); // 842 - 700 - 0
    });

    test('converts with item height adjustment', () => {
      const pageHeight = 842;
      const pdfY = 700;
      const itemHeight = 12;
      const result = invertYCoordinate(pdfY, pageHeight, itemHeight);
      
      expect(result).toBe(130); // 842 - 700 - 12
    });

    test('handles zero Y position', () => {
      const result = invertYCoordinate(0, 842);
      expect(result).toBe(842);
    });

    test('handles Y position equal to page height', () => {
      const result = invertYCoordinate(842, 842);
      expect(result).toBe(0);
    });
  });

  // =========================================================================
  // Unit Conversion Functions
  // =========================================================================

  describe('pointsToMm()', () => {
    test('converts points to millimeters correctly', () => {
      // 72 points = 1 inch = 25.4mm
      const result = pointsToMm(72);
      expect(result).toBeCloseTo(25.4, 1);
    });

    test('handles zero', () => {
      expect(pointsToMm(0)).toBe(0);
    });

    test('handles negative values', () => {
      expect(pointsToMm(-72)).toBeCloseTo(-25.4, 1);
    });
  });

  describe('mmToPoints()', () => {
    test('converts millimeters to points correctly', () => {
      // 25.4mm = 1 inch = 72 points
      const result = mmToPoints(25.4);
      expect(result).toBeCloseTo(72, 1);
    });

    test('round-trips with pointsToMm', () => {
      const original = 100;
      const roundTrip = mmToPoints(pointsToMm(original));
      // Due to floating point precision limitations, use 3 decimal places
      expect(roundTrip).toBeCloseTo(original, 3);
    });
  });

  describe('pointsToInches()', () => {
    test('converts points to inches correctly', () => {
      expect(pointsToInches(72)).toBe(1);
      expect(pointsToInches(36)).toBe(0.5);
    });
  });

  describe('inchesToPoints()', () => {
    test('converts inches to points correctly', () => {
      expect(inchesToPoints(1)).toBe(72);
      expect(inchesToPoints(0.5)).toBe(36);
    });

    test('round-trips with pointsToInches', () => {
      const original = 144;
      const roundTrip = inchesToPoints(pointsToInches(original));
      expect(roundTrip).toBe(original);
    });
  });

  // =========================================================================
  // Page Size Detection
  // =========================================================================

  describe('detectPageSize()', () => {
    test('detects A4 size', () => {
      expect(detectPageSize(595.28, 841.89)).toBe('A4');
    });

    test('detects Letter size', () => {
      expect(detectPageSize(612, 792)).toBe('LETTER');
    });

    test('detects Legal size', () => {
      expect(detectPageSize(612, 1008)).toBe('LEGAL');
    });

    test('detects landscape orientation', () => {
      expect(detectPageSize(841.89, 595.28)).toBe('A4_LANDSCAPE');
      expect(detectPageSize(792, 612)).toBe('LETTER_LANDSCAPE');
    });

    test('uses tolerance for detection', () => {
      // Within tolerance of A4
      expect(detectPageSize(595, 842)).toBe('A4');
      expect(detectPageSize(598, 845)).toBe('A4');
    });

    test('returns null for unknown size', () => {
      expect(detectPageSize(500, 500)).toBeNull();
      expect(detectPageSize(100, 100)).toBeNull();
    });

    test('returns null for sizes outside tolerance', () => {
      expect(detectPageSize(600, 850)).toBeNull();
    });

    test('accepts custom tolerance', () => {
      // With large tolerance, should match
      expect(detectPageSize(600, 850, 10)).toBe('A4');
      // With small tolerance, should not match
      expect(detectPageSize(600, 850, 1)).toBeNull();
    });
  });

  describe('PAGE_SIZES constant', () => {
    test('contains expected page sizes', () => {
      expect(PAGE_SIZES).toHaveProperty('A4');
      expect(PAGE_SIZES).toHaveProperty('LETTER');
      expect(PAGE_SIZES).toHaveProperty('LEGAL');
      expect(PAGE_SIZES).toHaveProperty('A3');
      expect(PAGE_SIZES).toHaveProperty('A5');
      expect(PAGE_SIZES).toHaveProperty('TABLOID');
    });

    test('A4 has correct dimensions', () => {
      expect(PAGE_SIZES.A4.width).toBeCloseTo(595.28, 2);
      expect(PAGE_SIZES.A4.height).toBeCloseTo(841.89, 2);
    });

    test('LETTER has correct dimensions', () => {
      expect(PAGE_SIZES.LETTER.width).toBe(612);
      expect(PAGE_SIZES.LETTER.height).toBe(792);
    });

    test('is frozen (immutable)', () => {
      expect(Object.isFrozen(PAGE_SIZES)).toBe(true);
    });
  });

  // =========================================================================
  // Additional Factory Functions
  // =========================================================================

  describe('createDocumentMetadata()', () => {
    test('creates default null metadata', () => {
      const metadata = createDocumentMetadata();
      
      expect(metadata.title).toBeNull();
      expect(metadata.author).toBeNull();
      expect(metadata.subject).toBeNull();
      expect(metadata.creator).toBeNull();
      expect(metadata.creationDate).toBeNull();
      expect(metadata.modificationDate).toBeNull();
    });
  });

  describe('createExtractedPdfData()', () => {
    test('creates default extracted data structure', () => {
      const data = createExtractedPdfData('test.pdf');
      
      expect(data.fileName).toBe('test.pdf');
      expect(data.textItems).toEqual([]);
      expect(data.pageLayouts).toEqual([]);
      expect(data.fonts).toBeInstanceOf(Map);
      expect(data.pageCount).toBe(0);
    });

    test('creates data with empty filename by default', () => {
      const data = createExtractedPdfData();
      expect(data.fileName).toBe('');
    });
  });

  describe('createTextBlock()', () => {
    test('creates default paragraph block', () => {
      const block = createTextBlock();
      
      expect(block.type).toBe('paragraph');
      expect(block.items).toEqual([]);
      expect(block.bounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
      expect(block.text).toBe('');
      expect(block.fontId).toBe('');
      expect(block.fontSize).toBe(12);
    });
  });

  describe('createPdfGenerationOptions()', () => {
    test('creates default generation options', () => {
      const options = createPdfGenerationOptions();
      
      expect(options.preserveLayout).toBe(true);
      expect(options.preserveFonts).toBe(true);
      expect(options.preservePageSize).toBe(true);
      expect(options.fallbackFontFamily).toBe('helvetica');
      expect(options.customFallbackFontBytes).toBeNull();
      expect(options.relativePositioning).toBe(true);
      expect(options.quality).toBe('standard');
    });
  });
});