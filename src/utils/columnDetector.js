/**
 * Column Detector Module
 * 
 * Multi-column layout detection from text positions.
 * Analyzes horizontal text item positions to identify column boundaries
 * for proper handling of multi-column documents like research papers,
 * newspapers, and magazines.
 * 
 * @module columnDetector
 */

import { createDefaultColumnLayout, createColumnDetectionConfig } from './pdfTypes';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default configuration for column detection
 * @type {import('./pdfTypes').ColumnDetectionConfig}
 */
const DEFAULT_CONFIG = createColumnDetectionConfig();

// ============================================================================
// Main Detection Functions
// ============================================================================

/**
 * Detect column layout from text items on a page
 * 
 * Algorithm:
 * 1. Collect all unique X positions (left edges) of text items
 * 2. Find significant gaps between items (potential column boundaries)
 * 3. Cluster gaps to find consistent column boundaries
 * 4. Build column definitions from boundaries
 * 
 * @param {import('./pdfTypes').TextItem[]} textItems - Text items from one page
 * @param {number} pageWidth - Page width in PDF points
 * @param {import('./pdfTypes').ColumnDetectionConfig} [config] - Detection configuration
 * @returns {import('./pdfTypes').ColumnLayout} Detected column layout
 * 
 * @example
 * const layout = detectColumns(pageTextItems, 595);
 * if (layout.isMultiColumn) {
 *   console.log(`Detected ${layout.columnCount} columns`);
 * }
 */
export function detectColumns(textItems, pageWidth, config = DEFAULT_CONFIG) {
  // Merge with defaults
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Handle edge cases
  if (!textItems || textItems.length === 0) {
    return createDefaultColumnLayout(pageWidth, 1);
  }
  
  // Not enough items for reliable multi-column detection
  if (textItems.length < cfg.minItemsPerColumn * 2) {
    return createDefaultColumnLayout(pageWidth, 1);
  }
  
  try {
    // Step 1: Collect all X positions (left edges)
    const xPositions = textItems
      .map(item => item.x)
      .filter(x => x >= 0 && x <= pageWidth)
      .sort((a, b) => a - b);
    
    if (xPositions.length === 0) {
      return createDefaultColumnLayout(pageWidth, 1);
    }
    
    // Step 2: Find significant gaps (potential column boundaries)
    const gaps = findSignificantGaps(xPositions, cfg.minGutterWidth);
    
    // No significant gaps = single column
    if (gaps.length === 0) {
      return createDefaultColumnLayout(pageWidth, 1);
    }
    
    // Step 3: Cluster gaps to find consistent column boundaries
    const boundaries = clusterGaps(gaps, pageWidth, cfg);
    
    // Step 4: Build column definitions
    const columns = buildColumns(boundaries, pageWidth, textItems, cfg);
    
    // Validate result
    if (columns.length < 1 || columns.length > cfg.maxColumns) {
      return createDefaultColumnLayout(pageWidth, 1);
    }
    
    // Validate minimum items per column
    const validColumns = columns.filter(col => col.textItems.length >= cfg.minItemsPerColumn);
    if (validColumns.length < 2) {
      return createDefaultColumnLayout(pageWidth, 1);
    }
    
    return {
      pageNumber: textItems[0]?.pageIndex + 1 || 1,
      columnCount: columns.length,
      columns,
      gutterWidth: calculateAverageGutter(columns),
      isMultiColumn: columns.length > 1
    };
  } catch (err) {
    console.warn('Column detection failed, using single column:', err.message);
    return createDefaultColumnLayout(pageWidth, 1);
  }
}

/**
 * Assign text items to detected columns
 * Each text item gets a columnIndex based on its X position.
 * 
 * @param {import('./pdfTypes').TextItem[]} textItems - Text items to assign
 * @param {import('./pdfTypes').ColumnLayout} columnLayout - Detected layout
 * @returns {import('./pdfTypes').TextItem[]} Items with columnIndex assigned
 * 
 * @example
 * const itemsWithColumns = assignItemsToColumns(textItems, columnLayout);
 * const leftColumnItems = itemsWithColumns.filter(i => i.columnIndex === 0);
 */
export function assignItemsToColumns(textItems, columnLayout) {
  if (!textItems || textItems.length === 0) {
    return [];
  }
  
  if (!columnLayout || !columnLayout.columns || columnLayout.columns.length === 0) {
    return textItems.map(item => ({ ...item, columnIndex: 0 }));
  }
  
  return textItems.map(item => {
    const columnIndex = findColumnForPosition(item.x, columnLayout.columns);
    return { ...item, columnIndex };
  });
}

/**
 * Sort text items in reading order (column by column, top to bottom)
 * For multi-column documents, this ensures text flows correctly.
 * 
 * @param {import('./pdfTypes').TextItem[]} textItems - Items with columnIndex assigned
 * @returns {import('./pdfTypes').TextItem[]} Sorted items in reading order
 * 
 * @example
 * const sorted = sortByReadingOrder(itemsWithColumns);
 * // Items now flow: left column top-to-bottom, then right column top-to-bottom
 */
export function sortByReadingOrder(textItems) {
  if (!textItems || textItems.length === 0) {
    return [];
  }
  
  return [...textItems].sort((a, b) => {
    // First sort by column index (left to right)
    const colA = a.columnIndex ?? 0;
    const colB = b.columnIndex ?? 0;
    if (colA !== colB) {
      return colA - colB;
    }
    
    // Then by Y position (top to bottom in reading order)
    // PDF Y is bottom-up, so higher Y = higher on page = comes first in reading
    const yDiff = Math.abs(a.y - b.y);
    if (yDiff > 5) {
      return b.y - a.y;  // Descending Y for reading order
    }
    
    // Finally by X position for items on same line
    return a.x - b.x;
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find significant gaps between X positions
 * A gap is significant if it's larger than the minimum gutter width.
 * 
 * @param {number[]} xPositions - Sorted array of X positions
 * @param {number} minGutterWidth - Minimum gap width to consider significant
 * @returns {Array<{position: number, width: number}>} Array of gaps
 */
function findSignificantGaps(xPositions, minGutterWidth) {
  const gaps = [];
  
  for (let i = 1; i < xPositions.length; i++) {
    const gap = xPositions[i] - xPositions[i - 1];
    if (gap >= minGutterWidth) {
      gaps.push({
        position: (xPositions[i] + xPositions[i - 1]) / 2,
        width: gap
      });
    }
  }
  
  return gaps;
}

/**
 * Cluster gaps to find consistent column boundaries
 * Groups nearby gaps together to identify column breaks.
 * 
 * @param {Array<{position: number, width: number}>} gaps - Detected gaps
 * @param {number} pageWidth - Page width in points
 * @param {import('./pdfTypes').ColumnDetectionConfig} config - Configuration
 * @returns {number[]} Array of X positions marking column boundaries
 */
function clusterGaps(gaps, pageWidth, config) {
  if (gaps.length === 0) {
    return [];
  }
  
  // Sort gaps by position
  const sortedGaps = [...gaps].sort((a, b) => a.position - b.position);
  
  // Cluster nearby gaps (within 20% of min gutter width)
  const clusterThreshold = config.minGutterWidth * 0.2;
  const clusters = [];
  let currentCluster = [sortedGaps[0]];
  
  for (let i = 1; i < sortedGaps.length; i++) {
    const gap = sortedGaps[i];
    const lastInCluster = currentCluster[currentCluster.length - 1];
    
    if (gap.position - lastInCluster.position < clusterThreshold) {
      currentCluster.push(gap);
    } else {
      clusters.push(currentCluster);
      currentCluster = [gap];
    }
  }
  clusters.push(currentCluster);
  
  // Take the largest gap from each cluster as the boundary
  const boundaries = clusters
    .map(cluster => {
      // Find the gap with the largest width in the cluster
      const largestGap = cluster.reduce((max, g) => g.width > max.width ? g : max, cluster[0]);
      return largestGap.position;
    })
    .filter(pos => pos > config.minColumnWidth && pos < pageWidth - config.minColumnWidth);
  
  // Limit to maxColumns - 1 boundaries
  if (boundaries.length >= config.maxColumns) {
    // Keep the boundaries with widest gaps
    const sortedByWidth = boundaries
      .map((pos, i) => ({
        pos,
        width: gaps.find(g => Math.abs(g.position - pos) < clusterThreshold)?.width || 0
      }))
      .sort((a, b) => b.width - a.width)
      .slice(0, config.maxColumns - 1)
      .sort((a, b) => a.pos - b.pos)
      .map(item => item.pos);
    
    return sortedByWidth;
  }
  
  return boundaries;
}

/**
 * Build column definitions from boundaries
 * 
 * @param {number[]} boundaries - X positions of column boundaries
 * @param {number} pageWidth - Page width in points
 * @param {import('./pdfTypes').TextItem[]} textItems - Text items for assignment
 * @param {import('./pdfTypes').ColumnDetectionConfig} config - Configuration
 * @returns {import('./pdfTypes').ColumnInfo[]} Array of column definitions
 */
function buildColumns(boundaries, pageWidth, textItems, config) {
  const columns = [];
  let leftBound = 0;
  
  // Create columns from boundaries
  const sortedBoundaries = [...boundaries].sort((a, b) => a - b);
  
  for (let i = 0; i <= sortedBoundaries.length; i++) {
    const rightBound = i < sortedBoundaries.length ? sortedBoundaries[i] : pageWidth;
    const width = rightBound - leftBound;
    
    // Skip columns that are too narrow
    if (width >= config.minColumnWidth) {
      const column = {
        index: columns.length,
        id: columns.length,
        x: leftBound,
        leftBound,
        rightBound,
        width,
        gapToNext: 0,
        textItems: []
      };
      
      // Assign text items to this column
      column.textItems = textItems.filter(item => 
        item.x >= leftBound && item.x < rightBound
      );
      
      columns.push(column);
    }
    
    leftBound = rightBound;
  }
  
  // Calculate gaps between columns
  for (let i = 0; i < columns.length - 1; i++) {
    columns[i].gapToNext = columns[i + 1].leftBound - columns[i].rightBound;
  }
  
  return columns;
}

/**
 * Calculate average gutter width between columns
 * 
 * @param {import('./pdfTypes').ColumnInfo[]} columns - Column definitions
 * @returns {number} Average gutter width in points
 */
function calculateAverageGutter(columns) {
  if (columns.length <= 1) {
    return 0;
  }
  
  const gaps = columns
    .slice(0, -1)
    .map(col => col.gapToNext)
    .filter(gap => gap > 0);
  
  if (gaps.length === 0) {
    return 0;
  }
  
  return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
}

/**
 * Find which column a given X position belongs to
 * 
 * @param {number} x - X position to check
 * @param {import('./pdfTypes').ColumnInfo[]} columns - Column definitions
 * @returns {number} Column index (0-based), or -1 if not in any column
 */
function findColumnForPosition(x, columns) {
  for (const column of columns) {
    if (x >= column.leftBound && x < column.rightBound) {
      return column.index;
    }
  }
  
  // If not in any column, find the nearest one
  let nearestColumn = 0;
  let nearestDistance = Infinity;
  
  for (const column of columns) {
    const distToLeft = Math.abs(x - column.leftBound);
    const distToRight = Math.abs(x - column.rightBound);
    const minDist = Math.min(distToLeft, distToRight);
    
    if (minDist < nearestDistance) {
      nearestDistance = minDist;
      nearestColumn = column.index;
    }
  }
  
  return nearestColumn;
}

// ============================================================================
// Analysis Utilities
// ============================================================================

/**
 * Analyze text distribution across columns
 * Useful for debugging and quality assessment.
 * 
 * @param {import('./pdfTypes').ColumnLayout} layout - Detected layout
 * @returns {Object} Analysis results
 */
export function analyzeColumnDistribution(layout) {
  if (!layout || !layout.columns) {
    return {
      columnCount: 0,
      itemsPerColumn: [],
      balanceRatio: 0,
      isBalanced: false
    };
  }
  
  const itemCounts = layout.columns.map(col => col.textItems.length);
  const totalItems = itemCounts.reduce((sum, count) => sum + count, 0);
  const avgItems = totalItems / layout.columnCount;
  
  // Balance ratio: 1.0 = perfectly balanced, lower = less balanced
  const variance = itemCounts.reduce((sum, count) => sum + Math.pow(count - avgItems, 2), 0) / layout.columnCount;
  const stdDev = Math.sqrt(variance);
  const balanceRatio = avgItems > 0 ? Math.max(0, 1 - (stdDev / avgItems)) : 0;
  
  return {
    columnCount: layout.columnCount,
    itemsPerColumn: itemCounts,
    totalItems,
    balanceRatio,
    isBalanced: balanceRatio > 0.7
  };
}

/**
 * Check if a page likely has a multi-column layout
 * Quick heuristic check without full detection.
 * 
 * @param {import('./pdfTypes').TextItem[]} textItems - Text items from page
 * @param {number} pageWidth - Page width in points
 * @returns {boolean} True if multi-column layout is likely
 */
export function isLikelyMultiColumn(textItems, pageWidth) {
  if (!textItems || textItems.length < 20) {
    return false;
  }
  
  const xPositions = textItems.map(item => item.x).sort((a, b) => a - b);
  const middleRegion = pageWidth * 0.4;  // Middle 40% of page
  const middleStart = pageWidth * 0.3;
  const middleEnd = pageWidth * 0.7;
  
  // Count items in middle region vs total
  const middleItems = xPositions.filter(x => x >= middleStart && x <= middleEnd);
  const middleRatio = middleItems.length / xPositions.length;
  
  // If less than 20% of items start in the middle, likely multi-column
  return middleRatio < 0.2;
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  detectColumns,
  assignItemsToColumns,
  sortByReadingOrder,
  analyzeColumnDistribution,
  isLikelyMultiColumn
};