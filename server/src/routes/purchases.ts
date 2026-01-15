import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../database/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

/**
 * GET /api/purchases
 */
router.get('/', authorize('purchases:read'), async (req: Request, res: Response, next) => {
    try {
        const {
            search = '',
            warehouse_id,
            project_id,
            date_from,
            date_to,
            page = 1,
            limit = 10
        } = req.query;

        const supabase = getSupabaseClient();
        let query = supabase
            .from('purchase_receipts')
            .select(`
                *,
                warehouse:warehouses(name),
                project:projects(name),
                creator:users!purchase_receipts_created_by_fkey(full_name),
                items:purchase_receipt_items(
                    material:materials(name, code)
                )
            `, { count: 'exact' })
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (search) {
            query = query.or(`receipt_number.ilike.%${search}%,supplier_name.ilike.%${search}%`);
        }
        if (warehouse_id) query = query.eq('warehouse_id', warehouse_id);
        if (project_id) query = query.eq('project_id', project_id);
        if (date_from) query = query.gte('receipt_date', date_from);
        if (date_to) query = query.lte('receipt_date', date_to);

        const from = (Number(page) - 1) * Number(limit);
        const to = from + Number(limit) - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;
        if (error) throw new AppError(error.message, 500);

        // Transform data to show material summary
        const items = data?.map(item => ({
            ...item,
            material_summary: item.items?.map((i: any) => i.material?.name).join(', ') || 'N/A'
        }));

        res.json({
            success: true,
            data: {
                items: items,
                total: count || 0,
                page: Number(page),
                limit: Number(limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/purchases
 */
router.post('/', authorize('purchases:write'), async (req: Request, res: Response, next) => {
    try {
        const {
            warehouse_id,
            project_id,
            supplier_name,
            supplier_phone,
            invoice_number,
            invoice_date,
            receipt_date,
            notes,
            items // Array of { material_id, quantity_primary, unit_price }
        } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new AppError('Vui lòng thêm ít nhất một loại hàng hóa', 400);
        }

        const user = (req as any).user;
        const supabase = getSupabaseClient();

        // 1. Generate receipt number
        const { data: receiptNumber, error: seqError } = await supabase
            .rpc('generate_receipt_number', { prefix: 'PN', tbl_name: 'purchase_receipts' });

        if (seqError) throw new AppError(seqError.message, 500);

        // 2. Insert main receipt
        const { data: receipt, error: receiptError } = await supabase
            .from('purchase_receipts')
            .insert({
                receipt_number: receiptNumber,
                warehouse_id,
                project_id,
                supplier_name,
                supplier_phone,
                invoice_number,
                invoice_date: invoice_date || null,
                receipt_date: receipt_date || new Date().toISOString().split('T')[0],
                notes,
                created_by: user.userId,
                status: 'completed'
            })
            .select()
            .single();

        if (receiptError) throw new AppError(receiptError.message, 500);

        // 3. Process Items
        let totalAmount = 0;
        let totalQuantityPrimary = 0;
        let totalQuantitySecondary = 0;
        const itemsToInsert = [];

        for (const item of items) {
            // Get density for conversion
            const { data: material } = await supabase
                .from('materials')
                .select('current_density')
                .eq('id', item.material_id)
                .single();

            const density = material?.current_density || 1;
            const quantity_primary = Number(item.quantity_primary);
            const quantity_secondary = quantity_primary / density; // Tấn / (Tấn/m3) = m3
            const lineTotal = quantity_primary * (Number(item.unit_price) || 0);

            itemsToInsert.push({
                purchase_receipt_id: receipt.id,
                material_id: item.material_id,
                quantity_primary,
                quantity_secondary,
                unit_price: Number(item.unit_price) || 0,
                total_amount: lineTotal
            });

            totalAmount += lineTotal;
            totalQuantityPrimary += quantity_primary;
            totalQuantitySecondary += quantity_secondary;
        }

        const { error: itemsError } = await supabase
            .from('purchase_receipt_items')
            .insert(itemsToInsert);

        if (itemsError) {
            await supabase.from('purchase_receipts').delete().eq('id', receipt.id);
            throw new AppError('Lỗi khi lưu chi tiết hàng hóa: ' + itemsError.message, 500);
        }

        // 4. Update totals back to receipt
        await supabase
            .from('purchase_receipts')
            .update({
                total_amount: totalAmount,
                total_quantity_primary: totalQuantityPrimary,
                total_quantity_secondary: totalQuantitySecondary
            })
            .eq('id', receipt.id);

        res.status(201).json({
            success: true,
            data: {
                ...receipt,
                total_amount: totalAmount,
                total_quantity_primary: totalQuantityPrimary,
                total_quantity_secondary: totalQuantitySecondary
            },
            message: `Tạo phiếu nhập ${receiptNumber} thành công`
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/purchases/:id
 */
router.get('/:id', authorize('purchases:read'), async (req: Request, res: Response, next) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('purchase_receipts')
            .select(`
                *,
                warehouse:warehouses(name, address),
                project:projects(name, code),
                creator:users!purchase_receipts_created_by_fkey(full_name),
                items:purchase_receipt_items(
                    id,
                    material_id,
                    quantity_primary,
                    quantity_secondary,
                    unit_price,
                    total_amount,
                    material:materials(id, name, code, primary_unit, secondary_unit, current_density)
                )
            `)
            .eq('id', id)
            .is('deleted_at', null)
            .single();

        if (error) throw new AppError(error.message, 500);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
});

export default router;
