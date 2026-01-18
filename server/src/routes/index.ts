import { Router } from 'express';
import authRoutes from './auth';
import materialsRoutes from './materials';
import warehousesRoutes from './warehouses';
import purchasesRoutes from './purchases';
import purchasesV2Routes from './purchasesV2';
import exportsRoutes from './exports';
import reportsRoutes from './reports';
import vehiclesRoutes from './vehicles';
import projectsRoutes from './projects';
import settingsRoutes from './settings';
import lookupsRoutes from './lookups';
import usersRoutes from './users';
import transportUnitsRoutes from './transportUnits';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/materials', materialsRoutes);
router.use('/warehouses', warehousesRoutes);
router.use('/purchases/v2', purchasesV2Routes); // New V2 routes
router.use('/purchases', purchasesRoutes);
router.use('/exports', exportsRoutes);
router.use('/reports', reportsRoutes);
router.use('/vehicles', vehiclesRoutes);
router.use('/transport-units', transportUnitsRoutes);
router.use('/projects', projectsRoutes);
router.use('/settings', settingsRoutes);
router.use('/lookups', lookupsRoutes);

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'EBH API is running',
        timestamp: new Date().toISOString(),
    });
});

export default router;
