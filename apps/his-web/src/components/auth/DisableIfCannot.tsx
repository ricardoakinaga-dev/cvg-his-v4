import { ReactElement, cloneElement } from 'react';
import { usePermission } from '../../lib/rbac';

interface DisableIfCannotProps {
    permission: string;
    children: ReactElement;
    disabledTooltip?: string; // Future improvement: show tooltip on hover
}

export function DisableIfCannot({ permission, children }: DisableIfCannotProps) {
    const allowed = usePermission(permission);

    if (allowed) {
        return children;
    }

    // If not allowed, clone and force disabled prop
    // This assumes the child component accepts a `disabled` prop (like Button, Input)
    return cloneElement(children, {
        disabled: true,
        'aria-disabled': true,
        style: { ...children.props.style, opacity: 0.5, cursor: 'not-allowed' },
        title: 'Você não tem permissão para realizar esta ação.'
    });
}
