'use client';

import { ReactNode } from 'react';
import { usePermission } from '../../lib/rbac';

interface CanProps {
    permission: string;
    children: ReactNode;
    fallback?: ReactNode;
}

export function Can({ permission, children, fallback = null }: CanProps) {
    const allowed = usePermission(permission);

    if (allowed) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}
