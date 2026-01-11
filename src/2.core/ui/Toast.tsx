import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'confirm';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  confirm: (message: string, onConfirm: () => void, onCancel?: () => void) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * ToastItem - NS Studio Dark Theme
 * Uses dark-theme-colors.css variables
 */
const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Don't auto-dismiss confirm toasts
    if (toast.type === 'confirm') return;

    const timer = setTimeout(() => {
      handleClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300);
  };

  const handleConfirm = () => {
    toast.onConfirm?.();
    handleClose();
  };

  const handleCancel = () => {
    toast.onCancel?.();
    handleClose();
  };

  const styles = {
    success: 'border-[var(--dark-toast-success-border)] bg-[var(--dark-toast-success-bg)]',
    error: 'border-[var(--dark-toast-error-border)] bg-[var(--dark-toast-error-bg)]',
    info: 'border-[var(--dark-toast-info-border)] bg-[var(--dark-toast-info-bg)]',
    warning: 'border-[var(--dark-toast-warning-border)] bg-[var(--dark-toast-warning-bg)]',
    confirm: 'border-amber-500/30 bg-zinc-900/95',
  };

  const iconStyles = {
    success: 'text-[var(--dark-toast-success-icon)]',
    error: 'text-[var(--dark-toast-error-icon)]',
    info: 'text-[var(--dark-toast-info-icon)]',
    warning: 'text-[var(--dark-toast-warning-icon)]',
    confirm: 'text-amber-500',
  };

  const icons = {
    success: <CheckCircle2 size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />,
    warning: <AlertTriangle size={20} />,
    confirm: <AlertTriangle size={20} />,
  };

  return (
    <div
      className={`
        pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border 
        bg-[var(--dark-toast-bg)] p-4 shadow-[var(--dark-toast-shadow)] backdrop-blur-md 
        transition-all duration-300
        ${isExiting ? 'translate-x-[120%] opacity-0' : 'translate-x-0 opacity-100'}
        ${styles[toast.type]}
      `}
    >
      <div className={`mt-0.5 shrink-0 ${iconStyles[toast.type]}`}>
        {icons[toast.type]}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-[var(--dark-text-main)]">{toast.message}</p>

        {/* Confirm buttons */}
        {toast.type === 'confirm' && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleConfirm}
              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold rounded-lg transition-colors border border-red-500/30"
            >
              Confirmar
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-colors border border-zinc-700"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
      {/* Close button - show for all types */}
      <button
        onClick={handleClose}
        className="shrink-0 rounded-lg p-1 text-[var(--dark-toast-close-text)] hover:bg-[var(--dark-toast-close-hover-bg)] hover:text-[var(--dark-text-main)] transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const addConfirmToast = useCallback((message: string, onConfirm: () => void, onCancel?: () => void) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type: 'confirm', onConfirm, onCancel }]);
  }, []);

  const success = (msg: string) => addToast(msg, 'success');
  const error = (msg: string) => addToast(msg, 'error');
  const info = (msg: string) => addToast(msg, 'info');
  const warning = (msg: string) => addToast(msg, 'warning');
  const confirm = (msg: string, onConfirm: () => void, onCancel?: () => void) => addConfirmToast(msg, onConfirm, onCancel);

  return (
    <ToastContext.Provider value={{ addToast, success, error, info, warning, confirm }}>
      {children}
      {/* Regular toasts - top right */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.filter(t => t.type !== 'confirm').map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
      {/* Confirm toasts - centered with backdrop */}
      {toasts.filter(t => t.type === 'confirm').map((toast) => (
        <div key={toast.id} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <ToastItem toast={toast} onRemove={removeToast} />
        </div>
      ))}
    </ToastContext.Provider>
  );
};
