import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Plus, Package, Warehouse, Truck, Eye, Trash2, Search, Filter,
    Calendar, DollarSign, ChevronLeft, ChevronRight, FileText,
    Sparkles, X, RefreshCw
} from 'lucide-react';
import {
    Card,
    CardContent,
    Button,
    Input,
    Select,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { formatDate, formatCurrency, formatNumber } from '@/lib/utils';

interface PurchaseReceiptV2 {
    item_id: string;
    receipt_id: string;
    receipt_number: string;
    receipt_type: 'direct_to_site' | 'warehouse_import';
    receipt_date: string;
    quarry_name: string;
    supplier_name: string;
    material_name: string;
    quantity_primary: number | null;   // Tấn
    quantity_secondary: number | null; // Khối
    unit_price: number | null;
    total_amount: number | null;
    created_by_name: string;
    vehicle_plate?: string;
}

const RECEIPT_TYPES = [
    { value: '', label: 'Tất cả loại phiếu' },
    { value: 'direct_to_site', label: 'Xuất trực tiếp vào công trình' },
    { value: 'warehouse_import', label: 'Nhập kho tại cảng' },
    { value: 'transport_log', label: 'Vận chuyển' },
];


export function PurchasesPage() {
    const navigate = useNavigate();
    const { success, error } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [receipts, setReceipts] = useState<PurchaseReceiptV2[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);

    // Filters
    const [filters, setFilters] = useState<{
        search: string;
        receipt_type: '' | 'direct_to_site' | 'warehouse_import' | 'transport_log';
        date_from: string;
        date_to: string;
    }>({
        search: '',
        receipt_type: '',
        date_from: '',
        date_to: ''
    });

    const fetchReceipts = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: {
                page: number;
                limit: number;
                search: string;
                date_from: string;
                date_to: string;
                receipt_type?: 'direct_to_site' | 'warehouse_import';
            } = {
                page,
                limit,
                search: filters.search,
                date_from: filters.date_from,
                date_to: filters.date_to
            };

            // Only add receipt_type if it's not empty string and is a valid API type
            if (filters.receipt_type && filters.receipt_type !== 'transport_log') {
                params.receipt_type = filters.receipt_type;
            }

            const res = await api.purchases.getAll(params) as unknown as { success: boolean; data: { items: PurchaseReceiptV2[]; total: number } };

            if (res.success) {
                setReceipts(res.data.items || []);
                setTotal(res.data.total || 0);
            }
        } catch (err: unknown) {
            error(err instanceof Error ? err.message : 'Không thể tải danh sách');
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, filters, error]);

    useEffect(() => {
        fetchReceipts();
    }, [page, filters]);

    const handleDelete = async (id: string, receiptNumber: string) => {
        if (!confirm(`Bạn có chắc muốn xóa TOÀN BỘ phiếu ${receiptNumber}?`)) return;

        try {
            const res = await api.purchases.delete(id) as unknown as { success: boolean };
            if (res.success) {
                success('Xóa phiếu thành công');
                fetchReceipts();
            }
        } catch (err: unknown) {
            error(err instanceof Error ? err.message : 'Không thể xóa phiếu');
        }
    };

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1); // Reset to first page
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            receipt_type: '',
            date_from: '',
            date_to: ''
        });
        setPage(1);
    };


    const totalPages = Math.ceil(total / limit);

    // Calculate stats
    const stats = {
        directToSite: receipts.filter(r => r.receipt_type === 'direct_to_site').length,
        warehouseImport: receipts.filter(r => r.receipt_type === 'warehouse_import').length,
        totalValue: receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0),
        totalQuantity: receipts.reduce((sum, r) => sum + (r.quantity_primary || 0), 0)
    };

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Hero Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-400 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
                </div>
                
                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
                            <Sparkles className="w-7 h-7 text-primary-400" />
                            Quản lý phiếu nhập
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Quản lý 3 loại phiếu: Xuất trực tiếp công trình, Nhập kho tại cảng, Vận chuyển
                        </p>
                    </div>
                    <Button 
                        onClick={() => navigate('/purchases/new')} 
                        leftIcon={<Plus className="w-4 h-4" />}
                        size="lg"
                        className="bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/30"
                    >
                        Tạo phiếu mới
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Direct to Site */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-green-200/50 hover:shadow-xl hover:scale-[1.02] transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-xs font-medium uppercase tracking-wider">Xuất trực tiếp</p>
                            <p className="text-3xl font-black mt-1">{stats.directToSite}</p>
                            <p className="text-green-200 text-xs mt-1">phiếu trong trang</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                            <Package className="w-7 h-7" />
                        </div>
                    </div>
                </div>

                {/* Warehouse Import */}
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-200/50 hover:shadow-xl hover:scale-[1.02] transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Nhập kho</p>
                            <p className="text-3xl font-black mt-1">{stats.warehouseImport}</p>
                            <p className="text-blue-200 text-xs mt-1">phiếu trong trang</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                            <Warehouse className="w-7 h-7" />
                        </div>
                    </div>
                </div>

                {/* Total Quantity */}
                <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-200/50 hover:shadow-xl hover:scale-[1.02] transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-orange-100 text-xs font-medium uppercase tracking-wider">Tổng sản lượng</p>
                            <p className="text-2xl font-black mt-1">
                                {formatNumber(stats.totalQuantity, 2)}
                                <span className="text-sm font-normal ml-1">Tấn</span>
                            </p>
                            <p className="text-orange-200 text-xs mt-1">trong trang hiện tại</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                            <Truck className="w-7 h-7" />
                        </div>
                    </div>
                </div>

                {/* Total Value */}
                <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-5 text-white shadow-lg shadow-purple-200/50 hover:shadow-xl hover:scale-[1.02] transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-xs font-medium uppercase tracking-wider">Tổng giá trị</p>
                            <p className="text-xl font-black mt-1">{formatCurrency(stats.totalValue)}</p>
                            <p className="text-purple-200 text-xs mt-1">trong trang hiện tại</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                            <DollarSign className="w-7 h-7" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <Card className="overflow-hidden border-0 shadow-lg">
                <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Bộ lọc tìm kiếm
                    </h3>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={fetchReceipts}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                            title="Làm mới"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        {(filters.search || filters.receipt_type || filters.date_from || filters.date_to) && (
                            <button 
                                onClick={clearFilters}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-sm transition-colors"
                            >
                                <X className="w-3 h-3" />
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                </div>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                            <Input
                                id="search"
                                label="Tìm kiếm"
                                placeholder="Nhập số phiếu..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                            />
                            <Search className="absolute right-3 top-9 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        <Select
                            id="receipt_type"
                            label="Loại phiếu"
                            options={RECEIPT_TYPES}
                            value={filters.receipt_type}
                            onChange={(e) => handleFilterChange('receipt_type', e.target.value)}
                        />
                        <div className="relative">
                            <Input
                                id="date_from"
                                label="Từ ngày"
                                type="date"
                                value={filters.date_from}
                                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                            />
                            <Calendar className="absolute right-3 top-9 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <Input
                                id="date_to"
                                label="Đến ngày"
                                type="date"
                                value={filters.date_to}
                                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                            />
                            <Calendar className="absolute right-3 top-9 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* List */}
            <Card className="overflow-hidden border-0 shadow-lg">
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Danh sách phiếu nhập
                        <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                            {total} phiếu
                        </span>
                    </h3>
                </div>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin mb-4"></div>
                            <p className="text-slate-500 font-medium">Đang tải dữ liệu...</p>
                        </div>
                    ) : receipts.length === 0 ? (
                        <div className="text-center py-20 bg-gradient-to-br from-slate-50 to-slate-100">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-200 flex items-center justify-center">
                                <Package className="w-10 h-10 text-slate-400" />
                            </div>
                            <p className="text-slate-600 font-bold text-lg mb-1">Không tìm thấy phiếu nào</p>
                            <p className="text-slate-400 text-sm mb-4">Thử thay đổi bộ lọc hoặc tạo phiếu mới</p>
                            <Button 
                                onClick={() => navigate('/purchases/new')} 
                                leftIcon={<Plus className="w-4 h-4" />}
                            >
                                Tạo phiếu mới
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b-2 border-slate-200">
                                        <tr>
                                            <th className="px-4 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">STT</th>
                                            <th className="px-4 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Ngày</th>
                                            <th className="px-4 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Kho/Công trình</th>
                                            <th className="px-4 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Nhà cung cấp</th>
                                            <th className="px-4 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Số phiếu</th>
                                            <th className="px-4 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Vật tư</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Tấn</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">m³</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Đơn giá</th>
                                            <th className="px-4 py-4 text-right text-xs font-bold text-primary-600 uppercase tracking-wider">Thành tiền</th>
                                            <th className="px-4 py-4 text-center text-xs font-bold text-slate-600 uppercase tracking-wider w-24">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(() => {
                                            let currentReceiptId = '';
                                            let rowIndex = 0;
                                            return receipts.map((receipt) => {
                                                const isNewReceipt = receipt.receipt_id !== currentReceiptId;
                                                if (isNewReceipt) {
                                                    currentReceiptId = receipt.receipt_id;
                                                    rowIndex++;
                                                }
                                                
                                                const receiptTypeColor = receipt.receipt_type === 'direct_to_site' 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-blue-100 text-blue-700';
                                                
                                                return (
                                                    <tr 
                                                        key={receipt.item_id} 
                                                        className={`hover:bg-slate-50/80 transition-colors ${
                                                            isNewReceipt ? 'border-t-2 border-slate-200' : ''
                                                        }`}
                                                    >
                                                        <td className="px-4 py-3 text-sm text-slate-400 font-medium">
                                                            {isNewReceipt ? (page - 1) * limit + rowIndex : ''}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                            {isNewReceipt ? formatDate(receipt.receipt_date) : ''}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            {isNewReceipt && receipt.quarry_name && (
                                                                <span className="font-medium text-slate-800">{receipt.quarry_name}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            {isNewReceipt && receipt.supplier_name && (
                                                                <span className="text-slate-600">{receipt.supplier_name}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {isNewReceipt && (
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${receiptTypeColor}`}>
                                                                            {receipt.receipt_type === 'direct_to_site' ? 'XTT' : 'NK'}
                                                                        </span>
                                                                        <span className="font-mono font-bold text-slate-900">{receipt.receipt_number}</span>
                                                                    </div>
                                                                    {receipt.vehicle_plate && (
                                                                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                                                            <Truck className="w-3 h-3" /> {receipt.vehicle_plate}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <Package className="w-4 h-4 text-primary-400" />
                                                                <span className="text-sm font-medium text-slate-800">{receipt.material_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className="text-sm font-bold text-slate-900">{formatNumber(receipt.quantity_primary || 0, 2)}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className="text-sm text-slate-400">{formatNumber(receipt.quantity_secondary || 0, 2)}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-sm text-slate-600">
                                                            {formatCurrency(receipt.unit_price || 0)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className="font-bold text-primary-600">{formatCurrency(receipt.total_amount || 0)}</span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {isNewReceipt && (
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <button
                                                                        onClick={() => navigate(`/purchases/${receipt.receipt_id}`)}
                                                                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all hover:scale-110"
                                                                        title="Xem chi tiết"
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(receipt.receipt_id, receipt.receipt_number)}
                                                                        className="p-2 text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-all hover:scale-110"
                                                                        title="Xóa phiếu"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            </div>

                            {/* Modern Pagination */}
                            <div className="px-6 py-4 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-500">Hiển thị</span>
                                    <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-lg font-bold text-sm">
                                        {(page - 1) * limit + 1} - {Math.min(page * limit, total)}
                                    </span>
                                    <span className="text-sm text-slate-500">trong tổng số</span>
                                    <span className="font-bold text-slate-700">{total}</span>
                                    <span className="text-sm text-slate-500">phiếu</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className={`p-2 rounded-lg transition-all ${
                                            page === 1 
                                                ? 'text-slate-300 cursor-not-allowed' 
                                                : 'text-slate-600 hover:bg-slate-100 hover:text-primary-600'
                                        }`}
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum: number;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (page <= 3) {
                                                pageNum = i + 1;
                                            } else if (page >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = page - 2 + i;
                                            }
                                            
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setPage(pageNum)}
                                                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                                                        page === pageNum
                                                            ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 scale-110'
                                                            : 'bg-white text-slate-600 hover:bg-slate-100 hover:scale-105 border border-slate-200'
                                                    }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className={`p-2 rounded-lg transition-all ${
                                            page === totalPages 
                                                ? 'text-slate-300 cursor-not-allowed' 
                                                : 'text-slate-600 hover:bg-slate-100 hover:text-primary-600'
                                        }`}
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
