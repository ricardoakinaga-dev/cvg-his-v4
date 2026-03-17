'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /owners/new route - Redirects to /clients with create modal
 * This route is documented in PHASE1_DONE.md as "Formulário completo para novo tutor"
 */
export default function NewOwnerPage() {
    const router = useRouter();
    
    useEffect(() => {
        router.replace('/clients?create=true');
    }, [router]);
    
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <p>Redirecionando para criação de cliente...</p>
        </div>
    );
}
