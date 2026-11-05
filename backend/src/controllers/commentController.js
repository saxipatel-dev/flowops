import { z } from 'zod';
import prisma from '../utils/prisma.js';
import { forbidden, notFound } from '../utils/httpError.js';
import { userSummary } from '../utils/selects.js';
import { canViewTask, canViewRequest } from '../services/accessService.js';
import { logActivity, notify } from '../services/activityService.js';

const commentSchema = z
  .object({
    taskId: z.coerce.number().int().positive().optional(),
    requestId: z.coerce.number().int().positive().optional(),
    content: z.string().trim().min(1, 'Comment cannot be empty').max(1000, 'Comment is too long'),
  })
  .refine((data) => Boolean(data.taskId) !== Boolean(data.requestId), {
    message: 'A comment must belong to either a task or a request',
    path: ['form'],
  });

export async function createComment(req, res) {
  const data = commentSchema.parse(req.body);
  let entityType;
  let entityId;
  let title;
  let recipientIds;

  if (data.taskId) {
    const task = await prisma.task.findUnique({ where: { id: data.taskId } });
    if (!task) throw notFound('Task not found.');
    if (!(await canViewTask(req.user, task))) throw forbidden('You cannot comment on this task.');
    [entityType, entityId, title] = ['task', task.id, task.title];
    recipientIds = [task.assignedTo, task.createdBy];
  } else {
    const request = await prisma.request.findUnique({ where: { id: data.requestId } });
    if (!request) throw notFound('Request not found.');
    if (!(await canViewRequest(req.user, request))) throw forbidden('You cannot comment on this request.');
    [entityType, entityId, title] = ['request', request.id, request.title];
    recipientIds = [request.requestedBy, request.reviewerId];
  }

  // Notify the other people involved, but never the comment author.
  const uniqueRecipients = [...new Set(recipientIds)].filter((id) => id !== req.user.id);

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { userId: req.user.id, taskId: data.taskId, requestId: data.requestId, content: data.content },
      include: { user: { select: userSummary } },
    });
    await logActivity(
      { userId: req.user.id, action: `commented on ${entityType}`, entityType, entityId, details: title },
      tx,
    );
    for (const userId of uniqueRecipients) {
      await notify(
        { userId, message: `${req.user.name} commented on "${title}"`, link: `/${entityType}s/${entityId}` },
        tx,
      );
    }
    return created;
  });

  res.status(201).json({ comment });
}
