import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  TextField, Container, Typography, Box, Grid, AppBar, Toolbar,
  CssBaseline, Button, Card, CardContent, IconButton, Snackbar,
  useMediaQuery, Tooltip, Fade, Select, MenuItem, Chip, ToggleButton, ToggleButtonGroup,
  CircularProgress, Backdrop, Link
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
  FileCopy as FileCopyIcon, Clear as ClearIcon, DarkMode, LightMode, Add as AddIcon,
  TextFields, FormatColorText, PictureAsPdf, Download as DownloadIcon,
  DownloadForOffline as DownloadAllIcon, Description as MarkdownIcon, Lock as LockIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { FaGithub } from 'react-icons/fa';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './App.css';

import { unicodeSpaces, usageDescription } from './constants/unicodeSpaces';
import { usePersistedState } from './hooks/usePersistedState';

// PDF handling imports
import { usePdfGenerator } from './hooks/usePdfGenerator';
import PdfUploader from './components/PdfUploader';

// Markdown handling imports
import MarkdownUploader from './components/MarkdownUploader';
import { useMarkdownGenerator } from './hooks/useMarkdownGenerator';

// Register fonts with Quill
const Font = ReactQuill.Quill.import('formats/font');
Font.whitelist = [
  // Basic web fonts
  'sans-serif',
  'serif', 
  'monospace',
  
  // Web Safe Fonts
  'arial',
  'arial-black',
  'arial-narrow',
  'comic-sans',
  'courier',
  'courier-new',
  'georgia',
  'helvetica',
  'impact',
  'lucida-console',
  'lucida-sans',
  'palatino',
  'tahoma',
  'times',
  'times-new-roman',
  'trebuchet-ms',
  'verdana',
  
  // System Fonts
  'calibri',
  'cambria',
  'consolas',
  'franklin-gothic',
  'segoe-ui',
  'system-ui',
  'microsoft-sans-serif',
  'book-antiqua',
  'century-gothic',
  'lucida-grande',
  'optima',
  'futura',
  'avenir',
  'proxima-nova',
  
  // Google Fonts
  'open-sans',
  'roboto',
  'lato',
  'montserrat',
  'source-sans-pro',
  'raleway',
  'pt-sans',
  'ubuntu',
  'nunito',
  'poppins',
  'oswald',
  'merriweather',
  'playfair-display',
  'roboto-slab',
  'lora',
  'fira-sans',
  'noto-sans',
  'roboto-condensed',
  'source-serif-pro',
  'crimson-text',
  'pt-serif',
  'libre-baskerville',
  'bitter',
  'droid-sans',
  'droid-serif',
  
  // Classic Typography
  'garamond',
  'baskerville',
  'caslon',
  'gill-sans',
  'minion-pro',
  'myriad-pro',
  'adobe-garamond',
  'bookman',
  'avant-garde',
  'copperplate',
  'trajan',

  // Monospace Fonts
  'monaco',
  'menlo',
  'inconsolata',
  'source-code-pro',
  'fira-code',
  'dejavu-sans-mono',
  'liberation-mono',
  'anonymous-pro',
  'courier-prime'
];
ReactQuill.Quill.register(Font, true);

const App = () => {
  const [inputText, setInputText] = useState('');
  const [richText, setRichText] = useState('');
  const [inputMode, setInputMode] = usePersistedState('inputMode', 'rich');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = usePersistedState('mode', prefersDarkMode ? 'dark' : 'light');
  const [customSpaces, setCustomSpaces] = usePersistedState('customSpaces', []);
  const [selectedSpace, setSelectedSpace] = useState('');
  const [isPageDragging, setIsPageDragging] = useState(false);
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  
  // PDF state
  const [pdfFileName, setPdfFileName] = useState('');
  const [enhancedPdfData, setEnhancedPdfData] = useState(null);
  const [isLayoutPreserved, setIsLayoutPreserved] = useState(false);

  // Markdown state
  const [markdownFileName, setMarkdownFileName] = useState('');
  const [originalMarkdownText, setOriginalMarkdownText] = useState('');

  // Uploader refs for cross-component clear
  const pdfUploaderRef = useRef(null);
  const markdownUploaderRef = useRef(null);

  // Initialize PDF hooks
  const {
    isGenerating: isPdfGenerating,
    generateAndDownloadPdf,
    generateAndDownloadPdfWithLayout
  } = usePdfGenerator();

  // Initialize Markdown hooks
  const {
    isGenerating: isMarkdownGenerating,
    generateMarkdown
  } = useMarkdownGenerator();

  // Combined generating state
  const isGenerating = isPdfGenerating || isMarkdownGenerating;

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === 'light' ? '#2196f3' : '#90caf9',
          },
          secondary: {
            main: mode === 'light' ? '#f50057' : '#f48fb1',
          },
          background: {
            default: mode === 'light' ? '#f5f5f5' : '#121212',
            paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
          },
          text: {
            primary: mode === 'light' ? '#333333' : '#ffffff',
            secondary: mode === 'light' ? '#757575' : '#b0bec5',
          },
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          h4: {
            fontWeight: 700,
            marginBottom: '1rem',
            color: mode === 'light' ? '#1976d2' : '#90caf9',
          },
          h6: {
            fontWeight: 500,
            marginBottom: '0.5rem',
          },
          body1: {
            marginBottom: '0.75rem',
          },
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: mode === 'light' ? '#ffffff' : '#1e1e1e',
                color: mode === 'light' ? '#333333' : '#ffffff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                boxShadow: mode === 'light' 
                  ? '0 2px 4px rgba(0, 0, 0, 0.1)'
                  : '0 2px 4px rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: mode === 'light'
                    ? '0 4px 8px rgba(0, 0, 0, 0.15)'
                    : '0 4px 8px rgba(255, 255, 255, 0.1)',
                },
              },
            },
          },
          MuiCardContent: {
            styleOverrides: {
              root: {
                padding: '16px',
                '&:last-child': {
                  paddingBottom: '16px',
                },
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: '6px',
                textTransform: 'none',
                padding: '8px 16px',
                fontWeight: 500,
              },
            },
          },
        },
      }),
    [mode],
  );

  const invalidateUploadedSources = useCallback(() => {
    if (pdfFileName || enhancedPdfData) {
      setPdfFileName('');
      setEnhancedPdfData(null);
      setIsLayoutPreserved(false);
      pdfUploaderRef.current?.clear();
    }
    if (markdownFileName || originalMarkdownText) {
      setMarkdownFileName('');
      setOriginalMarkdownText('');
      markdownUploaderRef.current?.clear();
    }
  }, [pdfFileName, enhancedPdfData, markdownFileName, originalMarkdownText]);

  const handleInputChange = (event) => {
    setInputText(event.target.value);
    invalidateUploadedSources();
  };

  const handleRichTextChange = (content, delta, source, editor) => {
    setRichText(content);
    setInputText(editor.getText());
    if (source === 'user') {
      invalidateUploadedSources();
    }
  };

  const handleInputModeChange = (event, newMode) => {
    if (newMode !== null) {
      setInputMode(newMode);
    }
  };

  const replaceSpaces = useCallback((text, unicodeCharacter) => {
    return text.split(' ').join(unicodeCharacter);
  }, []);

  const replaceSpacesInHtml = useCallback((html, unicodeCharacter) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const walkTextNodes = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = replaceSpaces(node.textContent, unicodeCharacter);
      } else {
        for (let child of node.childNodes) {
          walkTextNodes(child);
        }
      }
    };

    walkTextNodes(doc.body);
    return doc.body.innerHTML;
  }, [replaceSpaces]);

  // Memoize each spacing variant once per (input, mode) so we don't run
  // 12 split/join + DOMParse passes on every render.
  const transformedTexts = useMemo(() => {
    const out = {};
    for (const [key, value] of Object.entries(unicodeSpaces)) {
      out[key] = replaceSpaces(inputText, value);
    }
    return out;
  }, [inputText, replaceSpaces]);

  const transformedHtml = useMemo(() => {
    if (inputMode !== 'rich') return {};
    const out = {};
    for (const [key, value] of Object.entries(unicodeSpaces)) {
      out[key] = replaceSpacesInHtml(richText, value);
    }
    return out;
  }, [richText, inputMode, replaceSpacesInHtml]);

  const customSpacingChars = useMemo(
    () => customSpaces.map((space) => unicodeSpaces[space]).join(''),
    [customSpaces]
  );

  const customSpacingText = useMemo(
    () => replaceSpaces(inputText, customSpacingChars),
    [inputText, customSpacingChars, replaceSpaces]
  );

  const customSpacingHtml = useMemo(
    () => (inputMode === 'rich' ? replaceSpacesInHtml(richText, customSpacingChars) : ''),
    [richText, inputMode, customSpacingChars, replaceSpacesInHtml]
  );

  // Word/char counts for whatever the active source is
  const sourceTextForStats = inputMode === 'rich' ? (richText ? new DOMParser().parseFromString(richText, 'text/html').body.textContent || '' : '') : inputText;
  const stats = useMemo(() => {
    const text = sourceTextForStats || '';
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text ? text.split(/\r?\n/).length : 0;
    return { chars, words, lines };
  }, [sourceTextForStats]);

  const getUnicodeCode = (text) => {
    return text.split('').map((char) => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase()).join('');
  };

  const handleClearText = () => {
    setInputText('');
    setRichText('');
    setPdfFileName('');
    setEnhancedPdfData(null);
    setIsLayoutPreserved(false);
    setMarkdownFileName('');
    setOriginalMarkdownText('');
    pdfUploaderRef.current?.clear();
    markdownUploaderRef.current?.clear();
  };

  // Markdown text extraction callback
  const handleMarkdownTextExtracted = useCallback((text, fileName) => {
    if (text) {
      setInputText(text);
      setOriginalMarkdownText(text);
      setMarkdownFileName(fileName || '');
      setSnackbarMessage(`Extracted text from ${fileName || 'Markdown file'} (${text.length.toLocaleString()} characters)`);
      setSnackbarOpen(true);
    } else {
      setOriginalMarkdownText('');
      setMarkdownFileName('');
    }
  }, []);

  // Markdown download handler - uses AST-based transformation
  const handleDownloadMarkdown = useCallback(async (unicodeCharacter, spaceName) => {
    try {
      const baseName = markdownFileName
        ? markdownFileName.replace(/\.(md|markdown)$/i, '')
        : 'transformed';
      const outputFileName = `${baseName}_${spaceName.replace(/\s+/g, '_')}.md`;
      
      await generateMarkdown(originalMarkdownText, unicodeCharacter, outputFileName);
      
      setSnackbarMessage(`Downloaded Markdown with ${spaceName} spacing!`);
      setSnackbarOpen(true);
    } catch (err) {
      setSnackbarMessage(`Error generating Markdown: ${err.message}`);
      setSnackbarOpen(true);
    }
  }, [originalMarkdownText, markdownFileName, generateMarkdown]);

  // PDF text extraction callback - now supports layout preservation
  const handlePdfTextExtracted = useCallback((text, fileName, pages, pdfData = null, layoutPreserved = false) => {
    setInputText(text);
    setPdfFileName(fileName);
    setEnhancedPdfData(pdfData);
    setIsLayoutPreserved(layoutPreserved);
    
    if (text) {
      const layoutMessage = layoutPreserved ? ' with layout preservation' : '';
      setSnackbarMessage(`Extracted text from ${fileName} (${pages} page${pages !== 1 ? 's' : ''})${layoutMessage}`);
      setSnackbarOpen(true);
    } else {
      // Clear enhanced data when text is cleared
      setEnhancedPdfData(null);
      setIsLayoutPreserved(false);
    }
  }, []);

  // PDF extraction error callback
  const handlePdfError = useCallback((error) => {
    setSnackbarMessage(`PDF Error: ${error.message}`);
    setSnackbarOpen(true);
  }, []);

  // PDF download handler - uses layout preservation when available
  const handleDownloadPdf = useCallback(async (unicodeCharacter, spaceName) => {
    const transformedText = replaceSpaces(inputText, unicodeCharacter);
    const baseName = pdfFileName
      ? pdfFileName.replace(/\.pdf$/i, '')
      : 'transformed';
    const outputFileName = `${baseName}_${spaceName.replace(/\s+/g, '_')}.pdf`;
    
    try {
      // Use layout-preserved generation when enhanced data is available
      if (inputMode === 'pdf' && isLayoutPreserved && enhancedPdfData &&
          enhancedPdfData.pageLayouts && enhancedPdfData.pageLayouts.length > 0 &&
          enhancedPdfData.textItems && enhancedPdfData.textItems.length > 0) {
        await generateAndDownloadPdfWithLayout(transformedText, enhancedPdfData, {
          filename: outputFileName,
          preserveLayout: true
        });
        setSnackbarMessage(`Downloaded PDF with ${spaceName} spacing (layout preserved)!`);
      } else {
        // Fall back to simple jsPDF generation
        await generateAndDownloadPdf(transformedText, outputFileName);
        setSnackbarMessage(`Downloaded PDF with ${spaceName} spacing!`);
      }
      setSnackbarOpen(true);
    } catch (err) {
      setSnackbarMessage(`Error generating PDF: ${err.message}`);
      setSnackbarOpen(true);
    }
  }, [inputText, pdfFileName, inputMode, replaceSpaces, generateAndDownloadPdf, generateAndDownloadPdfWithLayout, enhancedPdfData, isLayoutPreserved]);

  const handleCopyText = useCallback((text, key, isHtml = false) => {
    if (isHtml && inputMode === 'rich') {
      const blob = new Blob([text], { type: 'text/html' });
      const item = new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([inputText], { type: 'text/plain' }) });
      navigator.clipboard.write([item]).then(() => {
        setSnackbarMessage(`Copied formatted text with ${key} spacing!`);
        setSnackbarOpen(true);
      });
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setSnackbarMessage(`Copied text with ${key} spacing!`);
        setSnackbarOpen(true);
      });
    }
  }, [inputMode, inputText]);

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleToggleMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const handleAddCustomSpace = () => {
    if (selectedSpace && !customSpaces.includes(selectedSpace)) {
      setCustomSpaces([...customSpaces, selectedSpace]);
      setSelectedSpace('');
    }
  };

  const handleRemoveCustomSpace = (space) => {
    setCustomSpaces(customSpaces.filter(s => s !== space));
  };

  // "Download all variants" — produce one file per defined unicode space.
  // Sequential to keep memory bounded for large PDFs.
  const handleDownloadAll = useCallback(async () => {
    if (inputMode !== 'pdf' && inputMode !== 'markdown') return;
    if (!inputText && !originalMarkdownText) return;
    setIsBatchDownloading(true);
    try {
      const entries = Object.entries(unicodeSpaces);
      for (const [key, value] of entries) {
        if (inputMode === 'pdf') {
          await handleDownloadPdf(value, key);
        } else {
          await handleDownloadMarkdown(value, key);
        }
      }
      setSnackbarMessage(`Downloaded ${entries.length} ${inputMode === 'pdf' ? 'PDFs' : 'Markdown files'}.`);
      setSnackbarOpen(true);
    } finally {
      setIsBatchDownloading(false);
    }
  }, [inputMode, inputText, originalMarkdownText, handleDownloadPdf, handleDownloadMarkdown]);

  // Window-level drag-and-drop: drop a .pdf or .md anywhere on the page to
  // auto-switch to the right mode and ingest the file.
  const [pendingIngest, setPendingIngest] = useState(null); // { mode, file } or null

  useEffect(() => {
    const isFileDrag = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');
    const onDragOver = (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      setIsPageDragging(true);
    };
    const onDragLeave = (e) => {
      if (e.relatedTarget === null) setIsPageDragging(false);
    };
    const onDrop = (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      setIsPageDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      const name = file.name.toLowerCase();
      if (name.endsWith('.pdf')) {
        setInputMode('pdf');
        setPendingIngest({ mode: 'pdf', file });
      } else if (name.endsWith('.md') || name.endsWith('.markdown')) {
        setInputMode('markdown');
        setPendingIngest({ mode: 'markdown', file });
      } else {
        setSnackbarMessage('Unsupported file type. Drop a .pdf or .md file.');
        setSnackbarOpen(true);
      }
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [setInputMode]);

  // Hand the pending file to the matching uploader once it's mounted.
  useEffect(() => {
    if (!pendingIngest) return;
    if (pendingIngest.mode === 'pdf' && inputMode === 'pdf' && pdfUploaderRef.current?.ingestFile) {
      pdfUploaderRef.current.ingestFile(pendingIngest.file);
      setPendingIngest(null);
    } else if (pendingIngest.mode === 'markdown' && inputMode === 'markdown' && markdownUploaderRef.current?.ingestFile) {
      markdownUploaderRef.current.ingestFile(pendingIngest.file);
      setPendingIngest(null);
    }
  }, [pendingIngest, inputMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="fixed" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="h6" color="inherit" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Zero-ZeroGPT
          </Typography>
          <Tooltip title="View on GitHub">
            <IconButton
              color="inherit"
              aria-label="github"
              href="https://github.com/oct4pie/zero-zerogpt.git"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ mr: 2 }}
            >
              <FaGithub size={24} />
            </IconButton>
          </Tooltip>
          <Tooltip title={`Switch to ${mode === 'light' ? 'Dark' : 'Light'} Mode`}>
            <IconButton color="inherit" onClick={handleToggleMode} edge="end">
              {mode === 'light' ? <DarkMode /> : <LightMode />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Toolbar />
      <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
        <Box my={2}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            AI Content with Unicode Spacing
          </Typography>
          <Typography variant="body1" align="center" paragraph>
            Enter text to experiment with the impact of unicode space types on AI detection tools.
          </Typography>
          
          <Box display="flex" justifyContent="center" mb={2}>
            <ToggleButtonGroup
              value={inputMode}
              exclusive
              onChange={handleInputModeChange}
              aria-label="input mode"
            >
              <ToggleButton value="plain" aria-label="plain text">
                <TextFields sx={{ mr: 1 }} />
                Plain Text
              </ToggleButton>
              <ToggleButton value="rich" aria-label="rich text">
                <FormatColorText sx={{ mr: 1 }} />
                Rich Text
              </ToggleButton>
              <ToggleButton value="pdf" aria-label="pdf upload">
                <PictureAsPdf sx={{ mr: 1 }} />
                PDF
              </ToggleButton>
              <ToggleButton value="markdown" aria-label="markdown upload">
                <MarkdownIcon sx={{ mr: 1 }} />
                Markdown
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {inputMode === 'plain' ? (
            <TextField
              label="Input Text"
              variant="outlined"
              multiline
              minRows={12}
              maxRows={14}
              value={inputText}
              onChange={handleInputChange}
              margin="dense"
              placeholder="Enter your text here..."
              sx={{
                width:"90%",
                mx: "5%",
                borderRadius: '6px',
               '& .MuiOutlinedInput-root': {
                  backgroundColor: theme.palette.background.paper,
                },
              }}
            />
          ) : inputMode === 'rich' ? (
            <Box sx={{ width: '90%', mx: '5%', mb: 2 }}>
              <ReactQuill
                theme="snow"
                value={richText}
                onChange={handleRichTextChange}
                style={{
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: '6px'
                }}
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    [{ 'font': [
                      'sans-serif', 'serif', 'monospace',
                      'arial', 'arial-black', 'arial-narrow', 'comic-sans', 'courier', 'courier-new',
                      'georgia', 'helvetica', 'impact', 'lucida-console', 'lucida-sans', 'palatino',
                      'tahoma', 'times', 'times-new-roman', 'trebuchet-ms', 'verdana',
                      'calibri', 'cambria', 'consolas', 'franklin-gothic', 'segoe-ui', 'system-ui',
                      'microsoft-sans-serif', 'book-antiqua', 'century-gothic', 'lucida-grande',
                      'optima', 'futura', 'avenir', 'proxima-nova',
                      'open-sans', 'roboto', 'lato', 'montserrat', 'source-sans-pro', 'raleway',
                      'pt-sans', 'ubuntu', 'nunito', 'poppins', 'oswald', 'merriweather',
                      'playfair-display', 'roboto-slab', 'lora', 'fira-sans', 'noto-sans',
                      'roboto-condensed', 'source-serif-pro', 'crimson-text', 'pt-serif',
                      'libre-baskerville', 'bitter', 'droid-sans', 'droid-serif',
                      'garamond', 'baskerville', 'caslon', 'gill-sans', 'minion-pro', 'myriad-pro',
                      'adobe-garamond', 'bookman', 'avant-garde', 'copperplate', 'trajan',
                      'monaco', 'menlo', 'inconsolata', 'source-code-pro', 'fira-code',
                      'dejavu-sans-mono', 'liberation-mono', 'anonymous-pro', 'courier-prime'
                    ] }],
                    [{ 'size': ['small', false, 'large', 'huge'] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'align': [] }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'indent': '-1'}, { 'indent': '+1' }],
                    ['blockquote', 'code-block'],
                    ['link', 'image'],
                    ['clean']
                  ]
                }}
              />
            </Box>
          ) : inputMode === 'pdf' ? (
            <PdfUploader
              ref={pdfUploaderRef}
              onTextExtracted={handlePdfTextExtracted}
              onError={handlePdfError}
              theme={theme}
            />
          ) : (
            <MarkdownUploader
              ref={markdownUploaderRef}
              onTextExtracted={handleMarkdownTextExtracted}
              theme={theme}
            />
          )}
          <Box display="flex" justifyContent="center" alignItems="center" gap={2} flexWrap="wrap" mb={6} mt={2}>
            <Typography variant="caption" color="textSecondary">
              {stats.words.toLocaleString()} words · {stats.chars.toLocaleString()} chars · {stats.lines.toLocaleString()} lines
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleClearText}
              startIcon={<ClearIcon />}
            >
              Clear Text
            </Button>
            {(inputMode === 'pdf' || inputMode === 'markdown') &&
              (inputMode === 'pdf' ? !!inputText : !!originalMarkdownText) && (
              <Button
                variant="outlined"
                color="primary"
                onClick={handleDownloadAll}
                startIcon={isBatchDownloading ? <CircularProgress size={16} /> : <DownloadAllIcon />}
                disabled={isGenerating || isBatchDownloading}
              >
                Download all variants
              </Button>
            )}
          </Box>

          <Grid container spacing={2} mb={5}>
            {Object.entries(unicodeSpaces).map(([key, value]) => (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle1" color="primary" fontWeight="bold">
                        {key}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {getUnicodeCode(value)}
                      </Typography>
                    </Box>
                    {inputMode === 'rich' ? (
                      <Box
                        className="quill-output"
                        sx={{
                          mb: 1,
                          p: 1,
                          border: '1px solid rgba(0, 0, 0, 0.12)',
                          borderRadius: '4px',
                          backgroundColor: theme.palette.background.paper,
                          minHeight: '60px',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          '& p': { margin: '0 0 0.5em 0' },
                          '& p:last-child': { marginBottom: 0 },
                          '& ul, & ol': { paddingLeft: '1.5em', margin: '0.5em 0' },
                          '& blockquote': { borderLeft: '4px solid #ccc', marginLeft: 0, paddingLeft: '1em' },
                          '& pre': { background: '#f4f4f4', padding: '0.5em', borderRadius: '3px' },
                          '& h1': { fontSize: '2em', margin: '0.5em 0' },
                          '& h2': { fontSize: '1.5em', margin: '0.5em 0' },
                          '& h3': { fontSize: '1.17em', margin: '0.5em 0' }
                        }}
                        dangerouslySetInnerHTML={{
                          __html: transformedHtml[key] || ''
                        }}
                      />
                    ) : (
                      <TextField
                        variant="outlined"
                        fullWidth
                        multiline
                        minRows={1}
                        maxRows={10}
                        value={transformedTexts[key] || ''}
                        InputProps={{
                          readOnly: true,
                        }}
                        sx={{
                          mb: 1,
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: theme.palette.background.paper,
                            '& fieldset': {
                              borderColor: 'rgba(0, 0, 0, 0.12)',
                            },
                          },
                        }}
                      />
                    )}
                    <Typography variant="body2" color="textSecondary" fontSize="0.75rem">
                      {usageDescription[key]}
                    </Typography>
                    <Box display="flex" justifyContent="flex-end" mt={1} gap={0.5}>
                    <Tooltip title={`Copy text with ${key} spacing`}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleCopyText(
                          inputMode === 'rich' ? (transformedHtml[key] || '') : (transformedTexts[key] || ''),
                          key,
                          inputMode === 'rich'
                        )}
                      >
                        <FileCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {inputMode === 'pdf' && inputText && (
                      <Tooltip title={`Download PDF with ${key} spacing`}>
                        <span>
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => handleDownloadPdf(value, key)}
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <CircularProgress size={18} />
                            ) : (
                              <DownloadIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {inputMode === 'markdown' && originalMarkdownText && (
                      <Tooltip title={`Download Markdown with ${key} spacing`}>
                        <span>
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => handleDownloadMarkdown(value, key)}
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <CircularProgress size={18} />
                            ) : (
                              <DownloadIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Custom Unicode Spacing
              </Typography>
              <Box display="flex" alignItems="center" mb={2}>
                <Select
                  value={selectedSpace}
                  onChange={(e) => setSelectedSpace(e.target.value)}
                  displayEmpty
                  sx={{ mr: 2, minWidth: 200 }}
                >
                  <MenuItem value="" disabled>Select</MenuItem>
                  {Object.keys(unicodeSpaces).map((key) => (
                    <MenuItem key={key} value={key}>{key}</MenuItem>
                  ))}
                </Select>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAddCustomSpace}
                  startIcon={<AddIcon />}
                >
                  Add
                </Button>
              </Box>
              <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                {customSpaces.map((space) => (
                  <Chip
                    key={space}
                    label={space}
                    onDelete={() => handleRemoveCustomSpace(space)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
              {inputMode === 'rich' ? (
                <Box
                  className="quill-output"
                  sx={{
                    mb: 2,
                    p: 2,
                    border: '1px solid rgba(0, 0, 0, 0.23)',
                    borderRadius: '4px',
                    backgroundColor: theme.palette.background.paper,
                    minHeight: '250px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    '& p': { margin: '0 0 0.5em 0' },
                    '& p:last-child': { marginBottom: 0 },
                    '& ul, & ol': { paddingLeft: '1.5em', margin: '0.5em 0' },
                    '& blockquote': { borderLeft: '4px solid #ccc', marginLeft: 0, paddingLeft: '1em' },
                    '& pre': { background: '#f4f4f4', padding: '0.5em', borderRadius: '3px' },
                    '& h1': { fontSize: '2em', margin: '0.5em 0' },
                    '& h2': { fontSize: '1.5em', margin: '0.5em 0' },
                    '& h3': { fontSize: '1.17em', margin: '0.5em 0' }
                  }}
                  dangerouslySetInnerHTML={{
                    __html: customSpacingHtml
                  }}
                />
              ) : (
                <TextField
                  variant="outlined"
                  fullWidth
                  multiline
                  minRows={10}
                  maxRows={12}
                  value={customSpacingText}
                  InputProps={{
                    readOnly: true,
                  }}
                  sx={{ mb: 2 }}
                />
              )}
              <Box display="flex" justifyContent="flex-end" gap={0.5}>
                <Tooltip title="Copy custom spaced text">
                  <IconButton
                    color="primary"
                    onClick={() => handleCopyText(
                      inputMode === 'rich' ? customSpacingHtml : customSpacingText,
                      'Custom',
                      inputMode === 'rich'
                    )}
                  >
                    <FileCopyIcon />
                  </IconButton>
                </Tooltip>
                {inputMode === 'pdf' && inputText && (
                  <Tooltip title="Download PDF with custom spacing">
                    <span>
                      <IconButton
                        color="secondary"
                        onClick={() => handleDownloadPdf(customSpacingChars, 'Custom')}
                        disabled={isGenerating || customSpaces.length === 0}
                      >
                        {isGenerating ? (
                          <CircularProgress size={24} />
                        ) : (
                          <DownloadIcon />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
                {inputMode === 'markdown' && originalMarkdownText && (
                  <Tooltip title="Download Markdown with custom spacing">
                    <span>
                      <IconButton
                        color="secondary"
                        onClick={() => handleDownloadMarkdown(customSpacingChars, 'Custom')}
                        disabled={isGenerating || customSpaces.length === 0}
                      >
                        {isGenerating ? (
                          <CircularProgress size={24} />
                        ) : (
                          <DownloadIcon />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
      <Box
        component="footer"
        sx={{
          mt: 4, py: 3, px: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <LockIcon fontSize="small" color="success" />
          <Typography variant="body2" color="textSecondary">
            All processing happens in your browser. Your files never leave your device.
          </Typography>
        </Box>
        <Typography variant="caption" color="textSecondary">
          Source on{' '}
          <Link href="https://github.com/oct4pie/zero-zerogpt" target="_blank" rel="noopener noreferrer">
            GitHub
          </Link>.
        </Typography>
      </Box>
      <Backdrop
        open={isPageDragging}
        sx={{ zIndex: (t) => t.zIndex.modal + 1, color: '#fff', flexDirection: 'column', gap: 2 }}
      >
        <CloudUploadIcon sx={{ fontSize: 96 }} />
        <Typography variant="h5">Drop a .pdf or .md file to ingest</Typography>
      </Backdrop>
      <Snackbar
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={
          <Box display="flex" alignItems="center">
            <FileCopyIcon sx={{ mr: 1 }} />
            <Typography>{snackbarMessage}</Typography>
          </Box>
        }
        TransitionComponent={Fade}
      />
    </ThemeProvider>
  );
};

export default App;