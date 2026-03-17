'use client';

import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from 'react';
import { theme, px } from '../../lib/theme';
import { Badge } from './Primitives';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, type, message, duration }]);

        setTimeout(() => {
            removeToast(id);
        }, duration);
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div
                style={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    zIndex: 100,
                    pointerEvents: 'none' // allow clicks to pass through
                }}
            >
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
    // Simple accent map
    const accents: Record<ToastType, string> = {
        success: theme.colors.success,
        error: theme.colors.danger,
        info: theme.colors.info
    };

    return (
        <div
            style={{
                background: theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                borderLeft: `4px solid ${accents[toast.type]}`,
                borderRadius: px(theme.radius.sm),
                padding: '12px 16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                minWidth: 300,
                maxWidth: 400,
                pointerEvents: 'auto',
                animation: 'slideInRight 0.3s ease-out'
            }}
        >
            <style dangerouslySetInnerHTML={{ __html: '@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }' }} />

            <span style={{ fontSize: px(14), color: theme.colors.textPrimary, fontWeight: 500 }}>
                {toast.message}
            </span>
            <button
                onClick={onClose}
                style={{
                    background: 'none',
                    border: 'none',
                    marginLeft: 12,
                    cursor: 'pointer',
                    color: theme.colors.textSecondary,
                    fontSize: 16
                }}
            >
                ×
            </button>
        </div>
    );
}
