import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Save, Package, Calendar, FileText, MapPin, 
    Building2, Plus, Trash2, Loader2
} from 'lucide-react';
import {
    Card,
    CardContent,
    Button,
    Input,
    Select,
    Label,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface Material {
    id: string;
    code: string;
    name: string;
    current_density: number;
    purchase_price: number;
}

interface ReceiptItem {
    id?: string;
    material_id: string;
    material?: Material;
    quantity_primary: number;
    quantity_secondary: number;
    unit_price: number;
    total_amount: number;
}

interface ReceiptData {
    id: string;
    receipt_number: string;
    receipt_type: 'direct_to_site' | 'warehouse_import';
    receipt_date: string;
    notes: string;
    items: ReceiptItem[];
    direct_to_site_details?: {
        quarry_name: string;
        supplier_name: string;
        supplier_phone?: string;
        destination_site?: string;
    };
    warehouse_import_details?: {
        warehouse_id?: string;
        project_id?: string;
        supplier_name?: string;
        warehouse?: { name: string };
        project?: { name: string };
    };
}

export function PurchaseEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { success, error } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [receipt, setReceipt] = useState<ReceiptData | null>(null);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        receipt_date: '',
        notes: '',
        direct_to_site_details: {
            quarry_name: '',
            supplier_name: '',
            supplier_phone: '',
            destination_site: ''
        },
        warehouse_import_details: {
            warehouse_id: '',
            project_id: '',
            supplier_name: ''
        }
    });
    const [items, setItems] = useState<ReceiptItem[]>([]);

    // Fetch data
    const fetchData = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const [receiptRes, materialsRes, warehousesRes, projectsRes] = await Promise.all([
                api.purchases.getById(id),
                api.materials.getAll({ limit: 500, is_active: true }),
                api.warehouses.getAll({ limit: 100 }),
                api.projects.getAll({ limit: 100 })
            ]) as any[];

            if (receiptRes.success) {
                const data = receiptRes.data;
                setReceipt(data);
                setFormData({
                    receipt_date: data.receipt_date?.split('T')[0] || '',
                    notes: data.notes || '',
                    direct_to_site_details: data.direct_to_site_details || {
                        quarry_name: '',
                        supplier_name: '',
                        supplier_phone: '',
                        destination_site: ''
                    },
                    warehouse_import_details: {
                        warehouse_id: data.warehouse_import_details?.warehouse_id || '',
                        project_id: data.warehouse_import_details?.project_id || '',
                        supplier_name: data.warehouse_import_details?.supplier_name || ''
                    }
                });
                setItems(data.items?.map((item: ReceiptItem) => ({
                    ...item,
                    material_id: item.material_id,
                    quantity_primary: item.quantity_primary || 0,
                    quantity_secondary: item.quantity_secondary || 0,
                    unit_price: item.unit_price || 0,
                    total_amount: item.total_amount || 0
                })) || []);
            }
            if (materialsRes.success) setMaterials(materialsRes.data?.items || materialsRes.data || []);
            if (warehousesRes.success) setWarehouses(warehousesRes.data?.items || warehousesRes.data || []);
            if (projectsRes.success) setProjects(projectsRes.data?.items || projectsRes.data || []);
        } catch (err: any) {
            error(err.message || 'Không thể tải dữ liệu');
        } finally {
            setIsLoading(false);
        }
    }, [id, error]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle item changes
    const handleItemChange = (index: number, field: keyof ReceiptItem, value: string | number) => {
        setItems(prev => {
            const newItems = [...prev];
            const item = { ...newItems[index] };
            
            if (field === 'material_id') {
                const material = materials.find(m => m.id === value);
                item.material_id = value as string;
                if (material) {
                    item.unit_price = material.purchase_price || 0;
                }
            } else if (field === 'quantity_primary') {
                item.quantity_primary = parseFloat(value as string) || 0;
                const material = materials.find(m => m.id === item.material_id);
                const density = material?.current_density || 1;
                item.quantity_secondary = item.quantity_primary / density;
            } else if (field === 'unit_price') {
                item.unit_price = parseFloat((value as string).replace(/\D/g, '')) || 0;
            }
            
            item.total_amount = item.quantity_primary * item.unit_price;
            newItems[index] = item;
            return newItems;
        });
    };

    const addItem = () => {
        setItems(prev => [...prev, {
            material_id: '',
            quantity_primary: 0,
            quantity_secondary: 0,
            unit_price: 0,
            total_amount: 0
        }]);
    };

    const removeItem = (index: number) => {
        if (items.length <= 1) {
            error('Phải có ít nhất 1 vật tư');
            return;
        }
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    // Save changes
    const handleSave = async () => {
        if (!id || !receipt) return;

        // Validate
        if (items.length === 0 || items.some(i => !i.material_id)) {
            error('Vui lòng chọn vật tư cho tất cả các dòng');
            return;
        }

        setIsSaving(true);
        try {
            const payload: any = {
                receipt_date: formData.receipt_date,
                notes: formData.notes,
                items: items.map(item => ({
                    material_id: item.material_id,
                    quantity_primary: item.quantity_primary,
                    unit_price: item.unit_price,
                    notes: ''
                }))
            };

            if (receipt.receipt_type === 'direct_to_site') {
                payload.direct_to_site_details = formData.direct_to_site_details;
            } else {
                payload.warehouse_import_details = formData.warehouse_import_details;
            }

            const res = await api.purchases.update(id, payload) as any;
            if (res.success) {
                success('Cập nhật phiếu thành công');
                navigate(`/purchases/${id}`);
            }
        } catch (err: any) {
            error(err.message || 'Không thể cập nhật phiếu');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin"></div>
                    <p className="text-slate-500 font-medium">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    if (!receipt) {
        return (
            <div className="text-center py-20">
                <p className="text-red-500">Không tìm thấy phiếu</p>
                <Button onClick={() => navigate('/purchases')} className="mt-4">Quay lại</Button>
            </div>
        );
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.total_amount || 0), 0);
    const totalQty = items.reduce((sum, item) => sum + (item.quantity_primary || 0), 0);

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <button 
                            onClick={() => navigate(`/purchases/${id}`)} 
                            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                <FileText className="w-7 h-7 text-primary-400" />
                                Sửa phiếu {receipt.receipt_number}
                            </h1>
                            <p className="text-slate-400 text-sm mt-1">
                                {receipt.receipt_type === 'direct_to_site' ? 'Xuất trực tiếp công trình' : 'Nhập kho tại cảng'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="secondary" 
                            onClick={() => navigate(`/purchases/${id}`)}
                            className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
                        >
                            Hủy
                        </Button>
                        <Button 
                            onClick={handleSave}
                            disabled={isSaving}
                            leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        >
                            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <Card className="overflow-hidden border-0 shadow-lg">
                        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Thông tin chung
                            </h3>
                        </div>
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Ngày phiếu"
                                    type="date"
                                    value={formData.receipt_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, receipt_date: e.target.value }))}
                                />
                                <Input
                                    label="Ghi chú"
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Ghi chú cho phiếu..."
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Type-specific details */}
                    {receipt.receipt_type === 'direct_to_site' ? (
                        <Card className="overflow-hidden border-0 shadow-lg">
                            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    Thông tin xuất trực tiếp
                                </h3>
                            </div>
                            <CardContent className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Nơi lấy hàng (Mỏ)"
                                        value={formData.direct_to_site_details.quarry_name}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            direct_to_site_details: { ...prev.direct_to_site_details, quarry_name: e.target.value }
                                        }))}
                                    />
                                    <Input
                                        label="Nhà cung cấp"
                                        value={formData.direct_to_site_details.supplier_name}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            direct_to_site_details: { ...prev.direct_to_site_details, supplier_name: e.target.value }
                                        }))}
                                    />
                                    <Input
                                        label="SĐT Nhà cung cấp"
                                        value={formData.direct_to_site_details.supplier_phone || ''}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            direct_to_site_details: { ...prev.direct_to_site_details, supplier_phone: e.target.value }
                                        }))}
                                    />
                                    <Input
                                        label="Nơi giao hàng (Công trình)"
                                        value={formData.direct_to_site_details.destination_site || ''}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            direct_to_site_details: { ...prev.direct_to_site_details, destination_site: e.target.value }
                                        }))}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="overflow-hidden border-0 shadow-lg">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Building2 className="w-4 h-4" />
                                    Thông tin nhập kho
                                </h3>
                            </div>
                            <CardContent className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Select
                                        label="Kho"
                                        value={formData.warehouse_import_details.warehouse_id}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            warehouse_import_details: { ...prev.warehouse_import_details, warehouse_id: e.target.value }
                                        }))}
                                        options={[
                                            { value: '', label: '-- Chọn kho --' },
                                            ...warehouses.map(w => ({ value: w.id, label: w.name }))
                                        ]}
                                    />
                                    <Select
                                        label="Công trình"
                                        value={formData.warehouse_import_details.project_id}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            warehouse_import_details: { ...prev.warehouse_import_details, project_id: e.target.value }
                                        }))}
                                        options={[
                                            { value: '', label: '-- Chọn công trình --' },
                                            ...projects.map(p => ({ value: p.id, label: p.name }))
                                        ]}
                                    />
                                    <Input
                                        label="Nhà cung cấp"
                                        value={formData.warehouse_import_details.supplier_name || ''}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            warehouse_import_details: { ...prev.warehouse_import_details, supplier_name: e.target.value }
                                        }))}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Items */}
                    <Card className="overflow-hidden border-0 shadow-lg">
                        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Danh sách vật tư ({items.length})
                            </h3>
                            <Button 
                                size="sm" 
                                onClick={addItem}
                                leftIcon={<Plus className="w-4 h-4" />}
                                className="bg-white/20 hover:bg-white/30 text-white border-0"
                            >
                                Thêm vật tư
                            </Button>
                        </div>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                {items.map((item, index) => {
                                    const material = materials.find(m => m.id === item.material_id);
                                    return (
                                        <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                                <div className="md:col-span-4">
                                                    <Label>Vật tư</Label>
                                                    <Select
                                                        value={item.material_id}
                                                        onChange={(e) => handleItemChange(index, 'material_id', e.target.value)}
                                                        options={[
                                                            { value: '', label: '-- Chọn vật tư --' },
                                                            ...materials.map(m => ({ value: m.id, label: `${m.code} - ${m.name}` }))
                                                        ]}
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <Label>Số lượng (Tấn)</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.quantity_primary || ''}
                                                        onChange={(e) => handleItemChange(index, 'quantity_primary', e.target.value)}
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <Label>Đơn giá</Label>
                                                    <Input
                                                        value={formatNumber(item.unit_price, 0)}
                                                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <Label>Thành tiền</Label>
                                                    <div className="h-10 px-3 bg-slate-100 rounded-lg flex items-center font-bold text-primary-600">
                                                        {formatCurrency(item.total_amount || 0)}
                                                    </div>
                                                </div>
                                                <div className="md:col-span-2 flex items-end gap-2">
                                                    {material && (
                                                        <div className="text-xs text-slate-500">
                                                            m³: {formatNumber(item.quantity_secondary, 2)}
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => removeItem(index)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Summary Sidebar */}
                <div className="space-y-6">
                    <Card className="overflow-hidden border-0 shadow-lg sticky top-6">
                        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
                            <h3 className="text-base font-bold text-white">Tổng kết</h3>
                        </div>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-center py-3 border-b">
                                <span className="text-slate-600">Số lượng vật tư</span>
                                <span className="font-bold text-slate-900">{items.length}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b">
                                <span className="text-slate-600">Tổng khối lượng</span>
                                <span className="font-bold text-orange-600">{formatNumber(totalQty, 2)} tấn</span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="text-slate-600">Tổng tiền</span>
                                <span className="font-bold text-xl text-primary-600">{formatCurrency(totalAmount)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
