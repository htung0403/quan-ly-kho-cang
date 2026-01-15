import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../database/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

/**
 * GET /api/vehicles
 * Lấy danh sách xe với phân trang và lọc
 */
router.get('/', authorize('vehicles:read'), async (req: Request, res: Response, next) => {
    try {
        const {
            page = '1',
            limit = '10',
            search = '',
            status = '',
            is_active = '',
        } = req.query;

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const offset = (pageNum - 1) * limitNum;

        const supabase = getSupabaseClient();

        let query = supabase
            .from('vehicles')
            .select('*', { count: 'exact' })
            .is('deleted_at', null)
            .order('plate_number', { ascending: true });

        if (search) {
            query = query.or(`plate_number.ilike.%${search}%,driver_name.ilike.%${search}%`);
        }
        if (status) {
            query = query.eq('status', status);
        }
        if (is_active !== '') {
            query = query.eq('is_active', is_active === 'true');
        }

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
 * POST /api/vehicles
 * Thêm xe mới
 */
router.post('/', authorize('vehicles:write'), async (req: Request, res: Response, next) => {
    try {
        const { plate_number, driver_name, driver_phone, vehicle_type, capacity_tons, notes } = req.body;

        if (!plate_number) {
            throw new AppError('Biển số xe là bắt buộc', 400);
        }

        const supabase = getSupabaseClient();

        // Kiểm tra biển số đã tồn tại chưa
        const { data: existing } = await supabase
            .from('vehicles')
            .select('id')
            .eq('plate_number', plate_number.toUpperCase())
            .is('deleted_at', null)
            .single();

        if (existing) {
            throw new AppError('Biển số xe này đã được khai báo trên hệ thống', 400);
        }

        const { data, error } = await supabase
            .from('vehicles')
            .insert({
                plate_number: plate_number.toUpperCase(),
                driver_name,
                driver_phone,
                vehicle_type,
                capacity_tons,
                notes,
                status: 'available',
                is_active: true
            })
            .select()
            .single();

        if (error) throw new AppError(error.message, 500);

        res.status(201).json({
            success: true,
            data,
            message: 'Thêm xe thành công',
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/vehicles/:id
 * Cập nhật thông tin xe
 */
router.put('/:id', authorize('vehicles:write'), async (req: Request, res: Response, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('vehicles')
            .update(updateData)
            .eq('id', id)
            .is('deleted_at', null)
            .select()
            .single();

        if (error) throw new AppError(error.message, 500);
        if (!data) throw new AppError('Không tìm thấy thông tin xe', 404);

        res.json({
            success: true,
            data,
            message: 'Cập nhật thông tin xe thành công',
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/vehicles/:id
 * Xóa xe (soft delete)
 */
router.delete('/:id', authorize('vehicles:delete'), async (req: Request, res: Response, next) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('vehicles')
            .update({ deleted_at: new Date().toISOString(), is_active: false })
            .eq('id', id);

        if (error) throw new AppError(error.message, 500);

        res.json({
            success: true,
            message: 'Xóa xe thành công',
        });
    } catch (error) {
        next(error);
    }
});

export default router;
