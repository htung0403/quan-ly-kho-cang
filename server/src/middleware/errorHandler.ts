import { Request, Response, NextFunction } from 'express';

interface ErrorResponse {
    success: false;
    error: string;
    message: string;
    stack?: string;
}

export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export function errorHandler(
    err: Error | AppError,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    console.error('Error:', err);

    const statusCode = (err as AppError).statusCode || 500;
    const message = err.message || 'Đã xảy ra lỗi server';

    const response: ErrorResponse = {
        success: false,
        error: statusCode >= 500 ? 'Internal Server Error' : 'Bad Request',
        message,
    };

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
}

export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} không tồn tại`,
    });
}
