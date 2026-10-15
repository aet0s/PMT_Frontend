// client/src/components/Board/ListView.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import {
  CheckSquare,
  Search,
  Menu,
  Clock,
  ChevronRight,
  ChevronLeft,
  X,
  Filter,
  ArrowUpDown,
  Layers,
  Sparkles,
  Calendar,
  User,
  AlertCircle,
  FolderKanban,
  CheckCircle2
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Select } from '../ui/Select';
import Spinner from '../ui/Spinner';
import { formatDate } from '../../lib/dateFormat';
import { getWorkspaceIssues } from '../../api/workspaces';

export default function ListView({
  board,
  boards = [],
  workspace,
  onCardClick,
  onOpenMobileSidebar
}) {
  const { workspaceId: paramWsId } = useParams();
  const currentWsId = Number(paramWsId || workspace?.id || board?.workspace_id);
  const [, setSearchParams] = useSearchParams();

  // Search & Filter State
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedBoardId, setSelectedBoardId] = useState(() => (board?.id ? String(board.id) : 'all'));
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedListId, setSelectedListId] = useState('all');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('all');
  const [selectedAssignerId, setSelectedAssignerId] = useState('all');
  const [selectedDueDate, setSelectedDueDate] = useState('all');
  const [selectedSort, setSelectedSort] = useState('newest');

  // Server-side Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Data State
  const [issues, setIssues] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: itemsPerPage,
    total: 0,
    totalPages: 1
  });
  const [filterOptions, setFilterOptions] = useState({
    boards: [],
    lists: [],
    members: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page to 1 when filters or search change
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setCurrentPage(1);
  }, [
    debouncedSearch,
    selectedBoardId,
    selectedStage,
    selectedListId,
    selectedAssigneeId,
    selectedAssignerId,
    selectedDueDate,
    selectedSort
  ]);

  // Fetch paginated & filtered issues from the server
  const fetchIssues = useCallback(async () => {
    if (!currentWsId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await getWorkspaceIssues(currentWsId, {
        page: currentPage,
        limit: itemsPerPage,
        boardId: selectedBoardId === 'all' ? null : selectedBoardId,
        search: debouncedSearch,
        listId: selectedListId === 'all' ? null : selectedListId,
        stage: selectedStage,
        assigneeId: selectedAssigneeId,
        assignerId: selectedAssignerId,
        dueDate: selectedDueDate,
        sort: selectedSort
      });

      if (res?.issues) {
        setIssues(res.issues);
        setPagination(
          res.pagination || {
            page: currentPage,
            limit: itemsPerPage,
            total: res.issues.length,
            totalPages: Math.ceil(res.issues.length / itemsPerPage) || 1
          }
        );
        if (res.filterOptions) {
          setFilterOptions(res.filterOptions);
        }
      }
    } catch (err) {
      console.error('Failed to fetch issues:', err);
      // Fallback for offline or test mock environments if board prop was provided
      if (board?.lists) {
        const localCards = board.lists
          .flatMap((list) =>
            (list.cards || []).map((card) => ({
              ...card,
              listName: list.name,
              boardName: board.name
            }))
          )
          .filter((card) =>
            (card.labels || []).some((l) => /bug/i.test(l.name))
          );
        const filtered = debouncedSearch
          ? localCards.filter(
              (c) =>
                c.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                c.listName?.toLowerCase().includes(debouncedSearch.toLowerCase())
            )
          : localCards;
        const total = filtered.length;
        const totalPages = Math.ceil(total / itemsPerPage) || 1;
        const start = (currentPage - 1) * itemsPerPage;
        setIssues(filtered.slice(start, start + itemsPerPage));
        setPagination({ page: currentPage, limit: itemsPerPage, total, totalPages });
      } else {
        setError('Failed to load issues. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [
    currentWsId,
    currentPage,
    selectedBoardId,
    debouncedSearch,
    selectedListId,
    selectedStage,
    selectedAssigneeId,
    selectedAssignerId,
    selectedDueDate,
    selectedSort,
    board
  ]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleCardClick = (card) => {
    if (onCardClick) {
      onCardClick(card);
    } else {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('card', String(card.id));
        return next;
      });
    }
  };

  // Compute active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (debouncedSearch) count += 1;
    if (selectedBoardId !== 'all') count += 1;
    if (selectedStage !== 'all') count += 1;
    if (selectedListId !== 'all') count += 1;
    if (selectedAssigneeId !== 'all') count += 1;
    if (selectedAssignerId !== 'all') count += 1;
    if (selectedDueDate !== 'all') count += 1;
    if (selectedSort !== 'newest') count += 1;
    return count;
  }, [
    debouncedSearch,
    selectedBoardId,
    selectedStage,
    selectedListId,
    selectedAssigneeId,
    selectedAssignerId,
    selectedDueDate,
    selectedSort
  ]);

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedBoardId('all');
    setSelectedStage('all');
    setSelectedListId('all');
    setSelectedAssigneeId('all');
    setSelectedAssignerId('all');
    setSelectedDueDate('all');
    setSelectedSort('newest');
    setCurrentPage(1);
  };

  // Build filter options
  const boardOptions = useMemo(() => {
    const list = filterOptions.boards?.length ? filterOptions.boards : boards;
    const base = [{ value: 'all', label: 'All Projects' }];
    const items = list.map((b) => ({ value: String(b.id), label: b.name }));
    return [...base, ...items];
  }, [filterOptions.boards, boards]);

  const stageOptions = [
    { value: 'all', label: 'All Stages' },
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' }
  ];

  const listOptions = useMemo(() => {
    const base = [{ value: 'all', label: 'All Columns' }];
    const relevantLists = selectedBoardId === 'all'
      ? filterOptions.lists || []
      : (filterOptions.lists || []).filter((l) => String(l.board_id) === String(selectedBoardId));
    const items = relevantLists.map((l) => ({ value: String(l.id), label: l.name }));
    return [...base, ...items];
  }, [filterOptions.lists, selectedBoardId]);

  const assigneeOptions = useMemo(() => {
    const base = [
      { value: 'all', label: 'All Assignees' },
      { value: 'unassigned', label: 'Unassigned' }
    ];
    const items = (filterOptions.members || []).map((m) => ({
      value: String(m.id),
      label: m.name
    }));
    return [...base, ...items];
  }, [filterOptions.members]);

  const assignerOptions = useMemo(() => {
    const base = [{ value: 'all', label: 'All Assigners' }];
    const items = (filterOptions.members || []).map((m) => ({
      value: String(m.id),
      label: m.name
    }));
    return [...base, ...items];
  }, [filterOptions.members]);

  const dueDateOptions = [
    { value: 'all', label: 'All Deadlines' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'today', label: 'Due Today' },
    { value: 'this_week', label: 'Due This Week' },
    { value: 'next_week', label: 'Due Next Week' },
    { value: 'no_date', label: 'No Due Date' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Recently Created' },
    { value: 'oldest', label: 'Oldest Created' },
    { value: 'due_date_asc', label: 'Due Date (Earliest)' },
    { value: 'due_date_desc', label: 'Due Date (Latest)' },
    { value: 'title_asc', label: 'Title (A to Z)' },
    { value: 'title_desc', label: 'Title (Z to A)' }
  ];

  // Helper for overdue check
  const isOverdue = (dateStr, isComplete) => {
    if (!dateStr || isComplete) return false;
    const due = new Date(dateStr);
    return !isNaN(due.getTime()) && due.getTime() < Date.now();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-app select-none text-left">
      {/* Issues Header (Boards, List, Calendar top filter pills removed as requested) */}
      <header className="relative z-20 px-4 sm:px-6 lg:px-8 py-3.5 bg-app border-b border-border/80 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onOpenMobileSidebar && (
            <button
              type="button"
              onClick={onOpenMobileSidebar}
              className="p-2 text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-muted border border-border rounded-xl lg:hidden transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              title="Open Navigation"
              aria-label="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-tint text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <CheckSquare className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h1 tabIndex={-1} className="text-lg sm:text-xl font-extrabold text-text-primary tracking-tight truncate flex items-center gap-2">
                Issues
              </h1>
            </div>
            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-tint text-primary border border-primary/20 shrink-0">
              {pagination.total} {pagination.total === 1 ? 'issue' : 'issues'}
            </span>
          </div>
        </div>

        {/* Global Keyword Search Input */}
        <div className="relative w-full sm:w-72">
          <label htmlFor="issues-search-input" className="sr-only">
            Search issues by title, description, or ID
          </label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            id="issues-search-input"
            type="text"
            placeholder="Search all issues by title, description, #ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted text-xs focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 transition-all shadow-xs"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setDebouncedSearch('');
              }}
              aria-label="Clear search text"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Rich Filter Toolbar */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 bg-surface/80 border-b border-border/80 shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Project Filter */}
          <div className="w-36 sm:w-44">
            <Select
              id="filter-project"
              aria-label="Filter by project"
              size="sm"
              value={selectedBoardId}
              onChange={(val) => setSelectedBoardId(val || 'all')}
              options={boardOptions}
            />
          </div>

          {/* Stage Filter */}
          <div className="w-32 sm:w-36">
            <Select
              id="filter-stage"
              aria-label="Filter by stage"
              size="sm"
              value={selectedStage}
              onChange={(val) => setSelectedStage(val || 'all')}
              options={stageOptions}
            />
          </div>

          {/* Column/List Filter */}
          <div className="w-32 sm:w-36">
            <Select
              id="filter-list"
              aria-label="Filter by column"
              size="sm"
              value={selectedListId}
              onChange={(val) => setSelectedListId(val || 'all')}
              options={listOptions}
            />
          </div>

          {/* Assignee Filter */}
          <div className="w-36 sm:w-40">
            <Select
              id="filter-assignee"
              aria-label="Filter by assignee"
              size="sm"
              value={selectedAssigneeId}
              onChange={(val) => setSelectedAssigneeId(val || 'all')}
              options={assigneeOptions}
            />
          </div>

          {/* Assigner Filter */}
          <div className="w-36 sm:w-40">
            <Select
              id="filter-assigner"
              aria-label="Filter by assigner"
              size="sm"
              value={selectedAssignerId}
              onChange={(val) => setSelectedAssignerId(val || 'all')}
              options={assignerOptions}
            />
          </div>

          {/* Due Date Filter */}
          <div className="w-36 sm:w-40">
            <Select
              id="filter-due-date"
              aria-label="Filter by due date"
              size="sm"
              value={selectedDueDate}
              onChange={(val) => setSelectedDueDate(val || 'all')}
              options={dueDateOptions}
            />
          </div>

          {/* Sort Filter */}
          <div className="w-36 sm:w-44 ml-auto">
            <Select
              id="filter-sort"
              aria-label="Sort issues by"
              size="sm"
              value={selectedSort}
              onChange={(val) => setSelectedSort(val || 'newest')}
              options={sortOptions}
            />
          </div>

          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearFilters}
              leftIcon={<X className="w-3.5 h-3.5" />}
              className="text-text-secondary hover:text-text-primary"
            >
              Reset ({activeFiltersCount})
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area: Floating Rounded Surface */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 px-3 pb-3 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6 pt-3 relative">
        <section aria-label="Project Issues View" className="flex-1 min-w-0 h-full rounded-[24px] lg:rounded-[32px] bg-board-neutral p-4 sm:p-6 lg:p-8 overflow-y-auto shadow-xs no-scrollbar flex flex-col justify-between">
          <div>
            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center space-y-3">
                <Spinner size="lg" />
                <p className="text-xs font-semibold text-text-secondary">Loading issues...</p>
              </div>
            ) : error ? (
              <div className="p-12 sm:p-16 bg-surface border border-border rounded-3xl text-center space-y-3 max-w-md mx-auto my-8 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-danger-tint text-danger-text mx-auto flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="text-base font-bold text-text-primary">{error}</p>
                <Button variant="secondary" size="sm" onClick={fetchIssues}>
                  Retry
                </Button>
              </div>
            ) : issues.length === 0 ? (
              <div className="p-12 sm:p-16 bg-surface border border-border rounded-3xl text-center space-y-3 max-w-md mx-auto my-8 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-primary-tint text-primary mx-auto flex items-center justify-center">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <p className="text-base font-bold text-text-primary">
                  {activeFiltersCount > 0 ? 'No issues matching current filters' : 'No bug issues found'}
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {activeFiltersCount > 0
                    ? 'Try clearing or relaxing your search query and filters to see more results.'
                    : 'Tasks labeled with "Bug" across projects in this workspace will automatically appear here.'}
                </p>
                {activeFiltersCount > 0 && (
                  <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                    Clear All Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="max-w-7xl mx-auto space-y-4">
                {/* Desktop Table View (>= 768px) */}
                <div className="hidden md:block bg-surface border border-border rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface-muted text-text-secondary border-b border-border">
                      <tr>
                        <th scope="col" className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px] w-16 text-center">#ID</th>
                        <th scope="col" className="py-3.5 px-5 font-bold uppercase tracking-wider text-[11px]">Task Title</th>
                        <th scope="col" className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px]">Project</th>
                        <th scope="col" className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px]">Pipeline Stage</th>
                        <th scope="col" className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px]">Due Date</th>
                        <th scope="col" className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px]">Assigners</th>
                        <th scope="col" className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px]">Assignees</th>
                        <th scope="col" className="py-3.5 px-4 font-bold uppercase tracking-wider text-[11px] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-text-primary">
                      {issues.map((card) => {
                        const overdue = isOverdue(card.due_date, card.is_complete);
                        return (
                          <tr
                            key={card.id}
                            onClick={() => handleCardClick(card)}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleCardClick(card);
                              }
                            }}
                            className="hover:bg-primary-tint/30 cursor-pointer transition-colors focus:outline-none focus-visible:bg-primary-tint/40 group"
                          >
                            <td className="py-3.5 px-4 text-center font-mono text-[11px] text-text-muted">
                              #{card.id}
                            </td>
                            <td className="py-3.5 px-5 font-bold max-w-sm text-text-primary group-hover:text-primary transition-colors truncate">
                              <div className="flex items-center gap-2 min-w-0">
                                {card.is_complete ? (
                                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-danger shrink-0" />
                                )}
                                <span className="truncate">{card.title}</span>
                                {(card.labels || []).map((lbl) => (
                                  <span
                                    key={lbl.id}
                                    style={{
                                      backgroundColor: lbl.color ? `${lbl.color}20` : undefined,
                                      color: lbl.color || undefined,
                                      borderColor: lbl.color ? `${lbl.color}40` : undefined
                                    }}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 bg-danger-tint text-danger-text border-danger/30"
                                  >
                                    {lbl.name}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-md bg-surface border border-border text-[11px] font-medium text-text-secondary shadow-2xs truncate max-w-[130px] inline-block">
                                {card.boardName || card.board_name || 'Project'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-full bg-surface border border-border text-[11px] font-semibold text-text-secondary shadow-2xs">
                                {card.listName || card.list_name || 'Column'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-text-secondary">
                              {card.due_date ? (
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium text-[11px] ${
                                    overdue
                                      ? 'bg-danger-tint text-danger-text font-bold'
                                      : 'text-text-primary'
                                  }`}
                                >
                                  <Clock className={`w-3.5 h-3.5 ${overdue ? 'text-danger-text' : 'text-primary'}`} />
                                  {formatDate(card.due_date)}
                                </span>
                              ) : (
                                <span className="text-text-muted font-normal">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center -space-x-1.5">
                                {(card.assigners || []).length > 0 ? (
                                  (card.assigners || []).map((u) => (
                                    <Avatar key={u.id} name={u.name} src={u.avatar_url || u.avatar} user={u} size="xs" className="border border-primary/40" />
                                  ))
                                ) : (
                                  <span className="text-text-muted text-[11px]">—</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center -space-x-1.5">
                                {(card.members || card.assigned_users || []).length > 0 ? (
                                  (card.members || card.assigned_users || []).map((u) => (
                                    <Avatar key={u.id} name={u.name} src={u.avatar_url || u.avatar} user={u} size="xs" />
                                  ))
                                ) : (
                                  <span className="text-text-muted text-[11px]">—</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span className="text-xs font-bold text-primary group-hover:translate-x-0.5 inline-flex items-center gap-0.5 transition-transform">
                                Open <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card Stack View (< 768px) */}
                <div className="md:hidden space-y-3">
                  {issues.map((card) => {
                    const overdue = isOverdue(card.due_date, card.is_complete);
                    return (
                      <div
                        key={card.id}
                        onClick={() => handleCardClick(card)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleCardClick(card);
                          }
                        }}
                        className="p-4 bg-surface hover:bg-surface-muted border border-border rounded-2xl shadow-xs transition-all cursor-pointer min-h-[44px] flex flex-col justify-between gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group"
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-mono text-text-muted">#{card.id}</span>
                              {(card.labels || []).map((lbl) => (
                                <span
                                  key={lbl.id}
                                  style={{
                                    backgroundColor: lbl.color ? `${lbl.color}20` : undefined,
                                    color: lbl.color || undefined,
                                    borderColor: lbl.color ? `${lbl.color}40` : undefined
                                  }}
                                  className="px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 bg-danger-tint text-danger-text border-danger/30"
                                >
                                  {lbl.name}
                                </span>
                              ))}
                            </div>
                            <span className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-2 block mt-0.5">
                              {card.title}
                            </span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-surface-muted border border-border text-[10px] font-bold text-text-secondary shrink-0">
                            {card.listName || card.list_name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-text-secondary pt-2 border-t border-border/70">
                          <div>
                            {card.due_date ? (
                              <span
                                className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                                  overdue ? 'text-danger-text font-bold' : 'text-text-primary'
                                }`}
                              >
                                <Clock className={`w-3.5 h-3.5 ${overdue ? 'text-danger-text' : 'text-primary'}`} />
                                {formatDate(card.due_date)}
                              </span>
                            ) : (
                              <span className="text-xs text-text-muted">No deadline</span>
                            )}
                          </div>

                          <div className="flex items-center -space-x-1.5">
                            {(card.members || card.assigned_users || []).map((u) => (
                              <Avatar key={u.id} name={u.name} src={u.avatar_url || u.avatar} user={u} size="xs" />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Server-Side Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 pt-4 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-text-secondary max-w-7xl mx-auto w-full">
              <span aria-label={`Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, pagination.total)} of ${pagination.total} issues`}>
                Showing <strong className="text-text-primary">{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
                <strong className="text-text-primary">
                  {Math.min(currentPage * itemsPerPage, pagination.total)}
                </strong>{' '}
                of <strong className="text-text-primary">{pagination.total}</strong> issues
              </span>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                  leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1 px-1">
                  {[...Array(pagination.totalPages)].map((_, idx) => {
                    const pageNum = idx + 1;
                    if (
                      pagination.totalPages <= 7 ||
                      pageNum === 1 ||
                      pageNum === pagination.totalPages ||
                      Math.abs(pageNum - currentPage) <= 1
                    ) {
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          disabled={loading}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                            currentPage === pageNum
                              ? 'bg-primary text-white shadow-xs'
                              : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    if (pageNum === 2 || pageNum === pagination.totalPages - 1) {
                      return (
                        <span key={pageNum} className="text-text-muted px-1">
                          …
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages || loading}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
