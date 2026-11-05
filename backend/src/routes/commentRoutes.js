import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createComment } from '../controllers/commentController.js';

const router = Router();

router.post('/', requireAuth, createComment);

export default router;
