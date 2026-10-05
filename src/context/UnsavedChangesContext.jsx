// client/src/context/UnsavedChangesContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const UnsavedChangesContext = createContext({
  isDirty: false,
  setDirty: () => {},
  clearDirty: () => {}
});

export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext);
}

export function UnsavedChangesProvider({ children }) {
  const [dirtySources, setDirtySources] = useState(new Set());
  const isDirty = dirtySources.size > 0;

  const setDirty = useCallback((sourceId = 'default', dirty = true) => {
    setDirtySources((prev) => {
      const next = new Set(prev);
      if (dirty) {
        next.add(sourceId);
      } else {
        next.delete(sourceId);
      }
      return next;
    });
  }, []);

  const clearDirty = useCallback(() => {
    setDirtySources(new Set());
  }, []);

  // Intercept navigation via react-router-dom useBlocker
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) => {
        if (!isDirty) return false;
        const curr = currentLocation.pathname + currentLocation.search;
        const next = nextLocation.pathname + nextLocation.search;
        return curr !== next;
      },
      [isDirty]
    )
  );

  // Intercept page reload / tab close via window beforeunload
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleConfirmDiscard = () => {
    clearDirty();
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  };

  const handleCancel = () => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  };

  return (
    <UnsavedChangesContext.Provider value={{ isDirty, setDirty, clearDirty }}>
      {children}
      <ConfirmDialog
        isOpen={blocker.state === 'blocked'}
        title="Discard unsaved changes?"
        message="You have unsaved changes. Leaving this page will discard them. Are you sure you want to proceed?"
        confirmText="Discard changes"
        cancelText="Keep editing"
        variant="warning"
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancel}
      />
    </UnsavedChangesContext.Provider>
  );
}

export default UnsavedChangesProvider;
