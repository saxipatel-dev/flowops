import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';

const router = Router();

router.use(requireAuth);

router.get('/', listNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

export default router;
