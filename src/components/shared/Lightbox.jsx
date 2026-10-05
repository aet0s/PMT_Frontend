import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink } from 'lucide-react';

export default function Lightbox({ isOpen, onClose, src, title, type = 'image' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !src) return null;

  const isVideo =
    type === 'video' ||
    /\.(mp4|webm|ogg|mov)$/i.test(src);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/60 p-4 animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative z-10 max-w-5xl max-h-[90vh] w-full flex flex-col items-center">
        {/* Header bar */}
        <div className="w-full flex items-center justify-between p-3 bg-surface border border-border rounded-t-xl">
          <span className="text-sm font-semibold text-text-primary truncate max-w-md">
            {title || (isVideo ? 'Video Preview' : 'Image Preview')}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              title="Open full size in new tab"
              className="p-1.5 text-text-secondary hover:text-text-primary rounded-md hover:bg-surface-muted transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-text-secondary hover:text-text-primary rounded-md hover:bg-surface-muted transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Display Container */}
        <div className="w-full bg-surface-muted border-x border-b border-border rounded-b-xl p-3 max-h-[80vh] overflow-hidden flex items-center justify-center">
          {isVideo ? (
            <video
              src={src}
              controls
              autoPlay
              className="max-h-[75vh] max-w-full rounded-lg shadow-md bg-surface"
            />
          ) : (
            <img
              src={src}
              alt={title || 'Attachment'}
              className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-md"
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
