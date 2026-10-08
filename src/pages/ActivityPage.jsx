// client/src/pages/ActivityPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Download,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Circle,
  Tag,
  Paperclip,
  UserPlus,
  UserMinus,
  CheckSquare,
  ArrowRightLeft,
  PlusCircle,
  Trash2,
  Archive,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  X
} from 'lucide-react';
import { getWorkspaceActivity } from '../api/workspaces';
import { formatDate, formatRelativeTime } from '../lib/dateFormat';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';

const ACTION_CATEGORIES = [
  { id: 'all', label: 'All Activity' },
  { id: 'tasks', label: 'Tasks & Moves' },
  { id: 'comments', label: 'Comments' },
  { id: 'members', label: 'Members' },
  { id: 'attachments', label: 'Attachments' },
  { id: 'labels', label: 'Labels & Tags' }
];

const CATEGORY_ACTION_MAP = {
  tasks: ['created_card', 'moved_card', 'marked_complete', 'marked_incomplete', 'deleted_card', 'archived_card', 'unarchived_card'],
  comments: ['added_comment'],
  members: ['member_added', 'member_removed'],
  attachments: ['attachment_added'],
  labels: ['label_added', 'label_removed']
};

function getActionMeta(actionType) {
  switch (actionType) {
    case 'created_card':
      return {
        label: 'Created Task',
        icon: PlusCircle,
        badgeClass: 'bg-primary-tint text-primary-text border-primary/20',
        verb: 'created task'
      };
    case 'moved_card':
      return {
        label: 'Moved Task',
        icon: ArrowRightLeft,
        badgeClass: 'bg-info-tint text-info-text border-info/20',
        verb: 'moved'
      };
    case 'marked_complete':
    case 'completed_card':
      return {
        label: 'Completed',
        icon: CheckCircle2,
        badgeClass: 'bg-success-tint text-success-text border-success/20',
        verb: 'completed task'
      };
    case 'marked_incomplete':
      return {
        label: 'Reopened',
        icon: Circle,
        badgeClass: 'bg-warning-tint text-warning-text border-warning/20',
        verb: 'reopened task'
      };
    case 'added_comment':
      return {
        label: 'Commented',
        icon: MessageSquare,
        badgeClass: 'bg-primary-tint text-primary-text border-primary/20',
        verb: 'commented on'
      };
    case 'due_date_changed':
      return {
        label: 'Due Date',
        icon: Calendar,
        badgeClass: 'bg-warning-tint text-warning-text border-warning/20',
        verb: 'changed due date for'
      };
    case 'member_added':
      return {
        label: 'Assigned',
        icon: UserPlus,
        badgeClass: 'bg-success-tint text-success-text border-success/20',
        verb: 'assigned'
      };
    case 'member_removed':
      return {
        label: 'Unassigned',
        icon: UserMinus,
        badgeClass: 'bg-danger-tint text-danger-text border-danger/20',
        verb: 'unassigned'
      };
    case 'label_added':
      return {
        label: 'Tag Added',
        icon: Tag,
        badgeClass: 'bg-primary-tint text-primary-text border-primary/20',
        verb: 'added label'
      };
    case 'label_removed':
      return {
        label: 'Tag Removed',
        icon: Tag,
        badgeClass: 'bg-surface-muted text-text-muted border-border',
        verb: 'removed label'
      };
    case 'attachment_added':
      return {
        label: 'Attachment',
        icon: Paperclip,
        badgeClass: 'bg-info-tint text-info-text border-info/20',
        verb: 'attached file to'
      };
    case 'checklist_toggled':
      return {
        label: 'Checklist',
        icon: CheckSquare,
        badgeClass: 'bg-primary-tint text-primary-text border-primary/20',
        verb: 'updated checklist on'
      };
    case 'deleted_card':
      return {
        label: 'Deleted',
        icon: Trash2,
        badgeClass: 'bg-danger-tint text-danger-text border-danger/20',
        verb: 'deleted task'
      };
    case 'archived_card':
      return {
        label: 'Archived',
        icon: Archive,
        badgeClass: 'bg-warning-tint text-warning-text border-warning/20',
        verb: 'archived task'
      };
    case 'created_board':
      return {
        label: 'New Board',
        icon: LayoutGrid,
        badgeClass: 'bg-primary-tint text-primary-text border-primary/20',
        verb: 'created board'
      };
    default:
      return {
        label: 'Activity',
        icon: Activity,
        badgeClass: 'bg-surface-muted text-text-secondary border-border',
        verb: 'updated'
      };
  }
}

export default function ActivityPage({ workspace }) {
  const toast = useToast();
  const navigate = useNavigate();

  const [activities, setActivities] = useState([]);
  const [boards, setBoards] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 1, has_more: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [page, setPage] = useState(1);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    document.title = `${workspace?.name || 'Workspace'} - Activity Feed | TaskFlow`;
  }, [workspace]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadActivities = useCallback(
    async (targetPage = page, showRefresh = false) => {
      if (!workspace?.id) return;
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const actionTypes = CATEGORY_ACTION_MAP[selectedCategory];
        const actionParam = actionTypes ? actionTypes[0] : 'all'; // Default single type or 'all'

        const res = await getWorkspaceActivity(workspace.id, {
          page: targetPage,
          limit: 20,
          boardId: selectedBoardId || null,
          actionType: actionParam,
          search: debouncedSearch
        });

        // Filter client-side if a multi-action category was picked
        let list = res.activities || [];
        if (actionTypes && actionTypes.length > 1) {
          list = list.filter((a) => actionTypes.includes(a.action_type));
        }

        setActivities(list);
        setPagination(res.pagination || { page: targetPage, limit: 20, total: list.length, total_pages: 1, has_more: false });
        if (res.boards && res.boards.length > 0) {
          setBoards(res.boards);
        }
      } catch (err) {
        console.error('Failed to load activity feed:', err);
        toast.show(err.message || 'Failed to load activity feed', 'error');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [workspace?.id, page, selectedBoardId, selectedCategory, debouncedSearch, toast]
  );

  useEffect(() => {
    loadActivities(page);
  }, [loadActivities, page]);

  const handleExportCsv = () => {
    if (activities.length === 0) {
      toast.show('No activities to export', 'info');
      return;
    }

    const header = ['ID', 'Date', 'Time', 'Actor', 'Actor Email', 'Action', 'Task', 'Board', 'Details'];
    const rows = activities.map((act) => [
      act.id,
      formatDate(act.created_at).split(' ')[0],
      formatDate(act.created_at).split(' ').slice(1).join(' '),
      act.user_name || 'System',
      act.user_email || 'N/A',
      act.action_type,
      act.card_title || 'N/A',
      act.board_name || 'N/A',
      JSON.stringify(act.meta || {})
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `activity_feed_${workspace?.name || 'workspace'}_page_${page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.show('Activity feed page exported to CSV', 'success');
  };

  const handleItemClick = (act) => {
    if (act.board_id && act.card_id) {
      navigate(`/w/${workspace?.id}/p/${act.board_id}/board?card=${act.card_id}`);
    } else if (act.board_id) {
      navigate(`/w/${workspace?.id}/p/${act.board_id}/board`);
    }
  };

  const hasActiveFilters = Boolean(selectedBoardId || selectedCategory !== 'all' || searchTerm);

  const resetFilters = () => {
    setSelectedBoardId('');
    setSelectedCategory('all');
    setSearchTerm('');
    setDebouncedSearch('');
    setPage(1);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-app select-none text-left p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 sm:p-6 rounded-2xl border border-border shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary-tint text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                  Activity Feed
                </h1>
                <p className="text-xs text-text-secondary">
                  Real-time activity across <strong>{workspace?.name || 'Workspace'}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadActivities(page, true)}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
              title="Refresh activity feed"
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={activities.length === 0}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              title="Export current page to CSV"
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-border space-y-4 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-7 relative">
              <label htmlFor="activity-search-input" className="sr-only">
                Search activity
              </label>
              <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="activity-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search activity by task, member, or board..."
                className="w-full pl-10 pr-9 py-2 bg-surface text-text-primary border border-border rounded-xl text-xs placeholder:text-text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 transition-all min-h-[40px]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Board Selector */}
            <div className="sm:col-span-5">
              <Select
                value={selectedBoardId}
                onChange={(val) => {
                  setSelectedBoardId(val);
                  setPage(1);
                }}
                placeholder={`All Boards (${boards.length})`}
                options={[
                  { value: '', label: `All Boards (${boards.length})` },
                  ...boards.map((b) => ({ value: String(b.id), label: b.name }))
                ]}
              />
            </div>
          </div>

          {/* Action Filter Pills */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-border/60">
            <div className="flex items-center gap-1.5 flex-wrap">
              {ACTION_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary text-white shadow-2xs font-semibold'
                        : 'bg-surface-muted/70 text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-danger hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Activity Feed Stream */}
        <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xs divide-y divide-border">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Spinner size="lg" />
              <p className="text-xs text-text-muted font-medium">Loading activity stream...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-muted mx-auto flex items-center justify-center text-text-muted border border-border">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">No activities found</h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No actions match the selected filters. Try clearing your filters or changing your search.'
                  : 'Start creating cards, making moves, or adding comments to build your workspace activity history.'}
              </p>
              {hasActiveFilters && (
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Reset All Filters
                  </Button>
                </div>
              )}
            </div>
          ) : (
            activities.map((act) => {
              const metaConfig = getActionMeta(act.action_type);
              const ActionIcon = metaConfig.icon;
              const hasCard = Boolean(act.card_title);

              return (
                <div
                  key={act.id}
                  onClick={() => handleItemClick(act)}
                  className="p-4 sm:p-5 flex items-start gap-3.5 hover:bg-surface-muted/30 transition-colors group cursor-pointer text-left"
                >
                  {/* User Avatar */}
                  <div className="relative shrink-0 pt-0.5">
                    <Avatar
                      name={act.user_name}
                      src={act.user_avatar}
                      size="sm"
                    />
                    <div
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border border-surface shadow-2xs ${metaConfig.badgeClass}`}
                      title={metaConfig.label}
                    >
                      <ActionIcon className="w-2.5 h-2.5" />
                    </div>
                  </div>

                  {/* Activity Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-xs text-text-primary leading-relaxed">
                        <span className="font-bold text-text-primary hover:underline">
                          {act.user_name}
                        </span>{' '}
                        <span className="text-text-secondary">{metaConfig.verb}</span>{' '}
                        {hasCard ? (
                          <span className="font-semibold text-primary group-hover:underline">
                            {act.card_title}
                          </span>
                        ) : act.meta?.board_name ? (
                          <span className="font-semibold text-text-primary">
                            {act.meta.board_name}
                          </span>
                        ) : null}

                        {/* Moved card context: from list to list */}
                        {act.action_type === 'moved_card' && act.meta?.from_list_name && act.meta?.to_list_name && (
                          <span className="inline-flex items-center gap-1.5 ml-1">
                            <span className="text-text-muted">from</span>
                            <span className="px-1.5 py-0.5 rounded-md bg-surface-muted text-text-secondary font-medium text-[11px] border border-border/80">
                              {act.meta.from_list_name}
                            </span>
                            <span className="text-text-muted">to</span>
                            <span className="px-1.5 py-0.5 rounded-md bg-primary-tint text-primary-text font-semibold text-[11px] border border-primary/20">
                              {act.meta.to_list_name}
                            </span>
                          </span>
                        )}

                        {/* Member added context */}
                        {act.action_type === 'member_added' && act.meta?.member_name && (
                          <span className="ml-1 font-semibold text-text-primary">
                            {act.meta.member_name}
                          </span>
                        )}

                        {/* Label added context */}
                        {act.action_type === 'label_added' && act.meta?.label_name && (
                          <span className="ml-1.5 px-2 py-0.5 rounded-md bg-primary-tint text-primary-text font-semibold text-[11px] border border-primary/20">
                            #{act.meta.label_name}
                          </span>
                        )}

                        {/* Attachment context */}
                        {act.action_type === 'attachment_added' && act.meta?.file_name && (
                          <span className="ml-1 font-medium text-info font-mono text-[11px]">
                            {act.meta.file_name}
                          </span>
                        )}
                      </div>

                      {/* Board Badge & Arrow */}
                      <div className="flex items-center gap-2 shrink-0">
                        {act.board_name && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-muted text-text-secondary border border-border group-hover:border-primary/30 transition-colors">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${!act.board_background_color?.startsWith('#') ? 'bg-primary' : ''}`}
                              style={act.board_background_color?.startsWith('#') ? { backgroundColor: act.board_background_color } : undefined}
                            />
                            <span className="truncate max-w-[120px]">{act.board_name}</span>
                          </span>
                        )}
                        <ExternalLink className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 group-hover:text-primary transition-opacity" />
                      </div>
                    </div>

                    {/* Comment preview bubble */}
                    {act.action_type === 'added_comment' && act.meta?.preview && (
                      <div className="mt-1.5 p-2.5 rounded-xl bg-surface-muted/60 border border-border/80 text-xs text-text-secondary italic line-clamp-2">
                        "{act.meta.preview}"
                      </div>
                    )}

                    {/* Checklist item preview */}
                    {act.action_type === 'checklist_toggled' && act.meta?.item_text && (
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-text-secondary">
                        <CheckSquare className="w-3 h-3 text-primary" />
                        <span className={act.meta.completed ? 'line-through text-text-muted' : ''}>
                          {act.meta.item_text}
                        </span>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="flex items-center gap-2 pt-0.5 text-[11px] text-text-muted">
                      <span title={formatDate(act.created_at)}>
                        {formatRelativeTime(act.created_at)}
                      </span>
                      <span>•</span>
                      <span>{formatDate(act.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Server-Side Pagination Bar (20 per page) */}
        {!isLoading && pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-4 rounded-2xl border border-border shadow-xs text-xs">
            <div className="text-text-secondary">
              Showing{' '}
              <span className="font-semibold text-text-primary">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-text-primary">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of <span className="font-semibold text-text-primary">{pagination.total}</span> activities{' '}
              <span className="text-text-muted">(20 per page)</span>
            </div>

            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>

              {/* Page Number Pills */}
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, idx) => {
                  let pNum = idx + 1;
                  if (pagination.total_pages > 5 && pagination.page > 3) {
                    pNum = pagination.page - 3 + idx;
                    if (pNum > pagination.total_pages) {
                      pNum = pagination.total_pages - (4 - idx);
                    }
                  }
                  const isCurrent = pNum === pagination.page;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setPage(pNum)}
                      className={`w-7 h-7 rounded-lg font-semibold text-xs flex items-center justify-center transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-surface-muted text-text-secondary hover:text-text-primary hover:bg-surface-muted/80'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                disabled={!pagination.has_more && pagination.page >= pagination.total_pages}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
