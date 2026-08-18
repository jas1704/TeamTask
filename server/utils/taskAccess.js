/**
 * Feature #6 — private/restricted tasks. Visibility is enforced here, on the
 * backend, not just hidden in the UI: any list/detail endpoint that returns
 * tasks must run results through these helpers.
 */

const idsMatch = (a, b) => a && b && a.toString() === b.toString();

/**
 * Can `userId` (with project `role`) see `task`?
 * Owner/co-owner can always see everything in their project, regardless of
 * the task's visibility setting — visibility restricts *other* members, not
 * project leadership.
 */
function canViewTask(task, userId, role) {
  if (role === 'owner' || role === 'co-owner') return true;
  if (idsMatch(task.createdBy?._id || task.createdBy, userId)) return true;

  const assignees = (task.assignees || []).map((a) => (a._id || a).toString());
  const isAssignee = assignees.includes(userId.toString());

  const visType = task.visibility?.type || 'project';
  switch (visType) {
    case 'project':
      return true;
    case 'assignees-only':
      return isAssignee;
    case 'owner-only':
      return false; // already handled owner/co-owner above; everyone else: no
    case 'selected': {
      const selected = (task.visibility.users || []).map((u) => (u._id || u).toString());
      return isAssignee || selected.includes(userId.toString());
    }
    default:
      return true;
  }
}

/** Mongo query fragment to pre-filter a task list to what `userId`/`role` may see. */
function visibilityFilter(userId, role) {
  if (role === 'owner' || role === 'co-owner') return {};
  return {
    $or: [
      { createdBy: userId },
      { assignees: userId },
      { 'visibility.type': 'project' },
      { 'visibility.type': 'selected', 'visibility.users': userId },
    ],
  };
}

module.exports = { canViewTask, visibilityFilter };
