
import React, { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { Loader2, FileBarChart, Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface InventoryItem {
    warehouse_id: string;
    warehouse_code: string;
    warehouse_name: string;
    material_id: string;
    material_code: string;
    material_name: string;
    primary_unit: string;
    secondary_unit: string;
    stock_primary: number;
    stock_secondary: number;
}

interface Warehouse {
    id: string;
    name: string;
}

interface Material {
    id: string;
    name: string;
}

export const InventoryReportPage: React.FC = () => {
    const { error: showError } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<InventoryItem[]>([]);

    // Filters
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
    const [selectedMaterial, setSelectedMaterial] = useState<string>('');

    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const [warehousesRes, materialsRes] = await Promise.all([
                    api.warehouses.getAll({ limit: 100 }),
                    api.materials.getAll({ limit: 100 })
                ]) as any;

                if (warehousesRes.success) setWarehouses(warehousesRes.data.items);
                if (materialsRes.success) setMaterials(materialsRes.data.items);
            } catch (err) {
                console.error("Failed to load master data", err);
            }
        };

        fetchMasterData();
    }, []);

    const fetchReport = async () => {
        setIsLoading(true);
        try {
            const params: any = {};
            if (selectedWarehouse) params.warehouse_id = selectedWarehouse;
            if (selectedMaterial) params.material_id = selectedMaterial;

            const res = await api.reports.getInventory(params) as any;
            if (res.success) {
                setData(res.data);
            }
        } catch (err: any) {
            console.error(err);
            showError('Lỗi tải báo cáo: ' + (err.message || 'Không xác định'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [selectedWarehouse, selectedMaterial]);

    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Báo cáo tồn kho');

        // Define columns
        worksheet.columns = [
            { header: 'STT', key: 'stt', width: 10 },
            { header: 'Kho hàng', key: 'warehouse', width: 30 },
            { header: 'Mã hàng', key: 'material_code', width: 15 },
            { header: 'Tên hàng hóa', key: 'material_name', width: 30 },
            { header: 'Tồn kho (Tấn)', key: 'stock_primary', width: 20 },
            { header: 'Tồn kho (m³)', key: 'stock_secondary', width: 20 },
            { header: 'Đơn vị tính', key: 'unit', width: 15 },
        ];

        // Format header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Add data
        data.forEach((item, index) => {
            worksheet.addRow({
                stt: index + 1,
                warehouse: item.warehouse_name,
                material_code: item.material_code,
                material_name: item.material_name,
                stock_primary: item.stock_primary,
                stock_secondary: item.stock_secondary,
                unit: `${item.primary_unit}/${item.secondary_unit}`
            });
        });

        // Add total row
        const totalRow = worksheet.addRow({
            stt: '',
            warehouse: 'TỔNG CỘNG',
            material_code: '',
            material_name: '',
            stock_primary: totalTons,
            stock_secondary: totalM3,
            unit: ''
        });
        totalRow.font = { bold: true };
        totalRow.getCell('stock_primary').numFmt = '#,##0.00';
        totalRow.getCell('stock_secondary').numFmt = '#,##0.00';

        // Apply borders to all cells
        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Bao_cao_ton_kho_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Calculate totals
    const totalTons = data.reduce((sum, item) => sum + item.stock_primary, 0);
    const totalM3 = data.reduce((sum, item) => sum + item.stock_secondary, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FileBarChart className="w-8 h-8 text-primary-600" />
                        Báo cáo Tồn kho
                    </h1>
                    <p className="text-slate-500">Theo dõi lượng hàng tồn chi tiết theo Tấn & m³</p>
                </div>
                <div className="flex gap-2 print:hidden">
                    <Button variant="outline" onClick={handleExportExcel}>
                        <Download className="w-4 h-4 mr-2" />
                        Xuất Excel
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="print:hidden">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Kho hàng</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedWarehouse}
                                onChange={(e) => setSelectedWarehouse(e.target.value)}
                            >
                                <option value="">Tất cả kho</option>
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Hàng hóa</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedMaterial}
                                onChange={(e) => setSelectedMaterial(e.target.value)}
                            >
                                <option value="">Tất cả hàng hóa</option>
                                {materials.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Report Content */}
            <Card className="overflow-hidden print:shadow-none print:border-none">
                <CardHeader className="bg-slate-50 border-b border-slate-200 print:hidden">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Chi tiết tồn kho</CardTitle>
                        <div className="text-sm text-slate-500">
                            Cập nhật lúc: {new Date().toLocaleString('vi-VN')}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 min-w-[150px]">Kho hàng</th>
                                    <th className="px-4 py-3 min-w-[200px]">Hàng hóa</th>
                                    <th className="px-4 py-3 text-right">Tồn kho (Tấn)</th>
                                    <th className="px-4 py-3 text-right">Tồn kho (m³)</th>
                                    <th className="px-4 py-3 text-right">Đơn vị tính</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                            <div className="flex justify-center items-center gap-2">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Đang tải dữ liệu...
                                            </div>
                                        </td>
                                    </tr>
                                ) : data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                            Không có dữ liệu tồn kho
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {data.map((item, index) => (
                                            <tr key={index} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-medium">{item.warehouse_name}</td>
                                                <td className="px-4 py-3">
                                                    <div>{item.material_name}</div>
                                                    <div className="text-xs text-slate-400">{item.material_code}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-primary-700">
                                                    {formatNumber(item.stock_primary)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-green-700">
                                                    {formatNumber(item.stock_secondary)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-500">
                                                    {item.primary_unit} / {item.secondary_unit}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Totals Row */}
                                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                            <td colSpan={2} className="px-4 py-3 text-right uppercase">Tổng cộng</td>
                                            <td className="px-4 py-3 text-right text-primary-800 text-base">
                                                {formatNumber(totalTons)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-green-800 text-base">
                                                {formatNumber(totalM3)}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Print Footer */}
            <div className="hidden print:block mt-8 text-center text-sm text-slate-500">
                <p>Báo cáo được xuất từ hệ thống EBH lúc {new Date().toLocaleString('vi-VN')}</p>
            </div>
        </div>
    );
};
