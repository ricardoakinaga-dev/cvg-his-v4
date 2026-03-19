'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/**
 * /owners/[id] route - Redirects to /clients/[id]
 * This route is documented in PHASE1_DONE.md
 */
export default function OwnerDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id;
    
    useEffect(() => {
        router.replace(`/clients/${id}`);
    }, [router, id]);
    
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <p>Redirecionando para Cliente...</p>
        </div>
    );
}
