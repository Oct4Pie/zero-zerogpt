import { useState, useCallback } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';

/**
 * Custom hook for generating Markdown files with Unicode space transformations
 * Uses remark (unified ecosystem) for AST-based manipulation to preserve
 * Markdown syntax while only transforming text content.
 *
 * This approach ensures:
 * - Code blocks (```code```) are NOT modified
 * - URLs in links/images are NOT modified
 * - Only actual text content receives Unicode space transformation
 *
 * @returns {Object} Markdown generator state and functions
 */
export const useMarkdownGenerator = () => {
  // State for loading indicator during generation
  const [isGenerating, setIsGenerating] = useState(false);
  
  // State for any generation errors
  const [error, setError] = useState(null);

  /**
   * Transforms Markdown text by replacing regular spaces with Unicode spaces
   * Uses AST-based approach to only modify text nodes, preserving:
   * - Code blocks (inline and fenced)
   * - Link URLs
   * - Image URLs
   * - HTML content
   *
   * @param {string} markdownText - The original Markdown text
   * @param {string} unicodeSpaceChar - The Unicode space character(s) to use
   * @returns {Promise<string>} The transformed Markdown text
   */
  const transformMarkdownText = useCallback(async (markdownText, unicodeSpaceChar) => {
    if (!markdownText || typeof markdownText !== 'string') {
      throw new Error('Invalid markdown text provided');
    }

    if (!unicodeSpaceChar) {
      throw new Error('No Unicode space character provided');
    }

    try {
      // Create a unified processor with remark plugins
      const processor = unified()
        .use(remarkParse) // Parse Markdown to MDAST (Markdown Abstract Syntax Tree)
        .use(() => (tree) => {
          // Visit only text nodes - this ensures we don't modify:
          // - 'code' nodes (inline code)
          // - 'inlineCode' nodes
          // - 'link' nodes (the URL part is separate from text)
          // - 'image' nodes (the URL part)
          // - 'html' nodes (raw HTML)
          visit(tree, 'text', (node) => {
            // Replace regular spaces with the specified Unicode space character(s)
            // This is the same logic used in App.js replaceSpaces function
            node.value = node.value.split(' ').join(unicodeSpaceChar);
          });
        })
        .use(remarkStringify, {
          // Preserve original formatting as much as possible
          bullet: '-',
          emphasis: '*',
          strong: '*',
          fence: '`',
          fences: true,
          listItemIndent: 'one',
        });

      // Process the markdown text through the pipeline
      const file = await processor.process(markdownText);
      
      return String(file);
    } catch (err) {
      console.error('Markdown transformation error:', err);
      throw new Error(`Failed to transform Markdown: ${err.message}`);
    }
  }, []);

  /**
   * Creates a downloadable Blob from Markdown content
   *
   * @param {string} markdownContent - The Markdown content to create a blob from
   * @returns {Blob} A Blob object with the Markdown content
   */
  const createMarkdownBlob = useCallback((markdownContent) => {
    if (!markdownContent || typeof markdownContent !== 'string') {
      throw new Error('Invalid content for Blob creation');
    }

    return new Blob([markdownContent], { 
      type: 'text/markdown;charset=utf-8' 
    });
  }, []);

  /**
   * Triggers a download of the provided Blob with the specified filename
   *
   * @param {Blob} blob - The Blob to download
   * @param {string} filename - The filename for the download
   */
  const downloadBlob = useCallback((blob, filename = 'document.md') => {
    if (!(blob instanceof Blob)) {
      throw new Error('Invalid blob provided for download');
    }

    // Ensure filename ends with .md
    let safeFilename = filename;
    if (!safeFilename.toLowerCase().endsWith('.md') && 
        !safeFilename.toLowerCase().endsWith('.markdown')) {
      safeFilename += '.md';
    }

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element to trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename;
    
    // Append to body, click, and cleanup
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke the URL to free up memory
    URL.revokeObjectURL(url);
  }, []);

  /**
   * Generates and downloads a Markdown file with Unicode space transformations
   * This is the main function to use for Markdown generation and download
   *
   * @param {string} markdownText - The original Markdown text
   * @param {string} unicodeSpaceChar - The Unicode space character(s) to use
   * @param {string} filename - The output filename (default: 'transformed.md')
   * @returns {Promise<boolean>} True if successful
   */
  const generateMarkdown = useCallback(async (markdownText, unicodeSpaceChar, filename = 'transformed.md') => {
    setIsGenerating(true);
    setError(null);

    try {
      // Validate inputs
      if (!markdownText || typeof markdownText !== 'string') {
        throw new Error('No Markdown text provided for generation');
      }

      if (markdownText.trim().length === 0) {
        throw new Error('Cannot generate Markdown from empty text');
      }

      if (!unicodeSpaceChar) {
        throw new Error('No Unicode space character specified');
      }

      // Transform the Markdown text
      const transformedText = await transformMarkdownText(markdownText, unicodeSpaceChar);

      // Create a blob from the transformed content
      const blob = createMarkdownBlob(transformedText);

      // Trigger the download
      downloadBlob(blob, filename);

      setIsGenerating(false);
      return true;
    } catch (err) {
      const errorMessage = err.message || 'Failed to generate Markdown';
      console.error('Markdown generation error:', errorMessage);
      setError(errorMessage);
      setIsGenerating(false);
      throw new Error(errorMessage);
    }
  }, [transformMarkdownText, createMarkdownBlob, downloadBlob]);

  /**
   * Clears any generation errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Resets the generator state
   */
  const reset = useCallback(() => {
    setIsGenerating(false);
    setError(null);
  }, []);

  return {
    // State
    isGenerating,
    error,
    
    // Core functions
    generateMarkdown,
    transformMarkdownText,
    downloadBlob,
    
    // Utility functions
    createMarkdownBlob,
    clearError,
    reset,
  };
};

export default useMarkdownGenerator;