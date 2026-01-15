import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
    LayoutDashboard,
    Package,
    FolderKanban,
    Warehouse,
    Truck,
    FileInput,
    FileOutput,
    BarChart3,
    Users,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Building2,
} from 'lucide-react';

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
    onItemClick?: () => void;
}

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    permission?: string;
    children?: NavItem[];
}

const navItems: NavItem[] = [
    {
        label: 'Dashboard',
        href: '/dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
        label: 'Dự án',
        href: '/projects',
        icon: <FolderKanban className="w-5 h-5" />,
    },
    {
        label: 'Hàng hóa',
        href: '/materials',
        icon: <Package className="w-5 h-5" />,
    },
    {
        label: 'Kho',
        href: '/warehouses',
        icon: <Warehouse className="w-5 h-5" />,
    },
    {
        label: 'Đội xe',
        href: '/vehicles',
        icon: <Truck className="w-5 h-5" />,
    },
    {
        label: 'Nhập mua',
        href: '/purchases',
        icon: <FileInput className="w-5 h-5" />,
    },
    {
        label: 'Xuất bán',
        href: '/exports',
        icon: <FileOutput className="w-5 h-5" />,
    },
    {
        label: 'Báo cáo',
        href: '/reports',
        icon: <BarChart3 className="w-5 h-5" />,
    },
];

const adminItems: NavItem[] = [
    {
        label: 'Người dùng',
        href: '/users',
        icon: <Users className="w-5 h-5" />,
        permission: 'users:read',
    },
    {
        label: 'Cài đặt',
        href: '/settings',
        icon: <Settings className="w-5 h-5" />,
        permission: 'settings:read',
    },
];

export function Sidebar({ isCollapsed, onToggle, onItemClick }: SidebarProps) {
    const location = useLocation();
    const { user, logout, hasPermission } = useAuth();
    const [companyLogo, setCompanyLogo] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await api.settings.get() as any;
                if (settings.success) {
                    if (settings.data.logoUrl) {
                        setCompanyLogo(settings.data.logoUrl);
                    }
                    if (settings.data.companyName) {
                        setCompanyName(settings.data.companyName);
                    }
                }
            } catch (error) {
                console.error('Failed to load settings in sidebar', error);
            }
        };

        fetchSettings();

        // Listen for settings update event
        const handleSettingsUpdate = () => {
            fetchSettings();
        };
        window.addEventListener('settings-updated', handleSettingsUpdate);

        return () => {
            window.removeEventListener('settings-updated', handleSettingsUpdate);
        };
    }, []);

    const isActive = (href: string) => {
        return location.pathname === href || location.pathname.startsWith(href + '/');
    };

    const filteredAdminItems = adminItems.filter(
        (item) => !item.permission || hasPermission(item.permission)
    );

    return (
        <aside
            className={cn(
                'fixed left-0 top-0 h-full bg-slate-900 text-white z-40 transition-all duration-300 flex flex-col',
                isCollapsed ? 'w-[72px]' : 'w-64'
            )}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 min-h-16 py-3 border-b border-slate-800">
                {companyLogo ? (
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white p-1">
                        <img src={companyLogo} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                )}
                {!isCollapsed && (
                    <div className="overflow-hidden">
                        <h1 className="font-bold text-sm leading-tight" title={companyName || 'EBH System'}>
                            {companyName || 'EBH System'}
                        </h1>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
                <div className="px-3 mb-2">
                    {!isCollapsed && (
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
                            Menu chính
                        </p>
                    )}
                    <ul className="space-y-1">
                        {navItems.map((item) => (
                            <li key={item.href}>
                                <NavLink
                                    to={item.href}
                                    onClick={onItemClick}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                                        isActive(item.href)
                                            ? 'bg-primary-600 text-white'
                                            : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                                        isCollapsed && 'justify-center'
                                    )}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    {item.icon}
                                    {!isCollapsed && <span className="font-medium">{item.label}</span>}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>

                {filteredAdminItems.length > 0 && (
                    <div className="px-3 mt-6">
                        {!isCollapsed && (
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
                                Quản trị
                            </p>
                        )}
                        <ul className="space-y-1">
                            {filteredAdminItems.map((item) => (
                                <li key={item.href}>
                                    <NavLink
                                        to={item.href}
                                        onClick={onItemClick}
                                        className={cn(
                                            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                                            isActive(item.href)
                                                ? 'bg-primary-600 text-white'
                                                : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                                            isCollapsed && 'justify-center'
                                        )}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        {item.icon}
                                        {!isCollapsed && <span className="font-medium">{item.label}</span>}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </nav>

            {/* User section */}
            <div className="border-t border-slate-800 p-3">
                {user && !isCollapsed && (
                    <div className="flex items-center gap-3 px-3 py-2 mb-2">
                        {user.img_url ? (
                            <img
                                src={user.img_url}
                                alt={user.full_name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-slate-700"
                            />
                        ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-700 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-transparent">
                                <span className="text-sm font-bold text-white">
                                    {user.full_name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
                            <p className="text-xs text-slate-400 truncate">{user.role.name}</p>
                        </div>
                    </div>
                )}
                <button
                    onClick={logout}
                    className={cn(
                        'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer',
                        isCollapsed && 'justify-center'
                    )}
                    title={isCollapsed ? 'Đăng xuất' : undefined}
                >
                    <LogOut className="w-5 h-5" />
                    {!isCollapsed && <span className="font-medium">Đăng xuất</span>}
                </button>
            </div>

            {/* Toggle button */}
            <button
                onClick={onToggle}
                className="absolute -right-3 top-20 w-6 h-6 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
                {isCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                ) : (
                    <ChevronLeft className="w-4 h-4" />
                )}
            </button>
        </aside>
    );
}
