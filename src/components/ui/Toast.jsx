// client/src/components/ui/Toast.jsx
import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
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

  const contextValue = useMemo(
    () => ({ showToast, addToast: showToast, removeToast, success, error, warning, info, show }),
    [showToast, removeToast, success, error, warning, info, show]
  );

  return (
    <ToastContext.Provider value={contextValue}>
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
  const type = toast.type || 'info';

  const THEME_STYLES = {
    info: {
      card: 'bg-surface border-info/30 border-l-4 border-l-info shadow-xl shadow-info/10',
      iconBox: 'bg-info-tint border border-info/30 text-info',
      title: 'text-text-primary',
      message: 'text-text-secondary',
      closeBtn: 'text-text-muted hover:text-text-primary hover:bg-surface-muted',
      action: 'text-info hover:text-info-hover'
    },
    success: {
      card: 'bg-surface border-success/30 border-l-4 border-l-success shadow-xl shadow-success/10',
      iconBox: 'bg-success-tint border border-success/30 text-success',
      title: 'text-text-primary',
      message: 'text-text-secondary',
      closeBtn: 'text-text-muted hover:text-text-primary hover:bg-surface-muted',
      action: 'text-success hover:text-success-hover'
    },
    warning: {
      card: 'bg-surface border-warning/30 border-l-4 border-l-warning shadow-xl shadow-warning/10',
      iconBox: 'bg-warning-tint border border-warning/30 text-warning',
      title: 'text-text-primary',
      message: 'text-text-secondary',
      closeBtn: 'text-text-muted hover:text-text-primary hover:bg-surface-muted',
      action: 'text-warning hover:text-warning-hover'
    },
    error: {
      card: 'bg-surface border-danger/30 border-l-4 border-l-danger shadow-xl shadow-danger/10',
      iconBox: 'bg-danger-tint border border-danger/30 text-danger',
      title: 'text-text-primary',
      message: 'text-text-secondary',
      closeBtn: 'text-text-muted hover:text-text-primary hover:bg-surface-muted',
      action: 'text-danger hover:text-danger-hover'
    }
  };

  const style = THEME_STYLES[type] || THEME_STYLES.info;

  const ICONS = {
    success: <CheckCircle2 className="w-4.5 h-4.5" />,
    error: <AlertCircle className="w-4.5 h-4.5" />,
    warning: <AlertTriangle className="w-4.5 h-4.5" />,
    info: <Info className="w-4.5 h-4.5" />
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex items-start gap-3 p-3.5 border rounded-xl shadow-xl animate-toast-in text-left transition-all max-w-sm w-full ${style.card}`}
    >
      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${style.iconBox}`}>
        {ICONS[type] || ICONS.info}
      </div>
      <div className="flex-1 min-w-0 pr-1">
        {toast.title && (
          <h4 className={`text-[13px] font-bold leading-tight tracking-tight ${style.title}`}>
            {toast.title}
          </h4>
        )}
        {toast.message && (
          <p className={`text-xs mt-1 leading-relaxed font-medium ${style.message}`}>
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
            className={`mt-2 text-xs font-semibold underline cursor-pointer transition-colors ${style.action}`}
          >
            {toast.action.label || 'Undo'}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss toast"
        className={`p-1 cursor-pointer rounded-lg transition-colors shrink-0 ${style.closeBtn}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

const fallbackToast = {
  showToast: () => {},
  show: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {}
};

export function useToast() {
  const context = useContext(ToastContext);
  return context || fallbackToast;
}

export default ToastProvider;
