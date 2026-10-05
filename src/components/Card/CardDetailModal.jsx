import React, { useState } from 'react';
import Modal from '../shared/Modal';
import CardHeader from './CardHeader';
import CardTitle from './CardTitle';
import QuickAddRow from './QuickAddRow';
import DescriptionEditor from './DescriptionEditor';
import AttachmentsSection from './AttachmentsSection';
import AttachmentPopover from './AttachmentPopover';
import ChecklistSection from './ChecklistSection';
import ChecklistPopover from './ChecklistPopover';
import LabelsPopover from './LabelsPopover';
import MembersPopover from './MembersPopover';
import CommentsActivitySidebar from './CommentsActivitySidebar';
import CopyCardModal from './CopyCardModal';
import DatePicker from '../shared/DatePicker';
import LabelPill from '../shared/LabelPill';
import Avatar from '../shared/Avatar';
import { formatShortDate } from '../../lib/dateFormat';
import { CalendarRange, Calendar } from 'lucide-react';

export default function CardDetailModal({
  isOpen,
  onClose,
  card,
  workspaces = [],
  currentWorkspaceId,
  currentBoardId,
  boardLists = [],
  boardMembers = [],
  boardLabels = [],
  boardActivity = [],
  onUpdateCard,
  onDeleteCard,
  onMoveList,
  onToggleLabel,
  onToggleMember,
  onAddComment,
  onDeleteComment,
  onAddChecklist,
  onDeleteChecklist,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
  onUploadAttachment,
  onAddLinkAttachment,
  onDeleteAttachment,
  onCreateBoardLabel,
  onCopyCard
}) {
  const [activePopover, setActivePopover] = useState(null);
  const [activeAnchorRef, setActiveAnchorRef] = useState(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  if (!card) return null;

  const handleOpenDates = (anchorRef) => {
    setActiveAnchorRef(anchorRef);
    setActivePopover('dates');
  };

  const handleOpenLabels = (anchorRef) => {
    setActiveAnchorRef(anchorRef);
    setActivePopover('labels');
  };

  const handleOpenMembers = (anchorRef) => {
    setActiveAnchorRef(anchorRef);
    setActivePopover('members');
  };

  const handleOpenChecklist = (anchorRef) => {
    setActiveAnchorRef(anchorRef);
    setActivePopover('checklist');
  };

  const handleOpenAttachment = (anchorRef) => {
    setActiveAnchorRef(anchorRef);
    setActivePopover('attachment');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      size="xl"
      className="max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:rounded-none max-sm:border-none sm:h-[88vh] sm:max-h-[90vh]"
      bodyClassName="p-0 flex flex-col flex-1 overflow-hidden"
    >
      <div className="flex flex-col h-full w-full overflow-hidden bg-surface">
        {/* Card Header (List dropdown, overflow menu, single close X) */}
        <div className="px-4 sm:px-6 pt-3.5 shrink-0 bg-surface">
          <CardHeader
            card={card}
            boardLists={boardLists}
            onMoveList={(listId) => onMoveList(card.id, listId)}
            onArchiveCard={async () => {
              await onUpdateCard(card.id, { is_archived: true });
              onClose();
            }}
            onCopyCard={() => setIsCopyModalOpen(true)}
            onDeleteCard={() => {
              onDeleteCard(card.id);
              onClose();
            }}
            onClose={onClose}
          />
        </div>

        {/* Dual Panels on Desktop (lg:) / Single Scrolling Column on Mobile */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          {/* Card Details */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 lg:border-r border-border">
            {/* Date Badges — shown above title if dates are set */}
            {(card.start_date || card.due_date) && (() => {
              const now = new Date();
              const due = card.due_date ? new Date(card.due_date) : null;
              const isOverdue = due && due < now && !card.is_complete;
              const isDueSoon = due && due - now < 24 * 60 * 60 * 1000 && due >= now && !card.is_complete;
              return (
                <div className="flex items-center gap-2 flex-wrap">
                  {card.start_date && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-surface-muted text-text-primary border border-border">
                      <CalendarRange className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] text-text-muted font-medium">Start</span>
                      <span>{formatShortDate(card.start_date)}</span>
                    </div>
                  )}
                  {card.due_date && (
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                      card.is_complete
                        ? 'bg-success-tint text-success-text border-success/40'
                        : isOverdue
                        ? 'bg-danger-tint text-danger-text border-danger/40'
                        : isDueSoon
                        ? 'bg-warning-tint text-warning-text border-warning/40'
                        : 'bg-surface-muted text-text-primary border-border'
                    }`}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium opacity-70">Due</span>
                      <span>{formatShortDate(card.due_date)}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Card Title & Complete Checkbox */}
            <CardTitle
              card={card}
              onUpdateTitle={(title) => onUpdateCard(card.id, { title })}
              onToggleComplete={(is_complete) => onUpdateCard(card.id, { is_complete })}
            />

            {/* Quick Add Row */}
            <QuickAddRow
              onOpenLabels={handleOpenLabels}
              onOpenDates={handleOpenDates}
              onOpenChecklist={handleOpenChecklist}
              onOpenAttachment={handleOpenAttachment}
              onOpenMembers={handleOpenMembers}
            />

            {/* Rendered Selected Labels & Assignees */}
            {((card.labels && card.labels.length > 0) || (card.members && card.members.length > 0)) && (
              <div className="flex flex-wrap items-center gap-6 p-3 bg-surface-muted border border-border rounded-xl">
                {card.labels && card.labels.length > 0 && (
                  <div className="space-y-1">
                    <span className="block text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                      Labels
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {card.labels.map((l) => (
                        <LabelPill key={l.id} name={l.name} color={l.color} size="sm" />
                      ))}
                    </div>
                  </div>
                )}

                {card.members && card.members.length > 0 && (
                  <div className="space-y-1">
                    <span className="block text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                      Assignees
                    </span>
                    <div className="flex items-center gap-1.5">
                      {card.members.map((m) => (
                        <Avatar key={m.id} name={m.name} email={m.email} size="sm" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Rich Text Description (Tiptap) */}
            <DescriptionEditor
              cardId={card.id}
              initialValue={card.description}
              onSave={(description) => onUpdateCard(card.id, { description })}
            />

            {/* Attachments Section */}
            <AttachmentsSection
              attachments={card.attachments || []}
              onDeleteAttachment={onDeleteAttachment}
            />

            {/* Checklists Section */}
            <ChecklistSection
              checklists={card.checklists || []}
              onDeleteChecklist={onDeleteChecklist}
              onAddChecklistItem={onAddChecklistItem}
              onUpdateChecklistItem={onUpdateChecklistItem}
              onDeleteChecklistItem={onDeleteChecklistItem}
            />
          </div>

          {/* Right Independent Scroll Panel (Comments & Activity Feed) */}
          <div className="w-full lg:w-96 overflow-y-auto p-6 space-y-6 shrink-0 bg-surface border-t lg:border-t-0 border-border">
            <CommentsActivitySidebar
              card={card}
              boardActivity={boardActivity}
              onAddComment={onAddComment}
              onDeleteComment={onDeleteComment}
            />
          </div>
        </div>
      </div>

      {/* Portal Popovers anchored dynamically */}
      <DatePicker
        isOpen={activePopover === 'dates'}
        onClose={() => setActivePopover(null)}
        anchorRef={activeAnchorRef}
        startDate={card.start_date}
        dueDate={card.due_date}
        onChange={({ startDate, dueDate }) =>
          onUpdateCard(card.id, { start_date: startDate, due_date: dueDate })
        }
      />

      <LabelsPopover
        isOpen={activePopover === 'labels'}
        onClose={() => setActivePopover(null)}
        anchorRef={activeAnchorRef}
        cardLabels={card.labels || []}
        boardLabels={boardLabels}
        onToggleLabel={(labelId) => onToggleLabel(card.id, labelId)}
        onCreateBoardLabel={onCreateBoardLabel}
      />

      <MembersPopover
        isOpen={activePopover === 'members'}
        onClose={() => setActivePopover(null)}
        anchorRef={activeAnchorRef}
        cardMembers={card.members || []}
        boardMembers={boardMembers}
        onToggleMember={(userId) => onToggleMember(card.id, userId)}
      />

      <ChecklistPopover
        isOpen={activePopover === 'checklist'}
        onClose={() => setActivePopover(null)}
        anchorRef={activeAnchorRef}
        onAddChecklist={(title) => onAddChecklist(card.id, title)}
      />

      <AttachmentPopover
        isOpen={activePopover === 'attachment'}
        onClose={() => setActivePopover(null)}
        anchorRef={activeAnchorRef}
        onUploadFile={(file) => onUploadAttachment(card.id, file)}
        onAddLink={(link_url, display_name) => onAddLinkAttachment(card.id, link_url, display_name)}
      />

      <CopyCardModal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        card={card}
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        currentBoardId={currentBoardId}
        onCopyCard={onCopyCard}
      />
    </Modal>
  );
}
