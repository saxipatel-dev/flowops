import { useState } from 'react';
import api, { getErrorMessage } from '../services/api.js';
import { formatDateTime } from '../services/format.js';
import Button from './Button.jsx';
import { ErrorMessage } from './Feedback.jsx';

// `target` is either { taskId } or { requestId }.
export default function CommentSection({ comments, target, onAdded }) {
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
    <section className="card">
      <h2 className="border-b border-slate-200 px-4 py-3 font-semibold text-navy">Comments ({comments.length})</h2>
      {comments.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">No comments yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {comments.map((comment) => (
            <li key={comment.id} className="px-4 py-3">
              <p className="text-sm">
                <span className="font-medium text-slate-900">{comment.user.name}</span>
                <span className="ml-2 text-xs text-slate-500">{formatDateTime(comment.createdAt)}</span>
              </p>
              <p className="mt-1 text-sm whitespace-pre-line text-slate-700">{comment.content}</p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="space-y-3 border-t border-slate-200 p-4">
        <label htmlFor="comment" className="sr-only">
          Add a comment
        </label>
        <textarea
          id="comment"
          rows={3}
          className="input"
          placeholder="Add a comment..."
          value={content}
          maxLength={1000}
          onChange={(event) => setContent(event.target.value)}
        />
        <ErrorMessage message={error} />
        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Post comment
          </Button>
        </div>
      </form>
    </section>
  );
}
