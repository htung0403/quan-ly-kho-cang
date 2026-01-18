import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Truck,
    Calendar,
    Filter,
    Download,
    FileText,
    Loader2,
    User,
    Package,
    ChevronDown,
    ChevronUp,
    Hash
} from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Button,
    Input,
    Select,
    Badge
} from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { formatDate, formatNumber } from '@/lib/utils';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface TransportRecord {
    id: string;
    transport_date: string;
    transport_company: string;
    vehicle_plate: string;
    ticket_number: string;
    material_id: string;
    material: { id: string; name: string; code: string };
    quantity_primary: number;
    density: number;
    unit_price: number;
    transport_fee: number;
    driver_name: string;
    origin: string;
    destination: string;
    notes: string;
    receipt_id: string;
    vehicle_id: string;
    transport_unit_id: string;
    vehicle?: { id: string; plate_number: string; driver_name: string; transport_unit_id: string };
    transport_unit?: { id: string; name: string; contact_name: string; phone: string };
    receipt?: { id: string; receipt_number: string; receipt_type: string };
}

interface GroupedReceipt {
    receiptId: string;
    receiptNumber: string;
    transportDate: string;
    transportCompany: string;
    vehiclePlate: string;
    driverName: string;
    items: TransportRecord[];
    totalQty: number;
    totalAmount: number;
}

export const TransportReportPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { error: showError } = useToast();

    // Filters
    const [fromDate, setFromDate] = useState(searchParams.get('from_date') || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
    const [toDate, setToDate] = useState(searchParams.get('to_date') || new Date().toISOString().split('T')[0]);
    const [vehicleId, setVehicleId] = useState(searchParams.get('vehicle_id') || '');
    const [unitId, setUnitId] = useState(searchParams.get('unit_id') || '');

    // Data
    const [records, setRecords] = useState<TransportRecord[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(true);
    const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const [vRes, uRes] = await Promise.all([
                    api.vehicles.getAll({ limit: 1000 }),
                    api.transportUnits.getAll({ limit: 1000 })
                ]) as any;

                if (vRes.success) setVehicles(vRes.data.items);
                if (uRes.success) setUnits(uRes.data.items);
            } catch (err) {
                console.error("Failed to load master data", err);
            }
        };
        fetchMasterData();
    }, []);

    // Group records by receipt
    const groupRecords = (data: TransportRecord[]): GroupedReceipt[] => {
        const groups: Record<string, GroupedReceipt> = {};
        
        data.forEach(record => {
            const key = record.receipt_id || record.id;
            if (!groups[key]) {
                groups[key] = {
                    receiptId: key,
                    receiptNumber: record.receipt?.receipt_number || record.ticket_number || '',
                    transportDate: record.transport_date,
                    transportCompany: record.transport_unit?.name || record.transport_company || '',
                    vehiclePlate: record.vehicle_plate || record.vehicle?.plate_number || '',
                    driverName: record.driver_name || record.vehicle?.driver_name || '',
                    items: [],
                    totalQty: 0,
                    totalAmount: 0
                };
            }
            groups[key].items.push(record);
            groups[key].totalQty += Number(record.quantity_primary) || 0;
            groups[key].totalAmount += Number(record.transport_fee) || 0;
        });

        return Object.values(groups).sort((a, b) => 
            new Date(b.transportDate).getTime() - new Date(a.transportDate).getTime()
        );
    };

    const fetchReport = async () => {
        setIsLoading(true);
        try {
            const params: any = {
                from_date: fromDate,
                to_date: toDate
            };
            if (vehicleId) params.vehicle_id = vehicleId;

            const res = await api.reports.getTransport(params) as any;
            if (res.success) {
                let data = res.data.details || [];

                if (unitId) {
                    data = data.filter((r: any) => {
                        return r.transport_unit_id === unitId || r.vehicle?.transport_unit_id === unitId;
                    });
                }

                setRecords(data);
                // Auto expand all multi-item receipts
                const grouped = groupRecords(data);
                const multiItemReceipts = grouped.filter(g => g.items.length > 1).map(g => g.receiptId);
                setExpandedReceipts(new Set(multiItemReceipts));
            }
        } catch (err: any) {
            showError('Lỗi tải dữ liệu: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [fromDate, toDate, vehicleId, unitId]);

    const groupedData = groupRecords(records);
    const totalQty = records.reduce((sum, r) => sum + (Number(r.quantity_primary) || 0), 0);
    const totalAmount = records.reduce((sum, r) => sum + (Number(r.transport_fee) || 0), 0);
    const totalTrips = groupedData.length;

    const toggleExpand = (receiptId: string) => {
        setExpandedReceipts(prev => {
            const next = new Set(prev);
            if (next.has(receiptId)) {
                next.delete(receiptId);
            } else {
                next.add(receiptId);
            }
            return next;
        });
    };

    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Báo cáo vận chuyển');

        worksheet.columns = [
            { header: 'Ngày', key: 'date', width: 15 },
            { header: 'Số phiếu', key: 'receipt', width: 15 },
            { header: 'Đơn vị VC', key: 'company', width: 25 },
            { header: 'Biển số', key: 'plate', width: 15 },
            { header: 'Tài xế', key: 'driver', width: 20 },
            { header: 'Vật tư', key: 'material', width: 20 },
            { header: 'Số lượng (Tấn)', key: 'qty', width: 15 },
            { header: 'Tỉ trọng', key: 'density', width: 12 },
            { header: 'Đơn giá', key: 'price', width: 15 },
            { header: 'Thành tiền', key: 'total', width: 18 },
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE2E8F0' }
        };

        groupedData.forEach(group => {
            group.items.forEach((r, idx) => {
                worksheet.addRow({
                    date: idx === 0 ? formatDate(r.transport_date) : '',
                    receipt: idx === 0 ? group.receiptNumber : '',
                    company: idx === 0 ? group.transportCompany : '',
                    plate: idx === 0 ? group.vehiclePlate : '',
                    driver: idx === 0 ? group.driverName : '',
                    material: r.material?.name || 'N/A',
                    qty: r.quantity_primary,
                    density: r.density,
                    price: r.unit_price,
                    total: r.transport_fee
                });
            });
        });

        // Add total row
        const totalRow = worksheet.addRow({
            date: 'TỔNG CỘNG',
            receipt: '',
            company: '',
            plate: '',
            driver: '',
            material: `${records.length} vật tư`,
            qty: totalQty,
            density: '',
            price: '',
            total: totalAmount
        });
        totalRow.font = { bold: true };
        totalRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDBEAFE' }
        };

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Bao_cao_van_chuyen_${fromDate}_${toDate}.xlsx`);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Truck className="w-8 h-8 text-primary-600" />
                        Dữ liệu Vận chuyển
                    </h1>
                    <p className="text-slate-500">Xem chi tiết lịch sử vận chuyển của xe và đơn vị</p>
                </div>
                <Button variant="outline" onClick={handleExportExcel} disabled={records.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    Xuất Excel
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-primary-50 to-primary-100/50 border-primary-200">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary-500 rounded-lg shadow-sm">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-primary-600 uppercase tracking-wide">Số chuyến</p>
                                <p className="text-2xl font-bold text-primary-900">{totalTrips}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500 rounded-lg shadow-sm">
                                <Package className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Tổng tấn</p>
                                <p className="text-2xl font-bold text-emerald-900">{formatNumber(totalQty, 1)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-amber-500 rounded-lg shadow-sm">
                                <Hash className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Vật tư</p>
                                <p className="text-2xl font-bold text-amber-900">{records.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-violet-500 rounded-lg shadow-sm">
                                <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-violet-600 uppercase tracking-wide">Thời gian</p>
                                <p className="text-sm font-bold text-violet-900">{formatDate(fromDate)}</p>
                                <p className="text-xs text-violet-600">→ {formatDate(toDate)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="py-3 flex flex-row items-center justify-between border-b bg-slate-50/50">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Bộ lọc
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
                        {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                </CardHeader>
                {showFilters && (
                    <CardContent className="pt-4 pb-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Input
                                label="Từ ngày"
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                            <Input
                                label="Đến ngày"
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                            <Select
                                label="Đơn vị vận chuyển"
                                value={unitId}
                                onChange={(e) => {
                                    setUnitId(e.target.value);
                                    setVehicleId('');
                                }}
                                options={[
                                    { value: '', label: 'Tất cả đơn vị' },
                                    ...units.map(u => ({ value: u.id, label: u.name }))
                                ]}
                            />
                            <Select
                                label="Xe"
                                value={vehicleId}
                                onChange={(e) => setVehicleId(e.target.value)}
                                options={[
                                    { value: '', label: 'Tất cả xe' },
                                    ...(unitId
                                        ? vehicles.filter(v => v.transport_unit_id === unitId)
                                        : vehicles
                                    ).map(v => ({ value: v.id, label: v.plate_number }))
                                ]}
                            />
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Data Table - Modern Card Style */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-3" />
                            <p className="text-slate-500">Đang tải dữ liệu...</p>
                        </div>
                    ) : groupedData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <Truck className="w-12 h-12 mb-3 opacity-50" />
                            <p>Không có dữ liệu vận chuyển</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            {/* Table Header */}
                            <thead className="bg-slate-100 border-b border-slate-200">
                                <tr className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    <th className="px-4 py-3 text-left w-10"></th>
                                    <th className="px-4 py-3 text-left">Phiếu / Ngày</th>
                                    <th className="px-4 py-3 text-left">Vận chuyển</th>
                                    <th className="px-4 py-3 text-left">Vật tư</th>
                                    <th className="px-4 py-3 text-right">Số lượng</th>
                                    <th className="px-4 py-3 text-right">Tỉ trọng</th>
                                    <th className="px-4 py-3 text-right">Đơn giá</th>
                                    <th className="px-4 py-3 text-right">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {groupedData.map((group) => {
                                    const isMultiItem = group.items.length > 1;
                                    const isExpanded = expandedReceipts.has(group.receiptId);
                                    
                                    return (
                                        <React.Fragment key={group.receiptId}>
                                            {/* Main Row - Receipt Header */}
                                            <tr 
                                                className={`
                                                    ${isMultiItem ? 'cursor-pointer hover:bg-primary-50/50' : 'hover:bg-slate-50/50'}
                                                    ${isMultiItem && isExpanded ? 'bg-primary-50/30' : ''}
                                                    transition-colors
                                                `}
                                                onClick={() => isMultiItem && toggleExpand(group.receiptId)}
                                            >
                                                {/* Expand Icon */}
                                                <td className="px-4 py-3 w-10">
                                                    {isMultiItem && (
                                                        <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                            <ChevronDown className="w-4 h-4 text-slate-400" />
                                                        </div>
                                                    )}
                                                </td>
                                                
                                                {/* Receipt Info */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Badge 
                                                            variant="primary" 
                                                            className="font-mono text-xs px-2 py-0.5 bg-primary-100 text-primary-700 border-primary-200"
                                                        >
                                                            {group.receiptNumber}
                                                        </Badge>
                                                        {isMultiItem && (
                                                            <Badge variant="slate" className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 border-amber-200">
                                                                {group.items.length}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        {formatDate(group.transportDate)}
                                                    </div>
                                                </td>
                                                
                                                {/* Transport Info */}
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-800 text-sm">
                                                        {group.transportCompany || 'N/A'}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="inline-flex items-center text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                                            <Truck className="w-3 h-3 mr-1" />
                                                            {group.vehiclePlate}
                                                        </span>
                                                        {group.driverName && (
                                                            <span className="inline-flex items-center text-xs text-slate-500">
                                                                <User className="w-3 h-3 mr-1" />
                                                                {group.driverName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                
                                                {/* Material - Show first or summary */}
                                                <td className="px-4 py-3">
                                                    {isMultiItem ? (
                                                        <div className="text-sm text-slate-600 italic">
                                                            {group.items.length} loại vật tư
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="font-medium text-slate-800 text-sm">
                                                                {group.items[0].material?.name || 'Vật tư'}
                                                            </div>
                                                            <div className="text-xs text-slate-400 font-mono">
                                                                {group.items[0].material?.code || '-'}
                                                            </div>
                                                        </>
                                                    )}
                                                </td>
                                                
                                                {/* Quantity */}
                                                <td className="px-4 py-3 text-right">
                                                    <div className={`font-semibold ${isMultiItem ? 'text-primary-700' : 'text-slate-800'}`}>
                                                        {formatNumber(isMultiItem ? group.totalQty : group.items[0].quantity_primary, 2)}
                                                    </div>
                                                    <div className="text-xs text-slate-400">tấn</div>
                                                </td>
                                                
                                                {/* Density */}
                                                <td className="px-4 py-3 text-right text-slate-600">
                                                    {isMultiItem ? '-' : formatNumber(group.items[0].density, 2)}
                                                </td>
                                                
                                                {/* Unit Price */}
                                                <td className="px-4 py-3 text-right text-slate-600">
                                                    {isMultiItem ? '-' : formatNumber(group.items[0].unit_price, 0)}
                                                </td>
                                                
                                                {/* Total */}
                                                <td className="px-4 py-3 text-right">
                                                    <div className={`font-bold ${isMultiItem ? 'text-primary-700' : 'text-emerald-700'}`}>
                                                        {formatNumber(isMultiItem ? group.totalAmount : group.items[0].transport_fee, 0)}
                                                    </div>
                                                </td>
                                            </tr>
                                            
                                            {/* Expanded Items */}
                                            {isMultiItem && isExpanded && group.items.map((item, idx) => (
                                                <tr 
                                                    key={item.id} 
                                                    className="bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
                                                >
                                                    <td className="px-4 py-2"></td>
                                                    <td className="px-4 py-2">
                                                        <div className="flex items-center gap-2 pl-2 border-l-2 border-primary-200">
                                                            <span className="text-xs text-slate-400">#{idx + 1}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2"></td>
                                                    <td className="px-4 py-2">
                                                        <div className="font-medium text-slate-700 text-sm">
                                                            {item.material?.name || 'Vật tư'}
                                                        </div>
                                                        <div className="text-xs text-slate-400 font-mono">
                                                            {item.material?.code || '-'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-right font-medium text-slate-700">
                                                        {formatNumber(item.quantity_primary, 2)}
                                                    </td>
                                                    <td className="px-4 py-2 text-right text-slate-500 text-sm">
                                                        {formatNumber(item.density, 2)}
                                                    </td>
                                                    <td className="px-4 py-2 text-right text-slate-500 text-sm">
                                                        {formatNumber(item.unit_price, 0)}
                                                    </td>
                                                    <td className="px-4 py-2 text-right font-semibold text-slate-700">
                                                        {formatNumber(item.transport_fee, 0)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                            
                            {/* Table Footer - Totals */}
                            <tfoot className="bg-gradient-to-r from-slate-100 to-slate-50 border-t-2 border-slate-200">
                                <tr className="font-semibold text-slate-800">
                                    <td className="px-4 py-4"></td>
                                    <td className="px-4 py-4 text-sm uppercase tracking-wide">Tổng cộng</td>
                                    <td className="px-4 py-4">
                                        <Badge variant="slate" className="text-xs">
                                            {totalTrips} chuyến
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4">
                                        <Badge variant="slate" className="text-xs">
                                            {records.length} vật tư
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="text-lg font-bold text-primary-700">
                                            {formatNumber(totalQty, 2)}
                                        </div>
                                        <div className="text-xs text-slate-500">tấn</div>
                                    </td>
                                    <td className="px-4 py-4"></td>
                                    <td className="px-4 py-4"></td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="text-lg font-bold text-emerald-700">
                                            {formatNumber(totalAmount, 0)}
                                        </div>
                                        <div className="text-xs text-slate-500">VNĐ</div>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </Card>
        </div>
    );
};
