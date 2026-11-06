import { z } from 'zod';
import prisma from '../utils/prisma.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/httpError.js';
import { userSummary } from '../utils/selects.js';
import { getPage, PAGE_SIZE } from '../utils/pagination.js';
import { parseId } from '../utils/parseId.js';
import { canViewRequest, canAssignTo, getVisibleRequestFilter } from '../services/accessService.js';
import { logActivity, notify } from '../services/activityService.js';

const categories = ['EQUIPMENT', 'PURCHASE', 'IT_SUPPORT', 'GENERAL_OPERATIONS'];
const statuses = ['PENDING', 'APPROVED', 'REJECTED'];

// Approved requests in these categories need someone to buy or deliver something.
const FOLLOW_UP_CATEGORIES = ['EQUIPMENT', 'PURCHASE'];

const createRequestSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120, 'Title is too long'),
  description: z
    .string()
    .trim()
    .min(10, 'Please describe the request in at least 10 characters')
    .max(2000, 'Description is too long'),
  category: z.enum(categories, { message: 'Choose a category' }),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH'], { message: 'Choose a priority' }).default('MEDIUM'),
  estimatedCost: z
    .union([z.literal(''), z.null(), z.coerce.number({ message: 'Enter a valid amount' })])
    .transform((value) => (value === '' || value === null ? null : value))
    .refine((value) => value === null || (value >= 0 && value <= 1000000), 'Amount must be between 0 and 1,000,000')
    .optional(),
});

const decisionSchema = z
  .object({
    decision: z.enum(['approve', 'reject'], { message: 'Decision must be approve or reject' }),
    reason: z.string().trim().max(1000).optional().default(''),
    assigneeId: z.coerce.number().int().positive().optional(),
    dueDate: z.string().date('Enter a valid date').optional(),
  })
  .refine((data) => data.decision === 'approve' || data.reason.length >= 5, {
    message: 'Please give a reason for the rejection (at least 5 characters)',
    path: ['reason'],
  });

const requestInclude = {
  requester: { select: { ...userSummary, department: { select: { name: true } } } },
  reviewer: { select: userSummary },
  decidedBy: { select: userSummary },
};

// The requester's department manager reviews the request. If that is the requester
// themselves (or the department has no manager), another active manager is used.
async function findReviewer(user) {
  const department = user.departmentId
    ? await prisma.department.findUnique({ where: { id: user.departmentId }, include: { manager: true } })
    : null;

  const departmentManager = department?.manager;
  if (
    departmentManager &&
    departmentManager.isActive &&
    departmentManager.role === 'MANAGER' &&
    departmentManager.id !== user.id
  ) {
    return departmentManager;
  }

  return prisma.user.findFirst({
    where: { role: 'MANAGER', isActive: true, id: { not: user.id } },
    orderBy: { id: 'asc' },
  });
}

export async function listRequests(req, res) {
  const { status, category, search, scope } = req.query;
  const where = { AND: [await getVisibleRequestFilter(req.user, scope)] };

  if (statuses.includes(status)) where.AND.push({ status });
  if (categories.includes(category)) where.AND.push({ category });
  if (search && search.trim()) {
    where.AND.push({ title: { contains: search.trim(), mode: 'insensitive' } });
  }

  const { page, skip, take } = getPage(req.query);
  const [requests, total] = await Promise.all([
    prisma.request.findMany({ where, include: requestInclude, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.request.count({ where }),
  ]);

  res.json({ requests, total, page, pageSize: PAGE_SIZE });
}

export async function getRequest(req, res) {
  const id = parseId(req.params.id);
  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      ...requestInclude,
      task: { select: { id: true, title: true, status: true, assignee: { select: userSummary } } },
      comments: { include: { user: { select: userSummary } }, orderBy: { createdAt: 'asc' } },
    },
  });

  if (!request) throw notFound('Request not found.');
  if (!(await canViewRequest(req.user, request))) {
    throw forbidden('You do not have access to this request.');
  }

  const activity = await prisma.activityLog.findMany({
    where: { entityType: 'request', entityId: request.id },
    include: { user: { select: userSummary } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    request,
    activity,
    permissions: {
      canDecide: request.status === 'PENDING' && request.reviewerId === req.user.id && req.user.role === 'MANAGER',
    },
  });
}

export async function createRequest(req, res) {
  const data = createRequestSchema.parse(req.body);

  const reviewer = await findReviewer(req.user);
  if (!reviewer) {
    throw badRequest('No manager is available to review requests right now. Please contact an administrator.');
  }

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.request.create({
      data: {
        ...data,
        estimatedCost: data.estimatedCost ?? null,
        requestedBy: req.user.id,
        reviewerId: reviewer.id,
      },
      include: requestInclude,
    });

    await logActivity(
      {
        userId: req.user.id,
        action: 'submitted request',
        entityType: 'request',
        entityId: created.id,
        details: created.title,
      },
      tx,
    );
    await notify(
      {
        userId: reviewer.id,
        message: `${req.user.name} submitted a request for your review: ${created.title}`,
        link: `/requests/${created.id}`,
      },
      tx,
    );
    return created;
  });

  res.status(201).json({ request });
}

export async function decideRequest(req, res) {
  const id = parseId(req.params.id);
  const data = decisionSchema.parse(req.body);

  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) throw notFound('Request not found.');
  if (req.user.role !== 'MANAGER' || request.reviewerId !== req.user.id) {
    throw forbidden('Only the manager assigned to this request can review it.');
  }
  if (request.status !== 'PENDING') {
    throw conflict(`This request has already been ${request.status.toLowerCase()}.`);
  }

  const approved = data.decision === 'approve';
  const needsFollowUp = approved && FOLLOW_UP_CATEGORIES.includes(request.category);
  const assigneeId = data.assigneeId || req.user.id;

  if (needsFollowUp && !(await canAssignTo(req.user, assigneeId))) {
    throw forbidden('You can only assign the follow-up task to an active member of your team.');
  }
  const today = new Date().toISOString().slice(0, 10);
  if (needsFollowUp && data.dueDate && data.dueDate < today) {
    throw badRequest('Due date cannot be in the past.');
  }

  const result = await prisma.$transaction(async (tx) => {
    // The status check inside the update stops two reviewers (or a double click)
    // from deciding the same request twice.
    const { count } = await tx.request.updateMany({
      where: { id, status: 'PENDING' },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        reviewedBy: req.user.id,
        reviewComment: data.reason || null,
        reviewedAt: new Date(),
      },
    });
    if (count === 0) {
      throw conflict('This request has already been reviewed.');
    }

    await logActivity(
      {
        userId: req.user.id,
        action: approved ? 'approved request' : 'rejected request',
        entityType: 'request',
        entityId: id,
        details: data.reason ? `${request.title}: ${data.reason}` : request.title,
      },
      tx,
    );
    await notify(
      {
        userId: request.requestedBy,
        message: approved
          ? `Your request "${request.title}" was approved`
          : `Your request "${request.title}" was rejected: ${data.reason}`,
        link: `/requests/${id}`,
      },
      tx,
    );

    let task = null;
    if (needsFollowUp) {
      const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      task = await tx.task.create({
        data: {
          title: `Fulfil request: ${request.title}`,
          description: request.description,
          priority: request.priority,
          assignedTo: assigneeId,
          createdBy: req.user.id,
          requestId: id,
          dueDate: new Date(data.dueDate || defaultDueDate),
        },
      });
      await logActivity(
        {
          userId: req.user.id,
          action: 'created task',
          entityType: 'task',
          entityId: task.id,
          details: `${task.title} (from request #${id})`,
        },
        tx,
      );
      if (assigneeId !== req.user.id) {
        await notify(
          {
            userId: assigneeId,
            message: `${req.user.name} assigned you a new task: ${task.title}`,
            link: `/tasks/${task.id}`,
          },
          tx,
        );
      }
    }

    const updated = await tx.request.findUnique({ where: { id }, include: requestInclude });
    return { request: updated, task };
  });

  res.json(result);
}
