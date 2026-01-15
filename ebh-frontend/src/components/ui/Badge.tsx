import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'slate';
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant = 'slate', ...props }, ref) => {
        const variants = {
            primary: 'badge-primary',
            success: 'badge-success',
            warning: 'badge-warning',
            danger: 'badge-danger',
            slate: 'badge-slate',
        };

        return <span ref={ref} className={cn(variants[variant], className)} {...props} />;
    }
);

Badge.displayName = 'Badge';

export { Badge };
export type { BadgeProps };
