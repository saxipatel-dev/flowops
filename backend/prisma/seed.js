// Demo data for local development. All people and records are fictional.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';

export const DEMO_PASSWORD = 'Password123!';

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days, hour = 10) => {
  const date = new Date(Date.now() - days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date;
};
const dateOnly = (daysFromNow) => new Date(new Date(Date.now() + daysFromNow * DAY).toISOString().slice(0, 10));

export async function seedDatabase(prisma) {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE activity_logs, notifications, comments, tasks, requests, departments, users, session RESTART IDENTITY CASCADE',
  );

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const operations = await prisma.department.create({ data: { name: 'Operations' } });
  const it = await prisma.department.create({ data: { name: 'IT' } });
  const sales = await prisma.department.create({ data: { name: 'Sales' } });

  const createUser = (name, email, role, jobTitle, departmentId) =>
    prisma.user.create({
      data: { name, email, role, jobTitle, departmentId, passwordHash, createdAt: daysAgo(60) },
    });

  const grace = await createUser('Grace Thompson', 'admin@flowops.test', 'ADMIN', 'Office Administrator', null);
  const daniel = await createUser('Daniel Reyes', 'daniel@flowops.test', 'MANAGER', 'Operations Manager', operations.id);
  const priya = await createUser('Priya Nair', 'priya@flowops.test', 'MANAGER', 'IT Manager', it.id);
  const maya = await createUser('Maya Chen', 'maya@flowops.test', 'EMPLOYEE', 'Operations Coordinator', operations.id);
  const alex = await createUser('Alex Morgan', 'alex@flowops.test', 'EMPLOYEE', 'Sales Associate', sales.id);
  const jordan = await createUser('Jordan Lee', 'jordan@flowops.test', 'EMPLOYEE', 'IT Support Specialist', it.id);
  const sam = await createUser('Sam Okafor', 'sam@flowops.test', 'EMPLOYEE', 'Systems Administrator', it.id);
  const elena = await createUser('Elena Brooks', 'elena@flowops.test', 'EMPLOYEE', 'Account Executive', sales.id);

  await prisma.department.update({ where: { id: operations.id }, data: { managerId: daniel.id } });
  await prisma.department.update({ where: { id: sales.id }, data: { managerId: daniel.id } });
  await prisma.department.update({ where: { id: it.id }, data: { managerId: priya.id } });

  await prisma.activityLog.createMany({
    data: [maya, alex, jordan, sam, elena, daniel, priya].map((user) => ({
      userId: grace.id,
      action: 'created user',
      entityType: 'user',
      entityId: user.id,
      details: `${user.name} (${user.role.toLowerCase()})`,
      createdAt: daysAgo(60),
    })),
  });

  const log = (userId, action, entityType, entityId, details, createdAt) =>
    prisma.activityLog.create({ data: { userId, action, entityType, entityId, details, createdAt } });

  async function addRequest({ requester, reviewer, submittedDaysAgo, decision, ...fields }) {
    const createdAt = daysAgo(submittedDaysAgo, 9);
    const request = await prisma.request.create({
      data: { ...fields, requestedBy: requester.id, reviewerId: reviewer.id, createdAt },
    });
    await log(requester.id, 'submitted request', 'request', request.id, request.title, createdAt);

    if (decision) {
      const reviewedAt = daysAgo(decision.daysAgo, 14);
      const approved = decision.status === 'APPROVED';
      await prisma.request.update({
        where: { id: request.id },
        data: {
          status: decision.status,
          reviewedBy: reviewer.id,
          reviewComment: decision.comment || null,
          reviewedAt,
        },
      });
      await log(
        reviewer.id,
        approved ? 'approved request' : 'rejected request',
        'request',
        request.id,
        decision.comment ? `${request.title}: ${decision.comment}` : request.title,
        reviewedAt,
      );
      await prisma.notification.create({
        data: {
          userId: requester.id,
          message: approved
            ? `Your request "${request.title}" was approved`
            : `Your request "${request.title}" was rejected: ${decision.comment}`,
          link: `/requests/${request.id}`,
          isRead: decision.daysAgo > 3,
          createdAt: reviewedAt,
        },
      });
    } else {
      await prisma.notification.create({
        data: {
          userId: reviewer.id,
          message: `${requester.name} submitted a request for your review: ${request.title}`,
          link: `/requests/${request.id}`,
          createdAt,
        },
      });
    }
    return request;
  }

  async function addTask({ creator, assignee, createdDaysAgo, statusHistory = [], requestId, ...fields }) {
    const createdAt = daysAgo(createdDaysAgo, 11);
    // Completed demo tasks get the same time as their logged "→ Completed" change.
    const completion = fields.status === 'COMPLETED' ? statusHistory.findLast((c) => c.text.endsWith('Completed')) : null;
    const completedAt = completion ? daysAgo(completion.daysAgo, 15) : null;
    const task = await prisma.task.create({
      data: { ...fields, assignedTo: assignee.id, createdBy: creator.id, requestId, createdAt, completedAt },
    });
    await log(creator.id, 'created task', 'task', task.id, task.title, createdAt);
    await log(creator.id, 'assigned task', 'task', task.id, `${task.title}: assigned to ${assignee.name}`, createdAt);
    await prisma.notification.create({
      data: {
        userId: assignee.id,
        message: `${creator.name} assigned you a new task: ${task.title}`,
        link: `/tasks/${task.id}`,
        isRead: createdDaysAgo > 2,
        createdAt,
      },
    });
    for (const change of statusHistory) {
      await log(assignee.id, 'changed task status', 'task', task.id, `${task.title}: ${change.text}`, daysAgo(change.daysAgo, 15));
    }
    return task;
  }

  // Requests waiting for review
  const laptopRequest = await addRequest({
    requester: maya,
    reviewer: daniel,
    submittedDaysAgo: 1,
    title: 'Replacement laptop',
    description: 'My current laptop shuts down randomly and the battery lasts under an hour. IT confirmed the hardware is failing.',
    category: 'EQUIPMENT',
    priority: 'HIGH',
    estimatedCost: 1200,
  });
  await addRequest({
    requester: alex,
    reviewer: daniel,
    submittedDaysAgo: 2,
    title: 'Team supplies for regional sales event',
    description: 'Name badges, printed brochures, and a table banner for the regional sales event on the 21st.',
    category: 'PURCHASE',
    priority: 'MEDIUM',
    estimatedCost: 175,
  });
  await addRequest({
    requester: jordan,
    reviewer: priya,
    submittedDaysAgo: 3,
    title: 'Second monitor for help desk station',
    description: 'A second monitor would let me keep the ticket queue open while working on remote sessions.',
    category: 'EQUIPMENT',
    priority: 'LOW',
    estimatedCost: 260,
  });
  await addRequest({
    requester: sam,
    reviewer: priya,
    submittedDaysAgo: 1,
    title: 'VPN access for new contractor',
    description: 'The external accountant starting Monday needs VPN access to the shared finance drive for three months.',
    category: 'IT_SUPPORT',
    priority: 'HIGH',
  });
  await addRequest({
    requester: daniel,
    reviewer: priya,
    submittedDaysAgo: 2,
    title: 'Projector for quarterly review meeting',
    description: 'The large meeting room projector is broken. We need a replacement before the quarterly review next week.',
    category: 'EQUIPMENT',
    priority: 'MEDIUM',
    estimatedCost: 480,
  });

  // Requests that have already been reviewed
  const suppliesRequest = await addRequest({
    requester: maya,
    reviewer: daniel,
    submittedDaysAgo: 14,
    title: 'Office supplies restock',
    description: 'Printer paper, toner for the 2nd floor printer, sticky notes, and whiteboard markers.',
    category: 'PURCHASE',
    priority: 'LOW',
    estimatedCost: 85,
    decision: { status: 'APPROVED', daysAgo: 13, comment: 'Approved. Please use the usual supplier.' },
  });
  const headsetRequest = await addRequest({
    requester: alex,
    reviewer: daniel,
    submittedDaysAgo: 6,
    title: 'Headset replacement',
    description: 'The microphone on my headset stopped working, which makes client calls difficult.',
    category: 'EQUIPMENT',
    priority: 'MEDIUM',
    estimatedCost: 90,
    decision: { status: 'APPROVED', daysAgo: 5 },
  });
  const licenseRequest = await addRequest({
    requester: jordan,
    reviewer: priya,
    submittedDaysAgo: 9,
    title: 'Diagram software license renewal',
    description: 'Our team license for the network diagram software expires at the end of the month.',
    category: 'PURCHASE',
    priority: 'MEDIUM',
    estimatedCost: 144,
    decision: { status: 'APPROVED', daysAgo: 8, comment: 'Renew for one year.' },
  });
  await addRequest({
    requester: elena,
    reviewer: daniel,
    submittedDaysAgo: 10,
    title: 'Book large meeting room for client workshop',
    description: 'Client workshop with 12 attendees on Thursday afternoon. Need the large meeting room and catering setup.',
    category: 'GENERAL_OPERATIONS',
    priority: 'MEDIUM',
    decision: { status: 'APPROVED', daysAgo: 9 },
  });
  await addRequest({
    requester: sam,
    reviewer: priya,
    submittedDaysAgo: 7,
    title: 'Printer on 2nd floor keeps jamming',
    description: 'The shared printer jams on almost every double-sided job. It may need a service visit.',
    category: 'IT_SUPPORT',
    priority: 'LOW',
    decision: { status: 'APPROVED', daysAgo: 6, comment: 'Service visit booked with the vendor.' },
  });
  await addRequest({
    requester: maya,
    reviewer: daniel,
    submittedDaysAgo: 12,
    title: 'Standing desk',
    description: 'Requesting a standing desk for my workstation to help with back pain.',
    category: 'EQUIPMENT',
    priority: 'LOW',
    estimatedCost: 640,
    decision: {
      status: 'REJECTED',
      daysAgo: 11,
      comment: 'Please check with facilities about the shared ergonomic desks first.',
    },
  });
  await addRequest({
    requester: elena,
    reviewer: daniel,
    submittedDaysAgo: 8,
    title: 'CRM training course',
    description: 'Online advanced CRM reporting course to help build better pipeline reports.',
    category: 'PURCHASE',
    priority: 'MEDIUM',
    estimatedCost: 450,
    decision: {
      status: 'REJECTED',
      daysAgo: 7,
      comment: 'The training budget for this quarter is used up. Please resubmit in January.',
    },
  });

  // Follow-up tasks created from approved equipment and purchase requests
  await addTask({
    creator: daniel,
    assignee: maya,
    createdDaysAgo: 13,
    requestId: suppliesRequest.id,
    title: 'Fulfil request: Office supplies restock',
    description: 'Order from the usual supplier and restock the supply cabinet.',
    priority: 'LOW',
    status: 'COMPLETED',
    dueDate: dateOnly(-8),
    statusHistory: [
      { daysAgo: 12, text: 'To Do → In Progress' },
      { daysAgo: 10, text: 'In Progress → Completed' },
    ],
  });
  await addTask({
    creator: daniel,
    assignee: maya,
    createdDaysAgo: 5,
    requestId: headsetRequest.id,
    title: 'Fulfil request: Headset replacement',
    description: 'Order a replacement headset for Alex and hand it over at the front desk.',
    priority: 'MEDIUM',
    status: 'TODO',
    dueDate: dateOnly(2),
  });
  const licenseTask = await addTask({
    creator: priya,
    assignee: sam,
    createdDaysAgo: 8,
    requestId: licenseRequest.id,
    title: 'Fulfil request: Diagram software license renewal',
    description: 'Renew the team license for one year and update the license spreadsheet.',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    dueDate: dateOnly(4),
    statusHistory: [{ daysAgo: 4, text: 'To Do → In Progress' }],
  });

  // Regular tasks
  const onboardingTask = await addTask({
    creator: daniel,
    assignee: maya,
    createdDaysAgo: 6,
    title: 'Update onboarding guide',
    description: 'Add the new building access steps and the updated IT setup checklist to the onboarding guide.',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    dueDate: dateOnly(3),
    statusHistory: [{ daysAgo: 3, text: 'To Do → In Progress' }],
  });
  await addTask({
    creator: daniel,
    assignee: maya,
    createdDaysAgo: 2,
    title: 'Prepare monthly inventory report',
    description: 'Count stock in the supply room and update the inventory sheet before the monthly operations meeting.',
    priority: 'HIGH',
    status: 'TODO',
    dueDate: dateOnly(5),
  });
  await addTask({
    creator: daniel,
    assignee: alex,
    createdDaysAgo: 3,
    title: 'Confirm catering for client workshop',
    description: 'Confirm headcount and dietary requirements with the catering vendor.',
    priority: 'LOW',
    status: 'TODO',
    dueDate: dateOnly(9),
  });
  await addTask({
    creator: daniel,
    assignee: elena,
    createdDaysAgo: 7,
    title: 'Clean up client contact list in CRM',
    description: 'Remove duplicate contacts and update phone numbers for the top 50 accounts.',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    dueDate: dateOnly(1),
    statusHistory: [{ daysAgo: 5, text: 'To Do → In Progress' }],
  });
  await addTask({
    creator: priya,
    assignee: jordan,
    createdDaysAgo: 2,
    title: 'Set up laptops for new hires',
    description: 'Prepare two laptops with the standard image, email accounts, and VPN client for next Monday.',
    priority: 'HIGH',
    status: 'TODO',
    dueDate: dateOnly(2),
  });
  await addTask({
    creator: priya,
    assignee: sam,
    createdDaysAgo: 10,
    title: 'Review weekly backup logs',
    description: 'Check that all nightly backups completed and report any failures.',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    dueDate: dateOnly(-3),
    statusHistory: [
      { daysAgo: 6, text: 'To Do → In Progress' },
      { daysAgo: 4, text: 'In Progress → Completed' },
    ],
  });
  await addTask({
    creator: priya,
    assignee: jordan,
    createdDaysAgo: 9,
    title: 'Change guest Wi-Fi password',
    description: 'Rotate the guest Wi-Fi password and update the signs in reception and meeting rooms.',
    priority: 'LOW',
    status: 'COMPLETED',
    dueDate: dateOnly(-5),
    statusHistory: [{ daysAgo: 7, text: 'To Do → Completed' }],
  });

  await prisma.comment.createMany({
    data: [
      {
        userId: maya.id,
        taskId: onboardingTask.id,
        content: 'Building access section is done. Waiting on the final IT checklist from Priya.',
        createdAt: daysAgo(2, 13),
      },
      {
        userId: daniel.id,
        taskId: onboardingTask.id,
        content: 'Thanks. Please share a draft before Friday.',
        createdAt: daysAgo(2, 15),
      },
      {
        userId: sam.id,
        taskId: licenseTask.id,
        content: 'Quote received from the vendor. Waiting for the invoice.',
        createdAt: daysAgo(4, 16),
      },
      {
        userId: maya.id,
        requestId: laptopRequest.id,
        content: 'Jordan from IT can confirm the diagnosis if needed.',
        createdAt: daysAgo(1, 10),
      },
    ],
  });
  await log(maya.id, 'commented on task', 'task', onboardingTask.id, onboardingTask.title, daysAgo(2, 13));
  await log(sam.id, 'commented on task', 'task', licenseTask.id, licenseTask.title, daysAgo(4, 16));
}

// Run directly with `npm run db:seed` (Prisma calls this file).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prisma = new PrismaClient();
  seedDatabase(prisma)
    .then(() => console.log('Seed data created. Demo password for all users:', DEMO_PASSWORD))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
