import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Copy,
  Check,
  Search,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileJson,
  FileArchive,
  FileAudio,
  FileVideo,
  File as GenericFileIcon,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { renderAsync } from 'docx-preview';
import 'x-data-spreadsheet/dist/xspreadsheet.js';
import 'x-data-spreadsheet/dist/xspreadsheet.css';
import { apiFetch } from '../../api/client';
import { getApiUrl } from '../../api/config';

/**
 * Universal file downloader that fetches blob with credentials and triggers a clean download
 */
export async function downloadAttachment(fileUrl, fileName) {
  try {
    const res = await fetch(fileUrl, { credentials: 'include' });
    if (!res.ok) throw new Error('Download request failed');
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName || 'attachment';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    const link = document.createElement('a');
    const separator = fileUrl.includes('?') ? '&' : '?';
    link.href = `${fileUrl}${separator}download=1&filename=${encodeURIComponent(fileName || 'attachment')}`;
    link.download = fileName || 'attachment';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Robust file format detector by extension and MIME type
 */
export function detectAttachmentType(url = '', mimeType = '', fileName = '') {
  const name = (fileName || url || '').toLowerCase();
  const ext = name.split('?')[0].split('.').pop() || '';
  const mime = (mimeType || '').toLowerCase();

  if (
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico', 'avif'].includes(ext)
  ) {
    return 'image';
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (
    ['xlsx', 'xls', 'xlsm', 'xlsb'].includes(ext) ||
    mime.includes('spreadsheet') ||
    mime.includes('excel')
  ) {
    return 'excel';
  }
  if (
    ['csv', 'tsv'].includes(ext) ||
    mime === 'text/csv' ||
    mime.includes('tab-separated')
  ) {
    return 'csv';
  }
  if (ext === 'json' || mime === 'application/json') {
    return 'json';
  }
  if (
    ['docx', 'doc'].includes(ext) ||
    mime.includes('word') ||
    mime.includes('officedocument.wordprocessingml')
  ) {
    return 'docx';
  }
  if (
    mime.startsWith('video/') ||
    ['mp4', 'webm', 'ogg', 'mov', 'm4v', 'mkv'].includes(ext)
  ) {
    return 'video';
  }
  if (
    mime.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)
  ) {
    return 'audio';
  }
  if (
    [
      'txt',
      'log',
      'md',
      'xml',
      'html',
      'htm',
      'css',
      'js',
      'jsx',
      'ts',
      'tsx',
      'sql',
      'py',
      'sh',
      'yml',
      'yaml',
      'env',
      'ini'
    ].includes(ext) ||
    mime.startsWith('text/')
  ) {
    return 'text';
  }
  if (
    ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext) ||
    mime.includes('zip') ||
    mime.includes('compressed') ||
    mime.includes('tar')
  ) {
    return 'archive';
  }
  return 'generic';
}

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return null;
  const b = Number(bytes);
  if (b === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function Lightbox({
  isOpen,
  onClose,
  src,
  title,
  type = 'image',
  attachment = null,
  fileSize = null
}) {
  const resolvedUrl = attachment?.file_url || src;
  const resolvedTitle = attachment?.file_name || title || 'Attachment Preview';
  const resolvedMime = attachment?.file_type || '';
  const resolvedBytes = attachment?.file_size_bytes ?? fileSize;

  const [publicViewerUrl, setPublicViewerUrl] = useState(null);

  const detectedCategory = useMemo(() => {
    if (attachment) {
      return detectAttachmentType(attachment.file_url, attachment.file_type, attachment.file_name);
    }
    return detectAttachmentType(src, resolvedMime, title || (type === 'video' ? 'video.mp4' : 'image.png'));
  }, [attachment, src, resolvedMime, title, type]);

  // Request temporary signed preview token for Microsoft Office Online Viewer
  useEffect(() => {
    let isMounted = true;
    if (isOpen && (detectedCategory === 'excel' || detectedCategory === 'docx')) {
      setPublicViewerUrl(null);
      const rawInput = attachment?.file_url || src || '';
      
      // Normalize path to clean relative API route (/api/files/:tenantId/...)
      let normalizedPath = rawInput;
      if (/^https?:\/\//i.test(normalizedPath)) {
        try {
          normalizedPath = new URL(normalizedPath).pathname;
        } catch (e) {
          normalizedPath = normalizedPath.replace(/^https?:\/\/[^\/]+/i, '');
        }
      }
      if (normalizedPath.startsWith('/uploads/')) {
        normalizedPath = normalizedPath.replace('/uploads/', '/api/files/');
      } else if (normalizedPath.startsWith('uploads/')) {
        normalizedPath = `/api/files/${normalizedPath.replace('uploads/', '')}`;
      } else if (normalizedPath.startsWith('api/files/')) {
        normalizedPath = `/${normalizedPath}`;
      } else if (!normalizedPath.startsWith('/api/files/')) {
        normalizedPath = `/api/files/${normalizedPath.replace(/^\/+/, '')}`;
      }

      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      const isLiveHost = host.includes('solarman.in');
      const publicBase = isLiveHost ? 'https://pmtmgmt.solarman.in' : getApiUrl('').replace(/\/+$/, '');

      apiFetch('/api/files/preview-token', {
        method: 'POST',
        body: JSON.stringify({ file_url: normalizedPath })
      })
        .then((data) => {
          if (!isMounted) return;
          const token = data?.token || '';
          const activePath = data?.normalized_path || normalizedPath;
          const directUrl = `${publicBase}${activePath}?token=${token}&filename=${encodeURIComponent(resolvedTitle)}`;
          const msViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(directUrl)}`;
          setPublicViewerUrl(msViewerUrl);
        })
        .catch((err) => {
          if (!isMounted) return;
          console.warn('Could not generate preview token:', err);
          const directUrl = `${publicBase}${normalizedPath}?filename=${encodeURIComponent(resolvedTitle)}`;
          setPublicViewerUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(directUrl)}`);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, detectedCategory, attachment, src, resolvedTitle]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !resolvedUrl) return null;

  const handleDownload = () => {
    downloadAttachment(resolvedUrl, resolvedTitle);
  };

  const getHeaderIcon = () => {
    switch (detectedCategory) {
      case 'excel':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
      case 'csv':
        return <FileSpreadsheet className="w-5 h-5 text-teal-500" />;
      case 'json':
        return <FileJson className="w-5 h-5 text-amber-500" />;
      case 'docx':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-500" />;
      case 'text':
        return <FileCode className="w-5 h-5 text-indigo-500" />;
      case 'video':
        return <FileVideo className="w-5 h-5 text-purple-500" />;
      case 'audio':
        return <FileAudio className="w-5 h-5 text-pink-500" />;
      case 'archive':
        return <FileArchive className="w-5 h-5 text-amber-600" />;
      default:
        return <GenericFileIcon className="w-5 h-5 text-primary" />;
    }
  };

  const extensionLabel = (resolvedTitle.split('.').pop() || detectedCategory).toUpperCase();

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={resolvedTitle}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-6 animate-fade-in"
    >
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-6xl max-h-[95vh] flex flex-col bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
        {/* Header Bar */}
        <div className="w-full flex items-center justify-between px-3 sm:px-4 py-3 bg-surface border-b border-border gap-2 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-surface-muted shrink-0 border border-border/50">
              {getHeaderIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  title={resolvedTitle}
                  className="text-sm font-bold text-text-primary truncate max-w-[180px] sm:max-w-md block"
                >
                  {resolvedTitle}
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-surface-muted text-text-secondary border border-border shrink-0">
                  {extensionLabel}
                </span>
                {resolvedBytes && (
                  <span className="text-[11px] text-text-muted hidden sm:inline shrink-0">
                    {formatBytes(resolvedBytes)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons — Note: 'Open in new window' button is explicitly removed as requested */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              title="Download this file to your device"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary-hover active:scale-98 transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close preview (Esc)"
              className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-muted active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="w-full flex-1 min-h-[350px] max-h-[calc(95vh-64px)] overflow-hidden bg-surface-muted flex flex-col items-center justify-center relative p-2 sm:p-4">
          {/* Office Documents (Excel, Word): Open directly in Microsoft Office Online Viewer */}
          {(detectedCategory === 'excel' || detectedCategory === 'docx') && (
            <OfficeOnlineIframe
              url={publicViewerUrl}
              directFileUrl={resolvedUrl}
              title={resolvedTitle}
            />
          )}

          {detectedCategory === 'pdf' && (
            <PdfSafeViewer url={resolvedUrl} title={resolvedTitle} onDownload={handleDownload} />
          )}

          {detectedCategory === 'csv' && (
            <CsvViewer url={resolvedUrl} title={resolvedTitle} onDownload={handleDownload} />
          )}

          {detectedCategory === 'json' && (
            <JsonViewer url={resolvedUrl} title={resolvedTitle} onDownload={handleDownload} />
          )}

          {detectedCategory === 'text' && (
            <TextViewer url={resolvedUrl} title={resolvedTitle} onDownload={handleDownload} />
          )}

          {detectedCategory === 'image' && (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
              <img
                src={resolvedUrl}
                alt={resolvedTitle}
                className="max-h-[78vh] max-w-full object-contain rounded-lg shadow-md border border-border/40"
              />
            </div>
          )}

          {detectedCategory === 'video' && (
            <div className="w-full h-full flex items-center justify-center p-2">
              <video
                src={resolvedUrl}
                controls
                autoPlay
                className="max-h-[78vh] max-w-full rounded-lg shadow-md bg-black"
              />
            </div>
          )}

          {detectedCategory === 'audio' && (
            <div className="w-full max-w-md p-6 bg-surface border border-border rounded-xl shadow-lg flex flex-col items-center gap-4 text-center my-auto">
              <div className="w-16 h-16 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center border border-pink-500/20">
                <FileAudio className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary">{resolvedTitle}</h4>
                <p className="text-xs text-text-secondary mt-0.5">Audio Attachment</p>
              </div>
              <audio controls src={resolvedUrl} className="w-full h-10 mt-2" />
            </div>
          )}

          {(detectedCategory === 'archive' || detectedCategory === 'generic') && (
            <GenericFileCard
              title={resolvedTitle}
              bytes={resolvedBytes}
              category={detectedCategory}
              onDownload={handleDownload}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ==============================================================
// Microsoft Office Online Viewer Iframe
// ==============================================================
function OfficeOnlineIframe({ url, directFileUrl, title }) {
  const [loading, setLoading] = useState(true);
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  return (
    <div className="w-full h-[80vh] flex flex-col bg-surface border border-border rounded-xl shadow-inner overflow-hidden relative">
      {isLocalhost && (
        <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Localhost Notice:</strong> Microsoft Office Online connects over the public internet. On your live server (<strong>https://pmt.solarman.in</strong>), this loads directly from Microsoft. On localhost, Microsoft cannot reach private URLs (http://localhost:5000).
            </span>
          </div>
          {directFileUrl && (
            <a
              href={directFileUrl}
              download={title}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold shrink-0 cursor-pointer transition-colors"
            >
              Download File
            </a>
          )}
        </div>
      )}
      {(loading || !url) && (
        <div className="absolute inset-0 bg-surface/90 flex flex-col items-center justify-center gap-2 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs font-semibold text-text-secondary">
            Connecting to Microsoft Office Online Tools...
          </span>
        </div>
      )}
      {url && (
        <iframe
          src={url}
          title={title}
          onLoad={() => setLoading(false)}
          className="w-full h-full border-0 bg-surface"
        />
      )}
    </div>
  );
}

// ==============================================================
// PDF Safe Viewer (Uses same-origin Blob to eliminate X-Frame-Options block)
// ==============================================================
function PdfSafeViewer({ url, title, onDownload }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let createdUrl = null;
    setLoading(true);
    setError(null);

    fetch(url, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load PDF (HTTP ${res.status})`);
        return res.blob();
      })
      .then((blob) => {
        if (!isMounted) return;
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        createdUrl = URL.createObjectURL(pdfBlob);
        setBlobUrl(createdUrl);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('PDF blob load error:', err);
        // Fallback to direct URL if blob fetch fails
        setBlobUrl(url);
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [url]);

  if (loading) return <LoadingSpinner message="Opening PDF document..." />;
  if (error) return <ErrorCard message={error} onDownload={onDownload} />;

  return (
    <div className="w-full h-[80vh] flex flex-col bg-surface border border-border rounded-xl shadow-inner overflow-hidden">
      <iframe
        src={`${blobUrl}#toolbar=1`}
        title={title}
        className="w-full h-full border-0 rounded-lg bg-surface"
      />
    </div>
  );
}

// ==============================================================
// Word Document High-Fidelity Page Renderer (docx-preview)
// ==============================================================
function DocxPreviewRenderer({ url, title, onDownload }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(url, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load Word document (HTTP ${res.status})`);
        return res.arrayBuffer();
      })
      .then(async (buffer) => {
        if (!isMounted || !containerRef.current) return;
        containerRef.current.innerHTML = '';
        await renderAsync(buffer, containerRef.current, undefined, {
          className: 'docx-preview-doc',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          experimental: true
        });
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('docx-preview render error:', err);
        setError('Document preview format could not be rendered natively. You can download and open in Word.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  return (
    <div className="w-full h-full flex flex-col bg-surface-muted border border-border rounded-xl shadow-inner overflow-hidden relative">
      {loading && <LoadingSpinner message="Rendering Word document pages as uploaded..." />}
      {error && <ErrorCard message={error} onDownload={onDownload} />}
      <div
        ref={containerRef}
        className={`w-full flex-1 overflow-y-auto max-h-[80vh] p-4 sm:p-8 flex flex-col items-center docx-render-container ${
          loading || error ? 'hidden' : ''
        }`}
      />
    </div>
  );
}

function convertWorkbookToXSpreadsheet(wb) {
  const sheets = [];
  (wb.SheetNames || []).forEach((name) => {
    const ws = wb.Sheets[name];
    if (!ws) return;
    const sheet = {
      name,
      rows: {},
      styles: []
    };
    if (ws['!ref']) {
      const range = XLSX.utils.decode_range(ws['!ref']);
      const maxR = Math.min(range.e.r, 500);
      const maxC = Math.min(range.e.c, 30);
      for (let R = range.s.r; R <= maxR; ++R) {
        const row = { cells: {} };
        let hasCell = false;
        for (let C = range.s.c; C <= maxC; ++C) {
          const cell_ref = XLSX.utils.encode_cell({ c: C, r: R });
          const cell = ws[cell_ref];
          if (cell) {
            let val = cell.w !== undefined ? cell.w : cell.v;
            if (val !== undefined && val !== null) {
              row.cells[C] = { text: String(val) };
              hasCell = true;
            }
          }
        }
        if (hasCell) {
          sheet.rows[R] = row;
        }
      }
    }
    sheets.push(sheet);
  });
  return sheets;
}

// ==============================================================
// Native Excel High-Fidelity Spreadsheet Viewer (x-data-spreadsheet + SheetJS)
// ==============================================================
function NativeExcelViewer({ url, title, onDownload }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [fallbackHtml, setFallbackHtml] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' (x-data-spreadsheet) or 'table' (HTML)
  const containerRef = useRef(null);
  const workbookRef = useRef(null);
  const xsInstanceRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(url, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load Excel workbook (HTTP ${res.status})`);
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (!isMounted) return;
        const wb = XLSX.read(buffer, { type: 'array' });
        workbookRef.current = wb;
        const names = wb.SheetNames || [];
        setSheetNames(names);

        if (names.length > 0) {
          const ws = wb.Sheets[names[0]];
          const html = XLSX.utils.sheet_to_html(ws, { id: 'excel-rendered-table', editable: false });
          setFallbackHtml(html);
        }

        // Initialize x-data-spreadsheet
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          try {
            const initSpreadsheet = typeof window !== 'undefined' ? window.x_spreadsheet : null;
            if (typeof initSpreadsheet !== 'function') {
              throw new Error('x_spreadsheet factory not found');
            }
            const xsData = convertWorkbookToXSpreadsheet(wb);
            const xs = initSpreadsheet(containerRef.current, {
              mode: 'read',
              showToolbar: true,
              showGrid: true,
              showContextmenu: false,
              showBottomBar: true,
              view: {
                height: () => Math.max(containerRef.current?.clientHeight || 550, 420),
                width: () => Math.max(containerRef.current?.clientWidth || 900, 600)
              }
            });
            xs.loadData(xsData);
            xsInstanceRef.current = xs;
            setViewMode('grid');
          } catch (initErr) {
            console.warn('Canvas spreadsheet init error, falling back to clean table:', initErr);
            setViewMode('table');
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Excel parse error:', err);
        setError(err.message || 'Could not parse spreadsheet workbook.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  const handleSelectSheet = (idx) => {
    setActiveSheetIndex(idx);
    if (workbookRef.current && sheetNames[idx]) {
      const ws = workbookRef.current.Sheets[sheetNames[idx]];
      const html = XLSX.utils.sheet_to_html(ws, { id: 'excel-rendered-table', editable: false });
      setFallbackHtml(html);
    }
  };

  if (loading) return <LoadingSpinner message="Opening Excel workbook as uploaded..." />;
  if (error) return <ErrorCard message={error} onDownload={onDownload} />;

  return (
    <div className="w-full h-full flex flex-col bg-surface border border-border rounded-xl shadow-inner overflow-hidden relative">
      {/* Excel Sheet Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-surface border-b border-border text-xs shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
          <span className="font-bold text-text-primary mr-2 flex items-center gap-1 text-xs">
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            Sheets ({sheetNames.length}):
          </span>
          {sheetNames.map((name, i) => (
            <button
              key={name}
              type="button"
              onClick={() => handleSelectSheet(i)}
              className={`px-3 py-1 rounded-md font-semibold text-xs whitespace-nowrap transition-colors cursor-pointer border ${
                activeSheetIndex === i
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 shadow-2xs'
                  : 'bg-surface-muted text-text-secondary border-border hover:text-text-primary'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* View Mode Toggle: Interactive Grid vs HTML Table */}
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-text-muted">Display:</span>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
              viewMode === 'grid'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-text-secondary hover:text-text-primary bg-surface-muted'
            }`}
          >
            Excel Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
              viewMode === 'table'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-text-secondary hover:text-text-primary bg-surface-muted'
            }`}
          >
            Sheet Table
          </button>
        </div>
      </div>

      {/* Spreadsheet Interactive Canvas Grid (x-data-spreadsheet) */}
      <div
        ref={containerRef}
        className={`w-full flex-1 min-h-[520px] overflow-hidden bg-white text-black ${
          viewMode === 'grid' ? 'block' : 'hidden'
        }`}
      />

      {/* Alternate Raw Table view */}
      {viewMode === 'table' && (
        <div className="flex-1 overflow-auto max-h-[72vh] p-4 text-xs font-mono bg-surface">
          <div
            className="excel-html-wrapper overflow-auto"
            dangerouslySetInnerHTML={{ __html: fallbackHtml }}
          />
        </div>
      )}

      {/* Footer Status Bar */}
      <div className="px-3 py-2 bg-surface-muted border-t border-border flex items-center justify-between text-[11px] text-text-muted shrink-0">
        <span>
          Worksheet: <strong>{sheetNames[activeSheetIndex] || 'Sheet1'}</strong>
        </span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          Native Microsoft Excel Engine
        </span>
      </div>
    </div>
  );
}

// ==============================================================
// CSV Tabular Viewer
// ==============================================================
function CsvViewer({ url, title, onDownload }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(url, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load CSV file (HTTP ${res.status})`);
        return res.text();
      })
      .then((text) => {
        if (!isMounted) return;
        const parsed = parseCsvString(text);
        setRows(parsed);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Could not parse CSV.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((row) =>
      row.some((cell) => String(cell || '').toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  if (loading) return <LoadingSpinner message="Parsing CSV records..." />;
  if (error) return <ErrorCard message={error} onDownload={onDownload} />;
  if (rows.length === 0) return <EmptyStateCard message="CSV file is empty." onDownload={onDownload} />;

  const headers = rows[0] || [];
  const filteredBodyRows = filteredRows.filter((r) => r !== headers);

  return (
    <div className="w-full h-full flex flex-col bg-surface border border-border rounded-xl shadow-inner overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-surface border-b border-border text-xs gap-3 shrink-0">
        <span className="font-bold text-text-primary text-xs flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-teal-500" />
          CSV Table View
        </span>
        <div className="relative w-48 sm:w-60">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rows..."
            className="w-full pl-8 pr-3 py-1 bg-surface-muted border border-border rounded-md text-xs text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto max-h-[72vh] text-xs font-mono">
        <table className="w-full border-collapse">
          <thead className="bg-surface-muted sticky top-0 z-10 border-b border-border shadow-2xs">
            <tr>
              <th className="w-12 px-2 py-1.5 text-center font-bold text-text-muted bg-surface-muted border-r border-border select-none">
                #
              </th>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-1.5 text-left font-bold text-text-secondary border-r border-border/60 min-w-[120px] select-none"
                >
                  {String(h || `Col ${i + 1}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredBodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-primary/5 transition-colors">
                <td className="px-2 py-1.5 text-center text-text-muted bg-surface-muted/50 border-r border-border font-bold select-none">
                  {rIdx + 1}
                </td>
                {headers.map((_, cIdx) => (
                  <td
                    key={cIdx}
                    className="px-3 py-1.5 text-text-primary border-r border-border/40 whitespace-pre-wrap max-w-sm truncate"
                    title={String(row[cIdx] ?? '')}
                  >
                    {String(row[cIdx] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-3 py-2 bg-surface-muted border-t border-border flex items-center justify-between text-[11px] text-text-muted shrink-0">
        <span>
          Showing {filteredBodyRows.length} rows · {headers.length} columns
        </span>
      </div>
    </div>
  );
}

// ==============================================================
// JSON Interactive Viewer
// ==============================================================
function JsonViewer({ url, title, onDownload }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawText, setRawText] = useState('');
  const [parsedJson, setParsedJson] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(url, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load JSON file (HTTP ${res.status})`);
        return res.text();
      })
      .then((text) => {
        if (!isMounted) return;
        setRawText(text);
        try {
          const parsed = JSON.parse(text);
          setParsedJson(parsed);
        } catch {
          setParsedJson(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Could not parse JSON.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <LoadingSpinner message="Formatting JSON..." />;
  if (error) return <ErrorCard message={error} onDownload={onDownload} />;

  const formattedJson = parsedJson !== null ? JSON.stringify(parsedJson, null, 2) : rawText;

  return (
    <div className="w-full h-full flex flex-col bg-surface border border-border rounded-xl shadow-inner overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-surface border-b border-border text-xs gap-3 shrink-0">
        <span className="font-bold text-text-primary flex items-center gap-2">
          <FileJson className="w-4 h-4 text-amber-500" />
          JSON Document
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-surface-muted border border-border text-text-primary hover:bg-border transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto max-h-[72vh] p-4 bg-surface-muted/60 font-mono text-xs text-text-primary leading-relaxed whitespace-pre selection:bg-primary/20">
        <code>{formattedJson}</code>
      </div>
    </div>
  );
}

// ==============================================================
// Plain Text & Code Viewer
// ==============================================================
function TextViewer({ url, title, onDownload }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch(url, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((data) => {
        if (!isMounted) return;
        setText(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Could not load text content');
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [url]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <LoadingSpinner message="Loading text..." />;
  if (error) return <ErrorCard message={error} onDownload={onDownload} />;

  const lines = text.split('\n');

  return (
    <div className="w-full h-full flex flex-col bg-surface border border-border rounded-xl shadow-inner overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-surface border-b border-border text-xs shrink-0">
        <span className="font-bold text-text-primary flex items-center gap-2">
          <FileCode className="w-4 h-4 text-indigo-500" />
          Text File ({lines.length} lines)
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-surface-muted border border-border text-text-primary hover:bg-border transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy Text'}</span>
        </button>
      </div>
      <div className="flex-1 overflow-auto max-h-[72vh] p-4 bg-surface-muted/60 font-mono text-xs text-text-primary whitespace-pre leading-relaxed">
        {lines.map((l, i) => (
          <div key={i} className="flex gap-4">
            <span className="w-8 text-right text-text-muted select-none shrink-0">{i + 1}</span>
            <span className="flex-1">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==============================================================
// Generic File Card
// ==============================================================
function GenericFileCard({ title, bytes, category, onDownload }) {
  return (
    <div className="w-full max-w-md p-8 bg-surface border border-border rounded-2xl shadow-xl flex flex-col items-center gap-5 text-center my-auto">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
        {category === 'archive' ? (
          <FileArchive className="w-10 h-10" />
        ) : (
          <GenericFileIcon className="w-10 h-10" />
        )}
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-base font-bold text-text-primary break-words">{title}</h4>
        <p className="text-xs text-text-secondary">
          {bytes ? formatBytes(bytes) : 'Document'} · Direct download available
        </p>
      </div>
      <p className="text-xs text-text-muted">
        In-browser preview is not supported for this file extension. You can download and open it
        directly on your device.
      </p>
      <button
        type="button"
        onClick={onDownload}
        className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-primary text-white hover:bg-primary-hover active:scale-98 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
      >
        <Download className="w-4 h-4" />
        Download {title}
      </button>
    </div>
  );
}

function LoadingSpinner({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center text-text-secondary">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <span className="text-xs font-semibold">{message}</span>
    </div>
  );
}

function ErrorCard({ message, onDownload }) {
  return (
    <div className="max-w-md p-6 bg-surface border border-danger/30 rounded-xl shadow-lg flex flex-col items-center gap-4 text-center my-auto">
      <AlertCircle className="w-10 h-10 text-danger" />
      <p className="text-xs text-text-secondary">{message}</p>
      <button
        type="button"
        onClick={onDownload}
        className="py-2 px-4 rounded-lg font-semibold text-xs bg-primary text-white hover:bg-primary-hover transition-colors flex items-center gap-2 cursor-pointer"
      >
        <Download className="w-4 h-4" /> Download File Instead
      </button>
    </div>
  );
}

function EmptyStateCard({ message, onDownload }) {
  return (
    <div className="max-w-md p-6 bg-surface border border-border rounded-xl shadow-md flex flex-col items-center gap-3 text-center my-auto">
      <GenericFileIcon className="w-8 h-8 text-text-muted" />
      <p className="text-xs text-text-secondary">{message}</p>
      <button
        type="button"
        onClick={onDownload}
        className="py-1.5 px-3 rounded-lg font-semibold text-xs bg-surface-muted hover:bg-border text-text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" /> Download
      </button>
    </div>
  );
}

// Simple RFC 4180 CSV parser
function parseCsvString(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const row = [];
    let insideQuote = false;
    let entry = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuote && line[i + 1] === '"') {
          entry += '"';
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        row.push(entry);
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry);
    return row;
  });
}
