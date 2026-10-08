// client/src/components/ui/Menu.jsx
import React, { useState, useRef, useEffect, Children, isValidElement, cloneElement } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useRole,
  useListNavigation,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager
} from '@floating-ui/react';

export function Menu({
  trigger,
  children,
  placement = 'bottom-start',
  className = '',
  offsetDistance = 4
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);
  const elementsRef = useRef([]);

  const { refs, floatingStyles, context, isPositioned } = useFloating({
    open: isOpen,
    onOpenChange: (nextOpen) => {
      setIsOpen(nextOpen);
      if (nextOpen) {
        setActiveIndex(0);
      } else {
        setActiveIndex(null);
      }
    },
    placement,
    strategy: 'fixed',
    transform: false,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(offsetDistance),
      flip({ padding: 8 }),
      shift({ padding: 8 })
    ]
  });

  const click = useClick(context);
  const dismiss = useDismiss(context, { outsidePressEvent: 'mousedown' });
  const role = useRole(context, { role: 'menu' });
  const listNav = useListNavigation(context, {
    listRef: elementsRef,
    activeIndex,
    onNavigate: setActiveIndex,
    loop: true
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    click,
    dismiss,
    role,
    listNav
  ]);

  const closeMenu = () => {
    setIsOpen(false);
  };

  // Clone children to attach refs and interactions
  let itemIndex = 0;
  const renderedChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (child.type === MenuItem || child.props?.role === 'menuitem') {
      const currentIndex = itemIndex++;
      return cloneElement(child, {
        ...getItemProps({
          onClick(e) {
            child.props.onClick?.(e);
            if (!child.props.preventClose) {
              closeMenu();
            }
          }
        }),
        ref(node) {
          elementsRef.current[currentIndex] = node;
        },
        tabIndex: activeIndex === currentIndex ? 0 : -1
      });
    }
    return child;
  });

  let triggerElement;
  if (typeof trigger === 'function') {
    triggerElement = trigger({ isOpen });
  } else {
    triggerElement = trigger;
  }

  const renderedTrigger = isValidElement(triggerElement) ? (
    cloneElement(triggerElement, {
      ref: (node) => {
        refs.setReference(node);
        const { ref } = triggerElement;
        if (typeof ref === 'function') ref(node);
        else if (ref && 'current' in ref) ref.current = node;
      },
      ...getReferenceProps({
        ...triggerElement.props,
        onClick(e) {
          e.stopPropagation();
          triggerElement.props?.onClick?.(e);
        }
      })
    })
  ) : (
    <button
      type="button"
      ref={refs.setReference}
      {...getReferenceProps({
        onClick(e) {
          e.stopPropagation();
        }
      })}
      className="inline-flex items-center cursor-pointer"
    >
      {triggerElement}
    </button>
  );

  const isPositionedReady = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') || isPositioned;

  return (
    <>
      {renderedTrigger}

      {isOpen && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} initialFocus={0}>
            <div
              ref={refs.setFloating}
              style={{
                ...floatingStyles,
                visibility: isPositionedReady ? 'visible' : 'hidden',
                opacity: isPositionedReady ? 1 : 0
              }}
              className="z-[900]"
            >
              <div
                role="menu"
                aria-orientation="vertical"
                {...getFloatingProps()}
                className={`min-w-[180px] bg-surface border border-border rounded-2xl shadow-xl p-1.5 text-text-primary text-sm outline-none animate-sassy-dropdown ${className}`}
              >
                {typeof children === 'function' ? children({ close: closeMenu }) : renderedChildren}
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}

export const MenuItem = React.forwardRef(function MenuItem(
  {
    children,
    onClick,
    icon,
    danger = false,
    disabled = false,
    className = '',
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`w-full min-h-[36px] flex items-center gap-2.5 px-3 py-1.5 text-xs text-left rounded-lg transition-colors cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed ${
        danger
          ? 'text-danger hover:bg-danger-tint active:bg-danger-tint'
          : 'text-text-primary hover:bg-surface-muted active:bg-surface-muted'
      } ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0 text-text-secondary flex items-center">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
    </button>
  );
});

export function MenuDivider() {
  return <div className="h-px bg-border my-1" role="separator" />;
}

export function MenuGroup({ label, children }) {
  return (
    <div className="py-1">
      {label && (
        <div className="px-3 py-1 text-[11px] font-semibold text-text-secondary uppercase tracking-wider select-none">
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

export default Menu;
