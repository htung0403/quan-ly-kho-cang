import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getSettings, updateSettings } from '../services/settingsService';

const router = Router();
import multer from 'multer';
import { AppError } from '../middleware/errorHandler';
import { getSupabaseClient } from '../database/supabase';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

/**
 * POST /api/settings/upload-logo
 * Upload company logo
 */
router.post('/upload-logo', authenticate, authorize('admin'), upload.single('logo'), async (req: Request, res: Response, next) => {
    try {
        if (!req.file) {
            throw new AppError('Không có file nào được tải lên', 400);
        }

        const supabase = getSupabaseClient();
        const fileExt = req.file.originalname.split('.').pop();
        const fileName = `company_logo_${Date.now()}.${fileExt}`;
        const filePath = `system/${fileName}`; // Use system folder

        // Upload to 'avatars' bucket (since we know it exists) but under 'system' folder
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (uploadError) throw new AppError(uploadError.message, 500);

        const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // Update settings directly
        await updateSettings({ logoUrl: data.publicUrl });

        res.json({
            success: true,
            data: {
                logoUrl: data.publicUrl
            },
            message: 'Đã cập nhật logo doanh nghiệp'
        });
    } catch (error) {
        next(error);
    }
});


// Get settings (accessible by authenticated users, or maybe public for printing?)
router.get('/', authenticate, async (req: Request, res: Response, next) => {
    try {
        const settings = await getSettings();
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        next(error);
    }
});

// Update settings (Admin only)
router.put('/', authenticate, authorize('admin'), async (req: Request, res: Response, next) => {
    try {
        const updated = await updateSettings(req.body);
        res.json({
            success: true,
            data: updated,
            message: 'Cập nhật cài đặt thành công'
        });
    } catch (error) {
        next(error);
    }
});

export default router;
