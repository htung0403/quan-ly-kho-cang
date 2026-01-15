import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Warehouse as WarehouseIcon, MapPin, Box } from 'lucide-react';
import {
    Card,
    CardContent,
    Button,
    Input,
    Badge,
    Select,
    Modal,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface Warehouse {
    id: string;
    code: string;
    name: string;
    address: string;
    description: string;
    capacity: number;
    status: 'active' | 'inactive' | 'maintenance';
    created_at: string;
}

export function WarehousesPage() {
    const { success, error } = useToast();
    const navigate = useNavigate();

    // List State
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });
    const [filters, setFilters] = useState({
        search: '',
        status: ''
    });

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        address: '',
        description: '',
        capacity: 0,
        status: 'active'
    });

    const fetchWarehouses = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await (api.warehouses.getAll as any)({
                page: pagination.page,
                limit: pagination.limit,
                search: filters.search,
                status: filters.status
            });

            if (res.success) {
                setWarehouses(res.data.items || []);
                setPagination(prev => ({
                    ...prev,
                    total: res.data.total,
                    totalPages: res.data.totalPages
                }));
            }
        } catch (err: any) {
            error(err.message || 'Không thể tải danh sách kho');
        } finally {
            setIsLoading(false);
        }
    }, [pagination.page, pagination.limit, filters, error]);

    useEffect(() => {
        fetchWarehouses();
    }, [fetchWarehouses]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleOpenModal = (warehouse?: Warehouse) => {
        if (warehouse) {
            setEditingId(warehouse.id);
            setFormData({
                name: warehouse.name,
                code: warehouse.code,
                address: warehouse.address || '',
                description: warehouse.description || '',
                capacity: warehouse.capacity || 0,
                status: warehouse.status || 'active'
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                code: '',
                address: '',
                description: '',
                capacity: 0,
                status: 'active'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name) {
            error('Tên kho là bắt buộc');
            return;
        }

        setIsSubmitting(true);
        try {
            const dataToSubmit = { ...formData };
            if (!dataToSubmit.code) delete (dataToSubmit as any).code;

            if (editingId) {
                await (api.warehouses.update as any)(editingId, dataToSubmit);
                success('Cập nhật kho thành công');
            } else {
                await (api.warehouses.create as any)(dataToSubmit);
                success('Tạo kho thành công');
            }
            setIsModalOpen(false);
            fetchWarehouses();
        } catch (err: any) {
            error(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa kho "${name}"? Hành động này không thể hoàn tác.`)) {
            try {
                await api.warehouses.delete(id);
                success('Xóa kho thành công');
                fetchWarehouses();
            } catch (err: any) {
                error(err.message || 'Không thể xóa kho');
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Quản lý Kho bãi</h1>
                    <p className="text-slate-500">Quản lý danh sách kho, sức chứa và địa điểm</p>
                </div>
                <Button onClick={() => handleOpenModal()} leftIcon={<Plus className="w-4 h-4" />}>
                    Thêm kho mới
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Tìm kiếm theo mã, tên kho..."
                                className="pl-9"
                                value={filters.search}
                                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <Select
                                value={filters.status}
                                onChange={e => {
                                    setFilters(prev => ({ ...prev, status: e.target.value }));
                                    setPagination(prev => ({ ...prev, page: 1 }));
                                }}
                                options={[
                                    { value: '', label: 'Tất cả trạng thái' },
                                    { value: 'active', label: 'Đang hoạt động' },
                                    { value: 'inactive', label: 'Ngưng hoạt động' },
                                    { value: 'maintenance', label: 'Bảo trì' }
                                ]}
                            />
                        </div>
                        <Button type="submit" variant="secondary">Tìm kiếm</Button>
                    </form>
                </CardContent>
            </Card>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    Array(6).fill(0).map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="h-40" />
                        </Card>
                    ))
                ) : warehouses.length > 0 ? (
                    warehouses.map(warehouse => (
                        <Card
                            key={warehouse.id}
                            className="hover:shadow-md transition-shadow group cursor-pointer"
                            onClick={() => navigate(`/warehouses/${warehouse.id}`)}
                        >
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                            <WarehouseIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                                                {warehouse.name}
                                            </h3>
                                            <p className="text-xs text-slate-500 font-mono">{warehouse.code}</p>
                                        </div>
                                    </div>
                                    <Badge variant={
                                        warehouse.status === 'active' ? 'success' :
                                            warehouse.status === 'maintenance' ? 'warning' : 'slate'
                                    }>
                                        {warehouse.status === 'active' ? 'Hoạt động' :
                                            warehouse.status === 'maintenance' ? 'Bảo trì' : 'Ngưng'}
                                    </Badge>
                                </div>

                                <div className="space-y-2 text-sm text-slate-600 mb-4 h-[60px] overflow-hidden">
                                    {warehouse.address && (
                                        <div className="flex items-start gap-2">
                                            <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                                            <span className="line-clamp-2">{warehouse.address}</span>
                                        </div>
                                    )}
                                    {warehouse.capacity > 0 && (
                                        <div className="flex items-center gap-2">
                                            <Box className="w-4 h-4 text-slate-400" />
                                            <span>Sức chứa: <strong>{warehouse.capacity}</strong> tấn</span>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); handleOpenModal(warehouse); }}
                                        leftIcon={<Edit2 className="w-3 h-3" />}
                                    >
                                        Sửa
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(warehouse.id, warehouse.name); }}
                                        leftIcon={<Trash2 className="w-3 h-3" />}
                                    >
                                        Xóa
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed">
                        <WarehouseIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Chưa có kho nào được tạo</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {warehouses.length > 0 && (
                <div className="flex justify-center mt-6">
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            disabled={pagination.page === 1}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        >
                            Trước
                        </Button>
                        <span className="flex items-center px-4 bg-white rounded border border-slate-200">
                            Trang {pagination.page} / {pagination.totalPages}
                        </span>
                        <Button
                            variant="secondary"
                            disabled={pagination.page === pagination.totalPages}
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        >
                            Sau
                        </Button>
                    </div>
                </div>
            )}

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? 'Cập nhật kho bãi' : 'Thêm kho mới'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Tên kho (*)"
                            value={formData.name}
                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Nhập tên kho"
                            autoFocus
                        />
                        <Input
                            label="Mã kho"
                            value={formData.code}
                            onChange={e => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                            placeholder="Để trống để tự tạo"
                            disabled={!!editingId}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Sức chứa (Tấn)"
                            type="number"
                            value={formData.capacity}
                            onChange={e => setFormData(prev => ({ ...prev, capacity: parseFloat(e.target.value) || 0 }))}
                        />
                        <Select
                            label="Trạng thái"
                            value={formData.status}
                            onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                            options={[
                                { value: 'active', label: 'Đang hoạt động' },
                                { value: 'maintenance', label: 'Đang bảo trì' },
                                { value: 'inactive', label: 'Ngưng hoạt động' }
                            ]}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ</label>
                        <textarea
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            rows={2}
                            value={formData.address}
                            onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="Nhập địa chỉ kho"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả thêm</label>
                        <textarea
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Nhập mô tả chi tiết..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                            Hủy bỏ
                        </Button>
                        <Button type="submit" isLoading={isSubmitting}>
                            {editingId ? 'Lưu thay đổi' : 'Tạo mới'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
