import { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  createExtractedPdfData,
  createTextItem,
  createPageLayout,
  createDocumentMetadata,
  parseTransform
} from '../utils/pdfTypes';
import fontManager, { mapFontStyle } from '../utils/fontManager';
import { extractAndMergeColors } from '../utils/colorExtractor';

// Configure PDF.js worker using unpkg CDN with proper HTTPS
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// Maximum file size allowed (25MB)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Custom hook for handling PDF file upload and text extraction
 * Uses pdfjs-dist for reliable text extraction from PDF documents
 *
 * @returns {Object} PDF handler state and functions
 */
export const usePdfHandler = () => {
  // State for the PDF file object
  const [pdfFile, setPdfFile] = useState(null);
  
  // State for the extracted text as a single string
  const [pdfText, setPdfText] = useState('');
  
  // State for extracted text organized by page
  const [extractedPages, setExtractedPages] = useState([]);
  
  // State for loading indicator during extraction
  const [isExtracting, setIsExtracting] = useState(false);
  
  // State for any extraction errors
  const [extractionError, setExtractionError] = useState(null);
  
  // Additional metadata state
  const [pageCount, setPageCount] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // State for enhanced PDF data with layout information
  const [enhancedPdfData, setEnhancedPdfData] = useState(null);
  
  // State indicating if layout data is available
  const [isLayoutPreserved, setIsLayoutPreserved] = useState(false);

  /**
   * Validates the uploaded file
   * @param {File} file - The file to validate
   * @throws {Error} If validation fails
   */
  const validateFile = useCallback((file) => {
    if (!file) {
      throw new Error('No file provided');
    }
    
    // Check file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Please upload a PDF file. Only PDF format is supported.');
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
    }
    
    return true;
  }, []);

  /**
   * Extracts text from a PDF file
   * @param {File} file - The PDF file to extract text from
   * @returns {Promise<string>} The extracted text
   */
  const extractTextFromPdf = useCallback(async (file) => {
    setIsExtracting(true);
    setExtractionError(null);
    setProgress(0);
    setPdfText('');
    setExtractedPages([]);

    try {
      // Validate the file first
      validateFile(file);
      
      // Store the file reference
      setPdfFile(file);

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      const numPages = pdf.numPages;
      setPageCount(numPages);
      
      const pages = [];
      let fullText = '';

      // Extract text from each page
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Process text items and join them
        const pageText = textContent.items
          .filter(item => item.str) // Filter out empty items
          .map(item => item.str)
          .join(' ')
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        pages.push({
          pageNumber: i,
          text: pageText
        });
        
        // Add page break between pages
        if (pageText) {
          fullText += pageText + '\n\n';
        }
        
        // Update progress
        setProgress(Math.round((i / numPages) * 100));
      }

      const trimmedText = fullText.trim();
      
      // Check if any text was extracted
      if (trimmedText.length < 10) {
        throw new Error(
          'No text could be extracted from this PDF. ' +
          'This may be a scanned document or image-based PDF. ' +
          'Please use a PDF with selectable text.'
        );
      }

      setExtractedPages(pages);
      setPdfText(trimmedText);
      setIsExtracting(false);
      
      return trimmedText;
    } catch (err) {
      // Handle specific PDF.js errors
      let errorMessage = err.message;
      
      if (err.name === 'PasswordException') {
        errorMessage = 'This PDF is password protected. Please provide an unprotected PDF.';
      } else if (err.name === 'InvalidPDFException') {
        errorMessage = 'Invalid or corrupted PDF file. Please try a different file.';
      } else if (err.message.includes('fetch')) {
        errorMessage = 'Failed to load PDF. Please check your internet connection and try again.';
      }
      
      setExtractionError(errorMessage);
      setIsExtracting(false);
      setPdfFile(null);
      
      throw new Error(errorMessage);
    }
  }, [validateFile]);

  /**
   * Extract PDF with full layout information for font and position preservation
   * @param {File} file - The PDF file to extract layout from
   * @returns {Promise<import('../utils/pdfTypes').ExtractedPdfData>} The extracted PDF data with layout
   */
  const extractPdfWithLayout = useCallback(async (file) => {
    setIsExtracting(true);
    setExtractionError(null);
    setProgress(0);
    setEnhancedPdfData(null);
    setIsLayoutPreserved(false);

    try {
      // Validate the file first
      validateFile(file);
      
      // Store the file reference
      setPdfFile(file);

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      const numPages = pdf.numPages;
      setPageCount(numPages);
      
      // Initialize the extracted data structure
      const extractedData = createExtractedPdfData(file.name);
      extractedData.pageCount = numPages;
      
      // Extract document metadata
      try {
        const metadata = await pdf.getMetadata();
        if (metadata && metadata.info) {
          const info = metadata.info;
          extractedData.metadata = createDocumentMetadata();
          extractedData.metadata.title = info.Title || null;
          extractedData.metadata.author = info.Author || null;
          extractedData.metadata.subject = info.Subject || null;
          extractedData.metadata.creator = info.Creator || null;
          extractedData.metadata.creationDate = info.CreationDate ? new Date(info.CreationDate) : null;
          extractedData.metadata.modificationDate = info.ModDate ? new Date(info.ModDate) : null;
        }
      } catch (metadataError) {
        // Metadata extraction is optional, continue without it
        console.warn('Could not extract PDF metadata:', metadataError);
      }
      
      // Track all unique fonts found
      const fontsMap = new Map();
      
      // Also build plain text for backward compatibility
      const pages = [];
      let fullText = '';
      let hasAnyTextItems = false;
      
      // Track character offset for mapping transformed text back to text items
      let globalCharOffset = 0;

      // Extract content from each page
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        
        // Get page viewport for dimensions (scale 1.0 for PDF points)
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Create page layout info
        const pageLayout = createPageLayout(i - 1);
        pageLayout.width = viewport.width;
        pageLayout.height = viewport.height;
        
        // Get text content with enhanced options
        const textContent = await page.getTextContent({
          includeMarkedContent: true,
          disableCombineTextItems: false
        });
        
        // Calculate margins from content bounds
        let minX = viewport.width;
        let maxX = 0;
        let minY = viewport.height;
        let maxY = 0;
        
        // Process each text item
        const pageTextItems = [];
        let pageText = '';
        
        for (const item of textContent.items) {
          // Skip marked content items (they have no str property)
          if (!item.str && item.str !== '') {
            continue;
          }
          
          // Skip empty strings
          if (!item.str) {
            continue;
          }
          
          hasAnyTextItems = true;
          
          // Parse transform matrix to get position and font size
          const transform = item.transform || [1, 0, 0, 1, 0, 0];
          const parsed = parseTransform(transform);
          
          // Create text item with full positioning info
          const textItem = createTextItem();
          textItem.text = item.str;
          textItem.x = parsed.x;
          textItem.y = parsed.y;
          textItem.width = item.width || 0;
          textItem.height = item.height || parsed.fontSize;
          textItem.fontSize = parsed.fontSize || 12;
          textItem.fontName = item.fontName || '';
          textItem.fontStyle = mapFontStyle(item.fontName || '');
          textItem.pageIndex = i - 1;
          textItem.transform = transform;
          
          // Default color (black) - will be updated by color extraction
          textItem.color = { r: 0, g: 0, b: 0 };
          textItem.colorFromOperatorList = false;
          
          // Track character offset for this text item
          // This allows mapping transformed text back to original positions
          textItem.charOffsetStart = globalCharOffset;
          textItem.charOffsetEnd = globalCharOffset + item.str.length;
          globalCharOffset += item.str.length;
          
          pageTextItems.push(textItem);
          
          // Update bounds for margin calculation
          if (parsed.x < minX) minX = parsed.x;
          if (parsed.x + (item.width || 0) > maxX) maxX = parsed.x + (item.width || 0);
          if (parsed.y < minY) minY = parsed.y;
          if (parsed.y + textItem.height > maxY) maxY = parsed.y + textItem.height;
          
          // Track fonts
          if (item.fontName && !fontsMap.has(item.fontName)) {
            // Get font display name from styles if available
            let displayName = item.fontName;
            if (textContent.styles && textContent.styles[item.fontName]) {
              const style = textContent.styles[item.fontName];
              displayName = style.fontFamily || item.fontName;
            }
            
            const fontInfo = fontManager.parsePdfFontReference(item.fontName, displayName);
            fontsMap.set(item.fontName, fontInfo);
          }
          
          // Build page text
          pageText += item.str + ' ';
        }
        
        // Extract colors using operator list for accurate color data
        // This replaces the unreliable styles.fillColor approach
        let colorEnhancedItems = pageTextItems;
        try {
          colorEnhancedItems = await extractAndMergeColors(page, pageTextItems);
          console.log(`Page ${i}: Enhanced ${colorEnhancedItems.length} text items with color data`);
        } catch (colorErr) {
          console.warn(`Page ${i}: Color extraction failed, using default colors:`, colorErr.message);
          // Keep pageTextItems with default black colors
        }
        
        // Add color-enhanced items to extracted data
        for (const item of colorEnhancedItems) {
          extractedData.textItems.push(item);
        }
        
        // Calculate margins from content bounds (with fallbacks)
        if (colorEnhancedItems.length > 0) {
          pageLayout.margins = {
            left: Math.max(0, minX),
            right: Math.max(0, viewport.width - maxX),
            top: Math.max(0, viewport.height - maxY),
            bottom: Math.max(0, minY)
          };
        }
        
        extractedData.pageLayouts.push(pageLayout);
        
        // Build backward-compatible page text
        const cleanedPageText = pageText.replace(/\s+/g, ' ').trim();
        pages.push({
          pageNumber: i,
          text: cleanedPageText
        });
        
        if (cleanedPageText) {
          fullText += cleanedPageText + '\n\n';
        }
        
        // Update progress
        setProgress(Math.round((i / numPages) * 100));
      }
      
      // Store fonts map
      extractedData.fonts = fontsMap;
      
      // Check if any text was extracted
      const trimmedText = fullText.trim();
      
      if (!hasAnyTextItems || trimmedText.length < 10) {
        // Set error flag but still return partial data
        const errorMsg = 'No text could be extracted from this PDF. ' +
          'This may be a scanned document or image-based PDF. ' +
          'Please use a PDF with selectable text.';
        setExtractionError(errorMsg);
        setIsLayoutPreserved(false);
      } else {
        setIsLayoutPreserved(true);
      }
      
      // Update state with extracted data
      setExtractedPages(pages);
      setPdfText(trimmedText);
      setEnhancedPdfData(extractedData);
      setIsExtracting(false);
      
      return extractedData;
    } catch (err) {
      // Handle specific PDF.js errors
      let errorMessage = err.message;
      
      if (err.name === 'PasswordException') {
        errorMessage = 'This PDF is password protected. Please provide an unprotected PDF.';
      } else if (err.name === 'InvalidPDFException') {
        errorMessage = 'Invalid or corrupted PDF file. Please try a different file.';
      } else if (err.message.includes('fetch')) {
        errorMessage = 'Failed to load PDF. Please check your internet connection and try again.';
      }
      
      setExtractionError(errorMessage);
      setIsExtracting(false);
      setPdfFile(null);
      setEnhancedPdfData(null);
      setIsLayoutPreserved(false);
      
      throw new Error(errorMessage);
    }
  }, [validateFile]);

  /**
   * Clears all PDF-related state
   */
  const clearPdf = useCallback(() => {
    setPdfFile(null);
    setPdfText('');
    setExtractedPages([]);
    setIsExtracting(false);
    setExtractionError(null);
    setPageCount(0);
    setProgress(0);
    setEnhancedPdfData(null);
    setIsLayoutPreserved(false);
  }, []);

  /**
   * Gets a preview of the extracted text (first 500 characters)
   * @returns {string} Text preview with ellipsis if truncated
   */
  const getTextPreview = useCallback(() => {
    if (!pdfText) return '';
    const maxLength = 500;
    if (pdfText.length <= maxLength) return pdfText;
    return pdfText.substring(0, maxLength) + '...';
  }, [pdfText]);

  return {
    // State
    pdfFile,
    setPdfFile,
    pdfText,
    extractedPages,
    isExtracting,
    extractionError,
    pageCount,
    progress,
    
    // New: Enhanced PDF data with layout information
    enhancedPdfData,
    isLayoutPreserved,
    
    // Functions
    extractTextFromPdf,
    clearPdf,
    getTextPreview,
    
    // New: Enhanced extraction function
    extractPdfWithLayout,
  };
};

export default usePdfHandler;