import { Router, Request, Response, NextFunction } from 'express';
import { getSupabaseClient } from '../database/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

/**
 * GET /api/transport-units
 * Lấy danh sách đơn vị vận chuyển
 */
router.get('/', authorize('vehicles:read'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            page = '1',
            limit = '1000',
            search = '',
            is_active = '',
        } = req.query;

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const offset = (pageNum - 1) * limitNum;

        const supabase = getSupabaseClient();

        let query = supabase
            .from('transport_units')
            .select(`
                *,
                vehicles (*)
            `, { count: 'exact' })
            .is('deleted_at', null)
            .order('name', { ascending: true });

        if (search) {
            query = query.ilike('name', `%${search}%`);
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
 * POST /api/transport-units
 */
router.post('/', authorize('vehicles:write'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, contact_name, phone, email, address, notes } = req.body;

        if (!name) {
            throw new AppError('Tên đơn vị vận chuyển là bắt buộc', 400);
        }

        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('transport_units')
            .insert({
                name,
                contact_name,
                phone,
                email,
                address,
                notes,
                is_active: true
            })
            .select()
            .single();

        if (error) throw new AppError(error.message, 500);

        res.status(201).json({
            success: true,
            data,
            message: 'Thêm đơn vị vận chuyển thành công',
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/transport-units/:id
 */
router.put('/:id', authorize('vehicles:write'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('transport_units')
            .update(updateData)
            .eq('id', id)
            .is('deleted_at', null)
            .select()
            .single();

        if (error) throw new AppError(error.message, 500);
        if (!data) throw new AppError('Không tìm thấy thông tin đơn vị', 404);

        res.json({
            success: true,
            data,
            message: 'Cập nhật thành công',
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/transport-units/:id
 */
router.delete('/:id', authorize('vehicles:write'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('transport_units')
            .update({ deleted_at: new Date().toISOString(), is_active: false })
            .eq('id', id);

        if (error) throw new AppError(error.message, 500);

        res.json({
            success: true,
            message: 'Xóa đơn vị vận chuyển thành công',
        });
    } catch (error) {
        next(error);
    }
});

export default router;
