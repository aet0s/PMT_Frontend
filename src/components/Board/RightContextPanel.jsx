import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Search,
  X,
  ListTodo,
  ArrowUpRight,
  CheckSquare
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import { formatShortDate } from '../../lib/dateFormat';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function RightContextPanel({
  user,
  board,
  cards = [],
  onCardClick,
  onSelectNotificationCard,
  onOpenAllNotifications,
  className = ''
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Month & Year picker dropdown state
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const monthPickerRef = useRef(null);

  // All Tasks Modal & search/filter state
  const [isAllTasksModalOpen, setIsAllTasksModalOpen] = useState(false);
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('all'); // 'all' | 'upcoming' | 'overdue' | 'completed'
  const [taskDateFilter, setTaskDateFilter] = useState('all'); // 'all' | 'YYYY-MM-DD'
  const [showAllInSidebar, setShowAllInSidebar] = useState(false);

  const handleCloseAllTasksModal = useCallback(() => {
    setIsAllTasksModalOpen(false);
  }, []);

  const today = useMemo(() => new Date(), []);
  const greetingName = user?.name ? user.name.split(' ')[0] : 'Team';
  const todayFormatted = format(today, 'EEEE, do MMM yyyy');

  // Close Month/Year dropdown on click outside (ignoring portalled select dropdowns)
  useEffect(() => {
    if (!isMonthPickerOpen) return;
    const handleClickOutside = (e) => {
      // Ignore clicks inside floating portal listbox options
      if (e.target.closest && (e.target.closest('[role="listbox"]') || e.target.closest('[data-floating-ui-portal]'))) {
        return;
      }
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target)) {
        setIsMonthPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMonthPickerOpen]);

  // Month navigation
  const prevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const nextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));

  const selectedYear = currentMonth.getFullYear();
  const selectedMonthIndex = currentMonth.getMonth();

  // Year options for dropdown: currentYear - 5 to currentYear + 10
  const yearOptions = useMemo(() => {
    const currentYr = today.getFullYear();
    const years = [];
    for (let y = currentYr - 5; y <= currentYr + 10; y++) {
      years.push(y);
    }
    return years;
  }, [today]);

  const handleMonthSelect = (monthIdx) => {
    setCurrentMonth(new Date(selectedYear, monthIdx, 1));
    setIsMonthPickerOpen(false);
  };

  const handleYearChange = (newYear) => {
    setCurrentMonth(new Date(newYear, selectedMonthIndex, 1));
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentMonth(now);
    setSelectedDate(now);
    setIsMonthPickerOpen(false);
  };

  // Calendar dates matrix
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = useMemo(() => {
    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [startDate, endDate]);

  // Map dates to cards with due dates
  const cardsByDate = useMemo(() => {
    const map = {};
    cards.forEach((c) => {
      if (c.due_date) {
        const dStr = format(new Date(c.due_date), 'yyyy-MM-dd');
        if (!map[dStr]) map[dStr] = [];
        map[dStr].push(c);
      }
    });
    return map;
  }, [cards]);

  // Lookup map for board list names
  const listNamesById = useMemo(() => {
    const map = {};
    (board?.lists || []).forEach((l) => {
      map[l.id] = l.name;
    });
    return map;
  }, [board?.lists]);

  // Task statistics
  const taskStats = useMemo(() => {
    const now = new Date();
    let upcomingCount = 0;
    let overdueCount = 0;
    let completedCount = 0;

    cards.forEach((c) => {
      if (c.is_complete) {
        completedCount++;
      } else if (c.due_date && new Date(c.due_date) < now) {
        overdueCount++;
      } else {
        upcomingCount++;
      }
    });

    return {
      total: cards.length,
      upcoming: upcomingCount,
      overdue: overdueCount,
      completed: completedCount
    };
  }, [cards]);

  // Upcoming tasks: tasks with due dates in the future or not completed
  const upcomingTasks = useMemo(() => {
    return [...cards]
      .filter((c) => !c.is_complete)
      .sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });
  }, [cards]);

  const displayedUpcomingTasks = useMemo(() => {
    return showAllInSidebar ? upcomingTasks : upcomingTasks.slice(0, 4);
  }, [upcomingTasks, showAllInSidebar]);

  // Date options for the modal filter dropdown
  const modalDateOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All Dates' }];

    const dateCounts = {};
    cards.forEach((c) => {
      if (c.due_date) {
        const dStr = format(new Date(c.due_date), 'yyyy-MM-dd');
        dateCounts[dStr] = (dateCounts[dStr] || 0) + 1;
      }
    });

    if (taskDateFilter !== 'all' && !dateCounts[taskDateFilter]) {
      dateCounts[taskDateFilter] = 0;
    }

    const sortedDates = Object.keys(dateCounts).sort((a, b) => new Date(a) - new Date(b));

    sortedDates.forEach((dStr) => {
      const dObj = new Date(dStr + 'T00:00:00');
      const isTodayDate = isSameDay(dObj, today);
      const formatted = format(dObj, 'MMM d, yyyy');
      const count = dateCounts[dStr];
      const countLabel = count === 1 ? '1 task' : `${count} tasks`;
      const prefix = isTodayDate ? 'Today - ' : '';

      options.push({
        value: dStr,
        label: `${prefix}${formatted} (${countLabel})`
      });
    });

    return options;
  }, [cards, taskDateFilter, today]);

  // Task statistics within the active date scope for modal pills
  const modalTaskStats = useMemo(() => {
    const now = new Date();
    let total = 0;
    let upcomingCount = 0;
    let overdueCount = 0;
    let completedCount = 0;

    cards.forEach((c) => {
      if (taskDateFilter !== 'all') {
        if (!c.due_date) return;
        const cardDateStr = format(new Date(c.due_date), 'yyyy-MM-dd');
        if (cardDateStr !== taskDateFilter) return;
      }
      total++;
      if (c.is_complete) {
        completedCount++;
      } else if (c.due_date && new Date(c.due_date) < now) {
        overdueCount++;
      } else {
        upcomingCount++;
      }
    });

    return {
      total,
      upcoming: upcomingCount,
      overdue: overdueCount,
      completed: completedCount
    };
  }, [cards, taskDateFilter]);

  // Filtered tasks for the "View All" modal
  const filteredModalTasks = useMemo(() => {
    const now = new Date();
    return [...cards]
      .filter((c) => {
        // Date filter
        if (taskDateFilter !== 'all') {
          if (!c.due_date) return false;
          const cardDateStr = format(new Date(c.due_date), 'yyyy-MM-dd');
          if (cardDateStr !== taskDateFilter) return false;
        }

        // Status filter
        if (taskStatusFilter === 'upcoming') {
          if (c.is_complete) return false;
          if (c.due_date && new Date(c.due_date) < now) return false;
        } else if (taskStatusFilter === 'overdue') {
          if (c.is_complete) return false;
          if (!c.due_date || new Date(c.due_date) >= now) return false;
        } else if (taskStatusFilter === 'completed') {
          if (!c.is_complete) return false;
        }

        // Search query filter
        if (taskSearchQuery.trim()) {
          const q = taskSearchQuery.toLowerCase();
          const matchTitle = (c.title || '').toLowerCase().includes(q);
          const matchDesc = (c.description || '').toLowerCase().includes(q);
          if (!matchTitle && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.is_complete && !b.is_complete) return 1;
        if (!a.is_complete && b.is_complete) return -1;
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });
  }, [cards, taskDateFilter, taskStatusFilter, taskSearchQuery]);

  // Selected date tasks
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const tasksOnSelectedDate = cardsByDate[selectedDateStr] || [];

  // Distinct soft styling profiles for upcoming cards inspired by reference image
  const cardProfiles = [
    {
      bgClass: 'bg-warning-tint/80 hover:bg-warning-tint border-warning/30 text-warning-text',
      badgeClass: 'bg-warning/20 text-warning-text'
    },
    {
      bgClass: 'bg-success-tint/80 hover:bg-success-tint border-success/30 text-success-text',
      badgeClass: 'bg-success/20 text-success-text'
    },
    {
      bgClass: 'bg-info-tint/80 hover:bg-info-tint border-info/30 text-info-text',
      badgeClass: 'bg-info/20 text-info-text'
    },
    {
      bgClass: 'bg-danger-tint/80 hover:bg-danger-tint border-danger/30 text-danger-text',
      badgeClass: 'bg-danger/20 text-danger-text'
    }
  ];

  const handleOpenCard = (card) => {
    if (isAllTasksModalOpen) {
      setIsAllTasksModalOpen(false);
    }
    if (onCardClick) {
      onCardClick(card);
    }
  };

  return (
    <aside
      aria-label="Workspace context and upcoming tasks"
      className={`w-full shrink-0 bg-app flex flex-col h-full overflow-y-auto select-none px-2 py-1 lg:px-4 lg:py-2 space-y-6 no-scrollbar ${className}`}
    >
      {/* User Greeting & Header */}
      <div className="pb-1">
        <h2 className="text-lg font-bold text-text-primary tracking-tight truncate">
          Hi, {greetingName}!
        </h2>
        <p className="text-xs text-text-secondary mt-0.5 truncate">
          Today is {todayFormatted}
        </p>
      </div>

      {/* Mini Calendar Widget */}
      <div className="bg-surface-muted/50 border border-border/50 rounded-3xl p-4 shadow-2xs relative">
        {/* Calendar Header with Month/Year Selector & Prev/Next */}
        <div className="flex items-center justify-between mb-3 px-1">
          {/* Month & Year Interactive Dropdown Trigger */}
          <div className="relative" ref={monthPickerRef}>
            <button
              type="button"
              onClick={() => setIsMonthPickerOpen((prev) => !prev)}
              aria-expanded={isMonthPickerOpen}
              aria-label="Select month and year"
              title="Click to change month and year"
              className="flex items-center gap-1.5 font-bold text-sm text-text-primary hover:text-primary transition-colors cursor-pointer py-1 px-2 -ml-2 rounded-xl hover:bg-surface border border-transparent hover:border-border/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span>{format(currentMonth, 'MMMM yyyy')}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${isMonthPickerOpen ? 'rotate-180 text-primary' : ''
                  }`}
              />
            </button>

            {/* Interactive Month & Year Dropdown Popover */}
            {isMonthPickerOpen && (
              <div
                role="dialog"
                aria-label="Month and year picker"
                className="absolute left-0 top-full mt-2 w-64 bg-surface border border-border/80 rounded-2xl shadow-xl z-50 p-3 text-text-primary animate-sassy-dropdown text-left"
              >
                {/* Year Selection Controls */}
                <div className="flex items-center justify-between gap-1.5 mb-3 pb-2.5 border-b border-border/70">
                  <button
                    type="button"
                    onClick={() => handleYearChange(selectedYear - 1)}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer shrink-0"
                    title="Previous year"
                    aria-label="Previous year"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex-1 min-w-0 max-w-[130px]">
                    <Select
                      value={selectedYear}
                      onChange={(val) => handleYearChange(Number(val))}
                      aria-label="Select year"
                      size="sm"
                      options={yearOptions.map((y) => ({
                        value: y,
                        label: String(y)
                      }))}
                      className="w-full text-xs font-bold"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleYearChange(selectedYear + 1)}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer shrink-0"
                    title="Next year"
                    aria-label="Next year"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 12-Month Grid Buttons */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {MONTH_NAMES.map((name, idx) => {
                    const isSelected = selectedMonthIndex === idx;
                    const isCurrentMonthNow =
                      today.getFullYear() === selectedYear && today.getMonth() === idx;

                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleMonthSelect(idx)}
                        className={`py-1.5 px-2 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center ${isSelected
                            ? 'bg-primary text-white font-bold shadow-xs'
                            : isCurrentMonthNow
                              ? 'bg-primary-tint text-primary font-bold hover:bg-primary-tint/80 border border-primary/30'
                              : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
                          }`}
                      >
                        {name.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Quick Jump & Close Actions */}
                <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={handleJumpToToday}
                    className="font-bold text-primary hover:text-primary-hover hover:underline cursor-pointer"
                  >
                    Jump to Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMonthPickerOpen(false)}
                    className="font-medium text-text-muted hover:text-text-secondary cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Month Prev / Next buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevMonth}
              title="Previous month"
              aria-label="Previous month"
              className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              title="Next month"
              aria-label="Next month"
              className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-text-muted mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-0.5">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {calendarDays.map((d, idx) => {
            const isToday = isSameDay(d, today);
            const isCurrentMonthDay = isSameMonth(d, currentMonth);
            const isSelected = isSameDay(d, selectedDate);
            const dateStr = format(d, 'yyyy-MM-dd');
            const hasTasks = cardsByDate[dateStr]?.length > 0;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDate(d)}
                aria-label={`${format(d, 'MMMM d, yyyy')}${hasTasks ? ' has tasks' : ''}`}
                className={`relative h-7 w-7 mx-auto rounded-full flex items-center justify-center font-medium cursor-pointer select-none transition-all duration-150 ease-out active:scale-90 ${isToday && isSelected
                    ? 'bg-primary text-white font-bold shadow-xs ring-2 ring-primary ring-offset-2 ring-offset-surface scale-105 animate-calendar-date-select'
                    : isToday
                      ? 'bg-primary text-white font-bold shadow-xs'
                      : isSelected
                        ? 'bg-primary-tint text-primary font-bold ring-2 ring-primary ring-offset-2 ring-offset-surface shadow-2xs scale-105 animate-calendar-date-select'
                        : isCurrentMonthDay
                          ? 'text-text-primary hover:bg-surface hover:text-primary hover:scale-105'
                          : 'text-text-muted/40 hover:text-text-muted hover:bg-surface/50'
                  }`}
              >
                <span>{format(d, 'd')}</span>
                {hasTasks && !isToday && (
                  <span
                    className={`absolute bottom-0.5 w-1 h-1 rounded-full transition-colors ${isSelected ? 'bg-primary' : 'bg-primary/70'
                      }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Date Tasks Quick Action Bar */}
        <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
          <span className="text-text-secondary truncate">
            <strong className="text-text-primary font-semibold">
              {format(selectedDate, 'MMM d')}:
            </strong>{' '}
            {tasksOnSelectedDate.length > 0
              ? `${tasksOnSelectedDate.length} due task${tasksOnSelectedDate.length > 1 ? 's' : ''}`
              : 'No tasks scheduled'}
          </span>
          <button
            type="button"
            onClick={() => {
              setTaskSearchQuery('');
              setTaskStatusFilter('all');
              setTaskDateFilter(format(selectedDate, 'yyyy-MM-dd'));
              setIsAllTasksModalOpen(true);
            }}
            aria-label={`View tasks for ${format(selectedDate, 'MMMM d, yyyy')}`}
            className={`text-[11px] font-bold cursor-pointer shrink-0 ml-2 transition-colors ${tasksOnSelectedDate.length > 0
                ? 'text-primary hover:underline hover:text-primary-hover'
                : 'text-text-muted hover:text-primary hover:underline'
              }`}
          >
            {tasksOnSelectedDate.length > 0 ? 'View tasks' : 'View day'}
          </button>
        </div>
      </div>

      {/* Upcoming Tasks Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h3 className="text-sm font-bold text-text-primary tracking-tight">
            Upcoming Task
          </h3>
          {/* Functional View All Button */}
          <button
            type="button"
            onClick={() => {
              setTaskSearchQuery('');
              setTaskStatusFilter('all');
              setTaskDateFilter('all');
              setIsAllTasksModalOpen(true);
            }}
            aria-label={`View all ${cards.length} tasks`}
            className="text-xs font-semibold text-primary hover:text-primary-hover hover:underline cursor-pointer transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded px-1 py-0.5 flex items-center gap-1"
          >
            <span>View All ({cards.length})</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {upcomingTasks.length === 0 ? (
          <div className="p-4 bg-surface-muted/40 border border-dashed border-border rounded-2xl text-center">
            <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-text-primary">All caught up!</p>
            <p className="text-[11px] text-text-secondary mt-0.5">No pending upcoming tasks on this board.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedUpcomingTasks.map((t, i) => {
              const profile = cardProfiles[i % cardProfiles.length];
              const dueStr = t.due_date ? formatShortDate(t.due_date) : 'No deadline';
              const listName = listNamesById[t.list_id] || board?.name || 'Project';

              return (
                <div
                  key={t.id}
                  onClick={() => handleOpenCard(t)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenCard(t);
                    }
                  }}
                  className={`w-full p-3.5 rounded-2xl border transition-all cursor-pointer text-left shadow-2xs hover:shadow-xs hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${profile.bgClass}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider truncate text-text-primary">
                      {listName}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${profile.badgeClass}`}>
                      {dueStr}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-text-primary line-clamp-1 leading-tight">
                    {t.title}
                  </h4>
                  {t.description && t.description !== '<p></p>' && (
                    <p className="text-[11px] text-text-secondary line-clamp-2 mt-1 leading-relaxed">
                      {t.description.replace(/<[^>]*>/g, '')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comprehensive All Tasks Modal (Triggered by "View All" or Calendar "View") */}
      {isAllTasksModalOpen && (
        <Modal
          isOpen={isAllTasksModalOpen}
          onClose={handleCloseAllTasksModal}
          title="Board Tasks & Deadlines"
          description={
            taskDateFilter !== 'all'
              ? `Viewing tasks due on ${format(new Date(taskDateFilter + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}`
              : `Viewing all tasks across lists for ${board?.name || 'this board'}`
          }
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full text-xs">
              <span className="text-text-muted">
                Showing {filteredModalTasks.length} of {cards.length} tasks
                {taskDateFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setTaskDateFilter('all')}
                    className="ml-2 text-primary hover:underline font-semibold cursor-pointer"
                  >
                    (Show all dates)
                  </button>
                )}
              </span>
              <button
                type="button"
                onClick={handleCloseAllTasksModal}
                className="px-4 py-2 bg-surface hover:bg-surface-muted border border-border rounded-xl text-text-primary font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4 pt-1 flex flex-col min-h-[440px] max-h-[75vh]">
            {/* Search and Filters Controls */}
            <div className="space-y-2.5 shrink-0">
              {/* Search input and Date Filter selector row */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                {/* Search Box */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter tasks by title or description..."
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full pl-9 pr-8 py-2 text-xs bg-surface-muted border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:bg-surface transition-all"
                  />
                  {taskSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTaskSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Date Filter Dropdown using project's custom Select */}
                <div className="w-full sm:w-56 shrink-0">
                  <Select
                    value={taskDateFilter}
                    onChange={(val) => setTaskDateFilter(String(val))}
                    size="sm"
                    aria-label="Filter tasks by due date"
                    options={modalDateOptions}
                    className="w-full text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Status Filter Tabs & Active Date Filter Chip row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Status Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar shrink-0">
                  {[
                    { id: 'all', label: `All (${modalTaskStats.total})` },
                    { id: 'upcoming', label: `Upcoming (${modalTaskStats.upcoming})` },
                    { id: 'overdue', label: `Overdue (${modalTaskStats.overdue})` },
                    { id: 'completed', label: `Completed (${modalTaskStats.completed})` }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTaskStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${taskStatusFilter === tab.id
                          ? 'bg-primary text-white shadow-2xs font-bold'
                          : 'bg-surface-muted text-text-secondary hover:text-text-primary hover:bg-surface border border-border/60'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Active Date Filter Chip when a date is filtered */}
                {taskDateFilter !== 'all' && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-tint border border-primary/20 rounded-xl text-xs font-semibold text-primary shrink-0 animate-in fade-in">
                    <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                    <span>{format(new Date(taskDateFilter + 'T00:00:00'), 'MMM d, yyyy')}</span>
                    <button
                      type="button"
                      onClick={() => setTaskDateFilter('all')}
                      className="p-0.5 hover:bg-primary/20 rounded-full cursor-pointer ml-1 text-primary transition-colors"
                      title="Clear date filter and show all dates"
                      aria-label="Clear date filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tasks List / Empty State area - height is rock-solid across filter tabs */}
            <div className="flex-1 min-h-[340px] flex flex-col overflow-hidden">
              {filteredModalTasks.length === 0 ? (
                <div className="flex-1 min-h-[340px] flex flex-col items-center justify-center p-8 text-center bg-surface-muted/30 border border-dashed border-border rounded-2xl space-y-2">
                  <ListTodo className="w-10 h-10 text-text-muted mx-auto" />
                  <p className="text-sm font-bold text-text-primary">No tasks found</p>
                  <p className="text-xs text-text-secondary max-w-xs">
                    {taskSearchQuery
                      ? `No tasks matched "${taskSearchQuery}"${taskDateFilter !== 'all'
                        ? ` on ${format(new Date(taskDateFilter + 'T00:00:00'), 'MMM d, yyyy')}`
                        : ''
                      }.`
                      : taskDateFilter !== 'all'
                        ? `No ${taskStatusFilter !== 'all' ? taskStatusFilter : ''} tasks due on ${format(
                          new Date(taskDateFilter + 'T00:00:00'),
                          'MMMM d, yyyy'
                        )}.`
                        : taskStatusFilter !== 'all'
                          ? `No ${taskStatusFilter} tasks on this board.`
                          : 'No tasks found on this board.'}
                  </p>
                  {(taskSearchQuery || taskStatusFilter !== 'all' || taskDateFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setTaskSearchQuery('');
                        setTaskStatusFilter('all');
                        setTaskDateFilter('all');
                      }}
                      className="mt-2 px-3 py-1 bg-surface border border-border rounded-lg text-xs font-semibold text-primary hover:text-primary-hover hover:border-primary/40 cursor-pointer shadow-2xs"
                    >
                      Reset All Filters & Search
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex-1 min-h-[340px] max-h-[50vh] overflow-y-auto pr-1 space-y-2">
                  {filteredModalTasks.map((card) => {
                    const isDone = card.is_complete;
                    const now = new Date();
                    const isOverdue = !isDone && card.due_date && new Date(card.due_date) < now;
                    const listName = listNamesById[card.list_id] || 'Board';
                    const dueStr = card.due_date ? formatShortDate(card.due_date) : 'No due date';

                    return (
                      <div
                        key={card.id}
                        onClick={() => handleOpenCard(card)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleOpenCard(card);
                          }
                        }}
                        className="w-full p-3.5 bg-surface hover:bg-surface-muted/60 border border-border hover:border-primary/40 rounded-2xl transition-all cursor-pointer text-left flex items-start justify-between gap-3 shadow-2xs group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Status Icon */}
                          <div className="pt-0.5 shrink-0">
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-success" />
                            ) : isOverdue ? (
                              <AlertCircle className="w-4 h-4 text-danger" />
                            ) : (
                              <Clock className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                            )}
                          </div>

                          {/* Title, list and description */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-surface-muted text-text-muted rounded-md border border-border/60">
                                {listName}
                              </span>
                              {card.due_date && (
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDone
                                      ? 'bg-success-tint text-success-text'
                                      : isOverdue
                                        ? 'bg-danger-tint text-danger-text'
                                        : 'bg-primary-tint text-primary'
                                    }`}
                                >
                                  {dueStr}
                                </span>
                              )}
                            </div>
                            <h4
                              className={`text-xs font-bold transition-colors line-clamp-1 ${isDone
                                  ? 'line-through text-text-muted'
                                  : 'text-text-primary group-hover:text-primary'
                                }`}
                            >
                              {card.title}
                            </h4>
                            {card.description && card.description !== '<p></p>' && (
                              <p className="text-[11px] text-text-secondary line-clamp-1 mt-0.5">
                                {card.description.replace(/<[^>]*>/g, '')}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right Action Chevron */}
                        <div className="shrink-0 pt-1 text-text-muted group-hover:text-primary transition-colors">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </aside>
  );
}
