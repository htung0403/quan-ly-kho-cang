import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../database/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

/**
 * GET /api/projects
 * Lấy danh sách dự án
 */
router.get('/', authorize('projects:read'), async (req: Request, res: Response, next) => {
    try {
        const { search = '', status = '' } = req.query;
        const supabase = getSupabaseClient();

        let query;

        if (req.user?.role === 'admin') {
            query = supabase
                .from('projects')
                .select('*')
                .is('deleted_at', null)
                .order('created_at', { ascending: false });
        } else {
            query = supabase
                .from('projects')
                .select('*, project_users!inner(user_id)')
                .eq('project_users.user_id', req.user!.userId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });
        }

        if (search) {
            query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
        }
        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw new AppError(error.message, 500);

        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/projects
 * Tạo dự án mới
 */
router.post('/', authorize('projects:write'), async (req: Request, res: Response, next) => {
    try {
        const { code, name, description, client_name, status = 'active' } = req.body;

        if (!code || !name) {
            throw new AppError('Mã và tên dự án là bắt buộc', 400);
        }

        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('projects')
            .insert({ code: code.toUpperCase(), name, description, client_name, status })
            .select()
            .single();

        if (error) throw new AppError(error.message, 500);

        res.status(201).json({ success: true, data, message: 'Tạo dự án thành công' });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/projects/:id/users
 * Lấy danh sách nhân viên trong dự án
 */
router.get('/:id/users', authorize('projects:read'), async (req: Request, res: Response, next) => {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('project_users')
            .select(`
                *,
                user:users!user_id (
                    id, 
                    full_name, 
                    email, 
                    role:roles (
                        id,
                        name,
                        display_name
                    )
                )
            `)
            .eq('project_id', id);

        if (error) {
            console.error('[PROJECTS ERROR] GET /:id/users:', error);
            throw new AppError(error.message, 500);
        }

        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/projects/:id/users
 * Gán nhân viên vào dự án (Phân quyền)
 */
router.post('/:id/users', authorize('projects:write'), async (req: Request, res: Response, next) => {
    try {
        const { id: project_id } = req.params;
        const { user_id } = req.body;

        if (!user_id) throw new AppError('User ID là bắt buộc', 400);

        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('project_users')
            .upsert({
                project_id,
                user_id,
                can_view: true,
                can_edit: true,
                can_delete: false
            })
            .select()
            .single();

        if (error) throw new AppError(error.message, 500);

        res.json({ success: true, data, message: 'Phân quyền thành công' });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/projects/:id/users/:userId
 * Xóa nhân viên khỏi dự án
 */
router.delete('/:id/users/:userId', authorize('projects:write'), async (req: Request, res: Response, next) => {
    try {
        const { id: project_id, userId: user_id } = req.params;
        const supabase = getSupabaseClient();

        const { error } = await supabase
            .from('project_users')
            .delete()
            .eq('project_id', project_id)
            .eq('user_id', user_id);

        if (error) throw new AppError(error.message, 500);

        res.json({ success: true, message: 'Đã gỡ nhân viên khỏi dự án' });
    } catch (error) {
        next(error);
    }
});

export default router;
