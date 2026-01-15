import { useState, useEffect } from 'react';
import {
    Package,
    FolderKanban,
    Warehouse as WarehouseIcon,
    Truck,
    FileInput,
    FileOutput,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatsCard, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { api } from '@/lib/api';

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
                <p className="font-bold text-slate-900 mb-1">{label}</p>
                <div className="space-y-1">
                    <p className="text-sm text-primary-600 font-bold">
                        Doanh thu: {formatCurrency(payload[0].value)}
                    </p>
                    <p className="text-sm text-success-600 font-bold">
                        Lợi nhuận: {formatCurrency(payload[1].value)}
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export function DashboardPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.reports.getDashboard() as any;
            if (res.success) {
                setData(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse">Đang tải dữ liệu hệ thống...</p>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Welcome section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                        Xin chào, {user?.full_name || 'Người dùng'}! 👋
                    </h1>
                    <p className="text-slate-500">
                        Đây là tổng quan hoạt động của hệ thống hôm nay.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/purchases/new"
                        className="btn btn-primary btn-md shadow-lg shadow-primary-100"
                    >
                        <FileInput className="w-4 h-4" />
                        Nhập mua
                    </Link>
                    <Link
                        to="/exports/new"
                        className="btn btn-secondary btn-md shadow-lg shadow-slate-100"
                    >
                        <FileOutput className="w-4 h-4" />
                        Xuất bán
                    </Link>
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Dự án đang chạy"
                    value={data.counts.activeProjects}
                    change={0}
                    trend="up"
                    icon={<FolderKanban className="w-5 h-5" />}
                />
                <StatsCard
                    title="Nhập hôm nay"
                    value={`${formatNumber(data.today.purchases.tons, 1)} Tấn`}
                    change={0}
                    trend="up"
                    icon={<FileInput className="w-5 h-5" />}
                />
                <StatsCard
                    title="Xuất hôm nay"
                    value={`${formatNumber(data.today.exports.m3, 1)} m³`}
                    change={0}
                    trend="down"
                    icon={<FileOutput className="w-5 h-5" />}
                />
                <StatsCard
                    title="Lợi nhuận tháng"
                    value={formatCurrency(data.monthly.profit)}
                    change={0}
                    trend="up"
                    icon={<TrendingUp className="w-5 h-5" />}
                />
            </div>

            <Card className="border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50">
                    <div>
                        <CardTitle>Doanh thu & Lợi nhuận</CardTitle>
                        <p className="text-xs text-slate-500 mt-1">Xu hướng tài chính trong 7 ngày qua</p>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-80 w-full pt-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={data.chartData}
                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickFormatter={(value) => `${value / 1000000}Tr`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="top"
                                    align="right"
                                    iconType="circle"
                                    content={({ payload }: any) => (
                                        <div className="flex gap-4 justify-end mb-6 text-[11px] font-bold uppercase tracking-wider">
                                            {payload.map((entry: any, index: number) => (
                                                <div key={`item-${index}`} className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                    <span className="text-slate-500">{entry.value === 'revenue' ? 'Doanh thu' : 'Lợi nhuận'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                />
                                <Area
                                    name="revenue"
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#2563eb"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRev)"
                                />
                                <Area
                                    name="profit"
                                    type="monotone"
                                    dataKey="profit"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorProfit)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Quick access cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to="/projects" className="card-hover p-4 flex items-center gap-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                        <FolderKanban className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 leading-none">{data.counts.totalProjects}</p>
                        <p className="text-xs text-slate-500 mt-1">Dự án</p>
                    </div>
                </Link>
                <Link to="/materials" className="card-hover p-4 flex items-center gap-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <div className="w-10 h-10 bg-success-50 rounded-xl flex items-center justify-center">
                        <Package className="w-5 h-5 text-success-600" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 leading-none">{data.counts.totalMaterials}</p>
                        <p className="text-xs text-slate-500 mt-1">Hàng hóa</p>
                    </div>
                </Link>
                <Link to="/warehouses" className="card-hover p-4 flex items-center gap-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <div className="w-10 h-10 bg-warning-50 rounded-xl flex items-center justify-center">
                        <WarehouseIcon className="w-5 h-5 text-warning-600" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 leading-none">{data.counts.totalWarehouses}</p>
                        <p className="text-xs text-slate-500 mt-1">Kho</p>
                    </div>
                </Link>
                <Link to="/vehicles" className="card-hover p-4 flex items-center gap-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <div className="w-10 h-10 bg-accent-50 rounded-xl flex items-center justify-center">
                        <Truck className="w-5 h-5 text-accent-600" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 leading-none">{data.counts.totalVehicles}</p>
                        <p className="text-xs text-slate-500 mt-1">Xe</p>
                    </div>
                </Link>
            </div>

            {/* Recent transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Purchases */}
                <Card className="border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 py-4">
                        <CardTitle className="text-lg">Nhập mua gần đây</CardTitle>
                        <Link
                            to="/purchases"
                            className="text-xs text-primary-600 hover:text-primary-700 font-bold uppercase tracking-wider flex items-center gap-1"
                        >
                            Tất cả
                            <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            {data.recent.purchases.length === 0 ? (
                                <div className="py-10 text-center text-slate-400 italic text-sm">Chưa có giao dịch nhập mua</div>
                            ) : (
                                data.recent.purchases.map((item: any) => (
                                    <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-success-50 rounded-xl flex items-center justify-center shrink-0">
                                                <ArrowDownRight className="w-5 h-5 text-success-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <Link
                                                    to={`/purchases/${item.id}`}
                                                    className="text-[10px] font-bold text-primary-600 hover:text-primary-700 uppercase tracking-wider block mb-0.5"
                                                >
                                                    {item.receipt_number}
                                                </Link>
                                                <p className="font-bold text-slate-900 text-sm truncate max-w-[200px]" title={item.material_summary}>
                                                    {item.material_summary}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="text-[10px] text-slate-400 font-medium">Người tạo:</span>
                                                    <span className="text-[10px] text-slate-600 font-bold uppercase">{item.creator?.full_name}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-bold text-slate-900 text-sm">
                                                +{formatNumber(item.total_quantity_primary, 1)} Tấn
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{new Date(item.receipt_date).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Exports */}
                <Card className="border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 py-4">
                        <CardTitle className="text-lg">Xuất bán gần đây</CardTitle>
                        <Link
                            to="/exports"
                            className="text-xs text-primary-600 hover:text-primary-700 font-bold uppercase tracking-wider flex items-center gap-1"
                        >
                            Tất cả
                            <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            {data.recent.exports.length === 0 ? (
                                <div className="py-10 text-center text-slate-400 italic text-sm">Chưa có giao dịch xuất bán</div>
                            ) : (
                                data.recent.exports.map((item: any) => (
                                    <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-danger-50 rounded-xl flex items-center justify-center shrink-0">
                                                <ArrowUpRight className="w-5 h-5 text-danger-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <Link
                                                    to={`/exports/${item.id}`}
                                                    className="text-[10px] font-bold text-primary-600 hover:text-primary-700 uppercase tracking-wider block mb-0.5"
                                                >
                                                    {item.receipt_number}
                                                </Link>
                                                <p className="font-bold text-slate-900 text-sm truncate max-w-[200px]" title={item.material_summary}>
                                                    {item.material_summary}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="text-[10px] text-slate-400 font-medium">Người tạo:</span>
                                                    <span className="text-[10px] text-slate-600 font-bold uppercase">{item.creator?.full_name}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-bold text-slate-900 text-sm">
                                                -{formatNumber(item.total_quantity_secondary, 1)} m³
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{item.vehicle?.plate_number}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

