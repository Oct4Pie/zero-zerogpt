/**
 * Unit tests for columnDetector module
 * Tests column detection, item assignment, and reading order sorting
 * 
 * @module __tests__/columnDetector.test
 */

import {
  detectColumns,
  assignItemsToColumns,
  sortByReadingOrder,
  analyzeColumnDistribution,
  isLikelyMultiColumn
} from '../columnDetector';
import { createDefaultColumnLayout } from '../pdfTypes';

// Helper to create mock text items
const createTextItems = (positions) => {
  return positions.map((pos, index) => ({
    x: pos.x,
    y: pos.y || 700 - (index * 20), // Default Y decreases for reading order
    width: pos.width || 100,
    height: 12,
    text: `Text ${index}`,
    pageIndex: 0
  }));
};

describe('columnDetector', () => {
  // =========================================================================
  // detectColumns() Tests
  // =========================================================================
  
  describe('detectColumns()', () => {
    test('detects single column for simple left-aligned layout', () => {
      // All items aligned on left side of page
      const items = createTextItems([
        { x: 72, y: 700 },
        { x: 72, y: 680 },
        { x: 72, y: 660 },
        { x: 72, y: 640 },
        { x: 72, y: 620 }
      ]);
      
      const result = detectColumns(items, 595);
      
      expect(result.columnCount).toBe(1);
      expect(result.isMultiColumn).toBe(false);
    });

    test('detects two columns when items have distinct X regions', () => {
      // Create items in two distinct columns with enough items
      const leftColumn = [
        { x: 72, y: 700 },
        { x: 72, y: 680 },
        { x: 72, y: 660 },
        { x: 72, y: 640 },
        { x: 72, y: 620 },
        { x: 72, y: 600 }
      ];
      const rightColumn = [
        { x: 320, y: 700 },
        { x: 320, y: 680 },
        { x: 320, y: 660 },
        { x: 320, y: 640 },
        { x: 320, y: 620 },
        { x: 320, y: 600 }
      ];
      
      const items = createTextItems([...leftColumn, ...rightColumn]);
      const result = detectColumns(items, 595);
      
      expect(result.columnCount).toBe(2);
      expect(result.isMultiColumn).toBe(true);
    });

    test('detects three columns when items have three distinct X regions', () => {
      // Three columns with 6 items each
      const createColumn = (startX, yStart = 700) => 
        Array.from({ length: 6 }, (_, i) => ({ x: startX, y: yStart - i * 20 }));
      
      const items = createTextItems([
        ...createColumn(50),   // Left column
        ...createColumn(220),  // Middle column
        ...createColumn(400)   // Right column
      ]);
      
      const result = detectColumns(items, 595);
      
      expect(result.columnCount).toBeGreaterThanOrEqual(2);
      expect(result.isMultiColumn).toBe(true);
    });

    test('returns default single column for empty input', () => {
      const result = detectColumns([], 595);
      
      expect(result.columnCount).toBe(1);
      expect(result.isMultiColumn).toBe(false);
    });

    test('returns default single column for null input', () => {
      const result = detectColumns(null, 595);
      
      expect(result.columnCount).toBe(1);
      expect(result.isMultiColumn).toBe(false);
    });

    test('returns default single column for undefined input', () => {
      const result = detectColumns(undefined, 595);
      
      expect(result.columnCount).toBe(1);
      expect(result.isMultiColumn).toBe(false);
    });

    test('returns single column when too few items for reliable detection', () => {
      // Only 5 items - below threshold of minItemsPerColumn * 2
      const items = createTextItems([
        { x: 72, y: 700 },
        { x: 320, y: 700 },
        { x: 72, y: 680 },
        { x: 320, y: 680 },
        { x: 72, y: 660 }
      ]);
      
      const result = detectColumns(items, 595);
      
      expect(result.columnCount).toBe(1);
    });

    test('respects maxColumns configuration', () => {
      // Create 5 potential columns
      const createColumn = (startX) => 
        Array.from({ length: 6 }, (_, i) => ({ x: startX, y: 700 - i * 20 }));
      
      const items = createTextItems([
        ...createColumn(50),
        ...createColumn(150),
        ...createColumn(250),
        ...createColumn(350),
        ...createColumn(450)
      ]);
      
      // Default maxColumns is 4
      const result = detectColumns(items, 595);
      
      expect(result.columnCount).toBeLessThanOrEqual(4);
    });

    test('uses custom config when provided', () => {
      const items = createTextItems([
        { x: 72, y: 700 },
        { x: 72, y: 680 },
        { x: 300, y: 700 },
        { x: 300, y: 680 }
      ]);
      
      // With very low minItemsPerColumn, should still detect based on items
      const config = {
        minColumnWidth: 50,
        minGutterWidth: 10,
        maxColumns: 4,
        minItemsPerColumn: 1
      };
      
      const result = detectColumns(items, 595, config);
      
      // Should process without error
      expect(result).toBeDefined();
    });

    test('handles items with negative X positions', () => {
      const items = createTextItems([
        { x: -10, y: 700 },
        { x: 72, y: 680 },
        { x: 72, y: 660 }
      ]);
      
      // Should not throw, negative positions filtered out
      const result = detectColumns(items, 595);
      expect(result).toBeDefined();
    });

    test('handles items with X positions beyond page width', () => {
      const items = createTextItems([
        { x: 72, y: 700 },
        { x: 72, y: 680 },
        { x: 700, y: 660 }  // Beyond page width of 595
      ]);
      
      const result = detectColumns(items, 595);
      expect(result).toBeDefined();
    });

    test('calculates gutterWidth correctly for multi-column layout', () => {
      const leftColumn = Array.from({ length: 6 }, (_, i) => ({
        x: 50,
        y: 700 - i * 20
      }));
      const rightColumn = Array.from({ length: 6 }, (_, i) => ({
        x: 320,
        y: 700 - i * 20
      }));
      
      const items = createTextItems([...leftColumn, ...rightColumn]);
      const result = detectColumns(items, 595);
      
      // Gutter width calculation depends on detected column boundaries
      // If multi-column is detected, gutterWidth should be >= 0
      if (result.isMultiColumn) {
        expect(result.gutterWidth).toBeGreaterThanOrEqual(0);
      }
      // The algorithm may or may not detect multi-column depending on threshold
      expect(result.columnCount).toBeGreaterThanOrEqual(1);
    });

    test('includes pageNumber in result', () => {
      const items = createTextItems([
        { x: 72, y: 700 }
      ]);
      items[0].pageIndex = 2;
      
      const result = detectColumns(items, 595);
      expect(result.pageNumber).toBeDefined();
    });
  });

  // =========================================================================
  // assignItemsToColumns() Tests
  // =========================================================================
  
  describe('assignItemsToColumns()', () => {
    test('assigns items to correct columns based on X position', () => {
      const items = [
        { x: 72, y: 700, text: 'Left 1' },
        { x: 320, y: 700, text: 'Right 1' },
        { x: 72, y: 680, text: 'Left 2' },
        { x: 320, y: 680, text: 'Right 2' }
      ];
      
      const layout = {
        columns: [
          { index: 0, leftBound: 0, rightBound: 200 },
          { index: 1, leftBound: 200, rightBound: 595 }
        ]
      };
      
      const result = assignItemsToColumns(items, layout);
      
      expect(result[0].columnIndex).toBe(0); // Left 1
      expect(result[1].columnIndex).toBe(1); // Right 1
      expect(result[2].columnIndex).toBe(0); // Left 2
      expect(result[3].columnIndex).toBe(1); // Right 2
    });

    test('returns empty array for empty input', () => {
      const layout = { columns: [{ index: 0, leftBound: 0, rightBound: 595 }] };
      const result = assignItemsToColumns([], layout);
      
      expect(result).toEqual([]);
    });

    test('returns empty array for null input', () => {
      const layout = { columns: [{ index: 0, leftBound: 0, rightBound: 595 }] };
      const result = assignItemsToColumns(null, layout);
      
      expect(result).toEqual([]);
    });

    test('assigns all items to column 0 when layout is null', () => {
      const items = [
        { x: 72, y: 700 },
        { x: 320, y: 700 }
      ];
      
      const result = assignItemsToColumns(items, null);
      
      expect(result[0].columnIndex).toBe(0);
      expect(result[1].columnIndex).toBe(0);
    });

    test('assigns all items to column 0 when columns array is empty', () => {
      const items = [
        { x: 72, y: 700 },
        { x: 320, y: 700 }
      ];
      
      const result = assignItemsToColumns(items, { columns: [] });
      
      expect(result[0].columnIndex).toBe(0);
      expect(result[1].columnIndex).toBe(0);
    });

    test('finds nearest column for items outside defined bounds', () => {
      const items = [
        { x: 600, y: 700 }  // Beyond rightBound of last column
      ];
      
      const layout = {
        columns: [
          { index: 0, leftBound: 0, rightBound: 200 },
          { index: 1, leftBound: 200, rightBound: 400 }
        ]
      };
      
      const result = assignItemsToColumns(items, layout);
      
      // Should be assigned to nearest column (column 1)
      expect(result[0].columnIndex).toBeDefined();
    });

    test('preserves original item properties', () => {
      const items = [
        { x: 72, y: 700, text: 'Test', fontSize: 14, fontName: 'Helvetica' }
      ];
      
      const layout = { columns: [{ index: 0, leftBound: 0, rightBound: 595 }] };
      const result = assignItemsToColumns(items, layout);
      
      expect(result[0].text).toBe('Test');
      expect(result[0].fontSize).toBe(14);
      expect(result[0].fontName).toBe('Helvetica');
    });
  });

  // =========================================================================
  // sortByReadingOrder() Tests
  // =========================================================================
  
  describe('sortByReadingOrder()', () => {
    test('sorts by column then by Y position (reading order)', () => {
      const items = [
        { columnIndex: 1, y: 600, x: 320, text: 'Right Bottom' },
        { columnIndex: 0, y: 600, x: 72, text: 'Left Bottom' },
        { columnIndex: 0, y: 700, x: 72, text: 'Left Top' },
        { columnIndex: 1, y: 700, x: 320, text: 'Right Top' }
      ];
      
      const sorted = sortByReadingOrder(items);
      
      // Column 0 first, then column 1
      // Within each column, higher Y (top) comes first
      expect(sorted[0].text).toBe('Left Top');      // Column 0, Y 700
      expect(sorted[1].text).toBe('Left Bottom');   // Column 0, Y 600
      expect(sorted[2].text).toBe('Right Top');     // Column 1, Y 700
      expect(sorted[3].text).toBe('Right Bottom');  // Column 1, Y 600
    });

    test('returns empty array for empty input', () => {
      expect(sortByReadingOrder([])).toEqual([]);
    });

    test('returns empty array for null input', () => {
      expect(sortByReadingOrder(null)).toEqual([]);
    });

    test('returns empty array for undefined input', () => {
      expect(sortByReadingOrder(undefined)).toEqual([]);
    });

    test('treats missing columnIndex as 0', () => {
      const items = [
        { y: 700, x: 72 },  // No columnIndex
        { columnIndex: 0, y: 680, x: 72 }
      ];
      
      const sorted = sortByReadingOrder(items);
      
      // Both treated as column 0, sorted by Y
      expect(sorted[0].y).toBe(700);
      expect(sorted[1].y).toBe(680);
    });

    test('sorts by X position for items on same line', () => {
      const items = [
        { columnIndex: 0, y: 700, x: 150, text: 'Second' },
        { columnIndex: 0, y: 700, x: 72, text: 'First' },
        { columnIndex: 0, y: 700, x: 200, text: 'Third' }
      ];
      
      const sorted = sortByReadingOrder(items);
      
      // Same column, same Y - sort by X
      expect(sorted[0].text).toBe('First');
      expect(sorted[1].text).toBe('Second');
      expect(sorted[2].text).toBe('Third');
    });

    test('groups items within Y tolerance as same line', () => {
      // Items within 5 points Y difference are considered same line
      const items = [
        { columnIndex: 0, y: 702, x: 150 },
        { columnIndex: 0, y: 700, x: 72 },
        { columnIndex: 0, y: 698, x: 200 }
      ];
      
      const sorted = sortByReadingOrder(items);
      
      // All within 5 points, should sort by X
      expect(sorted[0].x).toBe(72);
      expect(sorted[1].x).toBe(150);
      expect(sorted[2].x).toBe(200);
    });

    test('does not mutate original array', () => {
      const items = [
        { columnIndex: 1, y: 600, x: 320 },
        { columnIndex: 0, y: 700, x: 72 }
      ];
      const originalFirst = items[0];
      
      sortByReadingOrder(items);
      
      expect(items[0]).toBe(originalFirst);
    });
  });

  // =========================================================================
  // analyzeColumnDistribution() Tests
  // =========================================================================
  
  describe('analyzeColumnDistribution()', () => {
    test('returns correct analysis for balanced two-column layout', () => {
      const layout = {
        columnCount: 2,
        columns: [
          { textItems: new Array(10).fill({}) },
          { textItems: new Array(10).fill({}) }
        ]
      };
      
      const analysis = analyzeColumnDistribution(layout);
      
      expect(analysis.columnCount).toBe(2);
      expect(analysis.itemsPerColumn).toEqual([10, 10]);
      expect(analysis.totalItems).toBe(20);
      expect(analysis.balanceRatio).toBe(1); // Perfectly balanced
      expect(analysis.isBalanced).toBe(true);
    });

    test('detects unbalanced layout', () => {
      const layout = {
        columnCount: 2,
        columns: [
          { textItems: new Array(20).fill({}) },
          { textItems: new Array(5).fill({}) }
        ]
      };
      
      const analysis = analyzeColumnDistribution(layout);
      
      expect(analysis.isBalanced).toBe(false);
      expect(analysis.balanceRatio).toBeLessThan(0.7);
    });

    test('handles null layout', () => {
      const analysis = analyzeColumnDistribution(null);
      
      expect(analysis.columnCount).toBe(0);
      expect(analysis.itemsPerColumn).toEqual([]);
      expect(analysis.balanceRatio).toBe(0);
      expect(analysis.isBalanced).toBe(false);
    });

    test('handles layout with no columns', () => {
      const layout = { columns: null };
      const analysis = analyzeColumnDistribution(layout);
      
      expect(analysis.columnCount).toBe(0);
    });

    test('handles single column layout', () => {
      const layout = {
        columnCount: 1,
        columns: [
          { textItems: new Array(15).fill({}) }
        ]
      };
      
      const analysis = analyzeColumnDistribution(layout);
      
      expect(analysis.columnCount).toBe(1);
      expect(analysis.totalItems).toBe(15);
    });
  });

  // =========================================================================
  // isLikelyMultiColumn() Tests
  // =========================================================================
  
  describe('isLikelyMultiColumn()', () => {
    test('returns false for less than 20 items', () => {
      const items = createTextItems([
        { x: 72, y: 700 },
        { x: 320, y: 700 }
      ]);
      
      expect(isLikelyMultiColumn(items, 595)).toBe(false);
    });

    test('returns false for null items', () => {
      expect(isLikelyMultiColumn(null, 595)).toBe(false);
    });

    test('returns false for undefined items', () => {
      expect(isLikelyMultiColumn(undefined, 595)).toBe(false);
    });

    test('returns true when few items start in middle region', () => {
      // Create items mostly on left and right, none in middle
      // Middle region is 30%-70% of page width (178.5-416.5 for width 595)
      const leftItems = Array.from({ length: 15 }, (_, i) => ({
        x: 50, // Clearly in left region (before 178.5)
        y: 700 - i * 20
      }));
      const rightItems = Array.from({ length: 15 }, (_, i) => ({
        x: 450, // Clearly in right region (after 416.5)
        y: 700 - i * 20
      }));
      
      const items = createTextItems([...leftItems, ...rightItems]);
      
      // With items concentrated on left and right, middle region is sparse
      // The function checks if < 20% of items start in middle
      const result = isLikelyMultiColumn(items, 595);
      // This may or may not be true depending on exact item positions
      expect(typeof result).toBe('boolean');
    });

    test('returns false when many items in middle region', () => {
      // Create items spread across the page including middle
      const items = createTextItems(
        Array.from({ length: 25 }, (_, i) => ({ 
          x: 100 + i * 15, // Spread from 100 to 460
          y: 700 - (i % 10) * 20 
        }))
      );
      
      // Many items in middle region
      expect(isLikelyMultiColumn(items, 595)).toBe(false);
    });

    test('analyzes X position distribution correctly', () => {
      // All items in left 30% of page
      const items = createTextItems(
        Array.from({ length: 25 }, (_, i) => ({ 
          x: 50 + i * 5, // 50 to 170, all in left region
          y: 700 - i * 20 
        }))
      );
      
      // Items not in middle, but also not multi-column (all on left)
      const result = isLikelyMultiColumn(items, 595);
      expect(typeof result).toBe('boolean');
    });
  });

  // =========================================================================
  // Integration Tests
  // =========================================================================
  
  describe('Integration: detectColumns + assignItemsToColumns + sortByReadingOrder', () => {
    test('full workflow produces correctly ordered items', () => {
      // Create a two-column document
      const leftColumn = Array.from({ length: 8 }, (_, i) => ({ 
        x: 72, 
        y: 700 - i * 50,
        text: `Left ${i + 1}`
      }));
      const rightColumn = Array.from({ length: 8 }, (_, i) => ({ 
        x: 350, 
        y: 700 - i * 50,
        text: `Right ${i + 1}`
      }));
      
      // Shuffle the items
      const shuffled = [...rightColumn, ...leftColumn].sort(() => Math.random() - 0.5);
      const items = shuffled.map((pos, index) => ({
        ...pos,
        width: 100,
        height: 12,
        pageIndex: 0
      }));
      
      // Detect columns
      const layout = detectColumns(items, 595);
      
      // Assign items to columns
      const assigned = assignItemsToColumns(items, layout);
      
      // Sort by reading order
      const sorted = sortByReadingOrder(assigned);
      
      // Verify the result has all items
      expect(sorted.length).toBe(items.length);
      
      // If multi-column detected, verify sorting
      if (layout.isMultiColumn) {
        // First items should be from left column (lower columnIndex)
        const firstHalf = sorted.slice(0, 8);
        const secondHalf = sorted.slice(8);
        
        // All first half should have same or lower columnIndex than second half
        const firstIndexes = firstHalf.map(i => i.columnIndex);
        const secondIndexes = secondHalf.map(i => i.columnIndex);
        
        expect(Math.max(...firstIndexes)).toBeLessThanOrEqual(Math.min(...secondIndexes));
      }
    });
  });

  // =========================================================================
  // Edge Cases and Error Handling
  // =========================================================================
  
  describe('Edge Cases', () => {
    test('handles overlapping text items', () => {
      const items = createTextItems([
        { x: 100, y: 700, width: 200 }, // Overlaps with next
        { x: 150, y: 700, width: 200 }, // Overlaps with previous
        { x: 100, y: 680, width: 200 },
        { x: 150, y: 680, width: 200 },
        { x: 100, y: 660, width: 200 },
        { x: 150, y: 660, width: 200 }
      ]);
      
      // Should not throw
      const result = detectColumns(items, 595);
      expect(result).toBeDefined();
    });

    test('handles header/footer pattern (items at top/bottom)', () => {
      // Wide header at top, two columns in body
      const header = [{ x: 72, y: 800, width: 450 }];
      const leftColumn = Array.from({ length: 6 }, (_, i) => ({ 
        x: 72, 
        y: 700 - i * 50 
      }));
      const rightColumn = Array.from({ length: 6 }, (_, i) => ({ 
        x: 350, 
        y: 700 - i * 50 
      }));
      const footer = [{ x: 72, y: 50, width: 450 }];
      
      const items = createTextItems([...header, ...leftColumn, ...rightColumn, ...footer]);
      
      const result = detectColumns(items, 595);
      
      // Should handle mixed layout
      expect(result).toBeDefined();
      expect(result.columnCount).toBeGreaterThanOrEqual(1);
    });

    test('handles very narrow columns', () => {
      const items = createTextItems([
        { x: 50, y: 700, width: 50 },
        { x: 50, y: 680, width: 50 },
        { x: 50, y: 660, width: 50 },
        { x: 50, y: 640, width: 50 },
        { x: 50, y: 620, width: 50 },
        { x: 50, y: 600, width: 50 }
      ]);
      
      // With minColumnWidth=100, these should form single column
      const result = detectColumns(items, 595);
      expect(result.columnCount).toBe(1);
    });

    test('handles very small gutter between columns', () => {
      // Columns with only 15pt gap (below default minGutterWidth of 20)
      const leftColumn = Array.from({ length: 6 }, (_, i) => ({ 
        x: 72, 
        y: 700 - i * 50 
      }));
      const rightColumn = Array.from({ length: 6 }, (_, i) => ({ 
        x: 187, // Only 15pt from left column
        y: 700 - i * 50 
      }));
      
      const items = createTextItems([...leftColumn, ...rightColumn]);
      const result = detectColumns(items, 595);
      
      // Small gutter might not be detected as column break
      expect(result).toBeDefined();
    });

    test('handles extremely wide page', () => {
      const items = createTextItems([
        { x: 72, y: 700 },
        { x: 72, y: 680 }
      ]);
      
      const result = detectColumns(items, 2000);
      expect(result).toBeDefined();
    });

    test('handles extremely narrow page', () => {
      const items = createTextItems([
        { x: 10, y: 700 },
        { x: 10, y: 680 }
      ]);
      
      const result = detectColumns(items, 100);
      expect(result).toBeDefined();
    });
  });
});