import api from './api';

export const fetchNotifications = () => api.get('/notifications').then((r) => r.data);
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`).then((r) => r.data.notification);
export const markAllNotificationsRead = () => api.put('/notifications/read-all').then((r) => r.data);
