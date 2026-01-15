import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, User, Calendar, Package, Factory, FileText, StickyNote, Layers } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import {
    Card,
    CardContent,
    CardHeader,
    Button,
} from '@/components/ui';
import { PrintPurchaseReceipt } from '@/components/PrintPurchaseReceipt';
import { api } from '@/lib/api';
import { SystemSettings } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { formatDate, formatNumber, formatCurrency } from '@/lib/utils';

export function PurchaseDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { error: showError } = useToast();
    const componentRef = useRef<HTMLDivElement>(null);

    const [receipt, setReceipt] = useState<any>(null);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;

            setIsLoading(true);
            try {
                const [receiptRes, settingsRes] = await Promise.all([
                    api.purchases.getById(id),
                    api.settings.get()
                ]) as [any, any];

                if (receiptRes.success) {
                    setReceipt(receiptRes.data);
                } else {
                    showError('Không tìm thấy phiếu nhập');
                    navigate('/purchases');
                }

                const settingsData = settingsRes as unknown as SystemSettings;
                if (settingsData) {
                    setSettings(settingsData);
                }

            } catch (error) {
                console.error('Failed to fetch data:', error);
                showError('Có lỗi xảy ra khi tải dữ liệu');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id, navigate, showError]);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: receipt ? `Phieu-nhap-${receipt.receipt_number}` : 'Phieu-nhap-kho',
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="spinner w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    if (!receipt) return null;

    const items = receipt.items || [];
    const totalAmount = receipt.total_amount || 0;
    const totalQty = receipt.total_quantity_primary || 0;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Actions */}
            <div className="flex items-center justify-between no-print">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/purchases')}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quay lại
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Chi tiết phiếu nhập</h1>
                        <p className="text-slate-500 font-mono">{receipt.receipt_number}</p>
                    </div>
                </div>
                <Button
                    onClick={() => handlePrint()}
                >
                    <Printer className="w-4 h-4 mr-2" />
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-slate-500 flex items-center gap-2">
                                            <User className="w-3.5 h-3.5" /> Người lập phiếu
                                        </p>
                                        <p className="font-medium text-slate-900">{receipt.creator?.full_name || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-slate-500 flex items-center gap-2">
                                            <Package className="w-3.5 h-3.5" /> Kho nhập
                                        </p>
                                        <p className="font-medium text-slate-900">{receipt.warehouse?.name}</p>
                                        <p className="text-xs text-slate-500">{receipt.warehouse?.address}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-slate-500 flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5" /> Ngày nhập kho
                                        </p>
                                        <p className="font-medium text-slate-900">{formatDate(receipt.receipt_date)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-slate-500 flex items-center gap-2">
                                            <Layers className="w-3.5 h-3.5" /> Dự án
                                        </p>
                                        <p className="font-medium text-slate-900">{receipt.project?.name || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Items List */}
                    <Card>
                        <CardHeader title="Chi tiết vật tư nhập" />
                        <CardContent>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            <th className="p-3 text-left">Vật tư</th>
                                            <th className="p-3 text-center">ĐVT</th>
                                            <th className="p-3 text-right">Khối lượng (T)</th>
                                            <th className="p-3 text-right">Quy đổi (m³)</th>
                                            <th className="p-3 text-right">Đơn giá</th>
                                            <th className="p-3 text-right">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {items.map((item: any) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50">
                                                <td className="p-3">
                                                    <p className="font-medium text-slate-900">{item.material?.name}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{item.material?.code}</p>
                                                </td>
                                                <td className="p-3 text-center text-slate-600">
                                                    {item.material?.primary_unit || 'Tấn'}
                                                </td>
                                                <td className="p-3 text-right font-semibold">
                                                    {formatNumber(item.quantity_primary, 2)}
                                                </td>
                                                <td className="p-3 text-right text-slate-500">
                                                    {formatNumber(item.quantity_secondary, 2)}
                                                </td>
                                                <td className="p-3 text-right text-slate-600">
                                                    {item.unit_price ? formatCurrency(item.unit_price) : '-'}
                                                </td>
                                                <td className="p-3 text-right font-medium">
                                                    {item.total_amount ? formatCurrency(item.total_amount) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 font-bold border-t">
                                        <tr>
                                            <td colSpan={2} className="p-3 text-right text-slate-600">Tổng cộng:</td>
                                            <td className="p-3 text-right text-primary-600">{formatNumber(totalQty, 2)}</td>
                                            <td colSpan={3} className="p-3 text-right text-success-600 font-mono text-base">
                                                {formatCurrency(totalAmount)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader title="Nhà cung cấp & Hóa đơn" />
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-sm text-slate-500 flex items-center gap-2">
                                    <Factory className="w-3.5 h-3.5" /> Nhà cung cấp
                                </p>
                                <p className="font-semibold text-slate-900 text-lg">
                                    {receipt.supplier_name || 'N/A'}
                                </p>
                                {receipt.supplier_phone && (
                                    <p className="text-xs text-slate-500">{receipt.supplier_phone}</p>
                                )}
                            </div>

                            {(receipt.invoice_number || receipt.invoice_date) && (
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                                    <p className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
                                        <FileText className="w-3 h-3" /> Thông tin hóa đơn
                                    </p>
                                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                                        <span className="text-slate-500">Số HĐ:</span>
                                        <span className="text-right font-mono font-medium">{receipt.invoice_number || '-'}</span>
                                        <span className="text-slate-500">Ngày HĐ:</span>
                                        <span className="text-right font-medium">{receipt.invoice_date ? formatDate(receipt.invoice_date) : '-'}</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader title="Ghi chú" />
                        <CardContent>
                            <div className="flex gap-3 text-slate-600 p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                <StickyNote className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm italic">
                                    {receipt.notes || 'Không có ghi chú thêm.'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Hidden Print Content */}
            <div className="hidden">
                <div ref={componentRef}>
                    <PrintPurchaseReceipt
                        receipt={receipt}
                        settings={settings || undefined}
                    />
                </div>
            </div>
        </div>
    );
}
