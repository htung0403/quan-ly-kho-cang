import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Convert tons to cubic meters based on density
 * m³ = Tấn / Tỷ trọng
 */
export function tonsToCubicMeters(tons: number, density: number): number {
    if (density <= 0) return 0;
    return Number((tons / density).toFixed(3));
}

/**
 * Convert cubic meters to tons based on density
 * Tấn = m³ * Tỷ trọng
 */
export function cubicMetersToTons(m3: number, density: number): number {
    return Number((m3 * density).toFixed(3));
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number, decimals: number = 2): string {
    return new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
}

/**
 * Format currency in VND
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(value);
}

/**
 * Format date to Vietnamese locale
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    };
    return new Intl.DateTimeFormat('vi-VN', options || defaultOptions).format(new Date(date));
}

/**
 * Format datetime to Vietnamese locale
 */
export function formatDateTime(date: string | Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));
}

/**
 * Generate receipt number
 */
export function generateReceiptNumber(prefix: string = 'PN'): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${year}${month}${day}${random}`;
}

/**
 * Get status color class
 */
export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        // Project status
        planning: 'badge-slate',
        active: 'badge-success',
        on_hold: 'badge-warning',
        completed: 'badge-primary',
        cancelled: 'badge-danger',
        // Vehicle status
        available: 'badge-success',
        in_transit: 'badge-primary',
        maintenance: 'badge-warning',
        inactive: 'badge-slate',
    };
    return colors[status] || 'badge-slate';
}

/**
 * Get status label in Vietnamese
 */
export function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        // Project status
        planning: 'Đang lập kế hoạch',
        active: 'Đang triển khai',
        on_hold: 'Tạm dừng',
        completed: 'Hoàn thành',
        cancelled: 'Đã hủy',
        // Vehicle status
        available: 'Sẵn sàng',
        in_transit: 'Đang vận chuyển',
        maintenance: 'Bảo trì',
        inactive: 'Không hoạt động',
    };
    return labels[status] || status;
}

/**
 * Get role label in Vietnamese
 */
export function getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
        admin: 'Quản trị viên',
        accountant: 'Kế toán',
        warehouse: 'Thủ kho',
        logistics: 'Vận tải',
        field_worker: 'Nhân viên hiện trường',
    };
    return labels[role] || role;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}

/**
 * Check if user has permission
 */
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission) || userPermissions.includes('*');
}

/**
 * Calculate profit margin percentage
 */
export function calculateProfitMargin(revenue: number, cost: number): number {
    if (revenue === 0) return 0;
    return Number((((revenue - cost) / revenue) * 100).toFixed(2));
}

/**
 * Download data as CSV
 */
export function downloadCSV(data: Record<string, unknown>[], filename: string): void {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header];
            const stringValue = String(value ?? '');
            // Escape quotes and wrap in quotes if contains comma
            if (stringValue.includes(',') || stringValue.includes('"')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        }).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

/**
 * Local storage helpers
 */
export const storage = {
    get<T>(key: string): T | null {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch {
            return null;
        }
    },
    set(key: string, value: unknown): void {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            console.error('Failed to save to localStorage');
        }
    },
    remove(key: string): void {
        localStorage.removeItem(key);
    },
};
