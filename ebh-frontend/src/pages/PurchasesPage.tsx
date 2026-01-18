import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Plus, Package, Warehouse, Truck, Eye, Trash2, Search, Filter,
    Calendar, DollarSign, ChevronLeft, ChevronRight, FileText,
    Sparkles, X, RefreshCw, MapPin, User, Hash, Edit2
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

// Interface cập nhật với đầy đủ 16 cột theo yêu cầu
interface PurchaseReceiptV2 {
    item_id: string;
    receipt_id: string;
    receipt_number: string;
    receipt_type: 'direct_to_site' | 'warehouse_import';
    receipt_date: string;              // 1. Ngày
    material_code: string;             // 2. Mã SP
    material_name: string;             // 3. Tên sản phẩm
    supplier_name: string;             // 4. Tên NCC
    pickup_location: string;           // 5. Nơi lấy hàng
    delivery_location: string;         // 6. Nơi giao hàng
    customer_name: string;             // 7. Tên Khách hàng
    vehicle_plate: string;             // 9. Số xe
    transport_unit: string;            // 10. ĐV Vận chuyển
    quantity_tons: number | null;      // 11. KL Tấn
    density: number | null;            // 12. Tỷ trọng
    quantity_m3: number | null;        // 13. KL m3
    purchase_unit_price: number | null; // 14. Đơn giá - Sản phẩm NHẬP
    transport_unit_price: number | null; // 15. Đơn giá - Vận chuyển
    sale_unit_price: number | null;    // 16. Đơn giá - Sản phẩm BÁN
    total_amount: number | null;
    created_by_name: string;
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
    const [limit] = useState(50); // Tăng limit để giảm số lần phân trang

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

    // Debounce search để không gọi API liên tục khi gõ
    const [debouncedFilters, setDebouncedFilters] = useState(filters);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedFilters(filters);
        }, 300);
        return () => clearTimeout(timer);
    }, [filters]);

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
                search: debouncedFilters.search,
                date_from: debouncedFilters.date_from,
                date_to: debouncedFilters.date_to
            };

            // Only add receipt_type if it's not empty string and is a valid API type
            if (debouncedFilters.receipt_type && debouncedFilters.receipt_type !== 'transport_log') {
                params.receipt_type = debouncedFilters.receipt_type;
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
    }, [page, limit, debouncedFilters, error]);

    useEffect(() => {
        fetchReceipts();
    }, [page, debouncedFilters, fetchReceipts]);

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

    // Memo hóa các tính toán để tránh tính lại không cần thiết
    const { uniqueReceiptCount, stats, totalPages } = useMemo(() => {
        const uniqueIds = [...new Set(receipts.map(r => r.receipt_id))];
        return {
            uniqueReceiptCount: uniqueIds.length,
            totalPages: Math.ceil(total / limit),
            stats: {
                directToSite: [...new Set(receipts.filter(r => r.receipt_type === 'direct_to_site').map(r => r.receipt_id))].length,
                warehouseImport: [...new Set(receipts.filter(r => r.receipt_type === 'warehouse_import').map(r => r.receipt_id))].length,
                totalValue: receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0),
                totalQuantity: receipts.reduce((sum, r) => sum + (r.quantity_tons || 0), 0)
            }
        };
    }, [receipts, total, limit]);

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
                            {uniqueReceiptCount} phiếu (trang này)
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
                                <table className="w-full min-w-[1800px]">
                                    <thead className="bg-gradient-to-r from-slate-100 to-slate-50 border-b-2 border-slate-200 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">STT</th>
                                            <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                                                <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Ngày</div>
                                            </th>
                                            <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                                                <div className="flex items-center gap-1"><Hash className="w-3 h-3" /> Mã SP</div>
                                            </th>
                                            <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                                                <div className="flex items-center gap-1"><Package className="w-3 h-3" /> Tên SP</div>
                                            </th>
                                            <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Tên NCC</th>
                                            <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                                                <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Nơi lấy</div>
                                            </th>
                                            <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                                                <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Nơi giao</div>
                                            </th>
                                            <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                                                <div className="flex items-center gap-1"><User className="w-3 h-3" /> Khách hàng</div>
                                            </th>
                                            <th className="px-3 py-3 text-left text-[10px] font-bold text-primary-600 uppercase tracking-wider whitespace-nowrap">
                                                <div className="flex items-center gap-1"><FileText className="w-3 h-3" /> Số phiếu</div>
                                            </th>
                                            <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                                                <div className="flex items-center gap-1"><Truck className="w-3 h-3" /> Số xe</div>
                                            </th>
                                            <th className="px-3 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">ĐV Vận chuyển</th>
                                            <th className="px-3 py-3 text-right text-[10px] font-bold text-orange-600 uppercase tracking-wider whitespace-nowrap">KL Tấn</th>
                                            <th className="px-3 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tỷ trọng</th>
                                            <th className="px-3 py-3 text-right text-[10px] font-bold text-blue-600 uppercase tracking-wider whitespace-nowrap">KL m³</th>
                                            <th className="px-3 py-3 text-right text-[10px] font-bold text-green-600 uppercase tracking-wider whitespace-nowrap">ĐG Nhập</th>
                                            <th className="px-3 py-3 text-right text-[10px] font-bold text-amber-600 uppercase tracking-wider whitespace-nowrap">ĐG VC</th>
                                            <th className="px-3 py-3 text-right text-[10px] font-bold text-purple-600 uppercase tracking-wider whitespace-nowrap">ĐG Bán</th>
                                            <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider w-24 sticky right-0 bg-gradient-to-r from-slate-100 to-slate-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">TT</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
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
                                                    ? 'bg-green-100 text-green-700 border-green-200' 
                                                    : 'bg-blue-100 text-blue-700 border-blue-200';
                                                
                                                return (
                                                    <tr 
                                                        key={receipt.item_id} 
                                                        className={`hover:bg-primary-50/50 transition-colors ${
                                                            isNewReceipt ? 'border-t-2 border-slate-300' : ''
                                                        }`}
                                                    >
                                                        {/* 0. STT - chỉ đếm trong trang hiện tại */}
                                                        <td className="px-3 py-2.5 text-xs text-slate-400 font-medium">
                                                            {isNewReceipt ? rowIndex : ''}
                                                        </td>
                                                        {/* 1. Ngày */}
                                                        <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                                            {formatDate(receipt.receipt_date)}
                                                        </td>
                                                        {/* 2. Mã SP */}
                                                        <td className="px-3 py-2.5">
                                                            <span className="text-xs font-mono font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                                                                {receipt.material_code}
                                                            </span>
                                                        </td>
                                                        {/* 3. Tên sản phẩm */}
                                                        <td className="px-3 py-2.5 text-xs font-medium text-slate-800 max-w-[150px] truncate" title={receipt.material_name}>
                                                            {receipt.material_name}
                                                        </td>
                                                        {/* 4. Tên NCC */}
                                                        <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[120px] truncate" title={receipt.supplier_name}>
                                                            {receipt.supplier_name !== '---' ? receipt.supplier_name : <span className="text-slate-300">—</span>}
                                                        </td>
                                                        {/* 5. Nơi lấy hàng */}
                                                        <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[120px] truncate" title={receipt.pickup_location}>
                                                            {receipt.pickup_location !== '---' ? receipt.pickup_location : <span className="text-slate-300">—</span>}
                                                        </td>
                                                        {/* 6. Nơi giao hàng */}
                                                        <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[120px] truncate" title={receipt.delivery_location}>
                                                            {receipt.delivery_location !== '---' ? receipt.delivery_location : <span className="text-slate-300">—</span>}
                                                        </td>
                                                        {/* 7. Tên Khách hàng */}
                                                        <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[100px] truncate" title={receipt.customer_name}>
                                                            {receipt.customer_name !== '---' ? receipt.customer_name : <span className="text-slate-300">—</span>}
                                                        </td>
                                                        {/* 8. Số phiếu */}
                                                        <td className="px-3 py-2.5">
                                                            {isNewReceipt && (
                                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border ${receiptTypeColor}`}>
                                                                    {receipt.receipt_type === 'direct_to_site' ? 'XTT' : 'NK'}
                                                                    <span className="font-mono">{receipt.receipt_number}</span>
                                                                </span>
                                                            )}
                                                        </td>
                                                        {/* 9. Số xe */}
                                                        <td className="px-3 py-2.5 text-xs font-mono text-slate-700">
                                                            {receipt.vehicle_plate !== '---' ? receipt.vehicle_plate : <span className="text-slate-300">—</span>}
                                                        </td>
                                                        {/* 10. ĐV Vận chuyển */}
                                                        <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[100px] truncate" title={receipt.transport_unit}>
                                                            {receipt.transport_unit !== '---' ? receipt.transport_unit : <span className="text-slate-300">—</span>}
                                                        </td>
                                                        {/* 11. KL Tấn */}
                                                        <td className="px-3 py-2.5 text-right">
                                                            <span className="text-xs font-bold text-orange-600">{formatNumber(receipt.quantity_tons || 0, 2)}</span>
                                                        </td>
                                                        {/* 12. Tỷ trọng */}
                                                        <td className="px-3 py-2.5 text-right text-xs text-slate-500">
                                                            {formatNumber(receipt.density || 1, 2)}
                                                        </td>
                                                        {/* 13. KL m3 */}
                                                        <td className="px-3 py-2.5 text-right">
                                                            <span className="text-xs font-medium text-blue-600">{formatNumber(receipt.quantity_m3 || 0, 2)}</span>
                                                        </td>
                                                        {/* 14. Đơn giá - Sản phẩm NHẬP */}
                                                        <td className="px-3 py-2.5 text-right text-xs text-green-600 font-medium">
                                                            {formatCurrency(receipt.purchase_unit_price || 0)}
                                                        </td>
                                                        {/* 15. Đơn giá - Vận chuyển */}
                                                        <td className="px-3 py-2.5 text-right text-xs text-amber-600">
                                                            {formatCurrency(receipt.transport_unit_price || 0)}
                                                        </td>
                                                        {/* 16. Đơn giá - Sản phẩm BÁN */}
                                                        <td className="px-3 py-2.5 text-right text-xs text-purple-600 font-medium">
                                                            {formatCurrency(receipt.sale_unit_price || 0)}
                                                        </td>
                                                        {/* Actions - Sticky right */}
                                                        <td className="px-3 py-2.5 sticky right-0 bg-white shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                                            {isNewReceipt && (
                                                                <div className="flex items-center justify-center gap-0.5">
                                                                    <button
                                                                        onClick={() => navigate(`/purchases/${receipt.receipt_id}`)}
                                                                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                                                        title="Xem chi tiết"
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => navigate(`/purchases/${receipt.receipt_id}/edit`)}
                                                                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                                        title="Sửa phiếu"
                                                                    >
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(receipt.receipt_id, receipt.receipt_number)}
                                                                        className="p-1.5 text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-all"
                                                                        title="Xóa phiếu"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
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
                                    <span className="text-sm text-slate-500">Trang {page}/{totalPages}</span>
                                    <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-lg font-bold text-sm">
                                        {uniqueReceiptCount} phiếu
                                    </span>
                                    <span className="text-sm text-slate-500">|</span>
                                    <span className="text-sm text-slate-500">{receipts.length} dòng vật tư</span>
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
