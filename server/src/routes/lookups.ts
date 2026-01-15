import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../database/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// All lookup routes require authentication
router.use(authenticate);

// --- Material Categories ---

router.get('/categories', async (req: Request, res: Response, next) => {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('material_categories')
            .select('*')
            .order('name');

        if (error) throw new AppError(error.message, 500);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/categories', async (req: Request, res: Response, next) => {
    try {
        const { name } = req.body;
        if (!name) throw new AppError('Tên nhóm hàng là bắt buộc', 400);

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('material_categories')
            .insert({ name })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') throw new AppError('Tên nhóm hàng đã tồn tại', 400);
            throw new AppError(error.message, 500);
        }

        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

// --- Material Units ---

router.get('/units', async (req: Request, res: Response, next) => {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('material_units')
            .select('*')
            .order('name');

        if (error) throw new AppError(error.message, 500);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

router.post('/units', async (req: Request, res: Response, next) => {
    try {
        const { name } = req.body;
        if (!name) throw new AppError('Tên đơn vị tính là bắt buộc', 400);

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('material_units')
            .insert({ name })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') throw new AppError('Tên đơn vị đã tồn tại', 400);
            throw new AppError(error.message, 500);
        }

        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

export default router;
