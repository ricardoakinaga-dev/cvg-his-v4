'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { theme, px, cardStyle } from '../../lib/theme';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
    const [mounted, setMounted] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Escape key listener
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Focus trap (Basic)
    useEffect(() => {
        if (isOpen && contentRef.current) {
            contentRef.current.focus();
        }
    }, [isOpen]);

    if (!mounted || !isOpen) return null;

    const getWidth = () => {
        switch (size) {
            case 'sm': return 400;
            case 'md': return 560;
            case 'lg': return 800;
            case 'xl': return 1100;
        }
    };

    const modal = (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(4px)',
                zIndex: 50,
                display: 'grid',
                placeItems: 'center',
                padding: px(16),
                animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}} />
            <div
                ref={contentRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
                style={cardStyle({
                    width: '100%',
                    maxWidth: px(getWidth()),
                    padding: 0,
                    background: theme.colors.surface,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    outline: 'none',
                    animation: 'slideUp 0.3s ease-out',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column'
                })}
            >
                {title && (
                    <div
                        style={{
                            padding: `${px(20)} ${px(24)}`,
                            borderBottom: `1px solid ${theme.colors.border}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <h3 id="modal-title" style={{ margin: 0, fontSize: px(18), fontWeight: 600 }}>
                            {title}
                        </h3>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                fontSize: px(24),
                                color: theme.colors.textSecondary,
                                cursor: 'pointer',
                                lineHeight: 1
                            }}
                            aria-label="Close"
                        >
                            ×
                        </button>
                    </div>
                )}

                <div style={{ padding: p(24), overflowY: 'auto' }}>
                    {children}
                </div>

                {footer && (
                    <div
                        style={{
                            padding: `${px(16)} ${px(24)}`,
                            borderTop: `1px solid ${theme.colors.border}`,
                            background: '#f8fafc',
                            borderBottomLeftRadius: px(theme.radius.md),
                            borderBottomRightRadius: px(theme.radius.md),
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: px(12)
                        }}
                    >
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}

// Helper for consistency in padding
function p(n: number) { return px(n); }
