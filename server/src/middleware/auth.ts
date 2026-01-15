import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';

export interface JwtPayload {
    userId: string;
    email: string;
    role: string;
    permissions: string[];
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

/**
 * Middleware to verify JWT token
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Token không hợp lệ hoặc đã hết hạn',
        });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Token không hợp lệ hoặc đã hết hạn',
        });
    }
}

/**
 * Middleware to check if user has required permission
 */
export function authorize(...requiredPermissions: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Vui lòng đăng nhập',
            });
            return;
        }

        const userPermissions = req.user.permissions || [];

        // Admin has all permissions
        if (userPermissions.includes('*')) {
            next();
            return;
        }

        // Check if user has at least one required permission
        const hasPermission = requiredPermissions.some((perm) =>
            userPermissions.includes(perm)
        );

        if (!hasPermission) {
            res.status(403).json({
                success: false,
                error: 'Forbidden',
                message: 'Bạn không có quyền thực hiện hành động này',
            });
            return;
        }

        next();
    };
}

/**
 * Middleware to check if user has specific role
 */
export function requireRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'Vui lòng đăng nhập',
            });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: 'Forbidden',
                message: 'Bạn không có quyền truy cập tài nguyên này',
            });
            return;
        }

        next();
    };
}
