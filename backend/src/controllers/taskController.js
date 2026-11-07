import { z } from 'zod';
import prisma from '../utils/prisma.js';
import { badRequest, forbidden, notFound } from '../utils/httpError.js';
import { userSummary } from '../utils/selects.js';
import { getPage } from '../utils/pagination.js';
import { parseId } from '../utils/parseId.js';
import { localToday } from '../utils/dates.js';
import { taskStatusLabels } from '../utils/labels.js';
import { canViewTask, canManageTask, canAssignTo, getStatusPermissionCheck, getVisibleTaskFilter } from '../services/accessService.js';
import { logActivity, notify } from '../services/activityService.js';

const statuses = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
// The board and timeline load every visible task at once, up to this many.
const MAX_TASK_PAGE_SIZE = 200;
const priorities = ['LOW', 'MEDIUM', 'HIGH'];

// Accepts "YYYY-MM-DD", or an empty value to clear the date.
const dueDateField = z
  .union([z.string().date('Enter a valid date'), z.literal(''), z.null()])
  .transform((value) => (value ? new Date(value) : null));

const taskFields = {
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120, 'Title is too long'),
  description: z.string().trim().max(2000, 'Description is too long').default(''),
  priority: z.enum(priorities, { message: 'Choose a valid priority' }),
  status: z.enum(statuses, { message: 'Choose a valid status' }),
  assignedTo: z.coerce.number({ message: 'Choose an assignee' }).int().positive('Choose an assignee'),
  dueDate: dueDateField,
};

const createTaskSchema = z.object({
  ...taskFields,
  priority: taskFields.priority.default('MEDIUM'),
  status: taskFields.status.default('TODO'),
  dueDate: dueDateField.optional(),
});

const updateTaskSchema = z.object(taskFields).partial();

const taskListInclude = {
  assignee: { select: userSummary },
  creator: { select: userSummary },
};

// Due dates are calendar days, so "the past" is judged against the user's own today.
function isPastDate(date, utcOffset) {
  return date < localToday(utcOffset);
}

async function loadTask(user, id) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw notFound('Task not found.');
  if (!(await canViewTask(user, task))) throw forbidden('You do not have access to this task.');
  return task;
}

export async function listTasks(req, res) {
  const { status, priority, search, scope } = req.query;
  const where = { AND: [await getVisibleTaskFilter(req.user, scope)] };

  if (statuses.includes(status)) where.AND.push({ status });
  if (priorities.includes(priority)) where.AND.push({ priority });
  if (search && search.trim()) {
    where.AND.push({ title: { contains: search.trim(), mode: 'insensitive' } });
  }

  const { page, skip, take, pageSize } = getPage(req.query, MAX_TASK_PAGE_SIZE);
  const [tasks, total, canUpdateStatus] = await Promise.all([
    prisma.task.findMany({
      where,
      include: taskListInclude,
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { id: 'desc' }],
      skip,
      take,
    }),
    prisma.task.count({ where }),
    getStatusPermissionCheck(req.user),
  ]);

  // Lets the board show which cards can move; PATCH /tasks/:id still checks for itself.
  res.json({ tasks: tasks.map((task) => ({ ...task, canUpdateStatus: canUpdateStatus(task) })), total, page, pageSize });
}

export async function getTask(req, res) {
  const task = await loadTask(req.user, parseId(req.params.id));

  const [details, activity, canManage] = await Promise.all([
    prisma.task.findUnique({
      where: { id: task.id },
      include: {
        ...taskListInclude,
        request: { select: { id: true, title: true, status: true } },
        comments: { include: { user: { select: userSummary } }, orderBy: { createdAt: 'asc' } },
      },
    }),
    prisma.activityLog.findMany({
      where: { entityType: 'task', entityId: task.id },
      include: { user: { select: userSummary } },
      orderBy: { createdAt: 'desc' },
    }),
    canManageTask(req.user, task),
  ]);

  res.json({
    task: details,
    activity,
    permissions: {
      canEdit: canManage,
      canUpdateStatus: canManage || task.assignedTo === req.user.id,
      canDelete: req.user.role === 'ADMIN' || task.createdBy === req.user.id,
    },
  });
}

export async function createTask(req, res) {
  const data = createTaskSchema.parse(req.body);

  if (data.dueDate && isPastDate(data.dueDate, req.utcOffset)) {
    throw badRequest('Due date cannot be in the past.');
  }
  if (!(await canAssignTo(req.user, data.assignedTo))) {
    throw forbidden('You can only assign tasks to active members of your team.');
  }

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        ...data,
        dueDate: data.dueDate ?? null,
        createdBy: req.user.id,
        completedAt: data.status === 'COMPLETED' ? new Date() : null,
      },
      include: taskListInclude,
    });

    await logActivity(
      { userId: req.user.id, action: 'created task', entityType: 'task', entityId: created.id, details: created.title },
      tx,
    );
    if (created.assignedTo !== req.user.id) {
      await logActivity(
        {
          userId: req.user.id,
          action: 'assigned task',
          entityType: 'task',
          entityId: created.id,
          details: `${created.title}: assigned to ${created.assignee.name}`,
        },
        tx,
      );
      await notify(
        {
          userId: created.assignedTo,
          message: `${req.user.name} assigned you a new task: ${created.title}`,
          link: `/tasks/${created.id}`,
        },
        tx,
      );
    }
    return created;
  });

  res.status(201).json({ task });
}

export async function updateTask(req, res) {
  const task = await loadTask(req.user, parseId(req.params.id));
  const submitted = updateTaskSchema.parse(req.body);

  // Only keep fields whose value is different from what is saved.
  const data = {};
  for (const [field, value] of Object.entries(submitted)) {
    const current = task[field];
    const isSame =
      value instanceof Date && current instanceof Date ? value.getTime() === current.getTime() : value === current;
    if (!isSame) data[field] = value;
  }
  const changedFields = Object.keys(data);

  if (changedFields.length === 0) {
    return res.json({ task: await prisma.task.findUnique({ where: { id: task.id }, include: taskListInclude }) });
  }

  const canManage = await canManageTask(req.user, task);
  const isStatusOnly = changedFields.length === 1 && changedFields[0] === 'status';
  if (!canManage && !(isStatusOnly && task.assignedTo === req.user.id)) {
    throw forbidden('You can only update the status of tasks assigned to you.');
  }

  const assigneeChanged = data.assignedTo !== undefined;
  if (assigneeChanged && !(await canAssignTo(req.user, data.assignedTo))) {
    throw forbidden('You can only assign tasks to active members of your team.');
  }
  if (data.dueDate && isPastDate(data.dueDate, req.utcOffset)) {
    throw badRequest('Due date cannot be in the past.');
  }
  const statusChanged = data.status !== undefined;
  if (statusChanged) {
    // Record when the task was completed; reopening it clears the time.
    data.completedAt = data.status === 'COMPLETED' ? new Date() : null;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.task.update({
      where: { id: task.id },
      data,
      include: { ...taskListInclude, request: { select: { id: true, title: true, requestedBy: true } } },
    });
    const link = `/tasks/${saved.id}`;

    if (statusChanged) {
      await logActivity(
        {
          userId: req.user.id,
          action: 'changed task status',
          entityType: 'task',
          entityId: saved.id,
          details: `${saved.title}: ${taskStatusLabels[task.status]} → ${taskStatusLabels[saved.status]}`,
        },
        tx,
      );
      if (saved.createdBy !== req.user.id) {
        await notify(
          {
            userId: saved.createdBy,
            message: `${req.user.name} moved "${saved.title}" to ${taskStatusLabels[saved.status]}`,
            link,
          },
          tx,
        );
      }
      if (saved.status === 'COMPLETED' && saved.request) {
        await notify(
          {
            userId: saved.request.requestedBy,
            message: `The follow-up task for your request "${saved.request.title}" is completed`,
            link: `/requests/${saved.request.id}`,
          },
          tx,
        );
      }
    }

    if (assigneeChanged) {
      await logActivity(
        {
          userId: req.user.id,
          action: 'assigned task',
          entityType: 'task',
          entityId: saved.id,
          details: `${saved.title}: assigned to ${saved.assignee.name}`,
        },
        tx,
      );
      if (saved.assignedTo !== req.user.id) {
        await notify(
          { userId: saved.assignedTo, message: `${req.user.name} assigned you a task: ${saved.title}`, link },
          tx,
        );
      }
    }

    const otherFields = changedFields.filter((field) => !['status', 'assignedTo'].includes(field));
    if (otherFields.length > 0) {
      await logActivity(
        { userId: req.user.id, action: 'updated task', entityType: 'task', entityId: saved.id, details: saved.title },
        tx,
      );
    }
    return saved;
  });

  delete updated.request;
  res.json({ task: updated });
}

export async function deleteTask(req, res) {
  const task = await loadTask(req.user, parseId(req.params.id));

  if (req.user.role !== 'ADMIN' && task.createdBy !== req.user.id) {
    throw forbidden('Only the task creator or an administrator can delete this task.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.delete({ where: { id: task.id } });
    await logActivity(
      { userId: req.user.id, action: 'deleted task', entityType: 'task', entityId: task.id, details: task.title },
      tx,
    );
  });

  res.json({ message: 'Task deleted.' });
}
