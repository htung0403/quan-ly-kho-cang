import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Printer, Truck, Plus, X, Trash2, Package, Calendar,
    FileText, User, MapPin, Building2, Hash, Scale, CheckCircle2,
    AlertCircle, Warehouse, Edit2
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
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
import { Vehicle, TransportUnit } from '@/types';
import { PrintPurchaseReceipt } from '@/components/PrintPurchaseReceipt';

interface TransportRecord {
    id: string;
    transport_date: string;
    transport_company?: string;
    vehicle_plate: string;
    ticket_number?: string;
    material_id?: string;
    quantity_primary: number;
    density: number;
    unit_price: number;
    transport_fee: number;
    notes?: string;
    vehicle?: { plate_number: string; driver_name: string };
    material?: { name: string; code: string };
}

interface PurchaseReceiptDetail {
    id: string;
    receipt_number: string;
    receipt_type: 'direct_to_site' | 'warehouse_import';
    receipt_date: string;
    total_amount: number;
    total_quantity_primary: number;
    total_quantity_secondary: number;
    notes: string;
    status: string;
    created_at: string;
    direct_to_site_details?: {
        quarry_name: string;
        supplier_name: string;
        supplier_phone?: string;
        destination_site?: string;
    };
    warehouse_import_details?: {
        warehouse?: { name: string; address: string };
        project?: { name: string };
        supplier_name?: string;
    };
    transport_records?: TransportRecord[];
    items: Array<{
        id: string;
        material_id: string;
        material: { name: string; code: string; current_density?: number };
        quantity_primary: number;
        quantity_secondary: number;
        unit_price: number;
        total_amount: number;
    }>;
    creator?: { full_name: string; email: string };
}

export function PurchaseDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { success, error } = useToast();
    const printRef = useRef<HTMLDivElement>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [receipt, setReceipt] = useState<PurchaseReceiptDetail | null>(null);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [transportUnits, setTransportUnits] = useState<TransportUnit[]>([]);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Phieu_Nhap_${receipt?.receipt_number || ''}`,
    });

    // Transport form status
    const [showTransportForm, setShowTransportForm] = useState(false);
    const [transportForm, setTransportForm] = useState({
        transport_date: new Date().toISOString().split('T')[0],
        transport_company: '',
        vehicle_plate: '',
        driver_name: '',
        ticket_number: '',
        material_id: '',
        quantity_primary: '',
        density: '1',
        unit_price: '',
        transport_fee: '0',
        vehicle_id: '',
        transport_unit_id: '',
        notes: ''
    });
    const [isSubmittingTransport, setIsSubmittingTransport] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const [receiptRes, vehiclesRes, transportUnitsRes] = await Promise.all([
                    api.purchases.getById(id),
                    api.vehicles.getAll({ limit: 1000 }),
                    api.transportUnits.getAll({ limit: 1000 })
                ]) as any[];

                if (receiptRes.success) {
                    const data = receiptRes.data;
                    // Normalize transport_records to array because Supabase might return an object for 1:1 relations
                    if (data.transport_records && !Array.isArray(data.transport_records)) {
                        data.transport_records = [data.transport_records];
                    }
                    setReceipt(data);
                }
                if (vehiclesRes.success) setVehicles(Array.isArray(vehiclesRes.data) ? vehiclesRes.data : vehiclesRes.data.items || []);
                if (transportUnitsRes.success) setTransportUnits(Array.isArray(transportUnitsRes.data) ? transportUnitsRes.data : transportUnitsRes.data.items || []);

                // Set default material from receipt items if exists
                if (receiptRes.data?.items?.length > 0) {
                    setTransportForm(prev => ({ ...prev, material_id: receiptRes.data.items[0].material_id || '' }));
                }
            } catch (err: any) {
                error(err.message || 'Lỗi tải dữ liệu');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id, error]);

    // Tự động tính Thành tiền
    useEffect(() => {
        const qty = parseFloat(transportForm.quantity_primary) || 0;
        const price = parseFloat(transportForm.unit_price.replace(/\D/g, '')) || 0;
        setTransportForm(prev => ({ ...prev, transport_fee: (qty * price).toString() }));
    }, [transportForm.quantity_primary, transportForm.unit_price]);

    const handleAddTransport = async () => {
        if (!transportForm.vehicle_plate || !transportForm.quantity_primary) {
            error('Vui lòng nhập Biển số xe và Số lượng');
            return;
        }

        setIsSubmittingTransport(true);
        try {
            const res = await api.purchases.addTransportRecord(id!, {
                ...transportForm,
                quantity_primary: parseFloat(transportForm.quantity_primary),
                density: parseFloat(transportForm.density),
                unit_price: parseFloat(transportForm.unit_price.replace(/\D/g, '')),
                transport_fee: parseFloat(transportForm.transport_fee)
            }) as any;

            if (res.success) {
                success('Thêm chuyến vận chuyển thành công');
                setShowTransportForm(false);
                // Refresh data
                const receiptRes = await api.purchases.getById(id!) as any;
                if (receiptRes.success) {
                    const data = receiptRes.data;
                    if (data.transport_records && !Array.isArray(data.transport_records)) {
                        data.transport_records = [data.transport_records];
                    }
                    setReceipt(data);
                }
            }
        } catch (err: any) {
            error(err.message || 'Có lỗi xảy ra');
        } finally {
            setIsSubmittingTransport(false);
        }
    };

    const handleDeleteReceipt = async () => {
        if (!receipt) return;
        if (!confirm(`Bạn có chắc muốn xóa phiếu ${receipt.receipt_number}? Hành động này không thể hoàn tác.`)) return;

        try {
            const res = await api.purchases.delete(id!) as any;
            if (res.success) {
                success('Đã xóa phiếu thành công');
                navigate('/purchases');
            }
        } catch (err: any) {
            error(err.message || 'Không thể xóa phiếu');
        }
    };

    if (isLoading || !receipt) return (
        <div className="flex items-center justify-center py-20">
            <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin"></div>
                <p className="text-slate-500 font-medium">Đang tải dữ liệu...</p>
            </div>
        </div>
    );

    const receiptTypeConfig = {
        direct_to_site: {
            label: 'Xuất trực tiếp công trình',
            color: 'green',
            icon: Package,
            bgGradient: 'from-green-500 to-emerald-500'
        },
        warehouse_import: {
            label: 'Nhập kho tại cảng',
            color: 'blue',
            icon: Warehouse,
            bgGradient: 'from-blue-500 to-indigo-500'
        }
    };
    
    const typeConfig = receiptTypeConfig[receipt.receipt_type];
    const TypeIcon = typeConfig.icon;

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Hero Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-400 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
                </div>
                
                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <button 
                            onClick={() => navigate('/purchases')} 
                            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all hover:scale-105"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase bg-gradient-to-r ${typeConfig.bgGradient}`}>
                                    {typeConfig.label}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    receipt.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                                    receipt.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                                    'bg-slate-500/20 text-slate-300'
                                }`}>
                                    {receipt.status === 'completed' ? 'Hoàn thành' : receipt.status === 'pending' ? 'Chờ xử lý' : receipt.status}
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
                                <FileText className="w-7 h-7 text-primary-400" />
                                {receipt.receipt_number}
                            </h1>
                            <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Ngày lập: {formatDate(receipt.receipt_date)}
                                {receipt.creator && (
                                    <>
                                        <span className="mx-2">•</span>
                                        <User className="w-4 h-4" />
                                        {receipt.creator.full_name}
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="secondary" 
                            onClick={() => navigate(`/purchases/${id}/edit`)} 
                            leftIcon={<Edit2 className="w-4 h-4" />}
                            className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
                        >
                            Sửa
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={() => handlePrint()} 
                            leftIcon={<Printer className="w-4 h-4" />}
                            className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
                        >
                            In phiếu
                        </Button>
                        <Button 
                            variant="danger" 
                            onClick={handleDeleteReceipt} 
                            leftIcon={<Trash2 className="w-4 h-4" />}
                            className="bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-300"
                        >
                            Xóa
                        </Button>
                    </div>
                </div>
            </div>

            {/* Summary Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Total Amount */}
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-5 text-white shadow-lg shadow-primary-200/50">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <Scale className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-primary-100 text-xs font-medium uppercase tracking-wider">Tổng tiền hàng</p>
                            <p className="text-2xl font-black">{formatCurrency(receipt.total_amount)}</p>
                        </div>
                    </div>
                </div>

                {/* Total Quantity */}
                <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-200/50">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-orange-100 text-xs font-medium uppercase tracking-wider">Tổng sản lượng</p>
                            <p className="text-2xl font-black">
                                {formatNumber(receipt.total_quantity_primary, 2)} <span className="text-sm font-normal">Tấn</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Items Count */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200/50">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <Hash className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-indigo-100 text-xs font-medium uppercase tracking-wider">Số loại vật tư</p>
                            <p className="text-2xl font-black">
                                {receipt.items.length} <span className="text-sm font-normal">mặt hàng</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Transport Count */}
                <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl p-5 text-white shadow-lg shadow-slate-200/50">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-slate-300 text-xs font-medium uppercase tracking-wider">Chuyến vận chuyển</p>
                            <p className="text-2xl font-black">
                                {receipt.transport_records?.length || 0} <span className="text-sm font-normal">chuyến</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Items Table - Modern Design */}
                    <Card className="overflow-hidden border-0 shadow-lg">
                        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                Chi tiết vật tư phiếu nhập
                                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                                    {receipt.items.length} mặt hàng
                                </span>
                            </h3>
                        </div>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            <th className="px-6 py-4 text-left font-semibold text-slate-600">Vật tư</th>
                                            <th className="px-4 py-4 text-right font-semibold text-slate-600">SL (Tấn)</th>
                                            <th className="px-4 py-4 text-right font-semibold text-slate-400">SL (m³)</th>
                                            <th className="px-4 py-4 text-right font-semibold text-slate-600">Đơn giá</th>
                                            <th className="px-6 py-4 text-right font-semibold text-primary-600">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {receipt.items.map((item, i) => {
                                            const volumeM3 = item.quantity_primary / (item.material?.current_density || 1);
                                            return (
                                                <tr key={item.id || i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
                                                                <Package className="w-5 h-5 text-primary-600" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900">{item.material?.name}</p>
                                                                <p className="text-xs text-slate-400">{item.material?.code}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <span className="font-bold text-slate-800">{formatNumber(item.quantity_primary, 2)}</span>
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-slate-400">
                                                        {formatNumber(volumeM3, 2)}
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <span className="font-medium text-slate-600">{formatNumber(item.unit_price, 0)}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="font-black text-primary-600">{formatCurrency(item.total_amount)}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-gradient-to-r from-primary-50 to-indigo-50 border-t-2 border-primary-100">
                                        <tr>
                                            <td colSpan={4} className="px-6 py-4 text-right font-bold text-slate-700">
                                                TỔNG CỘNG:
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-xl font-black text-primary-700">{formatCurrency(receipt.total_amount)}</span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* TRANSPORT SECTION - Modern Design */}
                    <Card className="overflow-hidden border-0 shadow-lg">
                        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Truck className="w-5 h-5" />
                                Thông tin vận chuyển
                                {receipt.transport_records && receipt.transport_records.length > 0 && (
                                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                                        {receipt.transport_records.length} chuyến
                                    </span>
                                )}
                            </h3>
                            {(!receipt.transport_records || receipt.transport_records.length === 0) && !showTransportForm && (
                                <Button 
                                    size="sm" 
                                    onClick={() => setShowTransportForm(true)} 
                                    leftIcon={<Plus className="w-4 h-4" />}
                                    className="bg-white/20 hover:bg-white/30 border-0 text-white"
                                >
                                    Khai báo vận chuyển
                                </Button>
                            )}
                        </div>
                        <CardContent className="p-6">
                            {showTransportForm && (
                                <div className="mb-8 p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-200 animate-in fade-in slide-in-from-top-4">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-lg flex items-center gap-2 text-orange-700">
                                            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center">
                                                <Truck className="w-5 h-5" />
                                            </div>
                                            Khai báo chuyến vận chuyển mới
                                        </h3>
                                        <button 
                                            onClick={() => setShowTransportForm(false)}
                                            className="p-2 rounded-lg hover:bg-orange-100 transition-colors"
                                        >
                                            <X className="w-5 h-5 text-orange-400" />
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="relative">
                                            <Input 
                                                label="Ngày vận chuyển (*)" 
                                                type="date" 
                                                value={transportForm.transport_date} 
                                                onChange={e => setTransportForm({ ...transportForm, transport_date: e.target.value })} 
                                            />
                                            <Calendar className="absolute right-3 top-9 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                        <Select
                                            label="Đơn vị vận chuyển (*)"
                                            options={[
                                                { value: '', label: 'Chọn đơn vị...' },
                                                ...transportUnits.map(u => ({ value: u.id, label: u.name }))
                                            ]}
                                            value={transportForm.transport_unit_id}
                                            onChange={e => {
                                                const unit = transportUnits.find(u => u.id === e.target.value);
                                                setTransportForm({
                                                    ...transportForm,
                                                    transport_unit_id: e.target.value,
                                                    transport_company: unit?.name || '',
                                                    vehicle_id: '',
                                                    vehicle_plate: ''
                                                });
                                            }}
                                        />
                                        <Select
                                            label="Chọn xe từ đơn vị"
                                            options={[
                                                { value: '', label: 'Tự nhập biển số...' },
                                                ...vehicles.filter(v => v.transport_unit_id === transportForm.transport_unit_id).map(v => ({ value: v.id, label: `${v.plate_number} (${v.driver_name})` }))
                                            ]}
                                            value={transportForm.vehicle_id}
                                            disabled={!transportForm.transport_unit_id}
                                            onChange={e => {
                                                const v = vehicles.find(x => x.id === e.target.value);
                                                setTransportForm({ ...transportForm, vehicle_id: e.target.value, vehicle_plate: v?.plate_number || '', driver_name: v?.driver_name || transportForm.driver_name });
                                            }}
                                        />
                                        <Input 
                                            label="Biển số (*)" 
                                            placeholder="Tự nhập hoặc chọn xe" 
                                            value={transportForm.vehicle_plate} 
                                            onChange={e => setTransportForm({ ...transportForm, vehicle_plate: e.target.value })} 
                                        />
                                    </div>

                                    {/* Vehicle Preview */}
                                    {transportForm.vehicle_plate && (
                                        <div className="mb-4 p-4 bg-white rounded-xl border border-orange-200 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center">
                                                <Truck className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-orange-600 uppercase font-bold">Phương tiện đã chọn</p>
                                                <p className="text-xl font-black text-slate-900">{transportForm.vehicle_plate}</p>
                                                <p className="text-sm text-slate-500">{transportForm.transport_company}</p>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Materials in Receipt */}
                                    <div className="mb-4">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Package className="w-4 h-4" /> Vật tư trong phiếu
                                        </p>
                                        <div className="overflow-hidden border border-slate-200 rounded-xl bg-white">
                                            <table className="w-full text-xs">
                                                <thead className="bg-slate-50 border-b text-slate-500 font-bold uppercase">
                                                    <tr>
                                                        <th className="p-3 text-left">Vật tư</th>
                                                        <th className="p-3 text-right">Tổng SL (Tấn)</th>
                                                        <th className="p-3 text-right">Tỷ trọng</th>
                                                        <th className="p-3 text-right">Đơn giá</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {receipt.items.map((item, idx) => (
                                                        <tr key={item.id || idx} className="hover:bg-slate-50">
                                                            <td className="p-3 font-medium text-slate-800">{item.material?.name}</td>
                                                            <td className="p-3 text-right font-bold">{formatNumber(item.quantity_primary, 2)}</td>
                                                            <td className="p-3 text-right text-slate-400">{formatNumber(item.material?.current_density || 1, 2)}</td>
                                                            <td className="p-3 text-right">{formatNumber(item.unit_price, 0)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-orange-200">
                                        <Button variant="ghost" onClick={() => setShowTransportForm(false)}>Hủy</Button>
                                        <Button 
                                            onClick={handleAddTransport} 
                                            disabled={isSubmittingTransport}
                                            className="bg-orange-500 hover:bg-orange-600"
                                        >
                                            {isSubmittingTransport ? 'Đang lưu...' : 'Lưu chuyến đi'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Empty State */}
                            {(!receipt.transport_records || receipt.transport_records.length === 0) && !showTransportForm && (
                                <div className="text-center py-16 bg-gradient-to-br from-slate-50 to-orange-50/30 rounded-2xl border-2 border-dashed border-slate-200">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-100 flex items-center justify-center">
                                        <Truck className="w-8 h-8 text-orange-400" />
                                    </div>
                                    <p className="text-slate-600 font-bold text-lg mb-1">Chưa có thông tin vận chuyển</p>
                                    <p className="text-slate-400 text-sm mb-4">Khai báo chuyến vận chuyển để theo dõi logistics</p>
                                    <Button 
                                        onClick={() => setShowTransportForm(true)}
                                        leftIcon={<Plus className="w-4 h-4" />}
                                        className="bg-orange-500 hover:bg-orange-600"
                                    >
                                        Khai báo ngay
                                    </Button>
                                </div>
                            )}

                            {/* Transport Records List */}
                            {receipt.transport_records && receipt.transport_records.length > 0 && (
                                <div className="space-y-3">
                                    {receipt.transport_records.map((tr) => (
                                        <div 
                                            key={tr.id} 
                                            className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all"
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-200/50">
                                                        <Truck className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="px-3 py-1 rounded-lg bg-orange-100 text-orange-700 font-black text-sm">
                                                                {tr.vehicle_plate}
                                                            </span>
                                                            <span className="text-xs text-slate-400">{tr.transport_company}</span>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" />
                                                                {formatDate(tr.transport_date)}
                                                            </span>
                                                            {tr.material?.name && (
                                                                <span className="flex items-center gap-1">
                                                                    <Package className="w-3 h-3" />
                                                                    {tr.material.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-xs text-slate-400 uppercase">Sản lượng</p>
                                                        <p className="font-black text-lg text-slate-900">
                                                            {formatNumber(tr.quantity_primary, 2)} <span className="text-xs font-normal text-slate-400">Tấn</span>
                                                        </p>
                                                    </div>
                                                    <button 
                                                        onClick={async () => {
                                                            if (confirm('Xóa chuyến này?')) {
                                                                await api.purchases.deleteTransportRecord(tr.id);
                                                                const r = await api.purchases.getById(id!) as any;
                                                                if (r.success) {
                                                                    const data = r.data;
                                                                    if (data.transport_records && !Array.isArray(data.transport_records)) {
                                                                        data.transport_records = [data.transport_records];
                                                                    }
                                                                    setReceipt(data);
                                                                }
                                                            }
                                                        }} 
                                                        className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Receipt Info Card */}
                    <Card className="overflow-hidden border-0 shadow-lg">
                        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-4">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Thông tin phiếu
                            </h3>
                        </div>
                        <CardContent className="p-5 space-y-4">
                            {/* Receipt Type */}
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${typeConfig.bgGradient} text-white flex items-center justify-center`}>
                                    <TypeIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Loại phiếu</p>
                                    <p className="font-bold text-slate-800 text-sm">{typeConfig.label}</p>
                                </div>
                            </div>

                            {/* Date */}
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Ngày lập
                                </p>
                                <p className="font-bold text-slate-800">{formatDate(receipt.receipt_date)}</p>
                            </div>

                            {/* Supplier / Source Info */}
                            {receipt.receipt_type === 'direct_to_site' && receipt.direct_to_site_details && (
                                <>
                                    <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                                        <p className="text-xs text-green-600 mb-1 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> Mỏ khai thác
                                        </p>
                                        <p className="font-bold text-slate-800">{receipt.direct_to_site_details.quarry_name}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl">
                                        <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                                            <User className="w-3 h-3" /> Nhà cung cấp
                                        </p>
                                        <p className="font-bold text-slate-800">{receipt.direct_to_site_details.supplier_name}</p>
                                        {receipt.direct_to_site_details.supplier_phone && (
                                            <p className="text-sm text-slate-500">{receipt.direct_to_site_details.supplier_phone}</p>
                                        )}
                                    </div>
                                </>
                            )}

                            {receipt.receipt_type === 'warehouse_import' && receipt.warehouse_import_details && (
                                <>
                                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                        <p className="text-xs text-blue-600 mb-1 flex items-center gap-1">
                                            <Warehouse className="w-3 h-3" /> Kho nhập
                                        </p>
                                        <p className="font-bold text-slate-800">{receipt.warehouse_import_details.warehouse?.name}</p>
                                        {receipt.warehouse_import_details.warehouse?.address && (
                                            <p className="text-xs text-slate-500">{receipt.warehouse_import_details.warehouse.address}</p>
                                        )}
                                    </div>
                                    {receipt.warehouse_import_details.project && (
                                        <div className="p-3 bg-slate-50 rounded-xl">
                                            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                                                <Building2 className="w-3 h-3" /> Dự án
                                            </p>
                                            <p className="font-bold text-slate-800">{receipt.warehouse_import_details.project.name}</p>
                                        </div>
                                    )}
                                    {receipt.warehouse_import_details.supplier_name && (
                                        <div className="p-3 bg-slate-50 rounded-xl">
                                            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                                                <User className="w-3 h-3" /> Nhà cung cấp
                                            </p>
                                            <p className="font-bold text-slate-800">{receipt.warehouse_import_details.supplier_name}</p>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Creator */}
                            {receipt.creator && (
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                                        <User className="w-3 h-3" /> Người tạo
                                    </p>
                                    <p className="font-bold text-slate-800">{receipt.creator.full_name}</p>
                                    <p className="text-xs text-slate-400">{receipt.creator.email}</p>
                                </div>
                            )}

                            {/* Notes */}
                            {receipt.notes && (
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                                    <p className="text-xs text-amber-600 mb-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> Ghi chú
                                    </p>
                                    <p className="text-sm text-slate-700">{receipt.notes}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Area for printing (Hidden on screen) */}
            <div className="hidden">
                <div ref={printRef}>
                    <PrintPurchaseReceipt receipt={receipt} />
                </div>
            </div>
        </div>
    );
}
