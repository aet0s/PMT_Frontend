// client/src/components/ui/ConfirmDialog.jsx
import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, Info } from 'lucide-react';

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  onConfirm,
  onCancel,
  isLoading = false
}) {
  const icon =
    variant === 'danger' || variant === 'warning' ? (
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        variant === 'danger' ? 'bg-danger-tint text-danger-text' : 'bg-warning-tint text-warning-text'
      }`}>
        <AlertTriangle className="w-5 h-5" />
      </div>
    ) : (
      <div className="w-10 h-10 rounded-full bg-primary-tint text-primary-text flex items-center justify-center shrink-0">
        <Info className="w-5 h-5" />
      </div>
    );

  const confirmVariant = variant === 'danger' ? 'danger' : 'primary';

  const handleConfirm = async (e) => {
    try {
      await onConfirm?.(e);
    } finally {
      onCancel?.();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="sm"
      showCloseButton={false}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        {icon}
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          <p className="text-sm text-text-secondary">{message}</p>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
