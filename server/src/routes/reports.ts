import { Router, Request, Response, NextFunction } from 'express';
import { getSupabaseClient } from '../database/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

/**
 * GET /api/reports/dashboard
 * Get dashboard overview data
 */
router.get('/dashboard', authorize('reports:read', 'purchases:read'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const supabase = getSupabaseClient();
        const today = new Date().toISOString().split('T')[0];
        const thisMonth = new Date();
        thisMonth.setDate(1);
        const monthStart = thisMonth.toISOString().split('T')[0];

        // Get counts
        const [projectsResult, materialsResult, vehiclesResult] = await Promise.all([
            supabase.from('projects').select('id', { count: 'exact' }).eq('status', 'active').is('deleted_at', null),
            supabase.from('materials').select('id', { count: 'exact' }).eq('is_active', true).is('deleted_at', null),
            supabase.from('vehicles').select('id', { count: 'exact' }).eq('is_active', true).is('deleted_at', null),
        ]);

        // Get today's transactions
        const [purchasesToday, exportsTody] = await Promise.all([
            supabase
                .from('purchase_receipts')
                .select('quantity_primary, quantity_secondary, total_amount')
                .eq('receipt_date', today)
                .is('deleted_at', null),
            supabase
                .from('export_receipts')
                .select('quantity_primary, quantity_secondary, total_amount')
                .eq('receipt_date', today)
                .is('deleted_at', null),
        ]);

        // Get monthly totals
        const [purchasesMonth, exportsMonth] = await Promise.all([
            supabase
                .from('purchase_receipts')
                .select('total_amount')
                .gte('receipt_date', monthStart)
                .is('deleted_at', null),
            supabase
                .from('export_receipts')
                .select('total_amount')
                .gte('receipt_date', monthStart)
                .is('deleted_at', null),
        ]);

        const todayPurchaseStats = {
            count: purchasesToday.data?.length || 0,
            tons: purchasesToday.data?.reduce((sum, r) => sum + (r.quantity_primary || 0), 0) || 0,
            m3: purchasesToday.data?.reduce((sum, r) => sum + (r.quantity_secondary || 0), 0) || 0,
        };

        const todayExportStats = {
            count: exportsTody.data?.length || 0,
            tons: exportsTody.data?.reduce((sum, r) => sum + (r.quantity_primary || 0), 0) || 0,
            m3: exportsTody.data?.reduce((sum, r) => sum + (r.quantity_secondary || 0), 0) || 0,
        };

        const monthlyRevenue = exportsMonth.data?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0;
        const monthlyCost = purchasesMonth.data?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0;
        const monthlyProfit = monthlyRevenue - monthlyCost;

        // Get weekly data for chart (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const chartStart = sevenDaysAgo.toISOString().split('T')[0];

        const [weeklyPurchases, weeklyExports] = await Promise.all([
            supabase
                .from('purchase_receipts')
                .select('receipt_date, total_amount')
                .gte('receipt_date', chartStart)
                .is('deleted_at', null)
                .order('receipt_date', { ascending: true }),
            supabase
                .from('export_receipts')
                .select('receipt_date, total_amount')
                .gte('receipt_date', chartStart)
                .is('deleted_at', null)
                .order('receipt_date', { ascending: true }),
        ]);

        // Process chart data
        const chartDataMap: Record<string, { date: string; revenue: number; profit: number; cost: number }> = {};
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dateStr = date.toISOString().split('T')[0];
            const displayDate = dateStr.split('-').reverse().slice(0, 2).join('/'); // DD/MM
            chartDataMap[dateStr] = { date: displayDate, revenue: 0, profit: 0, cost: 0 };
        }

        weeklyExports.data?.forEach((r: any) => {
            if (chartDataMap[r.receipt_date]) {
                chartDataMap[r.receipt_date].revenue += (r.total_amount || 0);
            }
        });

        weeklyPurchases.data?.forEach((r: any) => {
            if (chartDataMap[r.receipt_date]) {
                chartDataMap[r.receipt_date].cost += (r.total_amount || 0);
            }
        });

        const chartData = Object.keys(chartDataMap).sort().map(key => ({
            ...chartDataMap[key],
            profit: chartDataMap[key].revenue - chartDataMap[key].cost
        }));

        // Get total counts (beyond active)
        const [totalProjectsRes, totalMaterialsRes, totalVehiclesRes] = await Promise.all([
            supabase.from('projects').select('id', { count: 'exact' }).is('deleted_at', null),
            supabase.from('materials').select('id', { count: 'exact' }).is('deleted_at', null),
            supabase.from('vehicles').select('id', { count: 'exact' }).is('deleted_at', null),
        ]);

        // Recent transactions (last 5)
        const [recentPurchasesRes, recentExportsRes] = await Promise.all([
            supabase
                .from('purchase_receipts')
                .select(`
id,
    receipt_number,
    receipt_date,
    total_amount,
    total_quantity_primary,
    warehouse: warehouses(name),
        creator: users!purchase_receipts_created_by_fkey(full_name),
            items: purchase_receipt_items(
                material: materials(name)
            )
                `)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(5),
            supabase
                .from('export_receipts')
                .select(`
id,
    receipt_number,
    receipt_date,
    total_amount,
    quantity_secondary,
    vehicle: vehicles(plate_number),
        customer_name,
        creator: users!export_receipts_created_by_fkey(full_name),
            items: export_receipt_items(
                material: materials(name)
            )
                `)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(5),
        ]);

        const recentPurchases = recentPurchasesRes.data?.map((item: any) => ({
            ...item,
            material_summary: item.items?.map((i: any) => i.material?.name).join(', ') || 'N/A'
        })) || [];

        const recentExports = recentExportsRes.data?.map((item: any) => ({
            ...item,
            material_summary: item.items?.map((i: any) => i.material?.name).join(', ') || 'N/A',
            total_quantity_secondary: item.quantity_secondary // map to the name frontend expects
        })) || [];

        res.json({
            success: true,
            data: {
                counts: {
                    activeProjects: projectsResult.count || 0,
                    activeMaterials: materialsResult.count || 0,
                    activeVehicles: vehiclesResult.count || 0,
                    totalProjects: totalProjectsRes.count || 0,
                    totalMaterials: totalMaterialsRes.count || 0,
                    totalVehicles: totalVehiclesRes.count || 0,
                    totalWarehouses: (await supabase.from('warehouses').select('id', { count: 'exact' }).is('deleted_at', null)).count || 0,
                },
                today: {
                    purchases: todayPurchaseStats,
                    exports: todayExportStats,
                },
                monthly: {
                    revenue: monthlyRevenue,
                    cost: monthlyCost,
                    profit: monthlyProfit,
                },
                chartData,
                recent: {
                    purchases: recentPurchases,
                    exports: recentExports,
                }
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/reports/inventory
 * Get current inventory report
 */
router.get('/inventory', authorize('reports:read'), async (req: Request, res: Response, next) => {
    try {
        const { warehouse_id, material_id } = req.query;
        const supabase = getSupabaseClient();

        // Use the view for current inventory
        let query = supabase
            .from('current_inventory')
            .select('*');

        if (warehouse_id) {
            query = query.eq('warehouse_id', warehouse_id);
        }
        if (material_id) {
            query = query.eq('material_id', material_id);
        }

        const { data, error } = await query;

        if (error) {
            // If view doesn't exist yet, calculate manually
            const purchasesQuery = supabase
                .from('purchase_receipts')
                .select(`
warehouse_id,
    warehouses!inner(id, code, name),
        material_id,
        materials!inner(id, code, name, primary_unit, secondary_unit),
            quantity_primary,
            quantity_secondary
                `)
                .is('deleted_at', null);

            const exportsQuery = supabase
                .from('export_receipts')
                .select(`
warehouse_id,
    material_id,
    quantity_primary,
    quantity_secondary
        `)
                .is('deleted_at', null);

            const [purchases, exports] = await Promise.all([purchasesQuery, exportsQuery]);

            // Manual aggregation
            const inventory: Record<string, {
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
            }> = {};

            purchases.data?.forEach((p) => {
                const key = `${p.warehouse_id}_${p.material_id} `;
                if (!inventory[key]) {
                    inventory[key] = {
                        warehouse_id: p.warehouse_id,
                        warehouse_code: (p.warehouses as any).code,
                        warehouse_name: (p.warehouses as any).name,
                        material_id: p.material_id,
                        material_code: (p.materials as any).code,
                        material_name: (p.materials as any).name,
                        primary_unit: (p.materials as any).primary_unit,
                        secondary_unit: (p.materials as any).secondary_unit,
                        stock_primary: 0,
                        stock_secondary: 0,
                    };
                }
                inventory[key].stock_primary += p.quantity_primary || 0;
                inventory[key].stock_secondary += p.quantity_secondary || 0;
            });

            exports.data?.forEach((e) => {
                const key = `${e.warehouse_id}_${e.material_id} `;
                if (inventory[key]) {
                    inventory[key].stock_primary -= e.quantity_primary || 0;
                    inventory[key].stock_secondary -= e.quantity_secondary || 0;
                }
            });

            return res.json({
                success: true,
                data: Object.values(inventory).filter((i) => i.stock_primary > 0 || i.stock_secondary > 0),
            });
        }

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/reports/transport
 * Get transport/vehicle report
 */
router.get('/transport', authorize('reports:read'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { from_date, to_date, vehicle_id } = req.query;

        if (!from_date || !to_date) {
            throw new AppError('Ngày bắt đầu và kết thúc là bắt buộc', 400);
        }

        const supabase = getSupabaseClient();

        let query = supabase
            .from('transport_logs')
            .select(`
    *,
    vehicle: vehicles(id, plate_number, driver_name),
        export_receipt: export_receipts(
            id,
            receipt_number,
            material: materials(id, name)
        )
            `)
            .gte('created_at', from_date)
            .lte('created_at', to_date);

        if (vehicle_id) {
            query = query.eq('vehicle_id', vehicle_id);
        }

        const { data, error } = await query;

        if (error) throw new AppError(error.message, 500);

        // Aggregate by vehicle
        const vehicleSummary: Record<string, {
            vehicle_id: string;
            plate_number: string;
            driver_name: string;
            total_trips: number;
            total_m3: number;
            total_distance_km: number;
        }> = {};

        data?.forEach((log: any) => {
            const vid = log.vehicle_id;
            if (!vehicleSummary[vid]) {
                vehicleSummary[vid] = {
                    vehicle_id: vid,
                    plate_number: (log.vehicle as any)?.plate_number || '',
                    driver_name: (log.vehicle as any)?.driver_name || '',
                    total_trips: 0,
                    total_m3: 0,
                    total_distance_km: 0,
                };
            }
            vehicleSummary[vid].total_trips += 1;
            vehicleSummary[vid].total_m3 += log.quantity_secondary || 0;
            vehicleSummary[vid].total_distance_km += log.distance_km || 0;
        });

        res.json({
            success: true,
            data: {
                details: data,
                summary: Object.values(vehicleSummary),
                period: { from_date, to_date },
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/reports/project-profit
 * Get profit/loss by project
 */
router.get('/project-profit', authorize('reports:read'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { from_date, to_date, project_id } = req.query;

        if (!from_date || !to_date) {
            throw new AppError('Ngày bắt đầu và kết thúc là bắt buộc', 400);
        }

        const supabase = getSupabaseClient();

        // Get purchases by project
        let purchasesQuery = supabase
            .from('purchase_receipts')
            .select('project_id, total_amount, projects!inner(id, code, name)')
            .gte('receipt_date', from_date)
            .lte('receipt_date', to_date)
            .is('deleted_at', null);

        // Get exports by project
        let exportsQuery = supabase
            .from('export_receipts')
            .select('project_id, total_amount')
            .gte('receipt_date', from_date)
            .lte('receipt_date', to_date)
            .is('deleted_at', null);

        if (project_id) {
            purchasesQuery = purchasesQuery.eq('project_id', project_id);
            exportsQuery = exportsQuery.eq('project_id', project_id);
        }

        const [purchases, exports] = await Promise.all([purchasesQuery, exportsQuery]);

        // Aggregate by project
        const projectStats: Record<string, {
            project_id: string;
            project_code: string;
            project_name: string;
            total_purchase: number;
            total_export: number;
            profit: number;
            profit_margin: number;
        }> = {};

        purchases.data?.forEach((p: any) => {
            const pid = p.project_id;
            if (!projectStats[pid]) {
                projectStats[pid] = {
                    project_id: pid,
                    project_code: (p.projects as any).code,
                    project_name: (p.projects as any).name,
                    total_purchase: 0,
                    total_export: 0,
                    profit: 0,
                    profit_margin: 0,
                };
            }
            projectStats[pid].total_purchase += p.total_amount || 0;
        });

        exports.data?.forEach((e: any) => {
            const pid = e.project_id;
            if (projectStats[pid]) {
                projectStats[pid].total_export += e.total_amount || 0;
            }
        });

        // Calculate profit and margin
        Object.values(projectStats).forEach((p) => {
            p.profit = p.total_export - p.total_purchase;
            p.profit_margin = p.total_export > 0
                ? ((p.profit / p.total_export) * 100)
                : 0;
        });

        res.json({
            success: true,
            data: {
                projects: Object.values(projectStats),
                period: { from_date, to_date },
                totals: {
                    total_purchase: Object.values(projectStats).reduce((sum, p) => sum + p.total_purchase, 0),
                    total_export: Object.values(projectStats).reduce((sum, p) => sum + p.total_export, 0),
                    total_profit: Object.values(projectStats).reduce((sum, p) => sum + p.profit, 0),
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
