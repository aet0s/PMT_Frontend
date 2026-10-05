import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import PromptDialog from '../shared/PromptDialog';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Pilcrow
} from 'lucide-react';

export default function RichTextEditor({ initialValue = '', onSave, onCancel }) {
  const [, forceUpdate] = useState(0);
  const [dialog, setDialog] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false
      }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: true })
    ],
    content: initialValue,
    onTransaction: () => forceUpdate((n) => n + 1),
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none p-3.5 min-h-[120px] bg-surface border border-border rounded-b-lg focus:outline-none font-sans text-text-primary'
      }
    }
  });

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
    </>
  );
}
