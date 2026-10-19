import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Archive,
  Briefcase,
  FolderKanban,
  CreditCard,
  RefreshCw,
  RotateCcw,
  Trash2,
  Search,
  X,
  Filter,
  Clock,
  CheckCircle2,
  Calendar,
  Tag,
  User,
  Layers,
  ChevronRight,
  AlertTriangle,
  Paperclip,
  MessageSquare,
  CheckSquare,
  Eye,
  Download,
  ExternalLink,
  FileText,
  ChevronLeft,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { formatDate, formatShortDate } from '../../lib/dateFormat';
import { usePermissions } from '../../context/PermissionContext';
import { useAuth } from '../../hooks/useAuth';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import Popover from '../ui/Popover';
import { getFileUrl } from '../../api/config';

// Theme-matched Calendar Date Selector with Day, Month, and Year Pickers
function DateFilterPicker({ label, value, onChange, placeholder = 'Select date' }) {
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());
  const [pickerMode, setPickerMode] = useState('days'); // 'days' | 'month' | 'year'

  useEffect(() => {
    if (value) {
      setViewDate(new Date(value + 'T00:00:00'));
    }
  }, [value]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Year range block for year selector (12 years block)
  const [yearBase, setYearBase] = useState(() => Math.floor(year / 12) * 12);
  useEffect(() => {
    setYearBase(Math.floor(year / 12) * 12);
  }, [year]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const handlePrev = (e) => {
    e.stopPropagation();
    if (pickerMode === 'days') {
      setViewDate(new Date(year, month - 1, 1));
    } else if (pickerMode === 'month') {
      setViewDate(new Date(year - 1, month, 1));
    } else if (pickerMode === 'year') {
      setYearBase((prev) => prev - 12);
    }
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (pickerMode === 'days') {
      setViewDate(new Date(year, month + 1, 1));
    } else if (pickerMode === 'month') {
      setViewDate(new Date(year + 1, month, 1));
    } else if (pickerMode === 'year') {
      setYearBase((prev) => prev + 12);
    }
  };

  const handleSelectDay = (day, close) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dStr);
    setPickerMode('days');
    close();
  };

  const handleSelectMonth = (mIdx) => {
    setViewDate(new Date(year, mIdx, 1));
    setPickerMode('days');
  };

  const handleSelectYear = (y) => {
    setViewDate(new Date(y, month, 1));
    setPickerMode('days');
  };

  const handleToday = (close) => {
    const now = new Date();
    const dStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    onChange(dStr);
    setViewDate(now);
    setPickerMode('days');
    close();
  };

  const handleClear = (e, close) => {
    if (e) e.stopPropagation();
    onChange('');
    setPickerMode('days');
    if (close) close();
  };

  const displayFormatted = selectedDate
    ? selectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
        {label}
      </label>
      <Popover
        placement="bottom-start"
        trigger={
          <button
            type="button"
            className={`w-full h-8 px-2.5 rounded-lg border text-xs flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
              value
                ? 'bg-surface text-text-primary border-primary/40 font-semibold shadow-2xs'
                : 'bg-surface text-text-muted border-border hover:border-border-strong hover:bg-surface-muted/40 font-normal'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Calendar className={`w-3.5 h-3.5 shrink-0 ${value ? 'text-primary' : 'text-text-muted'}`} />
              <span className="truncate">{displayFormatted || placeholder}</span>
            </div>
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => handleClear(e)}
                className="p-0.5 rounded-md hover:bg-danger-tint hover:text-danger text-text-muted transition-colors shrink-0"
                title="Clear date"
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </button>
        }
      >
        {({ close }) => (
          <div className="w-68 p-1.5 space-y-2 select-none">
            {/* Header: Interactive Month & Year Buttons + Navigation Arrows */}
            <div className="flex items-center justify-between px-1 border-b border-border/60 pb-1.5">
              <div className="flex items-center gap-1">
                {/* Month Picker Toggle */}
                <button
                  type="button"
                  onClick={() => setPickerMode(pickerMode === 'month' ? 'days' : 'month')}
                  className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    pickerMode === 'month'
                      ? 'bg-primary text-white shadow-2xs'
                      : 'text-text-primary hover:bg-surface-muted'
                  }`}
                  title="Pick Month"
                >
                  <span>{monthNames[month]}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${pickerMode === 'month' ? 'rotate-180' : ''}`} />
                </button>

                {/* Year Picker Toggle */}
                <button
                  type="button"
                  onClick={() => setPickerMode(pickerMode === 'year' ? 'days' : 'year')}
                  className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    pickerMode === 'year'
                      ? 'bg-primary text-white shadow-2xs'
                      : 'text-text-primary hover:bg-surface-muted'
                  }`}
                  title="Pick Year"
                >
                  <span>{year}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${pickerMode === 'year' ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Prev / Next Arrows */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
                  title={pickerMode === 'year' ? 'Previous 12 Years' : pickerMode === 'month' ? 'Previous Year' : 'Previous Month'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
                  title={pickerMode === 'year' ? 'Next 12 Years' : pickerMode === 'month' ? 'Next Year' : 'Next Month'}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* VIEW 1: MONTH PICKER GRID (12 Months) */}
            {pickerMode === 'month' && (
              <div className="grid grid-cols-3 gap-1.5 py-1">
                {monthNames.map((mName, mIdx) => {
                  const isCurrent = mIdx === month;
                  return (
                    <button
                      key={mName}
                      type="button"
                      onClick={() => handleSelectMonth(mIdx)}
                      className={`py-2 px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-primary text-white font-bold shadow-xs'
                          : 'text-text-primary hover:bg-surface-muted hover:text-text-primary'
                      }`}
                    >
                      {mName.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            )}

            {/* VIEW 2: YEAR PICKER GRID (12 Years) */}
            {pickerMode === 'year' && (
              <div className="space-y-1.5 py-1">
                <div className="text-[11px] font-bold text-text-muted px-1">
                  Range: {yearBase} &ndash; {yearBase + 11}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {Array.from({ length: 12 }, (_, i) => yearBase + i).map((y) => {
                    const isCurrent = y === year;
                    return (
                      <button
                        key={y}
                        type="button"
                        onClick={() => handleSelectYear(y)}
                        className={`py-2 px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-primary text-white font-bold shadow-xs'
                            : 'text-text-primary hover:bg-surface-muted hover:text-text-primary'
                        }`}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW 3: STANDARD DAYS GRID */}
            {pickerMode === 'days' && (
              <>
                {/* Days of week */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {daysOfWeek.map((d) => (
                    <span key={d} className="text-[10px] font-bold text-text-muted">
                      {d}
                    </span>
                  ))}
                </div>

                {/* Calendar Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <span
                      key={`prev-${i}`}
                      className="h-7 flex items-center justify-center text-[11px] text-text-muted/40 font-medium pointer-events-none"
                    >
                      {daysInPrevMonth - firstDayOfMonth + i + 1}
                    </span>
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const isSelected =
                      selectedDate &&
                      selectedDate.getFullYear() === year &&
                      selectedDate.getMonth() === month &&
                      selectedDate.getDate() === dayNum;

                    const isToday =
                      new Date().getFullYear() === year &&
                      new Date().getMonth() === month &&
                      new Date().getDate() === dayNum;

                    return (
                      <button
                        key={`day-${dayNum}`}
                        type="button"
                        onClick={() => handleSelectDay(dayNum, close)}
                        className={`h-7 w-7 mx-auto flex items-center justify-center rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-white font-bold shadow-xs'
                            : isToday
                            ? 'ring-1 ring-primary/50 text-primary font-bold hover:bg-primary-tint'
                            : 'text-text-primary hover:bg-surface-muted hover:text-text-primary'
                        }`}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Quick Actions Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60 px-1 text-[11px]">
              <button
                type="button"
                onClick={() => handleToday(close)}
                className="text-primary hover:text-primary-hover font-semibold transition-colors cursor-pointer"
              >
                Today
              </button>
              {pickerMode !== 'days' && (
                <button
                  type="button"
                  onClick={() => setPickerMode('days')}
                  className="text-text-muted hover:text-text-primary font-medium transition-colors cursor-pointer"
                >
                  Back to Days
                </button>
              )}
              {value && (
                <button
                  type="button"
                  onClick={() => handleClear(null, close)}
                  className="text-danger hover:text-danger-hover font-medium transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </Popover>
    </div>
  );
}

export default function ArchivePage({
  archiveData,
  isLoading,
  workspaces = [],
  activeWorkspace,
  boards = [],
  onBack,
  onRefresh,
  onRestoreWorkspace,
  onDeleteWorkspace,
  onRestoreBoard,
  onDeleteBoard,
  onRestoreCard,
  onDeleteCard
}) {
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const canDeleteWorkspace = hasPermission('workspace.delete');
  const canRestoreWorkspace = hasPermission('workspace.edit') || hasPermission('workspace.archive');
  const canDeleteBoard = hasPermission('project.delete');
  const canRestoreBoard = hasPermission('project.edit_settings') || hasPermission('project.archive');
  const canDeleteAnyCard = hasPermission('task.delete');
  const canDeleteOwnCard = hasPermission('task.delete_own');
  const canDeleteCard = (c) => Boolean(canDeleteAnyCard || (canDeleteOwnCard && c?.created_by && user?.id && Number(c.created_by) === Number(user.id)));
  const canRestoreCard = hasPermission('task.restore') || hasPermission('task.archive');

  // Top level active tab: 'cards' | 'boards' | 'workspaces'
  const [activeTab, setActiveTab] = useState('cards');

  // 1. Workspace selection
  const availableWorkspaces = useMemo(() => {
    const list = archiveData?.userWorkspaces?.length ? archiveData.userWorkspaces : workspaces;
    if (list.length > 0) return list;
    const wsMap = new Map();
    (archiveData?.cards || []).forEach((c) => {
      if (c.workspace_id && !wsMap.has(c.workspace_id)) {
        wsMap.set(c.workspace_id, { id: c.workspace_id, name: c.workspace_name || `Workspace ${c.workspace_id}` });
      }
    });
    return Array.from(wsMap.values());
  }, [archiveData?.userWorkspaces, archiveData?.cards, workspaces]);

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(() => {
    if (activeWorkspace?.id) return String(activeWorkspace.id);
    if (availableWorkspaces.length > 0) return String(availableWorkspaces[0].id);
    return 'all';
  });

  // 2. Board selection (depends on selected workspace)
  const availableBoards = useMemo(() => {
    const allBoards = archiveData?.userBoards?.length ? archiveData.userBoards : boards;
    const wsIdNum = Number(selectedWorkspaceId);
    let filtered = allBoards;
    if (selectedWorkspaceId !== 'all') {
      filtered = allBoards.filter((b) => Number(b.workspace_id) === wsIdNum);
    }
    const boardMap = new Map();
    filtered.forEach((b) => boardMap.set(Number(b.id), b));
    (archiveData?.cards || []).forEach((c) => {
      if (selectedWorkspaceId === 'all' || Number(c.workspace_id) === wsIdNum) {
        if (c.board_id && !boardMap.has(Number(c.board_id))) {
          boardMap.set(Number(c.board_id), { id: c.board_id, name: c.board_name, workspace_id: c.workspace_id });
        }
      }
    });
    return Array.from(boardMap.values());
  }, [archiveData?.userBoards, archiveData?.cards, boards, selectedWorkspaceId]);

  const [selectedBoardId, setSelectedBoardId] = useState('all');

  // Filters State for Cards
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterLabelId, setFilterLabelId] = useState('all');
  const [filterAssigneeId, setFilterAssigneeId] = useState('all');
  const [filterAssignerId, setFilterAssignerId] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Pagination State (server-side, default 20)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Card details modal state
  const [inspectCard, setInspectCard] = useState(null);
  const [showAllComments, setShowAllComments] = useState(false);
  // Delete confirm states
  const [cardToDelete, setCardToDelete] = useState(null);
  const [boardToDelete, setBoardToDelete] = useState(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState(null);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync server fetch whenever filters, scope, or pagination change
  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      if (onRefresh) {
        onRefresh({
          page,
          limit,
          workspace_id: selectedWorkspaceId,
          board_id: selectedBoardId,
          search: debouncedSearch,
          label_id: filterLabelId,
          assignee_id: filterAssigneeId,
          assigner_id: filterAssignerId,
          start_date: filterStartDate,
          end_date: filterEndDate
        });
      }
      return;
    }

    if (onRefresh) {
      onRefresh({
        page,
        limit,
        workspace_id: selectedWorkspaceId,
        board_id: selectedBoardId,
        search: debouncedSearch,
        label_id: filterLabelId,
        assignee_id: filterAssigneeId,
        assigner_id: filterAssignerId,
        start_date: filterStartDate,
        end_date: filterEndDate
      });
    }
  }, [
    page,
    limit,
    selectedWorkspaceId,
    selectedBoardId,
    debouncedSearch,
    filterLabelId,
    filterAssigneeId,
    filterAssignerId,
    filterStartDate,
    filterEndDate
  ]);

  const archivedCards = archiveData?.cards || [];
  const archivedBoards = archiveData?.boards || [];
  const archivedWorkspaces = archiveData?.workspaces || [];
  const pagination = archiveData?.pagination || {
    page: 1,
    limit: 20,
    totalCards: archivedCards.length,
    totalPages: Math.ceil(archivedCards.length / limit) || 1
  };

  // Dropdown options directly from server response (availableLabels, availableMembers)
  const labelOptions = useMemo(() => {
    const map = new Map();
    const addLabel = (l) => {
      if (!l || !l.name) return;
      const key = l.name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, { name: l.name.trim(), color: l.color });
      }
    };
    (archiveData?.availableLabels || []).forEach(addLabel);
    // Also include any labels on current cards
    archivedCards.forEach((c) => {
      (c.labels || []).forEach(addLabel);
    });
    return [
      { value: 'all', label: 'All Labels' },
      ...Array.from(map.values()).map((l) => ({
        value: l.name,
        label: l.name,
        icon: (
          <span
            className="w-2.5 h-2.5 rounded-full inline-block mr-1.5 shrink-0"
            style={{ backgroundColor: l.color || 'var(--color-primary)' }}
          />
        )
      }))
    ];
  }, [archiveData?.availableLabels, archivedCards]);

  const assigneeOptions = useMemo(() => {
    const map = new Map();
    (archiveData?.availableMembers || []).forEach((m) => {
      if (!map.has(m.id)) map.set(m.id, m);
    });
    archivedCards.forEach((c) => {
      (c.members || []).forEach((m) => {
        if (!map.has(m.id)) map.set(m.id, m);
      });
    });
    return [
      { value: 'all', label: 'All Assignees' },
      ...Array.from(map.values()).map((m) => ({
        value: String(m.id),
        label: m.name || m.email || `Member #${m.id}`
      }))
    ];
  }, [archiveData?.availableMembers, archivedCards]);

  const assignerOptions = useMemo(() => {
    const map = new Map();
    (archiveData?.availableAssigners || []).forEach((m) => {
      if (!map.has(m.id)) map.set(m.id, m);
    });
    archivedCards.forEach((c) => {
      (c.assigners || []).forEach((a) => {
        if (!map.has(a.id)) map.set(a.id, a);
      });
    });
    return [
      { value: 'all', label: 'All Assigners' },
      ...Array.from(map.values()).map((a) => ({
        value: String(a.id),
        label: a.name || a.email || `User #${a.id}`
      }))
    ];
  }, [archiveData?.availableAssigners, archivedCards]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (filterLabelId !== 'all') count++;
    if (filterAssigneeId !== 'all') count++;
    if (filterAssignerId !== 'all') count++;
    if (filterStartDate) count++;
    if (filterEndDate) count++;
    return count;
  }, [searchQuery, filterLabelId, filterAssigneeId, filterAssignerId, filterStartDate, filterEndDate]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setFilterLabelId('all');
    setFilterAssigneeId('all');
    setFilterAssignerId('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setPage(1);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-app text-text-primary select-none text-left">
      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Mode Navigation Tabs */}
        <div className="flex items-center justify-between gap-2 border-b border-border/80 pb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('cards')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'cards'
                  ? 'bg-primary-tint text-primary font-bold shadow-2xs border border-primary/20'
                  : 'bg-surface text-text-secondary hover:text-text-primary border border-border/80 hover:bg-surface-muted'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Archived Cards</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'cards' ? 'bg-primary text-white shadow-2xs' : 'bg-surface-muted text-text-muted border border-border/60'
              }`}>
                {pagination.totalCards}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('boards')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'boards'
                  ? 'bg-primary-tint text-primary font-bold shadow-2xs border border-primary/20'
                  : 'bg-surface text-text-secondary hover:text-text-primary border border-border/80 hover:bg-surface-muted'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span>Archived Projects</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'boards' ? 'bg-primary text-white shadow-2xs' : 'bg-surface-muted text-text-muted border border-border/60'
              }`}>
                {archivedBoards.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('workspaces')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'workspaces'
                  ? 'bg-primary-tint text-primary font-bold shadow-2xs border border-primary/20'
                  : 'bg-surface text-text-secondary hover:text-text-primary border border-border/80 hover:bg-surface-muted'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Archived Workspaces</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'workspaces' ? 'bg-primary text-white shadow-2xs' : 'bg-surface-muted text-text-muted border border-border/60'
              }`}>
                {archivedWorkspaces.length}
              </span>
            </button>
          </div>
        </div>

        {/* TAB 1: ARCHIVED CARDS (Progressive Selection + Server Pagination + Rich Filters) */}
        {activeTab === 'cards' && (
          <div className="space-y-6">
            {/* Step 1 & Step 2: Progressive Workspace and Board Selection Panel */}
            <div className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <h2 className="text-xs sm:text-sm font-bold text-text-primary uppercase tracking-wider">
                    Progressive Selection
                  </h2>
                </div>
                <span className="text-[11px] text-text-muted font-medium">
                  Step 1: Select Workspace &rarr; Step 2: Select Project
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Workspace Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                    <span>Workspace</span>
                  </label>
                  <Select
                    value={selectedWorkspaceId}
                    onChange={(val) => {
                      setSelectedWorkspaceId(val);
                      setSelectedBoardId('all');
                      setPage(1);
                    }}
                    options={[
                      { value: 'all', label: 'All Workspaces' },
                      ...availableWorkspaces.map((w) => ({ value: String(w.id), label: w.name }))
                    ]}
                    size="md"
                    className="w-full text-xs font-semibold"
                  />
                </div>

                {/* 2. Board Selector (Derived from selected workspace) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-primary" />
                    <span>Project / Board</span>
                  </label>
                  <Select
                    value={selectedBoardId}
                    onChange={(val) => {
                      setSelectedBoardId(val);
                      setPage(1);
                    }}
                    options={[
                      { value: 'all', label: 'All Projects in this workspace' },
                      ...availableBoards.map((b) => ({ value: String(b.id), label: b.name }))
                    ]}
                    size="md"
                    className="w-full text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Filter Bar (Search + Labels + Assignee + Assigner + Dates) */}
            <div className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search archived cards by title, description, #ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-surface-muted/60 border border-border rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded-md"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Active Filter Counter & Clear Button */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-text-secondary">
                    {pagination.totalCards} {pagination.totalCards === 1 ? 'archived card' : 'archived cards'} found
                  </span>
                  {activeFiltersCount > 0 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleClearFilters}
                      className="rounded-xl text-xs font-semibold"
                    >
                      Clear Filters ({activeFiltersCount})
                    </Button>
                  )}
                </div>
              </div>

              {/* Filter Dropdowns Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-border/60">
                {/* Label Filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                    Label
                  </label>
                  <Select
                    value={filterLabelId}
                    onChange={(val) => {
                      setFilterLabelId(val);
                      setPage(1);
                    }}
                    options={labelOptions}
                    size="sm"
                    className="w-full text-xs font-medium"
                  />
                </div>

                {/* Assignee Filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                    Assignee
                  </label>
                  <Select
                    value={filterAssigneeId}
                    onChange={(val) => {
                      setFilterAssigneeId(val);
                      setPage(1);
                    }}
                    options={assigneeOptions}
                    size="sm"
                    className="w-full text-xs font-medium"
                  />
                </div>

                {/* Assigner Filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                    Assigner
                  </label>
                  <Select
                    value={filterAssignerId}
                    onChange={(val) => {
                      setFilterAssignerId(val);
                      setPage(1);
                    }}
                    options={assignerOptions}
                    size="sm"
                    className="w-full text-xs font-medium"
                  />
                </div>

                {/* Start Date Filter (Card Creation Date) */}
                <DateFilterPicker
                  label="Start Date"
                  value={filterStartDate}
                  onChange={(val) => {
                    setFilterStartDate(val);
                    setPage(1);
                  }}
                  placeholder="Pick start date"
                />

                {/* End Date Filter (Card Creation Date) */}
                <DateFilterPicker
                  label="End Date"
                  value={filterEndDate}
                  onChange={(val) => {
                    setFilterEndDate(val);
                    setPage(1);
                  }}
                  placeholder="Pick end date"
                />
              </div>
            </div>

            {/* Cards Results List */}
            {isLoading ? (
              <div className="p-16 flex flex-col items-center justify-center space-y-3 bg-surface border border-border/80 rounded-2xl">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs font-semibold text-text-secondary">Loading archived items...</p>
              </div>
            ) : archivedCards.length === 0 ? (
              <div className="p-12 sm:p-16 bg-surface border border-dashed border-border rounded-2xl text-center space-y-3 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-surface-muted text-text-muted mx-auto flex items-center justify-center border border-border">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-text-primary">
                  {activeFiltersCount > 0 ? 'No archived cards match current filters' : 'No archived cards found'}
                </h3>
                <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
                  {activeFiltersCount > 0
                    ? 'Try clearing or adjusting your search filters to find more archived cards.'
                    : 'Completed tasks that are auto-archived or manually archived will appear here.'}
                </p>
                {activeFiltersCount > 0 && (
                  <Button variant="secondary" size="sm" onClick={handleClearFilters} className="rounded-xl">
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Cards Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {archivedCards.map((card) => {
                    const attachmentsCount = card.attachments?.length ?? card.attachments_count ?? 0;
                    const commentsCount = card.comments?.length ?? card.comments_count ?? 0;
                    const chkTotal = card.checklist_items_total || 0;
                    const chkDone = card.checklist_items_completed || 0;

                    return (
                      <article
                        key={card.id}
                        onClick={() => setInspectCard(card)}
                        className="group p-4.5 bg-surface hover:bg-surface-subtle border border-border/80 hover:border-primary/50 rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3.5 cursor-pointer relative"
                      >
                        <div className="space-y-2.5">
                          {/* Top Meta: Card ID, Board, List & Status Badge */}
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-surface-muted border border-border/70 text-text-muted">
                              #{card.id}
                            </span>
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="px-2 py-0.5 rounded-md bg-surface-muted border border-border text-[10px] font-semibold text-text-secondary truncate">
                                {card.board_name || 'Project'}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-surface-muted border border-border text-[10px] font-semibold text-text-muted truncate">
                                {card.list_name || 'List'}
                              </span>
                            </div>
                          </div>

                          {/* Card Title */}
                          <h4 className="text-sm font-bold text-text-primary group-hover:text-primary transition line-clamp-2 leading-snug">
                            {card.title}
                          </h4>

                          {/* Description snippet if any */}
                          {card.description ? (
                            <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                              {card.description.replace(/<[^>]*>?/gm, '')}
                            </p>
                          ) : (
                            <p className="text-[11px] text-text-muted italic">No description provided</p>
                          )}

                          {/* Labels */}
                          {(card.labels || []).length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              {(card.labels || []).map((lbl) => (
                                <span
                                  key={lbl.id}
                                  style={{
                                    backgroundColor: lbl.color ? `${lbl.color}20` : undefined,
                                    color: lbl.color || undefined,
                                    borderColor: lbl.color ? `${lbl.color}40` : undefined
                                  }}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0"
                                >
                                  {lbl.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Card Content Indicators: Attachments, Comments, Checklists, Dates */}
                          <div className="flex items-center gap-3 text-xs text-text-secondary pt-1 flex-wrap">
                            {card.due_date && (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                  new Date(card.due_date).getTime() < Date.now() && !card.is_complete
                                    ? 'text-red-600 font-semibold'
                                    : 'text-text-secondary'
                                }`}
                                title={`Due Date: ${formatDate(card.due_date)}`}
                              >
                                <Clock className="w-3.5 h-3.5 text-text-muted" />
                                <span>{formatShortDate(card.due_date)}</span>
                              </span>
                            )}

                            {attachmentsCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-text-secondary font-medium" title={`${attachmentsCount} attachment(s)`}>
                                <Paperclip className="w-3.5 h-3.5 text-text-muted" />
                                <span>{attachmentsCount}</span>
                              </span>
                            )}

                            {commentsCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-text-secondary font-medium" title={`${commentsCount} comment(s)`}>
                                <MessageSquare className="w-3.5 h-3.5 text-text-muted" />
                                <span>{commentsCount}</span>
                              </span>
                            )}

                            {chkTotal > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-text-secondary font-medium" title={`Checklist: ${chkDone} of ${chkTotal} done`}>
                                <CheckSquare className="w-3.5 h-3.5 text-text-muted" />
                                <span>{chkDone}/{chkTotal}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Footer: Assignees & Action Buttons */}
                        <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
                          {/* Assignees */}
                          <div className="flex items-center -space-x-1.5 shrink-0">
                            {(card.members || []).length > 0 ? (
                              (card.members || []).slice(0, 3).map((u) => (
                                <Avatar key={u.id} name={u.name} src={u.avatar_url || u.avatar} size="xs" />
                              ))
                            ) : (
                              <span className="text-[11px] text-text-muted">Unassigned</span>
                            )}
                          </div>

                          {/* Action Buttons: Details, Restore, Delete */}
                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setInspectCard(card)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-muted border border-border/80 transition cursor-pointer"
                              title="Inspect full card details"
                            >
                              <Eye className="w-3.5 h-3.5 text-text-muted" />
                              <span>Details</span>
                            </button>

                            {canRestoreCard && onRestoreCard && (
                              <button
                                type="button"
                                onClick={() => onRestoreCard(card.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-primary-tint text-primary hover:bg-primary hover:text-white border border-primary/25 transition shadow-2xs cursor-pointer active:scale-95"
                                title="Restore card to active board"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restore</span>
                              </button>
                            )}

                            {canDeleteCard(card) && onDeleteCard && (
                              <button
                                type="button"
                                onClick={() => setCardToDelete(card)}
                                className="inline-flex items-center justify-center p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition cursor-pointer"
                                title="Delete card permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Server-Side Pagination Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/80 bg-surface px-4 py-3 rounded-2xl">
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <span>
                      Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.totalCards)} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.totalCards)} of {pagination.totalCards} cards
                    </span>

                    <div className="flex items-center gap-1.5 pl-3 border-l border-border/80">
                      <span className="text-text-muted">Per page:</span>
                      <Select
                        value={String(limit)}
                        onChange={(val) => {
                          setLimit(Number(val));
                          setPage(1);
                        }}
                        options={[
                          { value: '20', label: '20' },
                          { value: '50', label: '50' },
                          { value: '100', label: '100' }
                        ]}
                        size="sm"
                        className="w-20 text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* Navigation controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPage(1)}
                      disabled={pagination.page <= 1}
                      className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
                      title="First page"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.page <= 1}
                      className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
                      title="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="px-3 py-1 text-xs font-bold text-text-primary bg-surface-muted rounded-lg border border-border">
                      Page {pagination.page} of {pagination.totalPages || 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={pagination.page >= pagination.totalPages}
                      className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
                      title="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage(pagination.totalPages)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
                      title="Last page"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ARCHIVED PROJECTS / BOARDS */}
        {activeTab === 'boards' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <h3 className="text-sm font-bold text-text-primary">Archived Projects ({archivedBoards.length})</h3>
            </div>

            {archivedBoards.length === 0 ? (
              <div className="p-12 bg-surface border border-dashed border-border rounded-2xl text-center space-y-2">
                <FolderKanban className="w-8 h-8 text-text-muted mx-auto" />
                <h4 className="text-sm font-bold text-text-primary">No archived projects</h4>
                <p className="text-xs text-text-secondary">Archived projects will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {archivedBoards.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 bg-surface border border-border/80 rounded-2xl shadow-xs flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                        <span className="font-semibold text-text-secondary">{b.workspace_name || 'Workspace'}</span>
                        <span>{formatShortDate(b.created_at)}</span>
                      </div>
                      <h4 className="text-sm font-bold text-text-primary line-clamp-1">{b.name}</h4>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                      <span className="text-[11px] text-text-muted font-mono">ID: {b.id}</span>
                      <div className="flex items-center gap-1.5">
                        {canRestoreBoard && onRestoreBoard && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => onRestoreBoard(b.id)}
                            className="rounded-xl px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary-tint"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            Restore
                          </Button>
                        )}
                        {canDeleteBoard && onDeleteBoard && (
                          <button
                            type="button"
                            onClick={() => setBoardToDelete(b)}
                            className="p-1.5 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete project permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ARCHIVED WORKSPACES */}
        {activeTab === 'workspaces' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <h3 className="text-sm font-bold text-text-primary">Archived Workspaces ({archivedWorkspaces.length})</h3>
            </div>

            {archivedWorkspaces.length === 0 ? (
              <div className="p-12 bg-surface border border-dashed border-border rounded-2xl text-center space-y-2">
                <Briefcase className="w-8 h-8 text-text-muted mx-auto" />
                <h4 className="text-sm font-bold text-text-primary">No archived workspaces</h4>
                <p className="text-xs text-text-secondary">Archived workspaces will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {archivedWorkspaces.map((ws) => (
                  <div
                    key={ws.id}
                    className="p-4 bg-surface border border-border/80 rounded-2xl shadow-xs flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
                        <span className="font-semibold text-text-secondary">{ws.role || 'Member'}</span>
                        <span>{formatShortDate(ws.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ws.icon_url || ws.settings?.icon_url ? (
                          <img
                            src={getFileUrl(ws.icon_url || ws.settings?.icon_url)}
                            alt=""
                            className="w-5 h-5 rounded-md object-cover shrink-0 ring-1 ring-border/50"
                          />
                        ) : null}
                        <h4 className="text-sm font-bold text-text-primary line-clamp-1">{ws.name}</h4>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                      <span className="text-[11px] text-text-muted font-mono">ID: {ws.id}</span>
                      <div className="flex items-center gap-1.5">
                        {canRestoreWorkspace && onRestoreWorkspace && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => onRestoreWorkspace(ws.id)}
                            className="rounded-xl px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary-tint"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            Restore
                          </Button>
                        )}
                        {canDeleteWorkspace && onDeleteWorkspace && (
                          <button
                            type="button"
                            onClick={() => setWorkspaceToDelete(ws)}
                            className="p-1.5 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete workspace permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FULL ARCHIVED CARD DETAILS MODAL */}
      {inspectCard && (
        <Modal
          isOpen={Boolean(inspectCard)}
          onClose={() => setInspectCard(null)}
          title={`Archived Card Details — #${inspectCard.id}`}
          size="xl"
          className="sm:h-[85vh]"
          bodyClassName="p-5 flex flex-col flex-1 overflow-hidden min-h-0"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-text-muted">
                Archived from: <span className="font-semibold text-text-secondary">{inspectCard.board_name}</span> &rarr;{' '}
                <span className="font-semibold text-text-secondary">{inspectCard.list_name}</span>
              </div>
              <div className="flex items-center gap-2.5">
                {canDeleteCard(inspectCard) && onDeleteCard && (
                  <button
                    type="button"
                    onClick={() => {
                      const c = inspectCard;
                      setInspectCard(null);
                      setCardToDelete(c);
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl text-red-600 bg-red-50 hover:bg-red-100/80 border border-red-200 transition-all cursor-pointer whitespace-nowrap active:scale-95"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span>Delete Permanently</span>
                  </button>
                )}
                {canRestoreCard && onRestoreCard && (
                  <button
                    type="button"
                    onClick={() => {
                      onRestoreCard(inspectCard.id);
                      setInspectCard(null);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-hover shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
                    title="Restore card to board"
                  >
                    <RotateCcw className="w-4 h-4 shrink-0" />
                    <span>Restore Card to Board</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInspectCard(null)}
                  className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-xl bg-surface hover:bg-surface-muted text-text-primary border border-border shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          {/* 1. FIXED TOP HEADER BAR */}
          <div className="space-y-2 border-b border-border/80 pb-4 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-surface-muted text-xs font-mono font-bold text-text-muted border border-border">
                #{inspectCard.id}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-surface-muted text-xs font-semibold text-text-secondary border border-border">
                {inspectCard.workspace_name}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-surface-muted text-xs font-semibold text-text-secondary border border-border">
                {inspectCard.board_name}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-surface-muted text-xs font-semibold text-text-muted border border-border">
                {inspectCard.list_name}
              </span>
              {inspectCard.is_complete ? (
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                  In Progress
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-text-primary">{inspectCard.title}</h2>
          </div>

          {/* 2. MAIN CONTENT: Left column is scrollable, right sidebar is fixed */}
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 overflow-hidden">
            {/* Left Column: ONLY this area is scrollable! */}
            <div className="md:col-span-2 overflow-y-auto pr-3 space-y-6">
                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span>Description</span>
                  </h4>
                  {inspectCard.description ? (
                    <div
                      className="p-3.5 bg-surface-muted/50 border border-border/80 rounded-xl text-xs sm:text-sm text-text-primary leading-relaxed prose prose-sm max-w-none break-words"
                      dangerouslySetInnerHTML={{ __html: inspectCard.description }}
                    />
                  ) : (
                    <div className="p-3 bg-surface-muted/30 border border-border/60 rounded-xl text-xs text-text-muted italic">
                      No description provided for this card.
                    </div>
                  )}
                </div>

                {/* Checklists */}
                {(inspectCard.checklists || []).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-primary" />
                      <span>Checklists ({inspectCard.checklists.length})</span>
                    </h4>
                    {inspectCard.checklists.map((chk) => (
                      <div key={chk.id} className="p-3.5 bg-surface-muted/40 border border-border/80 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                          <span>{chk.title}</span>
                          <span className="text-text-muted">
                            {(chk.items || []).filter((i) => i.is_checked).length}/{(chk.items || []).length} completed
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {(chk.items || []).map((item) => (
                            <div key={item.id} className="flex items-start gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={Boolean(item.is_checked)}
                                readOnly
                                className="w-3.5 h-3.5 mt-0.5 rounded border-border text-primary cursor-default shrink-0"
                              />
                              <span className={`text-xs break-words whitespace-normal leading-relaxed flex-1 ${item.is_checked ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                                {item.text || item.title || 'Untitled Item'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Attachments */}
                {(inspectCard.attachments || []).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-primary" />
                      <span>Attachments ({inspectCard.attachments.length})</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {inspectCard.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="p-2.5 bg-surface-muted/40 border border-border/80 rounded-xl flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            <div className="truncate text-xs">
                              <p className="font-semibold text-text-primary truncate">{att.file_name || att.original_name || 'File'}</p>
                              <p className="text-[10px] text-text-muted">
                                {att.uploader_name ? `Uploaded by ${att.uploader_name}` : formatShortDate(att.created_at)}
                              </p>
                            </div>
                          </div>
                          {att.file_url && (
                            <a
                              href={att.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-primary hover:bg-primary-tint rounded-lg transition shrink-0"
                              title="Download / Open file"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments Thread */}
                {(inspectCard.comments || []).length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" />
                        <span>Comments ({inspectCard.comments.length})</span>
                      </h4>

                      {inspectCard.comments.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setShowAllComments((prev) => !prev)}
                          className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition cursor-pointer"
                        >
                          {showAllComments
                            ? 'Show recent 3 only'
                            : `View all ${inspectCard.comments.length} comments`}
                        </button>
                      )}
                    </div>

                    {/* Scroll-contained comments container to prevent endless modal stretching */}
                    <div
                      className={`space-y-2.5 ${
                        showAllComments
                          ? 'max-h-64 sm:max-h-72 overflow-y-auto pr-1.5'
                          : ''
                      }`}
                    >
                      {(showAllComments
                        ? inspectCard.comments
                        : inspectCard.comments.slice(-3)
                      ).map((cm) => (
                        <div
                          key={cm.id}
                          className="p-3 bg-surface-muted/40 border border-border/80 rounded-xl space-y-1.5 transition-colors hover:bg-surface-muted/60"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar
                                name={cm.author_name}
                                src={cm.author_avatar}
                                size="xs"
                              />
                              <span className="font-bold text-text-primary truncate">
                                {cm.author_name || 'Member'}
                              </span>
                            </div>
                            <span className="text-[11px] text-text-muted shrink-0">
                              {formatDate(cm.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed pl-6 break-words whitespace-pre-wrap">
                            {cm.text}
                          </p>
                        </div>
                      ))}
                    </div>

                    {!showAllComments && inspectCard.comments.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setShowAllComments(true)}
                        className="w-full py-2 px-3 rounded-xl border border-dashed border-border bg-surface-muted/30 hover:bg-surface-muted/60 text-xs font-semibold text-text-secondary hover:text-text-primary transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-text-muted" />
                        <span>
                          {inspectCard.comments.length - 3} older {inspectCard.comments.length - 3 === 1 ? 'comment' : 'comments'} collapsed. Click to expand all
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Metadata (Dates, Labels, Assignees, Assigner) */}
              <div className="space-y-5 bg-surface-muted/30 p-4 border border-border/80 rounded-2xl h-fit">
                {/* Dates */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Dates & Timeline</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Created:</span>
                      <span className="font-semibold text-text-primary">{formatDate(inspectCard.created_at)}</span>
                    </div>
                    {inspectCard.completed_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Completed:</span>
                        <span className="font-semibold text-emerald-600">{formatDate(inspectCard.completed_at)}</span>
                      </div>
                    )}
                    {inspectCard.start_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Start Date:</span>
                        <span className="font-semibold text-text-primary">{formatShortDate(inspectCard.start_date)}</span>
                      </div>
                    )}
                    {inspectCard.due_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Due Date:</span>
                        <span className="font-semibold text-text-primary">{formatShortDate(inspectCard.due_date)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Labels */}
                <div className="space-y-2 pt-3 border-t border-border/60">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Labels</h4>
                  {(inspectCard.labels || []).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(inspectCard.labels || []).map((lbl) => (
                        <span
                          key={lbl.id}
                          style={{
                            backgroundColor: lbl.color ? `${lbl.color}20` : undefined,
                            color: lbl.color || undefined,
                            borderColor: lbl.color ? `${lbl.color}40` : undefined
                          }}
                          className="px-2 py-0.5 rounded-md text-xs font-bold border"
                        >
                          {lbl.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-text-muted italic">No labels</span>
                  )}
                </div>

                {/* Assignees */}
                <div className="space-y-2 pt-3 border-t border-border/60">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Assignees</h4>
                  {(inspectCard.members || []).length > 0 ? (
                    <div className="space-y-1.5">
                      {(inspectCard.members || []).map((u) => (
                        <div key={u.id} className="flex items-center gap-2">
                          <Avatar name={u.name} src={u.avatar_url || u.avatar} size="xs" />
                          <span className="text-xs font-semibold text-text-primary truncate">{u.name || u.email}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-text-muted italic">No assignees</span>
                  )}
                </div>

                {/* Assigner / Creator */}
                {(inspectCard.assigners || []).length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-border/60">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Created / Assigned By</h4>
                    <div className="space-y-1.5">
                      {(inspectCard.assigners || []).map((a) => (
                        <div key={a.id} className="flex items-center gap-2">
                          <Avatar name={a.name} src={a.avatar_url || a.avatar} size="xs" />
                          <span className="text-xs font-semibold text-text-primary truncate">{a.name || a.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
        </Modal>
      )}

      {/* CONFIRM DELETE CARD DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(cardToDelete)}
        title="Permanently Delete Card?"
        message={`Are you sure you want to permanently delete card "${cardToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Permanently"
        confirmVariant="danger"
        onConfirm={() => {
          if (cardToDelete && onDeleteCard) {
            onDeleteCard(cardToDelete.id);
            setCardToDelete(null);
          }
        }}
        onCancel={() => setCardToDelete(null)}
      />

      {/* CONFIRM DELETE BOARD DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(boardToDelete)}
        title="Permanently Delete Project?"
        message={`Are you sure you want to permanently delete project "${boardToDelete?.name}"? All lists and cards will be destroyed.`}
        confirmText="Delete Permanently"
        confirmVariant="danger"
        onConfirm={() => {
          if (boardToDelete && onDeleteBoard) {
            onDeleteBoard(boardToDelete.id);
            setBoardToDelete(null);
          }
        }}
        onCancel={() => setBoardToDelete(null)}
      />

      {/* CONFIRM DELETE WORKSPACE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(workspaceToDelete)}
        title="Permanently Delete Workspace?"
        message={`Are you sure you want to permanently delete workspace "${workspaceToDelete?.name}"? All projects, lists, and tasks will be removed.`}
        confirmText="Delete Permanently"
        confirmVariant="danger"
        onConfirm={() => {
          if (workspaceToDelete && onDeleteWorkspace) {
            onDeleteWorkspace(workspaceToDelete.id);
            setWorkspaceToDelete(null);
          }
        }}
        onCancel={() => setWorkspaceToDelete(null)}
      />
    </div>
  );
}
