'use client';

import { ReactNode, KeyboardEvent, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { theme, px } from '@/lib/theme';
import { EncounterTabKey, EncounterTabKeys } from '../types';

interface EncounterTabsProps {
    tabs: Record<EncounterTabKey, {
        label: string;
        content: ReactNode;
    }>;
}

export function EncounterTabs({ tabs }: EncounterTabsProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Get current tab from URL or default to 'soap'
    const currentTab = (searchParams.get('tab') as EncounterTabKey) || 'soap';

    // Ensure currentTab is valid, fallback to soap if not
    const activeTab = EncounterTabKeys.includes(currentTab) ? currentTab : 'soap';

    const tabListRef = useRef<HTMLDivElement>(null);

    const handleTabChange = (tab: EncounterTabKey) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, tab: EncounterTabKey) => {
        const currentIndex = EncounterTabKeys.indexOf(tab);
        let nextIndex = currentIndex;

        if (e.key === 'ArrowRight') {
            nextIndex = (currentIndex + 1) % EncounterTabKeys.length;
        } else if (e.key === 'ArrowLeft') {
            nextIndex = (currentIndex - 1 + EncounterTabKeys.length) % EncounterTabKeys.length;
        } else if (e.key === 'Home') {
            nextIndex = 0;
        } else if (e.key === 'End') {
            nextIndex = EncounterTabKeys.length - 1;
        }

        if (nextIndex !== currentIndex) {
            e.preventDefault();
            const nextTab = EncounterTabKeys[nextIndex];
            handleTabChange(nextTab);
            // Focus logic would require refs array, keeping it simple for now as URL update triggers re-render
            // Ideally we focus the button after re-render but with Next.js navigation it might be tricky without effect
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: px(16) }}>
            <div
                ref={tabListRef}
                role="tablist"
                aria-label="Seções do Prontuário"
                style={{
                    display: 'flex',
                    gap: px(8),
                    borderBottom: `1px solid ${theme.colors.border}`,
                    paddingBottom: px(8),
                    overflowX: 'auto'
                }}
            >
                {EncounterTabKeys.map(key => {
                    const isActive = activeTab === key;
                    const tab = tabs[key];

                    return (
                        <button
                            key={key}
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`panel-${key}`}
                            id={`tab-${key}`}
                            tabIndex={isActive ? 0 : -1}
                            onClick={() => handleTabChange(key)}
                            onKeyDown={(e) => handleKeyDown(e, key)}
                            style={{
                                padding: `${px(8)} ${px(16)}`,
                                background: 'transparent',
                                border: 'none',
                                borderBottom: isActive ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
                                color: isActive ? theme.colors.primary : theme.colors.textSecondary,
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: px(14),
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div
                role="tabpanel"
                id={`panel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
                tabIndex={0}
            >
                {tabs[activeTab].content}
            </div>
        </div>
    );
}
