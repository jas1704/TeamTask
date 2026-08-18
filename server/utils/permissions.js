/**
 * Central RBAC matrix for TeamTask.
 *
 * Every permission check in the app should go through `can()` (or the
 * `requirePermission` middleware built on top of it) instead of scattering
 * `if (role === 'owner')` checks through controllers. This is the single
 * source of truth for "who can do what".
 *
 * Roles, from most to least privileged:
 *   owner > co-owner > product-owner > contributor > member > viewer
 *
 * Some actions are `'configurable'` for a role — the project can override
 * them per-project (see Project.rolePermissions). Everything else is a
 * fixed true/false baked into DEFAULT_MATRIX.
 */

const ROLES = ['owner', 'co-owner', 'product-owner', 'contributor', 'member', 'viewer'];

// Actions that a project owner/co-owner can toggle per-role via
// project.rolePermissions[role][action] = true/false.
const CONFIGURABLE_ACTIONS = ['createTask', 'assignTask', 'changeTaskStatus'];

// true  -> always allowed for this role
// false -> never allowed for this role
// 'configurable' -> falls back to project.rolePermissions override, then a
//                   sane default (see CONFIGURABLE_DEFAULTS)
// 'assigned-only' -> special-cased in code: allowed only on tasks the user
//                     is personally assigned to (used for changeTaskStatus)
const DEFAULT_MATRIX = {
  owner: {
    viewProject: true, createTask: true, assignTask: true, changeTaskStatus: true,
    deleteTask: true, manageMembers: true, changeRoles: true, projectAnalytics: true,
    directReassign: true, approveReassignment: true, manageProjectSettings: true,
  },
  'co-owner': {
    viewProject: true, createTask: true, assignTask: true, changeTaskStatus: true,
    deleteTask: true, manageMembers: true, changeRoles: true, projectAnalytics: true,
    directReassign: true, approveReassignment: true, manageProjectSettings: true,
  },
  'product-owner': {
    viewProject: true, createTask: true, assignTask: true, changeTaskStatus: true,
    deleteTask: true, manageMembers: false, changeRoles: false, projectAnalytics: true,
    directReassign: true, approveReassignment: true, manageProjectSettings: false,
  },
  contributor: {
    viewProject: true, createTask: true, assignTask: 'configurable', changeTaskStatus: 'configurable',
    deleteTask: false, manageMembers: false, changeRoles: false, projectAnalytics: false,
    directReassign: false, approveReassignment: false, manageProjectSettings: false,
  },
  member: {
    viewProject: true, createTask: 'configurable', assignTask: false, changeTaskStatus: 'assigned-only',
    deleteTask: false, manageMembers: false, changeRoles: false, projectAnalytics: false,
    directReassign: false, approveReassignment: false, manageProjectSettings: false,
  },
  viewer: {
    viewProject: true, createTask: false, assignTask: false, changeTaskStatus: false,
    deleteTask: false, manageMembers: false, changeRoles: false, projectAnalytics: false,
    directReassign: false, approveReassignment: false, manageProjectSettings: false,
  },
};

// Default value to use for a 'configurable' action when a project hasn't
// set an explicit override.
const CONFIGURABLE_DEFAULTS = {
  createTask: true,
  assignTask: false,
  changeTaskStatus: false,
};

/**
 * Resolve whether `role` can perform `action` on `project`.
 * Does NOT handle 'assigned-only' — that must be checked by the caller with
 * task context (see `canChangeTaskStatus` below).
 */
function can(role, action, project) {
  const roleRules = DEFAULT_MATRIX[role];
  if (!roleRules) return false;
  const rule = roleRules[action];

  if (rule === true) return true;
  if (rule === false) return false;
  if (rule === 'assigned-only') return false; // must use canChangeTaskStatus with task context

  if (rule === 'configurable') {
    const override = project?.rolePermissions?.get?.(role)?.[action] ?? project?.rolePermissions?.[role]?.[action];
    if (override !== undefined && override !== null) return override;
    return CONFIGURABLE_DEFAULTS[action] ?? false;
  }

  return false;
}

/**
 * Status-change is special: 'member' can change status only on tasks they
 * are personally assigned to, everyone above 'member' follows the normal
 * matrix, and 'viewer'/other configurable roles fall back to `can()`.
 */
function canChangeTaskStatus(role, project, { isAssignee }) {
  const roleRules = DEFAULT_MATRIX[role];
  if (!roleRules) return false;
  const rule = roleRules.changeTaskStatus;

  if (rule === 'assigned-only') return !!isAssignee;
  if (rule === true) return true;
  if (rule === false) return false;
  if (rule === 'configurable') return can(role, 'changeTaskStatus', project) || !!isAssignee;
  return false;
}

module.exports = { ROLES, CONFIGURABLE_ACTIONS, DEFAULT_MATRIX, CONFIGURABLE_DEFAULTS, can, canChangeTaskStatus };
