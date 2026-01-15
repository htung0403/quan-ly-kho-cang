import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'hover' | 'glass';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        const variants = {
            default: 'card',
            hover: 'card-hover',
            glass: 'glass rounded-xl',
        };

        return <div ref={ref} className={cn(variants[variant], className)} {...props} />;
    }
);

Card.displayName = 'Card';

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> { }

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('px-6 py-4 border-b border-slate-100', className)} {...props} />
    )
);

CardHeader.displayName = 'CardHeader';

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> { }

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
    ({ className, ...props }, ref) => (
        <h3 ref={ref} className={cn('text-lg font-semibold text-slate-900', className)} {...props} />
    )
);

CardTitle.displayName = 'CardTitle';

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> { }

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
    ({ className, ...props }, ref) => (
        <p ref={ref} className={cn('text-sm text-slate-500 mt-1', className)} {...props} />
    )
);

CardDescription.displayName = 'CardDescription';

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> { }

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('px-6 py-4', className)} {...props} />
    )
);

CardContent.displayName = 'CardContent';

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> { }

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('px-6 py-4 border-t border-slate-100', className)} {...props} />
    )
);

CardFooter.displayName = 'CardFooter';

// Stats Card Component
interface StatsCardProps {
    title: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon?: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    className?: string;
}

function StatsCard({
    title,
    value,
    change,
    changeLabel,
    icon,
    trend = 'neutral',
    className,
}: StatsCardProps) {
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const trendColor = trend === 'up' ? 'text-success-600' : trend === 'down' ? 'text-danger-600' : 'text-slate-500';

    return (
        <Card className={cn('stats-card', className)}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <p className="stats-value mt-2">{value}</p>
                </div>
                {icon && (
                    <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                        {icon}
                    </div>
                )}
            </div>
            {change !== undefined && (
                <div className={cn('stats-change', trendColor)}>
                    <TrendIcon className="w-4 h-4" />
                    <span className="font-medium">{change > 0 ? '+' : ''}{change}%</span>
                    {changeLabel && <span className="text-slate-500 ml-1">{changeLabel}</span>}
                </div>
            )}
        </Card>
    );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, StatsCard };
export type { CardProps, StatsCardProps };
