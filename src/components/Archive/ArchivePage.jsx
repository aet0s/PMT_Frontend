import React from 'react';
import {
  Archive,
  ArrowLeft,
  Briefcase,
  CreditCard,
  LayoutGrid,
  RefreshCw,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { formatShortDate } from '../../lib/dateFormat';

function EmptyState({ label }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center">
      <p className="text-xs font-medium text-text-secondary">{label}</p>
    </div>
  );
}

function ItemActions({ onRestore, onDelete }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={onRestore}
        className="flex items-center gap-1.5 rounded-md bg-success-tint px-2.5 py-1.5 text-[11px] font-semibold text-success-text transition-colors hover:bg-success-tint/80 cursor-pointer"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Restore
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-md p-1.5 text-danger-text transition-colors hover:bg-danger-tint cursor-pointer"
        title="Delete permanently"
        aria-label="Delete permanently"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ArchiveSection({ icon: Icon, title, count, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        </div>
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text-secondary border border-border">
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}

export default function ArchivePage({
  archiveData,
  isLoading,
  onBack,
  onRefresh,
  onRestoreWorkspace,
  onDeleteWorkspace,
  onRestoreBoard,
  onDeleteBoard,
  onRestoreCard,
  onDeleteCard
}) {
  const workspaces = archiveData?.workspaces || [];
  const boards = archiveData?.boards || [];
  const cards = archiveData?.cards || [];

  return (
    <div className="flex-1 overflow-y-auto bg-app text-text-primary">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary cursor-pointer"
            title="Back to board"
            aria-label="Back to board"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-warning" />
              <h2 className="truncate text-xl font-bold text-text-primary">Archived Items</h2>
            </div>
            <p className="mt-1 text-xs font-medium text-text-secondary">
              Restore items when you need them back, or delete them permanently.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-lg bg-surface border border-border px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-surface-muted cursor-pointer shadow-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 p-6">
        {isLoading ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-text-muted">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <p className="text-sm font-semibold">Loading archive...</p>
          </div>
        ) : (
          <>
            <ArchiveSection icon={Briefcase} title="Workspaces" count={workspaces.length}>
              {workspaces.length === 0 ? (
                <EmptyState label="No archived workspaces" />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {workspaces.map((workspace) => (
                    <article key={workspace.id} className="rounded-xl border border-border bg-surface p-4 shadow-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-text-primary">{workspace.name}</p>
                          <p className="mt-1 text-[11px] font-medium text-text-muted">
                            Archived workspace
                          </p>
                        </div>
                        <ItemActions
                          onRestore={() => onRestoreWorkspace(workspace.id)}
                          onDelete={() => onDeleteWorkspace(workspace.id)}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </ArchiveSection>

            <ArchiveSection icon={LayoutGrid} title="Boards" count={boards.length}>
              {boards.length === 0 ? (
                <EmptyState label="No archived boards" />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {boards.map((board) => (
                    <article key={board.id} className="rounded-xl border border-border bg-surface p-4 shadow-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-text-primary">{board.name}</p>
                          <p className="mt-1 text-[11px] font-medium text-text-muted">
                            {board.workspace_name}
                          </p>
                        </div>
                        <ItemActions
                          onRestore={() => onRestoreBoard(board.id)}
                          onDelete={() => onDeleteBoard(board.id)}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </ArchiveSection>

            <ArchiveSection icon={CreditCard} title="Cards" count={cards.length}>
              {cards.length === 0 ? (
                <EmptyState label="No archived cards" />
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {cards.map((card) => (
                    <article key={card.id} className="rounded-xl border border-border bg-surface p-4 shadow-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-text-primary">{card.title}</p>
                          <p className="mt-1 text-[11px] font-medium text-text-muted">
                            {card.workspace_name} / {card.board_name} / {card.list_name}
                          </p>
                          {(card.start_date || card.due_date) && (
                            <p className="mt-2 text-[11px] font-medium text-text-secondary">
                              {card.start_date ? `Start ${formatShortDate(card.start_date)}` : ''}
                              {card.start_date && card.due_date ? ' - ' : ''}
                              {card.due_date ? `Due ${formatShortDate(card.due_date)}` : ''}
                            </p>
                          )}
                        </div>
                        <ItemActions
                          onRestore={() => onRestoreCard(card.id)}
                          onDelete={() => onDeleteCard(card.id)}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </ArchiveSection>
          </>
        )}
      </div>
    </div>
  );
}
