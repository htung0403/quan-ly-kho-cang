import { cn } from '@/lib/utils';
import { Bell, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
    onMenuClick?: () => void;
    title?: string;
    className?: string;
}

export function Header({ onMenuClick, title, className }: HeaderProps) {
    const { user } = useAuth();

    return (
        <header
            className={cn(
                'h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30',
                className
            )}
        >
            <div className="flex items-center gap-4">
                {onMenuClick && (
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                )}
                {title && (
                    <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
                )}
            </div>

            <div className="flex items-center gap-4">
                {/* Search
                <div className="hidden md:flex items-center">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            className="w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div> */}

                {/* Notifications */}
                <button className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"></span>
                </button>

                {/* User avatar (mobile) */}
                {user && (
                    <div className="lg:hidden w-8 h-8 bg-gradient-to-br from-accent-500 to-accent-700 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">
                            {user.full_name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
            </div>
        </header>
    );
}
