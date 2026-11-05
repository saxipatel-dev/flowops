import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Endpoint not found.' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const fields = {};
    for (const issue of err.issues) {
      const field = issue.path.join('.') || 'form';
      if (!fields[field]) fields[field] = issue.message;
    }
    return res.status(400).json({ error: 'Please check the highlighted fields.', fields });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with this value already exists.' });
  }

  // Covers our HttpError plus body-parser errors such as invalid JSON or oversized bodies.
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: err.expose === false ? 'Invalid request.' : err.message });
  }

  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}
