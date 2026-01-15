import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Truck, MapPin, Calendar, User, Package } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import {
    Card,
    CardContent,
    CardHeader,
    Button,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { formatDate, formatNumber, formatCurrency } from '@/lib/utils';
import { PrintExportReceipt } from '@/components/PrintExportReceipt';

export function ExportDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { error } = useToast();
    const printRef = useRef<HTMLDivElement>(null);

    const [receipt, setReceipt] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Phieu_Xuat_${receipt?.receipt_number || ''}`,
    });

    const fetchDetail = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const res = await api.exports.getById(id) as any;
            if (res.success) {
                setReceipt(res.data);
            }
        } catch (err: any) {
            console.error(err);
            error(err.message || 'Không thể tải thông tin phiếu xuất');
        } finally {
            setIsLoading(false);
        }
    }, [id, error]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="spinner w-8 h-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
        );
    }

    if (!receipt) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">Không tìm thấy phiếu xuất</p>
                <Button variant="ghost" className="mt-4" onClick={() => navigate('/exports')}>
                    Quay lại danh sách
                </Button>
            </div>
        );
    }

    // Prepare data for items table if not available (legacy support)
    const items = receipt.items && receipt.items.length > 0 ? receipt.items : [
        {
            material: receipt.material,
            quantity_secondary: receipt.quantity_secondary,
            unit_price: receipt.unit_price,
            total_amount: receipt.total_amount
        }
    ];

    const totalAmount = receipt.total_amount || items.reduce((sum: number, item: any) => sum + (item.total_amount || 0), 0);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/exports')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                        Quay lại
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Chi tiết phiếu xuất</h1>
                        <p className="text-slate-500">{receipt.receipt_number}</p>
                    </div>
                </div>
                <Button onClick={() => handlePrint()} leftIcon={<Printer className="w-4 h-4" />}>
                    In phiếu
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* General Info */}
                    <Card>
                        <CardHeader title="Thông tin chung" />
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Người lập phiếu</p>
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-slate-400" />
                                        <span className="font-medium">{receipt.creator?.full_name}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Ngày xuất</p>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <span className="font-medium">{formatDate(receipt.receipt_date)}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Kho xuất</p>
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-slate-400" />
                                        <span className="font-medium">{receipt.warehouse?.name}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 ml-6">{receipt.warehouse?.address}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Dự án</p>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{receipt.project?.name}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Items List */}
                    <Card>
                        <CardHeader title="Chi tiết vật tư" />
                        <CardContent>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-100">
                                        <tr>
                                            <th className="p-3 text-left">Vật tư</th>
                                            <th className="p-3 text-center">ĐVT</th>
                                            <th className="p-3 text-right">Số lượng</th>
                                            <th className="p-3 text-right">Đơn giá</th>
                                            <th className="p-3 text-right">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {items.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-3">
                                                    <div className="font-medium">{item.material?.name || 'N/A'}</div>
                                                    <div className="text-xs text-slate-500">{item.material?.code}</div>
                                                </td>
                                                <td className="p-3 text-center">
                                                    {item.material?.secondary_unit}
                                                </td>
                                                <td className="p-3 text-right">
                                                    {formatNumber(item.quantity_secondary, 2)}
                                                </td>
                                                <td className="p-3 text-right">
                                                    {item.unit_price ? formatCurrency(item.unit_price) : '-'}
                                                </td>
                                                <td className="p-3 text-right font-medium">
                                                    {item.total_amount ? formatCurrency(item.total_amount) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-50 font-bold">
                                            <td colSpan={4} className="p-3 text-right">Tổng cộng:</td>
                                            <td className="p-3 text-right text-success-600">{formatCurrency(totalAmount)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Vehicle Info */}
                    <Card>
                        <CardHeader title="Vận chuyển" />
                        <CardContent>
                            {receipt.vehicle ? (
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm text-slate-500">Biển số xe</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Truck className="w-4 h-4 text-slate-400" />
                                            <span className="font-semibold text-lg">{receipt.vehicle.plate_number}</span>
                                        </div>
                                    </div>
                                    {receipt.vehicle.driver_name && (
                                        <div>
                                            <p className="text-sm text-slate-500">Tài xế</p>
                                            <p className="font-medium">{receipt.vehicle.driver_name}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-slate-400 text-sm">Không có thông tin vận chuyển</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Customer Info */}
                    <Card>
                        <CardHeader title="Khách hàng" />
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-sm text-slate-500">Tên khách hàng</p>
                                <p className="font-medium">{receipt.customer_name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Số điện thoại</p>
                                <p className="font-medium">{receipt.customer_phone || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Địa chỉ giao hàng</p>
                                <div className="flex gap-2 mt-1">
                                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm">{receipt.destination || '-'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Print Friendly Content */}
            <div className="hidden">
                <PrintExportReceipt ref={printRef} receipt={receipt} />
            </div>
        </div>
    );
}
