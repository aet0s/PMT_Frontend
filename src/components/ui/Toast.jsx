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
      card: 'bg-[#EFF6FF] border-[#BFDBFE] border-l-4 border-l-[#2563EB] shadow-xl shadow-blue-500/15',
      iconBox: 'bg-[#DBEAFE] border-[#BFDBFE] text-[#2563EB]',
      title: 'text-[#1E3A8A]',
      message: 'text-[#1E40AF]',
      closeBtn: 'text-[#60A5FA] hover:text-[#1E3A8A] hover:bg-[#DBEAFE]',
      action: 'text-[#2563EB] hover:text-[#1D4ED8]'
    },
    success: {
      card: 'bg-[#F0FDF4] border-[#BBF7D0] border-l-4 border-l-[#16A34A] shadow-xl shadow-emerald-500/15',
      iconBox: 'bg-[#DCFCE7] border-[#BBF7D0] text-[#16A34A]',
      title: 'text-[#14532D]',
      message: 'text-[#166534]',
      closeBtn: 'text-[#4ADE80] hover:text-[#14532D] hover:bg-[#DCFCE7]',
      action: 'text-[#16A34A] hover:text-[#15803D]'
    },
    warning: {
      card: 'bg-[#FFFBEB] border-[#FDE68A] border-l-4 border-l-[#D97706] shadow-xl shadow-amber-500/15',
      iconBox: 'bg-[#FEF3C7] border-[#FDE68A] text-[#D97706]',
      title: 'text-[#78350F]',
      message: 'text-[#92400E]',
      closeBtn: 'text-[#FBBF24] hover:text-[#78350F] hover:bg-[#FEF3C7]',
      action: 'text-[#D97706] hover:text-[#B45309]'
    },
    error: {
      card: 'bg-[#FEF2F2] border-[#FECACA] border-l-4 border-l-[#DC2626] shadow-xl shadow-rose-500/15',
      iconBox: 'bg-[#FEE2E2] border-[#FECACA] text-[#DC2626]',
      title: 'text-[#7F1D1D]',
      message: 'text-[#991B1B]',
      closeBtn: 'text-[#F87171] hover:text-[#7F1D1D] hover:bg-[#FEE2E2]',
      action: 'text-[#DC2626] hover:text-[#B91C1C]'
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
      className={`pointer-events-auto flex items-start gap-3 p-3.5 border rounded-xl shadow-xl backdrop-blur-md animate-toast-in text-left transition-all max-w-sm w-full ${style.card}`}
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
