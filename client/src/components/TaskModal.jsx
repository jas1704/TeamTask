import { useEffect, useState } from 'react';
import Modal from './Modal';
import Avatar from './Avatar';
import CommentSection from './CommentSection';
import { can, canChangeStatus } from '../utils/permissions';
import {
  fetchTask,
  createSubtask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
  addLink,
  deleteLink,
  uploadAttachments,
  deleteAttachment,
  createQuery,
  replyToQuery,
  resolveQuery,
  requestReassignment,
  resolveReassignment,
  directReassign,
} from '../services/tasks';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To do' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];
const PRIORITY_OPTIONS = ['low', 'medium', 'high'];
const VISIBILITY_OPTIONS = [
  { value: 'project', label: 'Everyone in the project' },
  { value: 'assignees-only', label: 'Assignees only' },
  { value: 'selected', label: 'Selected people' },
  { value: 'owner-only', label: 'Owner / co-owner only' },
];

const emptyForm = { title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', assignees: [] };

function formatDateTime(d) {
  return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TaskModal({ open, onClose, task, projectId, members, role, currentUserId, onSave, onDelete, onTaskChanged }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [full, setFull] = useState(null); // fully-populated task (links/attachments/queries/reassignment/subtasks)
  const [subtasks, setSubtasks] = useState([]);
  const [tab, setTab] = useState('details');

  const isAssignee = (task?.assignees || []).some((a) => a._id === currentUserId);
  const isCreator = task && (task.createdBy?._id === currentUserId);
  const memberOptions = members.map((m) => m.user);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
        assignees: (task.assignees || []).map((a) => a._id),
        visibility: task.visibility || { type: 'project', users: [] },
      });
      fetchTask(task._id)
        .then(({ task: t, subtasks: st }) => {
          setFull(t);
          setSubtasks(st || []);
        })
        .catch(() => {});
    } else {
      setForm(emptyForm);
      setFull(null);
      setSubtasks([]);
    }
    setError('');
    setTab('details');
  }, [task, open]);

  const syncFull = (updated) => {
    setFull(updated);
    onTaskChanged?.(updated);
  };

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const toggleAssignee = (userId) => {
    setForm((f) => ({
      ...f,
      assignees: f.assignees.includes(userId) ? f.assignees.filter((id) => id !== userId) : [...f.assignees, userId],
    }));
  };

  const canEditAssignees = !task || can(role, 'assignTask') || (form.assignees.length <= 1 && form.assignees[0] === currentUserId);
  const canEditStatus = !task || canChangeStatus(role, isAssignee) || can(role, 'assignTask');
  const canDelete = task && can(role, 'deleteTask');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Give the task a title.');
    setSaving(true);
    setError('');
    try {
      await onSave({ ...form, dueDate: form.dueDate || null });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the task.');
    } finally {
      setSaving(false);
    }
  };

  // --- Subtasks (#5) ---
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskAssignee, setSubtaskAssignee] = useState('');
  const addSubtask = async () => {
    if (!subtaskTitle.trim() || !task) return;
    const created = await createSubtask(projectId, task._id, {
      title: subtaskTitle.trim(),
      assignees: subtaskAssignee ? [subtaskAssignee] : [],
    });
    setSubtasks((s) => [...s, created]);
    setSubtaskTitle('');
    setSubtaskAssignee('');
  };
  const updateSubtaskStatus = async (subtaskId, status) => {
    const updated = await apiUpdateTask(subtaskId, { status });
    setSubtasks((s) => s.map((st) => (st._id === subtaskId ? updated : st)));
  };
  const removeSubtask = async (subtaskId) => {
    await apiDeleteTask(subtaskId);
    setSubtasks((s) => s.filter((st) => st._id !== subtaskId));
  };

  // --- Links (#2) ---
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const submitLink = async (e) => {
    e.preventDefault();
    if (!linkTitle.trim() || !linkUrl.trim() || !task) return;
    const updated = await addLink(task._id, { title: linkTitle.trim(), url: linkUrl.trim() });
    syncFull(updated);
    setLinkTitle('');
    setLinkUrl('');
  };
  const removeLink = async (linkId) => {
    const updated = await deleteLink(task._id, linkId);
    syncFull(updated);
  };

  // --- Attachments (#3) ---
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length || !task) return;
    const updated = await uploadAttachments(task._id, files);
    syncFull(updated);
    e.target.value = '';
  };
  const removeAttachment = async (attachmentId) => {
    const updated = await deleteAttachment(task._id, attachmentId);
    syncFull(updated);
  };

  // --- Queries (#11) ---
  const [queryText, setQueryText] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});
  const submitQuery = async (e) => {
    e.preventDefault();
    if (!queryText.trim() || !task) return;
    const updated = await createQuery(task._id, queryText.trim());
    syncFull(updated);
    setQueryText('');
  };
  const submitReply = async (queryId) => {
    const text = replyDrafts[queryId];
    if (!text?.trim()) return;
    const updated = await replyToQuery(task._id, queryId, text.trim());
    syncFull(updated);
    setReplyDrafts((d) => ({ ...d, [queryId]: '' }));
  };
  const markResolved = async (queryId) => {
    const updated = await resolveQuery(task._id, queryId);
    syncFull(updated);
  };

  // --- Reassignment (#8, #9) ---
  const [reassignReason, setReassignReason] = useState('');
  const [reassignSuggested, setReassignSuggested] = useState('');
  const [directFrom, setDirectFrom] = useState('');
  const [directTo, setDirectTo] = useState('');
  const submitReassignRequest = async (e) => {
    e.preventDefault();
    const updated = await requestReassignment(task._id, { suggestedUserId: reassignSuggested || undefined, reason: reassignReason });
    syncFull(updated);
    setReassignReason('');
    setReassignSuggested('');
  };
  const approveReassignment = async () => {
    const target = full?.reassignment?.suggestedUser?._id;
    const updated = await resolveReassignment(task._id, { action: 'approve', newAssigneeId: target });
    syncFull(updated);
  };
  const rejectReassignment = async () => {
    const updated = await resolveReassignment(task._id, { action: 'reject' });
    syncFull(updated);
  };
  const submitDirectReassign = async (e) => {
    e.preventDefault();
    if (!directTo) return;
    const updated = await directReassign(task._id, { fromUserId: directFrom || undefined, toUserId: directTo });
    syncFull(updated);
    setDirectFrom('');
    setDirectTo('');
  };

  const displayTask = full || task;
  const tabs = task
    ? [
        { key: 'details', label: 'Details' },
        { key: 'subtasks', label: `Subtasks${subtasks.length ? ` (${subtasks.length})` : ''}` },
        { key: 'links', label: `Links${displayTask?.links?.length ? ` (${displayTask.links.length})` : ''}` },
        { key: 'files', label: `Files${displayTask?.attachments?.length ? ` (${displayTask.attachments.length})` : ''}` },
        { key: 'queries', label: `Queries${displayTask?.queries?.filter((q) => q.status === 'open').length ? ` (${displayTask.queries.filter((q) => q.status === 'open').length})` : ''}` },
        { key: 'reassign', label: 'Reassign' },
        { key: 'comments', label: 'Comments' },
      ]
    : [{ key: 'details', label: 'Details' }];

  return (
    <Modal open={open} onClose={onClose} title={task ? 'Task details' : 'New task'} wide>
      {task && (
        <div className="mb-4 flex flex-wrap gap-1 border-b border-line">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-t-lg px-3 py-2 text-xs font-semibold transition ${
                tab === t.key ? 'bg-teal-50 text-teal-700' : 'text-ink/40 hover:text-ink/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'details' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded-lg bg-coral-500/10 px-3 py-2 text-sm text-coral-500">{error}</p>}

          <div>
            <label className="label">Title</label>
            <input value={form.title} onChange={handleChange('title')} className="input-field" placeholder="e.g. Fix navbar overlap on mobile" />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea value={form.description} onChange={handleChange('description')} rows={3} className="input-field resize-none" placeholder="Add any useful context…" />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={handleChange('status')} className="input-field" disabled={!canEditStatus}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              {!canEditStatus && <p className="mt-1 text-[11px] text-ink/35">Only assignees or leads can change status.</p>}
            </div>
            <div>
              <label className="label">Priority</label>
              <select value={form.priority} onChange={handleChange('priority')} className="input-field">
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Due date</label>
              <input type="date" value={form.dueDate} onChange={handleChange('dueDate')} className="input-field" />
            </div>
          </div>

          <div>
            <label className="label">Assignees</label>
            <div className={`flex flex-wrap gap-2 rounded-lg border border-line p-2 ${!canEditAssignees ? 'opacity-50' : ''}`}>
              {memberOptions.map((u) => {
                const selected = form.assignees.includes(u._id);
                return (
                  <button
                    type="button"
                    key={u._id}
                    disabled={!canEditAssignees}
                    onClick={() => canEditAssignees && toggleAssignee(u._id)}
                    className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs font-medium transition ${
                      selected ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-300' : 'bg-slate-100 text-ink/60 hover:bg-slate-200'
                    }`}
                  >
                    <Avatar user={u} size="sm" /> {u.name}
                  </button>
                );
              })}
            </div>
            {!canEditAssignees && <p className="mt-1 text-[11px] text-ink/35">Your role can only assign tasks to yourself.</p>}
          </div>

          <div>
            <label className="label">Visibility</label>
            <select
              value={form.visibility?.type || 'project'}
              onChange={(e) => setForm((f) => ({ ...f, visibility: { type: e.target.value, users: f.visibility?.users || [] } }))}
              className="input-field"
            >
              {VISIBILITY_OPTIONS.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
            {form.visibility?.type === 'selected' && (
              <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-line p-2">
                {memberOptions.map((u) => {
                  const selected = (form.visibility.users || []).some((id) => (id._id || id) === u._id);
                  return (
                    <button
                      type="button"
                      key={u._id}
                      onClick={() =>
                        setForm((f) => {
                          const ids = (f.visibility.users || []).map((id) => id._id || id);
                          const next = ids.includes(u._id) ? ids.filter((id) => id !== u._id) : [...ids, u._id];
                          return { ...f, visibility: { ...f.visibility, users: next } };
                        })
                      }
                      className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs font-medium transition ${
                        selected ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300' : 'bg-slate-100 text-ink/60 hover:bg-slate-200'
                      }`}
                    >
                      <Avatar user={u} size="sm" /> {u.name}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-1 text-[11px] text-ink/35">Enforced on the backend — restricted viewers won't see this task at all.</p>
          </div>

          <div className="flex items-center justify-between border-t border-line pt-4">
            <div>
              {canDelete && (
                <button type="button" onClick={() => onDelete(task._id)} className="text-sm font-medium text-coral-500 hover:text-coral-500/80">
                  Delete task
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : task ? 'Save changes' : 'Create task'}
              </button>
            </div>
          </div>
        </form>
      )}

      {tab === 'subtasks' && task && (
        <div className="space-y-4">
          <div className="space-y-2">
            {subtasks.length === 0 && <p className="text-sm text-ink/40">No subtasks yet. A subtask can be assigned to anyone — it doesn't need to match the parent task's assignee.</p>}
            {subtasks.map((st) => (
              <div key={st._id} className="flex items-center justify-between gap-2 rounded-lg border border-line p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{st.title}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {(st.assignees || []).map((a) => <Avatar key={a._id} user={a} size="sm" />)}
                    {(st.assignees || []).length === 0 && <span className="text-[11px] text-ink/30">Unassigned</span>}
                  </div>
                </div>
                <select value={st.status} onChange={(e) => updateSubtaskStatus(st._id, e.target.value)} className="input-field !w-auto !py-1.5 text-xs">
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <button onClick={() => removeSubtask(st._id)} className="text-xs font-medium text-coral-500 hover:text-coral-500/80">Remove</button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2 border-t border-line pt-4">
            <div className="flex-1">
              <label className="label">New subtask</label>
              <input value={subtaskTitle} onChange={(e) => setSubtaskTitle(e.target.value)} className="input-field" placeholder="e.g. Check LogsQL query" />
            </div>
            <div>
              <label className="label">Assignee</label>
              <select value={subtaskAssignee} onChange={(e) => setSubtaskAssignee(e.target.value)} className="input-field">
                <option value="">Unassigned</option>
                {memberOptions.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </div>
            <button onClick={addSubtask} className="btn-primary">+ Add</button>
          </div>
        </div>
      )}

      {tab === 'links' && task && (
        <div className="space-y-4">
          <div className="space-y-2">
            {(!displayTask?.links || displayTask.links.length === 0) && <p className="text-sm text-ink/40">No links yet. Attach a GitHub PR, dashboard, ticket, or doc.</p>}
            {displayTask?.links?.map((l) => (
              <div key={l._id} className="flex items-center justify-between gap-2 rounded-lg border border-line p-3">
                <div className="min-w-0">
                  <a href={l.url} target="_blank" rel="noreferrer" className="truncate text-sm font-medium text-teal-600 hover:underline">{l.title}</a>
                  <p className="truncate text-xs text-ink/35">{l.url}</p>
                </div>
                <button onClick={() => removeLink(l._id)} className="text-xs font-medium text-coral-500 hover:text-coral-500/80">Remove</button>
              </div>
            ))}
          </div>
          <form onSubmit={submitLink} className="flex flex-wrap items-end gap-2 border-t border-line pt-4">
            <div className="flex-1">
              <label className="label">Title</label>
              <input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} className="input-field" placeholder="GitHub PR" />
            </div>
            <div className="flex-1">
              <label className="label">URL</label>
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="input-field" placeholder="https://github.com/…" />
            </div>
            <button type="submit" className="btn-primary">+ Add link</button>
          </form>
        </div>
      )}

      {tab === 'files' && task && (
        <div className="space-y-4">
          <div className="space-y-2">
            {(!displayTask?.attachments || displayTask.attachments.length === 0) && <p className="text-sm text-ink/40">No files attached yet.</p>}
            {displayTask?.attachments?.map((a) => (
              <div key={a._id} className="flex items-center justify-between gap-2 rounded-lg border border-line p-3">
                <div className="min-w-0">
                  <a href={(import.meta.env.VITE_API_URL || '').replace(/\/api$/, '') + a.url} target="_blank" rel="noreferrer" className="truncate text-sm font-medium text-teal-600 hover:underline">
                    {a.originalName}
                  </a>
                  <p className="text-xs text-ink/35">{a.uploadedBy?.name} · {(a.size / 1024).toFixed(0)} KB</p>
                </div>
                <button onClick={() => removeAttachment(a._id)} className="text-xs font-medium text-coral-500 hover:text-coral-500/80">Remove</button>
              </div>
            ))}
          </div>
          <div className="border-t border-line pt-4">
            <label className="label">Upload files</label>
            <input type="file" multiple onChange={handleFileUpload} className="input-field" />
          </div>
        </div>
      )}

      {tab === 'queries' && task && (
        <div className="space-y-4">
          {(!displayTask?.queries || displayTask.queries.length === 0) && <p className="text-sm text-ink/40">No queries raised. Use this to flag a blocking question.</p>}
          {displayTask?.queries?.map((q) => (
            <div key={q._id} className="rounded-lg border border-line p-3">
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-ink">{q.question}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${q.status === 'open' ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'}`}>
                  {q.status}
                </span>
              </div>
              <p className="mb-2 text-[11px] text-ink/35">Raised by {q.raisedBy?.name}</p>
              <div className="space-y-1.5 pl-3">
                {q.replies?.map((r, i) => (
                  <p key={i} className="text-xs text-ink/60"><span className="font-semibold text-ink/80">{r.author?.name}:</span> {r.text}</p>
                ))}
              </div>
              {q.status === 'open' && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={replyDrafts[q._id] || ''}
                    onChange={(e) => setReplyDrafts((d) => ({ ...d, [q._id]: e.target.value }))}
                    className="input-field !py-1.5 text-xs"
                    placeholder="Reply…"
                  />
                  <button onClick={() => submitReply(q._id)} className="btn-secondary !py-1.5 text-xs">Reply</button>
                  <button onClick={() => markResolved(q._id)} className="btn-primary !py-1.5 text-xs">Resolve</button>
                </div>
              )}
            </div>
          ))}
          <form onSubmit={submitQuery} className="flex items-end gap-2 border-t border-line pt-4">
            <div className="flex-1">
              <label className="label">Raise a query</label>
              <input value={queryText} onChange={(e) => setQueryText(e.target.value)} className="input-field" placeholder="What needs clarifying?" />
            </div>
            <button type="submit" className="btn-primary">Raise</button>
          </form>
        </div>
      )}

      {tab === 'reassign' && task && (
        <div className="space-y-6">
          {full?.reassignment?.status === 'pending' && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
              <p className="text-sm font-medium text-ink">
                {full.reassignment.requestedBy?.name} requested reassignment away from {full.reassignment.fromUser?.name}
                {full.reassignment.suggestedUser ? ` → suggested ${full.reassignment.suggestedUser.name}` : ''}.
              </p>
              {full.reassignment.reason && <p className="mt-1 text-xs text-ink/50">"{full.reassignment.reason}"</p>}
              {can(role, 'approveReassignment') && (
                <div className="mt-3 flex gap-2">
                  <button onClick={approveReassignment} className="btn-primary !py-1.5 text-xs" disabled={!full.reassignment.suggestedUser}>Approve</button>
                  <button onClick={rejectReassignment} className="btn-secondary !py-1.5 text-xs">Reject</button>
                </div>
              )}
            </div>
          )}

          {isAssignee && (!full?.reassignment || full.reassignment.status !== 'pending') && (
            <form onSubmit={submitReassignRequest} className="space-y-3">
              <h4 className="text-sm font-semibold text-ink">Request reassignment</h4>
              <div>
                <label className="label">Suggested person (optional)</label>
                <select value={reassignSuggested} onChange={(e) => setReassignSuggested(e.target.value)} className="input-field">
                  <option value="">No suggestion — let the lead decide</option>
                  {memberOptions.filter((u) => u._id !== currentUserId).map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Reason</label>
                <textarea value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} rows={2} className="input-field resize-none" placeholder="e.g. moved to a higher-priority task" />
              </div>
              <button type="submit" className="btn-primary">Request reassignment</button>
            </form>
          )}

          {can(role, 'directReassign') && (
            <form onSubmit={submitDirectReassign} className="space-y-3 border-t border-line pt-4">
              <h4 className="text-sm font-semibold text-ink">Direct reassign</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">From</label>
                  <select value={directFrom} onChange={(e) => setDirectFrom(e.target.value)} className="input-field">
                    <option value="">Add without removing anyone</option>
                    {(task.assignees || []).map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">To</label>
                  <select value={directTo} onChange={(e) => setDirectTo(e.target.value)} className="input-field">
                    <option value="">Select…</option>
                    {memberOptions.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary">Reassign now</button>
            </form>
          )}

          {full?.reassignment?.status && full.reassignment.status !== 'none' && full.reassignment.status !== 'pending' && (
            <p className="text-xs text-ink/35">
              Last request was {full.reassignment.status}{full.reassignment.resolvedAt ? ` on ${formatDateTime(full.reassignment.resolvedAt)}` : ''}.
            </p>
          )}
        </div>
      )}

      {tab === 'comments' && task && (
        <div>
          <CommentSection taskId={task._id} />
        </div>
      )}
    </Modal>
  );
}
