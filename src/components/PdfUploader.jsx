import React, { useCallback, useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  AlertTitle,
  IconButton,
  LinearProgress,
  Tooltip,
  Chip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  PictureAsPdf as PdfIcon,
  Delete as DeleteIcon,
  GridOn as LayoutIcon
} from '@mui/icons-material';
import { usePdfHandler } from '../hooks/usePdfHandler';

/**
 * PdfUploader Component
 *
 * A Material UI styled component for uploading and extracting text from PDF files.
 * Supports both drag-and-drop and click-to-upload functionality.
 * Now supports layout-aware extraction for font and position preservation.
 *
 * @param {Object} props - Component props
 * @param {Function} props.onTextExtracted - Callback when text is successfully extracted
 *        Signature: (text, fileName, pageCount, enhancedPdfData, isLayoutPreserved) => void
 * @param {Function} props.onError - Callback when an error occurs
 * @param {Object} props.theme - MUI theme object for styling
 */
const PdfUploader = ({ onTextExtracted, onError, theme }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  
  const {
    pdfFile,
    pdfText,
    isExtracting,
    extractionError,
    pageCount,
    progress,
    enhancedPdfData,
    isLayoutPreserved,
    extractPdfWithLayout,
    clearPdf,
    getTextPreview
  } = usePdfHandler();

  /**
   * Handles file drop event - uses layout-aware extraction
   */
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    try {
      // Use layout-aware extraction for font and position preservation
      const extractedData = await extractPdfWithLayout(file);
      
      // Build plain text from the extraction for display/transformation
      // IMPORTANT: Use direct concatenation (no spaces) to match character offsets
      // The text items already contain any necessary spacing from the PDF
      const plainText = extractedData.textItems
        .map(item => item.text)
        .join('');
      
      if (onTextExtracted) {
        // Pass both plain text and enhanced data with layout info
        onTextExtracted(
          plainText,
          file.name,
          extractedData.pageCount,
          extractedData,  // Full enhanced PDF data
          true            // Layout preserved flag
        );
      }
    } catch (err) {
      if (onError) {
        onError(err);
      }
    }
  }, [extractPdfWithLayout, onTextExtracted, onError]);

  /**
   * Handles drag over event
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  /**
   * Handles drag leave event
   */
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  /**
   * Handles file input change - uses layout-aware extraction
   */
  const handleFileSelect = useCallback(async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    try {
      // Use layout-aware extraction for font and position preservation
      const extractedData = await extractPdfWithLayout(file);
      
      // Build plain text from the extraction for display/transformation
      // IMPORTANT: Use direct concatenation (no spaces) to match character offsets
      // The text items already contain any necessary spacing from the PDF
      const plainText = extractedData.textItems
        .map(item => item.text)
        .join('');
      
      if (onTextExtracted) {
        // Pass both plain text and enhanced data with layout info
        onTextExtracted(
          plainText,
          file.name,
          extractedData.pageCount,
          extractedData,  // Full enhanced PDF data
          true            // Layout preserved flag
        );
      }
    } catch (err) {
      if (onError) {
        onError(err);
      }
    }

    // Reset file input to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [extractPdfWithLayout, onTextExtracted, onError]);

  /**
   * Handles click on upload zone
   */
  const handleUploadClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  /**
   * Handles clear/remove file action
   */
  const handleClear = useCallback(() => {
    clearPdf();
    if (onTextExtracted) {
      // Clear all data including enhanced PDF data
      onTextExtracted('', '', 0, null, false);
    }
  }, [clearPdf, onTextExtracted]);

  /**
   * Formats file size for display
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get colors based on theme
  const isDarkMode = theme?.palette?.mode === 'dark';
  const primaryColor = theme?.palette?.primary?.main || '#2196f3';
  const errorColor = theme?.palette?.error?.main || '#f44336';
  const backgroundColor = theme?.palette?.background?.paper || '#ffffff';
  const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)';
  const hoverBorderColor = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';

  return (
    <Box sx={{ width: '90%', mx: '5%', mb: 2 }}>
      {/* Hidden file input */}
      <input
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        ref={fileInputRef}
        id="pdf-upload-input"
      />

      {/* Error display */}
      {extractionError && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={handleClear}
        >
          <AlertTitle>PDF Extraction Error</AlertTitle>
          {extractionError}
        </Alert>
      )}

      {/* Main upload zone */}
      {!pdfFile && !isExtracting && (
        <Paper
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleUploadClick}
          sx={{
            p: 4,
            textAlign: 'center',
            border: '2px dashed',
            borderColor: isDragging ? primaryColor : borderColor,
            borderRadius: '8px',
            backgroundColor: isDragging 
              ? (isDarkMode ? 'rgba(144, 202, 249, 0.08)' : 'rgba(33, 150, 243, 0.05)')
              : backgroundColor,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': {
              borderColor: hoverBorderColor,
              backgroundColor: isDarkMode 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'rgba(0, 0, 0, 0.02)'
            }
          }}
        >
          <UploadIcon 
            sx={{ 
              fontSize: 64, 
              color: isDragging ? primaryColor : 'text.secondary',
              mb: 2,
              transition: 'color 0.3s ease'
            }} 
          />
          <Typography variant="h6" color="textPrimary" gutterBottom>
            {isDragging ? 'Drop your PDF here' : 'Drag & drop a PDF here'}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            or click to select a file
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PdfIcon />}
            onClick={(e) => {
              e.stopPropagation();
              handleUploadClick();
            }}
          >
            Select PDF File
          </Button>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 2 }}>
            Maximum file size: 25MB
          </Typography>
        </Paper>
      )}

      {/* Loading state */}
      {isExtracting && (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            border: '2px dashed',
            borderColor: primaryColor,
            borderRadius: '8px',
            backgroundColor: backgroundColor,
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="h6" color="textPrimary" gutterBottom>
            Extracting text from PDF...
          </Typography>
          <Box sx={{ width: '100%', maxWidth: 400, mt: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {progress}% complete
            </Typography>
          </Box>
        </Paper>
      )}

      {/* File info and preview */}
      {pdfFile && !isExtracting && !extractionError && (
        <Paper
          sx={{
            border: '1px solid',
            borderColor: borderColor,
            borderRadius: '8px',
            backgroundColor: backgroundColor,
            overflow: 'hidden'
          }}
        >
          {/* File header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderBottom: '1px solid',
              borderColor: borderColor,
              backgroundColor: isDarkMode
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(0, 0, 0, 0.02)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PdfIcon sx={{ fontSize: 40, color: errorColor }} />
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {pdfFile.name}
                  </Typography>
                  {isLayoutPreserved && (
                    <Tooltip title="Layout and font positions preserved for output">
                      <Chip
                        icon={<LayoutIcon />}
                        label="Layout Preserved"
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ height: 22, fontSize: '0.7rem' }}
                      />
                    </Tooltip>
                  )}
                </Box>
                <Typography variant="body2" color="textSecondary">
                  {formatFileSize(pdfFile.size)} • {pageCount} page{pageCount !== 1 ? 's' : ''} • {pdfText.length.toLocaleString()} characters
                  {enhancedPdfData && enhancedPdfData.fonts && enhancedPdfData.fonts.size > 0 && (
                    <> • {enhancedPdfData.fonts.size} font{enhancedPdfData.fonts.size !== 1 ? 's' : ''}</>
                  )}
                </Typography>
              </Box>
            </Box>
            <Tooltip title="Remove PDF">
              <IconButton
                onClick={handleClear}
                color="error"
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Text preview */}
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Extracted Text Preview:
            </Typography>
            <Box
              sx={{
                p: 2,
                backgroundColor: isDarkMode 
                  ? 'rgba(0, 0, 0, 0.2)' 
                  : 'rgba(0, 0, 0, 0.02)',
                borderRadius: '4px',
                maxHeight: '200px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: 'text.secondary'
              }}
            >
              {getTextPreview() || 'No text extracted'}
            </Box>
          </Box>

          {/* Upload new file button */}
          <Box sx={{ p: 2, pt: 0 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<UploadIcon />}
              onClick={handleUploadClick}
              fullWidth
            >
              Upload Different PDF
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default PdfUploader;