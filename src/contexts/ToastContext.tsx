"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastProps } from '@/components/ui/Toast';

interface ToastWithId extends ToastProps {
  id: number;
}

interface ToastContextType {
  showToast: (props: ToastProps) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastWithId[]>([]);

  const showToast = useCallback((props: ToastProps) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...props, id }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}