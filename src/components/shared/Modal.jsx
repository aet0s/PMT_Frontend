import React from 'react';
import { Modal as UIModal } from '../ui/Modal';

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-2xl',
  size: propSize,
  showCloseButton = true,
  className = '',
  bodyClassName,
  footer
}) {
  let size = propSize || 'lg';
  if (!propSize) {
    if (maxWidth.includes('max-w-4xl') || maxWidth.includes('max-w-5xl')) size = 'xl';
    else if (maxWidth.includes('max-w-xl')) size = 'md';
    else if (maxWidth.includes('max-w-sm') || maxWidth.includes('max-w-md')) size = 'sm';
    else if (maxWidth.includes('max-w-6xl') || maxWidth.includes('max-w-full')) size = 'full';
  }

  return (
    <UIModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      showCloseButton={showCloseButton}
      className={className}
      bodyClassName={bodyClassName}
      footer={footer}
    >
      {children}
    </UIModal>
  );
}
