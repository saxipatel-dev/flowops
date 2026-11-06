import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Refuses to seed anything except a test database, then migrates and seeds it.
export default function globalSetup() {
  const envFile = readFileSync(new URL('../../backend/.env.test', import.meta.url), 'utf8');
  const databaseUrl = envFile.match(/^DATABASE_URL="?([^"\n]+)"?/m)?.[1];
  const databaseName = databaseUrl && new URL(databaseUrl).pathname.slice(1);
  if (!databaseName || !databaseName.endsWith('_test')) {
    throw new Error(`End-to-end tests only run against a *_test database (backend/.env.test points to "${databaseName}").`);
  }

  execSync('npm --prefix ../backend run db:test:setup', { stdio: 'inherit' });
  execSync('npm --prefix ../backend run db:test:seed', { stdio: 'inherit' });
}
