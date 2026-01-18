import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
    key: string;
    header: string;
    cell?: (item: T, index: number) => React.ReactNode;
    className?: string;
    sortable?: boolean;
}

interface TableProps<T> {
    data: T[];
    columns: Column<T>[];
    onRowClick?: (item: T) => void;
    isLoading?: boolean;
    emptyMessage?: string;
    className?: string;
    renderExpandedRow?: (item: T) => React.ReactNode;
    isRowExpanded?: (item: T) => boolean;
}

function Table<T extends Record<string, unknown>>({
    data,
    columns,
    onRowClick,
    isLoading = false,
    emptyMessage = 'Không có dữ liệu',
    className,
    renderExpandedRow,
    isRowExpanded
}: TableProps<T>) {
    if (isLoading) {
        return (
            <div className={cn('table-container', className)}>
                <div className="flex items-center justify-center py-12">
                    <div className="spinner" />
                    <span className="ml-3 text-slate-500">Đang tải...</span>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className={cn('table-container', className)}>
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <svg
                        className="w-12 h-12 mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                    <p className="text-sm">{emptyMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('table-container overflow-x-auto', className)}>
            <table className="table">
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column.key} className={column.className}>
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, index) => {
                        const expanded = isRowExpanded?.(item);
                        return (
                            <React.Fragment key={index}>
                                <tr
                                    onClick={() => onRowClick?.(item)}
                                    className={cn(
                                        onRowClick ? 'cursor-pointer' : '',
                                        expanded ? 'bg-slate-50' : ''
                                    )}
                                >
                                    {columns.map((column) => (
                                        <td key={column.key} className={column.className}>
                                            {column.cell
                                                ? column.cell(item, index)
                                                : (item[column.key] as React.ReactNode)}
                                        </td>
                                    ))}
                                </tr>
                                {expanded && renderExpandedRow && (
                                    <tr className="bg-slate-50/50">
                                        <td colSpan={columns.length} className="p-0 border-t-0">
                                            <div className="animate-in slide-in-from-top-2 duration-200">
                                                {renderExpandedRow(item)}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}

function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
    const pages = [];
    const showPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
    const endPage = Math.min(totalPages, startPage + showPages - 1);

    if (endPage - startPage + 1 < showPages) {
        startPage = Math.max(1, endPage - showPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
        <div className={cn('flex items-center justify-center gap-1', className)}>
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn btn-ghost btn-sm disabled:opacity-50 cursor-pointer"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

            {startPage > 1 && (
                <>
                    <button
                        onClick={() => onPageChange(1)}
                        className="btn btn-ghost btn-sm cursor-pointer"
                    >
                        1
                    </button>
                    {startPage > 2 && <span className="px-2 text-slate-400">...</span>}
                </>
            )}

            {pages.map((page) => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={cn(
                        'btn btn-sm cursor-pointer',
                        page === currentPage ? 'btn-primary' : 'btn-ghost'
                    )}
                >
                    {page}
                </button>
            ))}

            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <span className="px-2 text-slate-400">...</span>}
                    <button
                        onClick={() => onPageChange(totalPages)}
                        className="btn btn-ghost btn-sm cursor-pointer"
                    >
                        {totalPages}
                    </button>
                </>
            )}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="btn btn-ghost btn-sm disabled:opacity-50 cursor-pointer"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}

export { Table, Pagination };
export type { Column, TableProps, PaginationProps };
