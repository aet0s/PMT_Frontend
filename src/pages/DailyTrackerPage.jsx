// client/src/pages/DailyTrackerPage.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Tag,
  FolderKanban,
  LayoutGrid,
  AlertCircle,
  Check,
  Layers,
  ArrowRight,
  ArrowUpRight,
  CheckSquare,
  User,
  UserCheck,
  Users
} from 'lucide-react';
import { format, parseISO, addDays, subDays, isToday, isYesterday } from 'date-fns';
import { getWorkspaceDailyTracker } from '../api/workspaces';
import { getCard } from '../api/cards';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Select from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { usePermissions } from '../context/PermissionContext';
import DailyTrackerPeopleView from '../components/DailyTracker/DailyTrackerPeopleView';
import { getServerNow } from '../lib/dateFormat';

function getTodayString() {
  const d = getServerNow();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DailyTrackerPage({
  workspace,
  workspaces = [],
  onCardClick
}) {
  const { hasPermission } = usePermissions();
  const canViewDailyTracker = hasPermission('daily_tracker.view');
  const canViewPeople = hasPermission('daily_tracker.view_people');

  const dateInputRef = useRef(null);

  // Tab State: 'tasks' (card stream) | 'people' (member focus & check-ins)
  const [mainTab, setMainTab] = useState('tasks');

  // Filter States
  const [mode, setMode] = useState('active'); // 'active' | 'in_progress' | 'created'
  const [selectedDate, setSelectedDate] = useState(getTodayString);
  const [hasUserSelectedDate, setHasUserSelectedDate] = useState(false);

  useEffect(() => {
    const onSync = () => {
      if (!hasUserSelectedDate) {
        setSelectedDate(getTodayString());
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('server-time-updated', onSync);
      return () => window.removeEventListener('server-time-updated', onSync);
    }
  }, [hasUserSelectedDate]);
  const [selectedWsId, setSelectedWsId] = useState(workspace?.id ? String(workspace.id) : 'all');
  const [selectedLabelId, setSelectedLabelId] = useState('all');
  const [selectedBoardId, setSelectedBoardId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20; // Exactly 20 cards per page

  // Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cards, setCards] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState({ total: 0, completed: 0, in_progress: 0, completion_rate: 0, date: getTodayString(), mode: 'created' });
  const [filterOptions, setFilterOptions] = useState({ workspaces: [], labels: [], boards: [] });

  // Card Preview Modal State
  const [selectedPreviewCard, setSelectedPreviewCard] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [detailedCard, setDetailedCard] = useState(null);

  const effectiveWorkspaceId = workspace?.id || (workspaces[0] && workspaces[0].id) || 1;

  const fetchTrackerData = useCallback(async () => {
    if (!effectiveWorkspaceId || !canViewDailyTracker) return;
    setLoading(true);
    setError(null);

    try {
      const res = await getWorkspaceDailyTracker(effectiveWorkspaceId, {
        date: selectedDate,
        mode,
        workspaceId: selectedWsId === 'all' ? null : selectedWsId,
        labelId: selectedLabelId === 'all' ? null : selectedLabelId,
        boardId: selectedBoardId === 'all' ? null : selectedBoardId,
        search: searchQuery.trim() || null,
        page,
        limit
      });

      setCards(res.cards || []);
      setPagination(res.pagination || { page, limit, total: 0, totalPages: 1 });
      setSummary(res.summary || { total: 0, completed: 0, in_progress: 0, completion_rate: 0, date: selectedDate, mode });
      if (res.filterOptions) {
        setFilterOptions(res.filterOptions);
      }
    } catch (err) {
      console.error('Failed to load daily tracker data:', err);
      setError(err.message || 'Failed to fetch daily tracker data. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  }, [effectiveWorkspaceId, canViewDailyTracker, selectedDate, mode, selectedWsId, selectedLabelId, selectedBoardId, searchQuery, page, limit]);

  // Initial fetch and dependency update
  useEffect(() => {
    fetchTrackerData();
  }, [fetchTrackerData]);

  // Open native calendar picker smoothly
  const handleOpenCalendar = () => {
    try {
      if (dateInputRef.current && typeof dateInputRef.current.showPicker === 'function') {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current?.focus();
      }
    } catch {
      dateInputRef.current?.focus();
    }
  };

  // Reset page to 1 when filters change
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    setPage(1);
  };

  const handlePrevDay = () => {
    try {
      const parsed = parseISO(selectedDate);
      const prev = subDays(parsed, 1);
      handleDateChange(format(prev, 'yyyy-MM-dd'));
    } catch {
      handleDateChange(getTodayString());
    }
  };

  const handleNextDay = () => {
    try {
      const parsed = parseISO(selectedDate);
      const next = addDays(parsed, 1);
      handleDateChange(format(next, 'yyyy-MM-dd'));
    } catch {
      handleDateChange(getTodayString());
    }
  };

  const handleTodayClick = () => {
    handleDateChange(getTodayString());
  };

  const formattedDisplayDate = useMemo(() => {
    try {
      const parsed = parseISO(selectedDate);
      if (isToday(parsed)) return 'Today';
      if (isYesterday(parsed)) return 'Yesterday';
      return format(parsed, 'EEEE, MMM d, yyyy');
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Global Dropdown options
  const workspaceOptions = useMemo(() => [
    { value: 'all', label: 'All Workspaces' },
    ...(filterOptions.workspaces || workspaces || []).map((w) => ({
      value: String(w.id),
      label: w.name
    }))
  ], [filterOptions.workspaces, workspaces]);

  const labelOptions = useMemo(() => [
    { value: 'all', label: 'All Labels' },
    ...(filterOptions.labels || []).map((l) => ({
      value: String(l.id),
      label: l.name
    }))
  ], [filterOptions.labels]);

  const boardOptions = useMemo(() => [
    { value: 'all', label: 'All Boards' },
    ...(filterOptions.boards || []).map((b) => ({
      value: String(b.id),
      label: b.name
    }))
  ], [filterOptions.boards]);

  // Open Card to inspect what is inside
  const handleCardClick = async (c) => {
    setSelectedPreviewCard(c);
    setDetailedCard(c);
    setPreviewLoading(true);
    try {
      const res = await getCard(c.id);
      if (res?.card) {
        setDetailedCard((prev) => ({ ...prev, ...res.card }));
      }
    } catch (err) {
      console.warn('Could not load full card details:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  if (!canViewDailyTracker) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-app text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-danger-tint text-danger flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Access Denied</h2>
        <p className="text-xs text-text-secondary max-w-md">
          You do not have permission to view the Daily Tracker. This dashboard is restricted to Owner, Admin, and Project Manager roles.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-app text-text-primary select-none text-left">
      {/* Top Controls Bar */}
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 bg-app border-b border-border/60 shrink-0 space-y-3">
        {/* Navigation / Tab Switcher Bar & Date Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex p-1 bg-surface border border-border/80 rounded-xl shadow-2xs self-start shrink-0">
            <button
              type="button"
              onClick={() => setMainTab('tasks')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mainTab === 'tasks'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tasks & Activity</span>
            </button>
            {canViewPeople && (
              <button
                type="button"
                onClick={() => setMainTab('people')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mainTab === 'people'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>People</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Prev / Next Date Arrows */}
            <div className="flex items-center bg-surface border border-border/80 rounded-xl p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevDay}
                title="Previous Day"
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-muted rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleOpenCalendar}
                title="Click to select date"
                className="px-3 py-1 flex items-center gap-2 border-x border-border/60 min-w-[150px] justify-center hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-text-primary">{formattedDisplayDate}</span>
              </button>
              <button
                type="button"
                onClick={handleNextDay}
                title="Next Day"
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-muted rounded-lg transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Native Date Picker Input with showPicker trigger */}
            <div className="relative">
              <input
                ref={dateInputRef}
                type="date"
                aria-label="Choose date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                onClick={handleOpenCalendar}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleOpenCalendar();
                  }
                }}
                className="px-3 py-1.5 bg-surface border border-border/80 rounded-xl text-xs font-semibold text-text-primary hover:border-primary/50 focus:outline-none focus:border-primary cursor-pointer shadow-2xs min-h-[36px]"
              />
            </div>

            {/* Quick Preset Buttons */}
            <button
              type="button"
              onClick={handleTodayClick}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                selectedDate === getTodayString()
                  ? 'bg-primary text-white shadow-primary/20'
                  : 'bg-surface text-text-secondary hover:text-text-primary border border-border/80 hover:bg-surface-muted'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                setHasUserSelectedDate(true);
                const y = subDays(getServerNow(), 1);
                handleDateChange(format(y, 'yyyy-MM-dd'));
              }}
              className="px-3 py-1.5 bg-surface text-text-secondary hover:text-text-primary border border-border/80 hover:bg-surface-muted rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              Yesterday
            </button>
          </div>
        </div>

        {/* Row 2: Only show Tasks-specific controls when mainTab === 'tasks' */}
        {mainTab === 'tasks' && (
          <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2.5">
            {/* Segmented Mode Switcher */}
            <div className="inline-flex p-1 bg-surface border border-border/80 rounded-xl shadow-2xs shrink-0 flex-wrap gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setMode('active');
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  mode === 'active'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Active Today</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('in_progress');
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  mode === 'in_progress'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Ongoing (In Progress)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('created');
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'created'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                }`}
              >
                Created Today
              </button>
            </div>

            {/* Search + Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap flex-1 justify-end min-w-[280px]">
              {/* Quick Search */}
              <div className="relative min-w-[160px] max-w-xs flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search daily cards..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border/80 rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary shadow-2xs min-h-[34px]"
                />
              </div>

              {/* Workspace Filter */}
              <div className="min-w-[130px] max-w-[170px] flex-1 sm:flex-initial">
                <Select
                  aria-label="Filter by workspace"
                  size="sm"
                  value={selectedWsId}
                  onChange={(val) => {
                    setSelectedWsId(val || 'all');
                    setPage(1);
                  }}
                  options={workspaceOptions}
                />
              </div>

              {/* Label Filter */}
              <div className="min-w-[110px] max-w-[150px] flex-1 sm:flex-initial">
                <Select
                  aria-label="Filter by label"
                  size="sm"
                  value={selectedLabelId}
                  onChange={(val) => {
                    setSelectedLabelId(val || 'all');
                    setPage(1);
                  }}
                  options={labelOptions}
                />
              </div>

              {/* Board Filter */}
              {filterOptions.boards && filterOptions.boards.length > 0 && (
                <div className="min-w-[110px] max-w-[150px] flex-1 sm:flex-initial">
                  <Select
                    aria-label="Filter by board"
                    size="sm"
                    value={selectedBoardId}
                    onChange={(val) => {
                      setSelectedBoardId(val || 'all');
                      setPage(1);
                    }}
                    options={boardOptions}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {mainTab === 'people' ? (
        <DailyTrackerPeopleView
          workspaceId={effectiveWorkspaceId}
          selectedDate={selectedDate}
          onCardClick={handleCardClick}
        />
      ) : (
        <>
          {/* Main Cards List Area - Overflow hidden when empty to avoid scrollbar */}
          <div className={`flex-1 ${cards.length > 0 ? 'overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-3' : 'overflow-hidden flex flex-col items-center justify-center p-4'}`}>
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-16 space-y-3 text-center">
            <Spinner size="lg" />
            <p className="text-xs font-semibold text-text-secondary">Loading today's card stream...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-surface border border-danger/30 rounded-2xl text-center space-y-2 max-w-md w-full shadow-2xs">
            <AlertCircle className="w-6 h-6 text-danger mx-auto" />
            <p className="text-sm font-bold text-danger">{error}</p>
            <button
              type="button"
              onClick={() => fetchTrackerData()}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-primary-hover transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : cards.length === 0 ? (
          <div className="p-8 sm:p-10 bg-surface border border-border/80 rounded-2xl text-center space-y-3 max-w-md w-full shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-primary-tint text-primary flex items-center justify-center mx-auto">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-text-primary">
              {mode === 'active'
                ? 'No Active Cards On This Day'
                : mode === 'in_progress'
                ? 'No Ongoing Tasks In Progress'
                : 'No Cards Created On This Day'}
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {mode === 'active'
                ? `No cards had comments, moves, or checklist updates on ${selectedDate} matching your active filters.`
                : mode === 'in_progress'
                ? 'No incomplete tasks found sitting in active/in-progress lists matching your active filters.'
                : `No tasks were added on ${selectedDate} matching your active filters.`}
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleTodayClick}
                className="px-3.5 py-1.5 bg-primary text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-primary-hover transition-colors"
              >
                Jump to Today
              </button>
              {(selectedLabelId !== 'all' || selectedWsId !== 'all' || selectedBoardId !== 'all' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLabelId('all');
                    setSelectedWsId('all');
                    setSelectedBoardId('all');
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-1.5 bg-surface hover:bg-surface-muted border border-border text-text-primary rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 max-w-7xl mx-auto w-full">
            {cards.map((c) => {
              const isCompleted = Boolean(c.is_complete || (c.listName && /done|completed/i.test(c.listName)));
              const createdTimeStr = (() => {
                try {
                  const d = parseISO(c.created_at);
                  return format(d, 'h:mm a');
                } catch {
                  return 'Today';
                }
              })();

              return (
                <div
                  key={c.id}
                  onClick={() => handleCardClick(c)}
                  className="group p-3.5 sm:p-4 bg-surface hover:bg-surface-muted/70 border border-border/80 hover:border-primary/40 rounded-2xl transition-all cursor-pointer shadow-2xs hover:shadow-xs flex flex-col gap-3"
                >
                  {/* Top Tier: Icon + Title + Breadcrumbs + Time & Action */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                          isCompleted
                            ? 'bg-success-tint text-success border-success/30'
                            : 'bg-primary-tint text-primary border-primary/20'
                        }`}
                        title={isCompleted ? 'Completed Task' : 'Active Task'}
                      >
                        {isCompleted ? <Check className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Title + ID + Completed badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors leading-snug">
                            {c.title}
                          </h4>
                          <span className="text-[11px] font-mono text-text-muted">#{c.id}</span>
                          {isCompleted && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-tint text-success border border-success/20">
                              Completed
                            </span>
                          )}
                        </div>

                        {/* Origin breadcrumb badge: Workspace > Board > List */}
                        <div className="flex items-center gap-1.5 text-[11px] text-text-muted mt-1 flex-wrap">
                          {c.workspaceName && (
                            <>
                              <span className="font-semibold text-text-secondary truncate max-w-[140px]">
                                {c.workspaceName}
                              </span>
                              <span>›</span>
                            </>
                          )}
                          <span className="font-medium text-text-secondary truncate max-w-[140px]">
                            {c.boardName || 'Project'}
                          </span>
                          <span>›</span>
                          <span className="px-1.5 py-0.5 bg-surface-muted border border-border/60 rounded-md font-bold text-text-primary text-[10px]">
                            {c.listName || 'List'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Top-Right: Created Time & Inspect Arrow */}
                    <div className="flex items-center gap-2 shrink-0 text-text-muted text-[11px] font-medium pt-0.5">
                      <Clock className="w-3.5 h-3.5 text-text-muted" />
                      <span>{createdTimeStr}</span>
                      <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                    </div>
                  </div>

                  {/* Bottom Tier: Status/Activity Pills on left, Assigner/Assignee/Labels on right */}
                  <div className="border-t border-border/40 pt-2.5 flex flex-wrap items-center justify-between gap-2.5">
                    {/* Status & Activity Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* 1. Inactivity Alert (>48h) */}
                      {c.is_inactive && !isCompleted && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-2xs"
                          title={`No recorded activity for ${c.hours_since_activity || 48}+ hours`}
                        >
                          ⚠️ Inactive for {c.days_inactive} days
                        </span>
                      )}

                      {/* 2. In Progress Duration Badge */}
                      {!isCompleted && c.days_in_progress && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-surface-muted border border-border/70 text-text-secondary shadow-2xs"
                          title={c.last_activity_text || `In progress for ${c.days_in_progress} days`}
                        >
                          ⏳ In progress for {c.days_in_progress} {c.days_in_progress === 1 ? 'day' : 'days'}
                          {c.last_activity_time && (
                            <span className="font-normal text-text-muted text-[10px] ml-0.5">
                              (Last activity: {c.last_activity_time})
                            </span>
                          )}
                        </span>
                      )}

                      {/* 3. Daily Activity Pill */}
                      {c.activity_pill && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold shadow-2xs ${
                            c.has_genuine_work
                              ? 'bg-primary-tint/70 text-primary border border-primary/25'
                              : 'bg-surface-muted text-text-muted border border-border/70'
                          }`}
                        >
                          <Sparkles className="w-3 h-3 shrink-0" />
                          <span>{c.activity_pill}</span>
                        </span>
                      )}
                    </div>

                    {/* Metadata: Assigner, Assignee, Labels */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Assigner badge */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[11px] font-semibold text-text-muted">Assigner:</span>
                        {c.assigners && c.assigners.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {c.assigners.slice(0, 2).map((u) => (
                              <div
                                key={u.id}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface-muted/70 border border-border/70 text-text-primary text-[11px] font-medium shadow-2xs"
                                title={`Assigned by ${u.name || u.email}`}
                              >
                                <Avatar
                                  name={u.name || u.email}
                                  src={u.avatar_url}
                                  size="xs"
                                  className="w-4 h-4 border border-primary/40 shrink-0"
                                />
                                <span className="truncate max-w-[110px]">{u.name || u.email}</span>
                              </div>
                            ))}
                            {c.assigners.length > 2 && (
                              <span className="text-[10px] font-bold text-text-muted">+{c.assigners.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-text-muted italic">None</span>
                        )}
                      </div>

                      {/* Assignee badge */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[11px] font-semibold text-text-muted">Assignee:</span>
                        {c.members && c.members.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {c.members.slice(0, 2).map((u) => (
                              <div
                                key={u.id}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface-muted/70 border border-border/70 text-text-primary text-[11px] font-medium shadow-2xs"
                                title={`Assigned to ${u.name || u.email}`}
                              >
                                <Avatar
                                  name={u.name || u.email}
                                  src={u.avatar_url}
                                  size="xs"
                                  className="w-4 h-4 shrink-0"
                                />
                                <span className="truncate max-w-[110px]">{u.name || u.email}</span>
                              </div>
                            ))}
                            {c.members.length > 2 && (
                              <span className="text-[10px] font-bold text-text-muted">+{c.members.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-text-muted italic">Unassigned</span>
                        )}
                      </div>

                      {/* Labels */}
                      {c.labels && c.labels.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {c.labels.slice(0, 3).map((lbl) => (
                            <span
                              key={lbl.id || lbl.name}
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs"
                              style={{
                                backgroundColor: lbl.color ? `${lbl.color}20` : 'var(--color-surface-muted)',
                                color: lbl.color || 'inherit',
                                border: `1px solid ${lbl.color ? `${lbl.color}40` : 'var(--color-border)'}`
                              }}
                            >
                              {lbl.name}
                            </span>
                          ))}
                          {c.labels.length > 3 && (
                            <span className="text-[10px] font-bold text-text-muted">
                              +{c.labels.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Card Detail Preview Modal - allows owner to see what is inside the card */}
      {selectedPreviewCard && (
        <Modal
          isOpen={Boolean(selectedPreviewCard)}
          onClose={() => {
            setSelectedPreviewCard(null);
            setDetailedCard(null);
          }}
          title={detailedCard?.title || selectedPreviewCard.title}
          description={`Card #${selectedPreviewCard.id} in ${selectedPreviewCard.workspaceName || 'Workspace'} › ${selectedPreviewCard.boardName || 'Project'} › ${selectedPreviewCard.listName || 'List'}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-text-muted flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Created {detailedCard?.created_at ? format(parseISO(detailedCard.created_at), 'MMM d, yyyy h:mm a') : 'Today'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPreviewCard(null);
                    setDetailedCard(null);
                  }}
                  className="px-4 py-2 bg-surface hover:bg-surface-muted border border-border text-xs font-semibold text-text-primary rounded-xl cursor-pointer transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const c = detailedCard || selectedPreviewCard;
                    setSelectedPreviewCard(null);
                    setDetailedCard(null);
                    if (onCardClick) {
                      onCardClick({
                        cardId: c.id,
                        id: c.id,
                        boardId: c.board_id || c.boardId,
                        workspaceId: c.workspace_id || c.workspaceId || workspace?.id,
                        ...c
                      });
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-colors"
                >
                  <span>Open in Project Board</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          }
        >
          {previewLoading ? (
            <div className="p-8 flex flex-col items-center justify-center space-y-2">
              <Spinner size="md" />
              <p className="text-xs text-text-secondary">Loading card details...</p>
            </div>
          ) : (
            <div className="space-y-4 text-left">
              {/* Origin Path & Status */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-border/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                  <span className="text-text-primary font-bold">{selectedPreviewCard.workspaceName}</span>
                  <span>›</span>
                  <span>{selectedPreviewCard.boardName}</span>
                  <span>›</span>
                  <span className="px-2 py-0.5 rounded-md bg-surface-muted border border-border text-text-primary font-bold text-[11px]">
                    {selectedPreviewCard.listName}
                  </span>
                </div>
                <div>
                  {selectedPreviewCard.is_complete ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-success-tint text-success border border-success/30">
                      <Check className="w-3.5 h-3.5" />
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-primary-tint text-primary border border-primary/20">
                      <CheckSquare className="w-3.5 h-3.5" />
                      In Progress
                    </span>
                  )}
                </div>
              </div>

              {/* Assigner & Assignees Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-surface-muted/40 border border-border/60 rounded-xl">
                <div>
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">Assigner</h5>
                  {detailedCard?.assigners && detailedCard.assigners.length > 0 ? (
                    <div className="space-y-1.5">
                      {detailedCard.assigners.map((u) => (
                        <div key={u.id} className="flex items-center gap-2">
                          <Avatar name={u.name || u.email} src={u.avatar_url} size="sm" className="border border-primary/40 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-text-primary truncate">{u.name}</p>
                            <p className="text-[10px] text-text-muted truncate">{u.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic">No assigner specified</p>
                  )}
                </div>

                <div>
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">Assignee(s)</h5>
                  {(detailedCard?.members || detailedCard?.assigned_users || []).length > 0 ? (
                    <div className="space-y-1.5">
                      {(detailedCard?.members || detailedCard?.assigned_users || []).map((u) => (
                        <div key={u.id} className="flex items-center gap-2">
                          <Avatar name={u.name || u.email} src={u.avatar_url} size="sm" className="shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-text-primary truncate">{u.name}</p>
                            <p className="text-[10px] text-text-muted truncate">{u.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic">Unassigned</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Description</h5>
                <div className="p-3.5 bg-surface rounded-xl border border-border/80 text-xs text-text-primary whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {detailedCard?.description ? detailedCard.description : <span className="text-text-muted italic">No description provided for this card.</span>}
                </div>
              </div>

              {/* Labels */}
              {detailedCard?.labels && detailedCard.labels.length > 0 && (
                <div className="space-y-1.5">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Labels</h5>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {detailedCard.labels.map((lbl) => (
                      <span
                        key={lbl.id || lbl.name}
                        className="px-2.5 py-1 rounded-full text-xs font-bold shadow-2xs"
                        style={{
                          backgroundColor: lbl.color ? `${lbl.color}20` : 'var(--color-surface-muted)',
                          color: lbl.color || 'inherit',
                          border: `1px solid ${lbl.color ? `${lbl.color}40` : 'var(--color-border)'}`
                        }}
                      >
                        {lbl.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

        </>
      )}

      {/* Footer: Server-Side Pagination Bar */}
      {mainTab === 'tasks' && (
        <div className="px-4 sm:px-6 lg:px-8 py-3 bg-surface border-t border-border/80 flex items-center justify-between shrink-0 text-xs font-semibold text-text-secondary select-none">
          <div>
            {pagination.total > 0 ? (
              <span>
                Showing <span className="font-bold text-text-primary">{(page - 1) * limit + 1}</span> -{' '}
                <span className="font-bold text-text-primary">{Math.min(page * limit, pagination.total)}</span> of{' '}
                <span className="font-bold text-text-primary">{pagination.total}</span> cards made
              </span>
            ) : (
              <span>0 cards</span>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-text-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 rounded-lg bg-surface-muted border border-border/60 text-text-primary font-bold text-xs">
              {page} / {Math.max(1, pagination.totalPages)}
            </span>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages || loading}
              className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-text-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
