import { execSync } from 'node:child_process';

export default function globalSetup() {
  execSync('npm --prefix ../backend run db:seed', { stdio: 'inherit' });
}
