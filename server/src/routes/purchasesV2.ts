import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../database/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

// ... (Các routes GET / và POST / giữ nguyên logic cơ bản, chỉ cập nhật phần transport)

/**
 * GET /api/purchases/v2
 */
router.get('/', authorize('purchases:read'), async (req: Request, res: Response, next) => {
    try {
        const { search = '', receipt_type, date_from, date_to, page = 1, limit = 50 } = req.query;
        const supabase = getSupabaseClient();

        // Chỉ select các fields cần thiết thay vì select * để tăng tốc
        const selectFields = `
            item_id,
            receipt_id,
            receipt_date,
            material_code,
            material_name,
            supplier_name,
            pickup_location,
            delivery_location,
            customer_name,
            receipt_number,
            vehicle_plate,
            transport_unit,
            quantity_tons,
            density,
            quantity_m3,
            purchase_unit_price,
            transport_unit_price,
            sale_unit_price,
            receipt_type,
            total_amount,
            created_at
        `.replace(/\s+/g, '');

        let query = supabase.from('v_purchase_items_detailed').select(selectFields, { count: 'exact' });

        // Search với index-friendly patterns
        if (search) {
            const searchTerm = `%${search}%`;
            query = query.or(`receipt_number.ilike.${searchTerm},material_name.ilike.${searchTerm},material_code.ilike.${searchTerm},vehicle_plate.ilike.${searchTerm}`);
        }
        if (receipt_type) query = query.eq('receipt_type', receipt_type);
        if (date_from) query = query.gte('receipt_date', date_from);
        if (date_to) query = query.lte('receipt_date', date_to);

        const from = (Number(page) - 1) * Number(limit);
        const to = from + Number(limit) - 1;
        query = query.range(from, to).order('created_at', { ascending: false });

        const { data, error, count } = await query;
        if (error) throw new AppError(error.message, 500);

        res.json({ success: true, data: { items: data, total: count || 0, page: Number(page), limit: Number(limit) } });
    } catch (error) { next(error); }
});

/**
 * POST /api/purchases/v2
 */
router.post('/', authorize('purchases:write'), async (req: Request, res: Response, next) => {
    try {
        const {
            receipt_type,
            receipt_date,
            notes,
            items,
            direct_to_site_details,
            warehouse_import_details,
            transport_records // Added for direct creation
        } = req.body;

        if (!receipt_type || !['direct_to_site', 'warehouse_import'].includes(receipt_type)) throw new AppError('receipt_type không hợp lệ', 400);
        if (!items || !Array.isArray(items) || items.length === 0) throw new AppError('Vui lòng thêm ít nhất một vật tư', 400);

        const user = (req as any).user;
        const supabase = getSupabaseClient();
        const prefix = receipt_type === 'direct_to_site' ? 'DS' : 'WI';
        const { data: receiptNumber, error: seqError } = await supabase.rpc('generate_receipt_number_v2', { prefix });
        if (seqError) throw new AppError(seqError.message, 500);

        const { data: header, error: headerError } = await supabase.from('purchase_receipt_headers')
            .insert({
                receipt_number: receiptNumber,
                receipt_type,
                receipt_date: receipt_date || new Date().toISOString().split('T')[0],
                notes,
                created_by: user.userId,
                status: 'completed'
            }).select().single();
        if (headerError) throw new AppError(headerError.message, 500);

        if (receipt_type === 'direct_to_site') {
            await supabase.from('direct_to_site_details').insert({ receipt_id: header.id, ...direct_to_site_details });
        } else {
            await supabase.from('warehouse_import_details').insert({ receipt_id: header.id, ...warehouse_import_details });
        }

        // Save Transport Record if provided (Now limited to one)
        const trData = Array.isArray(transport_records) ? transport_records[0] : transport_records;

        if (trData) {
            const { error: trError } = await supabase.from('transport_records').insert({
                receipt_id: header.id,
                transport_date: trData.transport_date || receipt_date || new Date().toISOString().split('T')[0],
                transport_company: trData.transport_company,
                vehicle_plate: trData.vehicle_plate,
                ticket_number: trData.ticket_number,
                material_id: trData.material_id,
                quantity_primary: Number(trData.quantity_primary) || 0,
                density: Number(trData.density) || 1,
                unit_price: Number(trData.unit_price) || 0,
                transport_fee: Number(trData.transport_fee) || 0,
                vehicle_id: trData.vehicle_id || null,
                driver_name: trData.driver_name,
                origin: trData.origin,
                destination: trData.destination,
                notes: trData.notes,
                created_by: user.userId
            });
            if (trError) throw new AppError(trError.message, 500);
        }

        let totalAmount = 0, totalQtyP = 0, totalQtyS = 0;
        const itemsToInsert = [];

        for (const item of items) {
            // Fetch material to get density
            const { data: mat, error: matError } = await supabase
                .from('materials')
                .select('current_density')
                .eq('id', item.material_id)
                .single();

            if (matError) {
                console.error('Error fetching material density:', matError);
            }

            const density = parseFloat(mat?.current_density as any) || 1;

            // Ensure numeric values
            const qp = parseFloat(item.quantity_primary?.toString() || '0');
            const unitPrice = parseFloat(item.unit_price?.toString() || '0');

            if (isNaN(qp) || isNaN(unitPrice)) {
                throw new AppError(`Giá trị không hợp lệ cho vật tư ${item.material_id}`, 400);
            }

            const qs = qp / density;
            const subtotal = qp * unitPrice;

            itemsToInsert.push({
                receipt_id: header.id,
                material_id: item.material_id,
                quantity_primary: qp,
                quantity_secondary: qs,
                density_used: density,
                unit_price: unitPrice,
                total_amount: subtotal,
                notes: item.notes || ''
            });

            totalAmount += subtotal;
            totalQtyP += qp;
            totalQtyS += qs;
        }

        const { error: itemsError } = await supabase.from('purchase_receipt_items_v2').insert(itemsToInsert);
        if (itemsError) throw new AppError(itemsError.message, 500);

        // Update header with finally calculated totals
        await supabase.from('purchase_receipt_headers').update({
            total_amount: totalAmount,
            total_quantity_primary: totalQtyP,
            total_quantity_secondary: totalQtyS
        }).eq('id', header.id);

        res.status(201).json({ success: true, data: header, message: `Tạo phiếu ${receiptNumber} thành công` });
    } catch (error) { next(error); }
});

// --- TRANSPORT RECORDS ROUTES ---

/**
 * POST /api/purchases/v2/:receiptId/transport
 * Thêm thông tin vận chuyển (Cập nhật theo bản vẽ Excel)
 */
router.post('/:receiptId/transport', authorize('purchases:write'), async (req: Request, res: Response, next) => {
    try {
        const { receiptId } = req.params;
        const {
            transport_date,
            transport_company,
            vehicle_plate,
            ticket_number,
            material_id,
            quantity_primary,
            density,
            unit_price,
            transport_fee,
            vehicle_id,
            driver_name,
            origin,
            destination,
            notes
        } = req.body;

        const user = (req as any).user;
        const supabase = getSupabaseClient();

        // Validate receipt
        const { data: receipt } = await supabase.from('purchase_receipt_headers').select('id').eq('id', receiptId).single();
        if (!receipt) throw new AppError('Không tìm thấy phiếu nhập', 404);

        const { data, error } = await supabase
            .from('transport_records')
            .insert({
                receipt_id: receiptId,
                transport_date: transport_date || new Date().toISOString().split('T')[0],
                transport_company,
                vehicle_plate,
                ticket_number,
                material_id,
                quantity_primary: Number(quantity_primary) || 0,
                density: Number(density) || 1,
                unit_price: Number(unit_price) || 0,
                transport_fee: Number(transport_fee) || 0,
                vehicle_id: vehicle_id || null,
                driver_name,
                origin,
                destination,
                notes,
                created_by: user.userId
            })
            .select()
            .single();

        if (error) throw new AppError(error.message, 500);

        res.status(201).json({ success: true, data, message: 'Thêm thông tin vận chuyển thành công' });
    } catch (error) { next(error); }
});

/**
 * GET /api/purchases/v2/:receiptId/transport
 */
router.get('/:receiptId/transport', authorize('purchases:read'), async (req: Request, res: Response, next) => {
    try {
        const { receiptId } = req.params;
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('transport_records')
            .select(`*, vehicle:vehicles(plate_number, driver_name), material:materials(name, code)`)
            .eq('receipt_id', receiptId)
            .order('transport_date', { ascending: false });

        if (error) throw new AppError(error.message, 500);
        res.json({ success: true, data });
    } catch (error) { next(error); }
});

// ... (Các routes DELETE, v.v. giữ nguyên)

/**
 * DELETE /api/purchases/v2/:id
 * Xóa phiếu nhập (soft delete)
 */
router.delete('/:id', authorize('purchases:delete'), async (req: Request, res: Response, next) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();

        // Kiểm tra phiếu tồn tại
        const { data: receipt, error: checkError } = await supabase
            .from('purchase_receipt_headers')
            .select('id, receipt_number')
            .eq('id', id)
            .is('deleted_at', null)
            .single();

        if (checkError || !receipt) {
            throw new AppError('Không tìm thấy phiếu nhập', 404);
        }

        // Soft delete - chỉ đánh dấu deleted_at
        const { error } = await supabase
            .from('purchase_receipt_headers')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw new AppError(error.message, 500);

        res.json({ success: true, message: `Đã xóa phiếu ${receipt.receipt_number}` });
    } catch (error) { next(error); }
});

/**
 * PUT /api/purchases/v2/:id
 * Cập nhật phiếu nhập
 */
router.put('/:id', authorize('purchases:write'), async (req: Request, res: Response, next) => {
    try {
        const { id } = req.params;
        const {
            receipt_date,
            notes,
            items,
            direct_to_site_details,
            warehouse_import_details
        } = req.body;

        const supabase = getSupabaseClient();

        // Kiểm tra phiếu tồn tại
        const { data: receipt, error: checkError } = await supabase
            .from('purchase_receipt_headers')
            .select('id, receipt_type, receipt_number')
            .eq('id', id)
            .is('deleted_at', null)
            .single();

        if (checkError || !receipt) {
            throw new AppError('Không tìm thấy phiếu nhập', 404);
        }

        // Cập nhật header
        const { error: headerError } = await supabase
            .from('purchase_receipt_headers')
            .update({
                receipt_date: receipt_date || undefined,
                notes: notes || undefined,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (headerError) throw new AppError(headerError.message, 500);

        // Cập nhật details theo loại phiếu
        if (receipt.receipt_type === 'direct_to_site' && direct_to_site_details) {
            await supabase
                .from('direct_to_site_details')
                .update({
                    quarry_name: direct_to_site_details.quarry_name,
                    supplier_name: direct_to_site_details.supplier_name,
                    supplier_phone: direct_to_site_details.supplier_phone,
                    destination_site: direct_to_site_details.destination_site,
                    updated_at: new Date().toISOString()
                })
                .eq('receipt_id', id);
        } else if (receipt.receipt_type === 'warehouse_import' && warehouse_import_details) {
            await supabase
                .from('warehouse_import_details')
                .update({
                    warehouse_id: warehouse_import_details.warehouse_id,
                    project_id: warehouse_import_details.project_id,
                    supplier_name: warehouse_import_details.supplier_name,
                    updated_at: new Date().toISOString()
                })
                .eq('receipt_id', id);
        }

        // Cập nhật items nếu có
        if (items && Array.isArray(items) && items.length > 0) {
            // Xóa items cũ
            await supabase.from('purchase_receipt_items_v2').delete().eq('receipt_id', id);

            // Thêm items mới
            let totalAmount = 0, totalQtyP = 0, totalQtyS = 0;
            const itemsToInsert = [];

            for (const item of items) {
                const { data: mat } = await supabase
                    .from('materials')
                    .select('current_density')
                    .eq('id', item.material_id)
                    .single();

                const density = parseFloat(mat?.current_density as any) || 1;
                const qp = parseFloat(item.quantity_primary?.toString() || '0');
                const unitPrice = parseFloat(item.unit_price?.toString() || '0');
                const qs = qp / density;
                const subtotal = qp * unitPrice;

                itemsToInsert.push({
                    receipt_id: id,
                    material_id: item.material_id,
                    quantity_primary: qp,
                    quantity_secondary: qs,
                    density_used: density,
                    unit_price: unitPrice,
                    total_amount: subtotal,
                    notes: item.notes || ''
                });

                totalAmount += subtotal;
                totalQtyP += qp;
                totalQtyS += qs;
            }

            await supabase.from('purchase_receipt_items_v2').insert(itemsToInsert);

            // Cập nhật totals
            await supabase.from('purchase_receipt_headers').update({
                total_amount: totalAmount,
                total_quantity_primary: totalQtyP,
                total_quantity_secondary: totalQtyS
            }).eq('id', id);
        }

        res.json({ success: true, message: `Cập nhật phiếu ${receipt.receipt_number} thành công` });
    } catch (error) { next(error); }
});

/**
 * DELETE /api/purchases/v2/:receiptId/transport/:transportId
 * Xóa thông tin vận chuyển
 */
router.delete('/:receiptId/transport/:transportId', authorize('purchases:delete'), async (req: Request, res: Response, next) => {
    try {
        const { receiptId, transportId } = req.params;
        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('transport_records')
            .delete()
            .eq('id', transportId)
            .eq('receipt_id', receiptId);

        if (error) throw new AppError(error.message, 500);

        res.json({ success: true, message: 'Đã xóa thông tin vận chuyển' });
    } catch (error) { next(error); }
});

/**
 * GET /api/purchases/v2/:id (Chi tiết phiếu)
 */
router.get('/:id', authorize('purchases:read'), async (req: Request, res: Response, next) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('purchase_receipt_headers')
            .select(`
                *,
                direct_to_site_details (*),
                warehouse_import_details (
                    *,
                    warehouse:warehouses(name, code, address),
                    project:projects(name, code)
                ),
                transport_records (
                    *,
                    vehicle:vehicles(plate_number, driver_name),
                    material:materials(name, code)
                ),
                items:purchase_receipt_items_v2(
                    *,
                    material:materials(*)
                ),
                creator:users!purchase_receipt_headers_created_by_fkey(full_name, email)
            `)
            .eq('id', id)
            .single();

        if (error) throw new AppError(error.message, 500);
        res.json({ success: true, data });
    } catch (error) { next(error); }
});

export default router;
