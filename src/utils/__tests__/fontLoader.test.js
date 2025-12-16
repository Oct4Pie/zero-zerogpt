/**
 * Unit tests for fontLoader module
 * Tests font loading, caching, and embedding functionality
 * 
 * @module __tests__/fontLoader.test
 */

import {
  loadNotoSansFont,
  loadCustomFont,
  getFontBytes,
  embedCustomFont,
  getEmbeddableFontBytes,
  supportsUnicode,
  getAvailableFonts,
  resetCDNStatus,
  preloadFonts,
  clearFontCache,
  areFontsLoaded,
  getCacheSize,
  isFontCached
} from '../fontLoader';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock dynamic imports
jest.mock('../assets/fonts/NotoSans-Regular.ttf', () => ({
  default: 'mock-font-url'
}), { virtual: true });

// Valid TTF file signature (0x00010000)
const createMockFontBytes = () => {
  const bytes = new Uint8Array(100);
  bytes[0] = 0x00;
  bytes[1] = 0x01;
  bytes[2] = 0x00;
  bytes[3] = 0x00;
  return bytes;
};

// Invalid font bytes (not a TTF)
const createInvalidFontBytes = () => {
  const bytes = new Uint8Array(100);
  bytes[0] = 0xFF;
  bytes[1] = 0xFF;
  bytes[2] = 0xFF;
  bytes[3] = 0xFF;
  return bytes;
};

describe('fontLoader', () => {
  beforeEach(() => {
    // Reset mocks and cache before each test
    jest.clearAllMocks();
    clearFontCache();
    resetCDNStatus();
    
    // Default fetch mock implementation
    mockFetch.mockImplementation(() => 
      Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(createMockFontBytes().buffer)
      })
    );
  });

  // =========================================================================
  // Cache Management Tests
  // =========================================================================
  
  describe('clearFontCache()', () => {
    test('clears all cached fonts', async () => {
      // Load a font first
      await loadNotoSansFont('regular');
      expect(getCacheSize()).toBeGreaterThan(0);
      
      // Clear cache
      clearFontCache();
      
      expect(getCacheSize()).toBe(0);
    });

    test('calling clearFontCache on empty cache does not throw', () => {
      expect(() => clearFontCache()).not.toThrow();
    });
  });

  describe('areFontsLoaded()', () => {
    test('returns false when no fonts are cached', () => {
      clearFontCache();
      expect(areFontsLoaded()).toBe(false);
    });

    test('returns true after loading default font', async () => {
      await loadNotoSansFont('regular');
      expect(areFontsLoaded()).toBe(true);
    });
  });

  describe('getCacheSize()', () => {
    test('returns 0 for empty cache', () => {
      expect(getCacheSize()).toBe(0);
    });

    test('returns correct count after loading fonts', async () => {
      await loadNotoSansFont('regular');
      expect(getCacheSize()).toBe(1);
      
      await loadNotoSansFont('bold');
      expect(getCacheSize()).toBe(2);
    });
  });

  describe('isFontCached()', () => {
    test('returns false for uncached font', () => {
      expect(isFontCached('NotoSans', 'regular')).toBe(false);
    });

    test('returns true for cached font', async () => {
      await loadNotoSansFont('regular');
      expect(isFontCached('NotoSans', 'regular')).toBe(true);
    });

    test('returns false for different weight of cached font', async () => {
      await loadNotoSansFont('regular');
      expect(isFontCached('NotoSans', 'bold')).toBe(false);
    });
  });

  // =========================================================================
  // loadNotoSansFont() Tests
  // =========================================================================
  
  describe('loadNotoSansFont()', () => {
    test('loads regular weight by default', async () => {
      const result = await loadNotoSansFont();
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(mockFetch).toHaveBeenCalled();
    });

    test('loads specified weight', async () => {
      const result = await loadNotoSansFont('bold');
      
      expect(result).toBeInstanceOf(Uint8Array);
    });

    test('returns cached font on subsequent calls', async () => {
      const first = await loadNotoSansFont('regular');
      const second = await loadNotoSansFont('regular');
      
      expect(first).toBe(second); // Same reference
      // Should only fetch once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('handles CDN fetch failure gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const result = await loadNotoSansFont('regular');
      
      // Should return null when all sources fail
      expect(result).toBeNull();
    });

    test('handles HTTP error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });
      
      const result = await loadNotoSansFont('regular');
      
      expect(result).toBeNull();
    });

    test('handles timeout', async () => {
      // Simulate abort error
      mockFetch.mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });
      
      const result = await loadNotoSansFont('regular');
      
      expect(result).toBeNull();
    });

    test('validates font file signature', async () => {
      // Return invalid font data
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(createInvalidFontBytes().buffer)
      });
      
      const result = await loadNotoSansFont('regular');
      
      expect(result).toBeNull();
    });

    test('rejects font data that is too small', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(5)) // Less than 12 bytes
      });
      
      const result = await loadNotoSansFont('regular');
      
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // loadCustomFont() Tests
  // =========================================================================
  
  describe('loadCustomFont()', () => {
    test('loads NotoSans font', async () => {
      const result = await loadCustomFont('NotoSans', 'regular');
      
      expect(result).toBeInstanceOf(Uint8Array);
    });

    test('returns null for unknown font family', async () => {
      mockFetch.mockRejectedValue(new Error('Not found'));
      
      const result = await loadCustomFont('UnknownFont', 'regular');
      
      expect(result).toBeNull();
    });

    test('returns null for unavailable weight', async () => {
      mockFetch.mockRejectedValue(new Error('Not found'));
      
      const result = await loadCustomFont('NotoSans', 'extraBold');
      
      expect(result).toBeNull();
    });

    test('uses cache for repeated loads', async () => {
      await loadCustomFont('NotoSans', 'regular');
      mockFetch.mockClear();
      
      await loadCustomFont('NotoSans', 'regular');
      
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('handles concurrent load requests', async () => {
      // Start multiple loads simultaneously
      const results = await Promise.all([
        loadCustomFont('NotoSans', 'regular'),
        loadCustomFont('NotoSans', 'regular'),
        loadCustomFont('NotoSans', 'regular')
      ]);
      
      // All should return same result
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
      
      // Should only fetch once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // getFontBytes() Tests
  // =========================================================================
  
  describe('getFontBytes()', () => {
    test('returns null for uncached font (synchronous)', () => {
      const result = getFontBytes('NotoSans', 'regular');
      expect(result).toBeNull();
    });

    test('returns cached font bytes', async () => {
      await loadNotoSansFont('regular');
      
      const result = getFontBytes('NotoSans', 'regular');
      
      expect(result).toBeInstanceOf(Uint8Array);
    });

    test('defaults to regular weight', async () => {
      await loadNotoSansFont('regular');
      
      const result = getFontBytes('NotoSans');
      
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  // =========================================================================
  // embedCustomFont() Tests
  // =========================================================================
  
  describe('embedCustomFont()', () => {
    test('embeds font into PDF document successfully', async () => {
      const mockPdfDoc = {
        embedFont: jest.fn().mockResolvedValue({ name: 'EmbeddedFont' })
      };
      
      const result = await embedCustomFont(mockPdfDoc, 'NotoSans', 'regular');
      
      expect(result.success).toBe(true);
      expect(result.font).toEqual({ name: 'EmbeddedFont' });
      expect(result.error).toBeNull();
      expect(mockPdfDoc.embedFont).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        { subset: true }
      );
    });

    test('returns failure when font cannot be loaded', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      clearFontCache();
      
      const mockPdfDoc = {
        embedFont: jest.fn()
      };
      
      const result = await embedCustomFont(mockPdfDoc, 'NotoSans', 'regular');
      
      expect(result.success).toBe(false);
      expect(result.font).toBeNull();
      expect(result.error).toContain('could not be loaded');
    });

    test('returns failure when embedFont throws', async () => {
      const mockPdfDoc = {
        embedFont: jest.fn().mockRejectedValue(new Error('Embed failed'))
      };
      
      const result = await embedCustomFont(mockPdfDoc, 'NotoSans', 'regular');
      
      expect(result.success).toBe(false);
      expect(result.font).toBeNull();
      expect(result.error).toBe('Embed failed');
    });

    test('uses default font name and weight', async () => {
      const mockPdfDoc = {
        embedFont: jest.fn().mockResolvedValue({ name: 'Font' })
      };
      
      await embedCustomFont(mockPdfDoc);
      
      // Should load NotoSans regular by default
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getEmbeddableFontBytes() Tests
  // =========================================================================
  
  describe('getEmbeddableFontBytes()', () => {
    test('returns font bytes for embedding', async () => {
      const result = await getEmbeddableFontBytes('NotoSans', 'regular');
      
      expect(result).toBeInstanceOf(Uint8Array);
    });

    test('uses default parameters', async () => {
      const result = await getEmbeddableFontBytes();
      
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  // =========================================================================
  // supportsUnicode() Tests
  // =========================================================================
  
  describe('supportsUnicode()', () => {
    test('returns true for NotoSans', () => {
      expect(supportsUnicode('NotoSans')).toBe(true);
    });

    test('returns true for NotoSerif', () => {
      expect(supportsUnicode('NotoSerif')).toBe(true);
    });

    test('returns true for NotoMono', () => {
      expect(supportsUnicode('NotoMono')).toBe(true);
    });

    test('returns false for unknown fonts', () => {
      expect(supportsUnicode('Arial')).toBe(false);
      expect(supportsUnicode('Helvetica')).toBe(false);
    });

    test('returns false for null/undefined', () => {
      expect(supportsUnicode(null)).toBe(false);
      expect(supportsUnicode(undefined)).toBe(false);
    });
  });

  // =========================================================================
  // getAvailableFonts() Tests
  // =========================================================================
  
  describe('getAvailableFonts()', () => {
    test('returns array of available font names', () => {
      const fonts = getAvailableFonts();
      
      expect(Array.isArray(fonts)).toBe(true);
      expect(fonts).toContain('NotoSans');
    });

    test('returns consistent result on multiple calls', () => {
      const first = getAvailableFonts();
      const second = getAvailableFonts();
      
      expect(first).toEqual(second);
    });
  });

  // =========================================================================
  // resetCDNStatus() Tests
  // =========================================================================
  
  describe('resetCDNStatus()', () => {
    test('allows CDN retry after reset', async () => {
      // Fail first attempt
      mockFetch.mockRejectedValueOnce(new Error('timed out'));
      await loadNotoSansFont('regular');
      
      // Reset CDN status
      resetCDNStatus();
      clearFontCache();
      
      // Should try CDN again
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(createMockFontBytes().buffer)
      });
      
      const result = await loadNotoSansFont('regular');
      
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  // =========================================================================
  // preloadFonts() Tests
  // =========================================================================
  
  describe('preloadFonts()', () => {
    test('preloads regular and bold weights', async () => {
      await preloadFonts();
      
      expect(isFontCached('NotoSans', 'regular')).toBe(true);
      expect(isFontCached('NotoSans', 'bold')).toBe(true);
    });

    test('handles partial load failure gracefully', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            arrayBuffer: () => Promise.resolve(createMockFontBytes().buffer)
          });
        }
        return Promise.reject(new Error('Failed'));
      });
      
      // Should not throw
      await expect(preloadFonts()).resolves.not.toThrow();
    });

    test('does not reload already cached fonts', async () => {
      // Load regular first
      await loadNotoSansFont('regular');
      mockFetch.mockClear();
      
      // Preload should only load bold
      await preloadFonts();
      
      // Should have fetched bold but not regular again
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Edge Cases and Error Handling
  // =========================================================================
  
  describe('Edge Cases', () => {
    test('handles empty response body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
      });
      
      const result = await loadNotoSansFont('regular');
      
      expect(result).toBeNull();
    });

    test('handles network timeout', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('Request timed out');
            error.name = 'AbortError';
            reject(error);
          }, 100);
        })
      );
      
      const result = await loadNotoSansFont('regular');
      
      expect(result).toBeNull();
    });

    test('handles OTF font signature', async () => {
      // Create bytes with OTTO signature (OpenType)
      const otfBytes = new Uint8Array(100);
      otfBytes[0] = 0x4F; // 'O'
      otfBytes[1] = 0x54; // 'T'
      otfBytes[2] = 0x54; // 'T'
      otfBytes[3] = 0x4F; // 'O'
      
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(otfBytes.buffer)
      });
      
      const result = await loadNotoSansFont('regular');
      
      // Should accept OTF format
      expect(result).toBeInstanceOf(Uint8Array);
    });

    test('memory: does not leak on repeated load/clear cycles', async () => {
      // Perform multiple load/clear cycles
      for (let i = 0; i < 10; i++) {
        await loadNotoSansFont('regular');
        await loadNotoSansFont('bold');
        clearFontCache();
      }
      
      // Cache should be empty after clearing
      expect(getCacheSize()).toBe(0);
    });

    test('handles special characters in font name', async () => {
      mockFetch.mockRejectedValue(new Error('Not found'));
      
      const result = await loadCustomFont('Font With Spaces', 'regular');
      
      expect(result).toBeNull();
    });

    test('handles very long font weight string', async () => {
      mockFetch.mockRejectedValue(new Error('Not found'));
      
      const longWeight = 'a'.repeat(1000);
      const result = await loadCustomFont('NotoSans', longWeight);
      
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // Integration Tests
  // =========================================================================
  
  describe('Integration: Load and Embed Workflow', () => {
    test('complete workflow: load font, verify cache, embed in PDF', async () => {
      // Step 1: Verify cache is empty
      expect(areFontsLoaded()).toBe(false);
      
      // Step 2: Load font
      const fontBytes = await loadNotoSansFont('regular');
      expect(fontBytes).toBeInstanceOf(Uint8Array);
      
      // Step 3: Verify cache is populated
      expect(areFontsLoaded()).toBe(true);
      expect(isFontCached('NotoSans', 'regular')).toBe(true);
      
      // Step 4: Get bytes synchronously
      const cachedBytes = getFontBytes('NotoSans', 'regular');
      expect(cachedBytes).toBe(fontBytes);
      
      // Step 5: Embed in PDF
      const mockPdfDoc = {
        embedFont: jest.fn().mockResolvedValue({ name: 'NotoSans-Regular' })
      };
      
      const embedResult = await embedCustomFont(mockPdfDoc, 'NotoSans', 'regular');
      expect(embedResult.success).toBe(true);
      
      // Step 6: Clear cache
      clearFontCache();
      expect(areFontsLoaded()).toBe(false);
    });
  });
});