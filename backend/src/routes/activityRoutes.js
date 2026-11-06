import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getActivitySummary, listActivity } from '../controllers/activityController.js';

const router = Router();

router.get('/', requireAuth, listActivity);
router.get('/summary', requireAuth, getActivitySummary);

export default router;
