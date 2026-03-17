import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Can } from './Can';
import * as rbac from '../../lib/rbac';
import React from 'react';

// Mock usePermission hook
vi.mock('../../lib/rbac', async () => {
    const actual = await vi.importActual('../../lib/rbac');
    return {
        ...actual,
        usePermission: vi.fn(),
        PERMISSIONS: {
            TEST_READ: 'test.read'
        }
    };
});

describe('<Can />', () => {
    it('should render children when permission is granted', () => {
        vi.mocked(rbac.usePermission).mockReturnValue(true);

        render(
            <Can permission="test.read">
                <div data-testid="child">Visible</div>
            </Can>
        );

        expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should render fallback when permission is denied', () => {
        vi.mocked(rbac.usePermission).mockReturnValue(false);

        render(
            <Can permission="test.read" fallback={<div data-testid="fallback">Denied</div>}>
                <div data-testid="child">Visible</div>
            </Can>
        );

        expect(screen.queryByTestId('child')).not.toBeInTheDocument();
        expect(screen.getByTestId('fallback')).toBeInTheDocument();
    });

    it('should render nothing when denied and no fallback', () => {
        vi.mocked(rbac.usePermission).mockReturnValue(false);
        const { container } = render(
            <Can permission="test.read">
                <div data-testid="child">Visible</div>
            </Can>
        );
        expect(container).toBeEmptyDOMElement();
    });
});
