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

        // Get today's transactions - query from BOTH old and new tables
        const [purchasesTodayOld, purchasesTodayNew, exportsTody] = await Promise.all([
            // Old table: purchase_receipts
            supabase
                .from('purchase_receipts')
                .select('quantity_primary, quantity_secondary, total_amount')
                .eq('receipt_date', today)
                .is('deleted_at', null),
            // New table: purchase_receipt_headers
            supabase
                .from('purchase_receipt_headers')
                .select('total_quantity_primary, total_quantity_secondary, total_amount')
                .eq('receipt_date', today)
                .is('deleted_at', null),
            supabase
                .from('export_receipts')
                .select('quantity_primary, quantity_secondary, total_amount')
                .eq('receipt_date', today)
                .is('deleted_at', null),
        ]);

        // Combine old + new purchase data
        const oldPurchaseTons = purchasesTodayOld.data?.reduce((sum, r) => sum + (r.quantity_primary || 0), 0) || 0;
        const oldPurchaseM3 = purchasesTodayOld.data?.reduce((sum, r) => sum + (r.quantity_secondary || 0), 0) || 0;
        const newPurchaseTons = purchasesTodayNew.data?.reduce((sum, r) => sum + (r.total_quantity_primary || 0), 0) || 0;
        const newPurchaseM3 = purchasesTodayNew.data?.reduce((sum, r) => sum + (r.total_quantity_secondary || 0), 0) || 0;

        // Get monthly totals - query from BOTH old and new tables
        const [purchasesMonthOld, purchasesMonthNew, exportsMonth] = await Promise.all([
            supabase
                .from('purchase_receipts')
                .select('total_amount')
                .gte('receipt_date', monthStart)
                .is('deleted_at', null),
            supabase
                .from('purchase_receipt_headers')
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
            count: (purchasesTodayOld.data?.length || 0) + (purchasesTodayNew.data?.length || 0),
            tons: oldPurchaseTons + newPurchaseTons,
            m3: oldPurchaseM3 + newPurchaseM3,
        };

        const todayExportStats = {
            count: exportsTody.data?.length || 0,
            tons: exportsTody.data?.reduce((sum, r) => sum + (r.quantity_primary || 0), 0) || 0,
            m3: exportsTody.data?.reduce((sum, r) => sum + (r.quantity_secondary || 0), 0) || 0,
        };

        const monthlyRevenue = exportsMonth.data?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0;
        const monthlyCostOld = purchasesMonthOld.data?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0;
        const monthlyCostNew = purchasesMonthNew.data?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0;
        const monthlyCost = monthlyCostOld + monthlyCostNew;
        const monthlyProfit = monthlyRevenue - monthlyCost;

        // Get weekly data for chart (last 7 days) - query from BOTH tables
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const chartStart = sevenDaysAgo.toISOString().split('T')[0];

        const [weeklyPurchasesOld, weeklyPurchasesNew, weeklyExports] = await Promise.all([
            supabase
                .from('purchase_receipts')
                .select('receipt_date, total_amount')
                .gte('receipt_date', chartStart)
                .is('deleted_at', null)
                .order('receipt_date', { ascending: true }),
            supabase
                .from('purchase_receipt_headers')
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

        // Add costs from both old and new purchase tables
        weeklyPurchasesOld.data?.forEach((r: any) => {
            if (chartDataMap[r.receipt_date]) {
                chartDataMap[r.receipt_date].cost += (r.total_amount || 0);
            }
        });
        weeklyPurchasesNew.data?.forEach((r: any) => {
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

        // Recent transactions (last 5) - query from BOTH old and new purchase tables
        const [recentPurchasesOldRes, recentPurchasesNewRes, recentExportsRes] = await Promise.all([
            // Old table
            supabase
                .from('purchase_receipts')
                .select(`
                    id,
                    receipt_number,
                    receipt_date,
                    total_amount,
                    quantity_primary,
                    warehouse: warehouses(name),
                    creator: users!purchase_receipts_created_by_fkey(full_name),
                    items: purchase_receipt_items(
                        material: materials(name)
                    )
                `)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(5),
            // New table
            supabase
                .from('purchase_receipt_headers')
                .select(`
                    id,
                    receipt_number,
                    receipt_date,
                    total_amount,
                    total_quantity_primary,
                    creator: users!purchase_receipt_headers_created_by_fkey(full_name),
                    items: purchase_receipt_items_v2(
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

        // Combine and sort recent purchases from both tables
        const oldPurchases = (recentPurchasesOldRes.data || []).map((item: any) => ({
            ...item,
            total_quantity_primary: item.quantity_primary, // normalize field name
            material_summary: item.items?.map((i: any) => i.material?.name).join(', ') || 'N/A',
            _source: 'old'
        }));
        const newPurchases = (recentPurchasesNewRes.data || []).map((item: any) => ({
            ...item,
            material_summary: item.items?.map((i: any) => i.material?.name).join(', ') || 'N/A',
            _source: 'new'
        }));
        
        // Merge and get top 5 by receipt_date
        const recentPurchases = [...oldPurchases, ...newPurchases]
            .sort((a, b) => new Date(b.receipt_date).getTime() - new Date(a.receipt_date).getTime())
            .slice(0, 5);

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
 * Get transport/vehicle report - Query from purchase_receipt_headers with items
 */
router.get('/transport', authorize('reports:read'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { from_date, to_date, vehicle_id } = req.query;

        if (!from_date || !to_date) {
            throw new AppError('Ngày bắt đầu và kết thúc là bắt buộc', 400);
        }

        const supabase = getSupabaseClient();

        // Query from purchase_receipt_headers with nested items and transport_records
        // vehicle_plate, driver_name are in transport_records, not headers
        let query = supabase
            .from('purchase_receipt_headers')
            .select(`
                id,
                receipt_number,
                receipt_type,
                receipt_date,
                deleted_at,
                transport_records(
                    vehicle_id,
                    transport_unit_id,
                    vehicle_plate,
                    driver_name,
                    vehicle:vehicles(id, plate_number, driver_name, transport_unit_id),
                    transport_unit:transport_units(id, name, contact_name, phone)
                ),
                items:purchase_receipt_items_v2(
                    id,
                    material_id,
                    quantity_primary,
                    quantity_secondary,
                    density_used,
                    unit_price,
                    total_amount,
                    material:materials(id, name, code)
                )
            `)
            .gte('receipt_date', from_date)
            .lte('receipt_date', to_date)
            .is('deleted_at', null);

        const { data, error } = await query.order('receipt_date', { ascending: false });

        if (error) throw new AppError(error.message, 500);

        // Filter by vehicle_id if provided
        let filteredData = data || [];
        if (vehicle_id) {
            filteredData = filteredData.filter((h: any) => {
                // transport_records can be object (due to UNIQUE constraint) or array
                const tr = h.transport_records;
                if (Array.isArray(tr)) {
                    return tr.some((t: any) => t.vehicle_id === vehicle_id);
                }
                return tr?.vehicle_id === vehicle_id;
            });
        }

        // Flatten data: one row per item with header info
        const transformedData: any[] = [];
        filteredData.forEach((header: any) => {
            // transport_records is an object (due to UNIQUE constraint on receipt_id), not array
            const tr = header.transport_records;
            const transportRecord = Array.isArray(tr) ? tr[0] : tr;
            const vehicle = transportRecord?.vehicle;
            const transportUnit = transportRecord?.transport_unit;
            
            header.items?.forEach((item: any) => {
                transformedData.push({
                    id: item.id,
                    transport_date: header.receipt_date,
                    transport_company: transportUnit?.name || '',
                    vehicle_plate: transportRecord?.vehicle_plate || vehicle?.plate_number || '',
                    ticket_number: header.receipt_number || '',
                    material_id: item.material_id,
                    material: item.material,
                    quantity_primary: item.quantity_primary,
                    density: item.density_used || 0,
                    unit_price: item.unit_price || 0,
                    transport_fee: item.total_amount || 0,
                    driver_name: transportRecord?.driver_name || vehicle?.driver_name || '',
                    origin: '',
                    destination: '',
                    notes: '',
                    receipt_id: header.id,
                    vehicle_id: transportRecord?.vehicle_id,
                    transport_unit_id: transportRecord?.transport_unit_id,
                    vehicle: vehicle,
                    transport_unit: transportUnit,
                    receipt: {
                        id: header.id,
                        receipt_number: header.receipt_number,
                        receipt_type: header.receipt_type
                    }
                });
            });
        });

        console.log('Transformed data count:', transformedData.length);

        // Aggregate by vehicle
        const vehicleSummary: Record<string, {
            vehicle_id: string;
            plate_number: string;
            total_trips: number;
            total_tons: number;
        }> = {};

        // Count unique receipts per vehicle for trip count
        const vehicleReceipts: Record<string, Set<string>> = {};

        transformedData.forEach((log: any) => {
            const vid = log.vehicle_id;
            if (vid && !vehicleSummary[vid]) {
                vehicleSummary[vid] = {
                    vehicle_id: vid,
                    plate_number: log.vehicle?.plate_number || log.vehicle_plate || '',
                    total_trips: 0,
                    total_tons: 0,
                };
                vehicleReceipts[vid] = new Set();
            }
            if (vid) {
                vehicleReceipts[vid].add(log.receipt_id);
                vehicleSummary[vid].total_tons += parseFloat(log.quantity_primary) || 0;
            }
        });

        // Set trip count from unique receipts
        Object.keys(vehicleSummary).forEach(vid => {
            vehicleSummary[vid].total_trips = vehicleReceipts[vid].size;
        });

        res.json({
            success: true,
            data: {
                details: transformedData,
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
