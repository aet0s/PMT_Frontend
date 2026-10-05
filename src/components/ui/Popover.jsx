// client/src/components/ui/Popover.jsx
import React, { useState, useId } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager
} from '@floating-ui/react';

export function Popover({
  children,
  trigger,
  isOpen: controlledIsOpen,
  onOpenChange: setControlledIsOpen,
  placement = 'bottom-start',
  offsetDistance = 6,
  modal = false,
  className = ''
}) {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : uncontrolledIsOpen;
  const setIsOpen = isControlled ? setControlledIsOpen : setUncontrolledIsOpen;

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(offsetDistance),
      flip({ fallbackAxisSideDirection: 'end', padding: 8 }),
      shift({ padding: 8 })
    ]
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role
  ]);

  const headingId = useId();

  let triggerElement;
  if (typeof trigger === 'function') {
    triggerElement = trigger({ isOpen });
  } else {
    triggerElement = trigger;
  }

  const renderedTrigger = React.isValidElement(triggerElement) ? (
    React.cloneElement(triggerElement, {
      ref: (node) => {
        refs.setReference(node);
        const { ref } = triggerElement;
        if (typeof ref === 'function') ref(node);
        else if (ref && 'current' in ref) ref.current = node;
      },
      ...getReferenceProps(triggerElement.props)
    })
  ) : (
    <button
      type="button"
      ref={refs.setReference}
      {...getReferenceProps()}
      className="inline-flex items-center cursor-pointer"
    >
      {triggerElement}
    </button>
  );

  return (
    <>
      {renderedTrigger}
      {isOpen && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={modal}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              aria-labelledby={headingId}
              {...getFloatingProps()}
              className={`z-[900] bg-surface border border-border rounded-xl shadow-xl p-3 text-text-primary text-sm motion-safe:transition-all motion-safe:duration-150 ${className}`}
            >
              {typeof children === 'function' ? children({ close: () => setIsOpen(false) }) : children}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}

export default Popover;
