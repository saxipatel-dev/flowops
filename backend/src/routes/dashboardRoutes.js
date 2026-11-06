import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSummary, getTimeline } from '../controllers/dashboardController.js';

const router = Router();

router.get('/summary', requireAuth, getSummary);
router.get('/timeline', requireAuth, getTimeline);

export default router;
