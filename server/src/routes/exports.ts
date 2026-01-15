import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../database/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

/**
 * GET /api/exports
 * Lấy danh sách phiếu xuất
 */
router.get('/', authorize('exports:read'), async (req: Request, res: Response, next) => {
    try {
        const {
            search = '',
            warehouse_id,
            project_id,
            vehicle_id,
            date_from,
            date_to,
            page = 1,
            limit = 10
        } = req.query;

        const supabase = getSupabaseClient();
        let query = supabase
            .from('export_receipts')
            .select(`
                *,
                warehouse:warehouses(name),
                project:projects(name),
                vehicle:vehicles(plate_number, driver_name),
                creator:users!export_receipts_created_by_fkey(full_name),
                items:export_receipt_items(
                    material:materials(name, code, primary_unit, secondary_unit),
                    quantity_secondary,
                    quantity_primary,
                    unit_price,
                    total_amount,
                    density_used
                )
            `, { count: 'exact' })
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        // Lọc theo tìm kiếm (Số phiếu, Khách hàng)
        if (search) {
            query = query.or(`receipt_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
        }
        if (warehouse_id) query = query.eq('warehouse_id', warehouse_id);
        if (project_id) query = query.eq('project_id', project_id);
        if (vehicle_id) query = query.eq('vehicle_id', vehicle_id);
        if (date_from) query = query.gte('receipt_date', date_from);
        if (date_to) query = query.lte('receipt_date', date_to);

        // Phân trang
        const from = (Number(page) - 1) * Number(limit);
        const to = from + Number(limit) - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;
        if (error) throw new AppError(error.message, 500);

        // Transform data để hiển thị ngắn gọn vật tư
        const items = data?.map(item => ({
            ...item,
            material_summary: item.items?.map((i: any) => i.material?.name).join(', ') || '',
            total_quantity: item.items?.reduce((acc: number, curr: any) => acc + (curr.quantity_secondary || 0), 0)
        }));

        res.json({
            success: true,
            data: {
                items: items,
                total: count || 0,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil((count || 0) / Number(limit))
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/exports/:id
 * Lấy chi tiết phiếu xuất
 */
router.get('/:id', authorize('exports:read'), async (req: Request, res: Response, next) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('export_receipts')
            .select(`
                *,
                warehouse:warehouses(name, address),
                project:projects(name, code),
                vehicle:vehicles(plate_number, driver_name, driver_phone, vehicle_type),
                creator:users!export_receipts_created_by_fkey(full_name),
                items:export_receipt_items(
                    id,
                    material_id,
                    quantity_secondary,
                    quantity_primary,
                    density_used,
                    unit_price,
                    total_amount,
                    material:materials(id, name, code, primary_unit, secondary_unit)
                )
            `)
            .eq('id', id)
            .is('deleted_at', null)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                throw new AppError('Không tìm thấy phiếu xuất', 404);
            }
            throw new AppError(error.message, 500);
        }

        res.json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/exports
 * Tạo phiếu xuất mới (hỗ trợ nhiều items)
 */
router.post('/', authorize('exports:write'), async (req: Request, res: Response, next) => {
    try {
        const {
            warehouse_id,
            project_id,
            vehicle_id,
            customer_name,
            customer_phone,
            destination,
            receipt_date,
            notes,
            items // Array of { material_id, quantity_secondary, unit_price }
        } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new AppError('Vui lòng chọn ít nhất một vật tư', 400);
        }

        const user = (req as any).user;
        const supabase = getSupabaseClient();

        // 1. Tạo số phiếu tự động (VD: PX240114001)
        const { data: receiptNumber, error: seqError } = await supabase
            .rpc('generate_receipt_number', { prefix: 'PX', tbl_name: 'export_receipts' });

        if (seqError) throw new AppError(seqError.message, 500);

        // 2. Tính tổng tiền receipt
        // Chúng ta sẽ tính chính xác hơn sau khi xử lý từng item, nhưng cần insert receipt trước để có ID.
        // Tạm thời để total_amount = 0, sẽ update sau.

        const { data: receipt, error: receiptError } = await supabase
            .from('export_receipts')
            .insert({
                receipt_number: receiptNumber,
                warehouse_id,
                project_id,
                vehicle_id,
                customer_name,
                customer_phone,
                destination,
                receipt_date: receipt_date || new Date().toISOString().split('T')[0],
                notes,
                created_by: user.userId,
                // Các trường legacy này có thể để null hoặc tổng hợp tạm
                quantity_secondary: 0,
                quantity_primary: 0,
                total_amount: 0
            })
            .select()
            .single();

        if (receiptError) throw new AppError(receiptError.message, 500);

        // 3. Xử lý Items
        let receiptTotalAmount = 0;
        let receiptTotalQuantitySecondary = 0;
        let receiptTotalQuantityPrimary = 0;

        const itemsToInsert = [];

        for (const item of items) {
            // Lấy tỷ trọng hiện tại của vật tư
            const { data: material, error: matError } = await supabase
                .from('materials')
                .select('current_density')
                .eq('id', item.material_id)
                .single();

            if (matError) continue; // Skip invalid materials

            const density = material.current_density || 1.5;
            const quantityStruct = {
                quantity_secondary: Number(item.quantity_secondary), // m3
                quantity_primary: Number(item.quantity_secondary) * density, // Tan
            };

            const lineTotal = item.unit_price ? quantityStruct.quantity_secondary * Number(item.unit_price) : 0;

            itemsToInsert.push({
                export_receipt_id: receipt.id,
                material_id: item.material_id,
                quantity_secondary: quantityStruct.quantity_secondary,
                quantity_primary: quantityStruct.quantity_primary,
                density_used: density,
                unit_price: item.unit_price || null,
                total_amount: lineTotal || null
            });

            receiptTotalAmount += lineTotal;
            receiptTotalQuantitySecondary += quantityStruct.quantity_secondary;
            receiptTotalQuantityPrimary += quantityStruct.quantity_primary;
        }

        if (itemsToInsert.length > 0) {
            const { error: itemsError } = await supabase
                .from('export_receipt_items')
                .insert(itemsToInsert);

            if (itemsError) {
                // Nếu lỗi insert items, nên rollback (xóa receipt). 
                // Ở đây làm đơn giản là throw error, DB rác sẽ phải xử lý thủ công hoặc dùng transaction nếu Supabase hỗ trợ qua RPC phức tạp.
                // Supabase JS client không hỗ trợ transaction trực tiếp ngoài RPC.
                // Tốt nhất là xóa receipt vừa tạo.
                await supabase.from('export_receipts').delete().eq('id', receipt.id);
                throw new AppError('Lỗi khi lưu chi tiết vật tư: ' + itemsError.message, 500);
            }

            // 4. Update lại tổng tiền và tổng số lượng cho Receipt
            await supabase
                .from('export_receipts')
                .update({
                    total_amount: receiptTotalAmount,
                    quantity_secondary: receiptTotalQuantitySecondary, // Tổng m3 của cả phiếu
                    quantity_primary: receiptTotalQuantityPrimary // Tổng tấn của cả phiếu
                })
                .eq('id', receipt.id);
        }

        // 5. Fetch full data to return
        const { data: fullReceipt, error: fetchError } = await supabase
            .from('export_receipts')
            .select(`
                    *,
                    warehouse:warehouses(name, address),
                    project:projects(name, code),
                    vehicle:vehicles(plate_number, driver_name, driver_phone, vehicle_type),
                    creator:users!export_receipts_created_by_fkey(full_name),
                    items:export_receipt_items(
                        id,
                        material_id,
                        quantity_secondary,
                        quantity_primary,
                        density_used,
                        unit_price,
                        total_amount,
                        material:materials(id, name, code, primary_unit, secondary_unit)
                    )
                `)
            .eq('id', receipt.id)
            .single();

        if (fetchError) throw new AppError(fetchError.message, 500);

        res.status(201).json({
            success: true,
            data: fullReceipt,
            message: `Tạo phiếu xuất ${receiptNumber} thành công`
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/exports/:id
 * Cập nhật phiếu xuất
 */
router.put('/:id', authorize('exports:write'), async (req: Request, res: Response, next) => {
    try {
        const { id } = req.params;
        const { notes, customer_name, customer_phone, destination } = req.body;

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('export_receipts')
            .update({ notes, customer_name, customer_phone, destination, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new AppError(error.message, 500);

        res.json({
            success: true,
            data,
            message: 'Cập nhật phiếu xuất thành công'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/exports/:id
 * Xóa phiếu xuất (soft delete)
 */
router.delete('/:id', authorize('exports:write'), async (req: Request, res: Response, next) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('export_receipts')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw new AppError(error.message, 500);

        res.json({
            success: true,
            message: 'Đã xóa phiếu xuất'
        });
    } catch (error) {
        next(error);
    }
});

export default router;
