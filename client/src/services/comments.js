import api from './api';

export const fetchComments = (taskId) => api.get(`/tasks/${taskId}/comments`).then((r) => r.data.comments);
export const createComment = (taskId, text) => api.post(`/tasks/${taskId}/comments`, { text }).then((r) => r.data.comment);
export const deleteComment = (id) => api.delete(`/comments/${id}`).then((r) => r.data);
