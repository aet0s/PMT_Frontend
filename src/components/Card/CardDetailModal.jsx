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
import { formatShortDate, getServerNow } from '../../lib/dateFormat';
import { CalendarRange, Calendar, ShieldAlert, CheckCircle2, ExternalLink } from 'lucide-react';
import QuickCheckinModal from '../DailyTracker/QuickCheckinModal';
import TaskCompletionModal from './TaskCompletionModal';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../context/PermissionContext';

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
  onToggleAssigner,
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
  onDeleteBoardLabel,
  onCopyCard
}) {
  const toast = useToast();
  const { user } = useAuth();
  const { userRole } = usePermissions();
  const [activePopover, setActivePopover] = useState(null);
  const [activeAnchorRef, setActiveAnchorRef] = useState(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);

  if (!card) return null;

  const userRank = Number(userRole?.rank || 30);
  const roleName = String(userRole?.name || '').toLowerCase();
  const isTopLevel = userRank >= 50 || ['owner', 'admin', 'project manager', 'team lead'].includes(roleName);
  const isCreator = user && card.created_by && Number(card.created_by) === Number(user.id);
  const isAssignee = user && (card.members || []).some((m) => Number(m.id) === Number(user.id));
  const isAssigner = user && (card.assigners || []).some((a) => Number(a.id) === Number(user.id));
  const canModifyCard = isTopLevel || isCreator || isAssignee || isAssigner;
  const canCompleteCard = isTopLevel || isAssigner;
  const canManageAssigners = isTopLevel || isAssigner;

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

  const handleOpenAssigners = (anchorRef) => {
    setActiveAnchorRef(anchorRef);
    setActivePopover('assigners');
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
            canModify={canModifyCard}
            canComplete={canCompleteCard}
          />
        </div>

        {!canModifyCard && (
          <div className="mx-4 sm:mx-6 mt-3 px-3.5 py-2.5 rounded-xl bg-warning-tint border border-warning/30 text-warning-text text-xs flex items-center gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 shrink-0 text-warning" />
            <span>Members can only edit cards they created, are assigned to, or are assigners of. You have view and comment access to this card.</span>
          </div>
        )}

        {/* Dual Panels on Desktop (lg:) / Single Scrolling Column on Mobile */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          {/* Card Details */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 lg:border-r border-border">
            {/* Date Badges — shown above title if dates are set */}
            {(card.start_date || card.due_date) && (() => {
              const now = getServerNow();
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
              canModify={canModifyCard}
              canComplete={canCompleteCard}
              onUpdateTitle={(title) => onUpdateCard(card.id, { title })}
              onToggleComplete={(is_complete) => onUpdateCard(card.id, { is_complete })}
            />

            {/* Task Completion Outcome Banner */}
            {(card.is_complete || card.completion_note) && (
              <div className="p-3.5 bg-success-tint/25 border border-success/40 rounded-xl space-y-1.5 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-success-text uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-success stroke-[2.5]" />
                    <span>Completion Outcome</span>
                  </div>
                  {canCompleteCard && (
                    <button
                      type="button"
                      onClick={() => setIsCompletionModalOpen(true)}
                      className="text-xs text-primary font-bold hover:underline cursor-pointer"
                    >
                      {card.completion_note ? 'Edit Outcome' : 'Add Outcome Note'}
                    </button>
                  )}
                </div>
                {card.completion_note ? (
                  <p className="text-sm font-medium text-text-primary leading-relaxed break-words">
                    {card.completion_note}
                  </p>
                ) : (
                  <p className="text-xs text-text-muted italic">
                    No outcome summary recorded.
                  </p>
                )}
                {card.completion_evidence_url && (
                  <a
                    href={card.completion_evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline break-all pt-0.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{card.completion_evidence_url}</span>
                  </a>
                )}
              </div>
            )}

            {/* Quick Add Row */}
            <QuickAddRow
              onOpenLabels={handleOpenLabels}
              onOpenDates={handleOpenDates}
              onOpenChecklist={handleOpenChecklist}
              onOpenAttachment={handleOpenAttachment}
              onOpenMembers={handleOpenMembers}
              onOpenAssigners={handleOpenAssigners}
              onOpenCheckin={() => setIsCheckinModalOpen(true)}
              canModify={canModifyCard}
              canManageAssigners={canManageAssigners}
            />

            {/* Rendered Selected Labels, Assigners & Assignees */}
            {((card.labels && card.labels.length > 0) || (card.assigners && card.assigners.length > 0) || (card.members && card.members.length > 0)) && (
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

                {card.assigners && card.assigners.length > 0 && (
                  <div className="space-y-1">
                    <span className="block text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                      Assigners
                    </span>
                    <div className="flex items-center gap-1.5">
                      {card.assigners.map((a) => (
                        <Avatar key={a.id} name={a.name} email={a.email} src={a.avatar_url || a.avatar} user={a} size="sm" />
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
                        <Avatar key={m.id} name={m.name} email={m.email} src={m.avatar_url || m.avatar} user={m} size="sm" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Rich Text Description (Tiptap) */}
            <DescriptionEditor
              cardId={card.id}
              cardTitle={card.title}
              initialValue={card.description}
              onSave={(description) => onUpdateCard(card.id, { description })}
              canModify={canModifyCard}
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
              canModify={canModifyCard}
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
        onDeleteBoardLabel={onDeleteBoardLabel}
      />

      <MembersPopover
        isOpen={activePopover === 'assigners'}
        onClose={() => setActivePopover(null)}
        anchorRef={activeAnchorRef}
        title="Assigners"
        searchPlaceholder="Search assigners..."
        cardMembers={card.assigners || []}
        boardMembers={boardMembers}
        onToggleMember={(userId) => onToggleAssigner && onToggleAssigner(card.id, userId)}
        canManageAll={canManageAssigners}
        currentUserId={user?.id}
        cardAssigners={card.assigners || []}
      />

      <MembersPopover
        isOpen={activePopover === 'members'}
        onClose={() => setActivePopover(null)}
        anchorRef={activeAnchorRef}
        title="Assignees"
        searchPlaceholder="Search assignees..."
        cardMembers={card.members || []}
        boardMembers={boardMembers}
        onToggleMember={(userId) => onToggleMember(card.id, userId)}
        canManageAll={canManageAssigners}
        currentUserId={user?.id}
        cardAssigners={card.assigners || []}
      />

      <ChecklistPopover
        isOpen={activePopover === 'checklist'}
        onClose={() => setActivePopover(null)}
        anchorRef={activeAnchorRef}
        onAddChecklist={(title, items) => onAddChecklist(card.id, title, items)}
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

      {isCheckinModalOpen && (
        <QuickCheckinModal
          isOpen={isCheckinModalOpen}
          onClose={() => setIsCheckinModalOpen(false)}
          card={card}
          onSuccess={() => {
            setIsCheckinModalOpen(false);
            toast.success('Check-in submitted');
          }}
        />
      )}

      {isCompletionModalOpen && (
        <TaskCompletionModal
          isOpen={isCompletionModalOpen}
          onClose={() => setIsCompletionModalOpen(false)}
          card={card}
          onSubmit={async ({ completion_note, completion_evidence_url }) => {
            await onUpdateCard(card.id, {
              is_complete: true,
              completion_note,
              completion_evidence_url
            });
            setIsCompletionModalOpen(false);
            toast.success('Completion outcome updated');
          }}
        />
      )}
    </Modal>
  );
}
