import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import api, { getErrorMessage } from '../services/api.js';
import { formatDateTime, formatTimeAgo } from '../services/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import Button from './Button.jsx';
import Card, { CardHeader } from './Card.jsx';
import Avatar from './Avatar.jsx';
import { ErrorMessage } from './Feedback.jsx';

const MAX_LENGTH = 1000;

// `target` is either { taskId } or { requestId }.
export default function CommentSection({ comments, target, onAdded }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!content.trim()) {
      setError('Write a comment before posting.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/comments', { ...target, content });
      setContent('');
      onAdded();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title={`Comments (${comments.length})`} icon={MessageSquare} />
      {comments.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted">No comments yet. Start the conversation below.</p>
      ) : (
        <ul className="space-y-4 px-4 py-4">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <Avatar name={comment.user.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium text-ink">{comment.user.name}</span>
                  <time dateTime={comment.createdAt} title={formatDateTime(comment.createdAt)} className="ml-2 text-xs text-muted">
                    {formatTimeAgo(comment.createdAt)}
                  </time>
                </p>
                <p className="mt-1 rounded-lg rounded-tl-sm bg-sunken px-3 py-2 text-sm leading-relaxed whitespace-pre-line text-ink-2">
                  {comment.content}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex gap-3 border-t border-line p-4">
        <Avatar name={user.name} size="sm" />
        <div className="min-w-0 flex-1 space-y-2">
          <label htmlFor="comment" className="sr-only">
            Add a comment
          </label>
          <textarea
            id="comment"
            rows={2}
            className="input"
            placeholder="Add a comment..."
            value={content}
            maxLength={MAX_LENGTH}
            onChange={(event) => {
              setContent(event.target.value);
              if (error) setError('');
            }}
          />
          <ErrorMessage message={error} />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted tabular-nums">
              {content.length > 0 && `${content.length}/${MAX_LENGTH}`}
            </span>
            <Button type="submit" size="sm" loading={saving}>
              Post comment
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
