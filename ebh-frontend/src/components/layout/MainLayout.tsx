import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
                <Sidebar
                    isCollapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <div
                className={cn(
                    'fixed left-0 top-0 h-full z-40 lg:hidden transition-transform duration-300',
                    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <Sidebar
                    isCollapsed={false}
                    onToggle={() => setMobileMenuOpen(false)}
                    onItemClick={() => setMobileMenuOpen(false)}
                />
            </div>

            {/* Main content */}
            <div
                className={cn(
                    'min-h-screen transition-all duration-300',
                    sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
                )}
            >
                <Header onMenuClick={() => setMobileMenuOpen(true)} />
                <main className="p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
