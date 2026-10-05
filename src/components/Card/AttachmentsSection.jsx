import React, { useState } from 'react';
import Lightbox from '../shared/Lightbox';
import { formatDate, formatRelativeTime } from '../../lib/dateFormat';
import { getFileUrl } from '../../api/config';
import {
  Paperclip,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Link as LinkIcon,
  Video as VideoIcon,
  Music as AudioIcon,
  FileText,
  Eye
} from 'lucide-react';

export default function AttachmentsSection({ attachments = [], onDeleteAttachment }) {
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxType, setLightboxType] = useState('image');

  if (!attachments || attachments.length === 0) return null;

  const handleOpenPreview = (att, isVideo) => {
    setLightboxSrc(getFileUrl(att.file_url));
    setLightboxTitle(att.file_name);
    setLightboxType(isVideo ? 'video' : 'image');
  };

  return (
    <div className="space-y-3 mb-6">
      <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-info" />
        Attachments ({attachments.length})
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {attachments.map((att) => {
          const resolvedFileUrl = getFileUrl(att.file_url);
          const isImage =
            att.file_type?.startsWith('image/') ||
            /\.(png|jpe?g|webp|gif|svg)$/i.test(att.file_url);

          const isVideo =
            att.file_type?.startsWith('video/') ||
            /\.(mp4|webm|ogg|mov)$/i.test(att.file_url);

          const isAudio =
            att.file_type?.startsWith('audio/') ||
            /\.(mp3|wav|ogg|m4a)$/i.test(att.file_url);

          const isPdf =
            att.file_type === 'application/pdf' ||
            /\.pdf$/i.test(att.file_url);

          return (
            <div
              key={att.id}
              className="flex flex-col gap-2 p-2.5 bg-surface border border-border rounded-lg hover:border-border-strong transition-all group relative"
            >
              <div className="flex items-center gap-3">
                {/* Thumbnail or Icon */}
                <div
                  onClick={() => {
                    if (isImage || isVideo) {
                      handleOpenPreview(att, isVideo);
                    } else {
                      window.open(resolvedFileUrl, '_blank');
                    }
                  }}
                  className="w-16 h-16 rounded-md bg-surface-muted overflow-hidden shrink-0 border border-border flex items-center justify-center cursor-pointer relative group/thumb"
                  title={isImage || isVideo ? 'Click to preview' : 'Click to open file'}
                >
                  {isImage ? (
                    <img
                      src={resolvedFileUrl}
                      alt={att.file_name}
                      className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                    />
                  ) : isVideo ? (
                    <div className="flex flex-col items-center justify-center text-primary">
                      <VideoIcon className="w-6 h-6" />
                      <span className="text-[9px] font-semibold mt-0.5">VIDEO</span>
                    </div>
                  ) : isAudio ? (
                    <div className="flex flex-col items-center justify-center text-info">
                      <AudioIcon className="w-6 h-6" />
                      <span className="text-[9px] font-semibold mt-0.5">AUDIO</span>
                    </div>
                  ) : isPdf ? (
                    <div className="flex flex-col items-center justify-center text-danger">
                      <FileText className="w-6 h-6" />
                      <span className="text-[9px] font-semibold mt-0.5">PDF</span>
                    </div>
                  ) : (
                    <LinkIcon className="w-6 h-6 text-warning" />
                  )}

                  {(isImage || isVideo) && (
                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                      <Eye className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>

                {/* Info & Meta */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <a
                    href={resolvedFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-text-primary hover:text-primary truncate block transition-colors"
                  >
                    {att.file_name}
                  </a>
                  <p className="text-[10px] text-text-secondary truncate">
                    Added by {att.uploader_name || 'User'}
                  </p>
                  <span
                    title={formatDate(att.created_at)}
                    className="text-[10px] text-text-muted block hover:text-text-secondary transition-colors"
                  >
                    {formatRelativeTime(att.created_at)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={resolvedFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Open in new tab"
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-muted rounded-md transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => onDeleteAttachment(att.id)}
                    title="Delete attachment"
                    className="p-1.5 text-text-muted hover:text-danger hover:bg-danger-tint rounded-md transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Inline Audio Player for audio files */}
              {isAudio && (
                <div className="mt-1 pt-1 border-t border-border">
                  <audio controls src={resolvedFileUrl} className="w-full h-7 rounded-md" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Lightbox
        isOpen={Boolean(lightboxSrc)}
        onClose={() => setLightboxSrc(null)}
        src={lightboxSrc}
        title={lightboxTitle}
        type={lightboxType}
      />
    </div>
  );
}
