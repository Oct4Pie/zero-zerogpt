import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  GridOn as LayoutIcon,
  TextFields as SimpleIcon
} from '@mui/icons-material';
import { usePdfGenerator } from '../hooks/usePdfGenerator';

/**
 * PdfDownloader Component
 *
 * A Material UI styled component for generating and downloading PDFs from text.
 * Supports customizable filenames and displays loading/error states.
 * Now supports layout-preserved PDF generation when enhancedPdfData is available.
 *
 * @param {Object} props - Component props
 * @param {string} props.text - The text content to generate PDF from
 * @param {string} props.defaultFilename - Default filename for the PDF (optional)
 * @param {Function} props.onDownloadComplete - Callback when download completes (optional)
 * @param {Function} props.onError - Callback when an error occurs (optional)
 * @param {Object} props.theme - MUI theme object for styling (optional)
 * @param {boolean} props.disabled - Whether the download button is disabled (optional)
 * @param {string} props.buttonText - Custom text for the download button (optional)
 * @param {string} props.variant - Button variant: 'button', 'iconButton', or 'fullWidth' (optional)
 * @param {string} props.size - Button size: 'small', 'medium', or 'large' (optional)
 * @param {Object} props.pdfOptions - Custom PDF generation options (optional)
 * @param {Object} props.enhancedPdfData - Enhanced PDF data with layout info for layout preservation (optional)
 * @param {boolean} props.isLayoutPreserved - Whether layout data is available (optional)
 */
const PdfDownloader = ({
  text,
  defaultFilename = 'transformed.pdf',
  onDownloadComplete,
  onError,
  theme,
  disabled = false,
  buttonText = 'Download PDF',
  variant = 'button',
  size = 'medium',
  pdfOptions = {},
  enhancedPdfData = null,
  isLayoutPreserved = false
}) => {
  const [filenameDialogOpen, setFilenameDialogOpen] = useState(false);
  const [customFilename, setCustomFilename] = useState(defaultFilename);
  const [showError, setShowError] = useState(false);
  
  const {
    isGenerating,
    generationError,
    generateAndDownloadPdf,
    generateAndDownloadPdfWithLayout,
    clearError
  } = usePdfGenerator();

  /**
   * Check if layout-preserved generation should be used
   */
  const shouldUseLayoutPreservation = useCallback(() => {
    return isLayoutPreserved &&
           enhancedPdfData &&
           enhancedPdfData.pageLayouts &&
           enhancedPdfData.pageLayouts.length > 0 &&
           enhancedPdfData.textItems &&
           enhancedPdfData.textItems.length > 0;
  }, [isLayoutPreserved, enhancedPdfData]);

  /**
   * Handles the download process - uses layout-preserved generation when available
   */
  const handleDownload = useCallback(async (filename = customFilename) => {
    try {
      setShowError(false);
      clearError();
      
      // Ensure filename ends with .pdf
      let safeFilename = filename;
      if (!safeFilename.toLowerCase().endsWith('.pdf')) {
        safeFilename += '.pdf';
      }
      
      // Use layout-preserved generation when enhanced data is available
      if (shouldUseLayoutPreservation()) {
        await generateAndDownloadPdfWithLayout(text, enhancedPdfData, {
          filename: safeFilename,
          preserveLayout: true,
          ...pdfOptions
        });
      } else {
        // Fall back to simple jsPDF generation
        await generateAndDownloadPdf(text, safeFilename, pdfOptions);
      }
      
      if (onDownloadComplete) {
        onDownloadComplete(safeFilename, shouldUseLayoutPreservation());
      }
      
      setFilenameDialogOpen(false);
    } catch (err) {
      setShowError(true);
      if (onError) {
        onError(err);
      }
    }
  }, [text, customFilename, pdfOptions, enhancedPdfData, generateAndDownloadPdf, generateAndDownloadPdfWithLayout, clearError, onDownloadComplete, onError, shouldUseLayoutPreservation]);

  /**
   * Opens the filename customization dialog
   */
  const handleOpenFilenameDialog = useCallback(() => {
    setCustomFilename(defaultFilename);
    setFilenameDialogOpen(true);
    setShowError(false);
  }, [defaultFilename]);

  /**
   * Closes the filename customization dialog
   */
  const handleCloseFilenameDialog = useCallback(() => {
    setFilenameDialogOpen(false);
    setShowError(false);
    clearError();
  }, [clearError]);

  /**
   * Handles Enter key in filename input
   */
  const handleFilenameKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !isGenerating && text) {
      handleDownload(customFilename);
    }
  }, [customFilename, isGenerating, text, handleDownload]);

  /**
   * Dismisses the error alert
   */
  const handleDismissError = useCallback(() => {
    setShowError(false);
    clearError();
  }, [clearError]);

  // Determine if download should be disabled
  const isDisabled = disabled || !text || text.trim().length === 0 || isGenerating;

  // Get the appropriate tooltip text based on layout preservation status
  const getTooltipText = useCallback(() => {
    if (isDisabled) return 'No text available';
    if (shouldUseLayoutPreservation()) {
      return `${buttonText} (Layout Preserved)`;
    }
    return `${buttonText} (Simple Format)`;
  }, [isDisabled, buttonText, shouldUseLayoutPreservation]);

  // Render icon button variant
  if (variant === 'iconButton') {
    return (
      <>
        <Tooltip title={getTooltipText()}>
          <span>
            <IconButton
              onClick={() => handleDownload(defaultFilename)}
              disabled={isDisabled}
              color={shouldUseLayoutPreservation() ? 'success' : 'primary'}
              size={size}
              sx={{
                transition: 'transform 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.1)'
                },
                '&:active': {
                  transform: 'scale(0.95)'
                }
              }}
            >
              {isGenerating ? (
                <CircularProgress size={size === 'small' ? 16 : 24} />
              ) : shouldUseLayoutPreservation() ? (
                <LayoutIcon fontSize={size} />
              ) : (
                <DownloadIcon fontSize={size} />
              )}
            </IconButton>
          </span>
        </Tooltip>
        
        {showError && generationError && (
          <Alert
            severity="error"
            sx={{ mt: 1 }}
            onClose={handleDismissError}
          >
            {generationError}
          </Alert>
        )}
      </>
    );
  }

  // Render full-width button variant with filename dialog
  if (variant === 'fullWidth') {
    return (
      <Box sx={{ width: '100%' }}>
        {showError && generationError && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={handleDismissError}
          >
            {generationError}
          </Alert>
        )}
        
        {/* Layout preservation indicator */}
        {shouldUseLayoutPreservation() && (
          <Box sx={{ mb: 1, display: 'flex', justifyContent: 'center' }}>
            <Chip
              icon={<LayoutIcon />}
              label="Layout Preserved Mode"
              size="small"
              color="success"
              variant="outlined"
            />
          </Box>
        )}
        
        <Button
          variant="contained"
          color={shouldUseLayoutPreservation() ? 'success' : 'primary'}
          startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> :
                     shouldUseLayoutPreservation() ? <LayoutIcon /> : <PdfIcon />}
          endIcon={<EditIcon fontSize="small" />}
          onClick={handleOpenFilenameDialog}
          disabled={isDisabled}
          fullWidth
          size={size}
          sx={{
            py: 1.5,
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 3
            }
          }}
        >
          {isGenerating ? 'Generating...' :
           shouldUseLayoutPreservation() ? `${buttonText} (Layout Preserved)` : buttonText}
        </Button>

        {/* Filename Customization Dialog */}
        <Dialog
          open={filenameDialogOpen}
          onClose={handleCloseFilenameDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {shouldUseLayoutPreservation() ? (
                <LayoutIcon color="success" />
              ) : (
                <PdfIcon color="error" />
              )}
              <Typography variant="h6">Download PDF</Typography>
              {shouldUseLayoutPreservation() && (
                <Chip
                  label="Layout Preserved"
                  size="small"
                  color="success"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
            <IconButton onClick={handleCloseFilenameDialog} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <DialogContent>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              {shouldUseLayoutPreservation()
                ? 'Your PDF will preserve the original font positions and layout.'
                : 'Customize the filename for your PDF download.'}
            </Typography>
            
            <TextField
              autoFocus
              fullWidth
              label="Filename"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              onKeyPress={handleFilenameKeyPress}
              placeholder="Enter filename"
              helperText=".pdf extension will be added automatically if not included"
              disabled={isGenerating}
              InputProps={{
                endAdornment: (
                  <Typography variant="body2" color="textSecondary">
                    {!customFilename.toLowerCase().endsWith('.pdf') && '.pdf'}
                  </Typography>
                )
              }}
            />
            
            {showError && generationError && (
              <Alert severity="error" sx={{ mt: 2 }} onClose={handleDismissError}>
                {generationError}
              </Alert>
            )}
          </DialogContent>
          
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseFilenameDialog} disabled={isGenerating}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color={shouldUseLayoutPreservation() ? 'success' : 'primary'}
              startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> :
                        shouldUseLayoutPreservation() ? <LayoutIcon /> : <DownloadIcon />}
              onClick={() => handleDownload(customFilename)}
              disabled={!customFilename.trim() || isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Download'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Default button variant
  return (
    <Box>
      {showError && generationError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={handleDismissError}
        >
          {generationError}
        </Alert>
      )}
      
      <Tooltip title={shouldUseLayoutPreservation() ? 'Layout will be preserved' : 'Simple text format'}>
        <Button
          variant="contained"
          color={shouldUseLayoutPreservation() ? 'success' : 'primary'}
          startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> :
                    shouldUseLayoutPreservation() ? <LayoutIcon /> : <DownloadIcon />}
          onClick={() => handleDownload(defaultFilename)}
          disabled={isDisabled}
          size={size}
          sx={{
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 3
            },
            '&:active': {
              transform: 'translateY(0)'
            }
          }}
        >
          {isGenerating ? 'Generating...' :
           shouldUseLayoutPreservation() ? `${buttonText} ✓` : buttonText}
        </Button>
      </Tooltip>
    </Box>
  );
};

export default PdfDownloader;