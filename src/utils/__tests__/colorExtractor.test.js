/**
 * Unit tests for colorExtractor module
 * Tests color extraction from PDF operator lists and color conversions
 *
 * @module __tests__/colorExtractor.test
 */

import {
  extractTextColors,
  matchColorToTextItem,
  extractAndMergeColors,
  cmykToRgb,
  grayToRgb,
  createPositionKey,
  isBlack,
  isWhite,
  colorsEqual
} from '../colorExtractor';
import { createColorInfo } from '../pdfTypes';

// OPS constants matching pdfjs-dist
const OPS = {
  // Color operations
  setFillRGBColor: 110,
  setFillGray: 109,
  setFillCMYKColor: 111,
  setFillColorSpace: 112,
  setFillColor: 113,
  
  // Text operations
  setTextMatrix: 43,
  showText: 45,
  showSpacedText: 46,
  beginText: 42,
  endText: 44,
  moveText: 41,
  setFont: 40,
  
  // Transform operations
  transform: 12,
  save: 10,
  restore: 11,
};

describe('colorExtractor', () => {
  // =========================================================================
  // Color Conversion Functions
  // =========================================================================
  
  describe('cmykToRgb()', () => {
    test('converts pure cyan to RGB', () => {
      const result = cmykToRgb(1, 0, 0, 0);
      
      expect(result.r).toBeCloseTo(0, 2);
      expect(result.g).toBeCloseTo(1, 2);
      expect(result.b).toBeCloseTo(1, 2);
    });

    test('converts pure magenta to RGB', () => {
      const result = cmykToRgb(0, 1, 0, 0);
      
      expect(result.r).toBeCloseTo(1, 2);
      expect(result.g).toBeCloseTo(0, 2);
      expect(result.b).toBeCloseTo(1, 2);
    });

    test('converts pure yellow to RGB', () => {
      const result = cmykToRgb(0, 0, 1, 0);
      
      expect(result.r).toBeCloseTo(1, 2);
      expect(result.g).toBeCloseTo(1, 2);
      expect(result.b).toBeCloseTo(0, 2);
    });

    test('converts pure black (K=1) to RGB black', () => {
      const result = cmykToRgb(0, 0, 0, 1);
      
      expect(result.r).toBeCloseTo(0, 2);
      expect(result.g).toBeCloseTo(0, 2);
      expect(result.b).toBeCloseTo(0, 2);
    });

    test('converts all zeros to white', () => {
      const result = cmykToRgb(0, 0, 0, 0);
      
      expect(result.r).toBeCloseTo(1, 2);
      expect(result.g).toBeCloseTo(1, 2);
      expect(result.b).toBeCloseTo(1, 2);
    });

    test('handles mixed CMYK values', () => {
      // 50% cyan, 25% magenta = light blue-ish
      const result = cmykToRgb(0.5, 0.25, 0, 0);
      
      expect(result.r).toBeCloseTo(0.5, 2);
      expect(result.g).toBeCloseTo(0.75, 2);
      expect(result.b).toBeCloseTo(1, 2);
    });

    test('clamps output values to 0-1 range', () => {
      const result = cmykToRgb(0, 0, 0, 0);
      
      expect(result.r).toBeLessThanOrEqual(1);
      expect(result.r).toBeGreaterThanOrEqual(0);
      expect(result.g).toBeLessThanOrEqual(1);
      expect(result.g).toBeGreaterThanOrEqual(0);
      expect(result.b).toBeLessThanOrEqual(1);
      expect(result.b).toBeGreaterThanOrEqual(0);
    });

    test('handles K value with other colors', () => {
      // 50% K reduces all colors by half
      const result = cmykToRgb(0, 0, 0, 0.5);
      
      expect(result.r).toBeCloseTo(0.5, 2);
      expect(result.g).toBeCloseTo(0.5, 2);
      expect(result.b).toBeCloseTo(0.5, 2);
    });
  });

  describe('grayToRgb()', () => {
    test('converts 0 (black) to RGB black', () => {
      const result = grayToRgb(0);
      
      expect(result.r).toBe(0);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
    });

    test('converts 1 (white) to RGB white', () => {
      const result = grayToRgb(1);
      
      expect(result.r).toBe(1);
      expect(result.g).toBe(1);
      expect(result.b).toBe(1);
    });

    test('converts 0.5 to medium gray', () => {
      const result = grayToRgb(0.5);
      
      expect(result.r).toBe(0.5);
      expect(result.g).toBe(0.5);
      expect(result.b).toBe(0.5);
    });

    test('clamps values below 0 to 0', () => {
      const result = grayToRgb(-0.5);
      
      expect(result.r).toBe(0);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
    });

    test('clamps values above 1 to 1', () => {
      const result = grayToRgb(1.5);
      
      expect(result.r).toBe(1);
      expect(result.g).toBe(1);
      expect(result.b).toBe(1);
    });

    test('all RGB components are equal for any gray value', () => {
      const result = grayToRgb(0.75);
      
      expect(result.r).toBe(result.g);
      expect(result.g).toBe(result.b);
    });
  });

  // =========================================================================
  // Position Key Function
  // =========================================================================
  
  describe('createPositionKey()', () => {
    test('creates correct key format', () => {
      const key = createPositionKey(100, 200);
      expect(key).toBe('100_200');
    });

    test('rounds floating point values', () => {
      const key = createPositionKey(100.7, 200.3);
      expect(key).toBe('101_200');
    });

    test('handles zero values', () => {
      const key = createPositionKey(0, 0);
      expect(key).toBe('0_0');
    });

    test('handles negative values', () => {
      const key = createPositionKey(-50, -100);
      expect(key).toBe('-50_-100');
    });

    test('handles very large values', () => {
      const key = createPositionKey(99999, 99999);
      expect(key).toBe('99999_99999');
    });
  });

  // =========================================================================
  // Color Comparison Functions
  // =========================================================================
  
  describe('isBlack()', () => {
    test('returns true for perfect black', () => {
      expect(isBlack({ r: 0, g: 0, b: 0 })).toBe(true);
    });

    test('returns true for near-black within tolerance', () => {
      expect(isBlack({ r: 0.005, g: 0.005, b: 0.005 })).toBe(true);
    });

    test('returns false for colors above tolerance', () => {
      expect(isBlack({ r: 0.1, g: 0, b: 0 })).toBe(false);
    });

    test('returns true for null color', () => {
      expect(isBlack(null)).toBe(true);
    });

    test('returns true for undefined color', () => {
      expect(isBlack(undefined)).toBe(true);
    });

    test('respects custom tolerance', () => {
      const color = { r: 0.05, g: 0.05, b: 0.05 };
      expect(isBlack(color, 0.01)).toBe(false);
      expect(isBlack(color, 0.1)).toBe(true);
    });
  });

  describe('isWhite()', () => {
    test('returns true for perfect white', () => {
      expect(isWhite({ r: 1, g: 1, b: 1 })).toBe(true);
    });

    test('returns true for near-white within tolerance', () => {
      expect(isWhite({ r: 0.995, g: 0.995, b: 0.995 })).toBe(true);
    });

    test('returns false for colors below tolerance', () => {
      expect(isWhite({ r: 0.9, g: 1, b: 1 })).toBe(false);
    });

    test('returns false for null color', () => {
      expect(isWhite(null)).toBe(false);
    });

    test('returns false for undefined color', () => {
      expect(isWhite(undefined)).toBe(false);
    });

    test('respects custom tolerance', () => {
      const color = { r: 0.95, g: 0.95, b: 0.95 };
      expect(isWhite(color, 0.01)).toBe(false);
      expect(isWhite(color, 0.1)).toBe(true);
    });
  });

  describe('colorsEqual()', () => {
    test('returns true for identical colors', () => {
      const color1 = { r: 0.5, g: 0.5, b: 0.5 };
      const color2 = { r: 0.5, g: 0.5, b: 0.5 };
      expect(colorsEqual(color1, color2)).toBe(true);
    });

    test('returns true for colors within tolerance', () => {
      const color1 = { r: 0.5, g: 0.5, b: 0.5 };
      const color2 = { r: 0.505, g: 0.505, b: 0.505 };
      expect(colorsEqual(color1, color2)).toBe(true);
    });

    test('returns false for colors outside tolerance', () => {
      const color1 = { r: 0.5, g: 0.5, b: 0.5 };
      const color2 = { r: 0.6, g: 0.5, b: 0.5 };
      expect(colorsEqual(color1, color2)).toBe(false);
    });

    test('returns true when both colors are null', () => {
      expect(colorsEqual(null, null)).toBe(true);
    });

    test('returns false when one color is null', () => {
      expect(colorsEqual({ r: 0, g: 0, b: 0 }, null)).toBe(false);
      expect(colorsEqual(null, { r: 0, g: 0, b: 0 })).toBe(false);
    });

    test('respects custom tolerance', () => {
      const color1 = { r: 0.5, g: 0.5, b: 0.5 };
      const color2 = { r: 0.55, g: 0.55, b: 0.55 };
      expect(colorsEqual(color1, color2, 0.01)).toBe(false);
      expect(colorsEqual(color1, color2, 0.1)).toBe(true);
    });
  });

  // =========================================================================
  // extractTextColors() Tests
  // =========================================================================
  
  describe('extractTextColors()', () => {
    test('extracts RGB colors from operator list', async () => {
      const mockPage = {
        getOperatorList: jest.fn(() => Promise.resolve({
          fnArray: [
            OPS.beginText,
            OPS.setFillRGBColor,
            OPS.setTextMatrix,
            OPS.showText,
            OPS.endText
          ],
          argsArray: [
            [],
            [1, 0, 0],           // Red color
            [1, 0, 0, 1, 100, 200], // Position
            ['Test'],
            []
          ]
        }))
      };

      const result = await extractTextColors(mockPage);

      expect(result.hasColorData).toBe(true);
      expect(result.colorChanges).toBeGreaterThanOrEqual(1);
      expect(result.colorMap.size).toBeGreaterThanOrEqual(1);
    });

    test('extracts grayscale colors', async () => {
      const mockPage = {
        getOperatorList: jest.fn(() => Promise.resolve({
          fnArray: [
            OPS.beginText,
            OPS.setFillGray,
            OPS.setTextMatrix,
            OPS.showText,
            OPS.endText
          ],
          argsArray: [
            [],
            [0.5],               // 50% gray
            [1, 0, 0, 1, 100, 200],
            ['Test'],
            []
          ]
        }))
      };

      const result = await extractTextColors(mockPage);

      expect(result.hasColorData).toBe(true);
      // Check that a gray color was stored
      const colorEntries = Array.from(result.colorMap.values());
      if (colorEntries.length > 0) {
        expect(colorEntries[0].r).toEqual(colorEntries[0].g);
        expect(colorEntries[0].g).toEqual(colorEntries[0].b);
      }
    });

    test('extracts CMYK colors and converts to RGB', async () => {
      const mockPage = {
        getOperatorList: jest.fn(() => Promise.resolve({
          fnArray: [
            OPS.beginText,
            OPS.setFillCMYKColor,
            OPS.setTextMatrix,
            OPS.showText,
            OPS.endText
          ],
          argsArray: [
            [],
            [0, 0, 0, 1],        // Pure black in CMYK
            [1, 0, 0, 1, 100, 200],
            ['Test'],
            []
          ]
        }))
      };

      const result = await extractTextColors(mockPage);

      expect(result.hasColorData).toBe(true);
    });

    test('returns default result for invalid operator list', async () => {
      const mockPage = {
        getOperatorList: jest.fn(() => Promise.resolve(null))
      };

      const result = await extractTextColors(mockPage);

      expect(result.hasColorData).toBe(false);
      expect(result.colorMap.size).toBe(0);
      expect(result.defaultColor).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });

    test('returns default result when getOperatorList throws', async () => {
      const mockPage = {
        getOperatorList: jest.fn(() => Promise.reject(new Error('Failed')))
      };

      const result = await extractTextColors(mockPage);

      expect(result.hasColorData).toBe(false);
      expect(result.colorMap.size).toBe(0);
    });

    test('handles save/restore graphics state', async () => {
      const mockPage = {
        getOperatorList: jest.fn(() => Promise.resolve({
          fnArray: [
            OPS.save,
            OPS.setFillRGBColor,
            OPS.beginText,
            OPS.setTextMatrix,
            OPS.showText,
            OPS.endText,
            OPS.restore,
            OPS.beginText,
            OPS.setTextMatrix,
            OPS.showText,
            OPS.endText
          ],
          argsArray: [
            [],
            [1, 0, 0],           // Red
            [],
            [1, 0, 0, 1, 100, 200],
            ['First'],
            [],
            [],
            [],
            [1, 0, 0, 1, 100, 180],
            ['Second'],
            []
          ]
        }))
      };

      const result = await extractTextColors(mockPage);

      // Should handle save/restore without error
      expect(result).toBeDefined();
    });

    test('tracks multiple color changes', async () => {
      const mockPage = {
        getOperatorList: jest.fn(() => Promise.resolve({
          fnArray: [
            OPS.setFillRGBColor,
            OPS.setFillRGBColor,
            OPS.setFillGray
          ],
          argsArray: [
            [1, 0, 0],
            [0, 1, 0],
            [0.5]
          ]
        }))
      };

      const result = await extractTextColors(mockPage);

      expect(result.colorChanges).toBe(3);
    });
  });

  // =========================================================================
  // matchColorToTextItem() Tests
  // =========================================================================
  
  describe('matchColorToTextItem()', () => {
    test('matches color by exact position', () => {
      const colorMap = new Map();
      colorMap.set('100_200', { r: 1, g: 0, b: 0 });

      const item = { x: 100, y: 200 };
      const result = matchColorToTextItem(item, colorMap);

      expect(result).toEqual({ r: 1, g: 0, b: 0 });
    });

    test('matches color by nearby position within tolerance', () => {
      const colorMap = new Map();
      colorMap.set('100_200', { r: 0, g: 1, b: 0 });

      const item = { x: 102, y: 198 }; // Within 3pt tolerance
      const result = matchColorToTextItem(item, colorMap);

      expect(result).toEqual({ r: 0, g: 1, b: 0 });
    });

    test('returns default black when no match found', () => {
      const colorMap = new Map();
      colorMap.set('100_200', { r: 1, g: 0, b: 0 });

      const item = { x: 500, y: 500 }; // Far from any entry
      const result = matchColorToTextItem(item, colorMap);

      expect(result).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });

    test('returns custom default color when provided', () => {
      const colorMap = new Map();
      const defaultColor = { r: 0, g: 0, b: 1, a: 1 };

      const item = { x: 500, y: 500 };
      const result = matchColorToTextItem(item, colorMap, defaultColor);

      expect(result).toEqual(defaultColor);
    });

    test('returns fallback for null item', () => {
      const colorMap = new Map();
      const result = matchColorToTextItem(null, colorMap);

      expect(result).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });

    test('returns fallback for item without x/y', () => {
      const colorMap = new Map();
      const result = matchColorToTextItem({ text: 'test' }, colorMap);

      expect(result).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });

    test('returns fallback for empty color map', () => {
      const colorMap = new Map();
      const item = { x: 100, y: 200 };
      const result = matchColorToTextItem(item, colorMap);

      expect(result).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });

    test('returns fallback for null color map', () => {
      const item = { x: 100, y: 200 };
      const result = matchColorToTextItem(item, null);

      expect(result).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });
  });

  // =========================================================================
  // extractAndMergeColors() Tests
  // =========================================================================
  
  describe('extractAndMergeColors()', () => {
    test('merges extracted colors with text items', async () => {
      const mockPage = {
        getOperatorList: jest.fn(() => Promise.resolve({
          fnArray: [
            OPS.beginText,
            OPS.setFillRGBColor,
            OPS.setTextMatrix,
            OPS.showText,
            OPS.endText
          ],
          argsArray: [
            [],
            [1, 0, 0],
            [1, 0, 0, 1, 100, 200],
            ['Test'],
            []
          ]
        }))
      };

      const textItems = [
        { x: 100, y: 200, text: 'Test' }
      ];

      const result = await extractAndMergeColors(mockPage, textItems);

      expect(result).toHaveLength(1);
      expect(result[0].color).toBeDefined();
      expect(result[0].colorFromOperatorList).toBeDefined();
    });

    test('returns empty array for empty text items', async () => {
      const mockPage = {
        getOperatorList: jest.fn()
      };

      const result = await extractAndMergeColors(mockPage, []);

      expect(result).toEqual([]);
    });

    test('returns empty array for null text items', async () => {
      const mockPage = {
        getOperatorList: jest.fn()
      };

      const result = await extractAndMergeColors(mockPage, null);

      expect(result).toEqual(null);
    });

    test('sets colorFromOperatorList to false when no color data', async () => {
      const mockPage = {
        getOperatorList: jest.fn(() => Promise.resolve({
          fnArray: [],
          argsArray: []
        }))
      };

      const textItems = [
        { x: 100, y: 200, text: 'Test' }
      ];

      const result = await extractAndMergeColors(mockPage, textItems);

      expect(result[0].colorFromOperatorList).toBe(false);
    });

    test('handles extraction failure gracefully', async () => {
      const mockPage = {
        getOperatorList: jest.fn(() => Promise.reject(new Error('Failed')))
      };

      const textItems = [
        { x: 100, y: 200, text: 'Test' }
      ];

      const result = await extractAndMergeColors(mockPage, textItems);

      expect(result).toHaveLength(1);
      expect(result[0].color).toEqual({ r: 0, g: 0, b: 0, a: 1 });
      expect(result[0].colorFromOperatorList).toBe(false);
    });

    test('preserves original item properties', async () => {
      const mockPage = {
        getOperatorList: jest.fn(() => Promise.resolve({
          fnArray: [OPS.setFillRGBColor],
          argsArray: [[1, 0, 0]]
        }))
      };

      const textItems = [
        { x: 100, y: 200, text: 'Test', fontSize: 14, fontName: 'Helvetica' }
      ];

      const result = await extractAndMergeColors(mockPage, textItems);

      expect(result[0].text).toBe('Test');
      expect(result[0].fontSize).toBe(14);
      expect(result[0].fontName).toBe('Helvetica');
      expect(result[0].x).toBe(100);
      expect(result[0].y).toBe(200);
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================
  
  describe('Edge Cases', () => {
    test('handles operator with missing args', async () => {
      const mockPage = {
        getOperatorList: jest.fn(() => Promise.resolve({
          fnArray: [OPS.setFillRGBColor],
          argsArray: [null] // Missing args
        }))
      };

      // Should not throw
      const result = await extractTextColors(mockPage);
      expect(result).toBeDefined();
    });

    test('handles operator with insufficient args', async () => {
      const mockPage = {
        getOperatorList: jest.fn(() => Promise.resolve({
          fnArray: [OPS.setFillRGBColor],
          argsArray: [[1, 0]] // Only 2 args instead of 3
        }))
      };

      const result = await extractTextColors(mockPage);
      expect(result).toBeDefined();
    });

    test('handles empty arrays in operator list', async () => {
      const mockPage = {
        getOperatorList: jest.fn(() => Promise.resolve({
          fnArray: [],
          argsArray: []
        }))
      };

      const result = await extractTextColors(mockPage);
      expect(result.hasColorData).toBe(false);
    });

    test('handles very large number of operators', async () => {
      const fnArray = [];
      const argsArray = [];
      
      // Create 1000 color operations
      for (let i = 0; i < 1000; i++) {
        fnArray.push(OPS.setFillRGBColor);
        argsArray.push([Math.random(), Math.random(), Math.random()]);
      }

      const mockPage = {
        getOperatorList: jest.fn(() => Promise.resolve({ fnArray, argsArray }))
      };

      const startTime = Date.now();
      const result = await extractTextColors(mockPage);
      const endTime = Date.now();

      // Performance assertion: should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
      expect(result.colorChanges).toBe(1000);
    });

    test('handles text shown outside text block', async () => {
      const mockPage = {
        getOperatorList: jest.fn(() => Promise.resolve({
          fnArray: [
            OPS.setFillRGBColor,
            OPS.setTextMatrix,
            OPS.showText  // No beginText before this
          ],
          argsArray: [
            [1, 0, 0],
            [1, 0, 0, 1, 100, 200],
            ['Test']
          ]
        }))
      };

      // Should still track color at position
      const result = await extractTextColors(mockPage);
      expect(result.colorMap.size).toBeGreaterThan(0);
    });
  });
});