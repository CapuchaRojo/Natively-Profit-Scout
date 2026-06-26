import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';

// ─── Types ─────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

// ─── Context ────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success', duration = 3500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 100,
        display: 'flex', flexDirection: 'column', gap: 8,
        maxWidth: 400,
      }}>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Toast Item ──────────────────────────────────────────────────
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const colors = {
    success: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', icon: '✅', text: '#10b981' },
    error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', icon: '❌', text: '#ef4444' },
    info: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)', icon: 'ℹ️', text: '#3b82f6' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', icon: '⚠️', text: '#f59e0b' },
  };

  const c = colors[toast.type];

  return (
    <div style={{
      background: '#1a2236',
      border: `1px solid ${c.border}`,
      borderRadius: 8,
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      opacity: exiting ? 0 : 1,
      transform: exiting ? 'translateX(20px)' : 'translateX(0)',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      fontSize: 13,
      color: '#e2e8f0',
      pointerEvents: 'auto',
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{c.icon}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => { setExiting(true); setTimeout(() => onRemove(toast.id), 300); }}
        style={{
          background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
          fontSize: 14, padding: '2px 4px', flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ─── Hook for easy copy-to-clipboard with toast ────────────────
export function useCopyWithToast() {
  const { showToast } = useToast();

  const copyToClipboard = useCallback(async (text: string, label = 'Content') => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`✅ ${label} copied to clipboard`, 'success');
      return true;
    } catch {
      // Fallback
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(`✅ ${label} copied to clipboard`, 'success');
        return true;
      } catch {
        showToast(`❌ Failed to copy ${label}`, 'error');
        return false;
      }
    }
  }, [showToast]);

  return { copyToClipboard };
}
