import { useState, useEffect, useCallback } from 'react';
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
    Loader2,
    RefreshCw,
    CircleDollarSign,
    Scale,
    Activity,
    Calendar,
    ChevronRight,
    Sparkles,
    BarChart3,
    Boxes
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
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
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-sm p-4 border border-slate-200 shadow-xl rounded-xl">
                <p className="font-bold text-slate-900 mb-2 text-sm">{label}</p>
                <div className="space-y-1.5">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                            <div 
                                className="w-2.5 h-2.5 rounded-full" 
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-xs text-slate-500">
                                {entry.dataKey === 'revenue' ? 'Doanh thu' : entry.dataKey === 'profit' ? 'Lợi nhuận' : 'Chi phí'}:
                            </span>
                            <span className="text-xs font-bold" style={{ color: entry.color }}>
                                {formatCurrency(entry.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

// Animated counter component
const AnimatedNumber = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
    return (
        <span className="tabular-nums">
            {formatNumber(value, 1)}{suffix}
        </span>
    );
};

export function DashboardPage() {
    const { user } = useAuth();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<any>(null);

    const fetchData = useCallback(async (showRefreshing = false) => {
        try {
            if (showRefreshing) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            const res = await api.reports.getDashboard() as any;
            if (res.success) {
                setData(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Refetch when navigating to dashboard
    useEffect(() => {
        fetchData();
    }, [location.key, fetchData]);

    if (loading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary-500 to-primary-400 animate-pulse" />
                    <Loader2 className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
                </div>
                <div className="text-center">
                    <p className="text-slate-700 font-semibold">Đang tải dữ liệu...</p>
                    <p className="text-slate-400 text-sm mt-1">Vui lòng chờ trong giây lát</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    // Calculate additional metrics
    const profitMargin = data.monthly.revenue > 0 
        ? ((data.monthly.profit / data.monthly.revenue) * 100).toFixed(1) 
        : '0';

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Hero Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl">
                {/* Decorative elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent" />
                </div>
                
                <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm items-center justify-center border border-white/20">
                            <Sparkles className="w-7 h-7 text-yellow-400" />
                        </div>
                        <div>
                            <p className="text-primary-300 text-sm font-medium mb-1 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                                Xin chào, {user?.full_name?.split(' ').pop() || 'Admin'}! 👋
                            </h1>
                            <p className="text-slate-400 mt-1 text-sm md:text-base">
                                Tổng quan hoạt động kinh doanh của bạn hôm nay
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => fetchData(true)}
                            disabled={refreshing}
                            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all group"
                            title="Làm mới dữ liệu"
                        >
                            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                        </button>
                        <Link
                            to="/purchases/new"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 font-semibold text-sm shadow-lg shadow-emerald-500/25 transition-all hover:scale-105"
                        >
                            <FileInput className="w-4 h-4" />
                            Nhập mua
                        </Link>
                        <Link
                            to="/exports/new"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 font-semibold text-sm transition-all hover:scale-105"
                        >
                            <FileOutput className="w-4 h-4" />
                            Xuất bán
                        </Link>
                    </div>
                </div>

                {/* Quick Stats in Header */}
                <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <Scale className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">
                                <AnimatedNumber value={data.today.purchases.tons} suffix=" T" />
                            </p>
                            <p className="text-xs text-slate-400">Nhập hôm nay</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                            <Boxes className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">
                                <AnimatedNumber value={data.today.exports.m3} suffix=" m³" />
                            </p>
                            <p className="text-xs text-slate-400">Xuất hôm nay</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <CircleDollarSign className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{formatCurrency(data.monthly.revenue).replace('₫', '')}</p>
                            <p className="text-xs text-slate-400">Doanh thu tháng</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{formatCurrency(data.monthly.profit).replace('₫', '')}</p>
                            <p className="text-xs text-slate-400">Lợi nhuận ({profitMargin}%)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Chart Section - Takes 2 columns */}
                <div className="xl:col-span-2">
                    <Card className="border-0 shadow-lg bg-white overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-200">
                                        <BarChart3 className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Biểu đồ Doanh thu & Lợi nhuận</CardTitle>
                                        <p className="text-xs text-slate-500 mt-0.5">7 ngày gần nhất</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-primary-500" />
                                        <span className="text-slate-600">Doanh thu</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                        <span className="text-slate-600">Lợi nhuận</span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={data.chartData}
                                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 11 }}
                                            tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(0)}Tr` : `${(value / 1000).toFixed(0)}K`}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="#3b82f6"
                                            strokeWidth={2.5}
                                            fillOpacity={1}
                                            fill="url(#colorRevenue)"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="profit"
                                            stroke="#10b981"
                                            strokeWidth={2.5}
                                            fillOpacity={1}
                                            fill="url(#colorProfit)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Sidebar - Quick Access */}
                <div className="space-y-6">
                    {/* Project Stats */}
                    <Card className="border-0 shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <Activity className="w-6 h-6" />
                                </div>
                                <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold">
                                    {data.counts.activeProjects} đang chạy
                                </span>
                            </div>
                            <p className="text-indigo-200 text-sm font-medium">Tổng dự án</p>
                            <p className="text-4xl font-bold mt-1">{data.counts.totalProjects}</p>
                        </div>
                    </Card>

                    {/* Quick Links */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider">Truy cập nhanh</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                <Link to="/materials" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Package className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">Hàng hóa</p>
                                            <p className="text-xs text-slate-400">{data.counts.totalMaterials} sản phẩm</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                                </Link>
                                <Link to="/warehouses" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <WarehouseIcon className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">Kho hàng</p>
                                            <p className="text-xs text-slate-400">{data.counts.totalWarehouses} kho</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                                </Link>
                                <Link to="/vehicles" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Truck className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">Phương tiện</p>
                                            <p className="text-xs text-slate-400">{data.counts.totalVehicles} xe</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                                </Link>
                                <Link to="/projects" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FolderKanban className="w-5 h-5 text-violet-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">Dự án</p>
                                            <p className="text-xs text-slate-400">{data.counts.totalProjects} dự án</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Purchases */}
                <Card className="border-0 shadow-lg overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                                    <ArrowDownRight className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Nhập mua gần đây</CardTitle>
                                    <p className="text-xs text-slate-500">5 phiếu mới nhất</p>
                                </div>
                            </div>
                            <Link
                                to="/purchases"
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold hover:bg-emerald-200 transition-colors"
                            >
                                Xem tất cả
                                <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            {data.recent.purchases.length === 0 ? (
                                <div className="py-12 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                                        <FileInput className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 font-medium">Chưa có giao dịch nhập mua</p>
                                    <Link to="/purchases/new" className="text-primary-600 text-sm font-semibold hover:underline mt-2 inline-block">
                                        Tạo phiếu nhập đầu tiên →
                                    </Link>
                                </div>
                            ) : (
                                data.recent.purchases.map((item: any, index: number) => (
                                    <Link 
                                        key={item.id} 
                                        to={`/purchases/${item.id}`}
                                        className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center font-bold text-emerald-600 text-sm shrink-0">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                                                    {item.receipt_number}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(item.receipt_date).toLocaleDateString('vi-VN')}
                                                </span>
                                            </div>
                                            <p className="font-medium text-slate-800 text-sm truncate" title={item.material_summary}>
                                                {item.material_summary}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Người tạo: <span className="text-slate-600 font-medium">{item.creator?.full_name}</span>
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-bold text-emerald-600">
                                                +{formatNumber(item.total_quantity_primary || 0, 1)} T
                                            </p>
                                            <p className="text-xs text-slate-400">{formatCurrency(item.total_amount || 0)}</p>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Exports */}
                <Card className="border-0 shadow-lg overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-200">
                                    <ArrowUpRight className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Xuất bán gần đây</CardTitle>
                                    <p className="text-xs text-slate-500">5 phiếu mới nhất</p>
                                </div>
                            </div>
                            <Link
                                to="/exports"
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 text-xs font-bold hover:bg-orange-200 transition-colors"
                            >
                                Xem tất cả
                                <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            {data.recent.exports.length === 0 ? (
                                <div className="py-12 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                                        <FileOutput className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 font-medium">Chưa có giao dịch xuất bán</p>
                                    <Link to="/exports/new" className="text-primary-600 text-sm font-semibold hover:underline mt-2 inline-block">
                                        Tạo phiếu xuất đầu tiên →
                                    </Link>
                                </div>
                            ) : (
                                data.recent.exports.map((item: any, index: number) => (
                                    <Link 
                                        key={item.id} 
                                        to={`/exports/${item.id}`}
                                        className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center font-bold text-orange-600 text-sm shrink-0">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                                                    {item.receipt_number}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(item.receipt_date).toLocaleDateString('vi-VN')}
                                                </span>
                                            </div>
                                            <p className="font-medium text-slate-800 text-sm truncate" title={item.material_summary}>
                                                {item.material_summary}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Khách hàng: <span className="text-slate-600 font-medium">{item.customer_name || 'N/A'}</span>
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-bold text-orange-600">
                                                -{formatNumber(item.total_quantity_secondary || 0, 1)} m³
                                            </p>
                                            <p className="text-xs text-slate-400">{item.vehicle?.plate_number || '—'}</p>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

