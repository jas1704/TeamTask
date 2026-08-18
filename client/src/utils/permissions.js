// Mirrors server/utils/permissions.js just enough to show/hide UI controls.
// The backend re-checks everything — this only avoids flashing buttons that
// would 403 anyway.
const MATRIX = {
  owner: { assignTask: true, deleteTask: true, manageMembers: true, changeRoles: true, projectAnalytics: true, directReassign: true, approveReassignment: true, manageProjectSettings: true, createTask: true },
  'co-owner': { assignTask: true, deleteTask: true, manageMembers: true, changeRoles: true, projectAnalytics: true, directReassign: true, approveReassignment: true, manageProjectSettings: true, createTask: true },
  'product-owner': { assignTask: true, deleteTask: true, manageMembers: false, changeRoles: false, projectAnalytics: true, directReassign: true, approveReassignment: true, manageProjectSettings: false, createTask: true },
  contributor: { assignTask: false, deleteTask: false, manageMembers: false, changeRoles: false, projectAnalytics: false, directReassign: false, approveReassignment: false, manageProjectSettings: false, createTask: true },
  member: { assignTask: false, deleteTask: false, manageMembers: false, changeRoles: false, projectAnalytics: false, directReassign: false, approveReassignment: false, manageProjectSettings: false, createTask: true },
  viewer: { assignTask: false, deleteTask: false, manageMembers: false, changeRoles: false, projectAnalytics: false, directReassign: false, approveReassignment: false, manageProjectSettings: false, createTask: false },
};

export const can = (role, action) => !!MATRIX[role]?.[action];

export const canChangeStatus = (role, isAssignee) => {
  if (['owner', 'co-owner', 'product-owner'].includes(role)) return true;
  if (role === 'contributor') return true; // configurable server-side; default allow, server confirms
  if (role === 'member') return !!isAssignee;
  return false;
};

export const ROLE_LABELS = {
  owner: 'Owner',
  'co-owner': 'Co-owner',
  'product-owner': 'Product Owner',
  contributor: 'Contributor',
  member: 'Member',
  viewer: 'Viewer',
};
