import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { fetchComments, createComment, deleteComment } from '../services/comments';
import Avatar from './Avatar';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Adds/replaces a comment by _id — this is what makes it safe to apply both
// the local optimistic result AND the broadcast socket event without ending
// up with a duplicate row, regardless of which one arrives first.
const upsertById = (list, item) => {
  if (list.some((x) => x._id === item._id)) return list.map((x) => (x._id === item._id ? item : x));
  return [...list, item];
};

export default function CommentSection({ taskId }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchComments(taskId);
      setComments(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  // Live updates: the project room broadcasts every comment created on any
  // task in the project, so filter down to this task's id before applying.
  useEffect(() => {
    if (!socket) return;
    const onCreated = ({ taskId: tId, comment }) => {
      if (tId !== taskId) return;
      setComments((c) => upsertById(c, comment));
    };
    const onDeleted = ({ taskId: tId, commentId }) => {
      if (tId !== taskId) return;
      setComments((c) => c.filter((cm) => cm._id !== commentId));
    };
    socket.on('comment:created', onCreated);
    socket.on('comment:deleted', onDeleted);
    return () => {
      socket.off('comment:created', onCreated);
      socket.off('comment:deleted', onDeleted);
    };
  }, [socket, taskId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const comment = await createComment(taskId, text.trim());
      setComments((c) => upsertById(c, comment));
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteComment(id);
    setComments((c) => c.filter((cm) => cm._id !== id));
  };

  return (
    <div>
      <h4 className="label mb-3">Comments</h4>
      {loading ? (
        <p className="text-sm text-ink/40">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="mb-4 text-sm text-ink/40">No comments yet. Start the discussion below.</p>
      ) : (
        <div className="mb-4 max-h-56 space-y-3 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c._id} className="flex gap-2.5 animate-[fadeIn_.2s_ease-out]">
              <Avatar user={c.author} size="sm" />
              <div className="flex-1 rounded-lg bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink/80">{c.author.name}</span>
                  <span className="font-mono text-[10px] text-ink/35">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-sm text-ink/70">{c.text}</p>
                {c.author._id === user._id && (
                  <button
                    onClick={() => handleDelete(c._id)}
                    className="mt-1 text-[11px] font-medium text-ink/30 hover:text-coral-500"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment…"
          className="input-field"
        />
        <button type="submit" disabled={submitting || !text.trim()} className="btn-primary !px-4">
          Send
        </button>
      </form>
    </div>
  );
}
