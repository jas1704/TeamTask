import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import InviteModal from '../components/InviteModal';
import ConfirmDialog from '../components/ConfirmDialog';
import ProgressBar from '../components/ProgressBar';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import ActivityFeed from '../components/ActivityFeed';
import Modal from '../components/Modal';
import {
  fetchProject,
  fetchProjectStats,
  fetchProjectAnalytics,
  inviteMember,
  removeMember,
  changeMemberRole,
  deleteProject,
  searchProject,
} from '../services/projects';
import { fetchTasks, createTask, updateTask, deleteTask } from '../services/tasks';
import { fetchActivity } from '../services/activity';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { can, ROLE_LABELS } from '../utils/permissions';

const COLUMNS = [
  { key: 'todo', label: 'To do', accent: 'border-t-slate-300' },
  { key: 'in-progress', label: 'In progress', accent: 'border-t-amber-400' },
  { key: 'completed', label: 'Completed', accent: 'border-t-teal-500' },
];

const upsertById = (list, item) => {
  if (list.some((x) => x._id === item._id)) return list.map((x) => (x._id === item._id ? item : x));
  return [item, ...list];
};

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [role, setRole] = useState('member');
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [mobileActivityOpen, setMobileActivityOpen] = useState(false);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(null);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [taskFilter, setTaskFilter] = useState('all'); // 'all' | 'mine'
  const [myTasksCount, setMyTasksCount] = useState(0);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const isOwner = role === 'owner';
  const canManageMembers = can(role, 'manageMembers');
  const canChangeRoles = can(role, 'changeRoles');
  const canSeeAnalytics = can(role, 'projectAnalytics');
  const onlineSet = useMemo(() => new Set(onlineUserIds), [onlineUserIds]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setActivityLoading(true);
    try {
      const [projectData, taskData, statsData, activityList] = await Promise.all([
        fetchProject(id),
        fetchTasks(id),
        fetchProjectStats(id),
        fetchActivity(id),
      ]);
      setProject(projectData.project);
      setRole(projectData.role);
      setTasks(taskData.tasks);
      setMyTasksCount(taskData.myTasksCount || 0);
      setStats(statsData);
      setActivities(activityList);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) navigate('/dashboard');
    } finally {
      setLoading(false);
      setActivityLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // --- Real-time: join this project's room for the lifetime of the page ---
  // Everything below (board updates, presence, activity feed) flows from
  // being a member of `project:<id>` on the server. Leaving on unmount keeps
  // the presence list and server-side room membership accurate.
  useEffect(() => {
    if (!socket) return;
    socket.emit('project:join', id);
    return () => socket.emit('project:leave', id);
  }, [socket, id]);

  useEffect(() => {
    if (!socket) return;

    const onTaskCreated = ({ task }) => setTasks((ts) => upsertById(ts, task));
    const onTaskUpdated = ({ task }) => setTasks((ts) => upsertById(ts, task));
    const onTaskDeleted = ({ taskId }) => setTasks((ts) => ts.filter((t) => t._id !== taskId));
    const onPresence = ({ onlineUserIds: ids }) => setOnlineUserIds(ids);
    const onActivity = ({ activity }) => setActivities((a) => [activity, ...a].slice(0, 50));
    const onMemberAdded = ({ project: p }) => setProject(p);
    const onMemberRemoved = ({ userId }) =>
      setProject((p) => (p ? { ...p, members: p.members.filter((m) => m.user._id !== userId) } : p));
    const onMemberRoleChanged = ({ project: p }) => setProject(p);
    const onProjectUpdated = ({ project: p }) => setProject((prev) => ({ ...prev, ...p }));

    socket.on('task:created', onTaskCreated);
    socket.on('task:updated', onTaskUpdated);
    socket.on('task:deleted', onTaskDeleted);
    socket.on('presence:update', onPresence);
    socket.on('activity:new', onActivity);
    socket.on('member:added', onMemberAdded);
    socket.on('member:removed', onMemberRemoved);
    socket.on('member:role-changed', onMemberRoleChanged);
    socket.on('project:updated', onProjectUpdated);

    return () => {
      socket.off('task:created', onTaskCreated);
      socket.off('task:updated', onTaskUpdated);
      socket.off('task:deleted', onTaskDeleted);
      socket.off('presence:update', onPresence);
      socket.off('activity:new', onActivity);
      socket.off('member:added', onMemberAdded);
      socket.off('member:removed', onMemberRemoved);
      socket.off('member:role-changed', onMemberRoleChanged);
      socket.off('project:updated', onProjectUpdated);
    };
  }, [socket]);

  // A task/status change (ours or a teammate's) can shift the numbers, so
  // keep the stats panel honest without a manual refresh.
  useEffect(() => {
    if (!loading) fetchProjectStats(id).then(setStats).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!query.trim()) return setSearchResults(null);
      const res = await searchProject(id, query.trim());
      setSearchResults(res);
    }, 300);
    return () => clearTimeout(handler);
  }, [query, id]);

  const tasksByColumn = useMemo(() => {
    let source = searchResults ? searchResults.tasks : tasks;
    if (taskFilter === 'mine') source = source.filter((t) => (t.assignees || []).some((a) => a._id === user._id));
    return COLUMNS.reduce((acc, col) => {
      acc[col.key] = source.filter((t) => t.status === col.key);
      return acc;
    }, {});
  }, [tasks, searchResults, taskFilter, user._id]);

  const handleOpenNewTask = () => {
    setActiveTask(null);
    setTaskModalOpen(true);
  };

  const handleOpenTask = (task) => {
    setActiveTask(task);
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (form) => {
    if (activeTask) {
      const updated = await updateTask(activeTask._id, form);
      setTasks((ts) => upsertById(ts, updated));
    } else {
      const created = await createTask(id, form);
      setTasks((ts) => upsertById(ts, created));
    }
  };

  const handleDeleteTask = (taskId) => {
    setTaskModalOpen(false);
    setConfirmDeleteTask(taskId);
  };

  const confirmDelete = async () => {
    await deleteTask(confirmDeleteTask);
    setTasks((ts) => ts.filter((t) => t._id !== confirmDeleteTask));
  };

  const handleDrop = (statusKey) => async (e) => {
    const taskId = e.dataTransfer.getData('text/plain');
    setDragOverColumn(null);
    const task = tasks.find((t) => t._id === taskId);
    if (!task || task.status === statusKey) return;
    setTasks((ts) => ts.map((t) => (t._id === taskId ? { ...t, status: statusKey } : t)));
    const updated = await updateTask(taskId, { status: statusKey });
    setTasks((ts) => upsertById(ts, updated));
  };

  const handleInvite = async (email, memberRole) => {
    const updated = await inviteMember(id, email, memberRole);
    setProject(updated);
  };

  const handleRemoveMember = async (userId) => {
    const updated = await removeMember(id, userId);
    setProject(updated);
  };

  const handleChangeRole = async (userId, newRole) => {
    const updated = await changeMemberRole(id, userId, newRole);
    setProject(updated);
  };

  const handleDeleteProject = async () => {
    await deleteProject(id);
    navigate('/dashboard');
  };

  const handleTaskChanged = (updatedTask) => setTasks((ts) => upsertById(ts, updatedTask));

  const openAnalytics = async () => {
    setAnalyticsOpen(true);
    setAnalyticsLoading(true);
    try {
      setAnalytics(await fetchProjectAnalytics(id));
    } finally {
      setAnalyticsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <Loader label="Loading project" />
      </div>
    );
  }
  if (!project) return null;

  const activityPanel = <ActivityFeed activities={activities} loading={activityLoading} />;

  return (
    <div className="min-h-screen pb-16">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold text-ink">{project.name}</h1>
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  connected ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-ink/40'
                }`}
                title={connected ? 'Live updates connected' : 'Reconnecting…'}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-teal-500' : 'bg-slate-400'}`}
                  style={connected ? { animation: 'pulseDot 1.8s ease-in-out infinite' } : undefined}
                />
                {connected ? 'Live' : 'Offline'}
              </span>
            </div>
            <p className="mt-1 max-w-xl text-sm text-ink/50">{project.description || 'No description yet.'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileActivityOpen(true)} className="btn-secondary lg:hidden">
              Activity
            </button>
            {canSeeAnalytics && (
              <button onClick={openAnalytics} className="btn-secondary">Analytics</button>
            )}
            {canManageMembers && (
              <button onClick={() => setInviteOpen(true)} className="btn-secondary">Invite</button>
            )}
            <button onClick={handleOpenNewTask} className="btn-primary">+ New task</button>
            {isOwner && (
              <button onClick={() => setConfirmDeleteProject(true)} className="btn-ghost text-coral-500">
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Total tasks</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">{stats.total}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Completed</p>
              <p className="mt-1 font-display text-2xl font-bold text-teal-600">{stats.completed}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink/40">In progress</p>
              <p className="mt-1 font-display text-2xl font-bold text-amber-500">{stats.inProgress}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Overdue</p>
              <p className="mt-1 font-display text-2xl font-bold text-coral-500">{stats.overdue}</p>
            </div>
            <div className="card col-span-2 p-4 sm:col-span-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Overall progress</p>
                <span className="font-mono text-xs text-ink/50">{stats.progressPercent}%</span>
              </div>
              <ProgressBar percent={stats.progressPercent} />
              {stats.upcoming.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {stats.upcoming.map((t) => (
                    <span key={t._id} className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] text-ink/60">
                      {t.title} · {new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search + All/Mine toggle + Members (with live presence) */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-xs">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks or members…"
                className="input-field !pl-9"
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/30">⌕</span>
            </div>
            <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setTaskFilter('all')}
                className={`rounded-md px-3 py-1.5 transition ${taskFilter === 'all' ? 'bg-white text-ink shadow-sm' : 'text-ink/40'}`}
              >
                All Tasks
              </button>
              <button
                onClick={() => setTaskFilter('mine')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${taskFilter === 'mine' ? 'bg-white text-ink shadow-sm' : 'text-ink/40'}`}
              >
                My Tasks
                <span className={`rounded-full px-1.5 text-[10px] ${taskFilter === 'mine' ? 'bg-teal-500 text-white' : 'bg-slate-200 text-ink/50'}`}>
                  {myTasksCount}
                </span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[11px] text-ink/35">
              {onlineSet.size} online
            </span>
            <div className="flex items-center gap-1.5">
              {project.members.map((m) => (
                <div key={m.user._id} className="group relative">
                  <Avatar user={m.user} size="md" online={onlineSet.has(m.user._id)} />
                  {canManageMembers && m.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(m.user._id)}
                      className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-coral-500 text-[10px] font-bold text-white group-hover:flex"
                      title={`Remove ${m.user.name}`}
                    >
                      ×
                    </button>
                  )}
                  <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs shadow-panel group-hover:block">
                    <p className="pointer-events-auto font-medium text-ink">{m.user.name}</p>
                    {canChangeRoles && m.role !== 'owner' ? (
                      <select
                        value={m.role}
                        onChange={(e) => handleChangeRole(m.user._id, e.target.value)}
                        className="pointer-events-auto mt-1 rounded border border-line bg-white px-1 py-0.5 text-[11px]"
                      >
                        {['co-owner', 'product-owner', 'contributor', 'member', 'viewer'].map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-ink/40">{ROLE_LABELS[m.role]}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {searchResults && searchResults.members.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {searchResults.members.map((m) => (
              <span key={m._id} className="flex items-center gap-1.5 rounded-full bg-teal-50 py-1 pl-1 pr-3 text-xs font-medium text-teal-700">
                <Avatar user={m} size="sm" /> {m.name}
              </span>
            ))}
          </div>
        )}

        {/* Board + Activity sidebar */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {COLUMNS.map((col) => (
                <div
                  key={col.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverColumn(col.key);
                  }}
                  onDragLeave={() => setDragOverColumn(null)}
                  onDrop={handleDrop(col.key)}
                  className={`rounded-xl2 border-t-4 bg-slate-50/60 p-3 transition ${col.accent} ${
                    dragOverColumn === col.key ? 'ring-2 ring-teal-400 ring-offset-2' : ''
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between px-1">
                    <h3 className="font-display text-sm font-semibold text-ink">{col.label}</h3>
                    <span className="font-mono text-xs text-ink/40">{tasksByColumn[col.key].length}</span>
                  </div>
                  <div className="space-y-3">
                    {tasksByColumn[col.key].length === 0 ? (
                      <p className="px-1 py-6 text-center text-xs text-ink/30">Nothing here</p>
                    ) : (
                      tasksByColumn[col.key].map((task) => (
                        <TaskCard
                          key={task._id}
                          task={task}
                          currentUserId={user._id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', task._id)}
                          onClick={() => handleOpenTask(task)}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            {tasks.length === 0 && !searchResults && taskFilter === 'all' && (
              <div className="mt-4">
                <EmptyState
                  icon="✎"
                  title="No tasks yet"
                  description="Break this project down into tasks and assign them to your teammates."
                  action={<button onClick={handleOpenNewTask} className="btn-primary mt-2">+ New task</button>}
                />
              </div>
            )}
            {taskFilter === 'mine' && myTasksCount === 0 && !searchResults && (
              <div className="mt-4">
                <EmptyState icon="⭐" title="Nothing assigned to you" description="Tasks assigned to you will show up here." />
              </div>
            )}
          </div>

          {/* Desktop activity sidebar — sticky so it stays visible while scrolling the board */}
          <aside className="hidden lg:col-span-1 lg:block">
            <div className="card sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto p-4">
              <h3 className="mb-4 font-display text-sm font-semibold text-ink">Activity</h3>
              {activityPanel}
            </div>
          </aside>
        </div>
      </main>

      <TaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        task={activeTask}
        projectId={id}
        members={project.members}
        role={role}
        currentUserId={user._id}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onTaskChanged={handleTaskChanged}
      />
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} onInvite={handleInvite} />
      <ConfirmDialog
        open={!!confirmDeleteTask}
        onClose={() => setConfirmDeleteTask(null)}
        onConfirm={confirmDelete}
        title="Delete this task?"
        description="This will permanently remove the task and its comments."
        confirmLabel="Delete task"
      />
      <ConfirmDialog
        open={confirmDeleteProject}
        onClose={() => setConfirmDeleteProject(false)}
        onConfirm={handleDeleteProject}
        title="Delete this project?"
        description="This will permanently remove the project and every task inside it. This can't be undone."
        confirmLabel="Delete project"
      />
      <Modal open={mobileActivityOpen} onClose={() => setMobileActivityOpen(false)} title="Activity">
        {activityPanel}
      </Modal>
      <Modal open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} title="Project analytics" wide>
        {analyticsLoading || !analytics ? (
          <Loader label="Crunching numbers" />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Total', analytics.overall.total],
                ['Completed', analytics.overall.completed],
                ['In progress', analytics.overall.inProgress],
                ['To do', analytics.overall.todo],
                ['Overdue', analytics.overall.overdue],
                ['Completion %', `${analytics.overall.completionPercent}%`],
                ['On-time %', analytics.overall.onTimeCompletionPercent === null ? '—' : `${analytics.overall.onTimeCompletionPercent}%`],
                ['Reassignments', analytics.overall.reassignmentCount],
                ['Open queries', analytics.overall.openQueries],
                ['Blocked tasks', analytics.overall.blockedTasks],
              ].map(([label, value]) => (
                <div key={label} className="card p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-ink/40">{label}</p>
                  <p className="mt-1 font-display text-lg font-bold text-ink">{value}</p>
                </div>
              ))}
            </div>

            <div>
              <h4 className="mb-2 font-display text-sm font-semibold text-ink">By team member</h4>
              <div className="space-y-2">
                {analytics.perMember.map((m) => (
                  <div key={m.user._id} className="flex items-center gap-3 rounded-lg border border-line p-3">
                    <Avatar user={m.user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{m.user.name} <span className="text-ink/30">· {ROLE_LABELS[m.role]}</span></p>
                      <p className="text-[11px] text-ink/40">
                        Assigned {m.assigned} · Completed {m.completed} · In progress {m.inProgress} · To do {m.todo} · Overdue {m.overdue}
                      </p>
                    </div>
                    <div className="w-24 shrink-0 text-right">
                      <span className="font-mono text-sm font-semibold text-teal-600">{m.completionPercent}%</span>
                      <ProgressBar percent={m.completionPercent} className="mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
