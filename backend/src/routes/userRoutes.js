import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { blockInDemo } from '../middleware/demo.js';
import { listUsers, listAssignableUsers, createUser, updateUser } from '../controllers/userController.js';

const router = Router();

router.use(requireAuth);

router.get('/assignable', requireRole('MANAGER', 'ADMIN'), listAssignableUsers);
router.get('/', requireRole('ADMIN'), listUsers);
router.post('/', requireRole('ADMIN'), blockInDemo, createUser);
router.patch('/:id', requireRole('ADMIN'), blockInDemo, updateUser);

export default router;
