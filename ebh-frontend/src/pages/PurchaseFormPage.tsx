import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Package, Warehouse, Plus, Trash2, ChevronRight, 
    ChevronLeft, Truck, Printer, Check, FileText, ClipboardList,
    Building2, User, Phone, Calendar, Hash, Scale, DollarSign,
    AlertCircle, Sparkles, CheckCircle2
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
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils';
import { Material, Warehouse as WarehouseType, Project, Vehicle, TransportUnit } from '@/types';

type ReceiptType = 'direct_to_site' | 'warehouse_import';

interface PurchaseItem {
    material_id: string;
    material?: Material;
    quantity_primary: number;
    unit_price: number;
}

interface TransportRecordForm {
    transport_date: string;
    transport_company: string;
    vehicle_plate: string;
    ticket_number: string;
    material_id: string;
    quantity_primary: string;
    density: string;
    unit_price: string;
    transport_fee: string;
    vehicle_id: string;
    transport_unit_id: string;
    notes: string;
}

interface FormData {
    receipt_type: ReceiptType;
    receipt_number?: string;
    receipt_date: string;
    notes: string;
    items: PurchaseItem[];
    transport_record: TransportRecordForm;

    // Type-specific fields
    direct_to_site_details?: {
        quarry_name: string;
        supplier_name: string;
        supplier_phone?: string;
        destination_site?: string;
        invoice_number?: string;
        invoice_date?: string;
    };
    warehouse_import_details?: {
        warehouse_id: string;
        project_id?: string;
        supplier_name?: string;
        supplier_phone?: string;
        invoice_number?: string;
        invoice_date?: string;
    };
}

export function PurchaseFormPage() {
    const navigate = useNavigate();
    const { success, error } = useToast();

    const [step, setStep] = useState(1); // 1: Type, 2: Details, 3: Items, 4: Transport, 5: Confirm
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdReceiptId, setCreatedReceiptId] = useState<string | null>(null);

    // Options
    const [materials, setMaterials] = useState<Material[]>([]);
    const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [transportUnits, setTransportUnits] = useState<TransportUnit[]>([]);

    // Form data
    const [formData, setFormData] = useState<FormData>({
        receipt_type: 'warehouse_import',
        receipt_number: '',
        receipt_date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [],
        transport_record: {
            transport_date: new Date().toISOString().split('T')[0],
            transport_company: '',
            vehicle_plate: '',
            ticket_number: '',
            material_id: '',
            quantity_primary: '',
            density: '1',
            unit_price: '',
            transport_fee: '0',
            vehicle_id: '',
            transport_unit_id: '',
            notes: ''
        }
    });

    // Current item being added
    const [currentItem, setCurrentItem] = useState({
        material_id: '',
        quantity_primary: 0,
        price: 0,
        notes: ''
    });


    // Load options
    const fetchOptions = useCallback(async () => {
        setIsLoading(true);
        try {
            const [materialsRes, warehousesRes, projectsRes, vehiclesRes, transportUnitsRes] = await Promise.all([
                api.materials.getAll({ limit: 1000 }),
                api.warehouses.getAll({ limit: 1000 }),
                api.projects.getAll({ limit: 1000 }),
                api.vehicles.getAll({ limit: 1000 }),
                api.transportUnits.getAll({ limit: 1000 })
            ]) as any[];

            if (materialsRes.success) setMaterials(Array.isArray(materialsRes.data) ? materialsRes.data : materialsRes.data.items || []);
            if (warehousesRes.success) setWarehouses(Array.isArray(warehousesRes.data) ? warehousesRes.data : warehousesRes.data.items || []);
            if (projectsRes.success) setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : projectsRes.data.items || []);
            if (vehiclesRes.success) setVehicles(Array.isArray(vehiclesRes.data) ? vehiclesRes.data : vehiclesRes.data.items || []);
            if (transportUnitsRes.success) setTransportUnits(Array.isArray(transportUnitsRes.data) ? transportUnitsRes.data : transportUnitsRes.data.items || []);
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

    // Update transport fee when qty or price in formData changes
    useEffect(() => {
        // Calculate total transport fee for all items
        const totalQty = formData.items.reduce((sum, item) => sum + item.quantity_primary, 0);
        const price = parseFloat(formData.transport_record.unit_price.replace(/\D/g, '')) || 0;
        setFormData(prev => ({
            ...prev,
            transport_record: {
                ...prev.transport_record,
                quantity_primary: totalQty.toString(),
                transport_fee: (totalQty * price).toString()
            }
        }));
    }, [formData.items, formData.transport_record.unit_price]);

    const addItem = () => {
        if (!currentItem.material_id) {
            error('Vui lòng chọn vật tư');
            return;
        }
        if (!currentItem.quantity_primary || currentItem.quantity_primary <= 0) {
            error('Số lượng phải lớn hơn 0');
            return;
        }

        const material = materials.find(m => m.id === currentItem.material_id);
        if (!material) return;

        setFormData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    material_id: currentItem.material_id,
                    material,
                    quantity_primary: currentItem.quantity_primary,
                    unit_price: currentItem.price,
                    notes: currentItem.notes
                }
            ]
        }));

        setCurrentItem({ material_id: '', quantity_primary: 0, price: 0, notes: '' });
    };


    const removeItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };


    const calculateTotalAmount = () => {
        return formData.items.reduce((sum, item) => sum + (item.quantity_primary * item.unit_price), 0);
    };


    const generateReceiptNumber = (prefix: string) => {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${prefix}${year}${month}${day}${hours}${minutes}${seconds}`;
    };

    const handleSubmit = async () => {
        if (formData.items.length === 0) {
            error('Vui lòng thêm ít nhất một vật tư');
            return;
        }
        // Updated validation for a single transport record
        if (!formData.transport_record.vehicle_plate) {
            error('Vui lòng nhập biển số xe');
            return;
        }

        setIsSubmitting(true);
        try {
            // Use manual receipt number or auto-generate
            const receiptNumber = formData.receipt_number?.trim() || generateReceiptNumber(formData.receipt_type === 'direct_to_site' ? 'PNTT' : 'PNK');

            // Create transport records for each item
            const transport_records = formData.items.map(item => ({
                transport_date: formData.transport_record.transport_date,
                transport_company: formData.transport_record.transport_company,
                vehicle_plate: formData.transport_record.vehicle_plate,
                ticket_number: formData.transport_record.ticket_number || receiptNumber,
                material_id: item.material_id,
                quantity_primary: item.quantity_primary,
                density: item.material?.current_density || 1,
                unit_price: parseFloat(formData.transport_record.unit_price.replace(/\D/g, '') || '0'),
                transport_fee: item.quantity_primary * parseFloat(formData.transport_record.unit_price.replace(/\D/g, '') || '0'),
                vehicle_id: formData.transport_record.vehicle_id,
                transport_unit_id: formData.transport_record.transport_unit_id,
                notes: formData.transport_record.notes
            }));

            const payload = {
                ...formData,
                receipt_number: receiptNumber,
                transport_records
            };

            const res = await api.purchases.create(payload) as any;

            if (res.success) {
                success(res.message || 'Tạo phiếu thành công');
                setCreatedReceiptId(res.data.id);
                setStep(6);
            }
        } catch (err: any) {
            error(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getReceiptTypeInfo = () => {
        const types = {
            direct_to_site: {
                title: 'Xuất trực tiếp vào công trình',
                icon: <Package className="w-6 h-6" />,
                color: 'bg-green-500',
                description: 'Giao hàng trực tiếp từ mỏ/NCC đến công trình'
            },
            warehouse_import: {
                title: 'Nhập kho tại cảng',
                icon: <Warehouse className="w-6 h-6" />,
                color: 'bg-blue-500',
                description: 'Nhập vật tư vào kho để quản lý tồn kho'
            }
        };
        return types[formData.receipt_type];
    };

    // Steps configuration
    const steps = [
        { id: 1, title: 'Loại phiếu', description: 'Chọn hình thức nhập', icon: FileText },
        { id: 2, title: 'Thông tin', description: 'Nhập thông tin chi tiết', icon: ClipboardList },
        { id: 3, title: 'Vật tư', description: 'Thêm danh sách vật tư', icon: Package },
        { id: 4, title: 'Vận chuyển', description: 'Thông tin xe & lái xe', icon: Truck },
        { id: 5, title: 'Xác nhận', description: 'Kiểm tra & hoàn tất', icon: CheckCircle2 }
    ];

    // Stepper Component
    const StepIndicator = () => (
        <div className="relative">
            {/* Background Line */}
            <div className="absolute top-8 left-0 right-0 h-0.5 bg-slate-200 hidden md:block" style={{ left: '10%', right: '10%' }} />
            
            {/* Progress Line */}
            <div 
                className="absolute top-8 h-0.5 bg-gradient-to-r from-primary-500 to-primary-400 hidden md:block transition-all duration-500"
                style={{ 
                    left: '10%', 
                    width: `${Math.max(0, (step - 1) / (steps.length - 1) * 80)}%` 
                }} 
            />

            {/* Steps */}
            <div className="flex justify-between relative">
                {steps.map((s) => {
                    const isCompleted = step > s.id;
                    const isCurrent = step === s.id;
                    const isClickable = s.id < step && step <= 5;
                    const StepIcon = s.icon;
                    
                    return (
                        <div 
                            key={s.id} 
                            className={`flex flex-col items-center gap-2 group cursor-pointer transition-all ${isClickable ? 'hover:scale-105' : ''}`}
                            onClick={() => isClickable && setStep(s.id)}
                        >
                            {/* Step Circle */}
                            <div className={`
                                relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg
                                ${isCompleted 
                                    ? 'bg-gradient-to-br from-green-400 to-green-500 text-white shadow-green-200' 
                                    : isCurrent 
                                        ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-primary-200 ring-4 ring-primary-100 animate-pulse' 
                                        : 'bg-white text-slate-400 border-2 border-slate-200'
                                }
                            `}>
                                {isCompleted ? (
                                    <Check className="w-7 h-7" />
                                ) : (
                                    <StepIcon className="w-7 h-7" />
                                )}
                                {/* Step Number Badge */}
                                <span className={`
                                    absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center
                                    ${isCompleted ? 'bg-green-600 text-white' : isCurrent ? 'bg-primary-700 text-white' : 'bg-slate-300 text-slate-600'}
                                `}>
                                    {s.id}
                                </span>
                            </div>
                            
                            {/* Step Label */}
                            <div className="text-center hidden md:block">
                                <p className={`font-bold text-sm ${isCurrent ? 'text-primary-600' : isCompleted ? 'text-green-600' : 'text-slate-400'}`}>
                                    {s.title}
                                </p>
                                <p className="text-xs text-slate-400 max-w-[100px] truncate">{s.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // Material Summary Card Component
    const MaterialSummaryCard = ({ item, idx, showDelete = false }: { item: PurchaseItem; idx: number; showDelete?: boolean }) => {
        const volumeM3 = item.quantity_primary / (item.material?.current_density || 1);
        const totalPrice = item.quantity_primary * item.unit_price;
        
        return (
            <div className="group relative bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-primary-200 transition-all">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate">{item.material?.name || 'Vật tư'}</p>
                            <p className="text-sm text-slate-500">{item.material?.code}</p>
                        </div>
                    </div>
                    {showDelete && (
                        <button 
                            onClick={() => removeItem(idx)} 
                            className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
                
                <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-medium">Số lượng</p>
                        <p className="font-bold text-slate-800">{formatNumber(item.quantity_primary, 2)} <span className="text-xs font-normal text-slate-400">Tấn</span></p>
                        <p className="text-xs text-slate-400">{formatNumber(volumeM3, 2)} m³</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-medium">Đơn giá</p>
                        <p className="font-bold text-slate-800">{formatNumber(item.unit_price, 0)}</p>
                        <p className="text-xs text-slate-400">VNĐ/Tấn</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-medium">Thành tiền</p>
                        <p className="font-bold text-primary-600">{formatCurrency(totalPrice)}</p>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="spinner w-8 h-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-8">
            {/* Header với Gradient */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate('/purchases')} 
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-primary-400" />
                                Tạo phiếu nhập mới
                            </h1>
                            <p className="text-slate-400 text-sm mt-1">
                                {step <= 5 ? `Bước ${step}/5 - ${steps[step-1]?.title}` : 'Hoàn thành'}
                            </p>
                        </div>
                    </div>
                    
                    {step <= 5 && (
                        <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2">
                            <div className={`w-3 h-3 rounded-full ${getReceiptTypeInfo().color}`}></div>
                            <span className="text-sm font-medium">{getReceiptTypeInfo().title}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Stepper */}
            {step <= 5 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <StepIndicator />
                </div>
            )}

            {/* Step 1: Chọn loại phiếu */}
            {step === 1 && (
                <div className="space-y-6">
                    {/* Section Header */}
                    <div className="text-center max-w-xl mx-auto">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-200 mb-4">
                            <FileText className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Chọn loại phiếu nhập</h2>
                        <p className="text-slate-500">Vui lòng chọn hình thức nhập hàng phù hợp với quy trình của bạn</p>
                    </div>
                    
                    {/* Receipt Type Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                        {/* Direct to Site */}
                        <button
                            onClick={() => setFormData(prev => ({ ...prev, receipt_type: 'direct_to_site' as ReceiptType }))}
                            className={`group relative p-8 rounded-2xl border-2 transition-all text-left overflow-hidden ${
                                formData.receipt_type === 'direct_to_site'
                                    ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-xl shadow-green-100'
                                    : 'border-slate-200 bg-white hover:border-green-300 hover:shadow-lg'
                            }`}
                        >
                            {/* Selection Indicator */}
                            {formData.receipt_type === 'direct_to_site' && (
                                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                                    <Check className="w-5 h-5" />
                                </div>
                            )}
                            
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg shadow-green-200/50">
                                <Package className="w-7 h-7" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-900 mb-2">Xuất trực tiếp vào công trình</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                Giao hàng trực tiếp từ mỏ/NCC đến công trình. Không qua kho, không tăng tồn kho.
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">Nhanh chóng</span>
                                <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">Không tồn kho</span>
                            </div>
                        </button>

                        {/* Warehouse Import */}
                        <button
                            onClick={() => setFormData(prev => ({ ...prev, receipt_type: 'warehouse_import' as ReceiptType }))}
                            className={`group relative p-8 rounded-2xl border-2 transition-all text-left overflow-hidden ${
                                formData.receipt_type === 'warehouse_import'
                                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl shadow-blue-100'
                                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-lg'
                            }`}
                        >
                            {/* Selection Indicator */}
                            {formData.receipt_type === 'warehouse_import' && (
                                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                                    <Check className="w-5 h-5" />
                                </div>
                            )}
                            
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg shadow-blue-200/50">
                                <Warehouse className="w-7 h-7" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-900 mb-2">Nhập kho tại cảng</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                Nhập vật tư vào kho để quản lý. Tăng số lượng tồn kho và theo dõi chi tiết.
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">Quản lý kho</span>
                                <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">Tăng tồn kho</span>
                            </div>
                        </button>
                    </div>
                    
                    {/* Action Button */}
                    <div className="flex justify-center pt-6">
                        <Button 
                            onClick={() => setStep(2)} 
                            size="lg"
                            className="px-12 h-14 text-lg font-bold shadow-lg shadow-primary-200"
                            rightIcon={<ChevronRight className="w-5 h-5" />}
                        >
                            Tiếp tục
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 2: Nhập thông tin chi tiết */}
            {step === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="overflow-hidden border-0 shadow-lg">
                            <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5" />
                                    Thông tin phiếu nhập
                                </h3>
                            </div>
                            <CardContent className="p-6 space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <Input
                                            id="receipt_number"
                                            label="Số phiếu"
                                            placeholder="Tự động tạo nếu để trống"
                                            value={formData.receipt_number || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, receipt_number: e.target.value }))}
                                        />
                                        <Hash className="absolute right-3 top-9 w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="receipt_date"
                                            label="Ngày nhập (*)"
                                            type="date"
                                            value={formData.receipt_date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, receipt_date: e.target.value }))}
                                            required
                                        />
                                        <Calendar className="absolute right-3 top-9 w-4 h-4 text-slate-400" />
                                    </div>
                                </div>

                                {/* Direct to Site Fields */}
                                {formData.receipt_type === 'direct_to_site' && (
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <Building2 className="w-4 h-4" /> Thông tin mỏ & nhà cung cấp
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Input
                                                id="quarry_name"
                                                label="Tên mỏ (*)"
                                                placeholder="Nhập tên mỏ khai thác"
                                                value={formData.direct_to_site_details?.quarry_name || ''}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    direct_to_site_details: { ...prev.direct_to_site_details!, quarry_name: e.target.value }
                                                }))}
                                                required
                                            />
                                            <Input
                                                id="destination_site"
                                                label="Công trình đích"
                                                placeholder="Nơi giao hàng"
                                                value={formData.direct_to_site_details?.destination_site || ''}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    direct_to_site_details: { ...prev.direct_to_site_details!, destination_site: e.target.value }
                                                }))}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="relative">
                                                <Input
                                                    id="supplier_name"
                                                    label="Nhà cung cấp (*)"
                                                    placeholder="Tên nhà cung cấp"
                                                    value={formData.direct_to_site_details?.supplier_name || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        direct_to_site_details: { ...prev.direct_to_site_details!, supplier_name: e.target.value }
                                                    }))}
                                                    required
                                                />
                                                <User className="absolute right-3 top-9 w-4 h-4 text-slate-400" />
                                            </div>
                                            <div className="relative">
                                                <Input
                                                    id="supplier_phone"
                                                    label="SĐT Nhà cung cấp"
                                                    placeholder="0xxx xxx xxx"
                                                    value={formData.direct_to_site_details?.supplier_phone || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        direct_to_site_details: { ...prev.direct_to_site_details!, supplier_phone: e.target.value }
                                                    }))}
                                                />
                                                <Phone className="absolute right-3 top-9 w-4 h-4 text-slate-400" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Warehouse Import Fields */}
                                {formData.receipt_type === 'warehouse_import' && (
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <Warehouse className="w-4 h-4" /> Thông tin kho & dự án
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Select
                                                id="warehouse_id"
                                                label="Kho nhập (*)"
                                                options={[
                                                    { value: '', label: 'Chọn kho nhập...' },
                                                    ...warehouses.map(w => ({ value: w.id, label: w.name }))
                                                ]}
                                                value={formData.warehouse_import_details?.warehouse_id || ''}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    warehouse_import_details: { ...prev.warehouse_import_details!, warehouse_id: e.target.value }
                                                }))}
                                                required
                                            />
                                            <Select
                                                id="project_id"
                                                label="Dự án (Tùy chọn)"
                                                options={[
                                                    { value: '', label: 'Chọn dự án...' },
                                                    ...projects.map(p => ({ value: p.id, label: p.name }))
                                                ]}
                                                value={formData.warehouse_import_details?.project_id || ''}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    warehouse_import_details: { ...prev.warehouse_import_details!, project_id: e.target.value }
                                                }))}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="relative">
                                                <Input
                                                    id="supplier_name_warehouse"
                                                    label="Nhà cung cấp"
                                                    placeholder="Tên nhà cung cấp"
                                                    value={formData.warehouse_import_details?.supplier_name || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        warehouse_import_details: { ...prev.warehouse_import_details!, supplier_name: e.target.value }
                                                    }))}
                                                />
                                                <User className="absolute right-3 top-9 w-4 h-4 text-slate-400" />
                                            </div>
                                            <div className="relative">
                                                <Input
                                                    id="supplier_phone_warehouse"
                                                    label="SĐT Nhà cung cấp"
                                                    placeholder="0xxx xxx xxx"
                                                    value={formData.warehouse_import_details?.supplier_phone || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        warehouse_import_details: { ...prev.warehouse_import_details!, supplier_phone: e.target.value }
                                                    }))}
                                                />
                                                <Phone className="absolute right-3 top-9 w-4 h-4 text-slate-400" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div className="flex justify-between items-center">
                            <Button 
                                variant="ghost" 
                                onClick={() => setStep(1)} 
                                leftIcon={<ChevronLeft className="w-4 h-4" />}
                                className="hover:bg-slate-100"
                            >
                                Quay lại
                            </Button>
                            <Button 
                                onClick={() => setStep(3)} 
                                rightIcon={<ChevronRight className="w-4 h-4" />}
                                size="lg"
                                className="px-8 shadow-lg shadow-primary-200"
                            >
                                Tiếp tục
                            </Button>
                        </div>
                    </div>
                    
                    {/* Right Panel - Summary */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6 space-y-4">
                            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                                <CardContent className="p-6">
                                    <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-primary-500" />
                                        Tóm tắt
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${getReceiptTypeInfo().color}`}>
                                                {formData.receipt_type === 'direct_to_site' ? <Package className="w-5 h-5" /> : <Warehouse className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400">Loại phiếu</p>
                                                <p className="font-bold text-slate-800 text-sm">{getReceiptTypeInfo().title}</p>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-white rounded-lg border border-slate-200">
                                            <p className="text-xs text-slate-400 mb-1">Ngày nhập</p>
                                            <p className="font-bold text-slate-800">{formatDate(formData.receipt_date)}</p>
                                        </div>
                                        {formData.receipt_number && (
                                            <div className="p-3 bg-white rounded-lg border border-slate-200">
                                                <p className="text-xs text-slate-400 mb-1">Số phiếu</p>
                                                <p className="font-bold text-slate-800">{formData.receipt_number}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <div className="text-center text-sm text-slate-400">
                                <p>Bước 2/5</p>
                                <p className="text-xs">Nhập thông tin chi tiết</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Thêm vật tư */}
            {step === 3 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Add Items Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Add New Item Card */}
                        <Card className="overflow-hidden border-0 shadow-lg">
                            <div className="bg-gradient-to-r from-emerald-500 to-green-500 px-6 py-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Plus className="w-5 h-5" />
                                    Thêm vật tư mới
                                </h3>
                            </div>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Select
                                        id="material_id"
                                        label="Vật tư (*)"
                                        options={[
                                            { value: '', label: 'Chọn vật tư...' },
                                            ...materials.map(m => ({ value: m.id, label: `${m.code} - ${m.name}` }))
                                        ]}
                                        value={currentItem.material_id}
                                        onChange={(e) => setCurrentItem(prev => ({ ...prev, material_id: e.target.value }))}
                                    />
                                    <div className="relative">
                                        <Input
                                            id="quantity"
                                            label="Số lượng (*)"
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={currentItem.quantity_primary || ''}
                                            onChange={(e) => setCurrentItem(prev => ({ ...prev, quantity_primary: parseFloat(e.target.value) || 0 }))}
                                        />
                                        <span className="absolute right-3 top-9 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">Tấn</span>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="price"
                                            label="Đơn giá (*)"
                                            placeholder="0"
                                            value={currentItem.price ? formatNumber(currentItem.price, 0) : ''}
                                            onChange={(e) => {
                                                const rawValue = e.target.value.replace(/\D/g, '');
                                                setCurrentItem(prev => ({ ...prev, price: parseInt(rawValue) || 0 }));
                                            }}
                                        />
                                        <span className="absolute right-3 top-9 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">VNĐ</span>
                                    </div>
                                </div>
                                
                                {/* Preview Row */}
                                {currentItem.material_id && currentItem.quantity_primary > 0 && (
                                    <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                                                    <Package className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">
                                                        {materials.find(m => m.id === currentItem.material_id)?.name}
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        {formatNumber(currentItem.quantity_primary, 2)} Tấn × {formatNumber(currentItem.price, 0)} VNĐ
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-slate-400">Thành tiền</p>
                                                <p className="font-bold text-lg text-emerald-600">
                                                    {formatCurrency(currentItem.quantity_primary * currentItem.price)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex justify-end mt-4">
                                    <Button 
                                        onClick={addItem} 
                                        leftIcon={<Plus className="w-4 h-4" />}
                                        className="bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-200"
                                        disabled={!currentItem.material_id || currentItem.quantity_primary <= 0}
                                    >
                                        Thêm vào danh sách
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Items List */}
                        <Card className="overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b flex items-center justify-between">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    Danh sách vật tư ({formData.items.length})
                                </h3>
                                {formData.items.length > 0 && (
                                    <div className="text-sm text-slate-500">
                                        Tổng: <span className="font-bold text-primary-600">{formatCurrency(calculateTotalAmount())}</span>
                                    </div>
                                )}
                            </div>
                            <CardContent className="p-0">
                                {formData.items.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                            <Package className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <p className="text-slate-400 font-medium">Chưa có vật tư nào</p>
                                        <p className="text-slate-300 text-sm">Thêm vật tư từ form bên trên</p>
                                    </div>
                                ) : (
                                    <div className="p-4 space-y-3">
                                        {formData.items.map((item, idx) => (
                                            <MaterialSummaryCard key={idx} item={item} idx={idx} showDelete />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div className="flex justify-between items-center">
                            <Button 
                                variant="ghost" 
                                onClick={() => setStep(2)} 
                                leftIcon={<ChevronLeft className="w-4 h-4" />}
                            >
                                Quay lại
                            </Button>
                            <Button 
                                onClick={() => setStep(4)} 
                                rightIcon={<ChevronRight className="w-4 h-4" />}
                                size="lg"
                                className="px-8 shadow-lg shadow-primary-200"
                                disabled={formData.items.length === 0}
                            >
                                Tiếp tục
                            </Button>
                        </div>
                    </div>
                    
                    {/* Right Panel - Summary */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6 space-y-4">
                            {/* Total Summary Card */}
                            <Card className="overflow-hidden bg-gradient-to-br from-primary-500 to-primary-600 text-white border-0">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                            <DollarSign className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-primary-100 text-sm">Tổng giá trị</p>
                                            <p className="text-2xl font-black">{formatCurrency(calculateTotalAmount())}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20">
                                        <div>
                                            <p className="text-primary-100 text-xs">Số loại vật tư</p>
                                            <p className="text-xl font-bold">{formData.items.length}</p>
                                        </div>
                                        <div>
                                            <p className="text-primary-100 text-xs">Tổng khối lượng</p>
                                            <p className="text-xl font-bold">
                                                {formatNumber(formData.items.reduce((sum, item) => sum + item.quantity_primary, 0), 2)}
                                                <span className="text-sm font-normal ml-1">Tấn</span>
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            {/* Quick Stats */}
                            <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
                                <CardContent className="p-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Chi tiết</h4>
                                    <div className="space-y-2">
                                        {formData.items.slice(0, 3).map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm p-2 bg-white rounded-lg">
                                                <span className="text-slate-600 truncate max-w-[120px]">{item.material?.name}</span>
                                                <span className="font-bold text-primary-600">{formatNumber(item.quantity_primary, 2)}T</span>
                                            </div>
                                        ))}
                                        {formData.items.length > 3 && (
                                            <p className="text-xs text-center text-slate-400 pt-2">
                                                +{formData.items.length - 3} vật tư khác
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <div className="text-center text-sm text-slate-400">
                                <p>Bước 3/5</p>
                                <p className="text-xs">Thêm danh sách vật tư</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 4: Thông tin vận chuyển */}
            {step === 4 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Transport Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="overflow-hidden border-0 shadow-lg">
                            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Truck className="w-5 h-5" />
                                    Thông tin vận chuyển
                                </h3>
                            </div>
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <Input
                                            label="Ngày vận chuyển"
                                            type="date"
                                            value={formData.transport_record.transport_date}
                                            onChange={e => setFormData(prev => ({
                                                ...prev,
                                                transport_record: { ...prev.transport_record, transport_date: e.target.value }
                                            }))}
                                        />
                                        <Calendar className="absolute right-3 top-9 w-4 h-4 text-slate-400" />
                                    </div>
                                    <Input
                                        label="Số phiếu / Ticket"
                                        placeholder="Nhập số phiếu cân/vận đơn"
                                        value={formData.transport_record.ticket_number}
                                        onChange={e => setFormData(prev => ({
                                            ...prev,
                                            transport_record: { ...prev.transport_record, ticket_number: e.target.value }
                                        }))}
                                    />
                                </div>
                                
                                <div className="pt-4 border-t border-slate-100">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Truck className="w-4 h-4" /> Đơn vị & Phương tiện
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Select
                                            label="Đơn vị vận chuyển (*)"
                                            options={[
                                                { value: '', label: 'Chọn đơn vị vận chuyển...' },
                                                ...transportUnits.map(u => ({ value: u.id, label: u.name }))
                                            ]}
                                            value={formData.transport_record.transport_unit_id}
                                            onChange={e => {
                                                const unit = transportUnits.find(u => u.id === e.target.value);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    transport_record: {
                                                        ...prev.transport_record,
                                                        transport_unit_id: e.target.value,
                                                        transport_company: unit?.name || '',
                                                        vehicle_id: '',
                                                        vehicle_plate: ''
                                                    }
                                                }));
                                            }}
                                        />
                                        <Select
                                            label="Biển số xe (*)"
                                            options={[
                                                { value: '', label: 'Chọn xe...' },
                                                ...vehicles
                                                    .filter(v => v.transport_unit_id === formData.transport_record.transport_unit_id)
                                                    .map(v => ({ value: v.id, label: v.plate_number }))
                                            ]}
                                            value={formData.transport_record.vehicle_id}
                                            onChange={e => {
                                                const vehicle = vehicles.find(v => v.id === e.target.value);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    transport_record: {
                                                        ...prev.transport_record,
                                                        vehicle_id: e.target.value,
                                                        vehicle_plate: vehicle?.plate_number || ''
                                                    }
                                                }));
                                            }}
                                            disabled={!formData.transport_record.transport_unit_id}
                                        />
                                    </div>
                                    
                                    {/* Vehicle Preview */}
                                    {formData.transport_record.vehicle_plate && (
                                        <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-200">
                                                    <Truck className="w-7 h-7" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs text-orange-600 uppercase font-bold">Phương tiện đã chọn</p>
                                                    <p className="text-2xl font-black text-slate-900">{formData.transport_record.vehicle_plate}</p>
                                                    <p className="text-sm text-slate-500">{formData.transport_record.transport_company}</p>
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                                                    <Check className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Hidden fields */}
                                <div className="hidden">
                                    <Input value={formData.transport_record.material_id} readOnly />
                                    <Input value={formData.transport_record.quantity_primary} readOnly />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Materials List */}
                        <Card className="overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b flex items-center justify-between">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    Vật tư cần vận chuyển
                                </h3>
                                <span className="text-sm text-slate-400">{formData.items.length} mặt hàng</span>
                            </div>
                            <CardContent className="p-4">
                                <div className="space-y-3">
                                    {formData.items.map((item, idx) => (
                                        <MaterialSummaryCard key={idx} item={item} idx={idx} />
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Tổng cộng:</span>
                                    <span className="text-xl font-black text-primary-600">{formatCurrency(calculateTotalAmount())}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div className="flex justify-between items-center">
                            <Button 
                                variant="ghost" 
                                onClick={() => setStep(3)} 
                                leftIcon={<ChevronLeft className="w-4 h-4" />}
                            >
                                Quay lại
                            </Button>
                            <Button 
                                onClick={() => setStep(5)} 
                                rightIcon={<ChevronRight className="w-4 h-4" />}
                                size="lg"
                                className="px-8 shadow-lg shadow-primary-200"
                                disabled={!formData.transport_record.vehicle_plate}
                            >
                                Xem lại & Xác nhận
                            </Button>
                        </div>
                    </div>
                    
                    {/* Right Panel - Summary */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6 space-y-4">
                            {/* Transport Summary */}
                            <Card className="overflow-hidden bg-gradient-to-br from-orange-500 to-amber-500 text-white border-0">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                            <Truck className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-orange-100 text-sm">Vận chuyển</p>
                                            <p className="text-xl font-black">
                                                {formData.transport_record.vehicle_plate || '---'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20">
                                        <div>
                                            <p className="text-orange-100 text-xs">Ngày vận chuyển</p>
                                            <p className="font-bold">{formatDate(formData.transport_record.transport_date)}</p>
                                        </div>
                                        <div>
                                            <p className="text-orange-100 text-xs">Đơn vị</p>
                                            <p className="font-bold truncate">{formData.transport_record.transport_company || '---'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            {/* Order Summary */}
                            <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
                                <CardContent className="p-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Tổng quan đơn hàng</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                                            <span className="text-slate-600">Số loại vật tư</span>
                                            <span className="font-bold text-slate-900">{formData.items.length}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                                            <span className="text-slate-600">Tổng khối lượng</span>
                                            <span className="font-bold text-slate-900">
                                                {formatNumber(formData.items.reduce((sum, item) => sum + item.quantity_primary, 0), 2)} Tấn
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-primary-50 rounded-lg border border-primary-100">
                                            <span className="text-primary-600 font-medium">Tổng giá trị</span>
                                            <span className="font-bold text-primary-700">{formatCurrency(calculateTotalAmount())}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <div className="text-center text-sm text-slate-400">
                                <p>Bước 4/5</p>
                                <p className="text-xs">Thông tin vận chuyển</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 5: Xác nhận và Hoàn tất */}
            {step === 5 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    {/* Hero Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative overflow-hidden bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white shadow-xl shadow-primary-200/50">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                            <div className="relative">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                        <DollarSign className="w-5 h-5" />
                                    </div>
                                    <p className="text-primary-100 text-sm uppercase font-medium tracking-wide">Tổng tiền hàng</p>
                                </div>
                                <p className="text-3xl font-black">{formatCurrency(calculateTotalAmount())}</p>
                            </div>
                        </div>

                        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-6 text-white shadow-xl shadow-orange-200/50">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                            <div className="relative">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                        <Scale className="w-5 h-5" />
                                    </div>
                                    <p className="text-orange-100 text-sm uppercase font-medium tracking-wide">Tổng sản lượng</p>
                                </div>
                                <p className="text-3xl font-black">
                                    {formatNumber(formData.items.reduce((sum, item) => sum + item.quantity_primary, 0), 2)}
                                    <span className="text-lg font-normal ml-2">Tấn</span>
                                </p>
                            </div>
                        </div>

                        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200/50">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                            <div className="relative">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                        <Truck className="w-5 h-5" />
                                    </div>
                                    <p className="text-indigo-100 text-sm uppercase font-medium tracking-wide">Phương tiện</p>
                                </div>
                                <p className="text-3xl font-black">{formData.transport_record.vehicle_plate || '---'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Receipt Details */}
                        <Card className="overflow-hidden border-0 shadow-lg">
                            <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5" />
                                    Thông tin phiếu nhập
                                </h3>
                            </div>
                            <CardContent className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-400 uppercase font-medium mb-1">Loại hình</p>
                                        <p className="font-bold text-slate-800">{getReceiptTypeInfo().title}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-400 uppercase font-medium mb-1">Ngày lập phiếu</p>
                                        <p className="font-bold text-slate-800">{formatDate(formData.receipt_date)}</p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                        <Package className="w-4 h-4" /> Danh sách vật tư ({formData.items.length})
                                    </p>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        {formData.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-slate-50 to-white border border-slate-100 hover:shadow-sm transition-shadow">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">{item.material?.name}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {formatNumber(item.quantity_primary, 2)} Tấn × {formatNumber(item.unit_price, 0)} VNĐ
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className="font-bold text-primary-600">{formatCurrency(item.quantity_primary * item.unit_price)}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                        <span className="text-slate-500">Tổng cộng:</span>
                                        <span className="text-xl font-black text-primary-600">{formatCurrency(calculateTotalAmount())}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Transport Details */}
                        <Card className="overflow-hidden border-0 shadow-lg">
                            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Truck className="w-5 h-5" />
                                    Chi tiết vận chuyển
                                </h3>
                            </div>
                            <CardContent className="p-6">
                                {/* Vehicle Card */}
                                <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-200">
                                            <Truck className="w-8 h-8" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-orange-600 uppercase font-bold">Biển số xe</p>
                                            <p className="text-2xl font-black text-slate-900">{formData.transport_record.vehicle_plate}</p>
                                            <p className="text-sm text-slate-500">{formData.transport_record.transport_company}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-200">
                                            <Check className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Transport Info Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-400 uppercase font-medium mb-1">Ngày vận chuyển</p>
                                        <p className="font-bold text-slate-800">{formatDate(formData.transport_record.transport_date)}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-400 uppercase font-medium mb-1">Số phiếu / Ticket</p>
                                        <p className="font-bold text-slate-800">{formData.transport_record.ticket_number || '---'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-400 uppercase font-medium mb-1">Số loại vật tư</p>
                                        <p className="font-bold text-slate-800">{formData.items.length} loại</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-400 uppercase font-medium mb-1">Tổng khối lượng</p>
                                        <p className="font-bold text-slate-800">
                                            {formatNumber(formData.items.reduce((sum, item) => sum + item.quantity_primary, 0), 2)} Tấn
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Action Footer */}
                    <Card className="border-0 shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => setStep(4)}
                                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                                    className="w-full md:w-auto"
                                >
                                    Quay lại chỉnh sửa
                                </Button>
                                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
                                        <AlertCircle className="w-4 h-4" />
                                        <p className="text-sm font-medium">Kiểm tra kỹ trước khi xác nhận</p>
                                    </div>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        size="lg"
                                        className="w-full md:w-auto px-12 h-14 text-lg font-bold shadow-xl shadow-primary-200 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700"
                                    >
                                        {isSubmitting ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                Đang lưu...
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-5 h-5" />
                                                Xác nhận & Hoàn tất
                                            </div>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Step 6: Thành công & In phiếu */}
            {step === 6 && (
                <div className="flex flex-col items-center justify-center py-16 animate-in zoom-in-95 duration-500">
                    <div className="max-w-lg w-full space-y-8">
                        {/* Success Animation */}
                        <div className="relative mx-auto w-32 h-32">
                            <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-25"></div>
                            <div className="relative w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-200">
                                <CheckCircle2 className="w-16 h-16 text-white" />
                            </div>
                        </div>

                        {/* Success Message */}
                        <div className="text-center space-y-3">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                                🎉 Tạo phiếu thành công!
                            </h2>
                            <p className="text-slate-500 text-lg">
                                Phiếu nhập hàng đã được lưu vào hệ thống.
                            </p>
                        </div>

                        {/* Summary Card */}
                        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-0">
                            <CardContent className="p-6">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-2xl font-black text-primary-600">{formData.items.length}</p>
                                        <p className="text-xs text-slate-400 uppercase">Vật tư</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black text-orange-600">
                                            {formatNumber(formData.items.reduce((sum, item) => sum + item.quantity_primary, 0), 1)}T
                                        </p>
                                        <p className="text-xs text-slate-400 uppercase">Khối lượng</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black text-green-600">{formData.transport_record.vehicle_plate}</p>
                                        <p className="text-xs text-slate-400 uppercase">Xe</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3">
                            <Button
                                size="lg"
                                className="w-full h-14 text-lg font-bold shadow-xl shadow-primary-200 bg-gradient-to-r from-primary-500 to-primary-600"
                                onClick={() => navigate(`/purchases/${createdReceiptId}`)}
                                leftIcon={<Printer className="w-5 h-5" />}
                            >
                                Xem chi tiết & In phiếu
                            </Button>
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="ghost"
                                    size="lg"
                                    className="h-12 font-medium border border-slate-200 hover:bg-slate-50"
                                    onClick={() => navigate('/purchases')}
                                >
                                    Danh sách phiếu
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="lg"
                                    className="h-12 font-medium border border-primary-200 text-primary-600 hover:bg-primary-50"
                                    onClick={() => window.location.reload()}
                                    leftIcon={<Plus className="w-4 h-4" />}
                                >
                                    Tạo phiếu mới
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
