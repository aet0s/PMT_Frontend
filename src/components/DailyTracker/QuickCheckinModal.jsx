// client/src/components/DailyTracker/QuickCheckinModal.jsx
// Thin modal wrapper around DailyUpdatePanel (replaces legacy per-card form).
import React from 'react';
import { Modal } from '../ui/Modal';
import DailyUpdatePanel from './DailyUpdatePanel';

export default function QuickCheckinModal({
  isOpen,
  onClose,
  card,
  workspaceId,
  onSuccess
}) {
  if (!isOpen) return null;

  const wsId = workspaceId || card?.workspace_id || card?.workspaceId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Daily Update"
      maxWidth="max-w-2xl"
    >
      <DailyUpdatePanel
        workspaceId={wsId}
        highlightCardId={card?.id || card?.card_id || null}
        compact
        onSuccess={() => {
          if (onSuccess) onSuccess();
          onClose();
        }}
      />
    </Modal>
  );
}
