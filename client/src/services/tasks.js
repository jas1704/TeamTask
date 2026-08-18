import api from './api';

export const fetchTasks = (projectId, params = {}) =>
  api.get(`/projects/${projectId}/tasks`, { params }).then((r) => r.data);
export const createTask = (projectId, data) =>
  api.post(`/projects/${projectId}/tasks`, data).then((r) => r.data.task);
export const fetchTask = (id) => api.get(`/tasks/${id}`).then((r) => r.data);
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data).then((r) => r.data.task);
export const deleteTask = (id) => api.delete(`/tasks/${id}`).then((r) => r.data);

// Subtasks (#5) — just tasks with parentTask set.
export const fetchSubtasks = (projectId, parentTaskId) =>
  api.get(`/projects/${projectId}/tasks`, { params: { parentTask: parentTaskId } }).then((r) => r.data.tasks);
export const createSubtask = (projectId, parentTaskId, data) =>
  createTask(projectId, { ...data, parentTask: parentTaskId });

// Links (#2)
export const addLink = (taskId, link) => api.post(`/tasks/${taskId}/links`, link).then((r) => r.data.task);
export const deleteLink = (taskId, linkId) => api.delete(`/tasks/${taskId}/links/${linkId}`).then((r) => r.data.task);

// Attachments (#3)
export const uploadAttachments = (taskId, files) => {
  const formData = new FormData();
  Array.from(files).forEach((f) => formData.append('files', f));
  return api
    .post(`/tasks/${taskId}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data.task);
};
export const deleteAttachment = (taskId, attachmentId) =>
  api.delete(`/tasks/${taskId}/attachments/${attachmentId}`).then((r) => r.data.task);

// Queries / issues (#11)
export const createQuery = (taskId, question) => api.post(`/tasks/${taskId}/queries`, { question }).then((r) => r.data.task);
export const replyToQuery = (taskId, queryId, text) =>
  api.post(`/tasks/${taskId}/queries/${queryId}/replies`, { text }).then((r) => r.data.task);
export const resolveQuery = (taskId, queryId) =>
  api.put(`/tasks/${taskId}/queries/${queryId}/resolve`).then((r) => r.data.task);

// Reassignment (#8, #9)
export const requestReassignment = (taskId, payload) =>
  api.post(`/tasks/${taskId}/reassignment/request`, payload).then((r) => r.data.task);
export const resolveReassignment = (taskId, payload) =>
  api.put(`/tasks/${taskId}/reassignment/resolve`, payload).then((r) => r.data.task);
export const directReassign = (taskId, payload) =>
  api.put(`/tasks/${taskId}/reassign`, payload).then((r) => r.data.task);
