// client/src/components/ui/Drawer.jsx
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import IconButton from './IconButton';

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  position = 'right', // 'right' | 'left'
  size = 'md', // 'sm' (w-80) | 'md' (w-96) | 'lg' (w-[480px])
  showCloseButton = true,
  className = ''
}) {
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'w-80 max-w-[85vw]',
    md: 'w-96 max-w-[90vw]',
    lg: 'w-[480px] max-w-[95vw]'
  };

  const posClasses = {
    right: 'right-0 top-0 bottom-0 border-l border-border animate-slide-left',
    left: 'left-0 top-0 bottom-0 border-r border-border animate-slide-right'
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden select-none"
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-text-primary/25 transition-opacity"
      />
      <div
        ref={drawerRef}
        className={`fixed ${posClasses[position] || posClasses.right} ${
          widthClasses[size] || widthClasses.md
        } bg-surface shadow-xl flex flex-col z-10 ${className}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          {title && (
            <h3 className="text-base font-semibold text-text-primary">
              {title}
            </h3>
          )}
          {showCloseButton && (
            <IconButton
              icon={<X className="w-4 h-4 text-text-secondary" />}
              aria-label="Close drawer"
              size="sm"
              onClick={onClose}
            />
          )}
        </div>
        <div className="p-5 overflow-y-auto flex-1 text-text-primary">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default Drawer;
