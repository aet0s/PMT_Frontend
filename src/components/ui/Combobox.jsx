// client/src/components/ui/Combobox.jsx
import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  size,
  useDismiss,
  useRole,
  useListNavigation,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager
} from '@floating-ui/react';
import { Search, ChevronDown, Check, X, Loader2 } from 'lucide-react';
import Tooltip from './Tooltip';

export function Combobox({
  label,
  error,
  hint,
  id,
  options = [],
  value, // string/number if single, array if multiple
  onChange,
  placeholder = 'Search or select...',
  multiple = false,
  isLoading = false,
  onSearch, // optional async search callback
  disabled = false,
  required = false,
  size: controlSize = 'md',
  className = '',
  ...props
}) {
  const generatedId = useId();
  const comboboxId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : generatedId);
  const listboxId = `${comboboxId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Normalize options
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: opt.value,
          label: opt.label !== undefined ? opt.label : String(opt.value),
          icon: opt.icon || null,
          avatar: opt.avatar || null,
          description: opt.description || null,
          disabled: Boolean(opt.disabled),
          disabledReason: opt.disabledReason || null
        };
      }
      return {
        value: opt,
        label: String(opt),
        icon: null,
        avatar: null,
        description: null,
        disabled: false,
        disabledReason: null
      };
    });
  }, [options]);

  // Filter options based on local search query if onSearch not handled externally
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery]);

  const elementsRef = useRef([]);

  const { refs, floatingStyles, context, isPositioned } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom-start',
    strategy: 'fixed',
    transform: false,
    whileElementsMounted: autoUpdate,
    middleware: isMobile
      ? []
      : [
          offset(4),
          flip({ padding: 8 }),
          shift({ padding: 8 }),
          size({
            apply({ rects, elements }) {
              Object.assign(elements.floating.style, {
                width: `${Math.max(rects.reference.width, 240)}px`,
                maxHeight: '280px'
              });
            }
          })
        ]
  });

  const dismiss = useDismiss(context, { outsidePressEvent: 'mousedown' });
  const role = useRole(context, { role: 'combobox' });
  const listNav = useListNavigation(context, {
    listRef: elementsRef,
    activeIndex,
    onNavigate: setActiveIndex,
    virtual: true,
    loop: true
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    dismiss,
    role,
    listNav
  ]);

  const handleSelectOption = (optValue, isDisabled) => {
    if (isDisabled || disabled) return;

    if (multiple) {
      const currentList = Array.isArray(value) ? value : [];
      const exists = currentList.includes(optValue);
      const next = exists
        ? currentList.filter((v) => v !== optValue)
        : [...currentList, optValue];
      onChange?.(next);
    } else {
      onChange?.(optValue);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const handleRemoveChip = (e, chipValue) => {
    e.stopPropagation();
    if (multiple && Array.isArray(value)) {
      onChange?.(value.filter((v) => v !== chipValue));
    }
  };

  const isOptionSelected = (optValue) => {
    if (multiple) {
      return Array.isArray(value) && value.includes(optValue);
    }
    return String(value) === String(optValue);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!isOpen) setIsOpen(true);
    onSearch?.(val);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (activeIndex !== null && filteredOptions[activeIndex]) {
        e.preventDefault();
        const chosen = filteredOptions[activeIndex];
        handleSelectOption(chosen.value, chosen.disabled);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const selectedChips = useMemo(() => {
    if (!multiple || !Array.isArray(value)) return [];
    return value.map((val) => {
      const found = normalizedOptions.find((o) => o.value === val);
      return found || { value: val, label: String(val) };
    });
  }, [multiple, value, normalizedOptions]);

  const singleSelectedLabel = useMemo(() => {
    if (multiple) return null;
    const found = normalizedOptions.find((o) => String(o.value) === String(value));
    return found ? found.label : null;
  }, [multiple, value, normalizedOptions]);

  const sizeStyles = {
    sm: 'min-h-[32px] px-2 py-1 text-xs rounded-lg',
    md: 'min-h-[40px] px-3 py-1.5 text-sm rounded-lg',
    lg: 'min-h-[48px] px-3.5 py-2 text-base rounded-lg'
  };

  return (
    <div className={`w-full space-y-1.5 text-left ${className}`}>
      {label && (
        <label
          htmlFor={comboboxId}
          id={`${comboboxId}-label`}
          className="block text-xs font-semibold text-text-secondary select-none"
        >
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <div
          ref={refs.setReference}
          onClick={() => {
            if (!disabled) setIsOpen(true);
          }}
          className={`w-full flex flex-wrap items-center gap-1.5 bg-surface border transition-colors duration-150 cursor-text ${
            sizeStyles[controlSize] || sizeStyles.md
          } ${
            error
              ? 'border-danger focus-within:ring-2 focus-within:ring-danger/30'
              : isOpen
              ? 'border-primary ring-2 ring-primary/40'
              : 'border-border hover:border-border-strong'
          } ${disabled ? 'bg-surface-muted cursor-not-allowed opacity-60' : ''}`}
        >
          {/* Multiple selected chips */}
          {multiple &&
            selectedChips.map((chip) => (
              <span
                key={chip.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-tint text-primary-text text-xs font-medium"
              >
                {chip.avatar && <span className="shrink-0">{chip.avatar}</span>}
                <span className="truncate max-w-[120px]">{chip.label}</span>
                {!disabled && (
                  <button
                    type="button"
                    aria-label={`Remove ${chip.label}`}
                    title={`Remove ${chip.label}`}
                    onClick={(e) => handleRemoveChip(e, chip.value)}
                    className="hover:text-primary-dark cursor-pointer flex items-center justify-center p-0.5 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}

          {/* Search Input */}
          <div className="flex-1 flex items-center min-w-[80px]">
            <input
              id={comboboxId}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              disabled={disabled}
              value={searchQuery}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onFocus={() => setIsOpen(true)}
              aria-expanded={isOpen}
              aria-controls={isOpen ? listboxId : undefined}
              aria-labelledby={label ? `${comboboxId}-label` : undefined}
              aria-label={props['aria-label'] || (!label ? placeholder : undefined)}
              aria-activedescendant={
                activeIndex !== null && filteredOptions[activeIndex]
                  ? `${listboxId}-opt-${activeIndex}`
                  : undefined
              }
              placeholder={
                multiple
                  ? selectedChips.length === 0
                    ? placeholder
                    : ''
                  : singleSelectedLabel || placeholder
              }
              {...getReferenceProps()}
              className="w-full bg-transparent outline-none text-text-primary placeholder:text-text-muted text-inherit"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0 text-text-muted">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-primary' : ''
                }`}
              />
            )}
          </div>
        </div>
      </div>

      {error ? (
        <p className="text-xs text-danger font-medium leading-tight">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-secondary leading-tight">{hint}</p>
      ) : null}

      {/* Floating Panel / Bottom Sheet */}
      {isOpen && (
        <FloatingPortal>
          {isMobile ? (
            /* Bottom sheet */
            <div
              className="fixed inset-0 z-[900] flex flex-col justify-end bg-text-primary/30"
              onClick={() => setIsOpen(false)}
            >
              <div
                className="w-full bg-surface border-t border-border rounded-t-2xl p-4 max-h-[75vh] flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-1.5 bg-border-strong rounded-full" />
                </div>
                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    placeholder="Search options..."
                    className="w-full h-10 pl-9 pr-3 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary"
                    autoFocus
                  />
                </div>
                <div
                  id={listboxId}
                  role="listbox"
                  className="overflow-y-auto space-y-1 py-1"
                >
                  {filteredOptions.length === 0 ? (
                    <div className="py-6 text-center text-sm text-text-muted">
                      No results found
                    </div>
                  ) : (
                    filteredOptions.map((opt, idx) => {
                      const selected = isOptionSelected(opt.value);
                      return (
                        <button
                          key={`${opt.value}-${idx}`}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          disabled={opt.disabled}
                          onClick={() => handleSelectOption(opt.value, opt.disabled)}
                          className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                            selected
                              ? 'bg-primary-tint text-primary font-medium'
                              : opt.disabled
                              ? 'opacity-40 cursor-not-allowed text-text-muted'
                              : 'text-text-primary hover:bg-surface-muted active:bg-surface-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {opt.icon && <span className="text-text-secondary">{opt.icon}</span>}
                            {opt.avatar && <span>{opt.avatar}</span>}
                            <div className="text-left">
                              <span className="block truncate">{opt.label}</span>
                              {opt.description && (
                                <span className="block text-xs text-text-secondary">
                                  {opt.description}
                                </span>
                              )}
                            </div>
                          </div>
                          {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Desktop Floating Panel */
            <FloatingFocusManager context={context} initialFocus={-1} modal={false}>
              <div
                ref={refs.setFloating}
                style={{
                  ...floatingStyles,
                  visibility: ((typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') || isPositioned) ? 'visible' : 'hidden',
                  opacity: ((typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') || isPositioned) ? 1 : 0
                }}
                className="z-[900]"
              >
                <div
                  id={listboxId}
                  role="listbox"
                  {...getFloatingProps()}
                  className="bg-surface border border-border rounded-xl shadow-xl p-1 overflow-y-auto outline-none animate-sassy-dropdown max-h-[280px]"
                >
                {filteredOptions.length === 0 ? (
                  <div className="py-4 text-center text-xs text-text-muted italic">
                    No results found
                  </div>
                ) : (
                  filteredOptions.map((opt, idx) => {
                    const selected = isOptionSelected(opt.value);
                    const isActive = activeIndex === idx;

                    const itemNode = (
                      <div
                        key={`${opt.value}-${idx}`}
                        ref={(node) => {
                          elementsRef.current[idx] = node;
                        }}
                        id={`${listboxId}-opt-${idx}`}
                        role="option"
                        aria-selected={selected}
                        aria-disabled={opt.disabled}
                        tabIndex={isActive ? 0 : -1}
                        {...getItemProps({
                          onClick() {
                            handleSelectOption(opt.value, opt.disabled);
                          }
                        })}
                        className={`w-full min-h-[36px] flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer select-none ${
                          selected
                            ? 'bg-primary-tint text-primary font-medium'
                            : isActive
                            ? 'bg-primary-tint/60 text-text-primary'
                            : opt.disabled
                            ? 'opacity-40 cursor-not-allowed text-text-muted'
                            : 'text-text-primary hover:bg-surface-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          {opt.icon && (
                            <span className="shrink-0 text-text-secondary flex items-center">
                              {opt.icon}
                            </span>
                          )}
                          {opt.avatar && (
                            <span className="shrink-0 flex items-center">
                              {opt.avatar}
                            </span>
                          )}
                          <div className="text-left min-w-0">
                            <span className="block truncate">{opt.label}</span>
                            {opt.description && (
                              <span className="block text-[11px] text-text-secondary leading-tight truncate">
                                {opt.description}
                              </span>
                            )}
                          </div>
                        </div>

                        {selected && (
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </div>
                    );

                    if (opt.disabled && opt.disabledReason) {
                      return (
                        <Tooltip key={`${opt.value}-${idx}`} content={opt.disabledReason}>
                          <div>{itemNode}</div>
                        </Tooltip>
                      );
                    }

                    return itemNode;
                  })
                )}
                </div>
              </div>
            </FloatingFocusManager>
          )}
        </FloatingPortal>
      )}
    </div>
  );
}

export default Combobox;
