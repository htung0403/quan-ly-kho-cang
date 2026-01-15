import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Filter, Calendar, User, Building } from 'lucide-react';
import {
    Card,
    CardContent,
    Button,
    Input,
    Table,
    Pagination,
} from '@/components/ui';
import type { Column } from '@/components/ui';
import { formatNumber, formatDate, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export function PurchasesPage() {
    const { error } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);
    const [stats, setStats] = useState({
        count: 0,
        totalTons: 0,
        totalM3: 0,
        totalAmount: 0
    });

    const fetchPurchases = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.purchases.getAll({
                page: currentPage,
                limit: 10,
                search: searchQuery
            }) as any;

            if (res.success) {
                const data = res.data;
                const items = data.items || [];
                setPurchases(items);
                setTotalPages(Math.ceil((data.total || 0) / 10));

                // Calculate stats from visible items
                const currentStats = items.reduce((acc: any, item: any) => ({
                    count: acc.count + 1,
                    totalTons: acc.totalTons + (Number(item.total_quantity_primary) || 0),
                    totalM3: acc.totalM3 + (Number(item.total_quantity_secondary) || 0),
                    totalAmount: acc.totalAmount + (Number(item.total_amount) || 0)
                }), { count: 0, totalTons: 0, totalM3: 0, totalAmount: 0 });
                setStats(currentStats);
            }
        } catch (err) {
            console.error('Failed to fetch purchases:', err);
            error('Không thể tải danh sách phiếu nhập');
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, searchQuery, error]);

    useEffect(() => {
        fetchPurchases();
    }, [fetchPurchases]);

    const columns: Column<any>[] = [
        {
            key: 'receipt_number',
            header: 'Số phiếu',
            cell: (item) => (
                <div className="flex flex-col">
                    <span className="font-mono text-sm font-bold text-primary-600">
                        {item.receipt_number}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        {formatDate(item.receipt_date)}
                    </span>
                </div>
            ),
        },
        {
            key: 'material_summary',
            header: 'Danh mục hàng hóa',
            cell: (item) => (
                <div className="max-w-[250px]">
                    <p className="font-medium text-slate-900 truncate" title={item.material_summary}>
                        {item.material_summary}
                    </p>
                </div>
            ),
        },
        {
            key: 'warehouse',
            header: 'Kho nhập',
            cell: (item) => (
                <div className="flex items-center gap-1.5 text-slate-600">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{item.warehouse?.name || 'N/A'}</span>
                </div>
            ),
        },
        {
            key: 'quantity',
            header: 'Tổng số lượng',
            cell: (item) => (
                <div className="text-right pr-4">
                    <p className="font-bold text-slate-900">
                        {formatNumber(item.total_quantity_primary, 2)} <span className="text-[10px] text-slate-500 font-normal">Tấn</span>
                    </p>
                    <p className="text-xs text-primary-600 font-medium">
                        ≈ {formatNumber(item.total_quantity_secondary, 2)} <span className="text-[10px] text-slate-400 font-normal">m³</span>
                    </p>
                </div>
            ),
        },
        {
            key: 'project',
            header: 'Dự án / NCC',
            cell: (item) => (
                <div>
                    <p className="text-slate-900 font-medium truncate max-w-[180px]">
                        {item.project?.name || '-'}
                    </p>
                    <p className="text-xs text-slate-500 italic">
                        {item.supplier_name || 'Không có NCC'}
                    </p>
                </div>
            ),
        },
        {
            key: 'total',
            header: 'Thành tiền',
            className: 'text-right',
            cell: (item) => (
                <span className="font-bold text-slate-900 font-mono">
                    {item.total_amount ? formatCurrency(item.total_amount) : '-'}
                </span>
            ),
        },
        {
            key: 'creator',
            header: 'Người tạo',
            cell: (item) => (
                <div className="flex items-center gap-2 text-slate-600">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="w-3 h-3 text-slate-400" />
                    </div>
                    <span className="text-sm">{item.creator?.full_name || 'N/A'}</span>
                </div>
            ),
        },
        {
            key: 'actions',
            header: '',
            className: 'w-16 text-center',
            cell: (item) => (
                <Link
                    to={`/purchases/${item.id}`}
                    className="inline-flex p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                    title="Xem chi tiết"
                >
                    <Eye className="w-5 h-5" />
                </Link>
            ),
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Phiếu nhập mua</h1>
                    <p className="text-slate-500 mt-1">Quản lý danh sách nhập vật tư từ nhà cung cấp</p>
                </div>
                <Link to="/purchases/new">
                    <Button leftIcon={<Plus className="w-4 h-4" />} className="shadow-lg shadow-primary-100">
                        Tạo phiếu nhập
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 border-l-4 border-l-primary-500 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng phiếu</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{stats.count}</p>
                </Card>
                <Card className="p-4 border-l-4 border-l-success-500 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Tấn</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{formatNumber(stats.totalTons, 2)}</p>
                </Card>
                <Card className="p-4 border-l-4 border-l-blue-500 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng m³</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1 font-mono">{formatNumber(stats.totalM3, 2)}</p>
                </Card>
                <Card className="p-4 border-l-4 border-l-amber-500 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng giá trị</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono text-amber-600">{formatCurrency(stats.totalAmount)}</p>
                </Card>
            </div>

            {/* Filters */}
            <Card className="shadow-sm border-slate-200">
                <CardContent className="py-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Tìm theo số phiếu, nhà cung cấp..."
                                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-slate-50 border-slate-200 focus:bg-white"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <Input
                                    type="date"
                                    className="w-40 pl-10 bg-slate-50 border-slate-200"
                                    placeholder="Từ ngày"
                                />
                            </div>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <Input
                                    type="date"
                                    className="w-40 pl-10 bg-slate-50 border-slate-200"
                                    placeholder="Đến ngày"
                                />
                            </div>
                            <Button variant="secondary" leftIcon={<Filter className="w-4 h-4" />}>
                                Lọc
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <Table
                    data={purchases}
                    columns={columns}
                    isLoading={isLoading}
                />
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center pt-4">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </div>
    );
}
