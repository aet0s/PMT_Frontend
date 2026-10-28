// client/src/components/shared/ProfilePreviewModal.jsx
import React, { useState, useEffect } from 'react';
import { ExternalLink, User } from 'lucide-react';
import { Modal } from '../ui/Modal';
import Badge from '../ui/Badge';
import { getFileUrl } from '../../api/config';

export default function ProfilePreviewModal({
  isOpen,
  onClose,
  member
}) {
  const [imageLoading, setImageLoading] = useState(true);

  const rawUrl =
    member?.avatar_url ||
    member?.avatar ||
    member?.src ||
    member?.user?.avatar_url ||
    member?.user?.avatar ||
    member?.icon_url ||
    member?.icon;

  const fullImageUrl = rawUrl
    ? (rawUrl.startsWith('http') || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')
      ? rawUrl
      : getFileUrl(rawUrl))
    : null;

  useEffect(() => {
    if (isOpen) {
      setImageLoading(true);
    }
  }, [isOpen, fullImageUrl]);

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
                onLoad={() => setImageLoading(false)}
                className="select-none rounded-xl object-contain shadow-md max-w-full max-h-[65vh] h-auto w-auto"
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

        {/* Footer Actions - Only Open Full Size */}
        {fullImageUrl && (
          <div className="w-full flex items-center justify-end pt-1">
            <a
              href={fullImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border text-xs font-semibold text-text-primary hover:bg-surface-hover hover:border-primary/50 transition-colors shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
              <span>Open Full Size</span>
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
}
