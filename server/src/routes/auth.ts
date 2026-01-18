import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import config from '../config';
import { getSupabaseClient } from '../database/supabase';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

// Helper function to create JWT token
function signToken(payload: object, secret: string, expiresIn: string): string {
    const options: SignOptions = { expiresIn: expiresIn as any };
    return jwt.sign(payload, secret, options);
}

const router = Router();

/**
 * @route GET /api/auth/login
 * @desc Helper route to inform that login must be POST
 */
router.get('/login', (req, res) => {
    res.status(405).json({
        success: false,
        error: 'Method Not Allowed',
        message: 'Endpoint này chỉ chấp nhận request POST. Nếu bạn đang tìm trang đăng nhập, hãy truy cập URL của Frontend.',
    });
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new AppError('Email và mật khẩu là bắt buộc', 400);
        }

        const supabase = getSupabaseClient();

        // Get user with role
        const { data: user, error } = await supabase
            .from('users')
            .select(`
        *,
        role:roles (
          id,
          name,
          display_name,
          permissions
        )
      `)
            .eq('email', email.toLowerCase())
            .eq('is_active', true)
            .is('deleted_at', null)
            .single();

        if (error || !user) {
            throw new AppError('Email hoặc mật khẩu không đúng', 401);
        }

        // Verify password
        console.log(`[AUTH DEBUG] Attempting login for: ${email}`);
        console.log(`[AUTH DEBUG] Password provided: "${password}" (Length: ${password.length})`);
        console.log(`[AUTH DEBUG] Hash in DB: "${user.password_hash}" (Length: ${user.password_hash?.length})`);

        // Clean the hash in case of accidental spaces from copy-paste
        const cleanHash = user.password_hash?.trim();
        if (cleanHash !== user.password_hash) {
            console.log(`[AUTH DEBUG] Hash had trailing/leading spaces! Cleaned hash length: ${cleanHash.length}`);
        }

        const isValidPassword = await bcrypt.compare(password, cleanHash);
        console.log(`[AUTH DEBUG] Comparison result (with clean hash): ${isValidPassword}`);

        if (!isValidPassword) {
            throw new AppError('Email hoặc mật khẩu không đúng', 401);
        }

        // Update last login
        await supabase
            .from('users')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', user.id);

        // Generate tokens
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role.name,
            permissions: user.role.permissions,
        };

        const token = signToken(payload, config.jwt.secret, config.jwt.expiresIn);

        const refreshToken = signToken(
            { userId: user.id },
            config.jwt.refreshSecret,
            config.jwt.refreshExpiresIn
        );

        // Remove sensitive data
        const { password_hash, ...safeUser } = user;

        res.json({
            success: true,
            data: {
                user: safeUser,
                token,
                refreshToken,
            },
            message: 'Đăng nhập thành công',
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/register
 * Register new user (admin only in production)
 */
router.post('/register', async (req: Request, res: Response, next) => {
    try {
        const { email, password, full_name, phone, role_id } = req.body;

        if (!email || !password || !full_name) {
            throw new AppError('Email, mật khẩu và họ tên là bắt buộc', 400);
        }

        if (password.length < 6) {
            throw new AppError('Mật khẩu phải có ít nhất 6 ký tự', 400);
        }

        const supabase = getSupabaseClient();

        // Check if email exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            throw new AppError('Email đã được sử dụng', 400);
        }

        // Get default role if not specified
        let roleId = role_id;
        if (!roleId) {
            const { data: defaultRole } = await supabase
                .from('roles')
                .select('id')
                .eq('name', 'field_worker')
                .single();
            roleId = defaultRole?.id;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Create user
        const { data: newUser, error } = await supabase
            .from('users')
            .insert({
                email: email.toLowerCase(),
                password_hash,
                full_name,
                phone,
                role_id: roleId,
            })
            .select(`
        *,
        role:roles (
          id,
          name,
          display_name,
          permissions
        )
      `)
            .single();

        if (error) {
            throw new AppError('Không thể tạo tài khoản: ' + error.message, 500);
        }

        // Remove sensitive data
        const { password_hash: _, ...safeUser } = newUser;

        res.status(201).json({
            success: true,
            data: safeUser,
            message: 'Tạo tài khoản thành công',
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw new AppError('Refresh token là bắt buộc', 400);
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { userId: string };

        const supabase = getSupabaseClient();

        // Get user
        const { data: user, error } = await supabase
            .from('users')
            .select(`
        *,
        role:roles (
          id,
          name,
          display_name,
          permissions
        )
      `)
            .eq('id', decoded.userId)
            .eq('is_active', true)
            .is('deleted_at', null)
            .single();

        if (error || !user) {
            throw new AppError('Token không hợp lệ', 401);
        }

        // Generate new tokens
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role.name,
            permissions: user.role.permissions,
        };

        const token = signToken(payload, config.jwt.secret, config.jwt.expiresIn);

        const newRefreshToken = signToken(
            { userId: user.id },
            config.jwt.refreshSecret,
            config.jwt.refreshExpiresIn
        );

        res.json({
            success: true,
            data: {
                token,
                refreshToken: newRefreshToken,
            },
        });
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new AppError('Token không hợp lệ', 401));
        } else {
            next(error);
        }
    }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req: Request, res: Response, next) => {
    try {
        const supabase = getSupabaseClient();

        const { data: user, error } = await supabase
            .from('users')
            .select(`
        *,
        role:roles (
          id,
          name,
          display_name,
          permissions
        )
      `)
            .eq('id', req.user?.userId)
            .single();

        if (error || !user) {
            throw new AppError('Không tìm thấy người dùng', 404);
        }

        const { password_hash, ...safeUser } = user;

        res.json({
            success: true,
            data: safeUser,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/logout
 * Logout (client should remove tokens)
 */
router.post('/logout', authenticate, (_req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'Đăng xuất thành công',
    });
});

export default router;
