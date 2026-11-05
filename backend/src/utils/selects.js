// Shared Prisma "select" shapes so password hashes are never returned.
export const userSummary = { id: true, name: true, email: true };

export const userDetails = {
  id: true,
  name: true,
  email: true,
  role: true,
  jobTitle: true,
  isActive: true,
  createdAt: true,
  departmentId: true,
  department: { select: { id: true, name: true } },
};
