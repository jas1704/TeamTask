import api from './api';

export const fetchProjects = () => api.get('/projects').then((r) => r.data.projects);
export const fetchProject = (id) => api.get(`/projects/${id}`).then((r) => r.data);
export const createProject = (data) => api.post('/projects', data).then((r) => r.data.project);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data).then((r) => r.data.project);
export const deleteProject = (id) => api.delete(`/projects/${id}`).then((r) => r.data);
export const inviteMember = (id, email, role) => api.post(`/projects/${id}/invite`, { email, role }).then((r) => r.data.project);
export const removeMember = (id, userId) => api.delete(`/projects/${id}/members/${userId}`).then((r) => r.data.project);
export const changeMemberRole = (id, userId, role) =>
  api.put(`/projects/${id}/members/${userId}/role`, { role }).then((r) => r.data.project);
export const updateRolePermissions = (id, rolePermissions) =>
  api.put(`/projects/${id}/permissions`, { rolePermissions }).then((r) => r.data.project);
export const fetchProjectStats = (id) => api.get(`/projects/${id}/stats`).then((r) => r.data);
export const fetchProjectAnalytics = (id) => api.get(`/projects/${id}/analytics`).then((r) => r.data);
export const searchProject = (id, q) => api.get(`/projects/${id}/search`, { params: { q } }).then((r) => r.data);
