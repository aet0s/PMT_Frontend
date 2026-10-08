import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2, ChevronDown } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { formatShortDate } from '../../lib/dateFormat';

export default function RightContextPanel({
  user,
  board,
  cards = [],
  onCardClick,
  className = ''
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const today = new Date();
  const greetingName = user?.name ? user.name.split(' ')[0] : 'Team';
  const todayFormatted = format(today, 'EEEE, do MMM yyyy');

  // Month navigation
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

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

  // Upcoming tasks: tasks with due dates in the future or not completed
  const upcomingTasks = useMemo(() => {
    const sorted = [...cards]
      .filter((c) => !c.is_complete)
      .sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });

    return sorted.slice(0, 4);
  }, [cards]);

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

  return (
    <aside
      aria-label="Workspace context and upcoming tasks"
      className={`w-full shrink-0 bg-app flex flex-col h-full overflow-y-auto select-none px-2 py-1 lg:px-4 lg:py-2 space-y-6 no-scrollbar ${className}`}
    >
      {/* User Greeting Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="min-w-0 pr-2">
          <h2 className="text-lg font-bold text-text-primary tracking-tight truncate">
            Hi, {greetingName}!
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 truncate">
            Today is {todayFormatted}
          </p>
        </div>
        <div className="shrink-0 ring-2 ring-primary/20 rounded-full p-0.5">
          <Avatar name={user?.name || 'User'} size="md" status="online" />
        </div>
      </div>

      {/* Mini Calendar Widget */}
      <div className="bg-surface-muted/50 border border-border/50 rounded-3xl p-4 shadow-2xs">
        {/* Calendar Header with Month Selector & Prev/Next */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5 font-bold text-sm text-text-primary">
            <span>{format(currentMonth, 'MMMM yyyy')}</span>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
          </div>
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
            const isCurrentMonth = isSameMonth(d, currentMonth);
            const isSelected = isSameDay(d, selectedDate);
            const dateStr = format(d, 'yyyy-MM-dd');
            const hasTasks = cardsByDate[dateStr]?.length > 0;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={`relative h-7 w-7 mx-auto rounded-full flex items-center justify-center font-medium transition-all cursor-pointer ${
                  isToday
                    ? 'bg-primary text-white font-bold shadow-xs'
                    : isSelected && !isToday
                    ? 'border-2 border-primary text-primary font-bold bg-primary-tint'
                    : isCurrentMonth
                    ? 'text-text-primary hover:bg-surface hover:text-primary'
                    : 'text-text-muted/50 hover:text-text-muted'
                }`}
              >
                <span>{format(d, 'd')}</span>
                {hasTasks && !isToday && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Upcoming Tasks Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h3 className="text-sm font-bold text-text-primary tracking-tight">
            Upcoming Task
          </h3>
          <span className="text-xs font-semibold text-primary hover:text-primary-hover cursor-pointer">
            View All ({cards.length})
          </span>
        </div>

        {upcomingTasks.length === 0 ? (
          <div className="p-4 bg-surface-muted/40 border border-dashed border-border rounded-2xl text-center">
            <CheckCircle2 className="w-5 h-5 text-success mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-text-primary">All caught up!</p>
            <p className="text-[11px] text-text-secondary mt-0.5">No pending upcoming tasks on this board.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingTasks.map((t, i) => {
              const profile = cardProfiles[i % cardProfiles.length];
              const dueStr = t.due_date ? formatShortDate(t.due_date) : 'No deadline';

              return (
                <div
                  key={t.id}
                  onClick={() => onCardClick && onCardClick(t)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (onCardClick) onCardClick(t);
                    }
                  }}
                  className={`w-full p-3.5 rounded-2xl border transition-all cursor-pointer text-left shadow-2xs hover:shadow-xs hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${profile.bgClass}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider truncate text-text-primary">
                      {board?.name || 'Project'}
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
    </aside>
  );
}
