import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Printer, Truck, MapPin, Plus, Trash2 } from 'lucide-react';
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
import { PrintExportReceipt } from '@/components/PrintExportReceipt';

interface Material {
    id: string;
    code: string;
    name: string;
    primary_unit: string;
    secondary_unit: string;
    current_density: number;
    sale_price?: number;
}

interface Warehouse {
    id: string;
    name: string;
}

interface Project {
    id: string;
    name: string;
    code: string;
}

interface Vehicle {
    id: string;
    plate_number: string;
    driver_name?: string;
    capacity_tons?: number;
}

interface ExportItem {
    material_id: string;
    material?: Material;
    quantity_secondary: number;
    unit_price: number;

    // Display fields for UI to show exactly what user entered
    display_quantity: number;
    display_unit: string;
    display_price: number;
}

interface FormData {
    warehouse_id: string;
    project_id: string;
    vehicle_id: string;
    customer_name: string;
    customer_phone: string;
    destination: string;
    receipt_date: string;
    notes: string;
    items: ExportItem[];
}

export function ExportFormPage() {
    const navigate = useNavigate();
    const { success, error } = useToast();
    const printRef = useRef<HTMLDivElement>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [createdReceipt, setCreatedReceipt] = useState<any>(null);

    // Options for selects
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);

    // Form data
    const [formData, setFormData] = useState<FormData>({
        warehouse_id: '',
        project_id: '',
        vehicle_id: '',
        customer_name: '',
        customer_phone: '',
        destination: '',
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
        documentTitle: `Phieu_Xuat_${createdReceipt?.receipt_number || ''}`,
    });

    const fetchOptions = useCallback(async () => {
        setIsLoading(true);
        try {
            const [warehousesRes, materialsRes, projectsRes, vehiclesRes] = await Promise.all([
                api.warehouses.getAll(),
                api.materials.getAll({ limit: 100 }),
                api.projects.getAll({ limit: 100 }),
                api.vehicles.getAll({ limit: 100 })
            ]) as any[];

            // Updated logic to handle pagination structure or flat array safely
            if (warehousesRes.success) setWarehouses(Array.isArray(warehousesRes.data) ? warehousesRes.data : warehousesRes.data.items || []);
            if (materialsRes.success) setMaterials(Array.isArray(materialsRes.data) ? materialsRes.data : materialsRes.data.items || []);
            if (projectsRes.success) setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : projectsRes.data.items || []);
            if (vehiclesRes.success) setVehicles(Array.isArray(vehiclesRes.data) ? vehiclesRes.data : vehiclesRes.data.items || []);
        } catch (err) {
            console.error(err);
            error('Không thể tải dữ liệu');
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
                // If unit is not set or invalid for this material, default to secondary (usually m3)
                if (!currentItem.unit || (currentItem.unit !== mat.primary_unit && currentItem.unit !== mat.secondary_unit)) {
                    setCurrentItem(prev => ({ ...prev, unit: mat.secondary_unit }));
                }

                // If no price set, use sale price
                if (!currentItem.price && mat.sale_price) {
                    setCurrentItem(prev => ({ ...prev, price: mat.sale_price || 0 }));
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
        const { id, value } = e.target; // id should be 'price'
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

        let quantity_secondary = 0;
        let unit_price_secondary = 0;
        const density = material.current_density || 1; // Tấn/m3

        if (currentItem.unit === material.secondary_unit) {
            // Selected default unit (m3) - No conversion needed
            quantity_secondary = currentItem.quantity;
            unit_price_secondary = currentItem.price;
        } else {
            // Selected primary unit (Tấn) - Convert to m3
            // Density = Tấn / m3 => m3 = Tấn / Density
            quantity_secondary = currentItem.quantity / density;

            // Price/m3 = Price/Tấn * Density
            // E.g. 100k/Tấn. Density 1.5 Tấn/m3. 
            // 1 m3 = 1.5 Tấn -> Price = 1.5 * 100k = 150k. Correct.
            unit_price_secondary = currentItem.price * density;
        }

        setFormData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    material_id: currentItem.material_id,
                    material,
                    quantity_secondary,
                    unit_price: unit_price_secondary,
                    display_quantity: currentItem.quantity,
                    display_unit: currentItem.unit,
                    display_price: currentItem.price
                }
            ]
        }));

        // Reset current item form (keep selected but clear values)
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
        // Calculate based on display values to match what user sees
        return formData.items.reduce((sum, item) => sum + (item.display_quantity * item.display_price), 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.warehouse_id) {
            error('Vui lòng chọn kho');
            return;
        }
        if (!formData.project_id) {
            error('Vui lòng chọn dự án');
            return;
        }
        if (formData.items.length === 0) {
            error('Vui lòng thêm ít nhất một vật tư');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await api.exports.create(formData) as any;

            if (res.success) {
                setCreatedReceipt(res.data);
                setIsSuccess(true);
                success(res.message || 'Tạo phiếu xuất thành công');
            }
        } catch (err: any) {
            error(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate current item total
    const currentItemTotal = currentItem.quantity * currentItem.price;

    if (isSuccess && createdReceipt) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => navigate('/exports')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
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
                                vehicle_id: '',
                                customer_name: '',
                                customer_phone: '',
                                destination: '',
                                receipt_date: new Date().toISOString().split('T')[0],
                                notes: '',
                                items: []
                            });
                        }}>
                            Tạo phiếu mới
                        </Button>
                    </div>
                </div>

                {/* Success Card */}
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="py-8 text-center">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Truck className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-green-800 mb-2">Tạo phiếu xuất thành công!</h2>
                        <p className="text-green-700">Số phiếu: <span className="font-mono font-bold">{createdReceipt.receipt_number}</span></p>
                        <div className="mt-4 text-left max-w-lg mx-auto bg-white p-4 rounded border text-sm">
                            <p><strong>Ngày xuất:</strong> {createdReceipt.receipt_date}</p>
                            <p><strong>Kho:</strong> {createdReceipt.warehouse?.name}</p>
                            <p><strong>Dự án:</strong> {createdReceipt.project?.name}</p>
                            <p className="border-t mt-2 pt-2"><strong>Tổng tiền:</strong> {formatCurrency(createdReceipt.total_amount)}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Print Template (Hidden) */}
                <div className="hidden">
                    <PrintExportReceipt ref={printRef} receipt={createdReceipt} />
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
                <Button variant="ghost" onClick={() => navigate('/exports')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    Quay lại
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Tạo phiếu xuất kho</h1>
                    <p className="text-slate-500">Xuất vật tư cho dự án / công trình</p>
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
                                        label="Kho xuất (*)"
                                        options={[
                                            { value: '', label: 'Chọn kho' },
                                            ...warehouses.map(w => ({ value: w.id, label: w.name }))
                                        ]}
                                        value={formData.warehouse_id}
                                        onChange={handleInputChange}
                                    />
                                    <Input
                                        id="receipt_date"
                                        label="Ngày xuất (*)"
                                        type="date"
                                        value={formData.receipt_date}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <Select
                                    id="project_id"
                                    label="Dự án (*)"
                                    options={[
                                        { value: '', label: 'Chọn dự án' },
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
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
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
                                                        label={`Số lượng`}
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
                                                            { value: selectedMaterial.secondary_unit, label: selectedMaterial.secondary_unit },
                                                            { value: selectedMaterial.primary_unit, label: selectedMaterial.primary_unit }
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
                                    <div className="flex justify-between items-center">
                                        <div className="text-sm">
                                            Thành tiền: <span className="font-bold text-success-600">{formatCurrency(currentItemTotal)}</span>
                                        </div>
                                        <Button type="button" size="sm" onClick={addItem} leftIcon={<Plus className="w-4 h-4" />}>
                                            Thêm vật tư
                                        </Button>
                                    </div>
                                </div>

                                {/* Items List */}
                                {formData.items.length > 0 ? (
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-100">
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
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="p-3">
                                                            <div className="font-medium">{item.material?.name}</div>
                                                            <div className="text-xs text-slate-500">{item.material?.code}</div>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            {formatNumber(item.display_quantity, 2)} {item.display_unit}
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            {formatCurrency(item.display_price)}
                                                        </td>
                                                        <td className="p-3 text-right font-medium">
                                                            {formatCurrency(item.display_quantity * item.display_price)}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItem(idx)}
                                                                className="text-slate-400 hover:text-danger-500 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-slate-50 font-semibold">
                                                <tr>
                                                    <td colSpan={3} className="p-3 text-right">Tổng cộng:</td>
                                                    <td className="p-3 text-right text-success-600">{formatCurrency(calculateTotal())}</td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded-lg">
                                        <p>Chưa có vật tư nào được thêm</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Vehicle Info */}
                        <Card>
                            <CardHeader title="Thông tin xe vận chuyển" />
                            <CardContent className="space-y-4">
                                <Select
                                    id="vehicle_id"
                                    label="Chọn xe"
                                    options={[
                                        { value: '', label: 'Chọn xe (không bắt buộc)' },
                                        ...vehicles.map(v => ({
                                            value: v.id,
                                            label: `${v.plate_number}${v.driver_name ? ` - ${v.driver_name}` : ''}`
                                        }))
                                    ]}
                                    value={formData.vehicle_id}
                                    onChange={handleInputChange}
                                />
                            </CardContent>
                        </Card>

                        {/* Customer Info */}
                        <Card>
                            <CardHeader title="Thông tin khách hàng" />
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        id="customer_name"
                                        label="Tên khách hàng"
                                        placeholder="Nhập tên khách hàng"
                                        value={formData.customer_name}
                                        onChange={handleInputChange}
                                    />
                                    <Input
                                        id="customer_phone"
                                        label="Số điện thoại"
                                        placeholder="0123 456 789"
                                        value={formData.customer_phone}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <Input
                                    id="destination"
                                    label="Địa điểm giao hàng"
                                    placeholder="Nhập địa chỉ giao hàng"
                                    leftIcon={<MapPin className="w-4 h-4" />}
                                    value={formData.destination}
                                    onChange={handleInputChange}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                                    <textarea
                                        id="notes"
                                        rows={3}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="Nhập ghi chú (nếu có)"
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
                            <CardContent className="space-y-4">
                                <div className="p-4 bg-blue-50 rounded-lg text-center">
                                    <p className="text-sm text-blue-600 mb-1">Tổng tiền dự kiến</p>
                                    <p className="text-2xl font-bold text-blue-700 font-mono">
                                        {formatCurrency(calculateTotal())}
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg text-center">
                                    <p className="text-sm text-slate-600 mb-1">Số loại vật tư</p>
                                    <p className="text-xl font-bold text-slate-800">
                                        {formData.items.length}
                                    </p>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    isLoading={isSubmitting}
                                    leftIcon={<Save className="w-4 h-4" />}
                                >
                                    Tạo phiếu xuất
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
}
