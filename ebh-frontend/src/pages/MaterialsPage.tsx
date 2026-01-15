import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Search, Download, Edit, Trash2, Minus } from 'lucide-react';
import {
    Card,
    CardContent,
    Button,
    Input,
    Table,
    Pagination,
    Modal,
    ConfirmDialog,
    Select,
} from '@/components/ui';
import { api } from '@/lib/api';
import type { Column } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { formatNumber, formatCurrency } from '@/lib/utils';
import type { Material, Warehouse } from '@/types';

interface InitialStock {
    warehouse_id: string;
    quantity: number;
}

export function MaterialsPage() {
    const { success, error } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const [materials, setMaterials] = useState<Material[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalPages, setTotalPages] = useState(1);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

    // State for Dynamic Options (Category and Unit)
    const [categories, setCategories] = useState<string[]>([]);
    const [units, setUnits] = useState<string[]>([]);
    const [isAddOptionModalOpen, setIsAddOptionModalOpen] = useState(false);
    const [optionType, setOptionType] = useState<'category' | 'unit'>('category');
    const [newOptionValue, setNewOptionValue] = useState('');

    const initialFormData: Partial<Material> & { initial_stocks: InitialStock[] } = {
        code: '',
        name: '',
        description: '',
        primary_unit: 'Tấn',
        secondary_unit: 'm³',
        current_density: 1.5,
        category: '',
        material_type: 'Sản phẩm vật lý',
        purchase_price: 0,
        sale_price: 0,
        wholesale_price: 0,
        vat_percentage: 0,
        initial_stocks: []
    };

    const [formData, setFormData] = useState<typeof initialFormData>(initialFormData);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [materialsRes, warehousesRes, categoriesRes, unitsRes] = await Promise.all([
                api.materials.getAll({ page: currentPage, search: searchQuery }),
                api.warehouses.getAll(),
                api.lookups.getCategories(),
                api.lookups.getUnits()
            ]) as any[];

            if (materialsRes.success) {
                setMaterials(materialsRes.data.items);
                setTotalPages(materialsRes.data.totalPages || 1);
            }

            if (warehousesRes.success) {
                const warehouseList = warehousesRes.data.items || warehousesRes.data || [];
                setWarehouses(warehouseList);
            }

            if (categoriesRes?.success) {
                setCategories(categoriesRes.data.map((c: any) => c.name));
            }

            if (unitsRes?.success) {
                setUnits(unitsRes.data.map((u: any) => u.name));
            }
        } catch (err) {
            console.error('Fetch error:', err);
            error('Không thể tải dữ liệu');
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, searchQuery, error]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const columns: Column<Material>[] = [
        {
            key: 'code',
            header: 'Mã hàng',
            cell: (item) => (
                <span className="font-mono text-sm font-medium text-primary-600">{item.code}</span>
            ),
        },
        {
            key: 'name',
            header: 'Tên hàng hóa',
            cell: (item) => (
                <div>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    {item.description && (
                        <p className="text-sm text-slate-500 truncate max-w-[200px]">{item.description}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'units',
            header: 'Đơn vị',
            cell: (item) => (
                <div className="flex items-center gap-2">
                    <span className="badge-primary px-2 py-0.5 rounded text-xs">{item.primary_unit}</span>
                    <span className="text-slate-400">→</span>
                    <span className="badge-success px-2 py-0.5 rounded text-xs">{item.secondary_unit}</span>
                </div>
            ),
        },
        {
            key: 'density',
            header: 'Tỷ trọng',
            cell: (item) => (
                <span className="font-semibold text-slate-900">{formatNumber(item.current_density, 2)}</span>
            ),
        },
        {
            key: 'purchase_price',
            header: 'Giá nhập',
            cell: (item) => (
                <span className="font-semibold text-slate-600">
                    {item.purchase_price ? formatCurrency(item.purchase_price) : '-'}
                </span>
            ),
        },
        {
            key: 'sale_price',
            header: 'Giá bán lẻ',
            cell: (item) => (
                <span className="font-semibold text-primary-600">
                    {item.sale_price ? formatCurrency(item.sale_price) : '-'}
                </span>
            ),
        },
        {
            key: 'category',
            header: 'Danh mục',
            cell: (item) => <span className="text-slate-600">{item.category || '-'}</span>,
        },
        {
            key: 'actions',
            header: '',
            className: 'w-24',
            cell: (item) => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
                        title="Chỉnh sửa"
                    >
                        <Edit className="w-4 h-4" />
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

    const handleAdd = () => {
        setSelectedMaterial(null);
        setFormData(initialFormData);
        setIsModalOpen(true);
    };

    const handleEdit = (material: Material) => {
        setSelectedMaterial(material);
        setFormData({
            ...material,
            initial_stocks: []
        });
        setIsModalOpen(true);
    };

    const handleDelete = (material: Material) => {
        setSelectedMaterial(material);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (selectedMaterial) {
            try {
                const res = await api.materials.delete(selectedMaterial.id) as any;
                if (res.success) {
                    success(`Đã xóa hàng hóa "${selectedMaterial.name}"`);
                    fetchData();
                }
            } catch (err) {
                error('Không thể xóa hàng hóa');
            } finally {
                setIsDeleteDialogOpen(false);
                setSelectedMaterial(null);
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value, type } = e.target as HTMLInputElement;
        setFormData(prev => ({
            ...prev,
            [id]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        const rawValue = value.replace(/\D/g, '');
        const numValue = rawValue ? parseInt(rawValue, 10) : 0;

        setFormData(prev => ({
            ...prev,
            [id]: numValue
        }));
    };

    const handleAddOption = (type: 'category' | 'unit') => {
        setOptionType(type);
        setNewOptionValue('');
        setIsAddOptionModalOpen(true);
    };

    const saveNewOption = async () => {
        if (!newOptionValue.trim()) return;

        try {
            if (optionType === 'category') {
                const res = await api.lookups.createCategory(newOptionValue) as any;
                if (res.success) {
                    setCategories(prev => [...prev, newOptionValue]);
                    setFormData(prev => ({ ...prev, category: newOptionValue }));
                }
            } else {
                const res = await api.lookups.createUnit(newOptionValue) as any;
                if (res.success) {
                    setUnits(prev => [...prev, newOptionValue]);
                    setFormData(prev => ({ ...prev, primary_unit: newOptionValue }));
                }
            }

            setIsAddOptionModalOpen(false);
            success(`Đã thêm ${optionType === 'category' ? 'nhóm hàng' : 'đơn vị'} mới`);
        } catch (err: any) {
            error(err.message || 'Không thể lưu giá trị mới');
        }
    };

    const handleAddInitialStock = () => {
        setFormData(prev => ({
            ...prev,
            initial_stocks: [...prev.initial_stocks, { warehouse_id: '', quantity: 0 }]
        }));
    };

    const handleRemoveInitialStock = (index: number) => {
        setFormData(prev => ({
            ...prev,
            initial_stocks: prev.initial_stocks.filter((_, i) => i !== index)
        }));
    };

    const handleInitialStockChange = (index: number, field: keyof InitialStock, value: string | number) => {
        setFormData(prev => {
            const newStocks = [...prev.initial_stocks];
            newStocks[index] = { ...newStocks[index], [field]: value };
            return { ...prev, initial_stocks: newStocks };
        });
    };

    const handleSave = async () => {
        try {
            let res: any;
            if (selectedMaterial) {
                res = await api.materials.update(selectedMaterial.id, formData);
            } else {
                res = await api.materials.create(formData as any);
            }

            if (res.success) {
                success(selectedMaterial ? 'Đã cập nhật hàng hóa' : 'Đã thêm hàng hóa mới');
                setIsModalOpen(false);
                fetchData();
            }
        } catch (err: any) {
            error(err.message || 'Có lỗi xảy ra khi lưu hàng hóa');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Hàng hóa</h1>
                    <p className="text-slate-500 mt-1">Quản lý danh mục hàng hóa và tỷ trọng quy đổi</p>
                </div>
                <Button onClick={handleAdd} leftIcon={<Plus className="w-4 h-4" />}>
                    Thêm hàng hóa
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Tìm theo mã hoặc tên hàng hóa..."
                                leftIcon={<Search className="w-4 h-4" />}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select
                                options={[
                                    { value: '', label: 'Tất cả danh mục' },
                                    ...categories.map(c => ({ value: c, label: c }))
                                ]}
                                className="w-40"
                            />
                            <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
                                Xuất Excel
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="spinner w-8 h-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                </div>
            ) : (
                <Table data={materials as any} columns={columns as any} />
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

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedMaterial ? 'Chỉnh sửa hàng hóa' : 'Thêm hàng hóa mới'}
                size="lg"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleSave}>
                            {selectedMaterial ? 'Cập nhật' : 'Thêm mới'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            id="material_type"
                            label="Loại hàng (*)"
                            options={[
                                { value: 'Sản phẩm vật lý', label: 'Sản phẩm vật lý' },
                                { value: 'Dịch vụ', label: 'Dịch vụ' }
                            ]}
                            value={formData.material_type}
                            onChange={handleInputChange as any}
                        />
                        <Input
                            id="code"
                            label="Mã hàng (*)"
                            placeholder="VD: SP01"
                            value={formData.code}
                            onChange={handleInputChange}
                            disabled={!!selectedMaterial}
                        />
                    </div>

                    <Input
                        id="name"
                        label="Tên hàng, nhãn hiệu... (*)"
                        placeholder="VD: Sản phẩm 1"
                        value={formData.name}
                        onChange={handleInputChange}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <Select
                                    id="category"
                                    label="Nhóm hàng (*)"
                                    options={[
                                        { value: '', label: 'Chọn nhóm hàng' },
                                        ...categories.map(c => ({ value: c, label: c }))
                                    ]}
                                    value={formData.category}
                                    onChange={handleInputChange as any}
                                />
                            </div>
                            <Button
                                variant="secondary"
                                className="px-3"
                                onClick={() => handleAddOption('category')}
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <Select
                                    id="primary_unit"
                                    label="Đơn vị tính (*)"
                                    options={units.map(u => ({ value: u, label: u }))}
                                    value={formData.primary_unit}
                                    onChange={handleInputChange as any}
                                />
                            </div>
                            <Button
                                variant="secondary"
                                className="px-3"
                                onClick={() => handleAddOption('unit')}
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <Input
                            id="purchase_price"
                            label="Giá nhập"
                            type="text"
                            placeholder="100,000"
                            value={formData.purchase_price ? formatNumber(formData.purchase_price, 0) : ''}
                            onChange={handleCurrencyChange}
                        />
                        <Input
                            id="sale_price"
                            label="Giá bán lẻ"
                            type="text"
                            placeholder="150,000"
                            value={formData.sale_price ? formatNumber(formData.sale_price, 0) : ''}
                            onChange={handleCurrencyChange}
                        />
                        <Input
                            id="wholesale_price"
                            label="Giá đại lý"
                            type="text"
                            placeholder="120,000"
                            value={formData.wholesale_price ? formatNumber(formData.wholesale_price, 0) : ''}
                            onChange={handleCurrencyChange}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <Input
                            id="vat_percentage"
                            label="(%) VAT"
                            type="number"
                            value={formData.vat_percentage}
                            onChange={handleInputChange}
                        />
                        <Input
                            id="current_density"
                            label="Tỷ trọng (Quy đổi)"
                            type="number"
                            step="0.01"
                            value={formData.current_density}
                            onChange={handleInputChange}
                        />
                        <Input
                            id="secondary_unit"
                            label="Đơn vị phụ"
                            value={formData.secondary_unit}
                            onChange={handleInputChange}
                        />
                    </div>

                    <div className="mb-4">
                        <Input
                            id="description"
                            label="Ghi chú"
                            placeholder="Nhập ghi chú (nếu có)"
                            value={formData.description}
                            onChange={handleInputChange}
                        />
                    </div>

                    {/* Initial Stock Section */}
                    {!selectedMaterial && (
                        <div className="border-t pt-4 mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold text-primary-700">--- Tồn bắt đầu ---</h3>
                                <Button size="sm" variant="secondary" onClick={handleAddInitialStock}>
                                    <Plus className="w-3 h-3 mr-1" /> Thêm kho
                                </Button>
                            </div>
                            {formData.initial_stocks.map((stock, idx) => (
                                <div key={idx} className="flex gap-2 items-end mb-2">
                                    <div className="flex-1">
                                        <Select
                                            options={[
                                                { value: '', label: 'Chọn kho' },
                                                ...warehouses.map(w => ({ value: w.id, label: w.name }))
                                            ]}
                                            value={stock.warehouse_id}
                                            onChange={(e) => handleInitialStockChange(idx, 'warehouse_id', e.target.value)}
                                        />
                                    </div>
                                    <div className="w-32">
                                        <Input
                                            type="number"
                                            placeholder="Số lượng"
                                            value={stock.quantity}
                                            onChange={(e) => handleInitialStockChange(idx, 'quantity', parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <Button variant="secondary" className="px-3" onClick={() => handleRemoveInitialStock(idx)}>
                                        <Minus className="w-4 h-4 text-danger-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            {/* Quick Add Option Modal */}
            <Modal
                isOpen={isAddOptionModalOpen}
                onClose={() => setIsAddOptionModalOpen(false)}
                title={`Thêm ${optionType === 'category' ? 'nhóm hàng' : 'đơn vị'} mới`}
                size="sm"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setIsAddOptionModalOpen(false)}>Hủy</Button>
                        <Button onClick={saveNewOption}>Lưu</Button>
                    </div>
                }
            >
                <div className="p-1">
                    <Input
                        label="Tên mới"
                        value={newOptionValue}
                        onChange={(e) => setNewOptionValue(e.target.value)}
                        autoFocus
                    />
                </div>
            </Modal>

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                title="Xác nhận xóa"
                message={`Bạn có chắc muốn xóa hàng hóa "${selectedMaterial?.name}"?`}
            />
        </div>
    );
}
