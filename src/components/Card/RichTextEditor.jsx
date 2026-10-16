import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import PromptDialog from '../shared/PromptDialog';
import Modal from '../shared/Modal';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Upload,
  Eye,
  Heading1,
  Heading2,
  Pilcrow
} from 'lucide-react';

function readFileAsDataURL(file) {
  return new Promise((resolve) => {
    // If not an image or small (e.g. < 500KB), direct read
    if (!file.type || !file.type.startsWith('image/') || (file.size && file.size < 500 * 1024)) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result || null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
      return;
    }

    // For larger images, optimize via Canvas if available to keep data URL reasonable
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawUrl = e.target?.result;
      if (!rawUrl || typeof window === 'undefined' || !window.Image) {
        resolve(rawUrl || null);
        return;
      }

      const img = new window.Image();
      img.onload = () => {
        try {
          const maxDim = 1920;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          const outputType =
            file.type === 'image/png' && file.size < 2 * 1024 * 1024
              ? 'image/png'
              : 'image/jpeg';
          const optimized = canvas.toDataURL(outputType, 0.85);
          resolve(optimized);
        } catch {
          resolve(rawUrl);
        }
      };
      img.onerror = () => resolve(rawUrl);
      img.src = rawUrl;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export default function RichTextEditor({ initialValue = '', cardTitle = '', onSave, onCancel }) {
  const [, forceUpdate] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false
      }),
      Link.configure({ openOnClick: false }),
      Image.configure({
        inline: true,
        allowBase64: true
      })
    ],
    content: initialValue,
    onTransaction: () => forceUpdate((n) => n + 1),
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none p-3.5 min-h-[130px] max-h-[300px] overflow-y-auto bg-surface border border-border rounded-b-lg focus:outline-none font-sans text-text-primary'
      },
      handlePaste: (view, event) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const html = clipboardData.getData('text/html') || '';
        const items = Array.from(clipboardData.items || []);
        const files = Array.from(clipboardData.files || []);

        const imageItems = items.filter(
          (item) => item.kind === 'file' && item.type.startsWith('image/')
        );
        const imageFiles = files.filter((f) => f.type.startsWith('image/'));
        const targetFiles =
          imageFiles.length > 0
            ? imageFiles
            : imageItems.map((item) => item.getAsFile()).filter(Boolean);

        // Case 1: Pure image(s) pasted (e.g. screenshot, right-click "Copy Image", image file copied)
        if (targetFiles.length > 0 && (!html || !html.trim())) {
          event.preventDefault();
          Promise.all(targetFiles.map(readFileAsDataURL)).then((dataUrls) => {
            dataUrls.filter(Boolean).forEach((url, idx) => {
              const alt = targetFiles[idx]?.name || 'image';
              if (editorRef.current) {
                editorRef.current.chain().focus().setImage({ src: url, alt }).run();
              } else {
                const node = view.state.schema.nodes.image.create({ src: url, alt });
                view.dispatch(view.state.tr.replaceSelectionWith(node));
              }
            });
          });
          return true;
        }

        // Case 2: HTML with local/blob/cid image references (e.g. copied from Word/OneNote/desktop apps)
        if (html && targetFiles.length > 0) {
          const hasLocalOrBlob =
            /src=["'](?:file:\/\/\/|cid:|blob:|webkit-fake-url:\/\/)/i.test(html) ||
            /<v:imagedata/i.test(html);

          if (hasLocalOrBlob) {
            event.preventDefault();
            Promise.all(targetFiles.map(readFileAsDataURL)).then((dataUrls) => {
              let fileIndex = 0;
              let processedHtml = html;

              processedHtml = processedHtml.replace(
                /<img[^>]+src=["'](?:file:\/\/\/|cid:|blob:|webkit-fake-url:\/\/)[^"']*["'][^>]*>/gi,
                (match) => {
                  if (fileIndex < dataUrls.length && dataUrls[fileIndex]) {
                    const url = dataUrls[fileIndex++];
                    return match.replace(/src=["'][^"']*["']/i, `src="${url}"`);
                  }
                  return match;
                }
              );

              processedHtml = processedHtml.replace(
                /<v:imagedata[^>]+src=["'][^"']*["'][^>]*>/gi,
                () => {
                  if (fileIndex < dataUrls.length && dataUrls[fileIndex]) {
                    const url = dataUrls[fileIndex++];
                    return `<img src="${url}" />`;
                  }
                  return '';
                }
              );

              while (fileIndex < dataUrls.length) {
                if (dataUrls[fileIndex]) {
                  processedHtml += `<p><img src="${dataUrls[fileIndex]}" /></p>`;
                }
                fileIndex++;
              }

              if (editorRef.current) {
                editorRef.current.commands.insertContent(processedHtml);
              }
            });
            return true;
          }
        }

        // Case 3: Mixed content where HTML has text but NO <img> tags, but image files are present
        if (html && !/<img\b/i.test(html) && targetFiles.length > 0) {
          event.preventDefault();
          Promise.all(targetFiles.map(readFileAsDataURL)).then((dataUrls) => {
            let combinedHtml = html;
            dataUrls.filter(Boolean).forEach((url, idx) => {
              const alt = targetFiles[idx]?.name || 'image';
              combinedHtml += `<p><img src="${url}" alt="${alt}" /></p>`;
            });
            if (editorRef.current) {
              editorRef.current.commands.insertContent(combinedHtml);
            }
          });
          return true;
        }

        // Let TipTap handle standard HTML paste (which preserves base64 and remote images via allowBase64: true)
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files || []).filter((f) =>
          f.type.startsWith('image/')
        );
        if (files.length === 0) return false;

        event.preventDefault();
        const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });

        Promise.all(files.map(readFileAsDataURL)).then((dataUrls) => {
          dataUrls.filter(Boolean).forEach((url, idx) => {
            const alt = files[idx]?.name || 'image';
            if (coordinates && typeof coordinates.pos === 'number' && editorRef.current) {
              editorRef.current
                .chain()
                .focus()
                .setTextSelection(coordinates.pos)
                .setImage({ src: url, alt })
                .run();
            } else if (editorRef.current) {
              editorRef.current.chain().focus().setImage({ src: url, alt }).run();
            }
          });
        });
        return true;
      }
    }
  });

  editorRef.current = editor;

  useEffect(() => {
    if (editor && initialValue !== editor.getHTML()) {
      editor.commands.setContent(initialValue || '');
    }
  }, [initialValue, editor]);

  if (!editor) return null;

  const handleSaveClick = () => {
    onSave(editor.getHTML());
  };

  const handleCancelClick = () => {
    editor.commands.setContent(initialValue || '');
    onCancel();
  };

  const openImageDialog = (e) => {
    e.preventDefault();
    setDialog({ type: 'image', defaultValue: '' });
  };

  const openLinkDialog = (e) => {
    e.preventDefault();
    const existing = editor.getAttributes('link').href || '';
    setDialog({ type: 'link', defaultValue: existing });
  };

  const handleFileInputChange = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    readFileAsDataURL(file).then((src) => {
      if (src) {
        editor.chain().focus().setImage({ src, alt: file.name || 'image' }).run();
      }
    });
    // Reset file input so user can select the same file again if desired
    e.target.value = '';
  };

  const handleDialogConfirm = (value) => {
    if (!value) {
      setDialog(null);
      return;
    }
    if (dialog.type === 'image') {
      editor.chain().focus().setImage({ src: value }).run();
    } else if (dialog.type === 'link') {
      editor.chain().focus().extendMarkRange('link').setLink({ href: value }).run();
    }
    setDialog(null);
  };

  const handleDialogCancel = () => {
    if (dialog?.type === 'link') {
      const existing = editor.getAttributes('link').href;
      if (!existing) {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
      }
    }
    setDialog(null);
  };

  const toolbarBtn = (isActive) =>
    `p-1.5 rounded cursor-pointer transition-all select-none ${
      isActive
        ? 'bg-primary text-white shadow-xs'
        : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
    }`;

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*"
        className="hidden"
        aria-hidden="true"
      />

      {dialog?.type === 'image' && (
        <PromptDialog
          isOpen
          title="Insert Image"
          label="Image URL"
          placeholder="https://example.com/image.png"
          defaultValue={dialog.defaultValue}
          confirmText="Insert"
          onConfirm={handleDialogConfirm}
          onCancel={handleDialogCancel}
        />
      )}
      {dialog?.type === 'link' && (
        <PromptDialog
          isOpen
          title="Insert Link"
          label="URL"
          placeholder="https://example.com"
          defaultValue={dialog.defaultValue}
          confirmText="Apply"
          onConfirm={handleDialogConfirm}
          onCancel={handleDialogCancel}
        />
      )}

      <div className="space-y-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-2 bg-surface-muted border border-border rounded-t-lg border-b-0 select-none">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={toolbarBtn(editor.isActive('paragraph') && !editor.isActive('heading'))}
            title="Paragraph"
          >
            <Pilcrow className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={toolbarBtn(editor.isActive('heading', { level: 1 }))}
            title="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={toolbarBtn(editor.isActive('heading', { level: 2 }))}
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-border mx-1" />

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={toolbarBtn(editor.isActive('bold'))}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={toolbarBtn(editor.isActive('italic'))}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-border mx-1" />

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={toolbarBtn(editor.isActive('bulletList'))}
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={toolbarBtn(editor.isActive('orderedList'))}
            title="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-border mx-1" />

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openLinkDialog}
            className={toolbarBtn(editor.isActive('link'))}
            title="Insert Link"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openImageDialog}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface rounded cursor-pointer transition-all"
            title="Insert Image URL"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface rounded cursor-pointer transition-all"
            title="Upload Image from Device"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-border mx-1" />

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface rounded cursor-pointer transition-all ml-auto"
            title="Preview description"
          >
            <Eye className="w-3.5 h-3.5 text-text-muted" />
            <span>Preview</span>
          </button>
        </div>

        <EditorContent editor={editor} />

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleSaveClick}
            className="px-4 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-medium text-xs rounded-md shadow-xs transition-colors cursor-pointer"
          >
            Save Description
          </button>
          <button
            type="button"
            onClick={handleCancelClick}
            className="px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Editor Live Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <span className="font-semibold text-text-primary">Description Preview</span>
            {cardTitle && (
              <span className="text-xs text-text-muted font-normal truncate max-w-xs md:max-w-md">
                — {cardTitle}
              </span>
            )}
          </div>
        }
        size="xl"
        footer={
          <div className="flex items-center justify-end w-full">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-surface-muted hover:bg-border rounded-md transition-colors cursor-pointer"
            >
              Back to Editing
            </button>
          </div>
        }
      >
        <div className="max-h-[68vh] overflow-y-auto p-5 bg-surface border border-border rounded-xl">
          {editor && editor.getHTML() && editor.getHTML() !== '<p></p>' ? (
            <div
              className="prose prose-sm sm:prose-base max-w-none text-text-primary"
              dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
            />
          ) : (
            <p className="text-sm text-text-muted italic py-8 text-center">
              No content entered yet.
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
