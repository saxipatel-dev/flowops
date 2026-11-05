import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { listRequests, getRequest, createRequest, decideRequest } from '../controllers/requestController.js';

const router = Router();

router.use(requireAuth);

router.get('/', listRequests);
router.post('/', createRequest);
router.get('/:id', getRequest);
router.post('/:id/decision', requireRole('MANAGER'), decideRequest);

export default router;
