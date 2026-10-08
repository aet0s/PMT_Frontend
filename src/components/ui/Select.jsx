// client/src/components/ui/Select.jsx
import React, { useState, useRef, useEffect, useId, Children, isValidElement } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  size,
  useClick,
  useDismiss,
  useRole,
  useListNavigation,
  useTypeahead,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager
} from '@floating-ui/react';
import { ChevronDown, Check, X, AlertCircle } from 'lucide-react';
import Tooltip from './Tooltip';

export const Select = React.forwardRef(function Select(
  {
    label,
    error,
    hint,
    id,
    name,
    value,
    defaultValue,
    onChange,
    options = [],
    placeholder = 'Select an option',
    disabled = false,
    required = false,
    clearable = false,
    size: controlSize = 'md', // 'sm' | 'md' | 'lg'
    className = '',
    children,
    ...props
  },
  forwardedRef
) {
  const generatedId = useId();
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : generatedId);
  const listboxId = `${selectId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value !== undefined ? value : defaultValue || '');
  const [activeIndex, setActiveIndex] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const selectedValue = value !== undefined ? value : internalValue;

  // Responsive check for bottom sheet on < 640px
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Parse options from props or children
  const parsedOptions = React.useMemo(() => {
    if (options && options.length > 0) {
      return options.map((opt) => {
        if (typeof opt === 'object' && opt !== null) {
          return {
            value: opt.value,
            label: opt.label !== undefined ? opt.label : String(opt.value),
            icon: opt.icon || null,
            avatar: opt.avatar || null,
            description: opt.description || null,
            disabled: Boolean(opt.disabled),
            disabledReason: opt.disabledReason || null,
            group: opt.group || null
          };
        }
        return {
          value: opt,
          label: String(opt),
          icon: null,
          avatar: null,
          description: null,
          disabled: false,
          disabledReason: null,
          group: null
        };
      });
    }

    // Fallback: parse React children if someone passes `<option value="x">X</option>`
    const items = [];
    Children.forEach(children, (child) => {
      if (isValidElement(child)) {
        items.push({
          value: child.props.value,
          label: child.props.children || String(child.props.value),
          icon: child.props.icon || null,
          avatar: child.props.avatar || null,
          description: child.props.description || null,
          disabled: Boolean(child.props.disabled),
          disabledReason: child.props.disabledReason || null,
          group: child.props.group || null
        });
      }
    });
    return items;
  }, [options, children]);

  const selectedOption = parsedOptions.find(
    (opt) => String(opt.value) === String(selectedValue)
  );

  const elementsRef = useRef([]);
  const labelsRef = useRef(parsedOptions.map((o) => o.label));
  labelsRef.current = parsedOptions.map((o) => o.label);

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
                width: `${rects.reference.width}px`,
                maxHeight: '280px'
              });
            }
          })
        ]
  });

  const click = useClick(context, { enabled: !disabled });
  const dismiss = useDismiss(context, { outsidePressEvent: 'mousedown' });
  const role = useRole(context, { role: 'listbox' });
  const listNav = useListNavigation(context, {
    listRef: elementsRef,
    activeIndex,
    selectedIndex: parsedOptions.findIndex(
      (opt) => String(opt.value) === String(selectedValue)
    ),
    onNavigate: setActiveIndex,
    loop: true,
    focusItemOnHover: false
  });
  const typeahead = useTypeahead(context, {
    listRef: labelsRef,
    activeIndex,
    onMatch: (index) => {
      if (index >= 0 && index < parsedOptions.length) {
        if (!parsedOptions[index].disabled) {
          setActiveIndex(index);
        }
      }
    }
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    click,
    dismiss,
    role,
    listNav,
    typeahead
  ]);

  const handleSelect = (val, isDisabled) => {
    if (isDisabled || disabled) return;
    setInternalValue(val);
    if (onChange) {
      onChange(val);
    }
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setInternalValue('');
    if (onChange) {
      onChange('');
    }
  };

  // Heights matching Input: sm: 32px (h-8), md: 40px (h-10), lg: 48px (h-12)
  const sizeStyles = {
    sm: 'h-8 min-h-[32px] px-2.5 text-xs rounded-lg',
    md: 'h-10 min-h-[40px] px-3.5 text-sm rounded-lg',
    lg: 'h-12 min-h-[48px] px-4 text-base rounded-lg'
  };

  return (
    <div className={`w-full space-y-1.5 text-left ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          id={`${selectId}-label`}
          className="block text-xs font-semibold text-text-secondary select-none"
        >
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          ref={(node) => {
            refs.setReference(node);
            if (typeof forwardedRef === 'function') forwardedRef(node);
            else if (forwardedRef) forwardedRef.current = node;
          }}
          id={selectId}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={label ? `${selectId}-label` : undefined}
          aria-label={props['aria-label'] || (!label ? (selectedOption?.label || placeholder) : undefined)}
          aria-controls={isOpen ? listboxId : undefined}
          {...getReferenceProps()}
          className={`w-full flex items-center justify-between gap-2 bg-surface text-text-primary border transition-colors duration-150 select-none cursor-pointer focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 disabled:bg-surface-muted disabled:cursor-not-allowed disabled:text-text-muted ${
            sizeStyles[controlSize] || sizeStyles.md
          } ${
            error
              ? 'border-danger focus-visible:border-danger focus-visible:ring-danger/30'
              : isOpen
              ? 'border-primary ring-2 ring-primary/40'
              : 'border-border hover:border-border-strong'
          }`}
          {...props}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
            {selectedOption?.icon && (
              <span className="shrink-0 text-text-secondary flex items-center">
                {selectedOption.icon}
              </span>
            )}
            {selectedOption?.avatar && (
              <span className="shrink-0 flex items-center">
                {selectedOption.avatar}
              </span>
            )}
            <span
              className={`truncate ${
                !selectedOption ? 'text-text-muted' : 'text-text-primary font-normal'
              }`}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {clearable && selectedOption && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear selection"
                onClick={handleClear}
                className="p-0.5 text-text-muted hover:text-text-primary rounded hover:bg-surface-muted cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-primary' : ''
              }`}
            />
          </div>
        </button>

        {/* Hidden input for form submission compatibility */}
        {name && (
          <input
            type="hidden"
            name={name}
            value={selectedValue}
            disabled={disabled}
            required={required}
          />
        )}
      </div>

      {error ? (
        <p className="text-xs text-danger font-medium leading-tight">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-secondary leading-tight">{hint}</p>
      ) : null}

      {/* Floating Options Panel or Mobile Bottom Sheet */}
      {isOpen && (
        <FloatingPortal>
          {isMobile ? (
            /* Mobile Bottom Sheet (< 640px) */
            <div
              className="fixed inset-0 z-[900] flex flex-col justify-end bg-text-primary/30 animate-in fade-in duration-200"
              onClick={() => setIsOpen(false)}
            >
              <div
                className="w-full bg-surface border-t border-border rounded-t-2xl p-4 max-h-[75vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drag-to-close Handle */}
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-1.5 bg-border-strong rounded-full" />
                </div>
                {label && (
                  <h3 className="text-sm font-semibold text-text-primary mb-2 px-1">
                    {label}
                  </h3>
                )}
                <div
                  id={listboxId}
                  role="listbox"
                  aria-labelledby={label ? `${selectId}-label` : undefined}
                  className="overflow-y-auto space-y-1 py-1"
                >
                  {parsedOptions.length === 0 ? (
                    <div className="py-6 text-center text-sm text-text-muted">
                      No options available
                    </div>
                  ) : (
                    parsedOptions.map((opt, idx) => {
                      const isSelected = String(opt.value) === String(selectedValue);
                      return (
                        <button
                          key={`${opt.value}-${idx}`}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          disabled={opt.disabled}
                          onClick={() => handleSelect(opt.value, opt.disabled)}
                          className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                            isSelected
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
                          {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Desktop / Tablet Popover Floating Panel */
            <FloatingFocusManager context={context} modal={false}>
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
                  aria-labelledby={label ? `${selectId}-label` : undefined}
                  {...getFloatingProps()}
                  className="bg-surface border border-border rounded-xl shadow-xl p-1 overflow-y-auto outline-none animate-sassy-dropdown max-h-[280px]"
                >
                {parsedOptions.length === 0 ? (
                  <div className="py-4 text-center text-xs text-text-muted italic">
                    No options available
                  </div>
                ) : (
                  parsedOptions.map((opt, idx) => {
                    const isSelected = String(opt.value) === String(selectedValue);
                    const isActive = activeIndex === idx;

                    const optionContent = (
                      <div
                        key={`${opt.value}-${idx}`}
                        ref={(node) => {
                          elementsRef.current[idx] = node;
                        }}
                        role="option"
                        id={`${listboxId}-option-${idx}`}
                        aria-selected={isSelected}
                        aria-disabled={opt.disabled}
                        tabIndex={isActive ? 0 : -1}
                        {...getItemProps({
                          onClick() {
                            handleSelect(opt.value, opt.disabled);
                          },
                          onKeyDown(e) {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelect(opt.value, opt.disabled);
                            }
                          }
                        })}
                        className={`w-full min-h-[36px] flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer select-none ${
                          isSelected
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

                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </div>
                    );

                    if (opt.disabled && opt.disabledReason) {
                      return (
                        <Tooltip key={`${opt.value}-${idx}`} content={opt.disabledReason}>
                          <div>{optionContent}</div>
                        </Tooltip>
                      );
                    }

                    return optionContent;
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
});

export default Select;
