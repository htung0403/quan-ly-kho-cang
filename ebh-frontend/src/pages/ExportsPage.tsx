import { useState, useCallback, useEffect } from 'react';
import { Plus, Search, Download, Eye, Trash2, Truck, Calendar, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    Card,
    CardContent,
    Button,
    Input,
    Table,
    Pagination,
    ConfirmDialog,
    Select,
} from '@/components/ui';
import { api } from '@/lib/api';
import type { Column } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { formatDate, formatNumber, formatCurrency } from '@/lib/utils';

interface ExportReceipt {
    id: string;
    receipt_number: string;
    receipt_date: string;
    quantity_primary: number;
    quantity_secondary: number;
    total_amount?: number;
    customer_name?: string;
    destination?: string;
    notes?: string;
    warehouse: { name: string };
    material_summary?: string;
    items?: any[];
    project: { name: string };
    vehicle?: { plate_number: string; driver_name?: string };
    creator: { full_name: string };
    created_at: string;
}

interface FilterState {
    warehouse_id: string;
    project_id: string;
    vehicle_id: string;
    date_from: string;
    date_to: string;
}

export function ExportsPage() {
    const navigate = useNavigate();
    const { success, error } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedExport, setSelectedExport] = useState<ExportReceipt | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);

    const [exports, setExports] = useState<ExportReceipt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filter options
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
    const [vehicles, setVehicles] = useState<{ id: string; plate_number: string }[]>([]);

    const [filters, setFilters] = useState<FilterState>({
        warehouse_id: '',
        project_id: '',
        vehicle_id: '',
        date_from: '',
        date_to: ''
    });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: any = {
                page: currentPage,
                limit: 10,
                search: searchQuery
            };

            if (filters.warehouse_id) params.warehouse_id = filters.warehouse_id;
            if (filters.project_id) params.project_id = filters.project_id;
            if (filters.vehicle_id) params.vehicle_id = filters.vehicle_id;
            if (filters.date_from) params.date_from = filters.date_from;
            if (filters.date_to) params.date_to = filters.date_to;

            const res = await api.exports.getAll(params) as any;
            if (res.success) {
                setExports(res.data.items);
                setTotalPages(res.data.totalPages || 1);
                setTotal(res.data.total || 0);
            }
        } catch (err) {
            console.error(err);
            error('Không thể tải danh sách phiếu xuất');
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, searchQuery, filters, error]);

    const fetchFilterOptions = useCallback(async () => {
        try {
            const [warehousesRes, projectsRes, vehiclesRes] = await Promise.all([
                api.warehouses.getAll(),
                api.projects.getAll(),
                api.vehicles.getAll()
            ]) as any[];

            if (warehousesRes.success) setWarehouses(warehousesRes.data.items || warehousesRes.data || []);
            if (projectsRes.success) setProjects(projectsRes.data.items || projectsRes.data || []);
            if (vehiclesRes.success) setVehicles(vehiclesRes.data.items || vehiclesRes.data || []);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchFilterOptions();
    }, [fetchFilterOptions]);

    const columns: Column<ExportReceipt>[] = [
        {
            key: 'receipt_number',
            header: 'Số phiếu',
            cell: (item) => (
                <span className="font-mono text-sm font-semibold text-primary-600">{item.receipt_number}</span>
            ),
        },
        {
            key: 'receipt_date',
            header: 'Ngày xuất',
            cell: (item) => (
                <span className="text-slate-600">{formatDate(item.receipt_date)}</span>
            ),
        },
        {
            key: 'material_summary',
            header: 'Vật tư',
            cell: (item) => (
                <div>
                    <p className="font-medium text-slate-900 truncate max-w-[200px]" title={item.material_summary}>
                        {item.material_summary || 'N/A'}
                    </p>
                    {item.items && item.items.length > 1 && (
                        <p className="text-xs text-slate-500">
                            (+{item.items.length - 1} loại khác)
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: 'project',
            header: 'Dự án',
            cell: (item) => <span className="text-slate-900">{item.project?.name}</span>
        },
        {
            key: 'quantity',
            header: 'Số lượng',
            cell: (item) => (
                <div className="text-right">
                    <p className="font-semibold text-slate-900">
                        {formatNumber(item.quantity_secondary, 2)}
                    </p>
                    <p className="text-xs text-slate-500">
                        Tổng (m³)
                    </p>
                </div>
            ),
        },
        {
            key: 'vehicle',
            header: 'Xe vận chuyển',
            cell: (item) => item.vehicle ? (
                <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <div>
                        <p className="font-medium text-slate-900">{item.vehicle.plate_number}</p>
                    </div>
                </div>
            ) : <span className="text-slate-400">-</span>,
        },
        {
            key: 'total',
            header: 'Thành tiền',
            cell: (item) => (
                <span className="font-semibold text-success-600">
                    {item.total_amount ? formatCurrency(item.total_amount) : '-'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            className: 'w-24',
            cell: (item) => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => navigate(`/exports/${item.id}`)}
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
                        title="Xem chi tiết"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleDelete(item)}
                        className="p-2 text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    const handleDelete = (exportReceipt: ExportReceipt) => {
        setSelectedExport(exportReceipt);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (selectedExport) {
            try {
                const res = await api.exports.delete(selectedExport.id) as any;
                if (res.success) {
                    success(`Đã xóa phiếu xuất "${selectedExport.receipt_number}"`);
                    fetchData();
                }
            } catch (err) {
                error('Không thể xóa phiếu xuất');
            } finally {
                setIsDeleteDialogOpen(false);
                setSelectedExport(null);
            }
        }
    };

    const handleFilterChange = (key: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilters({
            warehouse_id: '',
            project_id: '',
            vehicle_id: '',
            date_from: '',
            date_to: ''
        });
        setCurrentPage(1);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Phiếu xuất kho</h1>
                    <p className="text-slate-500 mt-1">Quản lý các phiếu xuất vật tư ra công trình</p>
                </div>
                <Button onClick={() => navigate('/exports/new')} leftIcon={<Plus className="w-4 h-4" />}>
                    Tạo phiếu xuất
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="py-4">
                        <p className="text-sm text-blue-600">Tổng phiếu xuất</p>
                        <p className="text-2xl font-bold text-blue-700">{total}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Tìm theo số phiếu, khách hàng..."
                                    leftIcon={<Search className="w-4 h-4" />}
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    leftIcon={<Filter className="w-4 h-4" />}
                                    onClick={() => setShowFilters(!showFilters)}
                                >
                                    Bộ lọc
                                </Button>
                                <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
                                    Xuất Excel
                                </Button>
                            </div>
                        </div>

                        {showFilters && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t">
                                <Select
                                    options={[
                                        { value: '', label: 'Tất cả kho' },
                                        ...warehouses.map(w => ({ value: w.id, label: w.name }))
                                    ]}
                                    value={filters.warehouse_id}
                                    onChange={(e) => handleFilterChange('warehouse_id', e.target.value)}
                                />
                                <Select
                                    options={[
                                        { value: '', label: 'Tất cả dự án' },
                                        ...projects.map(p => ({ value: p.id, label: p.name }))
                                    ]}
                                    value={filters.project_id}
                                    onChange={(e) => handleFilterChange('project_id', e.target.value)}
                                />
                                <Select
                                    options={[
                                        { value: '', label: 'Tất cả xe' },
                                        ...vehicles.map(v => ({ value: v.id, label: v.plate_number }))
                                    ]}
                                    value={filters.vehicle_id}
                                    onChange={(e) => handleFilterChange('vehicle_id', e.target.value)}
                                />
                                <Input
                                    type="date"
                                    value={filters.date_from}
                                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                    leftIcon={<Calendar className="w-4 h-4" />}
                                />
                                <div className="flex gap-2">
                                    <Input
                                        type="date"
                                        value={filters.date_to}
                                        onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                    />
                                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                                        Xóa
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="spinner w-8 h-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                </div>
            ) : exports.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Truck className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-500">Chưa có phiếu xuất nào</p>
                        <Button
                            className="mt-4"
                            onClick={() => navigate('/exports/new')}
                            leftIcon={<Plus className="w-4 h-4" />}
                        >
                            Tạo phiếu xuất đầu tiên
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Table data={exports as any} columns={columns as any} />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                title="Xác nhận xóa"
                message={`Bạn có chắc muốn xóa phiếu xuất "${selectedExport?.receipt_number}"?`}
            />
        </div>
    );
}
