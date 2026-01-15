import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../database/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/materials
 * Get all materials with pagination and filters
 */
router.get('/', authorize('materials:read'), async (req: Request, res: Response, next) => {
    try {
        const {
            page = '1',
            limit = '10',
            search = '',
            category = '',
            is_active = '',
        } = req.query;

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const offset = (pageNum - 1) * limitNum;

        const supabase = getSupabaseClient();

        let query = supabase
            .from('materials')
            .select('*', { count: 'exact' })
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        // Apply filters
        if (search) {
            query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
        }
        if (category) {
            query = query.eq('category', category);
        }
        if (is_active === 'true' || is_active === 'false') {
            query = query.eq('is_active', is_active === 'true');
        }

        // Pagination
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
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/materials/:id
 * Get a single material by ID
 */
router.get('/:id', authorize('materials:read'), async (req: Request, res: Response, next) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('materials')
            .select('*')
            .eq('id', id)
            .is('deleted_at', null)
            .single();

        if (error || !data) {
            throw new AppError('Không tìm thấy hàng hóa', 404);
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
 * POST /api/materials
 * Create a new material
 */
router.post('/', authorize('materials:write'), async (req: Request, res: Response, next) => {
    try {
        const {
            code, name, description, category, material_type,
            primary_unit, secondary_unit, current_density,
            purchase_price, sale_price, wholesale_price, vat_percentage,
            min_stock, initial_stocks
        } = req.body;

        if (!code || !name) {
            throw new AppError('Mã và tên hàng hóa là bắt buộc', 400);
        }

        const supabase = getSupabaseClient();

        // Check if code exists
        const { data: existing } = await supabase
            .from('materials')
            .select('id')
            .eq('code', code.toUpperCase())
            .is('deleted_at', null)
            .single();

        if (existing) {
            throw new AppError('Mã hàng hóa đã tồn tại', 400);
        }

        const { data, error } = await supabase
            .from('materials')
            .insert({
                code: code.toUpperCase(),
                name,
                description,
                category,
                primary_unit: primary_unit || 'Tấn',
                secondary_unit: secondary_unit || 'm³',
                current_density: current_density || 1.5,
                min_stock,
                material_type: material_type || 'Sản phẩm vật lý',
                purchase_price,
                sale_price,
                wholesale_price,
                vat_percentage: vat_percentage || 0,
            })
            .select()
            .single();

        if (error) throw new AppError(error.message, 500);

        // If initial_stocks is provided, create purchase records
        if (initial_stocks && Array.isArray(initial_stocks)) {
            const validStocks = initial_stocks.filter(s => s.warehouse_id && s.quantity > 0);

            for (const stock of validStocks) {
                // Generate a receipt number
                const { data: receiptNo } = await supabase.rpc('generate_receipt_number', {
                    prefix: 'PN',
                    tbl_name: 'purchase_receipts'
                });

                await supabase.from('purchase_receipts').insert({
                    receipt_number: receiptNo,
                    warehouse_id: stock.warehouse_id,
                    material_id: data.id,
                    quantity_primary: stock.quantity,
                    unit_price: purchase_price || 0,
                    receipt_date: new Date().toISOString(),
                    supplier_name: 'Tồn đầu kỳ',
                    notes: 'Số dư đầu kỳ khi khởi tạo hệ thống',
                    created_by: req.user?.userId,
                    status: 'completed'
                });
            }
        }

        // Log density history
        await supabase.from('material_density_history').insert({
            material_id: data.id,
            density: data.current_density,
            reason: 'Khởi tạo mới',
            created_by: req.user?.userId,
        });

        res.status(201).json({
            success: true,
            data,
            message: 'Tạo hàng hóa thành công',
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/materials/:id
 * Update a material
 */
router.put('/:id', authorize('materials:write'), async (req: Request, res: Response, next) => {
    try {
        const { id } = req.params;
        const {
            name, description, category, material_type,
            current_density, min_stock, is_active,
            purchase_price, sale_price, wholesale_price, vat_percentage
        } = req.body;

        const supabase = getSupabaseClient();

        // Get current material
        const { data: current, error: fetchError } = await supabase
            .from('materials')
            .select('*')
            .eq('id', id)
            .is('deleted_at', null)
            .single();

        if (fetchError || !current) {
            throw new AppError('Không tìm thấy hàng hóa', 404);
        }

        // Prepare update data
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (category !== undefined) updateData.category = category;
        if (min_stock !== undefined) updateData.min_stock = min_stock;
        if (material_type !== undefined) updateData.material_type = material_type;
        if (purchase_price !== undefined) updateData.purchase_price = purchase_price;
        if (sale_price !== undefined) updateData.sale_price = sale_price;
        if (wholesale_price !== undefined) updateData.wholesale_price = wholesale_price;
        if (vat_percentage !== undefined) updateData.vat_percentage = vat_percentage;
        if (is_active !== undefined) updateData.is_active = is_active;

        // If density changed, log it
        if (current_density !== undefined && current_density !== current.current_density) {
            updateData.current_density = current_density;

            // Close previous density period
            await supabase
                .from('material_density_history')
                .update({ effective_to: new Date().toISOString() })
                .eq('material_id', id)
                .is('effective_to', null);

            // Create new density record
            await supabase.from('material_density_history').insert({
                material_id: id,
                density: current_density,
                reason: req.body.density_reason || 'Cập nhật tỷ trọng',
                created_by: req.user?.userId,
            });
        }

        const { data, error } = await supabase
            .from('materials')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new AppError(error.message, 500);

        res.json({
            success: true,
            data,
            message: 'Cập nhật hàng hóa thành công',
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/materials/:id
 * Soft delete a material
 */
router.delete('/:id', authorize('materials:delete'), async (req: Request, res: Response, next) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('materials')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw new AppError(error.message, 500);

        res.json({
            success: true,
            message: 'Xóa hàng hóa thành công',
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/materials/:id/density-history
 * Get density change history for a material
 */
router.get('/:id/density-history', authorize('materials:read'), async (req: Request, res: Response, next) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('material_density_history')
            .select(`
        *,
        creator:created_by (
          id,
          full_name
        )
      `)
            .eq('material_id', id)
            .order('effective_from', { ascending: false });

        if (error) throw new AppError(error.message, 500);

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
