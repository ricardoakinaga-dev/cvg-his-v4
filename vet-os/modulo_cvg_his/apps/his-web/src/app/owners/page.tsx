'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /owners route - Redirects to /clients
 * This route is documented in PHASE1_DONE.md as "Listagem de tutores"
 * The implementation uses /clients for consistency with the codebase.
 */
export default function OwnersPage() {
    const router = useRouter();
    
    useEffect(() => {
        router.replace('/clients');
    }, [router]);
    
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <p>Redirecionando para Clientes...</p>
        </div>
    );
}
