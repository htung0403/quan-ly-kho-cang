import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getSupabaseClient } from '../database/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

import multer from 'multer';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});


router.use(authenticate);

/**
 * GET /api/users/roles
 * Get all available roles
 */
router.get('/roles', authorize('admin'), async (req: Request, res: Response, next) => {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('roles')
            .select('*')
            .order('name');

        if (error) throw new AppError(error.message, 500);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/users/upload-avatar
 * Upload user avatar to Supabase Storage
 */
router.post('/upload-avatar', authenticate, upload.single('avatar'), async (req: Request, res: Response, next) => {
    try {
        if (!req.file) {
            throw new AppError('Không có file nào được tải lên', 400);
        }

        const supabase = getSupabaseClient();
        const fileExt = req.file.originalname.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (uploadError) throw new AppError(uploadError.message, 500);

        const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        res.json({
            success: true,
            data: {
                publicUrl: data.publicUrl
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/users
 */
router.get('/', authorize('users:read', 'projects:write', 'projects:read'), async (req: Request, res: Response, next) => {
    try {
        const { search = '', page = 1, limit = 10 } = req.query;
        const supabase = getSupabaseClient();

        let query = supabase
            .from('users')
            .select(`
                *,
                role:roles(*)
            `, { count: 'exact' })
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const from = (Number(page) - 1) * Number(limit);
        const to = from + Number(limit) - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;
        if (error) throw new AppError(error.message, 500);

        res.json({
            success: true,
            data: {
                items: data,
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
 * POST /api/users
 */
router.post('/', authorize('admin'), async (req: Request, res: Response, next) => {
    try {
        const { email, password, full_name, phone, role_id, img_url } = req.body;

        if (!email || !password || !full_name || !role_id) {
            throw new AppError('Email, mật khẩu, họ tên và vai trò là bắt buộc', 400);
        }

        const supabase = getSupabaseClient();

        // Check if user exists
        const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).single();
        if (existing) throw new AppError('Email đã tồn tại', 400);

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const { data, error } = await supabase
            .from('users')
            .insert({
                email: email.toLowerCase(),
                password_hash,
                full_name,
                phone,
                role_id,
                img_url
            })
            .select('*, role:roles(*)')
            .single();

        if (error) throw new AppError(error.message, 500);

        res.status(201).json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/users/:id
 */
router.put('/:id', authorize('admin'), async (req: Request, res: Response, next) => {
    try {
        const { id } = req.params;
        const { full_name, phone, role_id, is_active, password, img_url } = req.body;
        const supabase = getSupabaseClient();

        const updateData: any = {
            full_name,
            phone,
            role_id,
            is_active,
            img_url,
            updated_at: new Date().toISOString()
        };

        if (password && password.trim().length >= 6) {
            const salt = await bcrypt.genSalt(10);
            updateData.password_hash = await bcrypt.hash(password, salt);
        }

        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select('*, role:roles(*)')
            .single();

        if (error) throw new AppError(error.message, 500);

        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/users/:id
 */
router.delete('/:id', authorize('admin'), async (req: Request, res: Response, next) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('users')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw new AppError(error.message, 500);

        res.json({ success: true, message: 'Đã xóa người dùng' });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/users/:id
 */
router.get('/:id', async (req: Request, res: Response, next) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('users')
            .select('*, role:roles(*)')
            .eq('id', id)
            .single();

        if (error) throw new AppError(error.message, 404);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
});

export default router;
