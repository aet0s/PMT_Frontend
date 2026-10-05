import React, { useState, useEffect } from 'react';
import Popover from './Popover';
import { parseDDMMYYYY } from '../../lib/dateFormat';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addYears,
  subYears,
  addDays,
  isWithinInterval,
  isBefore,
  format
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar as CalendarIcon,
  Clock,
  Sparkles
} from 'lucide-react';
import CustomCheckbox from './CustomCheckbox';

export default function DatePicker({
  isOpen,
  onClose,
  anchorRef,
  startDate,
  dueDate,
  onChange
}) {
  const initialDue = dueDate ? new Date(dueDate) : null;
  const initialStart = startDate ? new Date(startDate) : null;

  const [activeTarget, setActiveTarget] = useState('due'); // 'due' | 'start'
  const [currentMonth, setCurrentMonth] = useState(initialDue || initialStart || new Date());

  const [enableStartDate, setEnableStartDate] = useState(Boolean(initialStart));
  const [startDateStr, setStartDateStr] = useState(
    initialStart
      ? `${String(initialStart.getDate()).padStart(2, '0')}/${String(initialStart.getMonth() + 1).padStart(2, '0')}/${initialStart.getFullYear()}`
      : ''
  );

  const [enableDueDate, setEnableDueDate] = useState(Boolean(initialDue));
  const [dueDateStr, setDueDateStr] = useState(
    initialDue
      ? `${String(initialDue.getDate()).padStart(2, '0')}/${String(initialDue.getMonth() + 1).padStart(2, '0')}/${initialDue.getFullYear()}`
      : `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`
  );
  const [dueTime, setDueTime] = useState(
    initialDue
      ? `${String(initialDue.getHours()).padStart(2, '0')}:${String(initialDue.getMinutes()).padStart(2, '0')}`
      : '17:00'
  );

  const [dateError, setDateError] = useState('');

  useEffect(() => {
    if (dueDate) {
      const d = new Date(dueDate);
      setEnableDueDate(true);
      setDueDateStr(
        `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
      );
      setDueTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      setCurrentMonth(d);
    } else {
      setEnableDueDate(false);
      setDueDateStr('');
    }

    if (startDate) {
      const s = new Date(startDate);
      setEnableStartDate(true);
      setStartDateStr(
        `${String(s.getDate()).padStart(2, '0')}/${String(s.getMonth() + 1).padStart(2, '0')}/${s.getFullYear()}`
      );
      if (!dueDate) {
        setCurrentMonth(s);
      }
    } else {
      setEnableStartDate(false);
      setStartDateStr('');
    }
  }, [dueDate, startDate]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const daysInGrid = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const parsedStart = enableStartDate && startDateStr ? parseDDMMYYYY(startDateStr) : null;
  const parsedDue = enableDueDate && dueDateStr ? parseDDMMYYYY(dueDateStr) : null;

  const handleSelectDay = (day) => {
    setDateError('');
    const formatted = `${String(day.getDate()).padStart(2, '0')}/${String(day.getMonth() + 1).padStart(2, '0')}/${day.getFullYear()}`;
    if (activeTarget === 'start') {
      setEnableStartDate(true);
      setStartDateStr(formatted);
    } else {
      setEnableDueDate(true);
      setDueDateStr(formatted);
    }
  };

  const handlePreset = (type) => {
    setDateError('');
    const today = new Date();
    let targetDate = today;

    if (type === 'today') {
      targetDate = today;
    } else if (type === 'tomorrow') {
      targetDate = addDays(today, 1);
    } else if (type === 'nextWeek') {
      targetDate = addDays(today, 7);
    }

    const formatted = `${String(targetDate.getDate()).padStart(2, '0')}/${String(targetDate.getMonth() + 1).padStart(2, '0')}/${targetDate.getFullYear()}`;
    setCurrentMonth(targetDate);

    if (activeTarget === 'start') {
      setEnableStartDate(true);
      setStartDateStr(formatted);
    } else {
      setEnableDueDate(true);
      setDueDateStr(formatted);
    }
  };

  const handleSave = () => {
    let resolvedStart = null;
    let resolvedDue = null;

    if (enableStartDate && startDateStr.trim()) {
      const parsed = parseDDMMYYYY(startDateStr);
      if (!parsed) {
        setDateError('Invalid start date (use DD/MM/YYYY)');
        return;
      }
      resolvedStart = parsed.toISOString();
    }

    if (enableDueDate) {
      const parsed = parseDDMMYYYY(dueDateStr);
      if (!parsed) {
        setDateError('Invalid due date (use DD/MM/YYYY)');
        return;
      }
      const [hours, minutes] = dueTime.split(':').map((n) => parseInt(n, 10));
      parsed.setHours(hours || 0, minutes || 0, 0, 0);
      resolvedDue = parsed.toISOString();
    }

    if (resolvedStart && resolvedDue && new Date(resolvedStart) > new Date(resolvedDue)) {
      setDateError('Start date cannot be after due date');
      return;
    }

    onChange({ startDate: resolvedStart, dueDate: resolvedDue });
    onClose();
  };

  const handleRemove = () => {
    setEnableStartDate(false);
    setEnableDueDate(false);
    setStartDateStr('');
    setDueDateStr('');
    onChange({ startDate: null, dueDate: null });
    onClose();
  };

  const isToday = (day) => isSameDay(day, new Date());

  const getDayState = (day) => {
    const isStart = parsedStart && isSameDay(day, parsedStart);
    const isDue = parsedDue && isSameDay(day, parsedDue);
    const inRange =
      parsedStart &&
      parsedDue &&
      isBefore(parsedStart, parsedDue) &&
      isWithinInterval(day, { start: parsedStart, end: parsedDue });

    return { isStart, isDue, inRange };
  };

  const footer = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleSave}
        className="flex-1 py-2 px-3 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-medium text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
      >
        Save
      </button>
      <button
        type="button"
        onClick={handleRemove}
        className="py-2 px-3 bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary border border-border font-medium text-xs rounded-lg transition-colors cursor-pointer"
      >
        Remove
      </button>
    </div>
  );

  return (
    <Popover
      isOpen={isOpen}
      onClose={onClose}
      anchorRef={anchorRef}
      title="Dates"
      footer={footer}
      className="w-[310px]"
    >
      <div className="space-y-3 text-text-primary text-xs">
        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => handlePreset('today')}
            className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-surface border border-border hover:bg-surface-muted text-text-secondary hover:text-text-primary transition-colors cursor-pointer shrink-0"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handlePreset('tomorrow')}
            className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-surface border border-border hover:bg-surface-muted text-text-secondary hover:text-text-primary transition-colors cursor-pointer shrink-0"
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => handlePreset('nextWeek')}
            className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-surface border border-border hover:bg-surface-muted text-text-secondary hover:text-text-primary transition-colors cursor-pointer shrink-0"
          >
            In 1 Week
          </button>
        </div>

        {/* Segmented Target Tabs */}
        <div className="flex items-center p-1 bg-surface-muted rounded-lg border border-border gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTarget('start');
              setEnableStartDate(true);
            }}
            className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTarget === 'start'
                ? 'bg-primary text-white shadow-xs font-semibold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>Start Date</span>
            {enableStartDate && startDateStr && (
              <span className={`w-1.5 h-1.5 rounded-full ${activeTarget === 'start' ? 'bg-white' : 'bg-primary'}`} />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTarget('due');
              setEnableDueDate(true);
            }}
            className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTarget === 'due'
                ? 'bg-primary text-white shadow-xs font-semibold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>Due Date</span>
            {enableDueDate && dueDateStr && (
              <span className={`w-1.5 h-1.5 rounded-full ${activeTarget === 'due' ? 'bg-white' : 'bg-primary'}`} />
            )}
          </button>
        </div>

        {/* Calendar Card */}
        <div className="bg-surface p-2 rounded-xl border border-border space-y-2">
          {/* Month / Year Navigation */}
          <div className="flex items-center justify-between select-none px-1">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setCurrentMonth(subYears(currentMonth, 1))}
                title="Prev Year"
                className="p-1 text-text-muted hover:text-text-primary rounded-md hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                title="Prev Month"
                className="p-1 text-text-muted hover:text-text-primary rounded-md hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="font-semibold text-text-primary text-xs tracking-tight">
              {format(currentMonth, 'MMMM yyyy')}
            </span>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                title="Next Month"
                className="p-1 text-text-muted hover:text-text-primary rounded-md hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth(addYears(currentMonth, 1))}
                title="Next Year"
                className="p-1 text-text-muted hover:text-text-primary rounded-md hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 text-center font-semibold text-[10px] text-text-muted uppercase tracking-wider py-1 border-b border-border/60">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-1 text-center select-none">
            {daysInGrid.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const { isStart, isDue, inRange } = getDayState(day);
              const todayFlag = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`relative flex items-center justify-center py-0.5 ${
                    inRange ? 'bg-primary-tint/60' : ''
                  } ${isStart ? 'rounded-l-lg' : ''} ${isDue ? 'rounded-r-lg' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium flex items-center justify-center transition-all cursor-pointer relative z-10 ${
                      isStart || isDue
                        ? 'bg-primary text-white font-bold shadow-xs'
                        : inRange
                        ? 'text-primary font-semibold hover:bg-primary-tint'
                        : isCurrentMonth
                        ? 'text-text-primary hover:bg-surface-muted'
                        : 'text-text-muted/40 hover:bg-surface-muted/50'
                    } ${
                      todayFlag && !isStart && !isDue
                        ? 'ring-1 ring-primary/70 font-bold'
                        : ''
                    }`}
                  >
                    {format(day, 'd')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {dateError && (
          <p className="text-[11px] font-medium text-danger bg-danger-tint p-2 rounded-lg border border-danger/30 leading-snug">
            {dateError}
          </p>
        )}

        {/* Start Date Field */}
        <div className="p-2.5 bg-surface-muted rounded-xl border border-border space-y-2">
          <CustomCheckbox
            checked={enableStartDate}
            onChange={(checked) => {
              setEnableStartDate(checked);
              if (checked) {
                setActiveTarget('start');
                if (!startDateStr) {
                  const today = new Date();
                  setStartDateStr(
                    `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
                  );
                }
              }
            }}
            label="Start Date"
            size="sm"
          />
          {enableStartDate && (
            <input
              type="text"
              placeholder="DD/MM/YYYY"
              value={startDateStr}
              onFocus={() => setActiveTarget('start')}
              onChange={(e) => {
                setStartDateStr(e.target.value);
                setDateError('');
              }}
              className={`w-full px-2.5 py-1.5 bg-surface border rounded-lg text-text-primary font-mono text-xs focus:outline-none transition-colors ${
                activeTarget === 'start'
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-border'
              }`}
            />
          )}
        </div>

        {/* Due Date & Time Field */}
        <div className="p-2.5 bg-surface-muted rounded-xl border border-border space-y-2">
          <CustomCheckbox
            checked={enableDueDate}
            onChange={(checked) => {
              setEnableDueDate(checked);
              if (checked) {
                setActiveTarget('due');
                if (!dueDateStr) {
                  const today = new Date();
                  setDueDateStr(
                    `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
                  );
                }
              }
            }}
            label="Due Date"
            size="sm"
          />

          {enableDueDate && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="DD/MM/YYYY"
                value={dueDateStr}
                onFocus={() => setActiveTarget('due')}
                onChange={(e) => {
                  setDueDateStr(e.target.value);
                  setDateError('');
                }}
                className={`w-full px-2.5 py-1.5 bg-surface border rounded-lg text-text-primary font-mono text-xs focus:outline-none transition-colors ${
                  activeTarget === 'due'
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border'
                }`}
              />
              <div className="relative">
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-text-primary font-mono text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Popover>
  );
}
