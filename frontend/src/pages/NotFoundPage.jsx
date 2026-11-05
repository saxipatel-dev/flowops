import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div className="card px-6 py-12 text-center">
      <h1 className="text-lg font-semibold text-navy">Page not found</h1>
      <p className="mt-1 text-sm text-slate-500">The page you are looking for does not exist.</p>
      <Link to="/dashboard" className="link mt-4 inline-block text-sm">
        Back to dashboard
      </Link>
    </div>
  );
}
