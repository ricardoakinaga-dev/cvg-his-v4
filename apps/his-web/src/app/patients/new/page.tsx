'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /patients/new route - Redirects to /patients with create modal
 * This route is documented in PHASE1_DONE.md as "Formulário completo para novo paciente"
 */
export default function NewPatientPage() {
    const router = useRouter();
    
    useEffect(() => {
        router.replace('/patients?create=true');
    }, [router]);
    
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <p>Redirecionando para criação de paciente...</p>
        </div>
    );
}
