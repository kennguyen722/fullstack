import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

export type ToastKind = 'success' | 'error' | 'info';
export interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
  timeout?: number;
}

type ToastContextValue = {
  showToast: (text: string, kind?: ToastKind, timeoutMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => setItems(prev => prev.filter(t => t.id !== id)), []);

  const showToast = useCallback((text: string, kind: ToastKind = 'info', timeoutMs = 3000) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const item: ToastItem = { id, kind, text, timeout: timeoutMs };
    setItems(prev => [...prev, item]);
    if (timeoutMs && timeoutMs > 0) {
      setTimeout(() => remove(id), timeoutMs);
    }
  }, [remove]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {items.map(t => (
          <div key={t.id} className={`toast-item toast-${t.kind}`}>
            <div className="toast-body">{t.text}</div>
            <button className="toast-close" aria-label="Dismiss" onClick={() => remove(t.id)}>✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
