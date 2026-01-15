import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Printer, Factory, Plus, Trash2, Calculator } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import {
    Card,
    CardContent,
    CardHeader,
    Button,
    Input,
    Select,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { PrintPurchaseReceipt } from '@/components/PrintPurchaseReceipt';
import { Material, Warehouse, Project, SystemSettings } from '@/types';

interface PurchaseItem {
    material_id: string;
    material?: Material;
    quantity_primary: number; // For backend: Tấn
    unit_price: number;

    // Display fields for consistency with Export style
    display_quantity: number;
    display_unit: string;
    display_price: number;
}

interface FormData {
    warehouse_id: string;
    project_id: string;
    supplier_name: string;
    supplier_phone: string;
    invoice_number: string;
    invoice_date: string;
    receipt_date: string;
    notes: string;
    items: PurchaseItem[];
}

export function PurchaseFormPage() {
    const navigate = useNavigate();
    const { success, error } = useToast();
    const printRef = useRef<HTMLDivElement>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [createdReceipt, setCreatedReceipt] = useState<any>(null);
    const [settings, setSettings] = useState<SystemSettings | null>(null);

    // Options
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);

    // Form data
    const [formData, setFormData] = useState<FormData>({
        warehouse_id: '',
        project_id: '',
        supplier_name: '',
        supplier_phone: '',
        invoice_number: '',
        invoice_date: '',
        receipt_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: []
    });

    // Temporary state for adding new item
    const [currentItem, setCurrentItem] = useState<{
        material_id: string;
        quantity: number;
        unit: string;
        price: number;
    }>({
        material_id: '',
        quantity: 0,
        unit: '',
        price: 0
    });

    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Phieu_Nhap_${createdReceipt?.receipt_number || ''}`,
    });

    const fetchOptions = useCallback(async () => {
        setIsLoading(true);
        try {
            const [warehousesRes, materialsRes, projectsRes, settingsRes] = await Promise.all([
                api.warehouses.getAll({ limit: 1000 }),
                api.materials.getAll({ limit: 1000 }),
                api.projects.getAll({ limit: 1000 }),
                api.settings.get()
            ]) as any[];

            if (warehousesRes.success) setWarehouses(Array.isArray(warehousesRes.data) ? warehousesRes.data : warehousesRes.data.items || []);
            if (materialsRes.success) setMaterials(Array.isArray(materialsRes.data) ? materialsRes.data : materialsRes.data.items || []);
            if (projectsRes.success) setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : projectsRes.data.items || []);

            if (settingsRes) setSettings(settingsRes);
        } catch (err) {
            console.error(err);
            error('Không thể tải dữ liệu danh mục');
        } finally {
            setIsLoading(false);
        }
    }, [error]);

    useEffect(() => {
        fetchOptions();
    }, [fetchOptions]);

    // Handle Material Selection for temporary item
    useEffect(() => {
        if (currentItem.material_id) {
            const mat = materials.find(m => m.id === currentItem.material_id);
            setSelectedMaterial(mat || null);
            if (mat) {
                // Default to primary unit (usually Tấn) for Purchases
                if (!currentItem.unit || (currentItem.unit !== mat.primary_unit && currentItem.unit !== mat.secondary_unit)) {
                    setCurrentItem(prev => ({ ...prev, unit: mat.primary_unit }));
                }

                // If no price set, use purchase price
                if (!currentItem.price && mat.purchase_price) {
                    setCurrentItem(prev => ({ ...prev, price: mat.purchase_price || 0 }));
                }
            } else {
                setCurrentItem(prev => ({ ...prev, unit: '', price: 0 }));
            }
        } else {
            setSelectedMaterial(null);
            setCurrentItem(prev => ({ ...prev, unit: '', price: 0 }));
        }
    }, [currentItem.material_id, materials]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleItemInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setCurrentItem(prev => ({
            ...prev,
            [id]: (id === 'quantity' || id === 'price') ? (parseFloat(value) || 0) : value
        }));
    };

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        const rawValue = value.replace(/\D/g, '');
        const numValue = rawValue ? parseInt(rawValue, 10) : 0;
        setCurrentItem(prev => ({ ...prev, [id]: numValue }));
    };

    const addItem = () => {
        if (!currentItem.material_id) {
            error('Vui lòng chọn vật tư');
            return;
        }
        if (!currentItem.quantity || currentItem.quantity <= 0) {
            error('Số lượng phải lớn hơn 0');
            return;
        }

        const material = materials.find(m => m.id === currentItem.material_id);
        if (!material) return;

        let quantity_primary = 0;
        let unit_price_primary = 0;
        const density = material.current_density || 1; // Tấn/m3

        if (currentItem.unit === material.primary_unit) {
            // Selected Primary unit (Tấn)
            quantity_primary = currentItem.quantity;
            unit_price_primary = currentItem.price;
        } else {
            // Selected Secondary unit (m3) - Convert to Tấn
            // Density = Tấn / m3 => Tấn = m3 * Density
            quantity_primary = currentItem.quantity * density;

            // Price/Tấn = Price/m3 / Density
            unit_price_primary = currentItem.price / density;
        }

        setFormData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    material_id: currentItem.material_id,
                    material,
                    quantity_primary,
                    unit_price: unit_price_primary,
                    display_quantity: currentItem.quantity,
                    display_unit: currentItem.unit,
                    display_price: currentItem.price
                }
            ]
        }));

        // Reset quantity/price
        setCurrentItem(prev => ({
            ...prev,
            quantity: 0,
            price: 0
        }));
    };

    const removeItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => sum + (item.display_quantity * item.display_price), 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.warehouse_id) {
            error('Vui lòng chọn kho nhập');
            return;
        }
        if (formData.items.length === 0) {
            error('Vui lòng thêm ít nhất một vật tư');
            return;
        }

        setIsSubmitting(true);
        try {
            // Map items for API (backend expects quantity_primary, unit_price)
            const apiData = {
                ...formData,
                items: formData.items.map(item => ({
                    material_id: item.material_id,
                    quantity_primary: item.quantity_primary,
                    unit_price: item.unit_price
                }))
            };

            const res = await api.purchases.create(apiData) as any;

            if (res.success) {
                // Fetch full detail for printing
                const detailRes = await api.purchases.getById(res.data.id) as any;
                setCreatedReceipt(detailRes.data);
                setIsSuccess(true);
                success(res.message || 'Tạo phiếu nhập thành công');
            }
        } catch (err: any) {
            error(err.message || 'Có lỗi xảy ra khi lưu phiếu');
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentItemTotal = currentItem.quantity * currentItem.price;

    if (isSuccess && createdReceipt) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => navigate('/purchases')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                        Về danh sách
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => handlePrint()} leftIcon={<Printer className="w-4 h-4" />}>
                            In phiếu
                        </Button>
                        <Button onClick={() => {
                            setIsSuccess(false);
                            setCreatedReceipt(null);
                            setFormData({
                                warehouse_id: '',
                                project_id: '',
                                supplier_name: '',
                                supplier_phone: '',
                                invoice_number: '',
                                invoice_date: '',
                                receipt_date: new Date().toISOString().split('T')[0],
                                notes: '',
                                items: []
                            });
                        }}>
                            Tạo phiếu mới
                        </Button>
                    </div>
                </div>

                <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
                    <CardContent className="py-8 text-center text-slate-800">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-blue-900 mb-2">Tạo phiếu nhập thành công!</h2>
                        <p className="text-blue-700">Số phiếu: <span className="font-mono font-bold">{createdReceipt.receipt_number}</span></p>

                        <div className="mt-4 text-left max-w-lg mx-auto bg-white p-4 rounded-xl border border-blue-100 shadow-sm text-sm">
                            <p className="flex justify-between py-1"><strong>Ngày nhập:</strong> <span>{formatDate(createdReceipt.receipt_date)}</span></p>
                            <p className="flex justify-between py-1"><strong>Kho:</strong> <span>{createdReceipt.warehouse?.name}</span></p>
                            {createdReceipt.supplier_name && (
                                <p className="flex justify-between py-1"><strong>Nhà CC:</strong> <span>{createdReceipt.supplier_name}</span></p>
                            )}
                            <p className="border-t mt-2 pt-2 flex justify-between"><strong>Tổng tiền:</strong> <span className="text-blue-600 font-bold">{formatCurrency(createdReceipt.total_amount)}</span></p>
                        </div>
                    </CardContent>
                </Card>

                <div className="hidden">
                    <div ref={printRef}>
                        <PrintPurchaseReceipt receipt={createdReceipt} settings={settings || undefined} />
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="spinner w-8 h-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/purchases')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    Quay lại
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Tạo phiếu nhập mua</h1>
                    <p className="text-slate-500">Nhập vật tư từ nhà cung cấp về kho</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Info */}
                        <Card>
                            <CardHeader title="Thông tin chung" />
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Select
                                        id="warehouse_id"
                                        label="Kho nhập (*)"
                                        options={[
                                            { value: '', label: 'Chọn kho' },
                                            ...warehouses.map(w => ({ value: w.id, label: w.name }))
                                        ]}
                                        value={formData.warehouse_id}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    <Input
                                        id="receipt_date"
                                        label="Ngày nhập (*)"
                                        type="date"
                                        value={formData.receipt_date}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <Select
                                    id="project_id"
                                    label="Dự án"
                                    options={[
                                        { value: '', label: 'Chọn dự án (không bắt buộc)' },
                                        ...projects.map(p => ({ value: p.id, label: p.name }))
                                    ]}
                                    value={formData.project_id}
                                    onChange={handleInputChange}
                                />
                            </CardContent>
                        </Card>

                        {/* Items */}
                        <Card>
                            <CardHeader title="Chi tiết vật tư" />
                            <CardContent className="space-y-6">
                                {/* Add Item Form */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <Select
                                            id="material_id"
                                            label="Chọn vật tư"
                                            options={[
                                                { value: '', label: 'Chọn vật tư' },
                                                ...materials.map(m => ({ value: m.id, label: `${m.code} - ${m.name}` }))
                                            ]}
                                            value={currentItem.material_id}
                                            onChange={handleItemInputChange}
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <Input
                                                        id="quantity"
                                                        label="Số lượng"
                                                        type="number"
                                                        step="0.01"
                                                        value={currentItem.quantity || ''}
                                                        onChange={handleItemInputChange}
                                                    />
                                                </div>
                                                <div className="w-[100px]">
                                                    <Select
                                                        id="unit"
                                                        label="ĐVT"
                                                        options={selectedMaterial ? [
                                                            { value: selectedMaterial.primary_unit, label: selectedMaterial.primary_unit },
                                                            { value: selectedMaterial.secondary_unit, label: selectedMaterial.secondary_unit }
                                                        ] : []}
                                                        value={currentItem.unit}
                                                        onChange={handleItemInputChange}
                                                        disabled={!selectedMaterial}
                                                    />
                                                </div>
                                            </div>
                                            <Input
                                                id="price"
                                                label={`Đơn giá (${currentItem.unit ? `/${currentItem.unit}` : ''})`}
                                                value={currentItem.price ? formatNumber(currentItem.price, 0) : ''}
                                                onChange={handleCurrencyChange}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center px-1">
                                        <div className="text-sm">
                                            Thành tiền: <span className="font-bold text-success-600 text-base">{formatCurrency(currentItemTotal)}</span>
                                        </div>
                                        <Button type="button" size="sm" onClick={addItem} leftIcon={<Plus className="w-4 h-4" />}>
                                            Thêm vật tư
                                        </Button>
                                    </div>
                                </div>

                                {/* Items List */}
                                {formData.items.length > 0 ? (
                                    <div className="border rounded-lg overflow-hidden shadow-sm">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 border-b">
                                                <tr>
                                                    <th className="p-3 text-left">Vật tư</th>
                                                    <th className="p-3 text-right">Số lượng</th>
                                                    <th className="p-3 text-right">Đơn giá</th>
                                                    <th className="p-3 text-right">Thành tiền</th>
                                                    <th className="p-3 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {formData.items.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="p-3">
                                                            <div className="font-medium text-slate-900">{item.material?.name}</div>
                                                            <div className="text-xs text-slate-500 font-mono">{item.material?.code}</div>
                                                        </td>
                                                        <td className="p-3 text-right font-medium">
                                                            {formatNumber(item.display_quantity, 2)} {item.display_unit}
                                                        </td>
                                                        <td className="p-3 text-right text-slate-600 font-mono">
                                                            {formatNumber(item.display_price, 0)}
                                                        </td>
                                                        <td className="p-3 text-right font-semibold text-slate-900">
                                                            {formatCurrency(item.display_quantity * item.display_price)}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItem(idx)}
                                                                className="p-1.5 text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-slate-50 font-bold border-t">
                                                <tr>
                                                    <td colSpan={3} className="p-4 text-right text-slate-600 uppercase tracking-wider text-xs">Tổng cộng:</td>
                                                    <td className="p-4 text-right text-success-600 text-lg font-mono">
                                                        {formatCurrency(calculateTotal())}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-slate-400 border-2 border-dashed rounded-xl bg-slate-50/50">
                                        <p className="flex flex-col items-center gap-2">
                                            <Calculator className="w-8 h-8 text-slate-300" />
                                            Chưa có vật tư nào được chọn
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Supplier & Invoice Info */}
                        <Card>
                            <CardHeader title="Thông tin nhà cung cấp & Hóa đơn" />
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        id="supplier_name"
                                        label="Tên nhà cung cấp"
                                        placeholder="Nhập tên nhà cung cấp"
                                        leftIcon={<Factory className="w-4 h-4" />}
                                        value={formData.supplier_name}
                                        onChange={handleInputChange}
                                    />
                                    <Input
                                        id="supplier_phone"
                                        label="Số điện thoại"
                                        placeholder="0123..."
                                        value={formData.supplier_phone}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        id="invoice_number"
                                        label="Số hóa đơn"
                                        placeholder="VD: 0001234"
                                        value={formData.invoice_number}
                                        onChange={handleInputChange}
                                    />
                                    <Input
                                        id="invoice_date"
                                        label="Ngày hóa đơn"
                                        type="date"
                                        value={formData.invoice_date}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                                    <textarea
                                        id="notes"
                                        rows={3}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                                        placeholder="Nhập ghi chú thêm nếu có..."
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Summary Sidebar */}
                    <div className="space-y-6">
                        <Card className="sticky top-4">
                            <CardHeader title="Tổng quan" />
                            <CardContent className="space-y-6">
                                <div className="space-y-3">
                                    <div className="p-4 bg-blue-50 rounded-xl text-center border border-blue-100">
                                        <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Tổng tiền dự kiến</p>
                                        <p className="text-2xl font-bold text-blue-700 font-mono">
                                            {formatCurrency(calculateTotal())}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl flex justify-between items-center px-4 border border-slate-100">
                                        <span className="text-sm text-slate-600">Số loại vật tư</span>
                                        <span className="text-lg font-bold text-slate-800">{formData.items.length}</span>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full text-base py-6 shadow-lg shadow-primary-200"
                                    disabled={isSubmitting}
                                    leftIcon={<Save className="w-5 h-5" />}
                                >
                                    {isSubmitting ? 'Đang lưu phiếu...' : 'Tạo phiếu nhập'}
                                </Button>

                                <p className="text-[11px] text-center text-slate-400 italic">
                                    Dữ liệu sẽ được cập nhật vào kho ngay khi phiếu được tạo
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
}

function formatDate(date: string) {
    if (!date) return '-';
    try {
        const d = new Date(date);
        return d.toLocaleDateString('vi-VN');
    } catch {
        return date;
    }
}
