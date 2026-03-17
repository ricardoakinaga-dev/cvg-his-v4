'use client';

import { CSSProperties, ReactNode } from 'react';
import { theme, px, row, col } from '../../lib/theme';

interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: ReactNode;
    breadcrumbs?: Array<{ label: string; href?: string }>;
    style?: CSSProperties;
}

/**
 * PageHeader - Standardized page header component
 * 
 * Usage:
 * - Use at the top of every list/detail page
 * - Provides consistent title, description, and action placement
 * 
 * Accessibility:
 * - Uses semantic h1 for page title
 * - Includes aria-label for actions container
 */
export function PageHeader({ 
    title, 
    description, 
    actions, 
    breadcrumbs,
    style 
}: PageHeaderProps) {
    return (
        <div style={{ ...col(8), ...style }}>
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav aria-label="Breadcrumb" style={{ ...row(8), fontSize: px(13) }}>
                    {breadcrumbs.map((crumb, i) => (
                        <span key={i} style={row(8)}>
                            {i > 0 && (
                                <span style={{ color: theme.colors.textSecondary }}>/</span>
                            )}
                            {crumb.href ? (
                                <a 
                                    href={crumb.href}
                                    style={{ 
                                        color: theme.colors.textSecondary,
                                        textDecoration: 'none'
                                    }}
                                >
                                    {crumb.label}
                                </a>
                            ) : (
                                <span style={{ color: theme.colors.textPrimary }}>
                                    {crumb.label}
                                </span>
                            )}
                        </span>
                    ))}
                </nav>
            )}
            <div style={{ ...row(16), justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={col(4)}>
                    <h1 style={{
                        fontSize: px(24),
                        fontWeight: 600,
                        color: theme.colors.textPrimary,
                        margin: 0
                    }}>
                        {title}
                    </h1>
                    {description && (
                        <p style={{
                            fontSize: px(14),
                            color: theme.colors.textSecondary,
                            margin: 0
                        }}>
                            {description}
                        </p>
                    )}
                </div>
                {actions && (
                    <div 
                        role="group" 
                        aria-label="Ações da página"
                        style={row(8)}
                    >
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * ListPageLayout - Standardized layout for list pages
 * 
 * Provides consistent structure:
 * - Page header with title and actions
 * - Search/filter section
 * - Content area with loading/empty/error states
 * - Pagination
 */
interface ListPageLayoutProps {
    children: ReactNode;
    style?: CSSProperties;
}

export function ListPageLayout({ children, style }: ListPageLayoutProps) {
    return (
        <div 
            style={{ 
                padding: px(24), 
                display: 'flex', 
                flexDirection: 'column', 
                gap: px(24),
                minHeight: '100%',
                ...style 
            }}
        >
            {children}
        </div>
    );
}

/**
 * SearchFilterSection - Container for search and filter controls
 */
interface SearchFilterSectionProps {
    children: ReactNode;
    style?: CSSProperties;
}

export function SearchFilterSection({ children, style }: SearchFilterSectionProps) {
    return (
        <div 
            style={{
                ...row(16),
                flexWrap: 'wrap',
                ...style
            }}
        >
            {children}
        </div>
    );
}

/**
 * ContentSection - Main content area with consistent styling
 */
interface ContentSectionProps {
    children: ReactNode;
    style?: CSSProperties;
}

export function ContentSection({ children, style }: ContentSectionProps) {
    return (
        <div 
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: px(16),
                ...style
            }}
        >
            {children}
        </div>
    );
}

/**
 * Pagination - Standardized pagination component
 */
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    style?: CSSProperties;
}

export function Pagination({ 
    currentPage, 
    totalPages, 
    onPageChange,
    style 
}: PaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <nav 
            aria-label="Navegação de páginas"
            style={{
                ...row(8, 'center'),
                justifyContent: 'center',
                marginTop: px(16),
                ...style
            }}
        >
            <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                aria-label="Página anterior"
                style={{
                    padding: `${px(8)} ${px(16)}`,
                    borderRadius: px(theme.radius.sm),
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: theme.colors.surface,
                    color: currentPage === 1 ? theme.colors.textSecondary : theme.colors.textPrimary,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.6 : 1,
                    fontSize: px(14)
                }}
            >
                Anterior
            </button>
            <span 
                aria-current="page"
                style={{
                    padding: `${px(8)} ${px(16)}`,
                    fontSize: px(14),
                    color: theme.colors.textPrimary
                }}
            >
                Página {currentPage} de {totalPages}
            </span>
            <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                aria-label="Próxima página"
                style={{
                    padding: `${px(8)} ${px(16)}`,
                    borderRadius: px(theme.radius.sm),
                    border: `1px solid ${theme.colors.border}`,
                    backgroundColor: theme.colors.surface,
                    color: currentPage === totalPages ? theme.colors.textSecondary : theme.colors.textPrimary,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.6 : 1,
                    fontSize: px(14)
                }}
            >
                Próxima
            </button>
        </nav>
    );
}
