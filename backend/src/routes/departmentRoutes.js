import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listDepartments } from '../controllers/userController.js';

const router = Router();

router.get('/', requireAuth, listDepartments);

export default router;
