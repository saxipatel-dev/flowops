import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../utils/prisma.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { userDetails, userSummary } from '../utils/selects.js';
import { logActivity } from '../services/activityService.js';
import { parseId } from '../utils/parseId.js';
import { endUserSessions } from '../services/sessionService.js';

const roles = ['EMPLOYEE', 'MANAGER', 'ADMIN'];

const baseUserFields = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  role: z.enum(roles, { message: 'Choose a valid role' }),
  jobTitle: z.string().trim().max(80).optional().default(''),
  departmentId: z.coerce.number().int().positive().nullable().optional(),
};

const createUserSchema = z.object({
  ...baseUserFields,
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

const updateUserSchema = z.object({
  ...baseUserFields,
  isActive: z.boolean(),
});

async function checkDepartment(departmentId) {
  if (!departmentId) return;
  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!department) throw badRequest('Selected department does not exist.');
}

export async function listUsers(req, res) {
  const search = (req.query.search || '').trim();
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (roles.includes(req.query.role)) where.role = req.query.role;

  const users = await prisma.user.findMany({ where, select: userDetails, orderBy: { name: 'asc' } });
  res.json({ users });
}

// People the current manager or admin can assign tasks to.
export async function listAssignableUsers(req, res) {
  const where = { isActive: true };
  if (req.user.role === 'MANAGER') {
    where.OR = [{ id: req.user.id }, { department: { managerId: req.user.id } }];
  }
  const users = await prisma.user.findMany({ where, select: userSummary, orderBy: { name: 'asc' } });
  res.json({ users });
}

export async function createUser(req, res) {
  const data = createUserSchema.parse(req.body);
  await checkDepartment(data.departmentId);

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      jobTitle: data.jobTitle || null,
      departmentId: data.departmentId || null,
      passwordHash,
    },
    select: userDetails,
  });

  await logActivity({
    userId: req.user.id,
    action: 'created user',
    entityType: 'user',
    entityId: user.id,
    details: `${user.name} (${user.role.toLowerCase()})`,
  });
  res.status(201).json({ user });
}

export async function updateUser(req, res) {
  const userId = parseId(req.params.id);
  const data = updateUserSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw notFound('User not found.');

  if (userId === req.user.id && (!data.isActive || data.role !== 'ADMIN')) {
    throw badRequest('You cannot deactivate your own account or remove your own admin role.');
  }
  await checkDepartment(data.departmentId);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      jobTitle: data.jobTitle || null,
      departmentId: data.departmentId || null,
      isActive: data.isActive,
    },
    select: userDetails,
  });

  // A deactivated account is signed out everywhere straight away.
  if (existing.isActive && !user.isActive) await endUserSessions(user.id);

  const changes = [];
  if (existing.role !== user.role) changes.push(`role changed to ${user.role.toLowerCase()}`);
  if (existing.isActive !== user.isActive) changes.push(user.isActive ? 'reactivated' : 'deactivated');
  await logActivity({
    userId: req.user.id,
    action: 'updated user',
    entityType: 'user',
    entityId: user.id,
    details: changes.length ? `${user.name}: ${changes.join(', ')}` : user.name,
  });

  res.json({ user });
}

export async function listDepartments(req, res) {
  const departments = await prisma.department.findMany({
    select: { id: true, name: true, manager: { select: userSummary } },
    orderBy: { name: 'asc' },
  });
  res.json({ departments });
}
