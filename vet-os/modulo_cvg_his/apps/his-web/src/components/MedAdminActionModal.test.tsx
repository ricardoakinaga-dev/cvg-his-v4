import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MedAdminActionModal } from './MedAdminActionModal';
import React from 'react';

describe('<MedAdminActionModal />', () => {
    const mockOnSubmit = vi.fn();
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('requires identity confirmation before enabling submit button', async () => {
        render(
            <MedAdminActionModal
                open={true}
                action="administered"
                patientName="Rex"
                bedName="Leito 01"
                medicationName="Dipirona"
                dose="1 mg"
                route="IV"
                submitting={false}
                errorMessage={null}
                onClose={mockOnClose}
                onSubmit={mockOnSubmit}
            />
        );

        // Submit should be disabled initially
        const submitBtn = screen.getByRole('button', { name: /confirmar/i });
        expect(submitBtn).toBeDisabled();

        // Check the checkbox
        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);

        // Submit should now be enabled
        expect(submitBtn).not.toBeDisabled();

        // Submit the form
        fireEvent.click(submitBtn);
        expect(mockOnSubmit).toHaveBeenCalledWith({ status: 'administered', delayedUntil: undefined, reason: undefined });
    });
});
