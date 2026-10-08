import React, { useEffect, useState } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  size,
  useDismiss,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager
} from '@floating-ui/react';
import { X } from 'lucide-react';

export default function Popover({
  isOpen,
  onClose,
  anchorRef,
  title,
  children,
  footer,
  placement = 'bottom-start',
  className = ''
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { refs, floatingStyles, context, isPositioned } = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      if (!open) onClose();
    },
    placement,
    strategy: 'fixed',
    transform: false,
    whileElementsMounted: autoUpdate,
    middleware: isMobile
      ? []
      : [
          offset(8),
          flip({
            fallbackPlacements: ['top-start', 'bottom-end', 'top-end', 'bottom', 'top'],
            padding: 12
          }),
          shift({ padding: 12 }),
          size({
            apply({ availableHeight, availableWidth, elements }) {
              Object.assign(elements.floating.style, {
                maxHeight: `${Math.max(220, Math.floor(availableHeight - 16))}px`,
                maxWidth: `${Math.min(450, Math.max(260, Math.floor(availableWidth - 16)))}px`
              });
            }
          })
        ]
  });

  const dismiss = useDismiss(context, { outsidePressEvent: 'mousedown' });
  const { getFloatingProps } = useInteractions([dismiss]);

  useEffect(() => {
    if (anchorRef?.current) {
      refs.setReference(anchorRef.current);
    }
  }, [anchorRef, refs]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <FloatingPortal>
      {isMobile ? (
        /* Mobile Bottom Sheet Overlay (< 640px) */
        <div
          className="fixed inset-0 z-[950] flex flex-col justify-end bg-text-primary/30 transition-opacity"
          onClick={onClose}
        >
          <div
            className="w-full bg-surface border-t border-border rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-slide-up text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-1 select-none">
              <div className="w-12 h-1.5 bg-border-strong rounded-full" />
            </div>

            {title && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-border select-none shrink-0">
                <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                  {title}
                </h4>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close popover"
                  className="p-1.5 text-text-muted hover:text-text-primary rounded-md hover:bg-surface-muted transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="p-4 overflow-y-auto flex-1 text-text-primary min-h-0">
              {children}
            </div>

            {footer && (
              <div className="p-3 bg-surface-muted border-t border-border shrink-0 select-none">
                {footer}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Desktop / Tablet Floating Popover (>= 640px) */
        <FloatingFocusManager context={context} modal={false}>
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              visibility: ((typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') || isPositioned) ? 'visible' : 'hidden',
              opacity: ((typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') || isPositioned) ? 1 : 0
            }}
            className="z-[900]"
          >
            <div
              {...getFloatingProps()}
              className={`w-80 bg-surface border border-border rounded-xl shadow-xl overflow-hidden flex flex-col animate-sassy-dropdown text-left outline-none ${className}`}
            >
              {title && (
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-surface-muted select-none shrink-0">
                  <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                    {title}
                  </h4>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close popover"
                    className="p-1 text-text-muted hover:text-text-primary rounded-md hover:bg-surface transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="p-3 overflow-y-auto flex-1 text-text-primary min-h-0">
                {children}
              </div>

              {footer && (
                <div className="px-3 py-2 bg-surface-muted border-t border-border shrink-0 select-none">
                  {footer}
                </div>
              )}
            </div>
          </div>
        </FloatingFocusManager>
      )}
    </FloatingPortal>
  );
}
