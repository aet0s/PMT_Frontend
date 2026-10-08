// client/src/components/ui/Toast.jsx
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      type = 'info', // 'success' | 'error' | 'warning' | 'info'
      title,
      message,
      duration = 4000,
      action // { label: 'Undo', onClick: () => {} }
    }) => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
      const newToast = { id, type, title, message, action };

      setToasts((prev) => [...prev, newToast]);

      const toastDuration = action ? Math.max(duration, 6000) : duration;
      if (toastDuration > 0) {
        timersRef.current[id] = setTimeout(() => {
          removeToast(id);
        }, toastDuration);
      }

      return id;
    },
    [removeToast]
  );

  const success = useCallback((message, options = {}) => showToast({ type: 'success', message, ...options }), [showToast]);
  const error = useCallback((content, options = {}) => {
    let message = content;
    let requestId = options.requestId;
    if (content && typeof content === 'object') {
      message = content.message || 'An error occurred';
      requestId = requestId || content.requestId;
    }
    if (requestId && typeof message === 'string' && !message.includes(requestId)) {
      message = `${message} [Req: ${requestId.slice(0, 8)}]`;
    }
    return showToast({ type: 'error', message, ...options });
  }, [showToast]);
  const warning = useCallback((message, options = {}) => showToast({ type: 'warning', message, ...options }), [showToast]);
  const info = useCallback((message, options = {}) => showToast({ type: 'info', message, ...options }), [showToast]);
  const show = useCallback((message, type = 'info') => {
    if (typeof message === 'object') {
      return showToast(message);
    }
    return showToast({ message, type });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, addToast: showToast, removeToast, success, error, warning, info, show }}>
      {children}
      {/* Toast Render Container */}
      <div
        role="region"
        aria-label="Notifications"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const ICONS = {
    success: <CheckCircle2 className="w-5 h-5 text-success shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-danger shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning shrink-0" />,
    info: <Info className="w-5 h-5 text-info shrink-0" />
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto flex items-start gap-3 p-3.5 bg-surface border border-border rounded-xl shadow-lg animate-slide-up text-left"
    >
      {ICONS[toast.type] || ICONS.info}
      <div className="flex-1 min-w-0 pr-1">
        {toast.title && (
          <h4 className="text-sm font-semibold text-text-primary leading-tight">
            {toast.title}
          </h4>
        )}
        {toast.message && (
          <p className="text-xs text-text-secondary mt-0.5 leading-snug">
            {toast.message}
          </p>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action.onClick();
              onDismiss();
            }}
            className="mt-2 text-xs font-semibold text-primary hover:text-primary-hover active:text-primary-active underline cursor-pointer"
          >
            {toast.action.label || 'Undo'}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss toast"
        className="text-text-muted hover:text-text-primary p-1 cursor-pointer rounded"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastProvider;
