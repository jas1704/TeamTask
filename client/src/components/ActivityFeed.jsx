import Avatar from './Avatar';

const ICONS = {
  'task-created': '＋',
  'task-updated': '✎',
  'task-status-changed': '→',
  'task-deleted': '🗑',
  'comment-added': '💬',
  'member-invited': '★',
  'member-removed': '−',
  'project-updated': '⚙',
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ActivityFeed({ activities, loading }) {
  if (loading) {
    return <p className="px-1 py-6 text-center text-xs text-ink/30">Loading activity…</p>;
  }
  if (activities.length === 0) {
    return <p className="px-1 py-6 text-center text-xs text-ink/30">No activity yet — do something!</p>;
  }

  return (
    <div className="space-y-4">
      {activities.map((a) => (
        <div key={a._id} className="flex gap-2.5 animate-[fadeIn_.2s_ease-out]">
          <Avatar user={a.actor} size="sm" />
          <div className="flex-1">
            <p className="text-sm leading-snug text-ink/75">
              <span className="mr-1 inline-block text-xs text-ink/35">{ICONS[a.type] || '•'}</span>
              {a.message}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-ink/35">{timeAgo(a.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
