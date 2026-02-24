'use client';

import { TransferModal } from '../../components/TransferModal';
import { DischargeModal } from '../../components/DischargeModal';

// Re-exporting directly as they are already compatible
// We might create specific wrappers if we wanted to pre-inject generic props, 
// but for now direct content is fine as per plan "Wrapper/Adaptation".
// Since we are importing them in the Page, we can just use them there.
// However, to strictly follow "src/features/inpatient/StayTransferModal.tsx" file creation:

export const StayTransferModal = TransferModal;
export const StayDischargeModal = DischargeModal;
