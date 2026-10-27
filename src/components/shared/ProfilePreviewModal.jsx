// client/src/components/shared/ProfilePreviewModal.jsx
import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Download, User, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { getFileUrl } from '../../api/config';

export default function ProfilePreviewModal({
  isOpen,
  onClose,
  member
}) {
  const [naturalDimensions, setNaturalDimensions] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const rawUrl =
    member?.avatar_url ||
    member?.avatar ||
    member?.src ||
    member?.user?.avatar_url ||
    member?.user?.avatar;

  const fullImageUrl = rawUrl
    ? (rawUrl.startsWith('http') || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')
        ? rawUrl
        : getFileUrl(rawUrl))
    : null;

  useEffect(() => {
    if (isOpen) {
      setIsZoomed(false);
      setImageLoading(true);
      setNaturalDimensions(null);
    }
  }, [isOpen, fullImageUrl]);

  const handleImageLoad = (e) => {
    setImageLoading(false);
    if (e.target.naturalWidth && e.target.naturalHeight) {
      setNaturalDimensions({
        width: e.target.naturalWidth,
        height: e.target.naturalHeight
      });
    }
  };

  const displayName = member?.name || member?.user?.name || member?.email || 'User Profile';
  const role = member?.role || member?.user?.role || member?.role_name || '';
  const email = member?.email || member?.user?.email || '';

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-tint text-primary flex items-center justify-center font-bold text-xs">
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-text-primary text-base">{displayName}</span>
              {role && (
                <Badge variant="primary" className="text-[10px] font-bold">
                  {role}
                </Badge>
              )}
            </div>
            {email && <p className="text-xs text-text-secondary font-normal">{email}</p>}
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        {/* Preview Area */}
        <div className="relative w-full max-h-[70vh] flex items-center justify-center overflow-auto rounded-xl bg-surface-muted/50 border border-border/80 p-4">
          {fullImageUrl ? (
            <div className="relative flex items-center justify-center max-w-full max-h-full">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface/60 backdrop-blur-xs rounded-xl z-10">
                  <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              )}
              <img
                src={fullImageUrl}
                alt={displayName}
                onLoad={handleImageLoad}
                className={`transition-all duration-200 select-none rounded-xl object-contain shadow-md ${
                  isZoomed
                    ? 'cursor-zoom-out max-w-none max-h-none'
                    : 'cursor-zoom-in max-w-full max-h-[60vh] h-auto w-auto'
                }`}
                onClick={() => setIsZoomed(!isZoomed)}
                title="Click to toggle actual resolution / fit to screen"
              />
            </div>
          ) : (
            <div className="py-16 px-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-28 h-28 rounded-full bg-primary-tint text-primary flex items-center justify-center font-bold text-3xl shadow-inner border border-primary/20">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">{displayName}</p>
                <p className="text-xs text-text-muted mt-0.5">No custom profile photo uploaded</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info & Actions */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs">
          <div className="flex items-center gap-2 text-text-secondary">
            {naturalDimensions && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-muted border border-border text-[11px] font-mono font-medium text-text-muted">
                <Maximize2 className="w-3 h-3 text-primary" />
                {naturalDimensions.width} × {naturalDimensions.height} px (Original Resolution)
              </span>
            )}
            {fullImageUrl && (
              <span className="text-[11px] text-text-muted hidden sm:inline">
                Click image to {isZoomed ? 'fit screen' : 'zoom 100%'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {fullImageUrl && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsZoomed(!isZoomed)}
                  leftIcon={isZoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                >
                  {isZoomed ? 'Fit Screen' : '100% Zoom'}
                </Button>
                <a
                  href={fullImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-text-primary hover:bg-surface-hover hover:border-primary/50 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Size</span>
                </a>
              </>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
