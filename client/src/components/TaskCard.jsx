import Avatar from './Avatar';

const PRIORITY_STYLES = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-50 text-amber-600',
  high: 'bg-coral-500/10 text-coral-500',
};

function formatDue(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const today = new Date();
  const diffDays = Math.round((date.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86400000);
  if (diffDays === 0) return { label: 'Today', overdue: false };
  if (diffDays === 1) return { label: 'Tomorrow', overdue: false };
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, overdue: true };
  return { label: new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), overdue: false };
}

export default function TaskCard({ task, onClick, draggable, onDragStart, currentUserId }) {
  const due = formatDue(task.dueDate);
  const assignees = task.assignees || (task.assignedTo ? [task.assignedTo] : []);
  const isMine = currentUserId && assignees.some((a) => a._id === currentUserId);
  const openQueries = (task.queries || []).filter((q) => q.status === 'open').length;
  const isPrivate = task.visibility && task.visibility.type !== 'project';

  return (
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      className={`card cursor-pointer p-4 transition hover:-translate-y-0.5 hover:shadow-panel active:cursor-grabbing ${
        isMine ? 'ring-2 ring-teal-400/70' : ''
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {isMine && (
            <span
              className="rounded-full bg-teal-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-teal-600"
              title="Assigned to you"
            >
              Mine
            </span>
          )}
          <h4 className="text-sm font-semibold leading-snug text-ink">{task.title}</h4>
        </div>
        <div className="flex -space-x-1.5">
          {assignees.slice(0, 3).map((a) => (
            <Avatar key={a._id} user={a} size="sm" />
          ))}
          {assignees.length > 3 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-ink/60">
              +{assignees.length - 3}
            </span>
          )}
        </div>
      </div>
      {task.description && <p className="mb-3 line-clamp-2 text-xs text-ink/50">{task.description}</p>}

      {task.subtaskSummary && task.subtaskSummary.total > 0 && (
        <p className="mb-2 text-[11px] font-medium text-ink/40">
          {task.subtaskSummary.completed} / {task.subtaskSummary.total} subtasks completed
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PRIORITY_STYLES[task.priority]}`}>
          {task.priority}
        </span>
        {due && (
          <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ${due.overdue ? 'bg-coral-500/10 text-coral-500' : 'bg-slate-100 text-ink/50'}`}>
            {due.label}
          </span>
        )}
        {openQueries > 0 && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600" title="Open query">
            ? {openQueries}
          </span>
        )}
        {task.links?.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-ink/50" title="Links">🔗 {task.links.length}</span>
        )}
        {task.attachments?.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-ink/50" title="Attachments">📎 {task.attachments.length}</span>
        )}
        {isPrivate && (
          <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] text-ink/40" title="Restricted visibility">🔒</span>
        )}
        {task.reassignment?.status === 'pending' && (
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600" title="Reassignment requested">
            ↺ pending
          </span>
        )}
      </div>
    </div>
  );
}
