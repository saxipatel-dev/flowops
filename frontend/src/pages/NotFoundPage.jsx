import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/Feedback.jsx';
import { buttonClasses } from '../components/Button.jsx';

export default function NotFoundPage() {
  return (
    <div className="card">
      <EmptyState
        icon={Compass}
        titleAs="h1"
        title="Page not found"
        message="The page you are looking for doesn't exist or may have been moved."
        action={
          <Link to="/dashboard" className={buttonClasses('secondary', 'sm')}>
            Go to dashboard
          </Link>
        }
      />
    </div>
  );
}
