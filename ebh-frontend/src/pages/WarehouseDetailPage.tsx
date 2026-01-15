import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Warehouse, MapPin, Package, AlertCircle,
    Layers, TrendingUp, TrendingDown, Calendar
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    Button,
    Badge,
} from '@/components/ui';
import { api } from '@/lib/api';
import { formatNumber, formatDate } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';

interface InventoryItem {
    material: {
        id: string;
        code: string;
        name: string;
        secondary_unit: string;
        primary_unit: string;
    };
    in: number;
    out: number;
    stock: number;
}

interface WarehouseDetail {
    id: string;
    code: string;
    name: string;
    address: string;
    description: string;
    capacity: number;
    status: 'active' | 'inactive' | 'maintenance';
}

export function WarehouseDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { error } = useToast();

    const [warehouse, setWarehouse] = useState<WarehouseDetail | null>(null);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [exports, setExports] = useState<any[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'inventory' | 'purchases' | 'exports'>('inventory');

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [warehouseRes, inventoryRes] = await Promise.all([
                    (api.warehouses.getById as any)(id),
                    (api.warehouses.getInventory as any)(id)
                ]);

                if (warehouseRes.success) {
                    setWarehouse(warehouseRes.data);
                }
                if (inventoryRes.success) {
                    setInventory(inventoryRes.data);
                }

            } catch (err: any) {
                error(err.message || 'Không thể tải thông tin kho');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id, error]);

    // Lazy load tab data
    useEffect(() => {
        if (!id) return;

        const loadTabData = async () => {
            try {
                if (activeTab === 'purchases' && purchases.length === 0) {
                    const res = await api.purchases.getAll({ warehouse_id: id, limit: 50 }) as any;
                    if (res.success) setPurchases(res.data.items);
                }
                if (activeTab === 'exports' && exports.length === 0) {
                    const res = await api.exports.getAll({ warehouse_id: id, limit: 50 }) as any;
                    if (res.success) setExports(res.data.items);
                }
            } catch (err) {
                console.error("Failed to load tab data", err);
            }
        };

        loadTabData();
    }, [id, activeTab, purchases.length, exports.length]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="spinner w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!warehouse) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-bold text-slate-700">Không tìm thấy kho hàng</h2>
                <Button variant="ghost" onClick={() => navigate('/warehouses')} className="mt-4">
                    Quay lại danh sách
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/warehouses')}
                        className="p-2 h-auto"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <Warehouse className="w-6 h-6 text-slate-500" />
                                {warehouse.name}
                            </h1>
                            <Badge variant={
                                warehouse.status === 'active' ? 'success' :
                                    warehouse.status === 'maintenance' ? 'warning' : 'slate'
                            }>
                                {warehouse.status === 'active' ? 'Hoạt động' :
                                    warehouse.status === 'maintenance' ? 'Bảo trì' : 'Ngưng'}
                            </Badge>
                        </div>
                        <p className="text-slate-500 font-mono text-sm ml-8">{warehouse.code}</p>
                    </div>
                </div>
            </div>

            {/* General Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <h3 className="font-semibold text-lg">Thông tin kho</h3>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                            <div>
                                <p className="font-medium text-slate-700">Địa chỉ</p>
                                <p className="text-slate-600">{warehouse.address || 'Chưa cập nhật'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Package className="w-5 h-5 text-slate-400 mt-0.5" />
                            <div>
                                <p className="font-medium text-slate-700">Sức chứa tối đa</p>
                                <p className="text-slate-600">{formatNumber(warehouse.capacity)} tấn</p>
                            </div>
                        </div>
                        {warehouse.description && (
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-slate-400 mt-0.5" />
                                <div>
                                    <p className="font-medium text-slate-700">Ghi chú</p>
                                    <p className="text-slate-600 whitespace-pre-line">{warehouse.description}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="bg-slate-50 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center h-full py-8 text-center text-slate-500">
                        <Package className="w-12 h-12 mb-3 opacity-20" />
                        <p>Tổng số mặt hàng</p>
                        <p className="text-3xl font-bold text-slate-700">{inventory.length}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs & Content */}
            <div className="space-y-4">
                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'inventory'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <Layers className="w-4 h-4" />
                        Tồn kho hiện tại
                    </button>
                    <button
                        onClick={() => setActiveTab('purchases')}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'purchases'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <TrendingDown className="w-4 h-4" />
                        Lịch sử Nhập kho
                    </button>
                    <button
                        onClick={() => setActiveTab('exports')}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'exports'
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Lịch sử Xuất kho
                    </button>
                </div>

                {/* Tab Content */}
                <Card className="border-t-0 rounded-tl-none rounded-tr-none mt-0">
                    <CardContent className="p-0 overflow-hidden">

                        {/* INVENTORY TAB */}
                        {activeTab === 'inventory' && (
                            <table className="w-full text-sm text-left animate-fade-in">
                                <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 w-[50px]">STT</th>
                                        <th className="px-6 py-4">Mã VT</th>
                                        <th className="px-6 py-4">Tên hàng hóa</th>
                                        <th className="px-6 py-4 text-center">ĐVT</th>
                                        <th className="px-6 py-4 text-right">Tổng nhập</th>
                                        <th className="px-6 py-4 text-right">Tổng xuất (Tấn)</th>
                                        <th className="px-6 py-4 text-right">Tồn kho</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {inventory.length > 0 ? (
                                        inventory.map((item, index) => (
                                            <tr key={index} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-3 text-slate-500">{index + 1}</td>
                                                <td className="px-6 py-3 font-mono text-slate-600">{item.material.code}</td>
                                                <td className="px-6 py-3 font-medium text-slate-900">{item.material.name}</td>
                                                <td className="px-6 py-3 text-center">{item.material.primary_unit}</td>
                                                <td className="px-6 py-3 text-right text-slate-600">{formatNumber(item.in, 2)}</td>
                                                <td className="px-6 py-3 text-right text-slate-600">{formatNumber(item.out, 2)}</td>
                                                <td className={`px-6 py-3 text-right font-bold ${item.stock < 0 ? 'text-danger-600' : 'text-success-600'}`}>
                                                    {formatNumber(item.stock, 2)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                                Chưa có hàng hóa nào trong kho
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* PURCHASES TAB */}
                        {activeTab === 'purchases' && (
                            <table className="w-full text-sm text-left animate-fade-in">
                                <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">Ngày nhập</th>
                                        <th className="px-6 py-4">Số phiếu</th>
                                        <th className="px-6 py-4">Vật tư</th>
                                        <th className="px-6 py-4">Nhà cung cấp</th>
                                        <th className="px-6 py-4 text-right">Số lượng (Tấn)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {purchases.length > 0 ? (
                                        purchases.map((item, index) => (
                                            <tr key={index} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-3 text-slate-500 flex items-center gap-2">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(item.receipt_date)}
                                                </td>
                                                <td
                                                    className="px-6 py-3 font-mono font-medium text-primary-600 cursor-pointer hover:underline"
                                                    onClick={() => navigate(`/purchases/${item.id}`)}
                                                >
                                                    {item.receipt_number}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <p className="font-medium text-slate-900 truncate max-w-[200px]" title={item.material_summary}>
                                                        {item.material_summary || 'N/A'}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-3 text-slate-600">{item.supplier_name || '-'}</td>
                                                <td className="px-6 py-3 text-right font-bold text-slate-700">
                                                    {formatNumber(item.quantity_primary, 2)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                                Chưa có phiếu nhập nào
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* EXPORTS TAB */}
                        {activeTab === 'exports' && (
                            <table className="w-full text-sm text-left animate-fade-in">
                                <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">Ngày xuất</th>
                                        <th className="px-6 py-4">Số phiếu</th>
                                        <th className="px-6 py-4">Khách hàng</th>
                                        <th className="px-6 py-4">Vật tư</th>
                                        <th className="px-6 py-4 text-right">Tổng lượng (Tấn)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {exports.length > 0 ? (
                                        exports.map((item, index) => (
                                            <tr key={index} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-3 text-slate-500 flex items-center gap-2">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(item.receipt_date)}
                                                </td>
                                                <td
                                                    className="px-6 py-3 font-mono font-medium text-primary-600 cursor-pointer hover:underline"
                                                    onClick={() => navigate(`/exports/${item.id}`)}
                                                >
                                                    {item.receipt_number}
                                                </td>
                                                <td className="px-6 py-3 text-slate-900 font-medium">{item.customer_name || '-'}</td>
                                                <td className="px-6 py-3 text-slate-600 text-xs max-w-[200px] truncate" title={item.material_summary}>
                                                    {item.material_summary || 'N/A'}
                                                </td>
                                                <td className="px-6 py-3 text-right font-bold text-slate-700">
                                                    {formatNumber(item.quantity_primary, 2)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                                Chưa có phiếu xuất nào
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
