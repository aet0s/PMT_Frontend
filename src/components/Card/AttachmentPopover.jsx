import React, { useState } from 'react';
import Popover from '../shared/Popover';
import { Upload, Link as LinkIcon, FileText, Check } from 'lucide-react';

export default function AttachmentPopover({ isOpen, onClose, anchorRef, onUploadFile, onAddLink }) {
  const [activeTab, setActiveTab] = useState('computer');
  const [linkUrl, setLinkUrl] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileChange = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setErrorMsg('');
    try {
      await onUploadFile(file);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    setIsUploading(true);
    setErrorMsg('');
    try {
      await onAddLink(linkUrl.trim(), displayText.trim() || linkUrl.trim());
      setLinkUrl('');
      setDisplayText('');
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to attach link');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Popover isOpen={isOpen} onClose={onClose} anchorRef={anchorRef} title="Attach" className="w-80">
      <div className="space-y-4 text-xs text-text-primary">
        {errorMsg && (
          <div className="p-2 text-xs font-medium text-danger bg-danger-tint border border-danger/30 rounded-md">
            {errorMsg}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab('computer')}
            className={`flex-1 py-2 font-medium text-[11px] border-b-2 text-center transition-colors ${
              activeTab === 'computer'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            From Computer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2 font-medium text-[11px] border-b-2 text-center transition-colors ${
              activeTab === 'link'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Paste Link
          </button>
        </div>

        {/* Tab 1: Computer Upload / Drag & Drop */}
        {activeTab === 'computer' && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDrop}
            className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-colors ${
              isDraggingOver ? 'border-primary bg-primary-tint' : 'border-border bg-surface-muted/50'
            }`}
          >
            <Upload className="w-8 h-8 text-primary mb-2" />
            <p className="font-medium text-text-primary mb-1">Drag and drop file here</p>
            <p className="text-[10px] text-text-muted mb-4">PNG, JPEG, WEBP, GIF up to 10MB</p>

            <label className="px-4 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-medium text-xs rounded-md shadow-xs cursor-pointer transition-colors">
              {isUploading ? 'Uploading...' : 'Choose a file'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => handleFileChange(e.target.files[0])}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          </div>
        )}

        {/* Tab 2: Paste Link */}
        {activeTab === 'link' && (
          <form onSubmit={handleLinkSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Search or Paste Link
              </label>
              <input
                type="url"
                required
                placeholder="https://example.com/image.png"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Display Text (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Design Specs Sheet"
                value={displayText}
                onChange={(e) => setDisplayText(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40"
              />
            </div>

            <button
              type="submit"
              disabled={isUploading || !linkUrl.trim()}
              className="w-full py-2 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-50 text-white font-medium text-xs rounded-md transition-colors cursor-pointer"
            >
              {isUploading ? 'Attaching...' : 'Attach Link'}
            </button>
          </form>
        )}
      </div>
    </Popover>
  );
}
