import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { listTasks, getTask, createTask, updateTask, deleteTask } from '../controllers/taskController.js';

const router = Router();

router.use(requireAuth);

router.get('/', listTasks);
router.post('/', requireRole('MANAGER', 'ADMIN'), createTask);
router.get('/:id', getTask);
router.patch('/:id', updateTask);
router.delete('/:id', requireRole('MANAGER', 'ADMIN'), deleteTask);

export default router;
