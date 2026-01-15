import { Router, Request, Response, NextFunction } from 'express';
import { getSupabaseClient } from '../database/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

/**
 * GET /api/warehouses
 */
router.get('/', authorize('warehouses:read'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            page = '1',
            limit = '10',
            search = '',
            status = '',
            all = 'false'
        } = req.query;

        const supabase = getSupabaseClient();

        let query = supabase
            .from('warehouses')
            .select('*', { count: 'exact' })
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (search) {
            query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
        }

        if (status) {
            query = query.eq('status', status);
        }

        if (all !== 'true') {
            const pageNum = parseInt(page as string, 10);
            const limitNum = parseInt(limit as string, 10);
            const offset = (pageNum - 1) * limitNum;
            query = query.range(offset, offset + limitNum - 1);

            const { data, error, count } = await query;
            if (error) throw new AppError(error.message, 500);

            res.json({
                success: true,
                data: {
                    items: data,
                    total: count || 0,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil((count || 0) / limitNum),
                },
            });
        } else {
            const { data, error } = await query;
            if (error) throw new AppError(error.message, 500);

            res.json({
                success: true,
                data: {
                    items: data,
                },
            });
        }
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/warehouses/:id
 */
router.get('/:id', authorize('warehouses:read'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('warehouses')
            .select('*')
            .eq('id', id)
            .is('deleted_at', null)
            .single();

        if (error || !data) {
            throw new AppError('Không tìm thấy kho', 404);
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
 * GET /api/warehouses/:id/inventory
 */
router.get('/:id/inventory', authorize('warehouses:read'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();

        const [materialsRes, purchasesRes, exportsRes] = await Promise.all([
            supabase.from('materials').select('*').is('deleted_at', null),

            // NEW: Get incoming stock from purchase_receipt_items merged with purchase_receipts status
            supabase.from('purchase_receipt_items')
                .select(`
                    material_id, 
                    quantity_primary,
                    purchase_receipts!inner(warehouse_id, status)
                `)
                .eq('purchase_receipts.warehouse_id', id)
                .eq('purchase_receipts.status', 'completed')
                .is('purchase_receipts.deleted_at', null),

            supabase.from('export_receipt_items')
                .select(`
                    material_id,
                    quantity_primary,
                    export_receipts!inner(warehouse_id, deleted_at)
                `)
                .eq('export_receipts.warehouse_id', id)
                .is('export_receipts.deleted_at', null)
        ]);

        if (materialsRes.error) throw new AppError(materialsRes.error.message, 500);

        const inventory: Record<string, { material: any, in: number, out: number, stock: number }> = {};

        // Init materials
        materialsRes.data.forEach((m: any) => {
            inventory[m.id] = { material: m, in: 0, out: 0, stock: 0 };
        });

        // Process In (Purchases)
        if (purchasesRes.data) {
            purchasesRes.data.forEach((p: any) => {
                if (inventory[p.material_id]) {
                    inventory[p.material_id].in += Number(p.quantity_primary || 0);
                }
            });
        }

        // Process Out (Exports)
        if (exportsRes.data) {
            exportsRes.data.forEach((e: any) => {
                if (inventory[e.material_id]) {
                    inventory[e.material_id].out += Number(e.quantity_primary || 0);
                }
            });
        }

        // Finalize
        const result = Object.values(inventory).map(i => ({
            ...i,
            stock: i.in - i.out
        })).filter(i => i.in > 0 || i.out > 0);

        res.json({
            success: true,
            data: result
        });

    } catch (err) { next(err); }
});

// ... POST/PUT/DELETE remain the same ...
/**
 * POST /api/warehouses
 */
router.post('/', authorize('warehouses:write'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, code, address, description, capacity, status } = req.body;
        if (!name) throw new AppError('Tên kho là bắt buộc', 400);

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('warehouses')
            .insert({
                name,
                code: code || `KHO-${Date.now().toString().slice(-6)}`,
                address,
                description,
                capacity: capacity || 0,
                status: status || 'active',
                created_by: (req as any).user?.userId
            })
            .select()
            .single();

        if (error) throw new AppError(error.message, 500);

        res.status(201).json({
            success: true,
            data,
            message: 'Tạo kho thành công',
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/warehouses/:id
 */
router.put('/:id', authorize('warehouses:write'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name, code, address, description, capacity, status } = req.body;
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('warehouses')
            .update({
                name, code, address, description, capacity, status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new AppError(error.message, 500);
        res.json({ success: true, data, message: 'Cập nhật kho thành công' });
    } catch (error) { next(error); }
});

/**
 * DELETE /api/warehouses/:id
 */
router.delete('/:id', authorize('warehouses:delete'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('warehouses')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw new AppError(error.message, 500);
        res.json({ success: true, message: 'Xóa kho thành công' });
    } catch (error) { next(error); }
});

export default router;
