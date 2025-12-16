import { useState, useCallback } from 'react';

// Maximum file size allowed (10MB - Markdown files are typically smaller than PDFs)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Custom hook for handling Markdown file upload and text extraction
 * Uses the FileReader API for reading .md files as plain text
 *
 * @returns {Object} Markdown handler state and functions
 */
export const useMarkdownHandler = () => {
  // State for the Markdown file object
  const [markdownFile, setMarkdownFile] = useState(null);
  
  // State for the extracted text content
  const [markdownText, setMarkdownText] = useState('');
  
  // State for loading indicator during extraction
  const [isLoading, setIsLoading] = useState(false);
  
  // State for any extraction errors
  const [error, setError] = useState(null);
  
  // State for file metadata
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);

  /**
   * Validates the uploaded file
   * @param {File} file - The file to validate
   * @throws {Error} If validation fails
   */
  const validateFile = useCallback((file) => {
    if (!file) {
      throw new Error('No file provided');
    }
    
    // Check file type - accept .md, .markdown, and text/markdown MIME type
    const isMarkdownExtension = 
      file.name.toLowerCase().endsWith('.md') ||
      file.name.toLowerCase().endsWith('.markdown');
    const isMarkdownMime = 
      file.type === 'text/markdown' ||
      file.type === 'text/x-markdown' ||
      file.type === 'text/plain'; // Some systems report .md as text/plain
    
    if (!isMarkdownExtension && !isMarkdownMime) {
      throw new Error('Please upload a Markdown file (.md or .markdown). Only Markdown format is supported.');
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
    }
    
    // Check for empty file
    if (file.size === 0) {
      throw new Error('The file is empty. Please upload a Markdown file with content.');
    }
    
    return true;
  }, []);

  /**
   * Strips UTF-8 BOM from the beginning of a string if present
   * BOM (Byte Order Mark) is commonly added by Windows text editors
   * @param {string} text - The text to process
   * @returns {string} Text without BOM
   */
  const stripBOM = useCallback((text) => {
    if (text && text.charCodeAt(0) === 0xFEFF) {
      return text.slice(1);
    }
    return text;
  }, []);

  /**
   * Validates that the content appears to be valid UTF-8 text
   * Checks for common encoding issues
   * @param {string} text - The text to validate
   * @returns {boolean} True if the text appears valid
   */
  const isValidUtf8Content = useCallback((text) => {
    // Check for replacement character (indicates encoding issues)
    // U+FFFD is the replacement character used for invalid UTF-8 sequences
    const replacementCharCount = (text.match(/\uFFFD/g) || []).length;
    
    // If more than 1% of the content is replacement characters, likely encoding issue
    if (replacementCharCount > text.length * 0.01 && replacementCharCount > 10) {
      return false;
    }
    
    return true;
  }, []);

  /**
   * Reads and extracts text from a Markdown file
   * @param {File} file - The Markdown file to read
   * @returns {Promise<string>} The extracted text content
   */
  const handleMarkdownUpload = useCallback(async (file) => {
    setIsLoading(true);
    setError(null);
    setMarkdownText('');
    setMarkdownFile(null);
    setFileName('');
    setFileSize(0);

    try {
      // Validate the file first
      validateFile(file);
      
      // Store file metadata
      setMarkdownFile(file);
      setFileName(file.name);
      setFileSize(file.size);

      // Read file content using FileReader API
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          const content = event.target?.result;
          if (typeof content === 'string') {
            resolve(content);
          } else {
            reject(new Error('Failed to read file content as text.'));
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Failed to read file. The file may be corrupted or inaccessible.'));
        };
        
        reader.onabort = () => {
          reject(new Error('File reading was aborted.'));
        };
        
        // Read as UTF-8 text
        reader.readAsText(file, 'UTF-8');
      });

      // Strip BOM if present (Windows edge case)
      let processedText = stripBOM(text);
      
      // Validate content encoding
      if (!isValidUtf8Content(processedText)) {
        throw new Error(
          'The file appears to have encoding issues. ' +
          'Please ensure the file is saved as UTF-8 encoded text.'
        );
      }
      
      // Normalize line endings (convert CRLF to LF for consistency)
      processedText = processedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // Check if any meaningful content was extracted
      const trimmedText = processedText.trim();
      if (trimmedText.length === 0) {
        throw new Error(
          'The file appears to be empty or contains only whitespace. ' +
          'Please upload a Markdown file with content.'
        );
      }

      setMarkdownText(processedText);
      setIsLoading(false);
      
      return processedText;
    } catch (err) {
      // Handle specific error types
      let errorMessage = err.message || 'Failed to read Markdown file';
      
      if (err.name === 'NotReadableError') {
        errorMessage = 'Cannot read the file. It may be locked by another application.';
      } else if (err.name === 'SecurityError') {
        errorMessage = 'Access to the file was denied for security reasons.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
      setMarkdownFile(null);
      setFileName('');
      setFileSize(0);
      
      throw new Error(errorMessage);
    }
  }, [validateFile, stripBOM, isValidUtf8Content]);

  /**
   * Clears all Markdown-related state
   */
  const clearMarkdown = useCallback(() => {
    setMarkdownFile(null);
    setMarkdownText('');
    setIsLoading(false);
    setError(null);
    setFileName('');
    setFileSize(0);
  }, []);

  /**
   * Gets a preview of the extracted text (first 500 characters)
   * @returns {string} Text preview with ellipsis if truncated
   */
  const getTextPreview = useCallback(() => {
    if (!markdownText) return '';
    const maxLength = 500;
    if (markdownText.length <= maxLength) return markdownText;
    return markdownText.substring(0, maxLength) + '...';
  }, [markdownText]);

  /**
   * Gets file size in a human-readable format
   * @returns {string} Formatted file size
   */
  const getFormattedFileSize = useCallback(() => {
    if (!fileSize) return '';
    if (fileSize < 1024) return `${fileSize} bytes`;
    if (fileSize < 1024 * 1024) return `${(fileSize / 1024).toFixed(1)} KB`;
    return `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;
  }, [fileSize]);

  return {
    // State
    markdownFile,
    markdownText,
    isLoading,
    error,
    fileName,
    fileSize,
    
    // Functions
    handleMarkdownUpload,
    clearMarkdown,
    getTextPreview,
    getFormattedFileSize,
  };
};

export default useMarkdownHandler;