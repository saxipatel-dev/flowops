import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSummary } from '../controllers/dashboardController.js';

const router = Router();

router.get('/summary', requireAuth, getSummary);

export default router;
