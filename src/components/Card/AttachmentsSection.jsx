import React, { useState } from 'react';
import Lightbox, { downloadAttachment, detectAttachmentType } from '../shared/Lightbox';
import { formatDate, formatRelativeTime } from '../../lib/dateFormat';
import { getFileUrl } from '../../api/config';
import { usePermissions } from '../../context/PermissionContext';
import { useAuth } from '../../hooks/useAuth';
import {
  Paperclip,
  Trash2,
  Download,
  Eye,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileJson,
  FileArchive,
  Music as AudioIcon,
  Video as VideoIcon,
  File as GenericFileIcon
} from 'lucide-react';

export default function AttachmentsSection({ attachments = [], onDeleteAttachment }) {
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const canDeleteOwn = hasPermission('attachment.delete_own');
  const canDeleteAny = hasPermission('attachment.delete_any') || hasPermission('file.delete');
  const [selectedAttachment, setSelectedAttachment] = useState(null);

  if (!attachments || attachments.length === 0) return null;

  const handleOpenPreview = (att) => {
    setSelectedAttachment({
      ...att,
      file_url: getFileUrl(att.file_url)
    });
  };

  const getThumbnailContent = (att, resolvedFileUrl, category) => {
    switch (category) {
      case 'image':
        return (
          <>
            <img
              src={resolvedFileUrl}
              alt={att.file_name}
              className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
              <Eye className="w-4 h-4 text-primary" />
            </div>
          </>
        );
      case 'excel':
        return (
          <div className="flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400">
            <FileSpreadsheet className="w-6 h-6" />
            <span className="text-[9px] font-extrabold mt-0.5 tracking-wider">XLSX</span>
          </div>
        );
      case 'csv':
        return (
          <div className="flex flex-col items-center justify-center text-teal-600 dark:text-teal-400">
            <FileSpreadsheet className="w-6 h-6" />
            <span className="text-[9px] font-extrabold mt-0.5 tracking-wider">CSV</span>
          </div>
        );
      case 'json':
        return (
          <div className="flex flex-col items-center justify-center text-amber-500">
            <FileJson className="w-6 h-6" />
            <span className="text-[9px] font-extrabold mt-0.5 tracking-wider">JSON</span>
          </div>
        );
      case 'docx':
        return (
          <div className="flex flex-col items-center justify-center text-blue-500">
            <FileText className="w-6 h-6" />
            <span className="text-[9px] font-extrabold mt-0.5 tracking-wider">DOCX</span>
          </div>
        );
      case 'pdf':
        return (
          <div className="flex flex-col items-center justify-center text-rose-500">
            <FileText className="w-6 h-6" />
            <span className="text-[9px] font-extrabold mt-0.5 tracking-wider">PDF</span>
          </div>
        );
      case 'text':
        return (
          <div className="flex flex-col items-center justify-center text-indigo-500">
            <FileCode className="w-6 h-6" />
            <span className="text-[9px] font-extrabold mt-0.5 tracking-wider">CODE</span>
          </div>
        );
      case 'video':
        return (
          <div className="flex flex-col items-center justify-center text-purple-500">
            <VideoIcon className="w-6 h-6" />
            <span className="text-[9px] font-extrabold mt-0.5 tracking-wider">VIDEO</span>
          </div>
        );
      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center text-pink-500">
            <AudioIcon className="w-6 h-6" />
            <span className="text-[9px] font-extrabold mt-0.5 tracking-wider">AUDIO</span>
          </div>
        );
      case 'archive':
        return (
          <div className="flex flex-col items-center justify-center text-amber-600">
            <FileArchive className="w-6 h-6" />
            <span className="text-[9px] font-extrabold mt-0.5 tracking-wider">ZIP</span>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center text-primary">
            <GenericFileIcon className="w-6 h-6" />
            <span className="text-[9px] font-extrabold mt-0.5 tracking-wider">FILE</span>
          </div>
        );
    }
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
          const category = detectAttachmentType(att.file_url, att.file_type, att.file_name);
          const isAudio = category === 'audio';

          return (
            <div
              key={att.id}
              className="flex flex-col gap-2 p-2.5 bg-surface border border-border rounded-xl hover:border-border-strong hover:shadow-2xs transition-all group relative"
            >
              <div className="flex items-center gap-3">
                {/* Thumbnail / Icon — Clicking opens Universal Preview Modal */}
                <div
                  onClick={() => handleOpenPreview(att)}
                  className="w-16 h-16 rounded-lg bg-surface-muted overflow-hidden shrink-0 border border-border flex items-center justify-center cursor-pointer relative group/thumb transition-colors"
                  title="Click to preview file"
                >
                  {getThumbnailContent(att, resolvedFileUrl, category)}
                </div>

                {/* Info & Meta */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => handleOpenPreview(att)}
                    className="text-xs font-semibold text-text-primary hover:text-primary truncate block transition-colors text-left w-full cursor-pointer"
                    title={att.file_name}
                  >
                    {att.file_name}
                  </button>
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

                {/* Action Buttons — Note: 'Open in new window' removed; direct Download & Delete provided */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => downloadAttachment(resolvedFileUrl, att.file_name)}
                    title="Download file"
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-muted rounded-md transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  {(canDeleteAny ||
                    (canDeleteOwn && Number(att.uploaded_by_user_id) === Number(user?.id))) && (
                    <button
                      type="button"
                      onClick={() => onDeleteAttachment(att.id)}
                      title="Delete attachment"
                      className="p-1.5 text-text-muted hover:text-danger hover:bg-danger-tint rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
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

      {/* Universal Preview Modal */}
      <Lightbox
        isOpen={Boolean(selectedAttachment)}
        onClose={() => setSelectedAttachment(null)}
        attachment={selectedAttachment}
      />
    </div>
  );
}
