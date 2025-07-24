"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type = 'info', duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-900/90 border-green-500/50',
    error: 'bg-red-900/90 border-red-500/50',
    info: 'bg-blue-900/90 border-blue-500/50'
  }[type];

  const textColor = {
    success: 'text-green-100',
    error: 'text-red-100',
    info: 'text-blue-100'
  }[type];

  const icon = {
    success: (
      <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }[type];

  if (!isMounted) return null;

  return createPortal(
    <div
      className={`fixed top-6 right-6 z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className={`flex items-center px-6 py-4 rounded-lg shadow-2xl border backdrop-blur-sm ${bgColor} ${textColor}`}>
        {icon}
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>,
    document.body
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = (props: ToastProps) => {
    setToasts(prev => [...prev, { ...props, id: Date.now() } as ToastProps & { id: number }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter((toast: any) => toast.id !== id));
  };

  return { toasts, showToast, removeToast };
}